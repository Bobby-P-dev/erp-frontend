# Purchasing — Redesign daftar dan detail Purchase Order

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Penyempurnaan desain Purchasing |
| Plan terkait | [Redesign internal](../plans/dashboard-redesign.md) |
| Status rilis | UAT akun nyata dan deployment belum diverifikasi |

## Masalah dan dampak

Daftar PO memiliki delapan filter status sejajar, tujuh kolom, badge dokumen sumber dan ketentuan pembayaran di setiap baris. Detail membuka halaman penuh dengan banyak kartu, tahapan dan aksi sekaligus. Pengguna sulit menemukan barang dan tindakan selanjutnya. Pemanggilan Pagination memakai properti terpisah, padahal komponen bersama memerlukan objek `pagination`. Pemanggilan prompt pembatalan lama juga tidak mengikuti kontrak object options dan hasil `{ isConfirmed, value }`.

## Tujuan dan kriteria penerimaan

- [x] Daftar konsisten dengan pola tabel PR: BaseTable, SearchInput, TableDocumentCell, Pagination dan StatusBadge.
- [x] Nomor PO/ikon detail membuka modal; URL detail langsung masih didukung.
- [x] Barang, biaya, pengiriman, dokumen dan proses tersedia dengan hierarki ringan.
- [x] Edit, terbitkan dan batal tetap memakai endpoint PO yang ada; tidak menambah approval PO.
- [x] Keyboard, focus trap/restore, scroll lock, loading/error/retry tersedia.
- [x] Desktop, tablet dan ponsel diverifikasi memakai fixture.

## Cakupan dan rencana

1. Telusuri komponen dan kontrak API lewat codebase-memory dan pembacaan source terarah.
2. Ringankan daftar dan koreksi pagination.
3. Ekstrak detail reusable, modal dan wrapper URL.
4. Verifikasi build, regresi frontend, browser fixture serta dokumentasi.

## Solusi dan keputusan

Acuan domain: [ERPNext Purchase Order](https://docs.frappe.io/erpnext/purchase-order): supplier, tanggal pengiriman, barang/kuantitas/harga, pajak, ketentuan dan dokumen sumber. Tata letak mengikuti pola internal yang sudah disepakati; modal merupakan keputusan UX aplikasi ini, bukan klaim meniru UI ERPNext. Kebijakan perusahaan tetap approval pada PR saja.

Daftar menjadi enam kolom, pencarian dan satu select status. Status lama tetap dapat difilter; status diterima sebagian ikut tersedia. Preview memakai tiga bagian: Barang & biaya, Pengiriman, Dokumen & proses. Ringkasan biaya berada di bawah barang. Spesifikasi dan sumber dapat diperluas per barang. Ponsel memakai kartu barang; tabel daftar tetap dapat digeser di dalam region tabel.

Terbitkan menjadi aksi utama biru, ubah/simpan-batal memakai pola primer/netral, dan pembatalan merah berada pada bagian Dokumen & proses. Pembatalan meminta alasan dan menggunakan kontrak prompt yang benar. Mata uang berasal dari PO, termasuk format biaya di modal dan label edit ongkir; tidak mengubah perhitungan backend. Alamat kosong ditampilkan sebagai belum dicantumkan, tanpa mengarang alamat gudang.

Modal mengunci scroll latar, menjadikan app inert, menjaga fokus, mengembalikan fokus saat ditutup, dan mendahulukan dialog konfirmasi bersama. Saat API berjalan, penutupan modal dicegah. Edit ketentuan berada di dalam detail agar tidak menumpuk modal tambahan. Daftar diperbarui setelah perubahan; nomor PO tetap menjadi target fokus bila baris masih tersedia.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/views/purchasing/PurchaseOrderListView.vue` | Daftar/filter/error/retry, request guard, pagination dan integrasi modal |
| `src/views/purchasing/PurchaseOrderDetailView.vue` | Wrapper URL detail ke modal yang sama |
| `src/components/purchasing/order/PurchaseOrderDetail.vue` | Data, tab detail dan aksi PO |
| `src/components/purchasing/order/PurchaseOrderDetailModal.vue` | Integrasi konten detail dan modal |
| `src/components/purchasing/order/PurchaseOrderItemDetails.vue` | Detail spesifikasi/sumber reusable untuk desktop dan ponsel |
| `src/components/ui/DocumentDetailModal.vue` | Shell modal dokumen reusable dan perilaku keyboard |
| `tests/browser/purchaseOrderRedesign.smoke.mjs` | Browser fixture dengan API terisolasi |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 227 tes lulus, 0 gagal |
| `npm run build` | Lulus; peringatan ukuran chunk besar tetap ada |
| Browser fixture 1440 / 1024 / 390 px | Lulus: render daftar, pagination halaman 2, filter diterima sebagian, modal, mata uang USD, spesifikasi, edit, terbitkan, pembatalan beserta alasan, focus trap/restore, Escape, retry detail, URL detail langsung |
| `git diff --check` | Lulus |

Browser dijalankan dengan Playwright runtime lokal dan `/usr/bin/google-chrome`, menggunakan `PLAYWRIGHT_MODULE_PATH` dan `CHROME_EXECUTABLE_PATH`. Tidak mengirim transaksi atau email ke API nyata. Screenshot pemeriksaan lokal: `/tmp/po-list-{1440,1024,390}.png` dan `/tmp/po-detail-{1440,1024,390}.png`.

## Risiko dan tindak lanjut

- [ ] UAT dengan akun perusahaan dan data riil: berbagai status, dokumen lama, hak akses, serta hasil penerbitan di portal pemasok.
- [ ] Konfirmasi kenyamanan pengguna pada PO dengan banyak barang dan teks panjang.
- [ ] Verifikasi deployment. Tes frontend/fixture tidak membuktikan transaksi backend end-to-end.

## Deployment dan pemulihan

Tidak menjalankan migrasi, mengubah API atau header/footer aplikasi. Belum melakukan deployment. Untuk pemulihan, kembalikan hanya perubahan redesign PO beserta komponen barunya dan build frontend ulang; pertahankan perubahan kebijakan approval PR sebelumnya serta pekerjaan lain di workspace.
