import { ref } from 'vue'
import { createPurchaseOrderFromRequisition, issuePurchaseOrder } from '../../services/purchaseOrderServices.js'
import { showConfirm, showError, showSuccess } from '../../utils/swal.js'

export const canCreateRequisitionPo = pr => pr?.status === 'approved' && (pr?.source?.type === 'rfq_quotation' || pr?.procurement_route === 'direct_supplier')
    && pr.source_po_groups?.some(group => group.can_create)
export const canIssuePurchaseOrder = po => ['draft', 'approved'].includes(po?.status)

// Shared by list actions and the PO detail: confirmation, duplicate-click guard and refresh.
export function usePurchaseOrderActions() {
    const busy = ref(false)
    const activeId = ref(null)
    const run = async ({ id, title, text, confirmText, request, successTitle, success, refresh }) => {
        if (busy.value) return false
        busy.value = true
        activeId.value = id
        try {
            if (!await showConfirm(title, text, confirmText)) return false
            let response
            try {
                response = await request()
            } catch (error) {
                await showError('Tindakan belum berhasil', 'Muat ulang daftar sebelum mencoba kembali jika hasil belum terkonfirmasi.', error)
                return false
            }
            try {
                await refresh?.()
            } catch {
                await showError('Daftar belum diperbarui', 'Tindakan sudah berhasil, tetapi daftar gagal dimuat ulang. Muat ulang daftar untuk melihat status terbaru.')
            }
            await showSuccess(successTitle, success(response))
            return true
        } finally {
            busy.value = false
            activeId.value = null
        }
    }
    const createFromRequisition = (pr, refresh) => {
        if (!canCreateRequisitionPo(pr)) return false
        const groups = pr.source_po_groups.filter(group => group.can_create)
        return run({
            id: pr.id,
            title: 'Buat draft PO?',
            text: `${pr.pr_number}: buat ${groups.length} draft PO untuk ${groups.map(group => group.supplier_name).join(', ')}. ${pr.procurement_route === 'direct_supplier' ? 'Supplier, jumlah, harga satuan dan ketentuan mengikuti PR yang disetujui.' : 'Jumlah, harga, pajak dan ongkir mengikuti penawaran yang disetujui pada PR.'}`,
            confirmText: 'Buat draft PO',
            request: () => createPurchaseOrderFromRequisition(pr.id),
            successTitle: 'Draft PO berhasil dibuat',
            success: response => `Draft PO berhasil dibuat: ${(response.data || []).map(po => po.po_number).join(', ')}. Lanjutkan penerbitan dari menu Purchase Order.`,
            refresh,
        })
    }
    const issue = (po, refresh) => {
        if (!canIssuePurchaseOrder(po)) return false
        return run({
            id: po.id,
            title: 'Terbitkan PO ke pemasok?',
            text: `${po.po_number} akan tersedia di portal ${po.supplier?.name || 'pemasok'} untuk dikonfirmasi.`,
            confirmText: 'Terbitkan PO',
            request: () => issuePurchaseOrder(po.id),
            successTitle: 'PO diterbitkan',
            success: () => 'PO diterbitkan. Pemasok dapat melihat dan mengonfirmasi pesanan di portal.',
            refresh,
        })
    }
    return { busy, activeId, createFromRequisition, issue }
}
