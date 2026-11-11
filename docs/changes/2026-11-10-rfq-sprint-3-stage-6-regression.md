# RFQ — Sprint 3 tahap 6: regresi dan pemeriksaan browser

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-10 |
| Jenis | Hasil sprint / pengujian |
| Status pekerjaan | Selesai regresi lokal; UAT perusahaan dan rilis terbuka |
| Sprint / issue / PR | Sprint 3 tahap 6 |
| Plan terkait | [Review quotation](../plans/rfq-sprint-3-review.md), [UAT/rilis bersama](../../../erp-backend/docs/plans/rfq-sprint-3-release.md) |
| Status rilis | Belum dirilis ke produksi |

## Masalah dan dampak

Tes kontrak dan build sudah tersedia pada tahap 3–5, tetapi interaksi modal review/revisi dan penanganan konflik belum dibuktikan pada browser. Bukti lokal perlu dipisahkan dari penerimaan pengguna dengan API/akun nyata.

## Tujuan dan kriteria penerimaan

- [x] Komponen Vue asli dapat mengesahkan langsung dan mengajukan approval melalui endpoint yang sesuai.
- [x] Validasi alasan/pesan revisi, pencatatan versi baru dan form evaluasi dapat dipakai pada browser.
- [x] Konflik review memuat ulang detail, menunjukkan error dan tidak menampilkan sukses.
- [x] Alur direct/revisi juga diperiksa pada viewport 390 px.
- [ ] UAT halaman lengkap, akun nyata, keputusan approver, full/split award dan PO pada staging.

## Cakupan

Harness browser terisolasi dan dokumentasi; tidak mengubah komponen produksi pada tahap ini. Basis ERPNext tetap mengikuti baseline backend. Pembobotan dan Supplier Scorecard tidak ditambahkan.

## Rencana pengerjaan

1. Periksa hasil unit/build dan struktur review/revisi.
2. Mount komponen asli dengan Pinia, feedback dialog dan fixture API dalam Vite sementara.
3. Jalankan Chrome desktop/mobile dan konflik; catat hasil dan batasnya.
4. Perbarui indeks, plan serta rencana rilis bersama.

## Solusi dan keputusan

`tests/browser/rfqSprint3.smoke.mjs` menjalankan Vite pada port acak localhost, lalu membuka context Chrome baru untuk tiap skenario. Semua request API dicegat dengan fixture; request di luar fixture dan page error menggagalkan pemeriksaan. Browser/server milik tes ditutup setelah selesai. Data backend operasional tidak diubah.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `tests/browser/rfqSprint3.smoke.mjs` | Empat skenario komponen asli: desktop direct+revisi, pengajuan approval, mobile direct+revisi dan konflik versi. Form evaluasi diperiksa di tiap skenario. |
| Dokumentasi backend | Empat tes HTTP integrasi portal/manual × direct/approval hingga PO serta matriks penerimaan/rilis. |

Harness mendukung package `playwright` yang terpasang atau `PLAYWRIGHT_MODULE_PATH` menuju `index.mjs` package tersebut, dan `CHROME_EXECUTABLE_PATH` untuk browser lokal. Tidak menambah dependency produksi.

## Verifikasi

| Pemeriksaan | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | 224 tes, 50 suite lulus | Dijalankan tahap 6 sebelum harness; komponen produksi tidak berubah setelahnya. |
| `npm run build` | Lulus | Peringatan chunk >500 kB tetap ada. |
| `PLAYWRIGHT_MODULE_PATH=/home/bobby/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome node tests/browser/rfqSprint3.smoke.mjs` | 4 skenario lulus | Lokasi runtime khusus mesin ini. Percobaan awal tiga skenario lulus; selector tombol penutup error pada harness diperbaiki menjadi `Mengerti`, lalu keempatnya lulus. |
| `node --check tests/browser/rfqSprint3.smoke.mjs` | Lulus | Sintaks runner. |
| Diff frontend terarah | Masih ada whitespace pada perubahan sebelumnya | `SupplierPortalRfqView.vue` baris 226, 227, 237, 248, 249, 272, 286; tidak dibersihkan pada tahap ini. |
| Backend regresi terkait | 168 lulus, 3 skipped pada SQLite | 2.048 assertions; empat skenario integrasi baru termasuk di dalamnya. |
| Backend konkurensi MySQL terisolasi | 3 tes, 60 assertions lulus | Sesudah perbaikan asumsi fixture race; database sementara dihapus. |
| Backend suite penuh | 464 lulus dari 474 total | 5 failure, 2 error Auth/Core, 3 skipped; rincian pada hasil backend. |

## Hasil

Browser mengirim `expected_review_version` yang sesuai, menggunakan confirm-review pada direct dan submit-review pada approval. Form revisi menolak alasan/pesan kosong sebelum request, menerima harga baru pada versi 2 dan menampilkan kebutuhan pengesahan ulang. Respons 409 memuat ulang versi dan menutup tindakan lama. Form evaluasi mengikat kesesuaian teknis dan alasan pemilihan pada model.

## Risiko dan batasan

Ini pengujian komponen dengan API fixture, bukan UAT halaman lengkap atau E2E browser ke Laravel. Login, navigasi antarlaman, keputusan pemeriksa melalui drawer, portal supplier nyata, full/split award dan PO tetap perlu UAT. SMTP, worker/scheduler target serta tujuh temuan Auth/Core belum diselesaikan. Tidak mengklaim audit aksesibilitas atau layout menyeluruh dari viewport mobile saja.

## Deployment dan pemulihan

Belum deployment/commit/push. Ikuti [rencana rilis bersama](../../../erp-backend/docs/plans/rfq-sprint-3-release.md), deploy backend/frontend dengan kontrak alasan/versi dan schema yang sesuai. Pertahankan audit bila mengembalikan versi kode.

## Tindak lanjut

- [ ] Jalankan dan catat UAT S3-01–12 bersama pihak perusahaan.
- [ ] Selesaikan/putuskan REG-01–03 dan buktikan layanan operasional target sebelum rilis.

[Hasil backend tahap 6](../../../erp-backend/docs/changes/2026-11-10-rfq-sprint-3-stage-6-regression.md).
