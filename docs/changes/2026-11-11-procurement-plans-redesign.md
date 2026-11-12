# Purchasing — Redesign daftar rencana pengadaan

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan antarmuka |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Redesign antarmuka internal |
| Plan terkait | [Redesign antarmuka](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Halaman rencana pengadaan memakai panel berlapis, badge berulang dan delapan kolom. Ringkasan status/metode menghitung baris halaman aktif sementara total memakai seluruh hasil pagination, sehingga cakupannya tidak konsisten. Antrean PR menjumlahkan kuantitas dengan satuan berbeda sebagai “Unit Terbuka”. Bilah pilihan melayang berpotensi menutup konten/footer pada ponsel.

## Tujuan dan kriteria penerimaan

- [x] Daftar rencana dan antrean PR mengikuti pola tabel PR dengan informasi utama yang lebih ringan.
- [x] Header/footer aplikasi tidak diubah.
- [x] Ringkasan status halaman aktif dihapus; jumlah hasil memakai metadata pagination.
- [x] Kuantitas ditampilkan per barang beserta satuan; nilai harga nol tetap terlihat.
- [x] Filter, pagination, konsolidasi, navigasi dan aksi status tetap berfungsi pada fixture.

## Cakupan dan rencana

1. Telusuri komponen/composable dengan codebase-memory, periksa coverage dan sumber terkait.
2. Ringkas heading, tab, toolbar dan kolom dengan komponen bersama yang sudah digunakan PR.
3. Rapikan rincian item dan bilah tindakan pilihan.
4. Jalankan build, tes kontrak procurement dan pemeriksaan browser fixture desktop/tablet/ponsel.
5. Catat hasil aktual dan tindak lanjut UAT.

## Solusi dan keputusan

- Heading langsung di atas konten; tab “PR siap direncanakan” dan “Daftar rencana” memakai penanda sederhana.
- Daftar rencana menjadi enam kolom: rencana/tanggal, PR asal, metode/alokasi, status, pembuat, dan aksi. Pencarian dan filter metode dipisahkan secara visual dari filter status.
- Antrean PR menjadi enam kolom: pilihan, pengajuan, perusahaan/divisi, target kebutuhan, barang/jasa, dan aksi. Status approved yang sama untuk seluruh antrean tidak diulang pada tiap baris.
- BaseTable, TableDocumentCell, SearchInput, StatusBadge dan Pagination dipakai kembali. Tidak menambahkan komponen umum baru yang menduplikasi pola tersebut.
- Rincian item dibuka per PR, dengan checkbox berlabel, indikator pilihan sebagian, sisa kebutuhan per satuan dan harga nol yang benar.
- Tindakan konsolidasi/RFQ/pembelian langsung berada dalam alur halaman. Tabel dapat digeser secara horizontal pada layar kecil tanpa membuat seluruh halaman melebar.
- Perubahan merupakan adaptasi presentasi aplikasi, bukan klaim UI standar ERPNext. Endpoint, payload dan aturan bisnis procurement tidak diubah.

## Implementasi

| File | Perubahan |
| --- | --- |
| src/views/purchasing/ProcurementPlanListView.vue | Heading/tab ringan dan reuse komponen tab. |
| src/components/purchasing/plan/list/ProcurementPlansTab.vue | Enam kolom, toolbar, status dan aksi ringkas. |
| src/components/purchasing/plan/list/ProcurementQueueTab.vue | Enam kolom, rincian item dengan BaseTable, bilah pilihan dalam alur halaman. |
| src/composables/purchasing/useProcurementPlanList.js | Definisi kolom/label dan hapus agregasi ringkasan yang tidak digunakan. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| npm run build | Lulus; peringatan bundle chunk >500 kB masih ada. |
| node --test tests/procurementPlan.test.js | Enam tes kontrak yang tersedia lulus; sebagian menguji contoh logika, bukan mount komponen. |
| node /tmp/erp-plan-preview.mjs | Tiga skenario viewport 1440/1024/390 px lulus menggunakan view/composable asli dan respons API fixture. |
| Browser: daftar rencana | Enam kolom, teks panjang tidak bertabrakan, tanpa overflow halaman, pencarian/kosong/reset, filter status/metode, pagination satu request, modal PR asal, navigasi detail. |
| Browser: antrean PR | Rincian item, 40 METER dan 75 PCS terpisah, Rp 0, pilihan sebagian/seluruh PR, penolakan lintas perusahaan, hapus pilihan, pencarian/reset dan navigasi create lulus. |
| Browser: aksi status | Aktifkan dan batalkan diuji pada fixture desktop; endpoint dan alasan pembatalan diperiksa. |
| git diff --check | Lulus setelah perapian whitespace. |

Screenshot fixture ditinjau pada desktop dan ponsel. Harness serta screenshot berada di /tmp/erp-plan-preview.mjs, /tmp/erp-plans-*.png, /tmp/erp-plan-queue-*.png dan /tmp/erp-plan-selection-*.png. Tidak ada transaksi nyata dikirim ke backend.

## Risiko dan tindak lanjut

- [ ] UAT dengan akun perusahaan dan data riil, termasuk konsolidasi serta pembuatan RFQ/pembelian langsung end-to-end.
- [ ] Antrean masih mengikuti batas pengambilan sebelumnya (maksimal 100 item); label hanya menyebut PR ditampilkan, bukan total antrean global. Pagination antrean merupakan pekerjaan terpisah.
- [ ] Form create dan halaman detail rencana belum termasuk redesign ini.

## Deployment dan pemulihan

Belum ada bukti deployment. Tidak ada perubahan backend/migrasi. Pemulihan dilakukan dengan mengembalikan hanya perubahan empat file halaman rencana ini, sambil mempertahankan perubahan frontend lain.
