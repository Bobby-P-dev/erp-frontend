# Procurement — Sprint 2 fase 5: PO dari PR disetujui

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-13 |
| Jenis | Fitur / hasil sprint |
| Status pekerjaan | Selesai implementasi dan pengujian lokal |
| Sprint / issue / PR | Sprint 2 inisiatif dua jalur, fase 5 |
| Plan terkait | [Sprint 2 backend](../../../erp-backend/docs/plans/procurement-two-entry-sprint-2.md), [penyesuaian frontend](../plans/rfq-frontend-alignment.md) |
| Status rilis | Belum diverifikasi; migration backend lokal batch 57 |

## Masalah dan dampak

Detail PR dari penawaran sudah menyediakan revisi dan pembatalan, tetapi belum dapat melanjutkan PR approved menjadi PO. Pengguna memerlukan aksi yang jelas per supplier dan informasi PO yang sudah dibuat tanpa mengulang PP/RFQ.

## Tujuan dan kriteria penerimaan

- [x] Detail PR menampilkan kelompok quotation, supplier dan jumlah baris approved.
- [x] Tombol Buat draft PO mengikuti izin dan saldo dari backend.
- [x] Konfirmasi menjelaskan jumlah/harga mengikuti PR; batal tidak membuat request.
- [x] Error server tampil tanpa menutup konfirmasi; setelah sukses refresh PR dan tampilkan tautan PO.
- [x] Detail PO menjelaskan PR asal dan menjaga ketentuan yang disetujui.
- [x] Tampilan desktop/ponsel mengikuti komponen/desain existing tanpa mengubah header/footer.

## Cakupan dan rencana

Integrasi komponen reusable pada detail PR, service API dan detail PO. Urutan: periksa kontrak backend, buat konfirmasi per quotation, hubungkan refresh/data server, batasi edit komersial, lalu verifikasi tes/build/browser. Tidak termasuk agreement, repeat order, finance atau approval PO tambahan.

## Solusi dan keputusan

Satu kelompok quotation menghasilkan satu draft PO dengan seluruh baris approved kelompok itu. Supplier berbeda dipisahkan. UI menjelaskan draft langsung menggunakan saldo PR; jumlah/harga tidak dapat diketik ulang pada langkah ini. Backend tetap menjadi sumber izin, saldo dan validasi.

Komponen menampilkan supplier, nomor quotation, jumlah barang approved, konfirmasi dan status PO dalam kartu berjarak. Tombol Batal memakai secondary dan aksi utama primary. Umpan balik sukses/error memakai status/alert; aksi diblokir selama request berjalan. Setelah berhasil, detail PR dimuat ulang dan PO dapat dibuka melalui tautan. Jika hasil request belum terkonfirmasi, pesan meminta pengguna memuat ulang sebelum mencoba lagi; backend menjaga pembelian ganda.

PO dari PR approved hanya dapat mengubah tanggal PO dan catatan pada form edit. Syarat pembayaran, alamat/target pengiriman dan ongkir mengikuti dasar PR. Detail barang menunjukkan jalur Penawaran → PR disetujui → PO. Tidak menambahkan approval PO.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/RequisitionPurchaseOrders.vue` | Kartu kelompok supplier, konfirmasi, busy/error/sukses, refresh PR dan tautan PO. |
| `src/components/purchasing/RfqRequisitionLifecycle.vue` | Menyematkan komponen PO pada detail PR dan meneruskan hasil pembaruan. |
| `src/services/purchaseOrderServices.js` | POST `/api/v1/purchase-requisitions/{id}/purchase-orders` dengan `supplier_quotation_id`. |
| `src/components/purchasing/order/PurchaseOrderDetail.vue` | Deteksi asal PR dan pembatasan payload/form edit komersial. |
| `src/components/purchasing/order/PurchaseOrderItemDetails.vue` | Menampilkan jalur PR asal tanpa PP palsu. |
| `tests/browser/requisitionPurchaseOrders.smoke.mjs` | Fixture desktop/ponsel, konfirmasi/batal, error/retry, refresh dan tautan. |
| `tests/browser/rfqTwoSources.integration.mjs` | Vue/API nyata hingga approval, pembuatan PO, issue/cancel dan saldo. |

Kontrak `source_po_groups` berisi `supplier_quotation_id`, supplier/nomor quotation, `line_count`, `can_create` dan `orders`. [Aturan dan implementasi backend](../../../erp-backend/docs/changes/2026-11-13-procurement-sprint-2-phase-5.md).

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | Lulus, 269 tes. |
| `npm run build` | Lulus; warning ukuran chunk existing. |
| `node tests/browser/requisitionPurchaseOrders.smoke.mjs` | Lulus 1440/390 px: batal tanpa request, konfirmasi, error 422/retry, refresh, tautan PO, tombol hilang setelah saldo terpakai, tanpa overflow/error JS. |
| `node tests/browser/rfqTwoSources.integration.mjs` | Lulus Vue/API Laravel nyata dengan SQLite disposable: kebutuhan awal desktop hingga PO/issue/cancel dan jalur PP ponsel hingga award/PO. |
| Backend suite purchasing/approval/unit | 447 lulus, 6 dilewati sebelum tambahan guard rollback/tes akses terakhir; suite konversi sesudahnya 43 lulus, 2 dilewati. |
| `git diff --check` | Lulus pada kedua repository. |

Browser memakai `PLAYWRIGHT_MODULE_PATH` dari dependency runtime Codex dan `CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome`. Screenshot `/tmp/requisition-po-phase5-1440.png` dan `/tmp/requisition-po-phase5-390.png`; ponsel diperiksa visual. Warning route kosong berasal dari harness. Index graph frontend belum mutakhir; source/diff dan browser menjadi bukti perubahan terbaru.

Hasil lokal: PR approved dapat dilanjutkan per quotation menjadi PO, dengan konfirmasi yang mudah dibaca dan tautan tindak lanjut. Backend menolak duplikasi dan perubahan dasar komersial. Belum ada bukti UAT/deployment produksi.

## Risiko dan tindak lanjut

- [ ] Fase 6: konkurensi MySQL, UAT dan checklist rilis kedua jalur.
- [ ] Verifikasi role purchasing, PR dengan supplier berbeda, partial rejection, expiry dan PO cancelled pada staging.
- [ ] Sprint 3: harga berperiode/repeat order.

Satu kelompok tidak dapat dipecah lagi menjadi beberapa PO pada fase ini. Jika penawaran kedaluwarsa setelah draft dibuat, penerbitan ditolak oleh backend. Pengujian SQLite tidak membuktikan locking MySQL.

## Deployment dan pemulihan

Backend/frontend harus kompatibel dan migration FK alokasi PO harus tersedia sebelum fitur digunakan. Migration backend MySQL lokal sudah batch 57; produksi belum diverifikasi. Pemulihan aplikasi harus mempertahankan relasi alokasi yang sudah terpakai; jangan menghapus histori untuk membuka saldo.
