# RFQ — Minimum pembelian default 1

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Perbaikan UX |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Review supplier form |
| Plan terkait | [Quantity pricing](../../../erp-backend/docs/plans/rfq-quantity-pricing.md) |
| Status rilis | Belum diverifikasi pada lingkungan tujuan |

## Masalah dan dampak

Default minimum proporsional `0.0001` mengikuti presisi teknis, tetapi membingungkan supplier sebagai ketentuan pembelian.

## Tujuan dan kriteria penerimaan

- [x] Default penawaran baru menjadi `1` satuan barang.
- [x] Supplier dapat mengisi pecahan atau minimum lain sesuai ketentuan.
- [x] Minimum eksplisit pada penawaran tersimpan dipertahankan.

## Cakupan dan rencana pengerjaan

Ubah fallback editor reusable dan serializer menjadi `1`, tambahkan penjelasan minimum, periksa frontend dan dokumentasikan. Berlaku untuk manual serta portal. Tidak mengubah minimum tingkat harga atau ketentuan borongan.

## Solusi dan implementasi

`RfqQuotationItemEditor.vue` menetapkan `1` hanya jika minimum belum ada. `quotationPricing.js` menggunakan fallback yang sama pada payload proporsional. Petunjuk menjelaskan bahwa minimum merupakan jumlah paling sedikit yang boleh dibeli, dengan contoh pecahan. Data tersimpan tidak dimigrasikan dan backend tetap menerima minimum pecahan yang sah.

## Verifikasi

`npm test`: 245 lulus. `npm run build`: lulus dengan peringatan ukuran chunk existing. Pemeriksaan langsung serializer membuktikan default `1`, minimum tersimpan `0.0001` dan pecahan `0.5` dipertahankan. `git diff --check`: lulus. Browser tidak dijalankan ulang untuk perubahan default ini. Perubahan tidak memerlukan migrasi atau konfigurasi baru.

## Hasil dan batasan

Penawaran baru memakai minimum yang lebih mudah dipahami. Jika jumlah ditawarkan kurang dari 1, supplier perlu mengubah minimum sesuai jumlah tersebut. Penawaran lama dengan minimum `0.0001` tetap mempertahankan ketentuan tersimpan.

## Deployment dan pemulihan

Deploy bundle frontend. Pemulihan cukup mengembalikan fallback dan petunjuk editor, tanpa perubahan database.

## Tindak lanjut

- [ ] Review pengguna pada form baru setelah refresh.
