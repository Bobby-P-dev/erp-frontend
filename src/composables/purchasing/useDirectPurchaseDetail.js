import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
    showDirectPurchase,
    submitDirectPurchaseForPayment,
    disbursePayment,
    recordGoodsReceipt,
    cancelDirectPurchase
} from '../../services/directPurchaseServices.js'
import { getAccountingAccounts } from '../../services/accountingAccountServices.js'
import { showLoading, showSuccess, showError, showPrompt } from '../../utils/swal.js'

export function useDirectPurchaseDetail() {
    const router = useRouter()
    const route = useRoute()

    // State
    const dp = ref(null)
    const isLoading = ref(true)
    const bankAccounts = ref([])

    // Modals State
    const showSubmitModal = ref(false)
    const showDisburseModal = ref(false)
    const showGoodsReceiptModal = ref(false)

    // Form states
    const submitForm = reactive({
        payment_method: 'bank_transfer',
        recipient_type: 'supplier',
        recipient_name: '',
        bank_name: '',
        bank_account_number: '',
        bank_account_holder: '',
        notes: '',
        approval_notes: ''
    })

    const disburseForm = reactive({
        source_account_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        bank_fee: 0,
        notes: ''
    })

    const grForm = reactive({
        receipt_date: new Date().toISOString().split('T')[0],
        delivery_note_number: '',
        shipping_carrier: '',
        notes: '',
        items: []
    })

    const fetchDetail = async () => {
        try {
            isLoading.value = true
            const id = route.params.id
            const response = await showDirectPurchase(id)
            dp.value = response.data || null

            if (dp.value) {
                submitForm.recipient_name = dp.value.supplier?.name || dp.value.merchant_name || dp.value.marketplace_name || ''
                submitForm.bank_account_holder = submitForm.recipient_name
            }
        } catch (error) {
            showError('Gagal Memuat Detail!', 'Transaksi Direct Purchase tidak ditemukan atau terjadi kesalahan server.', error)
            router.push({ name: 'user.purchasing.direct' })
        } finally {
            isLoading.value = false
        }
    }

    const fetchBankAccounts = async () => {
        try {
            const response = await getAccountingAccounts('', 1, { is_active: 1 })
            bankAccounts.value = response.data || response || []
        } catch (e) {
            console.error('Failed to load accounting accounts', e)
        }
    }

    const tableColumns = computed(() => {
        const cur = dp.value?.currency ? `(${dp.value.currency})` : '(Rp)'
        return [
            { key: 'no', label: 'No', class: 'w-14 text-center' },
            { key: 'item', label: 'Item & Referensi', class: 'min-w-[240px]' },
            { key: 'unit', label: 'Satuan', class: 'w-24 text-center' },
            { key: 'qty', label: 'Kuantitas', class: 'w-28 text-right' },
            { key: 'price', label: `Harga Satuan ${cur}`, class: 'w-36 text-right' },
            { key: 'discount', label: `Diskon ${cur}`, class: 'w-32 text-right' },
            { key: 'subtotal', label: `Subtotal ${cur}`, class: 'w-40 text-right' },
            { key: 'notes', label: 'Catatan & Tautan', class: 'min-w-[180px]' }
        ]
    })

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

    const openSubmitModal = () => {
        if (!dp.value) return
        submitForm.payment_method = dp.value.payment_method || (dp.value.purchase_channel === 'marketplace' ? 'marketplace_va' : 'bank_transfer')
        submitForm.recipient_type = dp.value.recipient_type || (dp.value.purchase_channel === 'marketplace' ? 'marketplace_merchant' : (dp.value.purchase_channel === 'direct_supplier' ? 'supplier' : 'other'))
        submitForm.recipient_name = dp.value.recipient_name || dp.value.supplier?.name || dp.value.merchant_name || dp.value.marketplace_name || ''
        submitForm.bank_name = dp.value.bank_name || ''
        submitForm.bank_account_number = dp.value.bank_account_number || ''
        submitForm.bank_account_holder = dp.value.bank_account_holder || submitForm.recipient_name
        submitForm.notes = dp.value.notes || ''
        showSubmitModal.value = true
    }

    const confirmSubmitForPayment = async () => {
        if (!dp.value) return
        try {
            showLoading('Mengajukan permohonan pembayaran...')
            await submitDirectPurchaseForPayment(dp.value.id, {
                payment_method: submitForm.payment_method,
                recipient_type: submitForm.recipient_type,
                recipient_name: submitForm.recipient_name,
                bank_name: submitForm.bank_name,
                bank_account_number: submitForm.bank_account_number,
                bank_account_holder: submitForm.bank_account_holder,
                notes: submitForm.notes
            })
            showSubmitModal.value = false
            showSuccess('Berhasil!', `Permohonan pembayaran untuk ${dp.value.dp_number} siap dicairkan oleh bagian keuangan.`)
            fetchDetail()
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal mengajukan pembayaran.'
            showError('Gagal!', errorMsg, error)
        }
    }

    const openDisburseModal = async () => {
        await fetchBankAccounts()
        disburseForm.payment_date = new Date().toISOString().split('T')[0]
        disburseForm.reference_number = ''
        disburseForm.bank_fee = 0
        disburseForm.notes = ''
        showDisburseModal.value = true
    }

    const confirmDisburse = async () => {
        if (!dp.value?.payment_request) return
        if (!disburseForm.source_account_id) {
            showError('Validasi Gagal', 'Silakan pilih akun kas/bank sumber dana.')
            return
        }

        try {
            showLoading('Memproses pencairan dana...')
            await disbursePayment(dp.value.payment_request.id, {
                source_account_id: disburseForm.source_account_id,
                payment_date: disburseForm.payment_date,
                reference_number: disburseForm.reference_number,
                bank_fee: disburseForm.bank_fee,
                notes: disburseForm.notes
            })
            showDisburseModal.value = false
            showSuccess('Pembayaran Sukses!', 'Dana pembayaran telah dicairkan. Status direct purchase kini lunas.')
            fetchDetail()
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal mencairkan pembayaran.'
            showError('Gagal!', errorMsg, error)
        }
    }

    const openGoodsReceiptModal = () => {
        if (!dp.value?.items) return
        grForm.receipt_date = new Date().toISOString().split('T')[0]
        grForm.delivery_note_number = ''
        grForm.shipping_carrier = ''
        grForm.notes = ''
        grForm.items = dp.value.items.map(item => {
            const orderedQty = Number(item.quantity) || 1
            const alreadyAccepted = Number(item.already_accepted_quantity) || 0
            const remainingReceivable = typeof item.remaining_receivable_quantity !== 'undefined'
                ? Number(item.remaining_receivable_quantity)
                : Math.max(0, orderedQty - alreadyAccepted)
            const isFullyReceived = remainingReceivable <= 0
            return {
                direct_purchase_item_id: item.id,
                item_description: item.description || item.item?.name || 'Item',
                ordered_qty: orderedQty,
                already_accepted: alreadyAccepted,
                remaining_receivable: remainingReceivable,
                is_fully_received: isFullyReceived,
                isSelected: !isFullyReceived,
                quantity_received: remainingReceivable,
                quantity_accepted: remainingReceivable,
                quantity_rejected: 0,
                rejection_reason: ''
            }
        })
        showGoodsReceiptModal.value = true
    }

    const confirmGoodsReceipt = async () => {
        if (!dp.value) return
        if (!grForm.delivery_note_number) {
            showError('Validasi Gagal', 'Nomor surat jalan / bukti pengiriman wajib diisi.')
            return
        }

        const selectedItems = grForm.items.filter(it => it.isSelected)
        if (selectedItems.length === 0) {
            showError('Validasi Gagal', 'Pilih minimal 1 item barang yang diterima hari ini.')
            return
        }

        try {
            showLoading('Mencatat penerimaan barang fisik...')
            await recordGoodsReceipt({
                direct_purchase_id: dp.value.id,
                receipt_date: grForm.receipt_date,
                delivery_note_number: grForm.delivery_note_number,
                shipping_carrier: grForm.shipping_carrier,
                notes: grForm.notes,
                items: selectedItems.map(it => ({
                    direct_purchase_item_id: it.direct_purchase_item_id,
                    quantity_received: it.quantity_received,
                    quantity_accepted: it.quantity_accepted,
                    quantity_rejected: it.quantity_rejected,
                    rejection_reason: it.rejection_reason
                }))
            })
            showGoodsReceiptModal.value = false
            showSuccess('Penerimaan Berhasil!', 'Penerimaan fisik barang berhasil dicatat di gudang.')
            fetchDetail()
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal mencatat penerimaan barang.'
            showError('Gagal!', errorMsg, error)
        }
    }

    const handleCancel = async () => {
        if (!dp.value) return
        const { value: reason, isConfirmed } = await showPrompt({
            title: 'Batalkan Pembelian Langsung?',
            text: `Masukkan alasan pembatalan untuk ${dp.value.dp_number}:`,
            placeholder: 'Tuliskan alasan pembatalan pembelian ini...',
            confirmText: 'Ya, Batalkan Pembelian',
            cancelText: 'Tutup',
            isDestructive: true,
            validator: (value) => {
                if (!value) {
                    return 'Alasan pembatalan wajib diisi!'
                }
            }
        })

        if (!isConfirmed) return

        try {
            showLoading('Membatalkan pembelian...')
            await cancelDirectPurchase(dp.value.id, reason)
            showSuccess('Berhasil!', `Direct Purchase ${dp.value.dp_number} telah dibatalkan.`)
            fetchDetail()
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal membatalkan transaksi.'
            showError('Gagal!', errorMsg, error)
        }
    }

    onMounted(() => {
        fetchDetail()
    })

    return {
        dp,
        isLoading,
        bankAccounts,
        showSubmitModal,
        showDisburseModal,
        showGoodsReceiptModal,
        submitForm,
        disburseForm,
        grForm,
        tableColumns,
        formatDate,
        openSubmitModal,
        confirmSubmitForPayment,
        openDisburseModal,
        confirmDisburse,
        openGoodsReceiptModal,
        confirmGoodsReceipt,
        handleCancel
    }
}
