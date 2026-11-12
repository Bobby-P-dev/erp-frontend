# UI Global — Redesign dialog konfirmasi dan feedback

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Redesign antarmuka internal |
| Plan terkait | [Redesign dashboard](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Dialog konfirmasi memiliki ikon besar, footer dengan latar dan margin bawaan, serta hierarki visual yang berat. Karena dipasang secara global di App.vue, tampilan tersebut muncul pada berbagai modul.

## Tujuan dan kriteria penerimaan

- [x] Dialog bersama lebih ringan, konsisten, dan responsif.
- [x] Teks, hasil Promise, validasi dan fungsi tombol dipertahankan.
- [x] Konfirmasi, danger, prompt, sukses, gagal, informasi dan loading diperiksa melalui browser fixture.

## Cakupan dan rencana

Telusuri komponen melalui codebase-memory, periksa sumber dan coverage, ubah presentasi komponen bersama, lalu build dan uji browser. Tidak mengubah API atau alur procurement. Penelusuran literal menemukan SweetAlert2 hanya di wrapper utils/swal.js; SwalModern tetap tersedia tetapi tidak ditemukan pemakaian lain dalam pencarian sumber saat pekerjaan ini.

## Solusi dan keputusan

Panel dibatasi 500 px, ikon 40 px dengan warna lembut, judul lebih ringan, tombol sekunder netral, aksi destruktif merah. Footer menggunakan latar putih menyatu dengan panel. Di ponsel tombol ditumpuk dengan aksi utama di atas. Konten tinggi dapat digulir. Selector global dibatasi kelas feedback untuk menjangkau komponen yang dirender melalui Teleport. Header/footer aplikasi tetap.

## Implementasi

| File | Perubahan |
| --- | --- |
| src/components/ui/GlobalAlertDialog.vue | Tata letak global, ikon dinamis, CSS terisolasi, label textarea dan asosiasi pesan error; loading memakai komponen title/description yang aksesibel. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| npm run build | Lulus; peringatan chunk besar masih ada. |
| node /tmp/erp-feedback-preview.mjs | Fixture komponen Chrome pada 1440/1024/390 px lulus. |
| Konfirmasi / batal / danger | Hasil Promise true/false sesuai pilihan. |
| Prompt | Input kosong ditolak; alasan valid dapat dikirim dengan Ctrl+Enter. |
| Success / error / info | Satu tombol penutup, dialog dapat ditutup. |
| Loading | Tanpa tombol, Escape tidak menutup; dapat ditutup programatis. |
| Keyboard / layout | Fokus tetap di dialog saat Tab; Escape membatalkan konfirmasi; tidak ada overflow horizontal atau error runtime fixture. |

Harness sementara hanya merender komponen bersama dengan state simulasi. Screenshot lokal: /tmp/erp-feedback-1440.png dan /tmp/erp-feedback-390.png. Bukan bukti transaksi backend atau UAT seluruh modul.

## Risiko dan tindak lanjut

- [ ] UAT dengan akun nyata pada PR, RFQ, PO dan modul lain yang memakai dialog global.
- [ ] Dialog khusus per halaman dan toast Sonner belum menjadi cakupan redesign ini.

## Deployment dan pemulihan

Deployment belum diverifikasi. Untuk pemulihan, kembalikan diff komponen GlobalAlertDialog.vue khusus perubahan ini, lalu build ulang frontend.
