# RFQ — Penyederhanaan form isi penawaran supplier

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai — implementasi dan verifikasi lokal |
| Sprint / issue / PR | Penyempurnaan form quantity pricing |
| Plan terkait | [Penyesuaian frontend RFQ](../plans/rfq-frontend-alignment.md) |
| Status rilis | Implementasi lokal; UAT dan deployment belum dilakukan |

## Masalah dan dampak

Form menampilkan jumlah, merk, aturan harga, minimum pembelian, tingkatan harga dan simulasi bersamaan. Supplier harus memahami terlalu banyak istilah sekaligus. Masa berlaku tampil dua kali, ringkasan di sidebar kanan mempersempit form, dan panduan masih menyebut harga satuan saja. Deskripsi tier/borongan masih menyebut fitur pratinjau walaupun submit sudah aktif. Pesan kerahasiaan memuat klaim enkripsi dan waktu pembukaan evaluasi yang tidak dibuktikan dalam pekerjaan ini.

## Tujuan dan kriteria penerimaan

- [x] Urutan pengisian jelas: jumlah/harga barang, dokumen, pembayaran/pengiriman, lalu periksa dan kirim.
- [x] Spesifikasi/merk dan minimum pembelian dapat dibuka sesuai kebutuhan; nilai minimum tetap terlihat saat tertutup.
- [x] Simulasi jumlah terpisah dari jumlah yang ditawarkan dan tidak mengubahnya.
- [x] Ringkasan di bawah form dengan aksi primer biru dan penolakan berbatas netral.
- [x] Masa berlaku hanya satu field; unggah dokumen bisa diakses lewat keyboard.
- [x] Sumber harga desimal dan minimum penawaran tersimpan dipertahankan.

## Cakupan dan rencana

1. Telusuri komponen portal, editor reusable, pembentukan payload dan pedoman desain.
2. Terapkan disclosure dan bahasa yang lebih jelas pada editor bersama portal/input manual.
3. Rapikan dokumen, label, informasi biaya, dan ringkasan selebar halaman.
4. Verifikasi build, tes, dan browser fixture pada desktop/tablet/ponsel.

## Solusi dan keputusan

Informasi utama tetap terlihat. Spesifikasi dan merk memakai disclosure; minimum default 1 diringkas dan minimum khusus terbuka agar tidak terlewat saat revisi. Pilihan harga menjelaskan apakah pembelian sebagian diperbolehkan. Cara input harga satuan/total tetap tersedia, termasuk jumlah acuan yang eksplisit; input total memakai lebar penuh. Simulasi dibuka lewat tombol “Coba jumlah lain”, diberi label bahwa jumlah penawaran tidak berubah, dan kembali ke jumlah penawaran ketika ditutup.

Ringkasan berada di bawah form. Untuk skema harga baru, estimasi per barang tetap memakai preview server, sedangkan ringkasan menjelaskan perhitungan total akhir saat submit serta menampilkan tarif pajak/ongkir. Tidak menampilkan total lokal seolah-olah hasil kalkulator backend. Header/footer, aturan bisnis dan API tidak diubah. Klaim kerahasiaan diganti panduan pemeriksaan data sebelum kirim.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/rfq/RfqQuotationItemEditor.vue` | Hierarki item, disclosure, label mode, input total lebar penuh, simulasi opsional. |
| `src/components/purchasing/rfq/portal/SupplierRfqItemsTable.vue` | Judul dan instruksi pengisian yang sesuai kapabilitas aktif. |
| `src/components/purchasing/rfq/portal/SupplierRfqCommercialForm.vue` | Hapus field masa berlaku duplikat, label terhubung input, ukuran teks dan tombol upload keyboard. |
| `src/components/purchasing/rfq/portal/SupplierRfqCostSidebar.vue` | Ringkasan dan aksi horizontal pada desktop, petunjuk review yang faktual. Nama komponen dipertahankan untuk kompatibilitas import. |
| `src/views/public/SupplierPortalRfqView.vue` | Form dan ringkasan ditumpuk selebar halaman; panduan diperbarui. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 246 tes / 52 suite lulus. |
| `npm run build` | Lulus; peringatan ukuran chunk di atas 500 kB masih ada. |
| Browser fixture portal dan input manual, 1440/768/390 px | Enam skenario awal lulus: mode flat/total, tier tambah/hapus, borongan, disclosure, simulasi/reset, revisi dengan minimum 0.5 dan sumber nominal presisi, tanpa overflow/JS error. |
| Verifikasi akhir upload/penghapusan dan input total lebar penuh | Lulus bersama enam skenario portal/manual pada 1440/768/390 px; tombol memilih file membuka file chooser, lampiran terpilih tampil dan dapat dihapus. |

Browser memakai komponen nyata dengan API preview mock. Pengujian ini tidak membuktikan pengiriman email, submit/revisi ke database produksi, atau kecocokan nilai hasil kalkulator backend; aturan kalkulasi tidak diubah. Skrip sementara: `/tmp/erp-supplier-form-preview.mjs`; hasil akhir: `/tmp/erp-supplier-form-browser-final.log`. Satu pengulangan sempat timeout pada tombol simulasi ponsel; pengujian ponsel terpisah dan pengulangan penuh terakhir lulus. Penyebab timeout sementara belum dipastikan; tidak dicatat sebagai kegagalan kalkulator.

## Risiko dan tindak lanjut

- [ ] UAT supplier dengan jumlah barang banyak, harga bertingkat, dan revisi nyata pada staging.
- [ ] Verifikasi submit end-to-end dengan backend dan deployment bersama quantity pricing.
- [ ] Evaluasi pemisahan bundle frontend sebagai pekerjaan terpisah bila diperlukan.

## Deployment dan pemulihan

Belum dideploy. Tidak ada migrasi database atau perubahan kontrak API. Pemulihan dilakukan dengan membatalkan hanya perubahan UI pada catatan ini; pertahankan implementasi quantity pricing dari pekerjaan sebelumnya.
