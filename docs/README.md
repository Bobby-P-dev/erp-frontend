# Dokumentasi Pengembangan ERP Frontend

- [PR supplier langsung → PO](changes/2026-11-16-direct-supplier-pr-to-po.md): pilihan supplier pada PR, approval PR lalu PO tanpa PP/RFQ; implementasi/regresi lokal selesai, UAT/deployment terbuka.

- [Preview PDF, TTD biasa dan aksi PR](changes/2026-11-16-pdf-preview-signature-pr-actions.md): preview PR/BAST, hapus QR cetak, edit/hapus sebelum persetujuan pertama; tes lokal selesai, UAT/deployment terbuka.

- [Case 4 — Buat draft PO dan terbitkan langsung dari tabel](changes/2026-11-16-purchasing-direct-po-actions.md): aksi tanpa preview, handler reusable dan konfirmasi singkat; build, browser kedua daftar/regresi detail serta 3 tes backend terkait lulus. UAT/deployment belum diverifikasi.

- [PR RFQ langsung ke PO — petunjuk dan koreksi antrean PP](changes/2026-11-16-rfq-pr-direct-po-guidance.md). Backend menyaring item RFQ; detail PR memperjelas langkah ke PO. Regresi lokal lulus, UAT/deployment terbuka.

- [Case 3 — Pilihan workflow saat mengajukan PR dari RFQ awal](changes/2026-11-16-rfq-pr-workflow-selection.md): modal pilihan/preview pada pengajuan draft, 35 tes terkait, build dan browser desktop/ponsel lulus; UAT akun nyata/deployment belum diverifikasi.

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

- [RFQ — Batas langsung jumlah PR dari penawaran, 2026-11-16](changes/2026-11-16-rfq-pr-quantity-input-limit.md). Input dibatasi sisa kebutuhan/penawaran dan pembagian supplier; 8 tes unit, build dan browser desktop/ponsel lulus. UAT/deployment belum diverifikasi.

- [RFQ — Reset supplier ketika barang berubah, 2026-11-16](changes/2026-11-16-rfq-supplier-reset-on-item-change.md). Pilihan/filter direset dan rekomendasi diperbarui; edit jumlah/harga tetap mempertahankan supplier. Build dan browser fixture desktop/ponsel lulus. UAT/deployment belum diverifikasi.

- [RFQ — Dropdown pencarian dan perapihan form tender, 2026-11-16](changes/2026-11-16-rfq-create-search-dropdown-ux.md). Pemilih katalog/supplier reusable, informasi tambahan dapat dibuka saat diperlukan, navigasi bagian; 280 tes, build dan smoke browser desktop/ponsel lulus. UAT perusahaan/deployment belum diverifikasi.

- [RFQ — Fase 6 regresi UI/API dan UAT, 2026-11-16](changes/2026-11-16-rfq-catalog-supplier-selection-phase-6.md). Selesai lokal: 280 tes/build/browser lulus; integrasi nyata katalog/custom/campuran, penawaran subset dan PP lulus. Batching 101 pilihan teruji desktop/ponsel; checklist penerimaan disimpan pada dokumentasi backend. UAT perusahaan/deployment belum dilakukan.

- [RFQ — Fase 5 penawaran sebagian barang, 2026-11-16](changes/2026-11-16-rfq-catalog-supplier-selection-phase-5.md). Portal/manual dapat memilih subset; revisi mempertahankan pilihan, total/payload hanya barang aktif. 280 tes frontend, build dan browser komponen desktop/ponsel lulus; regresi backend 126 tes MySQL lulus. Fase 6, UAT dan deployment belum selesai.

- [RFQ — Fase 4 kandidat dan pemilihan supplier, 2026-11-16](changes/2026-11-16-rfq-catalog-supplier-selection-phase-4.md). Rekomendasi katalog, pencarian supplier lain, pagination, pilihan bertahan dan status kecocokan terbaru; 273 tes/build dan browser fixture desktop/ponsel lulus. API MySQL 35 tes lulus; integrasi penawaran, UAT dan deployment belum selesai.

- [RFQ — Fase 3 form katalog/custom, 2026-11-16](changes/2026-11-16-rfq-catalog-supplier-selection-phase-3.md). Pilihan per baris, pencarian/pagination dan nama/satuan master tanpa harga otomatis. 273 tes/build/browser fixture desktop/ponsel lulus; kandidat supplier fase 4, integrasi/UAT dan rilis belum selesai.

- [Procurement — Sprint 2 fase 6: integrasi dan regresi, 2026-11-13](changes/2026-11-13-procurement-sprint-2-phase-6.md). 269 tes, build, smoke lifecycle/PO desktop/ponsel dan integrasi UI/API dua sumber lulus. UAT/deployment belum dilakukan; hasil MySQL dan temuan Auth/Core dicatat di backend.

