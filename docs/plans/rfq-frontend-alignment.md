# Rencana penyesuaian frontend RFQ

Revisi UAT 2026-11-16: [preview PDF, TTD biasa dan aksi PR](../changes/2026-11-16-pdf-preview-signature-pr-actions.md) selesai implementasi dan tes lokal. Preview PR/BAST sebelum unduh, QR cetak dihapus, edit/hapus mengikuti capability sebelum persetujuan pertama. UAT/deployment terbuka.

Case 4 UAT 2026-11-16 selesai lokal: tombol Buat draft PO pada PR RFQ approved dan Terbitkan PO pada daftar PO draft/approved, tanpa preview. Handler issue reusable pada daftar/detail; build, browser aksi langsung/regresi detail dan 3 tes backend terkait lulus. [Catatan](../changes/2026-11-16-purchasing-direct-po-actions.md). UAT akun nyata/deployment terbuka.

Temuan UAT 2026-11-16: PR RFQ approved sempat muncul di antrean PP. Filter backend diperbaiki dan petunjuk detail PR memperjelas aksi langsung ke PO. Build serta smoke lifecycle/PO desktop/ponsel lulus; UAT/deployment terbuka. [Catatan](../changes/2026-11-16-rfq-pr-direct-po-guidance.md).

Case 3 UAT (2026-11-16) selesai lokal: draft PR dari RFQ kini memilih workflow saat Ajukan dari daftar/detail, dengan preview tahap dan payload eksplisit. Build, 35 tes terkait dan browser fixture desktop/ponsel lulus. Pengajuan ulang revisi tetap memakai alur sebelumnya; UAT akun nyata/deployment belum diverifikasi. [Catatan perbaikan](../changes/2026-11-16-rfq-pr-workflow-selection.md).

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

Sprint 2 inisiatif dua jalur fase 5 selesai frontend lokal: detail PR approved menampilkan kelompok quotation dan konfirmasi Buat draft PO, umpan balik server, refresh serta tautan PO. Form edit PO menjaga ketentuan PR; header/footer tetap. 269 tes, build, browser fixture 1440/390 px dan integrasi UI/API nyata hingga approval → PO → issue/cancel lulus. [Catatan fase 5](../changes/2026-11-13-procurement-sprint-2-phase-5.md). Migration backend lokal batch 57; konkurensi MySQL, UAT dan rilis tetap fase 6. Catatan fase sebelumnya di bawah adalah riwayat hasil pada saat fase tersebut ditutup.

Sprint 2 inisiatif dua jalur fase 4 selesai frontend lokal: revisi/pembatalan PR dari penawaran pada modal detail, total hasil server, izin submit/resubmit dan guard form generik. 269 tes, build dan browser lifecycle 1440/390 px lulus. [Catatan fase 4](../changes/2026-11-13-procurement-sprint-2-phase-4.md). Backend 440 tes lulus, 6 dilewati; migration histori lokal batch 56. PO fase 5 dan penutupan/UAT/rilis fase 6 tetap terbuka.

Sprint 2 inisiatif dua jalur fase 3 selesai frontend lokal: form pemilihan penawaran → draft PR, saldo split, preview biaya backend, error API dan retry idempotent setelah reload. 269 tes, build, browser fixture desktop/ponsel dan integrasi UI/API nyata dua sumber lulus. [Catatan fase 3](../changes/2026-11-13-procurement-sprint-2-phase-3.md). Approval/revisi PR tetap fase 4, PO fase 5; UAT/rilis belum diverifikasi.

Sprint 1 inisiatif dua jalur pengadaan selesai implementasi/regresi lokal fase 1–6: form sumber kebutuhan awal/PP, editor barang mandiri, label sumber serta guard award/PO. Sebanyak 263 tes frontend, build, browser fixture lebar 1440/390 px dan integrasi UI/API nyata kedua sumber lulus. Backend purchasing/pricing: 357 lulus, 4 tes konkurensi MySQL dilewati. [Catatan fase 5](../changes/2026-11-12-procurement-sprint-1-phase-5.md), [penutupan fase 6](../changes/2026-11-12-procurement-sprint-1-phase-6.md). UAT, SMTP nyata, konkurensi MySQL dan rilis belum diverifikasi; quotation menjadi PR masuk Sprint 2.

Konfirmasi harga saat jumlah berubah tersedia melalui mode `reconfirm`, aksi permintaan pada evaluasi, hidrasi jumlah pada portal dan editor revisi manual bersama. [Catatan](../changes/2026-11-12-rfq-price-reconfirmation.md); implementasi/regresi dan browser fixture lokal selesai, UAT serta deployment produksi belum diverifikasi.

