import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
    showDirectPurchase,
    submitDirectPurchaseForPayment,
    recordGoodsReceipt,
    cancelDirectPurchase
} from '../../services/directPurchaseServices.js'
import { showLoading, showSuccess, showError, showPrompt } from '../../utils/swal.js'

export function useDirectPurchaseDetail(documentId, onChanged = () => {}) {
    const route = useRoute()

    // State
    const dp = ref(null)
    const isLoading = ref(true)
    const loadError = ref(false)

    // Modals State
    const showSubmitModal = ref(false)
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
            loadError.value = false
            const id = documentId ?? route.params.id
            const response = await showDirectPurchase(id)
            if (!response.data) throw new Error('Direct purchase unavailable')
            dp.value = response.data

            if (dp.value) {
                submitForm.recipient_name = dp.value.supplier?.name || dp.value.merchant_name || dp.value.marketplace_name || ''
                submitForm.bank_account_holder = submitForm.recipient_name
            }
        } catch (error) {
            loadError.value = true
        } finally {
            isLoading.value = false
        }
    }

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
            await fetchDetail()
            onChanged()
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal mengajukan pembayaran.'
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
            await fetchDetail()
            onChanged()
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
            await fetchDetail()
            onChanged()
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
        loadError,
        fetchDetail,
        showSubmitModal,
        showGoodsReceiptModal,
        submitForm,
        grForm,
        formatDate,
        openSubmitModal,
        confirmSubmitForPayment,
        openGoodsReceiptModal,
        confirmGoodsReceipt,
        handleCancel
    }
}
