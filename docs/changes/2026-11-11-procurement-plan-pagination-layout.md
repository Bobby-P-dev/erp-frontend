# Rencana pengadaan — Perbaikan lebar pagination

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Iterasi redesign Purchasing |
| Plan terkait | [Dashboard dan Purchasing](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Pagination di bawah daftar rencana hanya memenuhi sebagian lebar tabel. Komponen Pagination dibungkus kembali dengan flex, padding dan border, padahal komponen tersebut sudah memiliki layout footer sendiri. Akibatnya komponen menjadi flex item dengan lebar mengikuti isi, serta memiliki jarak dan garis bertumpuk.

## Tujuan dan kriteria penerimaan

- [x] Footer memenuhi lebar kartu tabel.
- [x] Ringkasan di kiri dan navigasi di kanan pada desktop; susunan bertumpuk pada ponsel.
- [x] Klik halaman tetap mengirim satu request; footer tersembunyi saat tidak ada hasil.

## Cakupan dan rencana

Hapus wrapper tambahan di daftar rencana. Gunakan layout bawaan Pagination. Verifikasi dimensi, alignment, perubahan halaman dan kondisi kosong pada tiga ukuran layar.

## Solusi dan keputusan

Pagination dirender langsung setelah BaseTable. Tidak ada perubahan komponen Pagination bersama, API, ukuran halaman atau logika pengambilan data.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/plan/list/ProcurementPlansTab.vue` | Menghapus wrapper flex/padding/border tambahan |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan chunk >500 kB masih ada |
| Chrome fixture 1440/1024/390 px | Lulus: footer sama lebar dengan kartu (toleransi border <3 px), navigasi kanan pada desktop, tanpa overflow halaman |
| Klik halaman 2 | Satu request dengan parameter page=2 pada setiap ukuran layar |
| Pencarian kosong | Pagination tidak ditampilkan |

Harness sementara `/tmp/erp-plan-pagination-preview.mjs`, log `/tmp/erp-plan-pagination-browser.log`, screenshot `/tmp/erp-plan-pagination-{1440,1024,390}.png`. Pengujian browser menggunakan API fixture, bukan transaksi/data perusahaan asli.

## Risiko dan tindak lanjut

- [ ] UAT pada daftar rencana dengan data asli.

## Deployment dan pemulihan

Belum dilakukan deployment. Tidak ada migrasi database. Pemulihan melalui build frontend sebelumnya.
