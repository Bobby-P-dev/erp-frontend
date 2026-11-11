# Sprint 2 tahap 6 — Regresi frontend dan penutupan lokal

Tanggal: 2026-11-09. Status: **Selesai verifikasi lokal**. Status rilis: **Belum dirilis; UAT/staging masih terbuka**.

## Tujuan dan hasil

Tahap ini memverifikasi gabungan fitur validitas quotation, deadline WIB, perpanjangan, serta status dan retry undangan yang telah diimplementasikan pada tahap 3–5. Tidak ada perubahan kode produksi frontend pada tahap 6.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test` | **199 tes, 45 suite lulus**. |
| `npm run build` | Lulus; peringatan ukuran chunk >500 kB tetap ada. |
| Pemeriksaan diff terarah file RFQ/validitas/deadline/undangan dan docs | Lulus. Seluruh diff repository masih memiliki trailing whitespace di perubahan lain; tidak dibersihkan sebagai bagian penutupan RFQ. |
| Regresi backend RFQ/PO/portal | **78 tes, 759 assertion lulus**, termasuk antrean database → portal → award → PO dan email gagal → quotation manual → perpanjangan deadline. |
| Suite backend penuh | **438 tes: 431 lulus; 5 failure dan 2 error** pada reset password, verifikasi email dan upload file. Kegagalan muncul kembali saat diuji terpisah dari RFQ. |

Tes backend baru memakai database SQLite in-memory dan worker antrean database dengan email mock/log. Tidak ada email nyata yang dikirim. Hasil ini tidak membuktikan integrasi browser/provider atau deployment.

## Penutupan dan rencana rilis

- Implementasi dan regresi otomatis lokal Sprint 2 RFQ selesai; REG-01–03 backend masih perlu tindak lanjut sebelum seluruh repository dinyatakan siap rilis.
- Browser/UAT dan data bersamaan, migrasi database aplikasi, provider email, worker/scheduler staging, deployment, commit dan push belum dijalankan.
- Deploy frontend setelah backend dengan resource status/validitas/deadline baru dan migrasi terkait tersedia.
- Ikuti [matriks UAT dan rencana rilis bersama](../../../erp-backend/docs/plans/rfq-sprint-2-release.md). Semua baris UAT masih berstatus belum diuji.

Referensi: [hasil backend tahap 6](../../../erp-backend/docs/changes/2026-11-09-rfq-sprint-2-stage-6-regression.md), [plan frontend](../plans/rfq-frontend-alignment.md), dan [tahap 5](2026-11-09-rfq-sprint-2-stage-5-invitations.md).
