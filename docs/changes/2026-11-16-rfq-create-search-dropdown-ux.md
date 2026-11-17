# RFQ — Form buat tender dengan dropdown pencarian

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Penyempurnaan setelah fase 6 katalog/supplier |
| Plan terkait | [RFQ frontend](../plans/rfq-frontend-alignment.md) |
| Status rilis | Deployment dan UAT perusahaan belum diverifikasi |

## Masalah dan dampak

Hasil pencarian katalog dan supplier selalu tampil sebagai daftar panjang dalam form. Pengguna harus membaca terlalu banyak informasi sekaligus; pencarian terasa seperti input biasa, bukan pemilih barang/supplier. Spesifikasi dan ketentuan tambahan menambah kepadatan form.

## Tujuan dan kriteria penerimaan

- [x] Barang dan supplier dipilih dari dropdown pencarian, bukan daftar permanen.
- [x] Pilihan barang menutup dropdown; pilihan supplier jamak tetap terbuka sampai Selesai.
- [x] Pilihan supplier tetap terlihat, dapat dihapus dan mempertahankan status kecocokan.
- [x] Pencarian, pagination, loading, hasil kosong dan retry tetap berfungsi.
- [x] Isian tambahan dikelompokkan dalam disclosure dengan ringkasan isian.
- [x] Form tetap dapat dipakai pada desktop dan ponsel tanpa overflow horizontal.

## Cakupan dan rencana

1. Buat pemilih async reusable dengan Reka UI Popover.
2. Integrasikan katalog barang dan kandidat supplier tanpa mengubah kontrak API.
3. Kelompokkan isian tambahan dan tambahkan navigasi antarbagian.
4. Sesuaikan smoke test dengan dropdown yang dirender melalui portal, jalankan build dan tes.

## Solusi dan keputusan

Dropdown terbuka saat diklik. Pencarian, hasil, serta pagination tampil di panel sementara. Barang terpilih tampil pada pemilih; supplier yang sudah dipilih tetap terlihat pada form dan tidak hilang saat pencarian berubah. Panel supplier menyediakan jumlah pilihan dan tombol Selesai. Fokus masuk ke pencarian, panah atas/bawah memindahkan fokus pilihan dan Escape menutup panel.

Form menampilkan isian utama terlebih dahulu. Spesifikasi, estimasi, target pengiriman dan catatan barang berada dalam disclosure. Alamat, pembayaran dan catatan tender juga dikelompokkan dengan indikator isian. Navigasi di atas form membantu berpindah antarbagian. Ringkasan tetap di bawah; header/footer aplikasi dan alur bisnis tidak diubah dalam pekerjaan ini.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/ui/AsyncSearchPicker.vue` | Pemilih async reusable, single/multiple, fokus, pagination, error/retry. |
| `src/components/purchasing/rfq/form/RfqCatalogItemPicker.vue` | Dropdown katalog dengan nama/kode/satuan; pengambilan katalog saat dropdown dibuka. |
| `src/components/purchasing/rfq/form/RfqSuppliersInviteSection.vue` | Dropdown supplier jamak dan daftar pilihan yang tetap terlihat. |
| `src/components/purchasing/rfq/form/RfqInitialNeedItemsSection.vue` | Kelompok spesifikasi dan kebutuhan tambahan. |
| `src/components/purchasing/rfq/form/RfqTermsFormSection.vue` | Kelompok pengiriman, pembayaran dan catatan. |
| `src/views/purchasing/RfqCreateView.vue` | Navigasi bagian dan penyempurnaan visual kartu. |
| `tests/browser/rfqInitialNeed.smoke.mjs`, `tests/browser/rfqSupplierCandidates.smoke.mjs` | Regresi interaksi dropdown menggunakan fixture API. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | Lulus: 280 tes, 54 suite. |
| `npm run build` | Lulus; peringatan ukuran chunk besar masih muncul. |
| `node tests/browser/rfqInitialNeed.smoke.mjs` | Lulus desktop 1440px dan ponsel 390px: katalog/custom/campuran, pagination, error/retry, respons usang, payload, validasi dan sumber PP. |
| `node tests/browser/rfqSupplierCandidates.smoke.mjs` | Lulus desktop/ponsel: pencarian, pagination, deduplikasi, pilihan bertahan, refresh kecocokan, error/retry, supplier tidak aktif dan 101 pilihan. |
| Pemeriksaan screenshot browser fixture | Dropdown dan form ditinjau pada desktop/ponsel; tidak ada overflow horizontal dalam skenario tes. |
| `git diff --check` | Lulus. |

Smoke browser memakai Playwright dari runtime Codex dan Google Chrome lokal. API di-mock; tidak membuat transaksi atau mengirim undangan nyata. Respons 422 pada skenario validasi merupakan fixture yang disengaja. Pemeriksaan ini belum membuktikan integrasi pada server produksi.

## Risiko dan tindak lanjut

- [ ] UAT pada URL aplikasi dengan katalog/supplier perusahaan dan data nyata.
- [ ] Konfirmasi kenyamanan pencarian dan penempatan isian tambahan bersama pengguna purchasing.

## Deployment dan pemulihan

Belum ada deployment yang dilakukan pada pekerjaan ini. Pemulihan: kembalikan perubahan UI pada file di atas tanpa mengubah database. Tidak ada migrasi atau perubahan API.
