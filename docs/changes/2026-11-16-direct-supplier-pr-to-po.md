# PR supplier langsung → PO

Tanggal: 2026-11-16. Status implementasi: selesai lokal. Status rilis: belum diverifikasi. UAT pengguna belum dilakukan.

## Masalah dan target

Supplier yang sudah diketahui/repeat order masih perlu jalur langsung tanpa membuat PP atau RFQ baru. Target: draft PR → pilih workflow → approval PR → buat draft PO → terbitkan PO. Approval pembelian tetap pada PR; tidak ada approval PO tambahan.

## Rencana dan keputusan

1. Tambah pilihan jalur PR dan supplier aktif satu perusahaan.
2. Simpan supplier, harga satuan, jumlah dan ketentuan sebagai dasar approval.
3. Buat PO dari barang yang disetujui dan keluarkan PR langsung dari antrean PP.
4. Validasi kembali dasar approval saat membuat/menerbitkan PO; cegah PO ganda.
5. Selaraskan form, detail, preview approval dan PDF; jalankan regresi dan UAT.

Satu PR langsung ditujukan kepada satu supplier. Gunakan PR terpisah bila supplier berbeda. Harga yang diisi adalah harga yang sudah disepakati, bukan otomatis harga PO sebelumnya. Harga nol boleh disimpan sebagai draft tetapi ditolak saat pengajuan approval. PO yang dibatalkan dapat diganti; PO aktif tidak boleh digandakan. Supplier harus tetap aktif dan berada di perusahaan PR saat membuat/menerbitkan PO.

## Implementasi

Backend menambah `procurement_route`, `direct_supplier_id`, `direct_purchase_terms` pada PR dan `direct_requisition_id` pada PO. `DirectRequisitionPurchaseOrderService` mengelola snapshot saat submit, validasi, metadata aksi dan pembuatan PO. Service/repository PR, PP dan PO serta policy/resource disesuaikan. Approval preview menampilkan supplier dan ketentuan pembelian.

Frontend menambah `PRProcurementRouteSection` dengan pencarian supplier. Form mempertahankan pilihan workflow saat pengajuan. Harga tampil sebagai harga disepakati. Detail PR menyediakan aksi buat draft PO; detail PO menampilkan asal PR langsung dan aksi terbitkan. PDF PR menampilkan supplier, referensi harga, pembayaran dan alamat pengiriman. PDF tetap melalui preview sebelum unduh.

## Verifikasi lokal

- `php artisan test --compact --filter=DirectRequisitionTest`: 11 lulus, 87 assertions.
- Regresi PR/PO/PP: 178 tes, 168 lulus, 10 dilewati, 1640 assertions. Mencakup DirectRequisition, RfqRequisition, PurchaseOrderWorkflow, PurchaseRequisitionController/Service/ItemApproval/Resource, StorePurchaseRequisitionRequest, ProcurementPlan dan ProcurementPlanRelationship. Tes yang dilewati tidak dinyatakan lulus.
- `npm test`: 278 lulus.
- `npm run build`: lulus; peringatan chunk besar tetap ada.
- Browser fixture `directRequisition.smoke.mjs`: pemilihan/reset supplier dan pembuatan PO desktop 1440 serta ponsel 390 lulus. API fixture tidak membuktikan transaksi akun nyata.
- Browser `pdfPreview.smoke.mjs`: PDF PR/BAST nyata lulus pada desktop 1440 dan ponsel 390; supplier/referensi/pembayaran/alamat tercantum dalam definisi PDF PR, preview sebelum download, TTD gambar dan pembersihan URL terverifikasi.
- Pint service baru, approval resource dan tes baru lulus.
- Migrasi `2026_11_16_100000_add_direct_supplier_requisitions` sudah diterapkan di database lokal, diverifikasi dengan `php artisan migrate:status`. Belum ada bukti deployment server lain.

## Checklist UAT

- [ ] Buat PR → pilih “Supplier sudah ditentukan / repeat order”; pilih supplier aktif, isi harga, referensi, pembayaran dan alamat.
- [ ] Simpan draft, buka lagi dan pastikan supplier/harga tetap benar; mengganti perusahaan membersihkan pilihan supplier.
- [ ] Ajukan dengan workflow yang dipilih. Pastikan peninjau melihat supplier dan ketentuan pembelian.
- [ ] Sebelum approval, pembuatan PO ditolak; setelah approval, buat draft PO dari detail PR.
- [ ] Pastikan PO berisi supplier, jumlah/harga yang disetujui dan tidak memiliki RFQ/PP.
- [ ] Terbitkan PO langsung tanpa approval kedua. Pembuatan PO kedua ditolak.
- [ ] Preview PDF PR menampilkan supplier/ketentuan; unduh setelah preview.
- [ ] PR langsung tidak masuk antrean PP; PR biasa tetap melalui alur biasa.
- [ ] Supplier tidak aktif/lintas perusahaan serta perubahan harga/jumlah dasar approval ditolak.

## Batasan dan tindak lanjut

Belum mencakup kontrak harga otomatis 1–6 bulan, tier harga untuk jalur langsung, atau input pajak/ongkir khusus jalur ini. Kesepakatan harga berperiode tetap merupakan pekerjaan lanjutan; fitur ini tidak otomatis menjamin harga PO terdahulu masih berlaku. Pajak/ongkir PO langsung saat ini nol dan tidak boleh diubah di luar dasar approval.

## Deployment dan pemulihan

Deploy backend dan frontend yang sesuai, lalu jalankan migrasi pada target yang belum menerapkannya. Belum commit/push atau deploy. Migrasi aditif; rollback ditolak jika sudah ada PR supplier langsung. Jangan menghapus data transaksi demi rollback.

Plan terkait: [PR supplier langsung](../plans/direct-supplier-pr-to-po.md).
