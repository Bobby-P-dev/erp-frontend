import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import {
    getPublicPortalRfq,
    submitPublicPortalQuotation,
    declinePublicPortalRfq
} from '@/services/rfqServices.js'
import { formatCurrency } from '@/composables/useFormatter.js'
import { showSuccess, showError, showConfirm, showPrompt } from '@/utils/swal.js'
import { quotationDateOrderError, quotationApiError } from '@/utils/quotationValidity.js'
import { useRfqDeadline } from '@/composables/purchasing/useRfqDeadline.js'

export function useSupplierPortalRfqForm() {
    const router = useRouter()
    const route = useRoute()
    const { getDeadlineInfo } = useRfqDeadline()
    let refreshTimer
    onMounted(() => { refreshTimer = setInterval(() => { if (!isSubmitting.value) loadPortalData(true) }, 60000) })
    onUnmounted(() => clearInterval(refreshTimer))
    const authStore = useAuthStore()
    const token = computed(() => route.params.token)

    const isSupplierLoggedIn = computed(() => {
        return authStore.isAuthenticated && authStore.user?.account_type === 'supplier'
    })

    const authUser = computed(() => authStore.user || {})
    const authSupplier = computed(() => authUser.value.supplier || {})

    const isLoading = ref(true)
    const isSubmitting = ref(false)
    const errorMessage = ref(null)

    const portalData = ref(null)
    const quoteForm = ref({
        vendor_quotation_reference: '',
        quotation_date: new Date().toISOString().substring(0, 10),
        valid_until: '',
        payment_terms: '',
        lead_time_days: 7,
        tax_rate: 11,
        shipping_cost: 0,
        notes: '',
        revision_reason: '',
        items: []
    })

    const selectedFile = ref(null)

    const supplierInitials = computed(() => {
        const name = authSupplier.value.name || authUser.value.name || portalData.value?.supplier?.name || 'Vendor'
        const parts = name.trim().split(/\s+/)
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase()
        }
        return name.slice(0, 2).toUpperCase()
    })

    const handleLogout = async () => {
        const confirmed = await showConfirm(
            'Keluar dari Portal?',
            'Anda akan keluar dari sesi akun rekanan PT Padma Soode Indonesia.',
            'Ya, Keluar',
            'Batal',
            '#ef4444'
        )
        if (!confirmed) return

        await authStore.logout()
        showSuccess('Berhasil Keluar', 'Anda telah keluar dari Portal Rekanan.')
        router.push({ name: 'login' })
    }

    const loadPortalData = async (preserveForm = false) => {
        if (!preserveForm) isLoading.value = true
        errorMessage.value = null
        try {
            const res = await getPublicPortalRfq(token.value)
            portalData.value = res.data

            if (!preserveForm && portalData.value?.rfq?.items) {
                quoteForm.value.items = portalData.value.rfq.items.map(it => ({
                    rfq_item_id: it.id,
                    item_name: it.item_name,
                    item_specifications: it.item_specifications,
                    unit_name: it.unit_name || it.unit_code,
                    target_quantity: Number(it.target_quantity),
                    offered_quantity: Number(it.target_quantity),
                    unit_price: 0,
                    lead_time_days: 7,
                    brand: '',
                    notes: ''
                }))
            }

            if (!preserveForm && portalData.value?.rfq?.payment_terms_requested) {
                quoteForm.value.payment_terms = portalData.value.rfq.payment_terms_requested
            }
            if (!preserveForm && portalData.value?.portal?.can_revise) {
                const existing = portalData.value.existing_quotation
                for (const field of ['vendor_quotation_reference', 'quotation_date', 'valid_until', 'payment_terms', 'lead_time_days', 'tax_rate', 'shipping_cost']) {
                    quoteForm.value[field] = existing[field] ?? ''
                }
                quoteForm.value.items = quoteForm.value.items.map(item => {
                    const previous = existing.items.find(line => line.rfq_item_id === item.rfq_item_id)
                    return previous ? { ...item, ...previous } : item
                })
            }
        } catch (err) {
            console.error('Portal load error:', err)
            errorMessage.value = err.response?.data?.message || 'Tautan portal tender tidak valid atau telah kedaluwarsa.'
        } finally {
            isLoading.value = false
        }
    }

    const subtotalAmount = computed(() => {
        if (!quoteForm.value.items?.length) return 0
        return quoteForm.value.items.reduce((sum, item) => {
            const qty = Number(item.offered_quantity) || 0
            const price = Number(item.unit_price) || 0
            return sum + (qty * price)
        }, 0)
    })

    const taxAmount = computed(() => {
        const rate = Number(quoteForm.value.tax_rate) || 0
        return Math.round((subtotalAmount.value * rate) / 100)
    })

    const shippingAmount = computed(() => {
        return Number(quoteForm.value.shipping_cost) || 0
    })

    const grandTotalAmount = computed(() => {
        return subtotalAmount.value + taxAmount.value + shippingAmount.value
    })

    const handleFileSelect = (file) => {
        if (!file) return
        if (file.size > 10 * 1024 * 1024) {
            showError('Berkas Terlalu Besar', 'Ukuran berkas lampiran maksimal 10 MB.')
            return
        }
        selectedFile.value = file
    }

    const removeFile = () => {
        selectedFile.value = null
    }

    const validateForm = () => {
        if (!quoteForm.value.vendor_quotation_reference?.trim()) {
            showError('Validasi Gagal', 'Nomor surat penawaran resmi vendor wajib diisi.')
            return false
        }

        if (!quoteForm.value.items?.length) {
            showError('Validasi Gagal', 'Daftar item penawaran tidak boleh kosong.')
            return false
        }

        for (const it of quoteForm.value.items) {
            if (!it.offered_quantity || Number(it.offered_quantity) <= 0) {
                showError('Validasi Gagal', `Kuantitas penawaran untuk "${it.item_name}" harus lebih besar dari 0.`)
                return false
            }
            if (Number(it.unit_price) <= 0) {
                showError('Validasi Gagal', `Harga satuan untuk "${it.item_name}" harus lebih besar dari Rp 0.`)
                return false
            }
        }

        return true
    }

    const handleSubmit = async () => {
        if (!canRespond.value) {
            showError('Tidak dapat mengirim penawaran', deadlineInfo.value.reason || 'Tender tidak menerima respons baru.')
            return
        }
        const dateError = quotationDateOrderError(quoteForm.value)
        if (dateError) {
            showError('Validasi Gagal', dateError)
            return
        }
        if (!validateForm()) return

        const confirmed = await showConfirm(
            'Kirim Penawaran Harga?',
            `Total penawaran: ${formatCurrency(grandTotalAmount.value)}. Pastikan seluruh harga satuan dan spesifikasi yang Anda masukkan sudah akurat.`,
            'Ya, Kirim Penawaran'
        )
        if (!confirmed) return

        isSubmitting.value = true
        try {
            const formData = new FormData()
            if (portalData.value?.portal?.can_revise) {
                if (!quoteForm.value.revision_reason?.trim()) {
                    showError('Validasi Gagal', 'Alasan revisi wajib diisi.')
                    return
                }
                formData.append('expected_review_version', portalData.value.existing_quotation.review_version)
                formData.append('reason', quoteForm.value.revision_reason.trim())
                formData.append('currency', portalData.value.existing_quotation.currency)
                formData.append('exchange_rate', portalData.value.existing_quotation.exchange_rate)
            }
            formData.append('vendor_quotation_reference', quoteForm.value.vendor_quotation_reference.trim())
            formData.append('quotation_date', quoteForm.value.quotation_date)
            if (quoteForm.value.valid_until) formData.append('valid_until', quoteForm.value.valid_until)
            if (quoteForm.value.payment_terms) formData.append('payment_terms', quoteForm.value.payment_terms)
            if (quoteForm.value.lead_time_days) formData.append('lead_time_days', quoteForm.value.lead_time_days)
            formData.append('tax_rate', quoteForm.value.tax_rate)
            formData.append('shipping_cost', quoteForm.value.shipping_cost || 0)
            if (quoteForm.value.notes) formData.append('notes', quoteForm.value.notes)

            const formattedItems = quoteForm.value.items.map(it => ({
                rfq_item_id: it.rfq_item_id,
                offered_quantity: Number(it.offered_quantity),
                unit_price: Number(it.unit_price),
                lead_time_days: it.lead_time_days ? Number(it.lead_time_days) : null,
                brand: it.brand || null,
                notes: it.notes || null
            }))
            formData.append('items', JSON.stringify(formattedItems))

            if (selectedFile.value) {
                formData.append('quotation_file', selectedFile.value)
            }

            await submitPublicPortalRfqSafe(token.value, formData)
            showSuccess('Penawaran Terkirim!', 'Surat penawaran harga Anda telah resmi diterima oleh tim pengadaan.')
            await loadPortalData()
        } catch (err) {
            console.error('Submission failed:', err)
            if ([403, 409, 422].includes(err.response?.status)) await loadPortalData(err.response?.status !== 409)
            showError('Gagal Mengirim Penawaran', quotationApiError(err, 'Terjadi kesalahan saat memproses penawaran Anda.'))
        } finally {
            isSubmitting.value = false
        }
    }

    const submitPublicPortalRfqSafe = async (tok, formData) => {
        return submitPublicPortalQuotation(tok, formData)
    }

    const handleDecline = async () => {
        if (!canRespond.value || !portalData.value?.portal?.can_decline) return
        const { isConfirmed, value } = await showPrompt({
            title: 'Tolak Partisipasi Tender',
            text: 'Mohon tuliskan alasan penolakan (misal: kapasitas produksi penuh, spesifikasi di luar lini produk).',
            placeholder: 'Tuliskan alasan penolakan di sini...',
            confirmText: 'Konfirmasi Tolak Tender',
            isDestructive: true
        })

        if (!isConfirmed) return

        try {
            await declinePublicPortalRfq(token.value, value || '')
            showSuccess('Tercatat', 'Konfirmasi penolakan partisipasi tender telah berhasil disimpan.')
            await loadPortalData()
        } catch (err) {
            console.error('Decline error:', err)
            if (err.response?.status === 422) await loadPortalData(true)
            showError('Gagal Menolak', err.response?.data?.message || 'Terjadi kesalahan saat mencatat penolakan.')
        }
    }

    const deadlineInfo = computed(() => getDeadlineInfo(portalData.value?.rfq))
    const canRespond = computed(() => !errorMessage.value && deadlineInfo.value.canRespond && portalData.value?.portal?.can_submit === true)

    return {
        router,
        token,
        isSupplierLoggedIn,
        authUser,
        authSupplier,
        supplierInitials,
        isLoading,
        isSubmitting,
        errorMessage,
        portalData,
        quoteForm,
        selectedFile,
        subtotalAmount,
        taxAmount,
        shippingAmount,
        grandTotalAmount,
        deadlineInfo,
        canRespond,
        handleLogout,
        loadPortalData,
        handleFileSelect,
        removeFile,
        handleSubmit,
        handleDecline,
    }
}
