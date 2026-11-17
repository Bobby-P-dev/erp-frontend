# RFQ — Fase 4 kandidat supplier berdasarkan barang

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Fitur / refactor |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Sprint sisipan katalog RFQ, fase 4 |
| Plan terkait | [Plan backend](/var/www/erp-backend/docs/plans/rfq-catalog-supplier-selection.md) |
| Status rilis | Belum dirilis / UAT belum dilakukan |

## Masalah dan dampak

Pemilih sebelumnya mengambil maksimal 200 supplier aktif, tidak mengikuti katalog dan mencampur daftar hasil dengan sumber data pilihan. Supplier terpilih harus bertahan saat pencarian, pagination atau kebutuhan barang berubah.

## Tujuan dan kriteria penerimaan

- [x] Rekomendasi gabungan barang dan label kecocokan tanpa duplikasi.
- [x] Custom/campuran serta supplier lain memakai pencarian server dengan pagination.
- [x] Pilih/hapus eksplisit; tidak mengirim undangan hanya karena kandidat muncul.
- [x] Pilihan bertahan, status kecocokan diperiksa terpisah dari halaman pencarian.
- [x] Loading, kosong, error/retry, respons usang dan supplier unavailable ditangani.

## Cakupan dan rencana

Periksa kontrak API, tambah composable state reusable, hubungkan form, uji browser/API serta dokumentasikan. Header/footer dan alur approval tetap. Penawaran parsial/transaksi lintas modul diteruskan fase 5.

## Solusi dan keputusan

Mode “Sesuai barang katalog” menghasilkan gabungan supplier dari mapping aktif. “Cari supplier lain” menyediakan seluruh supplier aktif yang berhak diakses, termasuk custom; semua tetap perlu dipilih. Nama barang cocok tampil dekat supplier. Hasil dipaginasi, debounce 300 ms dan respons usang diabaikan.

Cache pilihan terpisah dari daftar kandidat. Perubahan ID barang memeriksa ulang pilihan lewat `mode=all` dan `supplier_ids[]`, bukan menganggap hilangnya supplier dari hasil sebagai hilangnya kecocokan. Mapping yang hilang diberi penjelasan tanpa menghapus pilihan. Supplier tidak tersedia ditandai dan submit ditahan sampai pengguna menghapusnya; backend tetap menjadi validasi akhir. Kegagalan pemeriksaan diberi status belum terverifikasi dan tombol retry. Kontak diselesaikan dari master oleh backend saat simpan.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/composables/purchasing/useRfqSupplierCandidates.js` | Kandidat/pilihan, mode, pagination, refresh pilihan, version guard dan cleanup |
| `src/composables/purchasing/useRfqCreateForm.js` | Menghapus fetch 200 supplier; payload memakai objek pilihan, validasi unavailable |
| `src/components/purchasing/rfq/form/RfqSuppliersInviteSection.vue` | UI daftar kandidat dan pilihan, pencarian, kecocokan dan status |
| `src/views/purchasing/RfqCreateView.vue` | Penghubung state baru |
| `src/services/rfqServices.js` | Query kandidat, ID barang/supplier dan pagination |
| `tests/browser/rfqSupplierCandidates.smoke.mjs` | Browser fixture kandidat desktop/ponsel |
| `tests/browser/rfqInitialNeed.smoke.mjs` | Payload pilihan dan penolakan submit unavailable, regresi form |
| `tests/browser/rfqTwoSources.integration.mjs` | Selector pemilih baru; integrasi nyata belum dijalankan ulang |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 273 tes lulus |
| `npm run build` | Lulus, warning ukuran chunk >500 kB |
| Browser `rfqSupplierCandidates.smoke.mjs` | Lulus 1440/390 px: union, dedupe, >200, search/pagination, retention, stale list/selection, error/retry, unavailable/custom |
| Browser `rfqInitialNeed.smoke.mjs` | Lulus 1440/390 px: katalog/custom/mixed dan PP, payload supplier, unavailable menahan submit |
| API MySQL disposable pada backend | 35 tes, 194 assertions lulus |
| Pint backend / diff whitespace kedua repo | Lulus |

Browser memakai Playwright runtime bawaan (`PLAYWRIGHT_MODULE_PATH=…/playwright/index.mjs`) dan Chrome `/usr/bin/google-chrome`. Screenshot lokal `/tmp/rfq-phase4-mixed-{1440,390}.png` serta `/tmp/rfq-phase4-{1440,390}.png`; harness kandidat menggunakan stylesheet form sebenarnya. Fixture error 422/503 disengaja. Pemeriksaan UI/API nyata dan UAT perusahaan belum membuktikan rilis.

## Risiko dan tindak lanjut

- [ ] Fase 5: publish/penawaran parsial, comparison dan alur PR/PO dengan API nyata.
- [ ] Fase 6: regresi, batch >100 pilihan dan UAT; batching sudah diimplementasikan tetapi 101 pilihan sekaligus belum diuji browser.

## Deployment dan pemulihan

Backend perlu mendukung filter `supplier_ids[]` sebelum frontend dideploy. Tidak ada migration/config baru. Rollback dengan build frontend sebelumnya; data tidak dimigrasikan. [Rincian backend](/var/www/erp-backend/docs/changes/2026-11-16-rfq-catalog-supplier-selection-phase-4.md).
