# Tender RFQ — Redesign daftar dan antrean rencana

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Review desain Purchasing |
| Plan terkait | [Redesign Purchasing](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Heading panjang, banner instruksi dan statistik berulang membuat pengguna melewati banyak elemen sebelum mencapai tabel. Antrean memiliki delapan kolom; tab dokumen tujuh kolom dengan empat ikon aksi. Statistik status hanya menghitung halaman aktif dan bisa disalahartikan sebagai total seluruh tender. Tender selesai/dibatalkan masih menampilkan peringatan deadline merah. Antrean hanya meminta 50 rencana tanpa navigasi halaman; footer dokumen membungkus Pagination dalam flex tambahan.

## Tujuan dan kriteria penerimaan

- [x] Heading ringan, dua tab dan satu toolbar, mengikuti pola PR/Direct Purchase.
- [x] Tabel enam kolom dengan komponen pencarian, dokumen, status dan pagination bersama.
- [x] Deadline operasional hanya pada status published, mengikuti metadata waktu server.
- [x] Pagination antrean tersedia, tanpa klaim jumlah siap tender dari satu halaman.
- [x] Seleksi gabungan satu perusahaan tetap tersedia dan dihapus saat pencarian/filter/halaman berubah.
- [x] Header/footer aplikasi tidak diubah.

## Cakupan dan rencana

Rapikan halaman daftar, tabel antrean/dokumen dan state daftar. Gunakan kembali komponen bersama, periksa API resource yang sudah tersedia, jalankan build, tes RFQ/procurement dan browser fixture, lalu dokumentasikan hasil. Form create, detail tender dan komparasi tetap memakai tujuan navigasi yang ada; redesign ketiganya belum termasuk pekerjaan ini.

## Solusi dan keputusan

Tab menjadi Siap ditenderkan dan Daftar tender. Statistik halaman aktif dan banner berulang dihapus. Status dokumen memakai dropdown; nomor RFQ merupakan akses detail dan aksi Bandingkan diberi label teks. Tombol publikasi/pembatalan dan konfirmasi tetap memakai alur yang tersedia.

Nomor rencana, PR sumber dan tanggal dikelompokkan dalam TableDocumentCell; klik rencana membuka ProcurementPlanDetailModal yang sudah tersedia. Rincian barang tetap dapat dibuka per baris. Seleksi gabungan ditempatkan di bawah tabel sehingga tidak mengambang di atas isi atau footer. Checkbox ditolak kembali ke keadaan tidak tercentang ketika perusahaan berbeda; sebelumnya state native bisa tetap terlihat tercentang meskipun ID tidak masuk seleksi.

Antrean meminta 10 rencana per halaman dan memakai metadata pagination API. Pencarian dan filter kuota tetap lokal pada halaman aktif; keterbatasan ini dijelaskan di toolbar. Pilihan dibersihkan setelah data halaman disegarkan dan saat filter berubah; aksi gabungan disembunyikan selama pemuatan. Statistik global tidak direkayasa dari hasil halaman aktif.

Deadline memakai useRfqDeadline/rfqDeadlineInfo bersama (snapshot server dan waktu elapsed monotonic), bukan perhitungan tanggal lokal browser. Peringatan operasional hanya muncul untuk tender published; tanggal historis tetap tersedia di status lainnya. RfqResource backend sudah menyediakan metadata deadline; tidak ada perubahan API/backend. Tabel dapat digeser horizontal pada layar sempit dan pagination tetap selebar kartu.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/views/purchasing/RfqListView.vue` | Breadcrumb/heading ringan, dua tab, CTA dan wiring pagination antrean. |
| `src/components/purchasing/rfq/list/RfqQueueTab.vue` | Enam kolom, pencarian bersama, modal rencana, pagination, seleksi dalam alur halaman. |
| `src/components/purchasing/rfq/list/RfqDocumentsTab.vue` | Toolbar ringkas, enam kolom, dokumen reusable, label komparasi, deadline relevan dan footer tanpa flex berulang. |
| `src/composables/purchasing/useRfqList.js` | Pagination antrean, pembersihan seleksi/timer pencarian, hapus statistik halaman aktif, deadline bersama. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan ukuran chunk >500 kB masih ada. |
| `node --test tests/rfq*.test.js tests/procurementPlan.test.js` | 51 tes lulus, 0 gagal; bukan bukti transaksi backend end-to-end. |
| Browser `/tmp/erp-rfq-preview.mjs` dengan API tiruan | Lulus 1440/1024/390 px: enam kolom, halaman tidak melebar, footer selebar kartu, pencarian/clear, filter status kembali halaman 1, pagination satu request per klik, deadline tanpa alarm pada status terminal. |
| Browser interaksi | Modal rencana/Escape, rincian item, penjagaan perusahaan berbeda, checkbox tetap tidak terpilih saat ditolak, reset seleksi filter/halaman dan navigasi gabungan plan_ids lulus. Publikasi dan pembatalan melalui konfirmasi dengan API tiruan lulus. |
| Review visual | Screenshot lokal `/tmp/erp-rfq-documents-{1440,1024,390}.png` dan `/tmp/erp-rfq-queue-{1440,1024,390}.png`; desktop dan ponsel diperiksa. |
| `git diff --check` | Lulus. |

## Risiko dan tindak lanjut

- [ ] UAT akun/data perusahaan dan pengujian transaksi backend nyata.
- [ ] Pertimbangkan pencarian/filter kuota server-side agar melintasi seluruh halaman antrean.
- [ ] Review form create, detail RFQ dan komparasi sebagai pekerjaan desain berikutnya.
- [ ] Audit aksesibilitas lengkap, termasuk pembaca layar dan navigasi tabel lebar.
- [ ] Deployment belum dijalankan atau diverifikasi.

## Deployment dan pemulihan

Perubahan lokal frontend; tanpa migrasi atau pengiriman email nyata. Pemulihan mengembalikan empat file RFQ terkait perubahan ini, tanpa mengembalikan modifikasi modul lain di workspace. Build dan browser fixture tidak membuktikan deployment/UAT selesai.