- [Procurement — Sprint 2 fase 5: PO dari PR disetujui, 2026-11-13](changes/2026-11-13-procurement-sprint-2-phase-5.md). Kartu supplier, konfirmasi Buat draft PO, refresh/tautan dan penjagaan form edit PO selesai lokal. 269 tes, build, browser desktop/ponsel dan UI/API nyata hingga issue/cancel lulus. Fase 6 konkurensi MySQL/UAT/rilis terbuka.

- [Procurement — Sprint 2 fase 4: lifecycle PR dari penawaran, 2026-11-13](changes/2026-11-13-procurement-sprint-2-phase-4.md). Revisi jumlah/pilihan dan pembatalan pada detail PR, izin submit/resubmit serta pembaruan total selesai lokal; 269 tes, build dan browser lifecycle desktop/ponsel lulus. PO fase 5/UAT/rilis belum selesai.

- [Procurement — Sprint 2 fase 3: PR dari penawaran, 2026-11-13](changes/2026-11-13-procurement-sprint-2-phase-3.md). Pemilihan supplier/jumlah, preview biaya, draft PR dan retry setelah koneksi terputus selesai lokal; 269 tes, build, browser fixture dan integrasi UI/API Laravel nyata lulus. Approval PR/PO fase 4–5 belum tersedia.

- [Procurement — Sprint 1 fase 6: integrasi RFQ dua sumber, 2026-11-12](changes/2026-11-12-procurement-sprint-1-phase-6.md). Sprint 1 selesai implementasi/regresi lokal; 263 tes frontend, build dan browser API nyata lulus. Backend 357 lulus, 4 tes race MySQL dilewati; UAT/rilis belum selesai.
- [Procurement — Sprint 1 fase 5: frontend RFQ dua sumber, 2026-11-12](changes/2026-11-12-procurement-sprint-1-phase-5.md). Selesai lokal: 263 tes, build dan browser fixture desktop/ponsel lulus; integrasi aktual ditutup pada fase 6 di atas.

- [RFQ — harga final supplier saat jumlah berubah, 2026-11-12](changes/2026-11-12-rfq-price-reconfirmation.md). Permintaan dari evaluasi, form supplier dan revisi manual; selesai lokal, UAT/rilis belum diverifikasi.

- [Portal supplier — tanda terima dan hasil evaluasi, 2026-11-12](changes/2026-11-12-supplier-rfq-receipt.md). Nama/satuan, angka ringkas, alokasi dan tindak lanjut PO; selesai lokal, UAT/rilis belum diverifikasi.

- [Evaluasi RFQ — alasan alokasi terblokir oleh minimum supplier, 2026-11-12](changes/2026-11-12-rfq-award-minimum-feedback.md). Minimum dan alasan penolakan tampil dekat input serta tombol lanjut; 248 tes, build dan browser fixture desktop/ponsel lulus.

- [Form isi penawaran supplier — 2026-11-12](changes/2026-11-12-supplier-quotation-form-ux.md). Penyederhanaan isian harga, disclosure, dokumen dan ringkasan di bawah form.

- [RFQ — minimum pembelian default 1, 2026-11-12](changes/2026-11-12-rfq-default-minimum-quantity.md). Default proporsional lebih mudah dipahami; minimum tersimpan tetap dipertahankan.

- [RFQ — jumlah dan nominal preview tanpa nol desimal berlebih, 2026-11-12](changes/2026-11-12-rfq-quantity-display.md). Jumlah lebih ringkas; total dan harga ekuivalen memakai pemisah ribuan serta pecahan seperlunya tanpa kehilangan presisi.

- [Detail barang RFQ — hierarki visual dan panel rincian interaktif, 2026-11-12](changes/2026-11-12-rfq-item-detail-refinement.md). Build dan browser fixture desktop/tablet/ponsel lulus; rincian per barang atau sekaligus dengan aksen visual secukupnya.

- [RFQ quantity pricing — tahap 5 aktivasi submit dan revisi, 2026-11-12](changes/2026-11-12-rfq-quantity-pricing-stage-5.md). Implementasi lokal selesai; 244 tes, build dan 4 skenario browser fixture lulus. UAT perusahaan dan deployment belum dilakukan.

- [RFQ quantity pricing — tahap 4 preview alokasi dan rincian PO, 2026-11-12](changes/2026-11-12-rfq-quantity-pricing-stage-4.md). Integrasi lokal selesai; 244 tes dan build lulus. Submit v1 masih pratinjau sampai aktivasi tahap 5.

- [RFQ quantity pricing — tahap 3 form dan preview portal, 2026-11-12](changes/2026-11-12-rfq-quantity-pricing-stage-3.md). Editor manual/portal selesai lokal; transaksi mode baru menunggu tahap 4.

- [RFQ harga berdasarkan jumlah — tahap 1 spesifikasi UI, 2026-11-12](changes/2026-11-12-rfq-quantity-pricing-stage-1.md). Dokumentasi selesai; implementasi mengikuti backend dan integrasi award/PO.

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
