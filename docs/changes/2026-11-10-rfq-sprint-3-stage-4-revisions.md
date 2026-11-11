# RFQ — Sprint 3 tahap 4: revisi dan riwayat quotation

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-10 |
| Jenis | Fitur / integrasi API |
| Status pekerjaan | Selesai implementasi dan pengujian lokal |
| Sprint / issue / PR | Sprint 3 tahap 4 |
| Plan terkait | [Frontend Sprint 3](../plans/rfq-sprint-3-review.md), [backend](../../../erp-backend/docs/plans/rfq-improvement-sprint-3.md) |
| Status rilis | Belum diverifikasi di browser/UAT/produksi |

## Masalah dan dampak

Buyer belum dapat meminta/mencatat revisi dan membaca isi versi lama. Portal selalu menampilkan tanda terima sesudah pengiriman, termasuk ketika quotation membutuhkan revisi. Alasan internal approver tidak boleh otomatis ditampilkan kepada supplier.

## Tujuan dan kriteria penerimaan

- [x] Buyer membuat permintaan dengan alasan internal dan pesan supplier yang terpisah.
- [x] Buyer mencatat versi baru termasuk header, harga/qty, pajak dan lampiran, dengan alasan perubahan.
- [x] Buyer memeriksa snapshot versi, aktor/waktu/alasan dan riwayat pengesahan.
- [x] Supplier mengirim ulang hanya ketika API mengizinkan, memakai versi dan alasan revisi.
- [x] Konflik/penolakan API memperbarui status dan tidak menampilkan keberhasilan palsu.
- [x] Pemeriksaan akhir tes/build.
- [ ] UAT browser/rilis.

## Cakupan

Panel revisi di dialog review detail/perbandingan RFQ, form portal dan tanda terima. Kontrak dan batas ERPNext mengikuti [catatan backend](../../../erp-backend/docs/changes/2026-11-10-rfq-sprint-3-stage-4-revisions.md); workflow revisi adalah adaptasi aplikasi.

## Rencana pengerjaan

1. Verifikasi kontrak lintas repo dan pembatasan akses.
2. Integrasikan permintaan, form revisi dan riwayat buyer.
3. Aktifkan form portal berdasarkan `portal.can_revise` dan kirim versi/reason.
4. Uji payload, pemulihan error, lampiran, regresi dan build.
5. Catat hasil dan tindak lanjut rilis.

## Solusi dan keputusan

`revision_actions` dari server menentukan tindakan buyer. Form baru mengirim `expected_review_version` dan alasan, lalu memuat ulang detail/daftar; status award/PO dan review tidak dikirim sebagai field yang dapat diedit. Request supplier memakai endpoint quote yang sama serta token undangan. Form portal diisi dari penawaran sebelumnya ketika revisi diperbolehkan; currency/kurs sebelumnya dipertahankan. Konflik versi 409 memuat ulang isian terkini agar form lama tidak dikirim dengan versi baru secara diam-diam.

Alasan internal dan pesan supplier memakai kolom berbeda. Supplier hanya menerima pesan publik dari API. Tidak ada notifikasi email revisi otomatis. Jika deadline sudah berakhir, revisi menunggu perpanjangan resmi. UI tidak membatalkan award/PO otomatis.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `QuotationRevisionPanel.vue` | Permintaan revisi, catat penawaran baru, pilihan pajak, upload PDF dan riwayat snapshot/keputusan. |
| `QuotationReviewSection.vue` | Integrasi panel, pemuatan ulang dan perlindungan dialog ketika request berlangsung. |
| `rfqServices.js` | GET history, POST request-revision dan POST revise tanpa fallback sukses. |
| `useSupplierPortalRfqForm.js`, `SupplierPortalRfqView.vue` | Prefill dan pengiriman revisi dengan versi/alasan; form muncul hanya saat server mengizinkan. |
| `SupplierRfqSubmittedReceipt.vue` | Pesan revisi publik tetap terlihat saat pengiriman belum tersedia. |
| Tes revision/validity | Payload, alasan wajib, perubahan versi, penolakan, lampiran dan prefill portal. |

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | Lulus | 222 tes, termasuk 7 tes revisi/prefill tambahan. |
| `npm run build` | Lulus | Peringatan ukuran chunk. |
| Backend dan migrasi | [Catatan backend](../../../erp-backend/docs/changes/2026-11-10-rfq-sprint-3-stage-4-revisions.md) | Migrasi MySQL lokal diterapkan. |
| Browser/UAT/produksi | Belum dijalankan | Tahap 6. |

## Hasil

Tahap 4 selesai lokal: buyer meminta revisi, supplier merespons, buyer memeriksa versi baru dan mengesahkan ulang. 222 tes frontend, build, 161 tes backend dan 3 tes konkurensi MySQL lulus. Hasil rilis tidak disamakan dengan hasil pengujian lokal.

## Risiko dan batasan

Snapshot sebelum fitur ini aktif hanya tersedia bila data tersebut pernah diarsipkan. Retensi berkas mengikuti storage backend. Form buyer mempertahankan baris barang yang ada; supplier memakai daftar barang RFQ. Tes perilaku menggunakan Vue reactivity dan API stub, bukan browser penuh. Whitespace lama di bagian lain working tree dan peringatan ukuran chunk tetap ada.

## Deployment dan pemulihan

Rilis bersama backend yang telah dimigrasikan. Tidak ada konfigurasi mode baru. Pertahankan data audit jika UI dikembalikan ke versi sebelumnya. Produksi belum dideploy.

## Tindak lanjut

- [ ] Tahap 5: evaluasi teknis/komersial dan alasan pemilihan.
- [ ] Tahap 6: UAT browser dua mode, retensi lampiran dan verifikasi rilis.
