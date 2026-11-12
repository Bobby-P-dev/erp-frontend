export const quotationReviewLabel = quotation => quotation?.review_mode === 'none'
    && ['pending_review', 'legacy_unreviewed'].includes(quotation.review_status)
    ? 'Siap dievaluasi' : ({
    legacy_unreviewed: 'Penawaran lama — belum diperiksa',
    pending_review: 'Menunggu pemeriksaan buyer',
    pending_approval: 'Menunggu approval',
    approved: 'Disahkan internal',
    revision_requested: 'Perlu revisi',
    rejected: 'Ditolak saat review',
})[quotation?.review_status] || 'Status review belum tersedia'

export const quotationReviewReason = quotation => {
    if (quotation?.review_mode === 'none') return quotation.review_block_reason || null
    if (!quotation?.review_status || quotation?.is_review_approved === true) return null
    if (quotation.review_status === 'pending_approval') return 'Menunggu keputusan approver sebelum award atau PO baru.'
    if (quotation.review_status === 'revision_requested') return 'Quotation perlu direvisi sebelum dapat disahkan kembali.'
    if (quotation.review_status === 'rejected') return 'Quotation ditolak saat review dan belum dapat digunakan untuk award atau PO baru.'
    return quotation.review_mode === 'direct'
        ? 'Buyer berizin perlu memeriksa dan mengesahkan quotation sebelum award atau PO baru.'
        : 'Quotation perlu diajukan dan disetujui approver sebelum award atau PO baru.'
}

export const quotationReviewAction = quotation => {
    if (!Number.isInteger(quotation?.review_version) || quotation.review_version < 1) return null
    if (quotation.review_mode === 'direct' && quotation.allowed_actions?.includes('confirm_review')) return 'confirm_review'
    if (quotation.review_mode === 'approval' && quotation.allowed_actions?.includes('submit_review')) return 'submit_review'
    return null
}
