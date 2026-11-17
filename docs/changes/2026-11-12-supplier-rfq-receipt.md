# Portal supplier — Tanda terima barang dan hasil evaluasi

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Perbaikan UI/UX dan integrasi |
| Status pekerjaan | Selesai — implementasi dan verifikasi lokal |
| Sprint / issue / PR | Tindak lanjut portal RFQ |
| Plan terkait | [Penyesuaian frontend RFQ](../plans/rfq-frontend-alignment.md) |
| Status rilis | Deployment/UAT belum diverifikasi |

## Masalah dan dampak

Deskripsi barang kosong pada receipt, kuantitas tampil dengan empat nol desimal tanpa satuan, harga selalu berlabel rupiah, dan review internal tidak menjelaskan hasil alokasi maupun tindakan supplier. Tanggal pengiriman penawaran keliru dilabeli sebagai waktu pengiriman barang.

## Tujuan dan kriteria penerimaan

- [x] Nama barang tetap muncul jika deskripsi quotation kosong; spesifikasi dapat dibuka sesuai kebutuhan.
- [x] Jumlah/satuan dan nominal ditampilkan ringkas sesuai mata uang tanpa mengubah angka transaksi.
- [x] Hasil evaluasi dan jumlah terpilih mudah dibedakan dari jumlah ditawarkan.
- [x] Instruksi menunggu evaluasi, menunggu PO, atau membuka PO mengikuti data backend.

## Cakupan dan rencana

Periksa kontrak backend, perbaiki receipt dan fallback RFQ, tambahkan helper serta tes, verifikasi build/browser dan dokumentasikan. Header/footer global serta workflow revisi tetap dipertahankan.

## Solusi dan keputusan

Receipt memakai nama barang dengan fallback RFQ, angka ringkas dan satuan. Panel status biru menjelaskan tindak lanjut, kolom jumlah terpilih memakai aksen hijau, spesifikasi/catatan memakai disclosure. Di ponsel tabel dapat digeser dengan petunjuk eksplisit. PO yang sudah diterbitkan mendapat tautan ke menu PO supplier yang sudah memiliki otorisasi login. Alokasi tidak dianggap sebagai perintah pengiriman. Pemeriksaan internal tidak ditampilkan sebagai status utama setelah hasil alokasi tersedia.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/rfq/portal/SupplierRfqSubmittedReceipt.vue` | Identitas, disclosure, satuan, nominal, status/alokasi, navigasi PO dan label tanggal. |
| `src/views/public/SupplierPortalRfqView.vue` | Meneruskan item RFQ sebagai fallback. |
| `src/utils/supplierQuotationReceipt.js` | Normalisasi item historis dan petunjuk berdasarkan status sebenarnya. |
| `tests/supplierQuotationReceipt.test.js` | Regresi fallback, deskripsi khusus, satuan, evaluasi, alokasi, PO dan review ditolak. |
| [Backend](../../../erp-backend/docs/changes/2026-11-12-supplier-rfq-receipt.md) | Identitas/alokasi, PO milik supplier dan penyaringan audit award. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 250 tes / 53 suite lulus. |
| `npm run build` | Lulus; peringatan chunk di atas 500 kB tetap ada. |
| `node /tmp/erp-receipt-check.mjs` | Fixture browser 1440 dan 390 px lulus: fallback, satuan, alokasi, disclosure, navigasi PO dan tidak ada overflow halaman/error JS. Skrip verifikasi lokal, bukan bagian repository. |
| `git diff --check` | Lulus. |
| API/backend terkait | 74 tes RFQ lulus, 4 dilewati; data undangan terkait terverifikasi melalui service. |

Hasil merupakan verifikasi lokal. Tabel tetap memiliki scroll horizontal pada ponsel agar perbandingan angka terbaca. Tidak menyimpan perubahan quotation, award atau PO nyata.

## Risiko dan tindak lanjut

- [ ] UAT login supplier nyata dan konfirmasi PO yang sudah diterbitkan; tes browser memakai fixture.

## Deployment dan pemulihan

Rilis bersama backend; tidak ada migrasi atau perubahan konfigurasi. Deployment belum diverifikasi. Pemulihan dengan mengembalikan perubahan fix ini secara terpisah dari perubahan lain yang sedang dikerjakan.
