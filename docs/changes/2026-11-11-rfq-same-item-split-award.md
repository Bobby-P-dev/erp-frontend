# RFQ — Pembagian satu barang ke beberapa supplier

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Perbaikan lanjutan evaluasi RFQ; belum ada issue/PR |
| Plan terkait | [Redesign purchasing](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Satu barang dengan kebutuhan 50 tidak bisa dialokasikan ke supplier A 10 dan supplier B 40 melalui form. State frontend menyimpan satu objek supplier per barang sehingga penggantian pilihan menimpa alokasi sebelumnya. Batas jumlah hanya mengurangi komitmen PO, belum menghitung baris supplier lain.

API award menerima seluruh alokasi yang belum terikat PO sebagai pengganti keputusan sebelumnya. Mengirim hanya supplier baru menghapus alokasi lama yang belum terikat PO. Backend sudah mendukung beberapa supplier untuk barang sama, mengunci transaksi, dan menolak total melebihi kebutuhan.

## Tujuan dan kriteria penerimaan

- [x] Satu barang dapat memiliki beberapa baris supplier berbeda.
- [x] Pembagian 10 + 40 dikirim dan tersimpan bersama.
- [x] Setelah alokasi 40, supplier lain maksimal 10 dari kebutuhan 50.
- [x] Seluruh alokasi tersimpan dimuat ulang; evaluasi memakai quotation item dan versi yang sesuai.
- [x] Duplikasi supplier dan jumlah gabungan berlebih diblokir; komitmen PO tetap diperhitungkan.

## Cakupan

Form evaluasi/pemilihan, perhitungan kapasitas per supplier, tes frontend/browser dan regresi API. Approval tetap mengikuti kebijakan cukup pada PR.

## Rencana pengerjaan

1. Periksa state form dan kontrak penyimpanan API.
2. Ubah state menjadi beberapa alokasi per barang.
3. Batasi jumlah berdasarkan alokasi lain dan PO.
4. Verifikasi penyimpanan, muat ulang, evaluasi, dan pembuatan PO.
5. Dokumentasikan bukti serta batasan pengujian.

## Solusi dan keputusan

Frontend memuat semua award tersimpan yang belum terikat PO, menyediakan tambah/hapus supplier dan mengirim semua alokasi aktif bersama. Kapasitas setiap baris adalah minimum jumlah ditawarkan dan target dikurangi PO serta alokasi supplier lain, dengan empat desimal. Input yang melampaui batas dikembalikan ke maksimum; validasi sebelum simpan tetap memblokir state berlebih.

Evaluasi dan preview memiliki identitas barang + quotation. Evaluasi tersimpan dipulihkan dari keputusan terbaru untuk quotation item dan versi yang cocok. Alokasi kedaluwarsa tetap terlihat dan memblokir penyimpanan sampai dikoreksi, agar tidak hilang diam-diam. Alokasi yang sudah terikat PO tetap terkunci.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `src/views/purchasing/RfqComparisonView.vue` | State array, tambah/hapus supplier, validasi, muat ulang, evaluasi dan preview per alokasi. |
| `src/utils/rfqComparison.js` | Kapasitas empat desimal per baris. |
| `tests/rfqComparison.test.js` | Regresi 10 + 40, 40 + 11, buka ulang, penambahan alokasi, duplikat dan PO. |
| `tests/browser/rfqSplitAward.smoke.mjs` | Interaksi komponen Vue asli dengan fixture API. |

Kontrak API tidak berubah. Migrasi dan konfigurasi baru tidak diperlukan.

## Verifikasi

| Pemeriksaan | Hasil | Catatan |
| --- | --- | --- |
| `npm test` (frontend) | Lulus | 233 tes, termasuk 29 tes perbandingan dan award |
| `npm run build` (frontend) | Lulus | Peringatan ukuran chunk tersedia; build berhasil |
| `tests/browser/rfqSplitAward.smoke.mjs` | Lulus | Chrome headless, fixture API; 1440, 1024, 390 px |
| `php artisan test --compact tests/Feature/Purchasing/PurchaseOrderWorkflowTest.php tests/Feature/Purchasing/RfqWorkflowTest.php` | Lulus | SQLite `:memory:`; 86 lulus, 3 dilewati, 1387 assertions |
| Tes API pembagian satu barang | Lulus | 10 + 40 tersimpan/muncul di matrix; 40 + 11 ditolak atomik; 40 + 10 membuat dua PO |
| Pemeriksaan diff | Lulus | `git diff --check` kedua repo |

Browser menguji input aktual: alokasi 40 membatasi supplier kedua menjadi 10, supplier duplikat dinonaktifkan, dua alasan evaluasi, preview 10 + 40, payload kedua supplier, serta buka ulang jumlah dan evaluasi. Pengujian menggunakan fixture, bukan transaksi pada data operasional.

## Hasil

Kebutuhan 50 dapat dibagi supplier A 10 dan supplier B 40. Alokasi lama 40 tetap dikirim saat menambahkan supplier kedua dengan sisa 10. Membuka ulang keputusan mempertahankan setiap alokasi beserta evaluasi yang sesuai versi.

## Risiko dan batasan

UAT akun pengguna dan deployment belum diverifikasi. Backend suite terkait memiliki tiga tes dilewati; tidak dinyatakan lulus untuk tes tersebut. Award historis tanpa catatan evaluasi yang cocok tetap meminta alasan baru. API tetap mengganti keseluruhan alokasi belum terikat PO; konsumen lain wajib mengikuti kontrak tersebut.

## Deployment dan pemulihan

Deploy frontend hasil build sesuai proses perusahaan; tidak ada migrasi tambahan. Pemulihan melalui pengembalian perubahan frontend ini. Tidak mengubah data produksi melalui pengujian.

## Tindak lanjut

- [ ] UAT kasus pengguna pada tender aktual dan verifikasi deployment.
