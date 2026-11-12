# Dokumentasi Pengembangan ERP Frontend

Catat masalah, solusi, keputusan, rencana, dan hasil setiap perbaikan atau pengembangan fitur di folder ini.

## Struktur dan penggunaan

| Folder | Isi |
| --- | --- |
| `changes/` | Hasil perbaikan, fitur, atau sprint, termasuk bukti verifikasi. |
| `plans/` | Urutan kerja, dependensi, status, dan tindak lanjut. |
| `templates/` | Format catatan untuk pekerjaan berikutnya. |

1. Salin [template perubahan](templates/change-record.md) ke `changes/YYYY-MM-DD-modul-deskripsi.md` saat memulai pekerjaan.
2. Isi masalah, tujuan, cakupan, dan rencana; tautkan plan bila pekerjaan terdiri dari beberapa tahap.
3. Perbarui catatan yang sama selama implementasi. Sertakan keputusan, file terkait, perintah tes dan hasilnya, serta batasan yang belum diuji.
4. Tambahkan tautan pada daftar perubahan ini dan perbarui plan sebelum menutup pekerjaan. Nomor sprint/issue hanya diisi jika tersedia.
5. Pisahkan status pekerjaan dari status rilis. Tes lokal lulus belum membuktikan deployment selesai.

Status pekerjaan: **Direncanakan**, **Dikerjakan**, **Terblokir**, atau **Selesai**. Jangan menulis kredensial, token, isi `.env`, atau data pribadi dalam dokumentasi.

## Pedoman desain

Gunakan [prinsip desain aplikasi internal](guides/design-principles.md): clean, modern, elegan, hidup dan interaktif secukupnya tanpa berlebihan.

## Catatan perubahan

- [Penyempurnaan visual detail PO dan prinsip desain — 2026-11-11](changes/2026-11-11-po-detail-visual-refinement.md).

- [Penyempurnaan biaya & ketentuan supplier RFQ — 2026-11-11](changes/2026-11-11-rfq-supplier-costs-refinement.md).

- [Penyempurnaan rincian penawaran barang RFQ — 2026-11-11](changes/2026-11-11-rfq-offer-details-refinement.md).

- [Perbaikan pembagian satu barang RFQ ke beberapa supplier — 2026-11-11](changes/2026-11-11-rfq-same-item-split-award.md).

- [Alur pengadaan dengan approval cukup pada PR — 2026-11-11](changes/2026-11-11-pr-only-procurement-approval.md).

