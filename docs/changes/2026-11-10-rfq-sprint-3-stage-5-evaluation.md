# RFQ — Sprint 3 tahap 5: evaluasi teknis/komersial dan alasan award

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-10 |
| Jenis | Fitur |
| Status pekerjaan | Selesai implementasi/pengujian lokal |
| Sprint / issue / PR | Sprint 3 tahap 5 |
| Plan terkait | [Sprint 3 frontend](../plans/rfq-sprint-3-review.md) |
| Status rilis | Migrasi backend lokal diterapkan; browser/UAT/produksi belum diverifikasi |

## Masalah dan dampak

Alasan full award opsional dan split award menggunakan catatan generik. Belum ada form bukti teknis/komersial atau tampilan riwayat dasar pemilihan. Catatan internal award berisiko bercampur dengan catatan quotation supplier di backend.

## Tujuan dan kriteria penerimaan

- [x] Wajib alasan pemilihan nyata sebelum mengirim full/split award.
- [x] Form kesesuaian teknis, catatan teknis/komersial, garansi dan referensi bukti.
- [x] Bekukan versi evaluasi saat pilihan dibuka dan kosongkan bukti saat supplier diganti.
- [x] Tampilkan spesifikasi/deskripsi/catatan supplier dan riwayat keputusan buyer dengan waktu WIB.
- [x] Regresi dan build lokal lulus.
- [ ] UAT browser dan rilis bersama backend.

## Cakupan

Halaman matriks buyer dan form award; bukti dicatat bersamaan dengan award. Tidak menambahkan bobot atau Supplier Scorecard. Dasar ERPNext dan batas adaptasi aplikasi mengikuti [catatan backend](../../../erp-backend/docs/changes/2026-11-10-rfq-sprint-3-stage-5-evaluation.md).

## Rencana pengerjaan

1. Verifikasi kontrak matriks/award dan konsumennya.
2. Integrasikan form bersama pada full/split award.
3. Tampilkan riwayat, data kosong dan status belum diverifikasi secara eksplisit.
4. Uji payload, validasi, pergantian supplier, versi dan build.
5. Perbarui dokumentasi dan plan.

## Solusi dan keputusan

Alasan wajib berlaku pada semua pilihan, termasuk penawaran termurah. Full award memakai evaluasi bersama; split award menyediakan isian per item. Status teknis default belum diverifikasi; garansi/bukti kosong tidak dianggap tersedia. Riwayat menampilkan snapshot spesifikasi, pembayaran, delivery, garansi, catatan, pelaku, waktu dan alasan. Tidak merekonstruksi alasan award lama. Referensi bukti berupa teks, bukan upload atau verifikasi keaslian dokumen.

Versi dikirim dari pilihan/modal awal dan tidak diambil ulang diam-diam setelah refresh data. Penolakan API tetap memuat ulang matriks, mempertahankan isian untuk diperiksa, dan tidak menampilkan sukses palsu. Bila versi berubah, buka ulang modal atau pilih ulang supplier setelah mengevaluasi versi baru.

## Implementasi

| Komponen | Perubahan |
| --- | --- |
| `RfqComparisonView.vue` | Alasan/versi wajib, form full/split, deskripsi/catatan supplier dan riwayat. |
| `AwardEvaluationFields.vue` | Form bersama bukti dan alasan. |
| `RfqAwardHistory.vue` | Tampilan audit buyer dan fallback belum tersedia. |
| `tests/rfqComparison.test.js` | Kasus alasan, bukti, pergantian pilihan dan pembekuan versi. |

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | Lulus | 224 tes. |
| `npm run build` | Lulus setelah perbaikan import helper waktu | Peringatan ukuran chunk. |
| Backend tes terkait | Lulus | 164 tes / 1.890 assertions; lihat catatan backend untuk konkurensi. |
| Browser/UAT/produksi | Belum dijalankan | Tahap 6. |

## Hasil

Evaluasi dan alasan tercatat melalui API nyata dan ditampilkan kembali pada matriks buyer. Snapshot riwayat tidak dibuka untuk supplier. Implementasi lokal selesai; browser/UAT/produksi belum diverifikasi.

## Risiko dan batasan

Belum ada draft evaluasi kandidat sebelum award, kewajiban bukti perusahaan atau bobot terukur. Form full award memakai evaluasi yang sama untuk seluruh item; gunakan split untuk evaluasi berbeda. Akses buyer sekarang mengikuti employee aktif/perusahaan dan izin award `rfq.create` backend. Tinjau konfigurasi akun nyata saat UAT.

## Deployment dan pemulihan

Deploy bersama backend tahap 5 dan migrasinya. POST award kini memerlukan `selection_reason` dan `expected_review_version` per item. Migrasi backend lokal sudah diterapkan; rilis produksi belum dilakukan. Pertahankan audit keputusan ketika rollback.

## Tindak lanjut

- [ ] Tahap 6: UAT modal full/split, revisi, penolakan versi, hak akses dan PO terkunci.
