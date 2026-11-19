# Audit Trail — Fase 4: Verifikasi Terpadu & Checklist Deploy

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-18 |
| Jenis | Verifikasi akhir Sprint Audit 1 |
| Status pekerjaan | Selesai lokal |
| Sprint | Sprint Audit 1 |
| Status rilis | Siap migrasi & UAT |

## Tujuan dan kriteria penerimaan

- [x] Seluruh unit test frontend (termasuk `tests/auditLog.test.js`) lulus tanpa regresi.
- [x] Build produksi Vite menghasilkan chunk `AuditLogListView` terpisah dan bersih.
- [x] Komponen `AuditLogDetailModal` terpisah siap dipakai ulang pada Sprint Audit 2 (tab *"Riwayat Perubahan"* di detail dokumen sisi User).

## Checklist Pasca-Deploy Lokal / Server

1. Di `/var/www/erp-backend`, jalankan migrasi index audit terbaru:
   ```bash
   php artisan migrate
   ```
2. Taburkan izin baru `audit-log.read` beserta kategori `Audit Trail` dan reset cache permission:
   ```bash
   php artisan db:seed --class=PermissionCategorySeeder
   php artisan db:seed --class=RolePermissionSeeder
   php artisan permission:cache-reset
   ```
3. Uji di browser sebagai `Super Admin` (atau user dengan role berizin `audit-log.read`): buka menu **Admin → Audit Trail**, lalu coba buat/edit/hapus draft PR dan verifikasi diff `Nilai Sebelumnya → Nilai Baru`.

## Verifikasi Terakhir

- `npm test` — `282/282` test lulus (`55` suite, `0` gagal/skip).
- `npm run build` — selesai bersih tanpa error.

## Penyesuaian Tambahan Penutup Sprint 1

- Tambahan `hasStrictPermission` pada `src/stores/auth.js` + `strictPermission: true` pada route/sidebar `admin.audit-logs` agar hanya `Super Admin` dan pengguna dengan izin eksplisit `audit-log.read` yang melihat menu Audit Trail (selaras dengan backend `ActivityLogPolicy`).
- Menambahkan mapping event `roles_synced` pada `src/services/auditLogServices.js`.
- Verifikasi terakhir: `npm test` (`282/282` lulus) & `npm run build` bersih dalam `2.69s`.
