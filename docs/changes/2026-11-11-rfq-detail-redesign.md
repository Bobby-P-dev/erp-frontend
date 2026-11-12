# Tender RFQ — Redesign detail tender

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Penyempurnaan desain Purchasing |
| Plan terkait | [Redesign internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi; UAT data asli belum dilakukan |

## Masalah dan dampak

Detail RFQ pada screenshot masih menampilkan empat kartu tahapan, tiga kartu metadata, pemeriksaan quotation dan tabel delapan kolom secara bersamaan. Judul dan banyak tombol bersaing dengan isi. Redesign halaman perbandingan sebelumnya belum menyelesaikan kepadatan halaman detail ini.

## Tujuan dan kriteria penerimaan

- [x] Ringkasan utama diprioritaskan; metadata dan tahapan dapat dibuka saat dibutuhkan.
- [x] Barang, supplier/undangan dan pemeriksaan quotation memiliki bagian terpisah.
- [x] Tabel menggunakan pola BaseTable dan empat kolom; ponsel menampilkan label yang jelas.
- [x] Aturan validitas PO, undangan, pemeriksaan dan deadline tetap bekerja.
- [x] Header/footer aplikasi tetap.

## Cakupan dan rencana

Periksa komponen detail melalui graph dan coverage; rapikan hierarki dan aksi sesuai status; gunakan komponen bersama; periksa browser desktop/tablet/ponsel serta regresi RFQ; catat hasil dan batasan.

## Solusi dan keputusan

Nomor/status RFQ dan judul dipisahkan agar mudah dipindai. Ringkasan utama berisi deadline, jumlah penawaran dan HPS. Informasi sumber PR/PP, pembayaran, alamat dan pembuat tersedia melalui disclosure. Alur tender berada di bawah konten dan dapat dibuka; pengaturan tender muncul sesuai status.

Tiga tab memisahkan barang/jasa, supplier/undangan dan pemeriksaan penawaran. Tabel barang menggabungkan kuantitas dengan satuan; spesifikasi, catatan dan sumber dokumen tersedia melalui rincian. Tabel supplier memprioritaskan identitas, undangan, respons dan tindakan; kontak, akses portal serta riwayat pengiriman dibuka saat diperlukan. Komponen pemeriksaan tetap terpasang saat berpindah tab agar state dialog tidak dibuang. Peringatan PO diringkas dengan alasan yang tetap dapat dibuka.

Acuan proses tetap [ERPNext Request for Quotation](https://docs.frappe.io/erpnext/request-for-quotation) dan [Supplier Quotation](https://docs.frappe.io/erpnext/supplier-quotation). Tab, disclosure dan hierarki visual merupakan adaptasi untuk kebutuhan pengguna, bukan klaim menyalin UI ERPNext. Tidak ada perubahan backend atau aturan transaksi.

## Implementasi

| File | Perubahan |
| --- | --- |
| [RfqDetailView.vue](../../src/views/purchasing/RfqDetailView.vue) | Heading, aksi sesuai status, peringatan PO, pengaturan opsional dan error/retry |
| [RfqMetadataCards.vue](../../src/components/purchasing/rfq/detail/RfqMetadataCards.vue) | Ringkasan tiga informasi dan metadata expandable |
| [RfqItemsSuppliersTabs.vue](../../src/components/purchasing/rfq/detail/RfqItemsSuppliersTabs.vue) | Tiga bagian, BaseTable empat kolom dan rincian responsif |
| [RfqLifecycleStepper.vue](../../src/components/purchasing/rfq/detail/RfqLifecycleStepper.vue) | Tahapan ringkas dalam disclosure |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan chunk >500 kB masih ada |
| `node --test tests/rfq.test.js tests/rfqComparison.test.js tests/rfqDeadline.test.js tests/rfqInvitation.test.js tests/rfqTimestamp.test.js` | 45 tes lulus |
| Browser fixture `/tmp/erp-rfq-detail-preview.mjs` pada 1440/1024/390 px | Ringkasan, disclosure, tab supplier/review, PO kedaluwarsa diblokir, empat status lifecycle, buka/batal input manual, retry undangan, perpanjangan/riwayat deadline, data kosong dan error/retry lulus; tidak ada page error atau overflow halaman |
| `git diff --check` pada empat file UI dan dokumentasi terkait | Lulus |

Fixture menggunakan komponen Vue asli, URL simulasi RFQ `/__detail/8` dan API tiruan. Screenshot `/tmp/erp-rfq-detail-{1440,1024,390}.png` serta tab supplier diperiksa. Ini tidak membuktikan pengiriman email, transaksi database, hak akses akun nyata atau deployment.

## Risiko dan tindak lanjut

- [ ] UAT RFQ asli dengan banyak barang/supplier, judul panjang dan beragam status.
- [ ] Uji review, undangan/email dan transaksi PO nyata dengan akun berwenang.
- [ ] Audit aksesibilitas menyeluruh komponen/modal bersama.

## Deployment dan pemulihan

Belum ada bukti deployment dan tidak ada migrasi. Pemulihan cukup mengembalikan empat komponen detail terkait; pertahankan perubahan Purchasing lain yang berjalan bersamaan.
