const labels = {
    not_sent: 'Belum dikirim',
    legacy_unknown: 'Riwayat lama — pengiriman belum terverifikasi',
    queued: 'Dalam antrean',
    sending: 'Sedang diproses',
    sent: 'Diserahkan ke layanan email',
    failed: 'Gagal dikirim',
    unknown: 'Hasil belum pasti — perlu pemeriksaan',
}

const errors = {
    queue_unavailable: 'Antrean tidak tersedia. Coba lagi setelah layanan pulih.',
    invalid_recipient: 'Alamat email supplier tidak valid.',
    portal_not_configured: 'Alamat portal RFQ belum dikonfigurasi.',
    mail_not_configured: 'Layanan email pengiriman belum dikonfigurasi.',
    portal_token_missing: 'Tautan portal belum tersedia.',
    tender_closed: 'Tender sudah ditutup atau melewati deadline.',
    mail_cancelled: 'Pengiriman dibatalkan oleh layanan email.',
    delivery_uncertain: 'Periksa catatan penyedia email sebelum mengirim ulang.',
    worker_interrupted: 'Proses terhenti. Periksa catatan penyedia email.',
}

export const invitationLabel = status => labels[status] || 'Status belum diketahui'
export const invitationError = code => errors[code] || (code ? 'Pengiriman perlu diperiksa.' : '')
export const canSendInvitation = (supplier, canRespond) => Boolean(canRespond) &&
    ['not_sent', 'legacy_unknown', 'failed'].includes(supplier.invitation_status)
