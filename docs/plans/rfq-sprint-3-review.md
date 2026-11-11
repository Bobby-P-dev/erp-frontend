# Sprint 3 — Integrasi review quotation frontend

Rujukan utama: [rencana Sprint 3 backend](../../../erp-backend/docs/plans/rfq-improvement-sprint-3.md) dan [baseline ERPNext](../../../erp-backend/docs/plans/rfq-sprint-3-stage-1-baseline.md).

## Tahap 3

- [x] Periksa mode, izin, versi dan kontrak pengesahan backend tahap 2/2A.
- [x] Integrasikan detail pemeriksaan di detail dan perbandingan RFQ.
- [x] Sediakan pengesahan langsung dan pengajuan approval sesuai tindakan API.
- [x] Integrasikan tracker/keputusan approver dan penanganan API error tanpa mock sukses.
- [x] Tampilkan status supplier terpisah dari pemenang tender.
- [x] Uji regresi, kontrak request dan build produksi.
- [ ] UAT browser kedua mode dan verifikasi deployment.

Hasil lokal: [catatan tahap 3](../changes/2026-11-10-rfq-sprint-3-stage-3-review.md). Tahap 3 selesai implementasi/pengujian lokal; belum dirilis.

## Tahap 4

- [x] Integrasikan permintaan revisi dengan alasan internal dan pesan supplier terpisah.
- [x] Sediakan pencatatan versi baru, pajak dan lampiran oleh buyer.
- [x] Tampilkan snapshot versi dan riwayat keputusan.
- [x] Aktifkan pengiriman ulang supplier berdasarkan izin API, versi dan alasan.
- [x] Tangani konflik/penolakan dan uji regresi/build.
- [ ] UAT browser dan verifikasi deployment.

Hasil lokal: [catatan tahap 4](../changes/2026-11-10-rfq-sprint-3-stage-4-revisions.md). 222 tes frontend dan build lulus. Backend: 161 tes terkait dan 3 konkurensi MySQL lulus, migrasi lokal diterapkan.

## Tahap 5

- [x] Form evaluasi teknis/komersial, garansi, bukti dan alasan wajib pada full/split award.
- [x] Snapshot versi pilihan, pengosongan evaluasi saat supplier berubah dan penanganan penolakan server.
- [x] Tampilan riwayat keputusan dan informasi belum tersedia.
- [x] 224 tes frontend dan build lulus; [catatan tahap 5](../changes/2026-11-10-rfq-sprint-3-stage-5-evaluation.md).
- [ ] UAT browser dan rilis bersama backend.

## Tahap 6

- [x] Verifikasi 224 tes frontend dan build produksi.
- [x] Tambahkan harness Chrome dengan komponen asli dan API fixture, empat skenario lulus termasuk mobile dan konflik versi.
- [x] Verifikasi integrasi HTTP backend portal/manual × direct/approval hingga PO; 168 tes terkait lulus.
- [x] Catat suite backend penuh dan temuan Auth/Core pada [hasil tahap 6](../changes/2026-11-10-rfq-sprint-3-stage-6-regression.md).
- [ ] UAT browser halaman lengkap dengan akun/API nyata dan rilis bersama backend pada [rencana penerimaan/rilis](../../../erp-backend/docs/plans/rfq-sprint-3-release.md).

Sprint 3 selesai implementasi/regresi lokal dalam cakupan tahap 1–6. Browser fixture tidak menggantikan UAT perusahaan. Approval quotation tidak mengubah kebijakan approval PO.
