# RFQ — Penyesuaian frontend dengan kontrak backend

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-09 |
| Jenis | Perbaikan dan integrasi frontend |
| Status pekerjaan | Selesai implementasi; tes dan build lokal lulus |
| Sprint / issue | Belum ditentukan |
| Plan terkait | [Penyesuaian frontend RFQ](../plans/rfq-frontend-alignment.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Halaman membandingkan `unit_price` asli supplier dengan HPS mata uang dasar, menggunakan IDR bawaan pada formatter, serta menjumlahkan nilai award dari beberapa mata uang tanpa normalisasi. Penanda harga satuan termurah tidak menjelaskan pajak/ongkir dan berbeda dari ranking total biaya quotation pada backend terbaru. Konversi yang tidak tersedia berisiko ditampilkan sebagai nol pada ringkasan.

Modal award belum mengurangi kebutuhan dengan komitmen PO, sehingga pilihan ulang dapat mencoba mengubah award terkunci atau mengirim kuantitas melebihi sisa kebutuhan dan ditolak backend.

## Tujuan dan rencana

- [x] Gunakan kontrak backend tahap 4–5 tanpa menghitung ulang kurs dari master.
- [x] Bedakan harga satuan, subtotal barang, dan total quotation beserta kelayakan ranking.
- [x] Pertahankan harga asli supplier, konversi yang tidak tersedia, dan tie.
- [x] Sesuaikan split/full award dengan PO terkunci dan sisa kebutuhan.
- [x] Uji perhitungan serta state/payload halaman; jalankan build dan tes frontend.
- [x] Sediakan pola dokumentasi berkelanjutan yang serupa dengan backend.

## Solusi dan keputusan

1. Perbandingan menggunakan `base_unit_price`, `base_subtotal`, komponen header `base_*`, serta `comparison_currency`. HPS memakai `target_price_currency`; teks selisih mengambil `delta_target_price` dari backend. Harga asli item, mata uang supplier, snapshot kurs pembanding, dan total asli tetap terlihat.
2. Label satuan terendah mengambil `is_lowest_unit_price` dengan alias lama sebagai fallback jika flag eksplisit tidak ada. Semua tie tetap mendapat penanda. Flag total harus memenuhi `is_total_cost_comparable`, memiliki nilai konversi, dan `is_lowest_total_cost`.
3. Tampilkan jumlah kandidat dan minimum dari `total_cost_comparison`. Terjemahkan alasan pengecualian: kurs invalid, RFQ kosong, item kurang/duplikat/tidak sesuai, dan kuantitas berbeda. Total quotation yang dikecualikan tetap ditampilkan sebagai informasi tanpa penanda minimum.
4. Perkalian dan penjumlahan ringkasan menjaga null sebagai tidak tersedia. Jika satu harga pilihan tidak dapat dikonversi, agregat menjadi `-`, bukan jumlah parsial yang menyesatkan. Split hanya menyatakan nilai barang sebelum pajak/ongkir; tidak meminjam ranking total quotation untuk kombinasi supplier.
5. Sisa kebutuhan dihitung dari target dikurangi seluruh award dengan `purchase_order_id`, pada presisi kuantitas empat desimal. Pilihan baru mengecualikan item quotation terkunci. Baris tanpa sisa dinonaktifkan; input, validasi, dan payload full award memakai sisa kebutuhan. Backend tetap menjadi pengaman akhir terhadap perubahan bersamaan.
6. Pilihan default memprioritaskan award belum terikat PO, lalu penanda harga satuan minimum, lalu penawaran pertama. Payload tetap `supplier_quotation_item_id`, `awarded_quantity`, dan `notes`; tidak mengirim harga konversi. Ringkasan mode full dijelaskan sebagai seluruh quotation, karena award dapat hanya mencakup sisa kebutuhan.

## Implementasi

| File | Perubahan |
| --- | --- |
| [RfqComparisonView.vue](../../src/views/purchasing/RfqComparisonView.vue) | Konsumsi kontrak konversi/ranking, alasan pengecualian, serta alokasi award setelah PO. |
| [rfqComparison.js](../../src/utils/rfqComparison.js) | Helper nilai nullable, agregat, penanda backend, sisa kuantitas, dan pilihan default. |
| [rfqComparison.test.js](../../tests/rfqComparison.test.js) | Tes perhitungan dan eksekusi setup SFC dengan reaktivitas Vue; API/router/dialog diganti stub. |
| [README dokumentasi](../README.md) | Indeks, aturan pencatatan, plan, dan template perubahan. |

Route dan kontrak request tidak berubah. Perubahan pengguna yang sudah ada pada halaman serta file frontend lainnya dipertahankan.

## Verifikasi dan hasil

| Perintah | Hasil |
| --- | --- |
| `node --test tests/rfqComparison.test.js tests/rfq.test.js` | Lulus: 24 tes, termasuk 12 tes baru. |
| `npm test` | Lulus: 172 tes, 38 suite, tanpa kegagalan. |
| `npm run build` | Lulus; peringatan chunk >500 kB pada bundle font `vfs_fonts` (~1,83 MB). |
| Pemeriksaan whitespace file pekerjaan ini | Lulus. |
| `git diff --check` seluruh repository | Menemukan trailing whitespace pada perubahan lain yang sudah ada di luar pekerjaan ini. Tidak dirapikan untuk mempertahankan perubahan pengguna. |

Tes baru mencakup normalisasi USD/IDR, null/nonfinite/zero, flag tie, perbedaan pemenang satuan dan total, alasan pengecualian, delta HPS backend, formatter mata uang dasar, ringkasan award, pilihan default, vendor change, payload split/full, kuota tersisa setelah PO, dan kebutuhan yang seluruhnya terkunci. Tes SFC menjalankan state halaman sebenarnya dengan layanan stub; tidak membuktikan rendering browser atau keberhasilan API/deployment nyata. Sintaks template diperiksa oleh build Vite.

MCP digunakan untuk pencarian struktur. Coverage menunjukkan halaman RFQ frontend belum tercatat pada indeks; kesimpulan implementasi diverifikasi melalui source terkait dan tes.

## Risiko dan tindak lanjut

- [ ] Uji browser/API di staging: lintas mata uang, nol kandidat total, tie, konversi null, split sebagian, PO terkunci, dan pembatalan PO yang sah.
- [ ] Verifikasi rilis dengan backend terbaru. Respons backend lama tanpa `base_*` tampil sebagai tidak tersedia dan perlu deployment backend yang sesuai.
- UI tetap satu quotation baru per item per pengiriman; beberapa award baru pada item sama sekaligus belum tersedia.
- Kuota procurement plan lintas RFQ dan keunikan quotation item tetap divalidasi backend. Tidak mengaudit data historis atau mengubah form procurement plan pada pekerjaan ini.
- Angka UI memakai JavaScript Number untuk estimasi; validasi/ketetapan finansial tetap ditangani backend. Tidak mengalokasikan pajak/ongkir quotation ke kombinasi split secara arbitrer.

## Deployment dan pemulihan

Tidak ada migrasi, dependensi, atau konfigurasi baru. Deploy bundle frontend dengan backend yang menyediakan kontrak tahap 4–5. Rilis belum diverifikasi. Pemulihan mengikuti version control dan prosedur deployment tim; dokumentasi ini tidak menyatakan produksi sudah diperbarui.
