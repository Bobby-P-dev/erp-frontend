# Procurement — Sprint 2 fase 6: regresi dan integrasi dua jalur

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-13 |
| Jenis | Hasil sprint / pengujian integrasi |
| Status pekerjaan | Selesai pengujian frontend lokal |
| Sprint / issue / PR | Sprint 2 inisiatif dua jalur, fase 6 |
| Plan terkait | [Penyesuaian frontend](../plans/rfq-frontend-alignment.md), [Sprint 2 backend](../../../erp-backend/docs/plans/procurement-two-entry-sprint-2.md) |
| Status rilis | UAT perusahaan/deployment belum dilakukan |

## Masalah dan dampak

Fitur fase 3–5 perlu diverifikasi bersama backend nyata agar pemilihan penawaran, revisi PR, approval dan PO tidak hanya benar pada fixture. Alur lama melalui PP harus tetap dapat digunakan.

## Tujuan dan kriteria penerimaan

- [x] Kebutuhan awal berjalan sampai draft PR, revisi, approval, PO, issue/cancel dan pemulihan saldo.
- [x] Jalur procurement plan tetap mencapai award/PO dari PR approved.
- [x] Interaksi revisi dan pembuatan PO lulus pada desktop serta ponsel.
- [x] Tes frontend dan build produksi lulus; batasan UAT/rilis dicatat.

## Cakupan dan rencana pengerjaan

Perluas integrasi UI/API kedua sumber, jalankan smoke lifecycle/PO, tes dan build, lalu dokumentasikan hasil. Tidak menambah redesign, endpoint atau aturan approval baru pada fase ini.

## Solusi dan implementasi

`tests/browser/rfqTwoSources.integration.mjs` memeriksa RFQ kebutuhan awal melalui form portal supplier dan comparison, pembuatan PR, permintaan revisi, approval, pembuatan PO dari UI, issue/cancel dan pemulihan saldo. Skenario procurement plan mempertahankan jalur award/PO lama. Backend dan SQLite tes bersifat disposable.

Backend fase 6 memperbaiki pembacaan saldo/sumber pada transaksi MySQL bersamaan; 53 tes konversi MySQL lulus, termasuk konkurensi. Lihat [catatan backend](../../../erp-backend/docs/changes/2026-11-13-procurement-sprint-2-phase-6.md). Tidak ada perubahan kontrak frontend atau migration baru pada fase ini.

## Verifikasi

| Perintah / skenario | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | Lulus | 269 tes, 54 suite. |
| `npm run build` | Lulus | Warning bundle >500 kB masih ada. |
| `node tests/browser/rfqRequisitionLifecycle.smoke.mjs` | Lulus | Revisi, penghapusan pilihan, validasi, hitung ulang dan pembatalan pada 1440/390 px. |
| `node tests/browser/requisitionPurchaseOrders.smoke.mjs` | Lulus | Konfirmasi, batal, retry 422, refresh, tautan dan tombol duplikat pada 1440/390 px. |
| `node tests/browser/rfqTwoSources.integration.mjs` | Lulus | UI/API nyata: initial_need 1440 px hingga PO issue/cancel; procurement_plan 390 px hingga award/PO. |
| `git diff --check` | Lulus | Diff tracked tidak memiliki kesalahan whitespace. |

## Hasil dan batasan

Regresi frontend lokal selesai. Browser integrasi mencatat warning router untuk path kosong tetapi skenario lulus. Pengujian fixture pada dua ukuran bukan pengganti UAT pengguna; SMTP nyata dan produksi belum diuji. Suite backend penuh masih memiliki 7 kegagalan/error Auth/Core, tercatat pada hasil backend; seluruh sistem tidak dinyatakan hijau.

## Deployment dan pemulihan

Gunakan [panduan UAT/rilis bersama](../../../erp-backend/docs/plans/procurement-two-entry-sprint-2-release.md). Deploy frontend/backend yang cocok dengan schema fase sebelumnya. Tidak ada deployment pada fase 6 ini.

## Tindak lanjut

2026-11-13: browser integrasi dua jalur dan smoke lifecycle/PO pada 1440/390 px dijalankan ulang, seluruh proses exit 0. [Hasil pemeriksaan checklist UAT](../../../erp-backend/docs/changes/2026-11-13-procurement-sprint-2-uat-check.md) memisahkan bukti teknis dari penerimaan pengguna, termasuk variasi UI yang belum tercakup. Tidak ada perubahan runtime frontend pada pemeriksaan ini.

- [ ] UAT purchasing/approver termasuk desktop/ponsel, pesan validasi dan transaksi split supplier.
- [ ] Triase temuan backend Auth/Core dan catat keputusan kesiapan rilis.
- [ ] Catat versi, bukti UAT dan deployment lingkungan tujuan.
