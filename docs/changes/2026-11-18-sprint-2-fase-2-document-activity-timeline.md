# Audit Trail Sprint 2 — Fase 2: Komponen Scoped Timeline Purchasing

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-18 |
| Jenis | Fitur baru (Sprint 2 — Fase 2, Fokus Purchasing) |
| Status pekerjaan | Selesai lokal |
| Sprint | Sprint Audit 2 |
| Repo pendamping | Endpoint scoped `/activity` dari Fase 1 di `erp-backend` |
| Status rilis | Teruji unit test (`npm test`) & build Vite |

## Masalah dan dampak

Setelah API scoped `/activity` per dokumen Purchasing siap di backend, frontend memerlukan fungsi service pemanggil dan komponen timeline reusable yang lazy-load serta langsung menampilkan diff `Sebelum → Sesudah` secara inline tanpa modal bertumpuk.

## Tujuan dan kriteria penerimaan

- [x] Service `getDocumentActivityHistory` mendukung semua 5 tipe dokumen Purchasing (`purchase_requisition`, `purchase_order`, `direct_purchase`, `rfq`, `procurement_plan`).
- [x] Komponen `DocumentActivityTimeline.vue` mendukung mode lazy-load (`active` prop) agar tidak membebani initial render modal/halaman detail.
- [x] Mendukung filter event (`created`, `updated`, `deleted`), pagination (`Muat lebih banyak`), shimmer loading, empty/error state, serta expand inline diff `Sebelum → Sesudah`.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/services/auditLogServices.js` | Tambah `PURCHASING_ACTIVITY_ENDPOINTS` & `getDocumentActivityHistory(documentType, documentId, params)`. |
| `src/components/purchasing/DocumentActivityTimeline.vue` | Komponen timeline kronologis + inline field diff reusable untuk sisi User Purchasing. |
| `tests/auditLog.test.js` | Uji pemetaan 5 endpoint scoped Purchasing dan validasi tipe dokumen tidak dikenal. |
