# RFQ — Fase 5 penawaran sebagian barang

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Fitur / perbaikan |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Sprint sisipan katalog RFQ, fase 5 |
| Plan terkait | [Plan backend](/var/www/erp-backend/docs/plans/rfq-catalog-supplier-selection.md) |
| Status rilis | Belum diverifikasi; UAT perusahaan belum dilakukan |

## Masalah dan dampak

Supplier dari rekomendasi gabungan dapat hanya menyediakan sebagian barang. Form portal dan manual masih memvalidasi semua baris, serta revisi menganggap seluruh barang RFQ ditawarkan. Ini menyulitkan supplier dan dapat mendorong penggunaan harga nol untuk barang yang tidak tersedia.

## Tujuan dan kriteria penerimaan

- [x] Supplier/purchasing dapat mengaktifkan atau menonaktifkan barang pada portal/form manual.
- [x] Hanya barang aktif masuk validasi, total, pratinjau dan payload; minimal satu aktif.
- [x] Harga kosong ditolak pada barang aktif; harga nol eksplisit tetap berarti gratis.
- [x] Revisi portal memuat subset lama; konfirmasi jumlah mempertahankan baris yang diwajibkan backend.
- [x] Pilihan dapat digunakan dengan keyboard pada desktop/ponsel tanpa overflow horizontal.

## Cakupan dan rencana

Telusuri API dan revisi, gunakan helper bersama untuk pilihan/payload, tambahkan checkbox pada editor reusable, sesuaikan summary, lalu uji composable/browser/build. Backend sudah mendukung subset; tidak menambah API, migration atau dependensi. Tidak mengubah header/footer, approval maupun desain di luar kebutuhan ini.

## Solusi dan keputusan

Checkbox “Tawarkan barang ini” ditampilkan melalui prop `selectable` pada editor. Barang nonaktif tetap menampilkan identitas dan kebutuhan, dengan penjelasan bahwa baris tidak masuk penawaran/total. Input disembunyikan, nilai lokal dipertahankan bila diaktifkan lagi. Form baru memilih semua barang untuk mempertahankan perilaku lama; revisi memakai baris quotation tersimpan sebagai sumber pilihan.

State `is_offered` tidak dikirim server. Serializer bersama menghapus baris nonaktif; barang tidak tersedia tidak disimpan sebagai harga nol. Konfirmasi harga mengunci seluruh baris lama sesuai aturan backend. Summary menampilkan “1 dari 2 barang ditawarkan”; mode pratinjau memperhitungkan baris aktif saja.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `src/utils/quotationPricing.js` | `offeredQuotationItems`, `quotationItems`, `hydrateQuotationSelection`; filter mode preview |
| `src/composables/purchasing/useSupplierPortalRfqForm.js` | Pilihan awal, hidrasi subset, validasi/total/payload |
| `src/composables/purchasing/useRfqDetail.js` | Manual subset, validasi/total/payload dan spesifikasi RFQ |
| `src/components/purchasing/rfq/RfqQuotationItemEditor.vue` | Checkbox reusable, collapse baris nonaktif, pembatalan preview dan lock konfirmasi |
| `src/components/purchasing/rfq/portal/SupplierRfqItemsTable.vue` | Instruksi singkat dan jumlah barang ditawarkan |
| `src/components/purchasing/rfq/portal/SupplierRfqCostSidebar.vue` | Summary menghitung pilihan aktif |
| `src/components/purchasing/rfq/detail/RfqManualQuotationModal.vue` | Pilihan aktif serta instruksi dan jumlah barang |
| `tests/quotationPartial.test.js` | Tujuh tes perilaku portal/manual, kosong vs gratis, subset revisi dan konfirmasi |
| `tests/browser/rfqPartialQuotation.smoke.mjs` | Browser komponen dengan composable asli dan fixture API |

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | 280 tes lulus | Termasuk 7 tes fase 5 |
| `npm run build` | Lulus | Peringatan ukuran chunk >500 kB |
| `tests/browser/rfqPartialQuotation.smoke.mjs` | Lulus, 1440/390 px | Portal/manual: keyboard, toggle, retensi input, subtotal dan POST subset melalui composable asli |
| Review screenshot | Dilakukan | `/tmp/rfq-partial-portal-1440.png`, `/tmp/rfq-partial-manual-390.png` |
| Backend katalog/integrasi MySQL | 40 tes / 349 assertions lulus | Publish, portal/manual subset, revisi, comparison, katalog/custom PR → approval PR → PO |
| Regresi backend MySQL | 126 tes / 1.314 assertions lulus | Katalog, RFQ initial need, konversi/lifecycle PR/PO dan konkurensi pada database disposable |
| `git diff --check` kedua repo | Lulus | [Detail backend](/var/www/erp-backend/docs/changes/2026-11-16-rfq-catalog-supplier-selection-phase-5.md) |

Browser dijalankan memakai Playwright runtime bawaan dan `/usr/bin/google-chrome`. Endpoint browser difixture sehingga tidak menulis database ERP atau mengirim email.

## Hasil

Supplier dapat mengirim A saja dari RFQ A/B tanpa mengisi B. Barang B menjadi “Tidak ditawarkan”; perhitungan, preview dan payload tidak mencakup B. Saat revisi portal dimuat, B tetap nonaktif dan boleh ditambahkan bila tersedia. Baris yang wajib dipertahankan untuk konfirmasi harga tidak dapat dihapus lewat checkbox.

## Risiko dan batasan

Input barang nonaktif hanya dipertahankan selama sesi form; server menyimpan subset penawaran aktual. Guard histori, PR, award dan PO tetap diperiksa server. Browser memakai fixture terpisah dari tes API MySQL; integrasi UI/API nyata, alur PP lengkap dan UAT perusahaan tetap fase 6. Tidak mengklaim sudah deployment.

## Deployment dan pemulihan

Build/deploy frontend dengan baseline backend sebelumnya. Tidak ada konfigurasi atau migration baru. Rollback dengan build frontend sebelumnya; kontrak quotation tidak berubah.

## Tindak lanjut

- [ ] Fase 6: regresi/PP, integrasi UI/API nyata dan checklist UAT katalog/custom/campuran serta status rilis.