Tanda terima supplier diperbaiki: nama/satuan dengan fallback RFQ, format angka ringkas, hasil alokasi dan tindak lanjut PO. [Catatan](../changes/2026-11-12-supplier-rfq-receipt.md); verifikasi lokal selesai, UAT/rilis belum diverifikasi.

Lihat [catatan integrasi](../changes/2026-11-09-rfq-comparison-integration.md). Case duplikasi award tetap dijaga melalui satu pilihan per baris dan validasi backend; kuota procurement plan lintas RFQ tetap divalidasi backend. Tidak menambahkan perhitungan kuota lokal yang tidak memiliki data komitmen seluruh RFQ.

## Tindak lanjut

Sprint 2 inisiatif dua jalur: regresi frontend fase 6 selesai lokal. 269 tes, build, smoke lifecycle/PO 1440/390 px dan integrasi UI/API nyata kedua sumber lulus. [Hasil fase 6](../changes/2026-11-13-procurement-sprint-2-phase-6.md), [UAT/rilis bersama](../../../erp-backend/docs/plans/procurement-two-entry-sprint-2-release.md). UAT perusahaan/deployment tetap terbuka; temuan suite penuh backend Auth/Core dicatat terpisah.

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

## Penyempurnaan form penawaran supplier — 2026-11-12

- [x] Analisis kepadatan editor bersama dan form portal mengikuti [prinsip desain internal](../guides/design-principles.md).
- [x] Sederhanakan informasi utama; opsi tambahan dan simulasi dapat dibuka sesuai kebutuhan.
- [x] Rapikan dokumen, hapus masa berlaku duplikat, pindahkan ringkasan ke bawah form.
- [x] Verifikasi lokal tes, build, dan browser fixture portal/manual pada tiga ukuran layar.
- [ ] UAT supplier dan submit/revisi dengan data staging nyata sebelum rilis.

Hasil dan batasan: [catatan perbaikan](../changes/2026-11-12-supplier-quotation-form-ux.md).

## Feedback validasi minimum pada evaluasi — 2026-11-12

- [x] Konfirmasi minimum supplier tersimpan dan penolakan backend secara read-only.
- [x] Tampilkan minimum, alasan per alokasi, status footer dan retry preview harga.
- [x] Verifikasi split 45/5 ditolak dan 40/10 dapat dilanjutkan; 248 tes, build dan browser fixture dua ukuran lulus.
- [ ] UAT transaksi award/PO nyata dan deployment.

Hasil: [alasan alokasi terblokir](../changes/2026-11-12-rfq-award-minimum-feedback.md).

## Penyempurnaan form buat tender — 2026-11-16

- [x] Ganti daftar katalog dan supplier permanen dengan dropdown pencarian reusable.
- [x] Pertahankan rekomendasi, pencarian, pagination, pilihan jamak dan status supplier.
- [x] Kelompokkan informasi tambahan; tambahkan navigasi bagian dan pertahankan ringkasan di bawah.
- [x] Verifikasi 280 tes, build, smoke browser form/supplier pada desktop dan ponsel.
- [ ] UAT perusahaan dan deployment.

Hasil dan batasan: [catatan perbaikan UI/UX](../changes/2026-11-16-rfq-create-search-dropdown-ux.md).

## Ralat case 1 — Reset supplier saat barang berubah, 2026-11-16

- [x] Perubahan identitas/tambah/hapus barang mengosongkan pilihan supplier dan mengembalikan rekomendasi terbaru.
- [x] Reset pencarian/halaman, tampilkan notice dan cegah request lama memulihkan pilihan.
- [x] Pertahankan pilihan saat jumlah/harga, pencarian atau pagination berubah.
- [x] Build dan browser fixture desktop/ponsel lulus.
- [ ] UAT perusahaan dan deployment.

Hasil: [reset supplier](../changes/2026-11-16-rfq-supplier-reset-on-item-change.md). Menggantikan keputusan retensi supplier saat barang berubah pada fase 4; retensi pencarian/pagination tetap berlaku.

## Ralat case 2 — Batas input jumlah PR dari RFQ, 2026-11-16

- [x] Batasi input langsung sesuai sisa RFQ, penawaran dan alokasi supplier lain.
- [x] Dukung desimal bertahap dan pulihkan input tidak valid.
- [x] Verifikasi kuota 1 dan split 40/10: 8 tes unit, build dan browser desktop/ponsel lulus.
- [ ] UAT perusahaan dan deployment.

Hasil: [batas input jumlah PR](../changes/2026-11-16-rfq-pr-quantity-input-limit.md).
