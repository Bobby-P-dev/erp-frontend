# Dashboard — Penyederhanaan ruang kerja internal

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Refactor tampilan |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Redesign awal; bukan implementasi Sprint 4 RFQ |
| Plan terkait | [Dashboard redesign](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Screenshot pengguna menunjukkan sapaan dan tiga kartu seragam dengan banyak ruang dan teks penjelasan. Metadata tampil sebagai banyak chip berbingkai. Hierarki terasa datar meskipun fondasi warna sudah rapi.

## Tujuan dan kriteria penerimaan

- [x] Sapaan dan pilihan modul lebih jelas dengan metadata ringkas.
- [x] Header/footer dan stylesheet global tidak diubah.
- [x] Sumber akses modul, tujuan tautan dan badge approval dipertahankan.
- [x] Desktop/mobile tidak memiliki overflow horizontal pada fixture yang diuji.
- [x] Fokus keyboard terlihat dan preferensi reduced motion dihormati.

## Cakupan

Hanya `src/views/user/DashboardView.vue`. Tidak mengubah ModuleCard bersama, API, data, permission, header atau footer.

## Rencana pengerjaan

1. Telusuri dashboard, registry modul dan sumber badge menggunakan codebase-memory serta coverage/source terarah.
2. Refactor presentasi lokal.
3. Build, browser fixture dan inspeksi screenshot.
4. Dokumentasikan hasil dan tindak lanjut.

## Solusi dan keputusan

Sapaan memakai latar biru netral lembut dan ornamen lingkaran statis. Metadata ditampilkan inline tanpa banyak kotak. Purchasing, Finance dan Inventory dibedakan aksen biru, teal dan violet. Deskripsi dipersingkat. Seluruh kartu aktif menjadi RouterLink dengan fokus keyboard; status tidak aktif/tanpa route memakai elemen noninteraktif. Animasi hover kecil dinonaktifkan pada reduced motion. Angka operasional baru tidak ditambahkan.

Referensi visual/proses ada pada plan. Ini adaptasi presentasi aplikasi, bukan perubahan workflow ERPNext.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| [DashboardView.vue](../../src/views/user/DashboardView.vue) | Template sapaan/kartu dan CSS scoped; registry serta store tetap menjadi sumber akses dan badge. |

API, migrasi, konfigurasi dan dependency baru: tidak diperlukan.

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm run build` | Lulus | Peringatan chunk di atas 500 kB masih ada. |
| `node /tmp/erp-dashboard-preview.mjs` | Lulus | Harness sementara Vite + Chrome; viewport 1440 dan 390 px. Memeriksa tiga href modul, badge kosong/3 pending, fokus keyboard, reduced motion, overflow, klik Purchasing dan runtime error. |
| Inspeksi screenshot desktop/mobile | Selesai | `/tmp/erp-dashboard-desktop.png` dan `/tmp/erp-dashboard-mobile.png`, data sintetis; fokus kartu sengaja terlihat setelah pemeriksaan keyboard. |
| Diff scope | Lulus | Satu file Vue dan dokumentasi; header/footer tidak disentuh. |
| UAT akun nyata / deployment | Belum dijalankan | Harness menguji komponen, bukan sesi login/live API. |

Percobaan pertama harness gagal karena root menggunakan template string tanpa runtime compiler. Harness diganti render function; kedua viewport kemudian lulus. Tidak ada perubahan aplikasi untuk mengatasi masalah harness tersebut. Suite penuh frontend tidak dijalankan ulang untuk perubahan presentasi ini.

## Hasil

Dashboard lokal menampilkan sapaan dan metadata lebih ringkas, kartu modul dengan identitas berbeda, serta transisi dan fokus yang jelas. Navigasi diuji menggunakan router fixture, bukan transaksi perusahaan.

### Penyesuaian setelah review pengguna — 2026-11-11

Pengguna meminta titik dekoratif di kanan bawah kartu dihapus. Elemen `module-dot` beserta CSS-nya dihapus dari seluruh kartu dashboard. Header/footer dan navigasi tetap. `git diff --check` lulus; tidak mengulang build/browser untuk penghapusan elemen dekoratif ini. Hasil build/browser di atas berlaku untuk versi sebelum penyesuaian ini.

## Risiko dan batasan

Belum memverifikasi sesi pengguna nyata atau seluruh variasi profil/nama panjang. Screenshot hanya mencakup konten dashboard; layout aplikasi penuh tidak dirender pada harness. Hak akses tetap berasal dari registry yang sama; tidak melakukan audit otorisasi backend.

## Deployment dan pemulihan

Deploy bersama build frontend setelah review. Tidak ada migrasi. Pemulihan melalui pengembalian perubahan DashboardView atau build sebelumnya. Belum diklaim dirilis.

## Tindak lanjut

- [ ] Review halaman nyata bersama pengguna.
- [ ] Audit dan prototipe form RFQ/PR sesuai plan.
