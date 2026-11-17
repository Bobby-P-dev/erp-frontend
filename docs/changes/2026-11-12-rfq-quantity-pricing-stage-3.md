# RFQ — Tahap 3 editor harga manual dan portal supplier

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Fitur / refactor UI |
| Status pekerjaan | Selesai implementasi dan pemeriksaan lokal tahap 3 |
| Sprint / issue / PR | Mengikuti plan quantity pricing |
| Plan terkait | [Plan backend](../../../erp-backend/docs/plans/rfq-quantity-pricing.md) |
| Status rilis | Belum diverifikasi; v1 masih preview-only |

## Masalah dan dampak

Tabel manual/portal memadatkan quantity, merk, harga satuan dan waktu kirim pada satu baris. Input total, harga bertingkat dan syarat borongan belum tersedia; subtotal frontend memakai perkalian rate ringkasan. Harga kosong pada portal sebelumnya diawali nol dan validasi tidak konsisten terhadap gratis.

## Tujuan dan kriteria penerimaan

- [x] Editor reusable, kartu full width per barang dengan label dan grouping yang mudah dibaca.
- [x] Harga unit/total dengan quantity acuan, tier minimum, fixed quantity dan simulasi pembelian.
- [x] Preview backend dengan decimal string, loading, error, alasan eligibility dan penolakan respons usang.
- [x] Revisi mempertahankan input asli, tier dan expected_review_version; mode baru tidak tersimpan sebagai legacy.
- [x] Harga nol eksplisit sah; harga kosong ditolak sebelum submit legacy.
- [x] Tes frontend, build dan browser desktop/ponsel.

## Cakupan dan rencana

Telusuri manual/portal/revisi, buat editor bersama, integrasikan preview dan payload, uji interaksi serta dokumentasikan. Approval tetap PR; header/footer aplikasi dipertahankan. Integrasi evaluasi dan PO serta aktivasi transaksi ada di tahap 4.

## Solusi dan keputusan

Harga satuan legacy tetap jalur operasional. Flat, tiered dan fixed quantity memiliki label pratinjau dan penjelasan bisnis. Input total tidak otomatis berarti borongan; flat total menyimpan numerator dan quantity acuan, sedangkan tier total memakai minimum tingkat sebagai acuan. Decimal tetap string; tidak membulatkan input supplier menjadi rate tampilan.

Preview tidak dipercaya sebagai transaksi. Backend calculator menjadi sumber nilai per barang. Debounce 500 ms dan sequence guard menghindari penawaran dari request lama muncul pada quantity baru. Sumber harga lain dihilangkan saat membuat payload agar tidak ambigu. Saat v1 dipilih, tombol dan handler submit memblokir penyimpanan; ringkasan biaya legacy disembunyikan dan penjelasan ditampilkan.

Harga awal manual tidak lagi diisi otomatis dari estimasi internal/HPS: purchasing mencatat harga asli vendor. Harga nol harus dimasukkan secara eksplisit. Field harga legacy dibatasi dua desimal, harga v1 unit delapan desimal, total dua desimal; calculator memvalidasi batas secara otoritatif.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/rfq/RfqQuotationItemEditor.vue` | Editor bersama, syarat bisnis, tier add/remove, quantity simulator dan hasil backend |
| `RfqManualQuotationModal.vue`, `SupplierRfqItemsTable.vue` | Tabel padat diganti kartu barang full width |
| `SupplierRfqCostSidebar.vue` | Submit gate dan ringkasan sesuai mode |
| `src/utils/quotationPricing.js` | Serializer decimal, mode legacy/v1 dan release guard |
| `useRfqDetail.js`, `useSupplierPortalRfqForm.js` | Payload string, harga kosong/zero dan proteksi submit |
| `src/services/rfqServices.js`, `SupplierPortalRfqView.vue` | API preview internal/portal dan konteks token/currency |
| `tests/quotationPricing.test.js`, `quotationValidity.test.js` | Total asli, field ambiguity, revision round-trip dan direct-handler gate |

Backend menambahkan endpoint token-scoped `POST /api/v1/public/portal/rfq/{token}/pricing-preview`. Detail kontrak dan bukti API berada di [catatan backend tahap 3](../../../erp-backend/docs/changes/2026-11-12-rfq-quantity-pricing-stage-3.md). Tidak ada dependensi baru atau migrasi frontend.

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 240 tes lulus |
| `npm run build` | Lulus; warning chunk besar existing |
| Browser fixture manual dan portal pada 1440/390 px | 4 skenario lulus: total input, payload string, tier add/remove, borongan parsial, disable/enable submit, respons usang diabaikan, decimal besar tetap persis, tanpa overflow/error JS |
| `git diff --check` | Lulus |
| Backend RFQ/calculator/PO/portal | 128 tes lulus, 3 konkurensi MySQL dilewati |

Browser memakai Vite/Chrome fixture sementara `/tmp/erp-quantity-pricing-stage3-preview.mjs` dengan respons API dimock. Tes backend menguji calculator dan portal endpoint nyata di database tes. Ini tidak menggantikan UAT atau bukti transaksi produksi. Screenshot `/tmp/erp-pricing-stage3-{manual|portal}-{1440|390}.png` adalah bukti lokal sementara.

## Risiko dan tindak lanjut

- [ ] Tahap 4: harga efektif menurut alokasi di evaluasi/award/PO dan snapshot sebelum mode baru bisa dikirim.
- [ ] Tahap 5: UAT buyer/supplier, regresi lintas modul dan konkurensi MySQL.
- [ ] Cek deployment backend/frontend bersama sebelum mengumumkan fitur aktif.

## Deployment dan pemulihan

Belum deploy produksi. Memerlukan backend preview endpoint tahap 3 dan fondasi/migrasi tahap 2. Rollback frontend tidak menghapus data pricing; backend gate tetap aktif. Tidak ada perubahan pada approval PR atau konfigurasi SMTP.
