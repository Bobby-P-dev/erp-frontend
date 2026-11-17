# Purchasing — Aksi langsung buat draft dan terbitkan PO

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Perbaikan UX, case 4 |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | UAT jalur RFQ awal → PR → PO |
| Plan terkait | [Penyesuaian RFQ](../plans/rfq-frontend-alignment.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Pengguna harus membuka preview PR approved untuk membuat draft PO, kemudian membuka preview draft PO untuk menerbitkannya. Aksi utama sulit ditemukan dan menambah langkah kerja.

## Tujuan dan kriteria penerimaan

- [x] Baris PR RFQ approved menyediakan tombol Buat draft PO jika metadata backend masih mengizinkan pembuatan.
- [x] Baris PO draft/approved menyediakan tombol Terbitkan PO.
- [x] Kedua aksi berjalan tanpa membuka preview atau mengambil detail dokumen terlebih dahulu.
- [x] Konfirmasi singkat, indikator proses, pencegahan klik ganda, error API dan refresh daftar tersedia.
- [x] Preview tetap dapat dibuka untuk pemeriksaan opsional.

## Cakupan dan rencana

Telusuri kontrak dan otorisasi API; buat handler aksi bersama; pasang tombol pada daftar; gunakan handler issue yang sama pada detail; verifikasi tabel, pembatalan, error/retry dan perubahan status; dokumentasikan.

## Solusi dan keputusan

Tombol Buat draft PO menggunakan metadata `source_po_groups.can_create` dari server, hanya untuk PR approved bersumber `rfq_quotation`. Konfirmasi menyebut nomor PR, jumlah draft dan supplier yang tersedia. Endpoint tanpa `supplier_quotation_id` membuat seluruh kelompok penawaran yang masih tersedia secara transaksional, satu PO per penawaran supplier; kelompok yang sudah digunakan dilewati sesuai perilaku backend. Tidak menambah proses approval atau membuat PO saat approval masih berjalan.

Tombol Terbitkan PO mengikuti status draft/approved seperti aksi detail yang sudah tersedia. Backend tetap memeriksa izin, status terbaru, approval PR sumber dan syarat penawaran. List diperbarui setelah berhasil; tombol yang sudah tidak berlaku menghilang. Kegagalan refresh sesudah aksi berhasil diberi pesan terpisah agar tidak dikira gagal menyimpan.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/composables/purchasing/usePurchaseOrderActions.js` | Handler reusable untuk konfirmasi, request, lock aksi, ID baris aktif, hasil/error dan refresh. |
| `src/views/purchasing/PurchaseRequisitionListView.vue` | Tombol Buat draft PO langsung di kolom aksi dan indikator proses. |
| `src/views/purchasing/PurchaseOrderListView.vue` | Tombol Terbitkan PO, indikator proses dan kolom aksi yang lebih lebar. |
| `src/components/purchasing/order/PurchaseOrderDetail.vue` | Penerbitan pada detail memakai handler bersama. |
| `tests/browser/purchasingDirectActions.smoke.mjs` | Fixture kedua daftar untuk aksi tanpa preview. |
| `tests/browser/purchaseOrderRedesign.smoke.mjs` | Sesuaikan label konfirmasi menjadi Terbitkan PO. |

Tidak mengubah backend, endpoint, database, header atau footer aplikasi pada case ini.

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan ukuran chunk tetap ada. |
| Browser `purchasingDirectActions.smoke.mjs` | Empat skenario PR/PO × 1440/390 px lulus: status guard, multi-supplier, batal tanpa POST, lock tombol, error 422, retry, refresh, tombol hilang, tanpa GET detail/preview dan tanpa overflow halaman. |
| Browser `purchaseOrderRedesign.smoke.mjs` | Lulus 1440/1024/390 px: regresi daftar, preview, edit, issue, batal, keyboard/fokus, retry dan URL detail. |
| Backend tiga tes terarah `RfqRequisitionTest` | 3 lulus, 59 assertions: PO langsung tanpa approval tambahan/duplikasi, kelompok supplier/transaksi rollback dan otorisasi. |
| `git diff --check` | Lulus. |

Browser menggunakan API fixture terisolasi. Screenshot tabel diperiksa lokal; transaksi dengan dokumen perusahaan nyata dan deployment belum diverifikasi.

## Risiko dan tindak lanjut

- [ ] UAT: PR RFQ approved → Buat draft PO dari baris → menu PO → Terbitkan PO dari baris.
- [ ] UAT multi-supplier, akun dengan izin berbeda dan quotation yang kedaluwarsa setelah daftar dimuat.
- [ ] Verifikasi deployment bundle frontend.

## Deployment dan pemulihan

Tidak ada migrasi/config baru. Rilis bundle frontend dengan backend kontrak PR → PO yang sudah tersedia. Untuk pemulihan gunakan bundle sebelumnya; data tidak perlu diubah.
