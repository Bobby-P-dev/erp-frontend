# RFQ — Alasan alokasi supplier tidak dapat dilanjutkan

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Perbaikan UI/UX validasi evaluasi |
| Status pekerjaan | Selesai — implementasi dan verifikasi lokal |
| Sprint / issue / PR | Tindak lanjut quantity pricing |
| Plan terkait | [Penyesuaian frontend RFQ](../plans/rfq-frontend-alignment.md) |
| Status rilis | Belum diverifikasi deployment/UAT |

## Masalah dan dampak

Jumlah split sudah memenuhi kebutuhan total tetapi tombol “Lanjut ke evaluasi” nonaktif dan nilai salah satu alokasi hanya ditampilkan sebagai “—”. Ketentuan minimum supplier tidak tampak pada input; alasan penolakan baru berada jauh di bawah daftar barang.

Pemeriksaan read-only RFQ-2026-000007 mengonfirmasi Material Produksi PT Krakatau Steel mempunyai minimum tersimpan 10 UNIT. Alokasi 5 UNIT melanggar minimum tersebut, walaupun 45 + 5 = 50. Kalkulator backend untuk item itu menghasilkan `below_minimum_quantity` pada jumlah 5; jumlah 10 diterima dengan subtotal 170000.00. Pembagian 40 + 10 memenuhi minimum kedua supplier. Pembagian bahan dasar 15 + 5 KG memenuhi minimum masing-masing supplier pada data yang diperiksa.

## Tujuan dan kriteria penerimaan

- [x] Pertahankan validasi minimum dan harga server.
- [x] Tampilkan minimum/ketentuan borongan dekat input jumlah.
- [x] Tampilkan alasan penolakan langsung di alokasi dan dekat tombol lanjut, termasuk barang serta supplier.
- [x] Sediakan hitung ulang ketika hasil harga belum valid/gagal dimuat.
- [x] Setelah pembagian valid, alasan hilang dan evaluasi dapat dilanjutkan.

## Cakupan dan rencana

1. Telusuri kesiapan langkah evaluasi dan preview harga frontend serta backend.
2. Periksa ketentuan tersimpan dan kalkulator secara read-only.
3. Perjelas feedback tanpa melonggarkan aturan bisnis atau mengubah minimum tersimpan.
4. Verifikasi regresi reaktivitas, build, serta browser desktop/ponsel.

## Solusi dan keputusan

Syarat minimum tetap berasal dari penawaran supplier. UI menampilkan minimum dalam satuan barang, pesan kontekstual dari hasil preview server, penanda input tidak valid, dan status penghalang di footer modal. Pesan menyarankan mengubah pembagian atau memilih supplier lain. Kegagalan kalkulasi dan kurs yang tidak tersedia juga dijelaskan. Tombol “Hitung ulang harga” memungkinkan retry tanpa menghapus pilihan.

Tidak ada perubahan backend, API, approval, data quotation, maupun data award. Minimum khusus tersimpan tidak diubah menjadi default 1. Perubahan ketentuan komersial tetap memerlukan penawaran/revisi supplier yang sah.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/utils/rfqComparison.js` | Helper petunjuk minimum/borongan dan alasan penolakan dengan angka/satuan. |
| `src/views/purchasing/RfqComparisonView.vue` | Feedback per alokasi, footer, status harga/kurs dan aksi retry. |
| `tests/rfqComparison.test.js` | Regresi split 45/5 → 40/10 dan pemulihan setelah preview gagal. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| Pemeriksaan DB dan `AwardPricingService::calculate` melalui Artisan | Read-only; minimum 10 terkonfirmasi, 5 ditolak dan 10 diterima. Tidak menyimpan award/PO. |
| `npm test` | 248 tes / 52 suite lulus. |
| `npm run build` | Lulus; peringatan ukuran chunk di atas 500 kB masih ada. |
| `node /tmp/erp-award-minimum-preview.mjs` | Dua skenario browser fixture 1440/390 px lulus: 45/5 terblokir dengan alasan pada baris/footer, 40/10 dapat ke evaluasi, tanpa award mutation/overflow/JS error. |
| `git diff --check` | Lulus. |

Browser menggunakan halaman nyata dengan API mock. Peringatan router untuk rute kosong berasal dari harness fixture. Pengiriman award/PO ke database nyata dan UAT belum dijalankan. Log browser: `/tmp/erp-award-minimum-browser.log`.

## Risiko dan tindak lanjut

- [ ] UAT minimum khusus, borongan, tier, perubahan versi penawaran serta kurs tidak tersedia di staging.
- [ ] Bila ingin pembagian 45/5, minta supplier menurunkan minimum lewat revisi penawaran; jangan menghapus aturan minimum secara otomatis.

## Deployment dan pemulihan

Belum ada bukti deployment. Tidak memerlukan migrasi. Untuk pemulihan, batalkan hanya feedback UI dan tes pada catatan ini; pertahankan kalkulasi dan validasi quantity pricing.
