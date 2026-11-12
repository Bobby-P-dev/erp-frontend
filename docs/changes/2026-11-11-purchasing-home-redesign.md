# Purchasing — Redesign halaman awal

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Refactor presentasi |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Redesign frontend; Sprint 4 RFQ belum dimulai |
| Plan terkait | [Redesign dashboard dan halaman modul](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Screenshot pengguna dan sumber PurchasingHomeView menunjukkan hero berilustrasi besar, empat kartu SOP statis sebelum menu, deskripsi panjang, dan kartu berulang. Menu operasional terdorong ke bawah. Ditemukan fallback literal `16 Rencana` dan `13 Transaksi` yang dapat tampil tanpa data API.

## Tujuan dan kriteria penerimaan

- [x] Header dan footer tetap.
- [x] Menu diutamakan; panduan alur tetap tersedia tetapi tertutup saat awal.
- [x] Hierarki, warna dan interaksi konsisten dengan redesign dashboard.
- [x] Tidak ada titik dekoratif pada kartu.
- [x] Route dan kondisi akses menu dipertahankan.
- [x] Fallback literal jumlah rencana/transaksi dihapus.
- [x] Desktop/mobile, toggle keyboard, navigasi dan reduced motion diperiksa.

## Cakupan

Hanya halaman awal Purchasing dan dokumentasi. Tidak mengubah form PR/RFQ, API, store, service bersama, layout global, header/footer, migrasi atau dependency.

## Rencana pengerjaan

1. Telusuri komponen, permission dan API count melalui graph serta source terarah.
2. Kelompokkan menu dan ringkas presentasi.
3. Build dan periksa browser dengan fixture.
4. Dokumentasikan hasil dan batasan.

## Solusi dan keputusan

- Hero ringan tanpa ilustrasi gudang; tombol Buat PR tetap menonjol.
- Dua kelompok: Kebutuhan & perencanaan serta Sourcing & pemesanan.
- Enam menu dirender dari metadata lokal; kartu aktif seluruhnya menjadi RouterLink, kartu terbatas noninteraktif dengan keterangan akses. Kondisi akses sebelumnya tetap: PR/approval tersedia; plan/direct membutuhkan `purchasing.view`; RFQ/PO membutuhkan `purchasing.view` atau `rfq.read`.
- Teks ringkas, aksen lembut, focus-visible dan dukungan reduced motion; CSS scoped.
- Panduan dipindahkan ke bawah menggunakan `details/summary` native, tertutup secara default. Panduan disebut gambaran umum, tidak diklaim SOP perusahaan yang telah disahkan atau workflow wajib untuk setiap transaksi.
- Jumlah memakai sumber service yang sudah ada. Lima count yang gagal tersedia sebagai “Jumlah belum tersedia”; tidak mengganti kegagalan dengan literal rencana/transaksi.

Referensi: [ERPNext Buying](https://docs.frappe.io/erpnext/buying) untuk hubungan proses procurement; [Attio](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views) dan [Linear](https://linear.app/features) sebagai inspirasi hierarki. Desain adalah adaptasi aplikasi, bukan replika atau standar UI ERPNext.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| [PurchasingHomeView.vue](../../src/views/purchasing/PurchasingHomeView.vue) | Metadata menu, template ringkas, panduan opsional, CSS scoped; pemanggilan count sebelumnya dipertahankan. |

API, migrasi, konfigurasi dan dependency baru: tidak diperlukan.

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm run build` | Lulus | Output `/tmp/erp-purchasing-build.log`; peringatan chunk >500 kB masih ada. |
| `node /tmp/erp-purchasing-preview.mjs` | 4 skenario lulus | Buyer 1440px, employee 390px, RFQ-only 1024px, buyer 390px dengan respons API 500. |
| Browser fixture | Lulus | Jumlah kartu link/restricted sesuai permission, enam respons API fixture, badge, panduan tertutup awal dan toggle Enter, tidak ada overflow horizontal, reduced motion, navigasi PR, tidak ada pageerror. |
| Inspeksi screenshot desktop/mobile | Selesai | `/tmp/erp-purchasing-buyer-1440-success.png`, `/tmp/erp-purchasing-employee-390-success.png`; data sintetis. |
| `git diff --check` | Lulus | Header/footer tidak masuk diff. |
| Akun nyata, full layout, API perusahaan / deployment | Belum dijalankan | Browser menggunakan komponen asli dengan router/store/data fixture. |

Percobaan pertama skenario API gagal menemukan bahwa service approval yang sudah ada mengembalikan `{count:0}` pada HTTP 500. Ekspektasi harness disesuaikan dengan perilaku service tersebut; tidak mengubah service bersama pada redesign ini. Setelah itu keempat skenario lulus. Tidak menambah tes permanen yang mencerminkan markup presentasi dan tidak mengulang suite penuh.

## Hasil

Menu operasional lebih cepat dicapai karena panel SOP besar tidak lagi tampil di atasnya. Panduan dapat dibuka tanpa pindah halaman. Permission menu dan sumber count tetap memakai kontrak sebelumnya. Bukti lokal tidak menggantikan review akun perusahaan.

## Risiko dan batasan

- Service `getPendingApprovalCount` sebelumnya dapat mengembalikan nol saat gagal atau mock pada 401/404. Desain ini mempertahankan service tersebut; count approval belum menjamin keberhasilan API. Audit fallback service menjadi tindak lanjut tersendiri.
- Belum melakukan audit otorisasi backend atau UAT seluruh profil pengguna.
- CSS hanya lokal dan tidak mempengaruhi desain header/footer.

## Deployment dan pemulihan

Deploy build frontend setelah review. Tidak ada migrasi. Untuk pemulihan kembalikan perubahan PurchasingHomeView atau gunakan build frontend sebelumnya. Belum diklaim dirilis.

## Tindak lanjut

- [ ] Review halaman `/purchasing` dengan pengguna dan data nyata.
- [ ] Audit fallback count approval secara terpisah.
- [ ] Audit form PR/RFQ untuk desain bertahap dan pengurangan kepadatan field.
