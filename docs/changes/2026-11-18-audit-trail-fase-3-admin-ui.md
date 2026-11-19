# Audit Trail — Fase 3: Menu Admin & UI Diff Viewer

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-18 |
| Jenis | Fitur baru (Audit Trail — Fase 3) |
| Status pekerjaan | Selesai lokal |
| Sprint | Sprint Audit 1 |
| Repo pendamping | Endpoint Fase 1–2 di `erp-backend` (`GET /api/v1/admin/activity-logs*`) |
| Status rilis | Teruji unit test (`npm test`) & build Vite |

## Masalah dan dampak

Admin dan auditor belum memiliki antarmuka di panel Admin untuk memantau seluruh aktivitas pembuatan, perubahan field (*old → new*), pembatalan, maupun penghapusan data (`SoftDeletes`) di sistem ERP.

## Tujuan dan kriteria penerimaan

- [x] Route `/admin/audit-logs` terdaftar dengan meta permission `audit-log.read` dan breadcrumb otomatis.
- [x] Sidebar Admin menampilkan menu **Audit Trail** bagi pengguna berizin.
- [x] Halaman `AuditLogListView` menyediakan pencarian, filter modul, tipe objek, event, pelaku, rentang tanggal, shimmer loading, dan penanganan error `403`.
- [x] Komponen reusable `AuditLogDetailModal` menampilkan metadata pelaku/waktu/objek, penanda `Dihapus (Soft Delete)`, dan tabel diff `Nilai Sebelumnya → Nilai Baru`.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/services/auditLogServices.js` | Service API (`getActivityLogs`, `getActivityLogFilters`, `getActivityLogById`) dan helper badge/formatter diff. |
| `src/components/audit/AuditLogDetailModal.vue` | Modal detail reusable untuk menampilkan perbandingan `Old -> New` tiap atribut yang berubah. |
| `src/views/admin/audit/AuditLogListView.vue` | Halaman Audit Trail Admin lengkap dengan filter lintas dimensi, pagination, status hapus, dan error state `403`. |
| `src/routers/modules/admin.routes.js`, `src/components/layout/AdminSidebar.vue`, `src/components/ui/BaseBreadcrumb.vue` | Registrasi route, menu sidebar berizin `audit-log.read`, dan breadcrumb. |
| `tests/auditLog.test.js` | Unit test service exports, query builder, badge resolver, dan value formatter. |
