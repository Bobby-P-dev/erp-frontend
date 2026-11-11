# Sprint 2 tahap 5 — Status pengiriman undangan RFQ

Tanggal: 2026-11-09. Status: **Selesai implementasi dan verifikasi lokal**. Rilis: **Belum dirilis**.

## Masalah

Label “Diundang” mengandalkan timestamp backend yang sebelumnya terisi tanpa email dikirim. Buyer tidak dapat membedakan antrean, kegagalan, atau riwayat lama yang belum terverifikasi.

## Solusi

- Konsumsi `invitation_status` dan riwayat `invitation_attempts` dari supplier RFQ. Status email terpisah dari status respons quotation.
- Tampilkan belum dikirim, riwayat lama belum terverifikasi, antrean, diproses, diserahkan ke layanan email, gagal, dan hasil belum pasti. Label sukses hanya menyatakan penyerahan ke layanan email.
- Tampilkan riwayat penerima/waktu/status, kode kegagalan yang diterjemahkan, dan catatan rekonsiliasi operator bila tersedia.
- Tombol **Kirim Undangan/Coba Kirim Lagi** memanggil `POST /api/v1/rfqs/{id}/suppliers/{invitationId}/send-invitation`. Tombol hanya aktif selama penerimaan tender terbuka dan status not_sent/legacy_unknown/failed; backend tetap memvalidasi kondisi terbaru.
- Email kosong/tidak valid meminta koreksi alamat sebelum retry. Body opsional `email` dicatat backend sebagai snapshot percobaan baru. Percobaan lama tidak diubah.
- Riwayat lama meminta konfirmasi karena supplier mungkin sudah pernah menerima undangan. Hasil unknown memerlukan pemeriksaan provider oleh operator sebelum pengiriman ulang tersedia.
- Tombol **Perbarui Status** memuat ulang kondisi server. Klik pengiriman bersamaan diblokir selama request; penolakan API memuat ulang data dan menampilkan alasan.

## Hasil dan verifikasi

- `npm test`: **199 tes lulus**, termasuk lima tes baru untuk status, batas retry/deadline, koreksi email, pembatalan riwayat lama, klik bersamaan, serta penolakan backend.
- `npm run build`: lulus; peringatan ukuran chunk besar yang sudah ada tetap muncul.
- Backend: **76 tes, 715 assertion lulus**, memakai fake/mock tanpa email nyata.
- Browser/staging, konfigurasi provider email, worker/scheduler dan deployment belum dijalankan. Backend memerlukan migrasi undangan serta `RFQ_PORTAL_URL` dan mailer pengiriman yang benar. Deploy backend sebelum frontend yang mengonsumsi field baru.

Rincian status, konfigurasi, command pemulihan dan rekonsiliasi: [catatan backend](../../../erp-backend/docs/changes/2026-11-09-rfq-sprint-2-stage-5-invitations.md). Berikutnya tahap 6: regresi akhir dan penutupan Sprint 2.
