# Direct Purchase — Preview modal dan hierarki detail

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Redesign Purchasing |
| Plan terkait | [Dashboard dan Purchasing](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Preview membuka halaman penuh. Stepper panjang, informasi penjual/biaya, pembayaran, penerimaan dan tracker PR tampil bersamaan. Pengguna kehilangan konteks daftar dan harus memindai banyak informasi sekaligus.

## Tujuan dan kriteria penerimaan

- [x] Preview dari nomor dokumen dan tombol mata membuka modal tanpa pindah route daftar.
- [x] URL detail langsung juga menggunakan modal; tutup menuju tab riwayat.
- [x] Header/footer aplikasi dipertahankan, scroll berada di dalam modal.
- [x] Informasi terbagi dalam Ringkasan, Pembayaran, Penerimaan dan Persetujuan PR.
- [x] Aksi tetap mengikuti status dokumen dan payload layanan yang ada.
- [x] Keyboard, kondisi gagal muat dan tampilan responsif diperiksa dengan fixture.

## Cakupan dan rencana

Ekstrak isi detail bersama, tambahkan wrapper modal, sambungkan kedua pemicu daftar dan route langsung, ringkas informasi/tabel, lalu verifikasi build, tes kontrak dan browser fixture. Tidak ada perubahan API atau aturan approval.

Review lanjutan: tampilan dan kepemilikan aksi diperbarui dalam [penyempurnaan preview](2026-11-11-direct-purchase-preview-ux-refinement.md). Ringkasan biaya kini berada di bawah barang; tautan produk langsung terlihat, dan pencairan dihapus dari Purchasing.

## Solusi dan keputusan

Modal mempertahankan filter, tab dan posisi daftar. Status dan tindakan utama berada di bagian atas. Stepper tujuh tahap dihapus untuk mengurangi kebisingan dan menghindari kesan PR selalu disetujui tanpa membaca data persetujuan. Tracker PR baru dimuat ketika tab persetujuan dibuka.

Tabel barang memiliki empat kolom di desktop; harga satuan menyatu dengan deskripsi pada ponsel. Catatan, diskon dan tautan berada dalam detail per barang. Nilai subtotal nol tetap ditampilkan. Rincian biaya termasuk kurs/mata uang tetap tersedia. Pembayaran dan penerimaan berada di tab terpisah; tombol transaksi yang berulang di dalam panel dihapus.

Modal mengunci scroll/background, membatasi fokus, mendukung Escape dan memulihkan fokus. Dialog transaksi memiliki fokus dan scroll sendiri; Escape menutup dialog teratas lebih dulu. Gagal muat tampil inline dengan tombol Coba lagi. Setelah mutasi berhasil, detail dimuat ulang dan event changed menyegarkan daftar.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/direct/detail/DirectPurchaseDetail.vue` | Isi detail reusable, tab dan kondisi loading/error. |
| `src/components/purchasing/direct/detail/DirectPurchaseDetailModal.vue` | Modal, keyboard, scroll dan pemulihan fokus. |
| `src/views/purchasing/DirectPurchaseListView.vue` | Kedua pemicu preview membuka modal; refresh setelah mutasi. |
| `src/views/purchasing/DirectPurchaseDetailView.vue` | URL langsung menggunakan wrapper modal yang sama. |
| `src/composables/purchasing/useDirectPurchaseDetail.js` | ID eksplisit, retry inline, event setelah mutasi. |
| `src/components/purchasing/direct/detail/DPDetail*.vue` | Header ringkas, panel per tab, tabel dan dialog transaksi. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan ukuran chunk di atas 500 kB tetap ada. |
| `node --test tests/directPurchase.test.js tests/bulkDirectPurchase.test.js` | 17 lulus, 0 gagal. Tes kontrak layanan; bukan bukti transaksi backend end-to-end. |
| Browser fixture `/tmp/erp-dp-detail-preview.mjs` | Lulus pada 1440/1024/390 px: daftar tetap di route asal, URL detail modal, tab, lazy tracker, enam status, dialog penerimaan/pembayaran, keyboard/fokus, Escape dan error/retry. |
| Pengajuan pembayaran fixture | API tiruan menerima POST; status detail dan daftar diperbarui. Tidak mengirim transaksi nyata. |
| Screenshot fixture | `/tmp/erp-dp-detail-{1440,1024,390}.png`, diperiksa desktop dan ponsel. |

## Risiko dan tindak lanjut

- [ ] UAT dengan akun, hak akses dan data perusahaan sebenarnya.
- [ ] Pencairan, pembatalan dan penerimaan barang end-to-end dengan backend nyata.
- [ ] Audit aksesibilitas lengkap dengan pembaca layar dan banyak baris penerimaan.
- [ ] Pengecekan referensi PR konsolidasi mengikuti data API yang tersedia; tab persetujuan masih memakai purchase_requisition_id seperti sebelumnya.

Referensi: [Attio table views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views) untuk hierarki data dan [ERPNext Buying](https://docs.frappe.io/erpnext/buying) untuk konteks procurement. Pilihan modal/tab adalah adaptasi UI aplikasi, bukan klaim bahwa ERPNext mewajibkan pola tersebut.

## Deployment dan pemulihan

Belum ada deployment atau transaksi nyata yang diverifikasi. Tidak ada migrasi. Pemulihan melalui pengembalian diff terkait preview Direct Purchase saja; pertahankan perubahan fitur lain yang masih dalam workspace.