| Tanggal | Modul | Catatan | Status |
| --- | --- | --- | --- |
| 2026-11-11 | Purchasing / Purchase Order | [Redesign daftar dan detail PO dalam modal](changes/2026-11-11-purchase-order-redesign.md) | 227 tes, build dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Tender RFQ | [Alur evaluasi dan keputusan pemenang](changes/2026-11-11-rfq-evaluation-award-ux.md) | Build, 59 tes, wizard 3 ukuran dan 4 browser smoke lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Tender RFQ | [Redesign detail tender dan pemisahan informasi](changes/2026-11-11-rfq-detail-redesign.md) | Build, 45 tes RFQ dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Tender RFQ | [Matriks perbandingan penawaran, acuan ERPNext](changes/2026-11-11-rfq-comparison-redesign.md) | Build, 45 tes RFQ dan browser fixture 3 ukuran termasuk 6 supplier lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Tender RFQ | [Redesign form buat paket tender](changes/2026-11-11-rfq-create-redesign.md) | Build, 45 tes RFQ dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Tender RFQ | [Redesign daftar dan antrean rencana](changes/2026-11-11-rfq-list-redesign.md) | Build, 51 tes dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Direct Purchase | [Penyempurnaan preview, tautan produk dan pemisahan aksi Finance](changes/2026-11-11-direct-purchase-preview-ux-refinement.md) | Build, 17 tes dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Direct Purchase | [Redesign detail menjadi modal dan tab](changes/2026-11-11-direct-purchase-detail-redesign.md) | Build, 17 tes dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Direct Purchase | [Redesign form, koreksi lebar penuh dan input teks](changes/2026-11-11-direct-purchase-create-redesign.md) | Build, 17 tes kontrak dan browser fixture lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Direct Purchase | [Redesign daftar pembelian langsung](changes/2026-11-11-direct-purchase-list-redesign.md) | Build, 17 tes kontrak dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Rencana pengadaan | [Perbaikan lebar pagination](changes/2026-11-11-procurement-plan-pagination-layout.md) | Build dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Rencana pengadaan | [Redesign modal PR sumber](changes/2026-11-11-procurement-plan-source-pr-modal.md) | Build, 6 tes dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Rencana pengadaan | [Redesign detail dan modal dari daftar](changes/2026-11-11-procurement-plan-detail-redesign.md) | Build, 6 tes dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Rencana pengadaan | [Redesign form buat rencana dan ringkasan bawah](changes/2026-11-11-procurement-plan-create-redesign.md) | Build, 6 tes dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Rencana pengadaan | [Redesign daftar rencana dan antrean PR](changes/2026-11-11-procurement-plans-redesign.md) | Build, 6 tes dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Approval / UI | [Redesign dialog Setujui, Tolak dan Revisi](changes/2026-11-11-approval-decision-dialog-redesign.md) | Build, 46 tes dan 10 skenario browser fixture lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Approval | [Redesign preview persetujuan](changes/2026-11-11-approval-preview-redesign.md) | Build, 46 tes dan browser fixture PR/quotation lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / Approval & UI | [Redesign approval dan pola tabel reusable](changes/2026-11-11-approval-table-redesign.md) | Build, 34 tes dan browser fixture PR/approval 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | UI Global | [Redesign dialog konfirmasi dan feedback](changes/2026-11-11-global-feedback-redesign.md) | Build dan browser fixture 3 ukuran lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / PR | [Redesign form create PR](changes/2026-11-11-pr-create-redesign.md) | Build, 7 tes kontrak dan 3 skenario browser fixture lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / PR | [Redesign modal detail pengajuan](changes/2026-11-11-pr-detail-redesign.md) | Build dan 5 skenario browser fixture lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing / PR | [Redesign tabel daftar pengajuan](changes/2026-11-11-pr-list-redesign.md) | Build dan 3 skenario browser fixture lulus; UAT/rilis terbuka |
| 2026-11-11 | Purchasing | [Redesign halaman awal dan panduan opsional](changes/2026-11-11-purchasing-home-redesign.md) | Build dan 4 skenario browser fixture lulus; review akun nyata/UAT/rilis terbuka |
| 2026-11-11 | Dashboard | [Redesign ruang kerja internal](changes/2026-11-11-dashboard-redesign.md) | Build dan browser fixture desktop/mobile lulus; review pengguna/UAT/rilis terbuka |
| 2026-11-10 | RFQ / Sprint 3 | [Tahap 6: regresi dan browser komponen](changes/2026-11-10-rfq-sprint-3-stage-6-regression.md) | 224 tes, build dan 4 skenario Chrome fixture lulus; UAT perusahaan dan rilis terbuka |
| 2026-11-10 | RFQ / Sprint 3 | [Tahap 5: evaluasi dan alasan award](changes/2026-11-10-rfq-sprint-3-stage-5-evaluation.md) | Selesai lokal; 224 tes dan build lulus; backend/migrasi lokal tersedia, UAT/rilis belum diverifikasi |
| 2026-11-10 | RFQ / Sprint 3 | [Tahap 4: revisi dan riwayat quotation](changes/2026-11-10-rfq-sprint-3-stage-4-revisions.md) | Selesai lokal; 222 tes frontend dan build lulus; migrasi backend lokal diterapkan, UAT/rilis belum diverifikasi |
| 2026-11-10 | RFQ / Sprint 3 | [Tahap 3: review buyer dan status supplier](changes/2026-11-10-rfq-sprint-3-stage-3-review.md) | Selesai lokal; 215 tes frontend, build dan 145 tes backend lulus; browser/UAT/rilis belum diverifikasi |
| 2026-11-10 | RFQ | [Timestamp aktivitas dalam WIB](changes/2026-11-10-rfq-timestamp-wib.md) | 202 tes dan build lulus; browser/rilis belum diverifikasi |
| 2026-11-09 | RFQ / Sprint 2 | [Tahap 6: regresi dan penutupan lokal](changes/2026-11-09-rfq-sprint-2-stage-6-regression.md) | 199 tes dan build lulus; 78 tes backend RFQ lulus, 7 temuan suite backend penuh masih terbuka; UAT/rilis belum dijalankan |
| 2026-11-09 | RFQ / Sprint 2 | [Tahap 5: status, retry dan riwayat undangan](changes/2026-11-09-rfq-sprint-2-stage-5-invitations.md) | Selesai; 199 tes dan build lulus; memerlukan backend tahap 5, belum dirilis |
| 2026-11-09 | RFQ / Sprint 2 | [Tahap 4: deadline dan perpanjangan](changes/2026-11-09-rfq-sprint-2-stage-4-deadline.md) | Selesai; 194 tes dan build lulus; backend memerlukan migrasi, belum dirilis |
| 2026-11-09 | RFQ / Sprint 2 | [Tahap 3: validitas quotation dan pengaman award/PO](changes/2026-11-09-rfq-sprint-2-stage-3-validity.md) | Selesai; 187 tes dan build lokal lulus, rilis belum diverifikasi |
| 2026-11-09 | RFQ | [Integrasi perbandingan mata uang, ranking biaya, dan award terkunci](changes/2026-11-09-rfq-comparison-integration.md) | Selesai; 172 tes dan build lokal lulus, rilis belum diverifikasi |

## Rencana aktif

Panduan komponen: [Pola tabel reusable](guides/table-pattern.md).

- [Redesign dashboard internal](plans/dashboard-redesign.md)
- [Penyesuaian frontend RFQ](plans/rfq-frontend-alignment.md)
- [Sprint 3: review quotation](plans/rfq-sprint-3-review.md)
- [Sprint 2 RFQ: UAT dan rencana rilis bersama](../../erp-backend/docs/plans/rfq-sprint-2-release.md)
