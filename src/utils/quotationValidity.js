import { quotationReviewReason } from './quotationReview.js'

// Validity is a server decision. Do not infer it from the browser clock or RFQ deadline.
export const quotationValidityStatus = quotation => {
    if (quotation?.is_expired === true || quotation?.validity_status === 'expired') return 'expired'
    return ['valid', 'unspecified'].includes(quotation?.validity_status) ? quotation.validity_status : 'unknown'
}

export const quotationValidityLabel = quotation => ({
    valid: 'Masih berlaku',
    expired: 'Kedaluwarsa',
    unspecified: 'Masa berlaku belum ditentukan',
    unknown: 'Status masa berlaku belum tersedia'
})[quotationValidityStatus(quotation)]

export const quotationValidityReason = quotation => {
    const status = quotationValidityStatus(quotation)
    if (status === 'expired') {
        return `Quotation ${quotation.quotation_number || quotation.vendor_quotation_reference || ''} kedaluwarsa${quotation.valid_until ? ` sejak berakhirnya ${quotation.valid_until} (WIB)` : ''}. Award dan PO baru tidak tersedia.`
    }
    if (status === 'unknown') return 'Status masa berlaku belum tersedia. Muat ulang data sebelum melanjutkan.'
    if (quotation?.review_status && quotation?.is_review_approved !== true) return quotationReviewReason(quotation)
    return null
}

export const canAwardQuotation = quotation =>
    ['valid', 'unspecified'].includes(quotationValidityStatus(quotation)) && quotation?.can_award === true

export const canCreateQuotationPo = quotation =>
    ['valid', 'unspecified'].includes(quotationValidityStatus(quotation)) && quotation?.can_create_purchase_order === true

export const purchaseOrderValidityErrors = (awards, suppliers) => {
    const ids = [...new Set(awards.filter(award => !award.purchase_order_id).map(award => String(award.quotation_id)))]
    const errors = ids.flatMap(id => {
        const quotation = suppliers.find(supplier => String(supplier.quotation_id) === id)
        return canCreateQuotationPo(quotation) ? [] : [quotationValidityReason(quotation) || 'Quotation belum dapat digunakan untuk PO baru.']
    })
    return [...new Set(errors)]
}

export const quotationDateOrderError = form =>
    form.quotation_date && form.valid_until && form.valid_until < form.quotation_date
        ? 'Tanggal masa berlaku penawaran harus sama atau setelah tanggal penawaran.' : null

export const quotationApiError = (error, fallback) => {
    const errors = error.response?.data?.errors
    return errors?.valid_until?.[0] || errors?.quotation_date?.[0] || error.response?.data?.message || fallback
}
