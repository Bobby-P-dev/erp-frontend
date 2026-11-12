# Direct Purchase — Redesign daftar pembelian langsung

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Tidak ditetapkan |
| Plan terkait | [Redesign internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi; UAT data asli terbuka |

## Masalah dan dampak

Halaman penuh dengan kartu statistik, banner dan tabel yang memisahkan terlalu banyak informasi. Pengguna sulit memprioritaskan rencana yang perlu dibeli dan transaksi yang perlu ditindaklanjuti. Total Realisasi sebelumnya menjumlahkan transaksi halaman aktif sehingga berpotensi dianggap sebagai total seluruh pembelian. Antrean sebelumnya hanya mengambil 50 rencana tanpa navigasi ke halaman berikutnya.

## Tujuan dan kriteria penerimaan

- [x] Konsisten dengan pola tabel PR, ruang antarbagian lebih longgar dan metadata lebih ringan.
- [x] Antrean lima kolom; riwayat enam kolom dengan nominal rata kanan dan mata uang asli.
- [x] Detail rencana dan PR konsolidasi menggunakan modal bersama.
- [x] Filter, navigasi, pagination, ajukan pembayaran dan pembatalan tetap berfungsi pada fixture.
- [x] Header/footer aplikasi tidak diubah.

## Cakupan dan rencana

Audit halaman dan dependensi, sederhanakan hierarki informasi, gunakan kembali komponen tabel/modal, verifikasi browser responsif serta kontrak layanan, lalu dokumentasikan batasan. Cakupan halaman daftar; form create/edit dan detail transaksi pembelian belum didesain ulang dalam perubahan ini.

## Solusi dan keputusan

Gunakan dua tab: Siap dibeli dan Riwayat pembelian. Hapus empat kartu statistik serta banner panjang; gabungkan informasi terkait dalam satu sel. Nomor dokumen menjadi akses utama, sedangkan tanggal, jumlah item dan saluran menjadi metadata sekunder. Tombol membuat pembelian berwarna primer, navigasi netral dan pembatalan merah.

Antrean memiliki pagination API dengan ukuran 50. Pencarian dan filter sisa kebutuhan masih lokal terhadap halaman yang sedang dimuat; tampilkan keterangan saat tersedia beberapa halaman. Footer pagination menampilkan rentang respons API, sementara jumlah rencana yang lolos filter ditampilkan terpisah di atas tabel. Tidak mengklaim pencarian lintas seluruh antrean.

Pertahankan filter riwayat di API, konfirmasi pembayaran, alasan wajib untuk pembatalan dan pembatasan aksi berdasarkan status. Tambahkan penjagaan respons lama serta pembersihan debounce saat halaman ditinggalkan. Total Realisasi dihapus sampai tersedia agregasi lintas halaman yang benar.

## Implementasi

| File | Perubahan |
| --- | --- |
| [DirectPurchaseListView.vue](../../src/views/purchasing/DirectPurchaseListView.vue) | Hierarki, dua tab, tabel ringkas, filter, pagination antrean dan modal bersama; warna aksi serta penjagaan request. |

Komponen yang digunakan kembali: BaseBreadcrumb, BaseTable, TableDocumentCell, SearchInput, StatusBadge, Pagination, ProcurementPlanDetailModal dan ConsolidatedPrModal. Tidak mengubah backend atau alur transaksi.

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `node --test tests/directPurchase.test.js tests/bulkDirectPurchase.test.js` | 17 tes kontrak lulus. |
| `npm run build` | Build lulus; peringatan chunk besar tetap ada. |
| Browser fixture 1440, 1024 dan 390 px | Antrean/riwayat, jumlah kolom, tanpa overflow halaman atau sel; tabel dapat digeser horizontal pada layar kecil. |
| Browser fixture filter dan pagination | Filter kuota/pencarian/reset, filter status/saluran, empty state, reset halaman riwayat dan satu request per klik pagination lulus. |
| Browser fixture modal/navigasi | PR konsolidasi ke detail rencana, buat pembelian dengan plan_id, serta navigasi detail pembelian lulus. |
| Browser fixture transaksi dan nominal | Visibilitas aksi, konfirmasi submit, validasi alasan batal dan payload, nilai nol serta konversi USD lulus. Semua API dimock. |

Harness lokal: `/tmp/erp-direct-list-preview.mjs`; hasil: `/tmp/erp-direct-list-browser.log`; screenshot: `/tmp/erp-direct-queue-{1440,1024,390}.png` dan `/tmp/erp-direct-history-{1440,1024,390}.png`. Berkas sementara bukan artefak repo permanen. Assertion awal nilai nol diperbaiki agar menerima non-breaking space dari Intl.NumberFormat; bukan perubahan formatter aplikasi.

## Risiko dan tindak lanjut

- [ ] UAT akun nyata: data konsolidasi, hak akses, kuota dan transaksi keuangan end-to-end.
- [ ] Pertimbangkan pencarian dan filter kuota server-side untuk antrean besar.
- [ ] Review form create/edit dan detail Direct Purchase secara terpisah.
- [ ] Verifikasi deployment dan tampilan dengan shell aplikasi/data produksi.

## Deployment dan pemulihan

Tidak menjalankan deployment maupun transaksi nyata. Pemulihan cukup mengembalikan diff khusus DirectPurchaseListView.vue dari perubahan ini; pertahankan perubahan modul lain. Tidak ada migrasi atau perubahan skema database.
