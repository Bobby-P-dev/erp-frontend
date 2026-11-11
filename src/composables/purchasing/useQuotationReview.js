import { ref } from 'vue'
import { showSupplierQuotation, confirmSupplierQuotationReview, submitSupplierQuotationReview } from '@/services/rfqServices.js'
import { quotationReviewAction } from '@/utils/quotationReview.js'
import { showConfirm, showError, showSuccess } from '@/utils/swal.js'

export function useQuotationReview(onRefresh = () => {}) {
    const selected = ref(null)
    const loading = ref(false)
    const submitting = ref(false)
    const error = ref('')

    const load = async id => {
        loading.value = true
        selected.value = null
        try {
            const response = await showSupplierQuotation(id)
            selected.value = response.data || response
        } catch (err) {
            error.value = err.response?.data?.message || 'Gagal memuat quotation. Muat ulang sebelum melakukan review.'
        } finally {
            loading.value = false
        }
    }

    const open = async id => {
        if (loading.value || submitting.value) return
        error.value = ''
        await load(id)
    }

    const submit = async () => {
        if (loading.value || submitting.value) return
        const action = quotationReviewAction(selected.value)
        if (!action) return
        submitting.value = true
        const id = selected.value.id
        const version = selected.value.review_version
        try {
            const direct = action === 'confirm_review'
            if (!await showConfirm(direct ? 'Sahkan quotation ini?' : 'Ajukan approval quotation?',
                `Versi ${version}. Pastikan rincian barang dan syarat penawaran sudah diperiksa.`)) return
            const response = await (direct ? confirmSupplierQuotationReview : submitSupplierQuotationReview)(id, version)
            selected.value = response.data || response
            error.value = ''
            await onRefresh()
            await showSuccess(direct ? 'Quotation disahkan' : 'Quotation diajukan untuk approval')
        } catch (err) {
            const message = err.response?.data?.message || 'Gagal memproses review quotation.'
            // Discard stale permissions/version, including after authorization or validation errors.
            await load(id)
            error.value = message
            await onRefresh()
            showError(message)
        } finally {
            submitting.value = false
        }
    }

    return { selected, loading, submitting, error, open, submit }
}
