# Purchasing — Petunjuk PR RFQ langsung ke PO

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Perbaikan UX dan integrasi antrean |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | UAT jalur RFQ awal → PR → PO |
| Plan terkait | [Penyesuaian frontend RFQ](../plans/rfq-frontend-alignment.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Antrean backend masih menampilkan PR dari RFQ yang seharusnya langsung ke PO setelah disetujui. Petunjuk detail PR belum menyatakan langkah berikutnya dengan jelas.

## Tujuan dan kriteria penerimaan

- [x] Detail PR menjelaskan bahwa setelah approval lanjut langsung ke PO.
- [x] PR approved menjelaskan lokasi aksi Buat draft PO dan tidak memerlukan PP/RFQ baru.
- [x] Backend mengecualikan item PR sumber RFQ dari antrean PP.

## Cakupan dan rencana

Telusuri antrean dan jalur PO yang sudah ada; perbaiki filter backend; perjelas teks lifecycle; jalankan regresi dan dokumentasikan.

## Solusi dan keputusan

Perubahan frontend hanya pada petunjuk `src/components/purchasing/RfqRequisitionLifecycle.vue`. Aksi PO yang sudah tersedia tetap digunakan setelah PR approved dan sesuai izin pengguna. Submit PR tetap memulai approval, bukan membuat PO otomatis.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/RfqRequisitionLifecycle.vue` | Petunjuk sebelum dan sesudah PR disetujui. |
| Backend antrean PP | [Filter alokasi sumber dan regresi API](../../../erp-backend/docs/changes/2026-11-16-rfq-pr-skip-procurement-queue.md). |

## Verifikasi dan hasil

| Skenario / perintah | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan ukuran chunk tetap ada. |
| Browser fixture `rfqRequisitionLifecycle.smoke.mjs` | Lulus desktop 1440 dan ponsel 390 px. |
| Browser fixture `requisitionPurchaseOrders.smoke.mjs` | Lulus 1440/390 px: konfirmasi, batal, retry 422, refresh dan link PO. |
| Backend PR RFQ + PP | 78 lulus, 10 konkurensi MySQL dilewati pada SQLite. |
| `git diff --check` | Lulus. |

Browser memakai fixture API. Pengujian akun/dokumen pengguna nyata belum dilakukan.

## Risiko dan tindak lanjut

- [ ] UAT PR RFQ approved: buka detail → Buat draft PO → Konfirmasi → lihat dan terbitkan PO.
- [ ] Verifikasi PR tersebut tidak muncul di antrean rencana pengadaan setelah backend diperbarui.

## Deployment dan pemulihan

Perlu rilis backend serta frontend; tidak ada migrasi. Pulihkan versi kode/bundle sebelumnya bila diperlukan. Deployment belum diverifikasi.
