# RFQ — Sprint 3 tahap 3: review buyer dan status supplier

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-10 |
| Jenis | Fitur |
| Status pekerjaan | Selesai implementasi dan pengujian lokal |
| Sprint / issue / PR | Sprint 3 tahap 3 |
| Plan terkait | [Review frontend](../plans/rfq-sprint-3-review.md), [Sprint 3 backend](../../../erp-backend/docs/plans/rfq-improvement-sprint-3.md) |
| Status rilis | Browser/UAT dan produksi belum diverifikasi |

## Masalah dan dampak

Backend tahap 2/2A memisahkan respons masuk dari quotation yang disahkan, tetapi frontend belum menampilkan status, versi dan tindakan review. Buyer tidak dapat menggunakan jalur pengesahan langsung melalui UI. Penolakan award karena review juga belum dijelaskan secara khusus.

## Tujuan dan kriteria penerimaan

- [x] Buyer memeriksa barang, harga, pajak/ongkir, syarat pembayaran, lead time dan tanggal berlaku sebelum mengesahkan atau mengajukan approval.
- [x] Mode dan izin tindakan mengikuti API; tidak mengambil kebijakan dari konfigurasi browser.
- [x] Konfirmasi langsung mengirim versi yang diperiksa; request ganda saat pemrosesan dicegah.
- [x] Jalur approver menampilkan data quotation serta memakai tracker/decision API tanpa fallback sukses dari data contoh.
- [x] Error memperbarui status/izin/versi; tidak menampilkan sukses pada keputusan yang ditolak API.
- [x] Supplier melihat status review terpisah dari hasil tender, tanpa audit internal.
- [ ] UAT browser bersama buyer dan supplier.

## Cakupan dan rencana

Periksa kontrak backend → tambahkan pemeriksaan buyer → integrasikan dua mode → tampilkan status supplier → uji regresi dan build → dokumentasikan. Acuan proses tetap [baseline ERPNext tahap 1](../../../erp-backend/docs/plans/rfq-sprint-3-stage-1-baseline.md). Dua mode review dan award adalah adaptasi aplikasi; tidak diklaim sebagai workflow wajib ERPNext.

## Solusi dan keputusan

Halaman detail dan perbandingan RFQ menyediakan bagian **Pemeriksaan Penawaran**. Tombol **Periksa Penawaran** mengambil detail quotation terbaru. **Sahkan Quotation** hanya tersedia bila API mengirim mode `direct` dan `confirm_review`; **Ajukan Approval** mengikuti mode `approval` dan `submit_review`. Keduanya mengirim `expected_review_version`.

Buyer/pemeriksa dapat membuka tracker melalui **Lihat Approval**. Keputusan menggunakan `expected_step_order`, izin tracker eksplisit, dan API nyata. Request quotation tidak memakai fallback data contoh pada layanan approval lama. Harga item dan total menggunakan mata uang quotation. Approval tetap berbeda dari pemilihan pemenang.

Respons 403/409/422 memuat ulang quotation dan kelayakan award/PO. Kegagalan memuat ulang detail menghapus tindakan versi sebelumnya. Status supplier ditambahkan pada tanda terima publik dan riwayat quotation. Catatan keputusan internal tidak ditampilkan kepada supplier; penyampaian catatan revisi khusus supplier mengikuti tahap 4.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `services/rfqServices.js` | API confirm/submit review, tracker dan keputusan quotation tanpa mock fallback. |
| `composables/purchasing/useQuotationReview.js` | Detail, konfirmasi versi, penguncian request dan pemulihan error. |
| `components/purchasing/rfq/detail/QuotationReviewSection.vue` | Pemeriksaan detail/komersial, status, versi, audit langsung dan tracker. |
| `views/purchasing/RfqDetailView.vue`, `RfqComparisonView.vue` | Integrasi review dan kelayakan award/PO dari server. |
| `components/approval/ApprovalReviewDrawer.vue` | Data quotation, mata uang, izin tracker dan keputusan nyata; error meminta refresh. |
| Inbox approval | Memperbarui daftar saat keputusan quotation ditolak API. |
| `utils/quotationReview.js`, `quotationValidity.js` | Label dan alasan terhalangnya award/PO. |
| Tanda terima publik / riwayat supplier | Status review dipisahkan dari hasil tender. |
| Backend portal | Field `review_status` pada ringkasan quotation publik dan detail portal supplier. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 215 tes lulus, termasuk state Vue asli untuk review buyer, drawer approval, kontrak request, konflik versi dan kelayakan award. |
| `npm run build` | Build produksi lulus; peringatan ukuran chunk masih ada. |
| Backend: approval + RFQ + PO + kedua portal supplier | 145 tes lulus, 1.663 assertions; 2 tes konkurensi khusus MySQL dilewati pada SQLite. |
| Browser/UAT/produksi | Belum dijalankan. |

Tes frontend menguji composable dan script SFC dengan Vue reactivity serta API stub; bukan pengganti pengujian interaksi browser. Tes backend memverifikasi status review publik/detail dan ketiadaan metadata keputusan internal. Tes konkurensi MySQL tahap 2A tidak diulang karena tahap ini tidak mengubah transaksi review/award/PO.

## Risiko dan tindak lanjut

- [ ] UAT kedua mode dengan akun buyer, approver dan supplier nyata; konfigurasi approver diperlukan bila memilih mode `approval`.
- [ ] Tahap 4: workflow revisi, riwayat versi dan catatan yang memang ditujukan kepada supplier.
- [ ] Tahap 5: bukti evaluasi teknis/komersial dan alasan pemilihan.
- [ ] Optimasi ukuran chunk merupakan pekerjaan terpisah.

## Deployment dan pemulihan

Frontend memerlukan backend tahap 2/2A beserta migrasi yang sudah diterapkan lokal, ditambah penambahan field portal tahap ini. Tidak ada migrasi atau perubahan mode konfigurasi pada tahap 3. Untuk pemulihan UI, kembalikan perubahan frontend tahap ini; guard backend tetap perlu dipertahankan. Belum ada bukti deployment produksi.
