# RFQ — Penyempurnaan rincian penawaran barang

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Refinement perbandingan RFQ; belum ada issue/PR |
| Plan terkait | [Redesign internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Rincian penawaran tampil sebagai tautan disclosure diikuti daftar label dan nilai tanpa pembeda kelompok. Warna hijau sel terpilih memenuhi seluruh rincian. Pengguna menilai bagian ini terlalu polos dan sulit dipindai pada halaman perbandingan.

## Tujuan dan kriteria penerimaan

- [x] Interaksi buka-tutup terlihat jelas dengan ikon, chevron dan petunjuk.
- [x] Deskripsi, merek, pengiriman, harga asli dan catatan punya hierarki visual.
- [x] Warna memberi konteks selisih harga tanpa mengandalkan warna saja.
- [x] Berlaku di desktop dan ponsel melalui komponen reusable.
- [x] Keyboard, fokus terlihat dan preferensi reduced motion didukung.

## Cakupan

Komponen `RfqOfferDetails.vue` yang dipakai pada kedua susunan perbandingan. Header/footer aplikasi, alokasi award, format nilai, API dan aturan bisnis tetap mengikuti implementasi sebelumnya.

## Rencana pengerjaan

1. Periksa komponen bersama dan data selisih harga.
2. Susun disclosure berbingkai dengan kelompok informasi.
3. Verifikasi interaksi dan responsivitas memakai komponen asli dengan fixture.
4. Jalankan tes/build dan dokumentasikan hasil.

## Solusi dan keputusan

Gunakan native `details/summary` agar buka-tutup tetap dapat dioperasikan melalui keyboard. Summary memiliki ikon, keterangan tindakan, chevron berputar serta hover/focus. Panel putih membedakan rincian dari latar award hijau. Deskripsi didahulukan, merek dan waktu kirim menjadi dua kartu, harga asli menampilkan mata uang secara eksplisit, catatan dipisahkan di bawah.

Selisih harga memakai tipe yang sudah disediakan halaman: `saving` hijau, `higher` amber, lainnya biru. Teks tetap menjelaskan arti masing-masing. Nilai belum tersedia tidak dijadikan nol; pengiriman nol hari tetap ditampilkan sebagai nol. Animasi singkat dimatikan saat reduced motion aktif. Panel supplier dapat dibuka secara independen untuk perbandingan kiri ke kanan.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `src/components/purchasing/rfq/RfqOfferDetails.vue` | Disclosure interaktif, pengelompokan data dan gaya scoped. |
| `tests/browser/rfqOfferDetails.smoke.mjs` | Browser fixture halaman perbandingan dengan komponen asli. |

Migrasi, konfigurasi, dan perubahan backend tidak diperlukan.

## Verifikasi

| Pemeriksaan | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | Lulus | 233 tes frontend |
| `npm run build` | Lulus | Peringatan chunk besar tetap tersedia |
| `tests/browser/rfqOfferDetails.smoke.mjs` | Lulus | Chrome headless, 1440/1024/390 px |
| `git diff --check` | Lulus | Repo frontend |

Browser memeriksa klik, Enter/Space, panel independen, selisih hemat/mahal, data kosong, nol hari, mata uang asli, panel putih, tidak ada overflow halaman, serta reduced motion. Screenshot tiga ukuran diperiksa secara visual. Semua respons API memakai fixture; tidak ada transaksi pada data operasional.

## Hasil

Rincian penawaran lebih mudah dipindai dan memiliki respons visual yang jelas ketika dibuka, ditutup, di-hover atau difokuskan. Perbandingan horizontal desktop dan susunan vertikal ponsel dipertahankan.

## Risiko dan batasan

UAT pada RFQ 9 dengan akun/data nyata dan deployment belum diverifikasi. Pengujian tidak menyatakan seluruh perangkat pembaca layar telah diuji. Label panjang membungkus mengikuti lebar kolom.

## Deployment dan pemulihan

Deploy frontend melalui proses perusahaan. Tidak ada migrasi tambahan. Pemulihan dilakukan dengan mengembalikan perubahan komponen ini.

## Tindak lanjut

- [ ] Review pengguna pada RFQ 9 dan verifikasi deployment.
