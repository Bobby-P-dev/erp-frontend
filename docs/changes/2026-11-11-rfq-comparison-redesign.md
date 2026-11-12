# Tender RFQ — Redesign perbandingan penawaran

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Penyempurnaan desain Purchasing |
| Plan terkait | [Redesign internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi; UAT data nyata belum dilakukan |

## Masalah dan dampak

Halaman perbandingan menumpuk pemeriksaan quotation, status, riwayat, hasil pemilihan, dan matriks harga. Setiap kolom supplier berisi banyak paragraf dan peringatan berulang. Pengguna sulit menemukan harga dan membandingkannya; ukuran teks kecil dan tabel melebar menyulitkan pembacaan, terutama bagi pengguna senior dan pengguna ponsel.

## Tujuan dan kriteria penerimaan

- [x] Harga, pemeriksaan, dan hasil keputusan dipisahkan menjadi tiga bagian yang dapat dipilih.
- [x] Desktop/tablet membandingkan barang di kiri dan supplier berjajar ke kanan; kolom barang tetap ketika tabel digeser. Ponsel memakai susunan vertikal.
- [x] Total quotation tetap dibedakan dari subtotal barang dan nilai award sebelum pajak/ongkir.
- [x] Rincian biaya, kurs, spesifikasi, catatan dan riwayat dapat dibuka saat diperlukan.
- [x] Peringatan validitas dan penghalang pembuatan PO tetap tersedia; pemilihan dan transaksi mengikuti aturan sebelumnya.
- [x] Teks kecil diperbesar menjadi minimal 14 px dalam ruang perbandingan; tampilan responsif dan tombol berlabel.
- [x] Header/footer aplikasi tetap.

## Cakupan dan rencana

Periksa struktur dan aturan halaman lewat graph dan source; susun hierarki informasi; pisahkan komponen presentasi harga; pertahankan logika evaluasi, payload dan validasi transaksi; verifikasi unit/kontrak dan browser dengan API tiruan; dokumentasikan hasil.

## Solusi dan keputusan

Navigasi halaman memakai **Perbandingan harga**, **Pemeriksaan penawaran**, dan **Hasil pemilihan**. Bagian harga menampilkan matriks horizontal pada desktop/tablet: barang, kebutuhan dan HPS di kolom kiri yang tetap; setiap supplier memiliki kolom harga satuan, jumlah ditawarkan dan subtotal. Ruang indikator harga terendah disediakan agar jumlah/subtotal tetap sejajar. Subtotal, pajak, ongkir dan total quotation sejajar di footer supplier. Tabel dapat digeser menggunakan sentuhan/keyboard; halaman tidak ikut melebar. Pada ponsel penawaran tersusun vertikal dengan label. Jumlah yang berbeda dari kebutuhan ditandai secara eksplisit.

Pemeriksaan memakai komponen bersama yang sudah ada. Status masa berlaku dan pemeriksaan tetap terlihat pada ringkasan supplier. Penghalang award tersedia bersama rincian ketentuan; penghalang PO terlihat di hasil pemilihan. Riwayat keputusan dapat dibuka dari hasil tersebut. Konten pemeriksaan tetap terpasang ketika berpindah bagian sehingga state modal tidak dibuang.

Kartu total memakai nilai konversi dan tanda ranking server yang sama. Rincian mencakup subtotal, pajak, ongkir, mata uang asli, kurs, syarat bayar, pengiriman dan masa berlaku. Perbandingan HPS tetap memakai delta server. Harga terendah tidak otomatis memilih pemenang. Tidak ada perubahan endpoint, aturan pengesahan, eligibility, evaluasi wajib, maupun penguncian award yang sudah menjadi PO.

Acuan khusus halaman ini: [ERPNext RFQ](https://docs.frappe.io/erpnext/request-for-quotation), [Supplier Quotation](https://docs.frappe.io/erpnext/supplier-quotation), dan [source Supplier Quotation Comparison](https://github.com/frappe/erpnext/blob/develop/erpnext/buying/report/supplier_quotation_comparison/supplier_quotation_comparison.py). ERPNext menjadi dasar membandingkan item/kuantitas setara serta mempertimbangkan harga, pajak, ongkir dan ketentuan. Matriks horizontal, kolom tetap dan disclosure merupakan adaptasi UI sesuai arahan pengguna; bukan salinan persis layar ERPNext. Tidak menggunakan referensi desain produk lain untuk refinement ini.

## Implementasi

| File | Perubahan |
| --- | --- |
| [RfqComparisonView.vue](../../src/views/purchasing/RfqComparisonView.vue) | Heading/breadcrumb ringan, navigasi tiga bagian, ringkasan keputusan, loading/error/retry, gaya lokal dan penyesuaian responsif modal |
| [RfqPriceComparison.vue](../../src/components/purchasing/rfq/RfqPriceComparison.vue) | Matriks horizontal reusable, kolom barang tetap, footer biaya sejajar dan susunan ponsel |
| [RfqOfferDetails.vue](../../src/components/purchasing/rfq/RfqOfferDetails.vue) | Rincian penawaran reusable: deskripsi, catatan, merek, waktu kirim, harga asli dan selisih HPS |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan chunk >500 kB tetap ada |
| `node --test tests/rfq.test.js tests/rfqComparison.test.js tests/rfqDeadline.test.js tests/rfqInvitation.test.js tests/rfqTimestamp.test.js` | 45 tes lulus, 0 gagal |
| Browser fixture matriks `/tmp/erp-rfq-matrix-preview.mjs` pada 1440/1024/390 px | Navigasi, harga/rincian, tidak ada overflow halaman, modal pilih pemenang buka/batal, hasil award kedaluwarsa menghalangi PO, konversi kosong, refresh gagal/retry, dan penawaran kosong lulus; enam supplier tetap di dalam tabel serta kolom barang tetap pada 1440/1024 px; tidak ada mutasi tak disengaja |
| `git diff --check` pada file perubahan | Lulus |

Screenshot matriks terbaru: `/tmp/erp-rfq-matrix-{1440,1024,390}.png`, `/tmp/erp-rfq-matrix-six-{1440,1024}.png`. Desktop, ponsel dan pergeseran enam supplier diperiksa secara visual. Fixture memakai komponen Vue asli dan API tiruan; tidak membuktikan transaksi database, hak akses akun produksi atau deployment. Peringatan route awal kosong berasal dari router fixture; tidak ada page error browser.

## Risiko dan tindak lanjut

- [ ] Review pengguna dan UAT pada RFQ asli, termasuk banyak barang/supplier, mata uang campuran dan histori PO.
- [ ] Uji transaksi award/PO nyata dengan akun berwenang sebelum rilis.
- [ ] Audit aksesibilitas menyeluruh modal dan selector bersama pada pekerjaan lanjutan.
- [ ] Optimasi bundle merupakan pekerjaan terpisah.

## Deployment dan pemulihan

Belum ada bukti deployment. Tidak ada migrasi database. Untuk pemulihan, kembalikan perubahan halaman perbandingan dan komponen harga baru saja; pertahankan perubahan Purchasing lain yang berjalan bersamaan.
