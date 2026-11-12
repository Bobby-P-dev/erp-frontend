# Direct Purchase — Penyempurnaan preview dan pemisahan aksi Finance

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Review preview Purchasing |
| Plan terkait | [Redesign Purchasing](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Review pengguna menemukan preview masih terasa kaku: dua kotak informasi tinggi dengan ruang kosong, total biaya berada dalam kotak kecil, dan tautan produk tersembunyi dalam Detail barang lalu Lihat produk. Pengguna sulit memahami bahwa tautan tersebut membuka halaman produk eksternal. Status Siap Dibayar masih menyediakan aksi pencairan di Purchasing, padahal proses itu merupakan tanggung jawab Finance.

## Tujuan dan kriteria penerimaan

- [x] Ringkasan lebih ringan, hierarki penjual → barang → biaya/total di bawah.
- [x] Tautan produk langsung terlihat tanpa membuka detail barang, dengan domain dan penanda tab baru.
- [x] Disclosure hanya untuk catatan, spesifikasi atau diskon yang memang tersedia.
- [x] Tidak ada tombol, dialog atau pemanggilan pencairan dari preview Purchasing.
- [x] Siap Dibayar menjelaskan bahwa pencairan diproses tim Finance melalui modul Finance.
- [x] Modal, status, pengajuan pembayaran, penerimaan dan pembatalan yang relevan tetap tersedia.

## Cakupan dan rencana

Perbaiki komposisi ringkasan, ekstrak tampilan deskripsi/tautan barang reusable, hilangkan seluruh wiring pencairan di komponen/composable preview, verifikasi build/kontrak/browser dan dokumentasikan hasil. Header/footer aplikasi tidak diubah.

## Solusi dan keputusan

Informasi penjual dan rencana asal tampil sebagai blok ringan. Tabel barang diprioritaskan; rincian biaya dan total ditempatkan di bawahnya dengan latar netral. Pada ponsel, barang berubah menjadi kartu dengan jumlah dan subtotal yang terbaca tanpa geser horizontal.

Komponen deskripsi barang dipakai bersama pada tabel desktop dan kartu ponsel. Buka tautan produk menampilkan ikon eksternal, domain dan tab baru, serta label aksesibel yang menyebut nama barang. Catatan & spesifikasi terpisah; hanya muncul bila ada informasi tambahan. Tautan produk/toko hanya aktif untuk URL HTTP/HTTPS yang valid; lokasi toko berupa teks tetap ditampilkan sebagai lokasi.

Aksi Cairkan pembayaran, dialog sumber dana, state akun bank dan handler disbursement di useDirectPurchaseDetail dihapus. Tab Pembayaran tetap menampilkan informasi status dan bukti pembayaran. Layanan Finance dan API backend tidak diubah; perubahan ini tidak membuat atau menguji modul pencairan Finance dan bukan perubahan otorisasi backend.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/direct/detail/DPItemDescription.vue` | Deskripsi, tautan produk langsung, catatan/specifikasi reusable. |
| `src/components/purchasing/direct/detail/DPDetailItemsTable.vue` | Tabel desktop dan kartu ponsel menggunakan deskripsi bersama. |
| `src/components/purchasing/direct/detail/DPDetailInfoAndFinance.vue` | Penjual ringkas, rincian biaya bawah, keterangan pembayaran oleh Finance. |
| `src/components/purchasing/direct/detail/DPDetailHeaderAndStepper.vue` | Header lebih ringan; tanpa pencairan; keterangan status siap dibayar. |
| `src/components/purchasing/direct/detail/DPDetailModals.vue` | Hapus dialog, props dan event pencairan. |
| `src/components/purchasing/direct/detail/DirectPurchaseDetail.vue` | Komposisi ringkasan baru dan penghapusan wiring pencairan. |
| `src/composables/purchasing/useDirectPurchaseDetail.js` | Hapus state/fetch akun dan handler pencairan Purchasing. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan ukuran chunk >500 kB tetap ada. |
| `node --test tests/directPurchase.test.js tests/bulkDirectPurchase.test.js` | 17 lulus, 0 gagal; tes kontrak, bukan transaksi backend nyata. |
| Browser `/tmp/erp-dp-detail-refine-preview.mjs` dengan API tiruan | Lulus pada 1440/1024/390 px: modal daftar/URL langsung, tab, enam status, tautan produk terlihat sebelum disclosure dibuka, href/target, tanpa aksi pencairan pada status siap bayar maupun tab Pembayaran. |
| Regresi browser fixture | Dialog penerimaan/pengajuan, Escape, fokus, error/retry, tracker lazy dan pengajuan pembayaran tiruan yang menyegarkan daftar lulus. Tidak ada request disbursement/akun accounting dari preview. |
| Review visual | Screenshot `/tmp/erp-dp-detail-refined-{1440,1024,390}.png`; desktop dan ponsel diperiksa. |

## Risiko dan tindak lanjut

- [ ] UAT akun dan data perusahaan, termasuk URL supplier yang sudah tersimpan.
- [ ] Uji transaksi nyata pengajuan, penerimaan dan pembatalan secara terpisah.
- [ ] Pastikan alur dan otorisasi pencairan pada modul Finance dalam pekerjaan Finance berikutnya; tidak termasuk perubahan UI ini.
- [ ] Audit pembaca layar lengkap dan data panjang/banyak barang.

## Deployment dan pemulihan

Belum ada deployment atau transaksi nyata. Tidak ada migrasi. Pemulihan hanya mengembalikan perubahan refinement ini, mempertahankan perubahan fitur lain di workspace. Catatan ini memperbarui keputusan tampilan dan kepemilikan aksi pada [redesign awal](2026-11-11-direct-purchase-detail-redesign.md).
