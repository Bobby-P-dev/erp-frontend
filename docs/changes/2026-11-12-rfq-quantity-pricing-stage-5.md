# RFQ — Tahap 5: submit harga asli dan revisi penawaran

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Fitur / integrasi |
| Status pekerjaan | Implementasi dan verifikasi lokal selesai; UAT perusahaan belum dilakukan |
| Sprint / issue / PR | Melanjutkan tahap 1–4 |
| Plan terkait | [Plan backend](../../../erp-backend/docs/plans/rfq-quantity-pricing.md) |
| Status rilis | Belum dirilis ke produksi |

## Masalah dan dampak

Editor harga sebelumnya hanya untuk preview. Submit memakai serializer legacy yang tidak dapat membawa total asli/tier. Pada revisi, aturan v1 juga perlu dimuat ulang agar harga tidak berubah menjadi harga satuan hasil pembagian.

## Tujuan dan kriteria penerimaan

- [x] Form manual dan portal mengirim proporsional, bertingkat dan borongan.
- [x] Payload mempertahankan string decimal dan satu sumber harga asli.
- [x] Revisi portal memuat kembali mode, minimum, basis dan tier penawaran lama.
- [x] Tombol submit aktif mengikuti status pengiriman/upload existing.
- [x] Browser desktop/ponsel dan tes frontend lulus.
- [ ] UAT oleh pengguna perusahaan.

## Cakupan

Serializer quotation, composable manual/portal, editor dan ringkasan harga. Header/footer dan aturan approval tidak diubah. Nilai final tetap dihitung backend. Kebijakan visual tetap clean, modern, elegan dan hidup secukupnya sesuai [pedoman desain](../guides/design-principles.md).

## Rencana pengerjaan

1. Aktifkan serializer v1 tanpa mengirim field hasil hitung.
2. Pertahankan aturan saat revisi dimuat ulang.
3. Perbarui pesan/tombol dan uji desktop/ponsel.
4. Dokumentasikan integrasi dan deployment.

## Solusi dan keputusan

`quotationItem()` memilih jalur legacy atau `pricingInput()`. Input total mengirim numerator dan jumlah acuan sebagai string; tier mengirim sumber harga per minimum. Field lama yang tersisa di state setelah berganti mode tidak dikirim sebagai sumber kedua. Backend memvalidasi kembali setiap submit.

Mode v1 yang dimuat ulang tidak dapat dipilih kembali sebagai legacy melalui editor. Percobaan jumlah pembelian hanya untuk preview: peringatan borongan sebagian tidak mengubah jumlah yang ditawarkan. Ringkasan v1 menjelaskan perhitungan server serta pajak/ongkir agar tidak menampilkan total legacy yang keliru.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `src/utils/quotationPricing.js` | Serializer transaksi v1 dan legacy |
| `useRfqDetail.js` | Manual submit memakai serializer sesuai mode |
| `useSupplierPortalRfqForm.js` | Submit dan pemuatan ulang pricing saat revisi |
| `RfqQuotationItemEditor.vue` | Penjelasan ketentuan yang disimpan; perlindungan legacy pada v1 |
| `RfqManualQuotationModal.vue`, `SupplierRfqCostSidebar.vue` | Submit aktif dan informasi kalkulasi server |
| `tests/quotationValidity.test.js` | Manual borongan dan revisi tier portal membawa sumber asli |

Memerlukan backend tahap 5 dan kedua migrasi tahap 2/4. Tidak ada konfigurasi `.env` baru.

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | 244 lulus | Termasuk payload manual borongan dan tier pada revisi portal |
| `npm run build` | Lulus | Peringatan chunk besar tetap ada |
| Browser fixture manual/portal, 1440 dan 390 px | 4 skenario lulus | Payload decimal, total preview, tier tambah/hapus, alasan borongan, submit aktif, tanpa overflow/error JS |
| Pemeriksaan screenshot manual 390 px | Diperiksa | Editor dan tombol terbaca dalam modal ponsel |
| API nyata dari browser perusahaan | Belum dijalankan | Browser memakai mock preview; tes HTTP/database ada di backend |

## Hasil

Form dapat menyimpan harga baru dengan input asli. Total dan tier dipertahankan saat revisi, lalu dipakai backend sampai award/PO. Hasil integrasi backend tercatat di [catatan tahap 5](../../../erp-backend/docs/changes/2026-11-12-rfq-quantity-pricing-stage-5.md).

## Risiko dan batasan

UAT perusahaan dan deployment produksi belum dilakukan. Browser fixture tidak membuktikan jaringan/autentikasi produksi. Nilai harga baru wajib dihitung server; ringkasan legacy tidak dipakai untuk menghitung transaksi v1.

## Deployment dan pemulihan

Deploy backend/migrasi sebelum bundle frontend yang cocok. Ikuti [panduan rilis backend](../../../erp-backend/docs/plans/rfq-quantity-pricing-release.md). Setelah v1 tersimpan, jangan kembali ke backend yang tidak memahami tier/snapshot atau menghapus schema pricing.

## Tindak lanjut

- [ ] UAT label minimum, total, satuan dan borongan bersama purchasing/supplier.
- [ ] Verifikasi setelah deployment dan catat bukti rilis.
