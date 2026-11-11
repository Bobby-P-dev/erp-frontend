// Interpret the server snapshot only; elapsed time comes from a monotonic clock.
export function rfqDeadlineInfo(rfq, elapsedMs = 0) {
    const serverNow = Date.parse(rfq?.server_now)
    const deadline = Date.parse(rfq?.deadline_at)
    const known = Number.isFinite(serverNow) && typeof rfq?.can_receive_quotation === 'boolean'
        && (rfq.deadline_at === null || Number.isFinite(deadline))
    const expired = known && (rfq.is_expired === true || (Number.isFinite(deadline) && serverNow + elapsedMs > deadline))
    const canRespond = known && rfq.can_receive_quotation && !expired
    const hours = Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - serverNow - elapsedMs) / 3600000)) : null
    const label = !known ? 'Status deadline belum tersedia — segarkan data'
        : expired ? 'Batas waktu telah berakhir (WIB)'
            : !rfq.deadline_at ? 'Deadline belum ditentukan'
                : hours <= 24 ? `Sisa ${hours} jam (WIB)` : `Sisa ${Math.ceil(hours / 24)} hari (WIB)`
    const style = !known || expired ? 'bg-rose-50 text-rose-700 border-rose-200'
        : hours !== null && hours <= 24 ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-blue-50 text-blue-700 border-blue-200'
    return { label, isExpired: expired, canRespond, class: style, color: style,
        reason: known ? (expired ? 'Batas waktu respons tender telah berakhir. Hubungi buyer untuk perpanjangan deadline.' : rfq.deadline_block_reason) : label }
}
