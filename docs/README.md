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

## Catatan perubahan

| Tanggal | Modul | Catatan | Status |
| --- | --- | --- | --- |
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

- [Penyesuaian frontend RFQ](plans/rfq-frontend-alignment.md)
- [Sprint 3: review quotation](plans/rfq-sprint-3-review.md)
- [Sprint 2 RFQ: UAT dan rencana rilis bersama](../../erp-backend/docs/plans/rfq-sprint-2-release.md)
