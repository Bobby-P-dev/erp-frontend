# RFQ — Tahap 1 rancangan UI harga berdasarkan jumlah

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Spesifikasi fitur |
| Status pekerjaan | Selesai untuk tahap 1 dokumentasi |
| Sprint / issue / PR | Belum ditentukan |
| Plan terkait | [Spesifikasi backend lintas repository](../../../erp-backend/docs/plans/rfq-quantity-pricing.md) |
| Status rilis | Belum diimplementasikan atau dirilis |

## Masalah dan dampak

Form portal supplier dan input manual purchasing masih memakai harga satuan sebagai input. Subtotal dan preview alokasi dihitung melalui perkalian lokal; pola tersebut harus disesuaikan ketika harga berlaku menurut minimum jumlah atau pembelian borongan.

## Tujuan dan kriteria penerimaan

- [x] Petakan dampak UI tanpa mengubah transaksi pada tahap spesifikasi.
- [x] Catat perbedaan cara input dan syarat jumlah penawaran.
- [x] Tautkan aturan perhitungan bersama agar frontend/backend tidak membuat kebijakan berbeda.

## Cakupan dan rencana

Dokumentasi tahap 1 saja. Implementasi form pada tahap 3, integrasi evaluasi dan PO pada tahap 4, lalu browser/regresi/UAT pada tahap 5. Detail aturan dan contoh otoritatif berada pada spesifikasi backend di atas.

## Solusi dan keputusan

- Tetap mengikuti [prinsip desain internal](../guides/design-principles.md): clean, hidup, interaktif secukupnya. Tier bersifat opsional dan dibuka melalui aksi berlabel, bukan menambah banyak kolom wajib.
- Form menunjukkan jumlah dan satuan kebutuhan, jumlah ditawarkan, cara input harga satuan/total, serta mode flat/tiered/fixed quantity dengan penjelasan bisnis.
- Input total berlabel “Total untuk … [satuan], sebelum pajak dan ongkir”. Harga ekuivalen ditampilkan sebagai hasil hitung, bukan jaminan boleh membeli sebagian.
- Tier menampilkan minimum jumlah dan harga yang berlaku untuk seluruh jumlah. Pengguna dapat menambah/menghapus tingkat; validasi menunjukkan tingkat yang salah.
- Saat split award berubah, frontend meminta kalkulasi backend dan menunjukkan tingkat terpilih, subtotal baru, alasan tidak memenuhi syarat serta pajak/ongkir. Tangani loading/error dan respons usang; jangan menyimpan hasil preview lama untuk jumlah baru.
- Backend menghitung ulang pada award. Versi/harga berubah meminta review ulang sebelum melanjutkan.
- PO menampilkan jumlah, harga efektif, subtotal dan penyesuaian pembulatan bila ada; snapshot mempertahankan nilai asli. Tidak menambah approval PO.
- Mata uang mengikuti quotation dan perbandingan memakai snapshot kurs. Tidak hardcode label Rp untuk seluruh mata uang.

## Implementasi

| Komponen yang akan terdampak | Pekerjaan berikutnya |
| --- | --- |
| `SupplierRfqItemsTable.vue` | Input harga/syarat jumlah dan tier opsional |
| `RfqManualQuotationModal.vue` | Komponen editor harga bersama dengan portal |
| `useSupplierPortalRfqForm.js` | Payload/validasi baru, decimal string, preview backend |
| `src/utils/rfqComparison.js` dan evaluasi RFQ | Hindari quantity × harga ringkasan sebagai hasil akhir harga tier |
| Detail PO | Tampilkan snapshot dan penyesuaian pembulatan sesuai kontrak backend |

Nama komponen editor reusable dan kontrak route final ditetapkan saat implementasi, belum dibuat sekarang.

## Verifikasi dan hasil

Coverage empat file baseline frontend diperiksa lewat codebase-memory dan source range terkait dibaca. Tidak ada masalah coverage tercatat; bukan audit seluruh UI. Link lokal dokumen baru ditemukan, `git diff --check` frontend lulus dan whitespace dokumen baru diperiksa terpisah. Tidak menjalankan build, tes browser atau transaksi karena belum mengubah runtime.

## Risiko dan tindak lanjut

- [ ] Backend calculator/preview harus tersedia sebelum integrasi harga baru diaktifkan.
- [ ] Uji keyboard, ponsel, input decimal, respons usang, batas tier, borongan dan penawaran lama.
- [ ] UAT supplier/buyer, khususnya pemahaman harga untuk jumlah yang ditawarkan dan jumlah alokasi.

## Deployment dan pemulihan

Belum melakukan deployment. Mode pricing baru tidak boleh diaktifkan untuk transaksi sebelum evaluasi dan PO menggunakannya secara konsisten. Catatan ini tidak menyatakan form atau API baru sudah tersedia.
