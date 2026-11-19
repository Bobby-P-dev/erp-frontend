# Inventory - Menu Warehouses & Locations

## Masalah

Pengelola gudang memerlukan halaman admin untuk membuat gudang, mengelola lokasi, dan memilih lokasi penerimaan default per perusahaan.

## Rencana dan solusi

Tambahkan menu Warehouses & Locations di panel admin dengan route `/admin/master/warehouses`. Kelompokkan daftar gudang, lokasi dari gudang terpilih, dan pengaturan tujuan default. Form tambah dan ubah memakai dialog yang sama. Pilihan lokasi penerimaan dimuat ulang saat gudang tujuan diganti.

Menu dan route memerlukan `warehouse-master.read` atau `warehouse-master.manage` serta akses panel admin. Aksi perubahan memerlukan permission kelola. Browser ponsel memakai lebar penuh pada halaman ini supaya form dan daftar terbaca.

## Hasil dan verifikasi

- Build dan 282 tes frontend lulus.
- Chromium desktop lulus membuat dua gudang, menambah lokasi, menyimpan default, dan memeriksa pilihan setelah reload.
- Chromium ponsel lulus menampilkan tujuan dan menyembunyikan aksi tulis untuk akun baca.
- Laravel dengan SQLite terisolasi menolak lokasi dari gudang lain dan akses lintas perusahaan saat uji browser. Akun tanpa permission Inventory dialihkan ke dashboard admin.

## Tindak lanjut

UAT perusahaan dan verifikasi rilis masih terbuka. Sprint 2 menunggu checkpoint pengguna.
