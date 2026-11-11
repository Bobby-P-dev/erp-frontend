# RFQ — Tampilan timestamp WIB

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-10 |
| Jenis | Perbaikan |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Tindak lanjut Sprint 2 |
| Plan terkait | [Penyesuaian frontend RFQ](../plans/rfq-frontend-alignment.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Timestamp Laravel tersimpan UTC sehingga 04:44 di database adalah 11:44 WIB. Riwayat perpanjangan menampilkan UTC mentah dan undangan hanya menampilkan tanggal.

## Tujuan dan kriteria penerimaan

- [x] Waktu pembuatan RFQ, riwayat perpanjangan dan undangan menggunakan Asia/Jakarta dengan label WIB.
- [x] Konversi konsisten walau perangkat menggunakan timezone lain.
- [x] Timestamp historis dan tanggal bisnis tanpa jam tidak diubah.

## Cakupan

Halaman detail RFQ dan formatter khusus timestamp RFQ.

## Rencana pengerjaan

1. Verifikasi konfigurasi runtime backend dan format API.
2. Terapkan formatter dengan timezone eksplisit.
3. Jalankan tes konversi, suite frontend dan build.
4. Catat hasil dan tindak lanjut UAT.

## Solusi dan keputusan

Pertahankan UTC di penyimpanan dan konversi saat ditampilkan. Audit deadline dari query builder berupa SQL UTC tanpa offset, sehingga dinormalisasi ke UTC sebelum diformat. Timestamp ISO dari API mempertahankan offset aslinya.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `src/utils/rfqTimestamp.js` | Formatter WIB, normalisasi SQL UTC dan placeholder nilai tidak valid. |
| `src/components/purchasing/rfq/detail/RfqMetadataCards.vue` | Waktu pembuatan. |
| `src/components/purchasing/rfq/detail/RfqItemsSuppliersTabs.vue` | Jam undangan dan percobaan pengiriman. |
| `src/views/purchasing/RfqDetailView.vue` | Jam riwayat perpanjangan. |
| `tests/rfqTimestamp.test.js` | Konversi, pergantian hari dan placeholder. |

Tidak diperlukan perubahan API, migrasi atau konfigurasi backend.

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `TZ=America/Los_Angeles node --test tests/rfqTimestamp.test.js` | Lulus | 3 tes termasuk SQL UTC dan offset ISO yang setara. |
| `npm test` | Lulus | 202 tes. |
| `npm run build` | Lulus | Peringatan ukuran chunk >500 kB. |
| Browser/staging | Belum dijalankan | UAT lanjutan. |

## Hasil

04:44 UTC ditampilkan 11:44 WIB. Pergantian tanggal mengikuti WIB. Tes lokal lulus; belum ada bukti deployment.

## Risiko dan batasan

SQL langsung tetap menunjukkan timestamp UTC. Formatter SQL tanpa offset khusus kontrak RFQ saat ini; jangan gunakan untuk tanggal bisnis tanpa jam.

## Deployment dan pemulihan

Deploy build frontend; tanpa migrasi. Pulihkan dengan mengembalikan perubahan frontend ini bila diperlukan.

## Tindak lanjut

- [ ] UAT browser/staging untuk waktu pembuatan, riwayat deadline dan undangan.

Analisis lengkap: [catatan backend](../../../erp-backend/docs/changes/2026-11-10-rfq-timestamp-wib.md).
