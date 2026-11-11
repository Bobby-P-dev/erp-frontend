import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
    showRfq,
    publishRfq,
    sendRfqInvitation,
    startEvaluationRfq,
    cancelRfq,
    extendRfqDeadline,
    recordSupplierQuotation,
    getRfqComparisonMatrix
} from '@/services/rfqServices.js'
import { createPurchaseOrderFromRfq } from '@/services/purchaseOrderServices.js'
import { searchTaxes } from '@/services/taxServices.js'
import { uploadFile } from '@/services/fileServices.js'
import { showLoading, showSuccess, showError, showConfirm, showPrompt } from '@/utils/swal.js'
import { purchaseOrderValidityErrors, quotationDateOrderError, quotationApiError } from '@/utils/quotationValidity.js'
import { useRfqDeadline } from '@/composables/purchasing/useRfqDeadline.js'

export function useRfqDetail() {
    const router = useRouter()
    const route = useRoute()
    const { getDeadlineInfo } = useRfqDeadline()
    const extensionOpen = ref(false)
    const extensionSubmitting = ref(false)
    const extensionForm = ref({ deadline_date: '', reason: '' })
    const deadlineExtensions = ref([])

    const rfqId = computed(() => route.params.id)

    const loading = ref(false)
    const rfq = ref(null)
    const activeTab = ref('items')
    const copiedToken = ref(null)
    const sendingInvitation = ref(null)

    const handleSendInvitation = async (supplier) => {
        if (sendingInvitation.value !== null) return
        sendingInvitation.value = supplier.id
        try {
            const data = {}
            if (supplier.invitation_status === 'legacy_unknown' && !await showConfirm(
                'Kirim undangan baru?', 'Riwayat lama tidak membuktikan hasil pengiriman. Supplier mungkin pernah menerima undangan sebelumnya.', 'Kirim Undangan'
            )) return
            if (!supplier.email || supplier.invitation_attempts?.[0]?.error_code === 'invalid_recipient') {
                const email = await showPrompt({ title: 'Alamat email undangan', text: 'Masukkan alamat email supplier yang benar.',
                    placeholder: 'supplier@example.com', validator: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value?.trim()) ? null : 'Masukkan alamat email yang valid.' })
                if (!email) return
                data.email = email.trim()
            }
            await sendRfqInvitation(rfqId.value, supplier.id, data)
            await fetchRfqDetail()
            await showSuccess('Permintaan pengiriman dicatat', 'Periksa status undangan pada daftar supplier. Status terkirim berarti email diserahkan ke layanan email.')
        } catch (err) {
            await fetchRfqDetail()
            showError(err.response?.data?.message || 'Gagal meminta pengiriman undangan')
        } finally {
            sendingInvitation.value = null
        }
    }
    const validitySuppliers = ref([])
    const generatingPo = ref(false)

    const isModalOpen = ref(false)
    const modalSubmitting = ref(false)
    const taxes = ref([])
    const taxesLoading = ref(false)
    const uploadingFile = ref(false)

    const manualForm = ref({
        supplier_id: '',
        vendor_quotation_reference: '',
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until: '',
        payment_terms: '',
        lead_time_days: null,
        tax_id: '',
        shipping_cost: 0,
        quotation_file_id: null,
        quotation_file_name: '',
        notes: '',
        items: []
    })

    const fetchRfqDetail = async () => {
        loading.value = true
        validitySuppliers.value = []
        try {
            const response = await showRfq(rfqId.value)
            rfq.value = response.data || response
            deadlineExtensions.value = response.deadline_extensions || []
            if (hasUnconvertedAwardedItems.value) {
                try {
                    const comparison = await getRfqComparisonMatrix(rfqId.value)
                    validitySuppliers.value = (comparison.data || comparison).suppliers || []
                } catch {
                    validitySuppliers.value = []
                }
            }
        } catch (err) {
            showError(err.response?.data?.message || 'Gagal memuat detail tender RFQ')
        } finally {
            loading.value = false
        }
    }

    const fetchTaxes = async () => {
        taxesLoading.value = true
        try {
            const response = await searchTaxes('', null, 50)
            taxes.value = response.data || response || []
        } catch {
            taxes.value = []
        } finally {
            taxesLoading.value = false
        }
    }

    const invitedSuppliers = computed(() => rfq.value?.rfq_suppliers || [])
    const quotationsList = computed(() => rfq.value?.quotations || [])
    const purchaseOrdersList = computed(() => rfq.value?.purchase_orders || [])

    const currentStepIndex = computed(() => {
        if (!rfq.value) return 0
        const status = rfq.value.status
        if (status === 'draft') return 0
        if (status === 'published') return 1
        if (status === 'evaluation') return 2
        if (status === 'completed') return 3
        if (status === 'cancelled') return -1
        return 0
    })

    const steps = computed(() => {
        const itemCount = rfq.value?.items?.length || 0
        const vendorCount = invitedSuppliers.value.length
        const quoteCount = quotationsList.value.length
        const isCompleted = rfq.value?.status === 'completed'

        return [
            {
                key: 'draft',
                stepNumber: '01',
                label: 'Penyusunan Draf',
                description: 'Dokumen kebutuhan & spesifikasi barang disiapkan',
                meta: `${itemCount} jenis barang ditenderkan`
            },
            {
                key: 'published',
                stepNumber: '02',
                label: 'Undangan Vendor',
                description: 'Tautan penawaran dikirimkan ke pemasok',
                meta: `${vendorCount} vendor diundang`
            },
            {
                key: 'evaluation',
                stepNumber: '03',
                label: 'Evaluasi Harga',
                description: 'Perbandingan harga & syarat pembayaran vendor',
                meta: `${quoteCount} dari ${vendorCount} penawaran masuk`
            },
            {
                key: 'completed',
                stepNumber: '04',
                label: 'Penetapan Pemenang',
                description: 'Keputusan pemenang tender telah disahkan',
                meta: isCompleted ? 'Pemenang telah ditetapkan' : 'Menunggu penetapan pemenang'
            }
        ]
    })

    const getStepState = (idx) => {
        if (!rfq.value || rfq.value.status === 'cancelled') return 'upcoming'
        if (rfq.value.status === 'completed') return 'completed'
        if (idx < currentStepIndex.value) return 'completed'
        if (idx === currentStepIndex.value) return 'active'
        return 'upcoming'
    }

    const totalTargetHps = computed(() => {
        if (!rfq.value?.items) return 0
        return rfq.value.items.reduce((sum, item) => {
            const price = Number(item.target_price || 0)
            const qty = Number(item.target_quantity || 0)
            return sum + (price * qty)
        }, 0)
    })

    const hasUnconvertedAwardedItems = computed(() => {
        for (const q of quotationsList.value) {
            for (const it of (q.items || [])) {
                if (it.is_awarded && !it.purchase_order_id) {
                    return true
                }
            }
        }
        return false
    })

    const handleGeneratePoFromDetail = async () => {
        if (generatingPo.value || loading.value) return
        if (poValidityErrors.value.length) {
            showError(poValidityErrors.value[0])
            return
        }
        const confirmed = await showConfirm(
            'Terbitkan Purchase Order (PO)?',
            'Sistem akan menerbitkan dokumen Purchase Order resmi dari hasil pemenang tender ini.'
        )
        if (!confirmed) return

        generatingPo.value = true
        showLoading('Menerbitkan Purchase Order...')
        try {
            const res = await createPurchaseOrderFromRfq(rfqId.value, {})
            const created = res.data || []
            await showSuccess(
                'Purchase Order Berhasil Dibuat!',
                `${created.length || 1} dokumen Purchase Order telah berhasil diterbitkan.`
            )
            await fetchRfqDetail()
        } catch (err) {
            if ([403, 409, 422].includes(err.response?.status)) await fetchRfqDetail()
            showError(err.response?.data?.message || 'Gagal menerbitkan Purchase Order')
        } finally {
            generatingPo.value = false
        }
    }

    const poValidityErrors = computed(() => purchaseOrderValidityErrors(
        quotationsList.value.flatMap(quotation => (quotation.items || [])
            .filter(item => item.is_awarded)
            .map(item => ({ quotation_id: quotation.id, purchase_order_id: item.purchase_order_id }))),
        validitySuppliers.value
    ))

    const deadlineInfo = computed(() => getDeadlineInfo(rfq.value))

    const submitDeadlineExtension = async () => {
        if (extensionSubmitting.value) return
        extensionSubmitting.value = true
        try {
            await extendRfqDeadline(rfqId.value, extensionForm.value)
            extensionOpen.value = false
            extensionForm.value = { deadline_date: '', reason: '' }
            await fetchRfqDetail()
            showSuccess('Deadline RFQ berhasil diperpanjang')
        } catch (err) {
            if (err.response?.status === 422) await fetchRfqDetail()
            const data = err.response?.data
            showError(Object.values(data?.errors || {}).flat().join(' ') || data?.message || 'Gagal memperpanjang deadline')
        } finally {
            extensionSubmitting.value = false
        }
    }

    const copyMagicLink = async (token) => {
        if (!token) return
        const magicUrl = `${window.location.origin}/portal/rfq/${token}`
        let success = false

        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(magicUrl)
                success = true
            } catch {
                success = false
            }
        }

        if (!success) {
            try {
                const textArea = document.createElement('textarea')
                textArea.value = magicUrl
                textArea.style.position = 'fixed'
                textArea.style.left = '-999999px'
                textArea.style.top = '-999999px'
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                success = document.execCommand('copy')
                textArea.remove()
            } catch {
                success = false
            }
        }

        if (success) {
            copiedToken.value = token
            showSuccess('Tautan Tersalin!', 'Tautan portal vendor telah disalin ke clipboard.')
            setTimeout(() => {
                if (copiedToken.value === token) copiedToken.value = null
            }, 2500)
        } else {
            window.prompt('Salin tautan portal berikut secara manual (Ctrl+C):', magicUrl)
        }
    }

    const handlePublish = async () => {
        const confirmed = await showConfirm(
            'Publikasikan Tender RFQ?',
            'Vendor yang diundang akan menerima notifikasi dan token akses ke Portal Penawaran Vendor.'
        )
        if (!confirmed) return

        showLoading('Menerbitkan tender RFQ...')
        try {
            await publishRfq(rfqId.value)
            await showSuccess('Tender RFQ berhasil diterbitkan dan portal vendor telah diaktifkan!')
            fetchRfqDetail()
        } catch (err) {
            showError(err.response?.data?.message || 'Gagal menerbitkan tender RFQ')
        }
    }

    const handleStartEvaluation = async () => {
        const confirmed = await showConfirm(
            'Mulai Evaluasi Penawaran?',
            'Status tender akan dialihkan ke tahap evaluasi dan Anda dapat melakukan komparasi penawaran.'
        )
        if (!confirmed) return

        showLoading('Memperbarui status tender...')
        try {
            await startEvaluationRfq(rfqId.value)
            await showSuccess('Status berhasil diubah ke tahap Evaluasi Penawaran!')
            fetchRfqDetail()
        } catch (err) {
            showError(err.response?.data?.message || 'Gagal memulai evaluasi penawaran')
        }
    }

    const handleCancel = async () => {
        const reason = await showPrompt(
            'Batalkan Tender RFQ',
            'Masukkan alasan pembatalan tender ini:',
            'Alasan pembatalan'
        )
        if (!reason) return

        showLoading('Membatalkan tender...')
        try {
            await cancelRfq(rfqId.value, reason)
            await showSuccess('Tender RFQ berhasil dibatalkan')
            fetchRfqDetail()
        } catch (err) {
            showError(err.response?.data?.message || 'Gagal membatalkan tender RFQ')
        }
    }

    const openManualModal = (preselectedSupplierId = null) => {
        if (!deadlineInfo.value.canRespond) {
            showError(deadlineInfo.value.reason)
            return
        }
        if (!rfq.value?.items || rfq.value.items.length === 0) {
            showError('Item tender tidak ditemukan')
            return
        }

        const defaultItems = rfq.value.items.map(item => ({
            rfq_item_id: item.id,
            item_name: (item.item_name && item.item_name !== 'Item Tanpa Nama') ? item.item_name : (item.item?.name || 'Item Tanpa Nama'),
            target_quantity: Number(item.target_quantity || 0),
            unit_name: item.unit?.name || 'Unit',
            offered_quantity: Number(item.target_quantity || 0),
            unit_price: Number(item.target_price || 0),
            lead_time_days: null,
            brand: '',
            notes: ''
        }))

        manualForm.value = {
            supplier_id: preselectedSupplierId || '',
            vendor_quotation_reference: '',
            quotation_date: new Date().toISOString().split('T')[0],
            valid_until: '',
            payment_terms: rfq.value.payment_terms_requested || 'Net 30 Days',
            lead_time_days: null,
            tax_id: '',
            shipping_cost: 0,
            quotation_file_id: null,
            quotation_file_name: '',
            notes: '',
            items: defaultItems
        }
        isModalOpen.value = true
    }

    const closeModal = () => {
        isModalOpen.value = false
    }

    const handleFileUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        if (file.type !== 'application/pdf') {
            showError('Hanya berkas PDF yang diperbolehkan untuk dokumen penawaran!')
            return
        }

        uploadingFile.value = true
        try {
            const response = await uploadFile(file, 'supplier_quotations')
            const uploaded = response.data || response
            manualForm.value.quotation_file_id = uploaded.id
            manualForm.value.quotation_file_name = file.name
        } catch (err) {
            showError(err.response?.data?.message || 'Gagal mengunggah berkas PDF')
        } finally {
            uploadingFile.value = false
        }
    }

    const modalItemsSubtotal = computed(() => {
        return manualForm.value.items.reduce((sum, item) => {
            const qty = Number(item.offered_quantity) || 0
            const price = Number(item.unit_price) || 0
            return sum + (qty * price)
        }, 0)
    })

    const selectedTaxRate = computed(() => {
        if (!manualForm.value.tax_id) return 0
        const tax = taxes.value.find(t => t.id === Number(manualForm.value.tax_id))
        return tax ? Number(tax.rate || 0) : 0
    })

    const modalTaxAmount = computed(() => {
        return (modalItemsSubtotal.value * selectedTaxRate.value) / 100
    })

    const modalGrandTotal = computed(() => {
        const shipping = Number(manualForm.value.shipping_cost) || 0
        return modalItemsSubtotal.value + modalTaxAmount.value + shipping
    })

    const submitManualQuotation = async () => {
        if (!deadlineInfo.value.canRespond) {
            showError(deadlineInfo.value.reason)
            return
        }
        const dateError = quotationDateOrderError(manualForm.value)
        if (dateError) {
            showError(dateError)
            return
        }
        if (!manualForm.value.supplier_id) {
            showError('Silakan pilih vendor/supplier!')
            return
        }

        if (!manualForm.value.vendor_quotation_reference) {
            showError('Nomor referensi surat penawaran vendor wajib diisi!')
            return
        }

        for (const item of manualForm.value.items) {
            if (!item.offered_quantity || Number(item.offered_quantity) <= 0) {
                showError(`Kuantitas penawaran untuk item '${item.item_name}' harus lebih dari 0!`)
                return
            }
            if (item.unit_price === null || item.unit_price === undefined || Number(item.unit_price) < 0) {
                showError(`Harga satuan untuk item '${item.item_name}' tidak valid!`)
                return
            }
        }

        const payload = {
            rfq_id: Number(rfqId.value),
            supplier_id: Number(manualForm.value.supplier_id),
            vendor_quotation_reference: manualForm.value.vendor_quotation_reference,
            quotation_date: manualForm.value.quotation_date || null,
            valid_until: manualForm.value.valid_until || null,
            payment_terms: manualForm.value.payment_terms || null,
            lead_time_days: manualForm.value.lead_time_days ? Number(manualForm.value.lead_time_days) : null,
            tax_id: manualForm.value.tax_id ? Number(manualForm.value.tax_id) : null,
            shipping_cost: Number(manualForm.value.shipping_cost) || 0,
            quotation_file_id: manualForm.value.quotation_file_id,
            notes: manualForm.value.notes || null,
            items: manualForm.value.items.map(item => ({
                rfq_item_id: item.rfq_item_id,
                offered_quantity: Number(item.offered_quantity),
                unit_price: Number(item.unit_price),
                lead_time_days: item.lead_time_days ? Number(item.lead_time_days) : null,
                brand: item.brand || null,
                notes: item.notes || null
            }))
        }

        modalSubmitting.value = true
        try {
            await recordSupplierQuotation(payload)
            await showSuccess('Penawaran vendor berhasil dicatat ke sistem!')
            closeModal()
            fetchRfqDetail()
        } catch (err) {
            if (err.response?.status === 422) await fetchRfqDetail()
            showError(quotationApiError(err, 'Gagal menyimpan penawaran vendor'))
        } finally {
            modalSubmitting.value = false
        }
    }

    return {
        sendingInvitation,
        handleSendInvitation,
        extensionOpen,
        extensionSubmitting,
        extensionForm,
        deadlineExtensions,
        submitDeadlineExtension,
        router,
        rfqId,
        loading,
        rfq,
        activeTab,
        copiedToken,
        isModalOpen,
        modalSubmitting,
        taxes,
        uploadingFile,
        manualForm,
        steps,
        totalTargetHps,
        invitedSuppliers,
        quotationsList,
        purchaseOrdersList,
        hasUnconvertedAwardedItems,
        poValidityErrors,
        generatingPo,
        deadlineInfo,
        modalItemsSubtotal,
        selectedTaxRate,
        modalTaxAmount,
        modalGrandTotal,
        fetchRfqDetail,
        fetchTaxes,
        getStepState,
        handleGeneratePoFromDetail,
        copyMagicLink,
        handlePublish,
        handleStartEvaluation,
        handleCancel,
        openManualModal,
        closeModal,
        handleFileUpload,
        submitManualQuotation,
    }
}
