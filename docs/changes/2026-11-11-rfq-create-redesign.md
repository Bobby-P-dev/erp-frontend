# Tender RFQ — Redesign form buat paket tender

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

Form paket tender menampilkan banyak kotak bertingkat, detail rencana, spesifikasi, catatan dan informasi supplier sekaligus. Hierarki input kurang jelas sehingga pengguna kesulitan memindai form dan memeriksa barang sebelum menyimpan.

## Tujuan dan kriteria penerimaan

- [x] Form lebar penuh, empat bagian berurutan, tanpa perubahan header/footer aplikasi.
- [x] Catatan dan konsolidasi rencana dapat dibuka saat diperlukan.
- [x] Kuantitas, HPS satuan dan subtotal barang mudah diperiksa di desktop maupun ponsel.
- [x] Ringkasan dan aksi berada di bawah form; publikasi biru, draf/batal netral berbentuk tombol.
- [x] Validasi, isi payload, pilihan supplier, simpan draf dan publikasi tetap berjalan pada fixture.

## Cakupan dan rencana

Audit form dan komponen; rapikan hierarki rencana/informasi/barang/supplier; gunakan disclosure dan selector bersama; periksa tampilan responsif serta kontrak transaksi; catat hasil. API dan composable transaksi tidak diubah.

## Solusi dan keputusan

Bagian form memakai permukaan putih dan pemisah ringan. Metadata rencana menjadi ringkasan singkat, sedangkan gabungan rencana dan catatan memakai ReviewDisclosure. Barang memakai grid responsif dengan jumlah, HPS dan subtotal; spesifikasi/catatan dapat dibuka per barang. Supplier berupa daftar ringkas dengan email terlihat dan tombol hapus berlabel. Total HPS serta jumlah barang/supplier/rencana berada di ringkasan bawah. Input dinonaktifkan untuk barang tidak terpilih; aksi simpan juga menunggu pemuatan rencana selesai.

Referensi: [ERPNext RFQ](https://docs.frappe.io/erpnext/user/manual/en/request-for-quotation) untuk konteks barang dan undangan supplier; [Attio](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views) dan [Linear](https://linear.app/features) sebagai inspirasi hierarki informasi. Tampilan merupakan adaptasi aplikasi, bukan salinan atau klaim standar visual ERPNext.

## Implementasi

| File | Perubahan |
| --- | --- |
| [RfqCreateView.vue](../../src/views/purchasing/RfqCreateView.vue) | Struktur, gaya lokal, ringkasan bawah dan aksi |
| [RfqPlanSelectionSection.vue](../../src/components/purchasing/rfq/form/RfqPlanSelectionSection.vue) | Metadata ringkas dan konsolidasi opsional |
| [RfqTermsFormSection.vue](../../src/components/purchasing/rfq/form/RfqTermsFormSection.vue) | Grid informasi dan catatan opsional |
| [RfqItemsTableSection.vue](../../src/components/purchasing/rfq/form/RfqItemsTableSection.vue) | Grid barang responsif dan detail expandable |
| [RfqSuppliersInviteSection.vue](../../src/components/purchasing/rfq/form/RfqSuppliersInviteSection.vue) | Selector bersama dan daftar kontak ringkas |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan chunk >500 kB masih ada |
| `node --test tests/rfq.test.js tests/rfqComparison.test.js tests/rfqDeadline.test.js tests/rfqInvitation.test.js tests/rfqTimestamp.test.js` | 45 tes lulus, 0 gagal setelah perapihan akhir |
| Browser fixture `/tmp/erp-rfq-create-preview.mjs` | 1440/1024/390 px: tidak ada overflow halaman; validasi supplier, tambah/hapus supplier, payload jumlah/HPS/catatan, barang habis kuota, ringkasan bawah, draf tanpa publish dan publikasi multi-rencana lulus |
| `git diff --check` pada file perubahan | Lulus |

Screenshot lokal: `/tmp/erp-rfq-create-1440.png`, `/tmp/erp-rfq-create-1024.png`, `/tmp/erp-rfq-create-390.png`. Browser memakai API tiruan; hasil ini tidak membuktikan transaksi database atau pengiriman email SMTP nyata.

## Risiko dan tindak lanjut

- [ ] UAT akun dan data nyata, termasuk rencana dengan daftar barang panjang.
- [ ] Verifikasi pengiriman email dan transaksi nyata secara terpisah.
- [ ] Audit aksesibilitas menyeluruh selector bersama dan optimasi bundle di pekerjaan terpisah.
- [ ] Lanjutkan audit detail dan komparasi RFQ sesuai prioritas pengguna.

## Deployment dan pemulihan

Belum ada bukti deployment. Jika perlu pemulihan, kembalikan hanya perubahan lima komponen di atas dengan mempertahankan perubahan lain yang masih berjalan. Tidak ada migrasi database dalam perbaikan ini.
