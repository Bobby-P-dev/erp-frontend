# Purchasing — Alur approval cukup pada PR

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan alur dan tampilan |
| Status pekerjaan | Selesai implementasi/pengujian lokal |
| Sprint / issue / PR | Penyesuaian kebijakan setelah Sprint 3 |
| Plan terkait | [Integrasi RFQ Sprint 3](../plans/rfq-sprint-3-review.md) |
| Status rilis | UAT/deployment belum diverifikasi |

## Masalah dan dampak

Tab pemeriksaan meminta pengesahan quotation, sedangkan detail PO menawarkan pengajuan approval dan menampilkan persetujuan internal sebagai tahap wajib. Pengguna menetapkan approval cukup pada PR sehingga langkah tambahan membingungkan.

## Tujuan dan kriteria penerimaan

- [x] Mode none tidak menampilkan tombol pengesahan/approval quotation.
- [x] Rincian dan revisi tetap bisa diakses; evaluasi berada pada pemilihan pemenang.
- [x] PO memiliki tahapan penyusunan → penerbitan → konfirmasi supplier tanpa pengajuan approval baru.
- [x] Blok transaksi tetap berdasarkan keputusan API; riwayat lama tidak dipalsukan.

## Cakupan dan rencana

Telusuri API → sesuaikan helper status dan komponen rincian → hilangkan pengajuan approval PO → uji unit/integrasi, build dan browser fixture → catat hasil. Header/footer aplikasi tetap mengikuti layout yang ada.

## Solusi dan keputusan

`review_mode=none` menampilkan penawaran pending/legacy sebagai “Siap dievaluasi”, bukan “Disahkan”. API `can_award` dan `can_create_purchase_order` tetap menentukan tindakan; expiry, revisi dan alasan blok tidak diabaikan. Tab menjadi “Rincian & revisi”; buyer membaca bukti lalu mengevaluasi dan mencatat alasan saat memilih pemenang.

PO memakai penerbitan langsung. Tracker approval hanya ditampilkan untuk pending/revisi/ditolak historis dengan petunjuk penyelesaian proses lama. Mode quotation direct/approval tetap kompatibel bila diaktifkan backend, namun alur perusahaan aktif adalah none. Kebijakan dan rujukan ERPNext dijelaskan di [catatan backend](../../../erp-backend/docs/changes/2026-11-11-pr-only-procurement-approval.md).

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/utils/quotationReview.js` | Label none, alasan blok dari API dan tanpa tindakan pengesahan |
| `QuotationReviewSection.vue` | Rincian penawaran, penjelasan PR-only dan penghapusan hitungan wajib disahkan |
| `RfqComparisonView.vue`, `RfqItemsSuppliersTabs.vue` | Bahasa rincian/revisi dan evaluasi tanpa approval tambahan |
| `PurchaseOrderDetailView.vue` | Hapus pengajuan approval, tiga tahap dan petunjuk proses historis |
| Tes review dan browser smoke | Tambahkan mode none desktop/mobile sambil mempertahankan kompatibilitas mode lama |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 227 tes lulus |
| `npm run build` | Lulus; peringatan chunk font PDF tetap ada |
| `tests/browser/rfqSprint3.smoke.mjs` dengan Playwright/Chrome lokal | 6 skenario lulus, termasuk none desktop/mobile, mode lama dan konflik versi |
| Regresi backend RFQ/PO/portal dan PR/plan | 153 tes lulus, 3 konkurensi skipped; 1.863 assertions |

Hasil browser menggunakan API fixture dan komponen Vue asli. UAT halaman lengkap dengan akun/API perusahaan belum dilakukan; tidak ada klaim rilis produksi.

## Risiko dan tindak lanjut

- [ ] UAT alur PR disetujui → evaluasi supplier → PO → supplier mengonfirmasi.
- [ ] Tinjau dokumen pending approval historis sebelum migrasi operasional.
- Batas anggaran otomatis belum tersedia pada backend RFQ/PO; tampilan estimasi bukan bukti hard cap.

## Deployment dan pemulihan

Deploy bersama backend dengan `RFQ_QUOTATION_REVIEW_MODE=none`. Backend lokal telah mengaktifkan mode ini dan membersihkan cache konfigurasi. Pemulihan harus menyelaraskan versi UI/API dan meninjau PO yang dibuat selama kebijakan none; data approval lama tidak dihapus.
