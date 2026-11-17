# RFQ — Tahap 4: preview harga alokasi dan rincian PO

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Fitur / integrasi |
| Status pekerjaan | Selesai integrasi lokal; input v1 masih pratinjau |
| Sprint / issue / PR | Tidak menetapkan nomor sprint baru |
| Plan terkait | [Plan bersama backend](../../../erp-backend/docs/plans/rfq-quantity-pricing.md) |
| Status rilis | Belum diverifikasi di produksi |

## Masalah dan dampak

Perkalian harga ringkasan quotation dengan alokasi split tidak menjamin tier atau total borongan yang benar. Pengguna perlu melihat harga pada jumlah pilihan dan mengetahui alasan alokasi yang tidak memenuhi syarat.

## Tujuan dan kriteria penerimaan

- [x] Preview backend menjadi sumber subtotal alokasi v1.
- [x] Award diblokir saat preview belum sah, loading atau gagal.
- [x] Respons lama tidak menimpa harga setelah pengguna mengganti jumlah.
- [x] Ringkasan award memakai subtotal tersimpan, dan detail PO menjelaskan harga yang disepakati.

## Cakupan dan rencana

Integrasikan API preview, tampilkan ketentuan harga dan rincian biaya, verifikasi tes frontend/backend serta build. Header/footer aplikasi dan kebijakan approval tetap mengikuti implementasi yang ada.

## Solusi dan keputusan

Pilihan alokasi dikirim per quotation dengan expected review version. Perubahan jumlah mengosongkan preview sebelumnya; sequence request mengabaikan balasan terlambat. Untuk v1, tidak ada fallback ke perkalian rate ringkasan saat preview gagal. Mode harga, minimum tier, alasan tidak eligible, pajak, ongkir penuh per PO dan total rencana PO dijelaskan pada dialog award.

Detail PO menggunakan snapshot dan menampilkan penyesuaian pembulatan jika ada. Form manual/portal masih mempertahankan gate submit tahap 3; aktivasi transaksi v1 dan UAT masuk tahap 5. Fixture backend membuat item v1 secara internal, bukan melalui submit form pengguna.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/views/purchasing/RfqComparisonView.vue` | Preview alokasi, guard simpan, subtotal server, ringkasan biaya |
| `src/components/purchasing/rfq/RfqPriceComparison.vue` | Mode harga dan jumlah acuan perbandingan |
| `src/utils/rfqComparison.js` | Label mode dan alasan jumlah tidak memenuhi syarat |
| `src/components/purchasing/order/PurchaseOrderItemDetails.vue` | Snapshot harga, tier, versi dan penyesuaian pembulatan |
| `src/views/portal/supplier/SupplierPurchaseOrderDetailView.vue` | Gunakan ulang rincian harga PO untuk supplier |
| `tests/rfqComparison.test.js` | Preview async, error, eligibility, respons terlambat dan subtotal tersimpan |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 244 lulus, 0 gagal |
| `npm run build` | Lulus; peringatan chunk >500 kB |
| `git diff --check` | Lulus |
| Regresi backend RFQ/quotation/PO/portal | 133 lulus, 3 tes konkurensi MySQL dilewati |
| Browser/UAT baru | Belum dijalankan pada tahap ini |

[Bukti dan batasan integrasi backend](../../../erp-backend/docs/changes/2026-11-12-rfq-quantity-pricing-stage-4.md): total 100 untuk 3 tetap 100 sampai PO; split tier 40 + 60 menghasilkan 4.700.000.

## Risiko dan tindak lanjut

- [ ] Tahap 5: aktifkan serializer dan submit transaksi v1 bersama validasi backend; uji revisi end-to-end.
- [ ] Browser/UAT desktop/ponsel dan tes konkurensi MySQL.
- [ ] Verifikasi deployment sebelum menyatakan dirilis.

## Deployment dan pemulihan

Frontend membutuhkan response pricing dan migrasi snapshot backend tahap 4. Migrasi database lokal berstatus Ran, produksi belum diverifikasi. Gate submit v1 tetap aktif; data legacy tetap dilayani. Simpan snapshot PO yang telah terbit saat memulihkan versi aplikasi.
