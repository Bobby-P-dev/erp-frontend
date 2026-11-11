# Rencana penyesuaian frontend RFQ

Referensi backend: [normalisasi mata uang](../../../erp-backend/docs/changes/2026-11-09-rfq-currency-normalization.md), [basis ranking biaya](../../../erp-backend/docs/changes/2026-11-09-rfq-cost-comparison-basis.md), dan [penguncian award dengan PO](../../../erp-backend/docs/changes/2026-11-09-rfq-award-po-lock.md).

## Urutan pengerjaan

1. [x] Periksa kontrak matriks backend dan konsumsi halaman perbandingan frontend.
2. [x] Gunakan nilai `base_*` dan mata uang dasar pada perbandingan serta ringkasan award; tampilkan harga asli sebagai konteks.
3. [x] Bedakan ranking harga satuan dari total quotation dan jelaskan pengecualian cakupan/kuantitas/kurs.
4. [x] Hitung split dari harga dasar; pertahankan null sebagai tidak tersedia; beri label sebelum pajak/ongkir.
5. [x] Hormati award terkait PO dan batas sisa kebutuhan pada full/split award.
6. [x] Tambahkan tes helper serta state/payload halaman dan jalankan verifikasi lokal.
7. [x] Buat catatan masalah, solusi, hasil, dan template dokumentasi.
8. [ ] Uji UI dan API pada staging dengan quotation nyata, kurs tersimpan, PO parsial, serta pembatalan PO yang sah.
9. [ ] Verifikasi deployment frontend bersama backend tahap 4–5.

## Kriteria penerimaan

- Penawaran USD dan IDR dibandingkan dalam mata uang dasar yang sama.
- Konversi tidak tersedia menghasilkan `-`, termasuk pada agregat, tanpa fallback harga asli.
- Tie mengikuti flag backend. Ranking total hanya untuk cakupan dan kuantitas setara.
- Split menampilkan nilai barang sebelum pajak/ongkir; payload award tetap ID dan kuantitas.
- PO 5 unit terhadap target 10 menyisakan maksimal 5 unit award baru ke quotation lain.

## Hasil implementasi

Lihat [catatan integrasi](../changes/2026-11-09-rfq-comparison-integration.md). Case duplikasi award tetap dijaga melalui satu pilihan per baris dan validasi backend; kuota procurement plan lintas RFQ tetap divalidasi backend. Tidak menambahkan perhitungan kuota lokal yang tidak memiliki data komitmen seluruh RFQ.

## Tindak lanjut

Sprint 3 tahap 1–6 selesai implementasi/regresi lokal: [review, revisi dan evaluasi quotation](rfq-sprint-3-review.md). Hasil terbaru: 224 tes frontend, build, 168 tes backend terkait dan empat skenario browser komponen dengan fixture lulus; UAT perusahaan/rilis mengikuti [rencana bersama](../../../erp-backend/docs/plans/rfq-sprint-3-release.md). Suite backend penuh masih memiliki tujuh temuan Auth/Core.

Tampilan waktu aktivitas RFQ kini menggunakan WIB secara eksplisit: [catatan perbaikan timestamp](../changes/2026-11-10-rfq-timestamp-wib.md). 202 tes dan build lulus; waktu pembuatan, audit deadline, dan undangan masih perlu UAT browser/staging. Timestamp database tetap UTC.

Form split masih mendukung satu pilihan quotation baru per item pada setiap pengiriman, seperti UI sebelumnya. Beberapa alokasi baru untuk satu item dalam satu pengiriman memerlukan pengembangan terpisah. Ranking total bukan optimasi kombinasi split. Case masa berlaku quotation diimplementasikan pada Sprint 2 tahap 3 berikut.

## Sprint 2 tahap 3 — Masa berlaku quotation

- [x] Gunakan metadata validitas backend dan tampilkan status serta batas akhir hari WIB.
- [x] Batasi default dan pilihan full/split award tanpa mengubah ranking biaya atau komitmen PO.
- [x] Validasi batch PO pada matriks dan halaman detail; jangan mengirim sebagian kandidat diam-diam.
- [x] Refresh setelah penolakan 422 serta pertahankan form untuk koreksi.
- [x] Kosongkan default masa berlaku manual dan selaraskan input tanggal manual/portal.
- [x] Tambahkan tes dan dokumentasi; 187 tes serta build lulus.
- [ ] Verifikasi UI/API staging, perubahan data bersamaan, dan deployment bersama backend tahap 2.

Hasil: [catatan tahap 3](../changes/2026-11-09-rfq-sprint-2-stage-3-validity.md). Berikutnya konsistensi deadline pada Sprint 2 tahap 4.

## Sprint 2 tahap 4 — Konsistensi deadline

- [x] Gunakan metadata waktu server, countdown reaktif, serta label WIB pada buyer/portal/dashboard supplier.
- [x] Blokir input manual dan respons portal setelah deadline; refresh 422 tanpa menghapus input.
- [x] Refresh portal berkala untuk mendeteksi perpanjangan tanpa mengganti harga/lampiran.
- [x] Tambahkan form perpanjangan dengan alasan serta riwayat pada detail buyer.
- [x] Tes dan build: 194 tes, 44 suite lulus; backend 65 tes/633 assertion lulus.
- [ ] Uji browser/API staging dan deploy bersama backend setelah migrasi tabel riwayat.

Hasil: [catatan tahap 4](../changes/2026-11-09-rfq-sprint-2-stage-4-deadline.md). Berikutnya tahap 5: keandalan pengiriman undangan.

## Sprint 2 tahap 5 — Keandalan undangan

- [x] Tampilkan status antrean/proses/penyerahan email/gagal/unknown dan riwayat percobaan.
- [x] Sediakan kirim ulang, koreksi alamat email dan pengaman request duplikat.
- [x] Bedakan timestamp historis dari bukti pengiriman yang baru; unknown memerlukan pemeriksaan operator.
- [x] Tes dan build: 199 tes lulus; lihat [hasil tahap 5](../changes/2026-11-09-rfq-sprint-2-stage-5-invitations.md).
- [ ] Verifikasi email nyata, worker/scheduler dan interaksi browser di staging.

## Sprint 2 tahap 6 — Penutupan regresi lokal

- [x] Jalankan ulang seluruh tes frontend: 199 tes/45 suite lulus, build produksi lulus.
- [x] Verifikasi alur backend bersama frontend: 78 tes RFQ/PO/portal lulus; dua tes integrasi baru menggunakan worker antrean database dengan transport mock/log.
- [x] Catat suite backend penuh: 431/438 lulus, 7 tes Auth/Core gagal/error dan direproduksi terpisah; lihat REG-01–03 pada [hasil tahap 6](../../../erp-backend/docs/changes/2026-11-09-rfq-sprint-2-stage-6-regression.md).
- [x] Lengkapi [hasil frontend tahap 6](../changes/2026-11-09-rfq-sprint-2-stage-6-regression.md) serta [matriks UAT/rencana rilis bersama](../../../erp-backend/docs/plans/rfq-sprint-2-release.md).
- [ ] Selesaikan tindak lanjut suite penuh, UAT/staging dan deployment. Implementasi/regresi lokal selesai; rilis belum dinyatakan siap.
