# Procurement — Sprint 1 fase 5: frontend RFQ dua sumber

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Fitur |
| Status pekerjaan | Selesai implementasi dan verifikasi frontend lokal |
| Sprint / issue / PR | Sprint 1 inisiatif dua jalur pengadaan, fase 5 |
| Plan terkait | [Sprint 1 bersama backend](../../../erp-backend/docs/plans/procurement-two-entry-sprint-1.md) |
| Status rilis | Belum dirilis ke produksi |

## Masalah dan dampak

Form tender hanya mendukung PP, bahkan otomatis memilih rencana pertama ketika dibuka langsung. RFQ kebutuhan awal dari API belum dapat dibuat lewat frontend. Daftar tender masih mengasumsikan referensi PP, dan aksi award/PO belum menjelaskan batas sumber awal yang membutuhkan PR approved.

## Tujuan dan kriteria penerimaan

- [x] Pilihan sumber kebutuhan awal atau rencana pengadaan.
- [x] Form barang mandiri dengan nama, satuan dan jumlah; estimasi harga opsional.
- [x] Payload sumber awal tidak mengirim referensi PP; jalur lama mempertahankan referensinya.
- [x] Label sumber pada daftar/detail/comparison dan alasan pembelian belum tersedia.
- [x] Form mempertahankan isian ketika menerima 422 dan menampilkan pesan per field/ringkasan.
- [x] Verifikasi browser desktop/ponsel dan build akhir selesai.

## Cakupan dan rencana

Telusuri graph frontend dan kontrak backend, periksa coverage, lalu ubah form/composable, tambahkan komponen barang dan pemberitahuan reusable, sesuaikan consumer response, dan uji kontrak serta browser fixture. Header/footer aplikasi tidak diubah.

## Solusi dan keputusan

Halaman create tanpa query PP dimulai dari kebutuhan awal. Link antrean dengan `plan_id`/`plan_ids` tetap membuka jalur PP. Penggantian sumber mengosongkan judul, rencana dan daftar barang; ketentuan tender serta pilihan supplier tetap tersedia. Respons pemuatan PP yang datang terlambat tidak boleh mengisi sumber yang sudah diganti.

Barang sumber awal ditulis mandiri memakai satuan dari master yang dapat dicari. Pemilihan master barang belum ditambahkan; backend mendukung nama snapshot tanpa `item_id`. Estimasi dan informasi tambahan memakai disclosure agar isian utama mudah dipahami. Ringkasan tetap di bawah. Draf boleh tanpa supplier; publikasi memerlukan supplier. Angka decimal dikirim sebagai string untuk menjaga presisi.

Metadata backend menjadi acuan label/alasan. Untuk kebutuhan awal, frontend menyembunyikan award dan penerbitan PO serta menjelaskan perlunya PR approved. Backend tetap menjadi otoritas validasi. Fitur membuat PR dari quotation merupakan Sprint 2.

Jika create berhasil tetapi publish gagal, pengguna diarahkan ke detail draf yang tersimpan agar mencoba publikasi dari sana tanpa membuat dokumen duplikat.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/utils/rfqSource.js` | Kontrak payload, validasi, label dan alasan pemblokiran pembelian |
| `src/composables/purchasing/useRfqCreateForm.js` | State dua sumber, satuan, pencegahan respons usang, penanganan 422 dan kegagalan publikasi |
| `src/components/purchasing/rfq/form/RfqInitialNeedItemsSection.vue` | Editor barang mandiri |
| `src/components/purchasing/rfq/detail/RfqSourceNotice.vue` | Pemberitahuan sumber awal reusable |
| Create/list/detail/comparison RFQ | Pilihan sumber, entry point, label serta pembatasan aksi |
| `tests/rfqSource.test.js`, tes comparison/validity | Kontrak kedua sumber dan guard aksi |
| `tests/browser/rfqInitialNeed.smoke.mjs` | Pengujian halaman dengan API fixture, tanpa transaksi database aplikasi |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 263 tes lulus setelah harness existing diperbarui untuk helper baru |
| `npm run build` | Build akhir lulus; peringatan chunk di atas 500 kB masih ada |
| `tests/browser/rfqInitialNeed.smoke.mjs` | Lulus pada lebar 1440 dan 390 px: payload kedua sumber, validasi/422, draf tanpa supplier, reset sumber, guard detail/comparison, entry point daftar dan tanpa overflow horizontal pada form |
| `git diff --check` | Lulus pada kedua repo |

Screenshot form desktop dan ponsel diperiksa secara visual. Browser memakai API fixture, bukan backend/database aplikasi; hasil ini belum membuktikan integrasi API aktual, pengiriman email atau deployment. Log lokal: `/tmp/erp-phase5-browser.log`, `/tmp/erp-phase5-tests-final.log`, `/tmp/erp-phase5-build-final.log` (artefak sementara, bukan bukti produksi).

## Risiko dan tindak lanjut

- [x] Fase 6: integrasi dengan API aktual kedua sumber, portal dan regresi akhir lokal Sprint 1; [hasil fase 6](2026-11-12-procurement-sprint-1-phase-6.md).
- [ ] UAT perusahaan, email/queue nyata serta deployment bersama backend.
- [ ] Sprint 2: quotation → PR → approval → PO.

## Deployment dan pemulihan

Frontend harus dipasangkan dengan backend fase 2–4 dan migration sumber RFQ. Tidak ada migration baru fase 5. Belum dirilis ke produksi. Pemulihan frontend tidak menghapus data RFQ sumber awal yang sudah disimpan; transaksi harus tetap dipertahankan.
