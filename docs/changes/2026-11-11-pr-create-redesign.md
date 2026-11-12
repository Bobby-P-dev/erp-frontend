# Purchasing — Redesign form create PR

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan antarmuka |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Redesign Purchasing bertahap |
| Plan terkait | [Redesign dashboard internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Wizard sudah membagi pengajuan menjadi tiga tahap, tetapi isi setiap tahap padat. Panduan di sidebar mengulang stepper. Catatan, preview approval, spesifikasi, referensi, dan klasifikasi akun semuanya terbuka bersamaan. Input dan heading sama-sama tebal; empat input item dipaksakan dalam satu baris pada tablet.

## Tujuan dan kriteria penerimaan

- [x] Tujuan dan tanggal kebutuhan menjadi fokus tahap pertama.
- [x] Detail opsional dapat dibuka sesuai kebutuhan tanpa menghapus nilai.
- [x] Pesan error detail/akun membuka panel terkait otomatis.
- [x] Navigasi wizard, draft, kalkulasi dan mode katalog/manual dipertahankan.
- [x] Desktop/tablet/ponsel tidak melebar horizontal.
- [x] Header/footer aplikasi tetap.

## Cakupan dan rencana

Eksplorasi MCP dan coverage enam komponen/composable serta PRItemRow; inspeksi terarah; rapikan presentasi tiga langkah; browser fixture dan pemeriksaan kontrak PR; dokumentasi. Tidak mengubah API, payload bisnis, validasi wajib, ataupun aturan approval. Referensi visual Attio/Linear mengikuti plan; proses procurement tetap mengikuti aplikasi yang ada, bukan klaim UI standar ERPNext.

## Solusi dan keputusan

Stepper lebih ringan dan tetap horizontal di ponsel, dengan nama tahap tanpa deskripsi panjang. Catatan tambahan, preview/pilihan alur approval, panduan, spesifikasi/referensi serta akun akuntansi menjadi disclosure native yang mendukung keyboard. Approval otomatis tetap berlaku saat panel tertutup. Nilai catatan dan pilihan alur yang sudah terisi membuka panel awalnya.

Item memakai flag `showDetails` dan `showAccounting` yang sudah tersedia pada composable, termasuk untuk data edit. Panel tertutup tidak menghapus field atau nilai. Error mentah diteruskan ke PRItemRow supaya respons 422 pada detail/akun membuka panel dan menampilkan pesan, termasuk saat field belum disentuh. Nama, satuan, jumlah dan harga tetap langsung terlihat. Pada tablet nama item menempati baris sendiri dan satuan/jumlah/harga berada di baris berikutnya. Toolbar mata uang dan total ditempatkan di bawah judul.

Font/warna/bayangan disederhanakan melalui CSS lokal halaman. Bilah aksi mengikuti konten pada ponsel agar tidak menutup isian; desktop tetap sticky. Review memiliki nilai total lebih tenang dan susunan informasi responsif. Komponen form juga dipakai edit draft/revisi; handler dan composable tidak diubah.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/views/purchasing/PurchaseRequisitionCreateView.vue` | Tipografi lokal, lebar halaman, responsivitas bilah aksi |
| `src/components/purchasing/requisition/form/PRWizardStepper.vue` | Stepper ringan dan aria-current |
| `src/components/purchasing/requisition/form/PRHeaderSection.vue` | Catatan/approval/panduan opsional; tanggal otomatis sebagai teks |
| `src/components/purchasing/requisition/form/PRItemsTableSection.vue` | Toolbar terpisah, total netral, teruskan error ke item |
| `src/components/purchasing/requisition/form/PRItemRow.vue` | Detail dan akun expandable, pembukaan error otomatis, grid tablet |
| `src/components/purchasing/requisition/form/PRReviewSection.vue` | Total netral dan ringkasan ponsel |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; warning chunk besar masih ada |
| `node --test tests/purchaseRequisition.test.js` | 7 tes kontrak lulus |
| Chrome fixture 1440, 1024, 390 px | Ketiga skenario lulus |
| Wizard | Tujuan kosong ditolak; input valid berlanjut ke item/review; Ubah Item kembali dengan nilai tetap |
| Detail opsional | Awalnya tertutup, buka lewat keyboard, tutup dan kembali tanpa kehilangan spesifikasi |
| Item dan draft | Mode manual, tambah/hapus, total/review, dan payload draft ke API simulasi benar |
| Respons 422 simulasi | Panel referensi dan akun terbuka otomatis dengan pesan; retry draft berhasil |
| Responsif | Tidak ada overflow halaman pada ketiga tahap; screenshot desktop/mobile ditinjau |
| `git diff --check` | Lulus |

Harness sementara `/tmp/erp-pr-create-preview.mjs`; screenshot `/tmp/erp-pr-create-step{1,2,3}-{1440,1024,390}.png`. Menggunakan view, composable, dan service aktual dengan metadata/respons API simulasi. Console error Axios pada skenario 422 merupakan hasil yang sengaja dipicu; tidak ada page error tak tertangani. Tidak menyimpan data pada backend nyata. Tes kontrak yang tersedia bukan pengganti UAT.

## Risiko dan tindak lanjut

- [ ] UAT akun nyata: pilihan katalog, metadata perusahaan, kurs, approval, draft dan submit.
- [ ] UAT edit draft/revisi dengan detail/akun terisi; komponen dipakai bersama.
- [ ] Tinjau form RFQ sebagai pekerjaan terpisah.

## Deployment dan pemulihan

Belum ada bukti deployment. Pulihkan diff enam file form di atas bila diperlukan; pertahankan perubahan dashboard, Purchasing home, tabel dan modal PR.
