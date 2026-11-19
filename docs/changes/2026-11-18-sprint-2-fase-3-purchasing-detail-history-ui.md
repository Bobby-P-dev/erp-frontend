# Audit Trail Sprint 2 — Fase 3: Integrasi Riwayat Perubahan di Detail Purchasing

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-18 |
| Jenis | Fitur baru (Sprint 2 — Fase 3, Fokus Purchasing) |
| Status pekerjaan | Selesai lokal |
| Sprint | Sprint Audit 2 |
| Status rilis | Teruji unit test (`npm test`) & build Vite |

## Masalah dan dampak

Pengguna operasional Purchasing perlu melihat riwayat perubahan field dokumen dan item langsung di halaman/modal detail dokumen yang sedang mereka kelola tanpa berpindah ke menu Admin.

## Tujuan dan kriteria penerimaan

- [x] `DocumentActivityTimeline.vue` terpasang di 5 detail dokumen Purchasing: PR, PO, Direct Purchase, RFQ, dan Procurement Plan.
- [x] Seluruh integrasi menggunakan mode lazy-load (`active` / `@toggle`) agar tidak menambah beban HTTP request saat membuka daftar atau tab awal.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/PurchaseRequisitionDetailModal.vue` | Tambah section lipat **Riwayat Perubahan Data** (`document-type="purchase_requisition"`). |
| `src/components/purchasing/order/PurchaseOrderDetail.vue` | Tambah timeline perubahan di tab **Dokumen & proses** (`document-type="purchase_order"`). |
| `src/components/purchasing/direct/detail/DirectPurchaseDetail.vue` | Perbarui tab `Riwayat & Persetujuan` dengan timeline Direct Purchase + tracker PR terkait. |
| `src/views/purchasing/RfqDetailView.vue` | Tambah `ReviewDisclosure` lazy **Riwayat perubahan data** (`document-type="rfq"`). |
| `src/components/purchasing/plan/ProcurementPlanDetail.vue` | Tambah `ReviewDisclosure` lazy **Riwayat perubahan data** (`document-type="procurement_plan"`). |
