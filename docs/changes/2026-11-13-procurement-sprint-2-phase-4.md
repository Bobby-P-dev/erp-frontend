# Procurement — Sprint 2 fase 4: revisi dan pembatalan PR dari penawaran

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-13 |
| Jenis | Fitur / hasil sprint |
| Status pekerjaan | Selesai implementasi dan pengujian lokal |
| Sprint / issue / PR | Sprint 2 inisiatif dua jalur, fase 4 |
| Plan terkait | [Frontend](../plans/rfq-frontend-alignment.md), [Sprint 2 backend](../../../erp-backend/docs/plans/procurement-two-entry-sprint-2.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Draft PR dari penawaran belum dapat dilanjutkan ke persetujuan melalui UI. Form PR biasa berisiko mengganti item dan harga tanpa menjaga alokasi sumber. Pengguna juga memerlukan pembatalan beralasan agar saldo RFQ tidak terus tertahan.

## Tujuan dan kriteria penerimaan

- [x] Aksi ajukan/ajukan ulang mengikuti izin backend pada daftar dan detail PR.
- [x] Revisi melalui detail: keperluan, tanggal, catatan, jumlah dan baris yang diajukan.
- [x] Simpan revisi → periksa total terbaru → ajukan persetujuan sebagai tindakan terpisah.
- [x] Pembatalan meminta alasan dan memperbarui status/aksi setelah berhasil.
- [x] Error API tetap mempertahankan input, tombol sibuk mencegah kiriman ganda, dan pilihan kosong tidak dapat disimpan.
- [x] Tampilan full width, ringkasan biaya di bawah, tombol primer/netral/destruktif konsisten.

## Cakupan

Detail/daftar PR dan petunjuk hasil konversi/comparison RFQ. Header/footer aplikasi tetap. Tidak mengubah alur finance atau menyediakan pembuatan PO fase 5.

## Rencana pengerjaan

1. Verifikasi kontrak update/submit/cancel dan metadata sumber backend.
2. Buat komponen reusable pada modal detail PR; cegah penggunaan form edit biasa untuk PR sumber penawaran.
3. Uji desktop/ponsel, error API, pembaruan total dan pembatalan.
4. Jalankan regresi dan dokumentasikan hasil kedua repository.

## Solusi dan keputusan

Komponen `RfqRequisitionLifecycle.vue` menyediakan mode ubah pengajuan dan konfirmasi pembatalan dalam detail yang sama. Checkbox menentukan baris aktif; baris yang dikeluarkan tetap tersimpan sebagai histori dan dapat dipilih kembali. Harga dihitung backend, termasuk tier, pajak dan ongkir. UI menjelaskan bahwa perubahan supplier/barang memerlukan pembatalan dan PR baru.

Tombol ajukan disembunyikan selama form revisi/pembatalan terbuka agar pengguna tidak mengirim data lama. Setelah simpan, detail dan daftar diperbarui dari resource backend. Form edit PR generik mengarahkan pemohon ke detail PR untuk menjaga snapshot/alokasi.

Panel memakai aksen biru lembut, ringkasan biaya jelas, error dekat form dan tombol berlabel. Status cancelled/rejected menjelaskan reservasi sudah dilepas. UI tidak menambahkan approval PO; approval internal tetap pada PR. Referensi alur berasal dari [kontrak backend](../../../erp-backend/docs/plans/procurement-two-entry-sprint-2-phase-1.md) dan desain mengikuti [pedoman internal](../guides/design-principles.md).

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `src/components/purchasing/RfqRequisitionLifecycle.vue` | Editor jumlah/pilihan, validasi API, total dan pembatalan. |
| `PurchaseRequisitionDetailModal.vue`, `PurchaseRequisitionListView.vue` | Integrasi komponen/izin, pembaruan data dan aksi ajukan. |
| `src/services/purchaseRequisitionServices.js` | `cancelPurchaseRequisition`, memakai endpoint cancel beralasan. |
| `src/composables/purchasing/usePurchaseRequisitionForm.js` | Guard form edit generik untuk sumber quotation. |
| `RfqRequisitionForm.vue`, `RfqSourceNotice.vue` | Petunjuk periksa/ajukan dari daftar PR. |
| `tests/browser/rfqRequisitionLifecycle.smoke.mjs` | Browser fixture desktop/ponsel untuk revisi dan cancel. |
| `tests/browser/rfqTwoSources.integration.mjs` | Harapan submit fase 4 dan verifikasi revisi/cancel API nyata. |

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | Lulus | 269 tes. |
| `npm run build` | Lulus | Peringatan ukuran chunk existing. |
| `tests/browser/rfqRequisitionLifecycle.smoke.mjs` | Lulus | 1440/390 px: ubah jumlah, keluarkan baris, 422 tanpa kehilangan input, simpan total hasil server, pilihan kosong, alasan cancel dan status akhir. Tidak ada overflow/error JS. |
| `tests/browser/rfqTwoSources.integration.mjs` | Lulus | UI/API Laravel nyata dalam SQLite disposable: draft dari UI, revisi/cancel via API, hitung ulang 116.550 → 61.050 dan saldo kembali 20,5. Jalur PP → award → PO tetap lulus. Warning route kosong dari harness, tanpa error JS. |
| Backend purchasing + approval + unit | Lulus | 440 lulus, 6 dilewati; 4.106 assertion. |
| `git diff --check` | Lulus | Kedua repository. |

Browser dijalankan dengan `PLAYWRIGHT_MODULE_PATH` menunjuk package runtime Codex dan `CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome`. Screenshot fixture 1440/390 px tersedia di `/tmp/rfq-pr-phase4-1440.png` dan `/tmp/rfq-pr-phase4-390.png`; tampilan ponsel diperiksa visual.

## Hasil

Pemohon dapat mengubah draft/PR yang diminta revisi langsung pada detail, memeriksa total server, lalu mengajukan PR. Pembatalan menutup aksi edit/submit dan melepas saldo. [Aturan backend lengkap](../../../erp-backend/docs/changes/2026-11-13-procurement-sprint-2-phase-4.md).

## Risiko dan batasan

Browser lifecycle menggunakan API fixture; aturan approval, akses dan saldo diverifikasi terpisah melalui feature test backend. Belum UAT pengguna perusahaan/deployment produksi. Pembuatan PO setelah approval tetap fase 5.

## Deployment dan pemulihan

Rilis bersama backend fase 4 dan migration histori lifecycle. Migration MySQL lokal sudah diterapkan pada batch 56; belum bukti rilis produksi. Rollback frontend tidak menghapus histori/reservasi backend.

## Tindak lanjut

- [ ] Fase 5: pembuatan PO dari PR approved pada jalur kebutuhan awal.
- [ ] Fase 6: UAT perusahaan, konkurensi MySQL dan rilis.
