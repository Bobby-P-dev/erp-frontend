# RFQ — Sprint 2 tahap 3: validitas quotation di frontend

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-09 |
| Jenis | Perbaikan dan integrasi frontend |
| Status pekerjaan | Selesai implementasi; tes dan build lokal lulus |
| Sprint | Sprint 2 perbaikan RFQ, tahap 3 / case 6 |
| Plan terkait | [Plan frontend](../plans/rfq-frontend-alignment.md), [Sprint 2 backend](../../../erp-backend/docs/plans/rfq-improvement-sprint-2.md) |
| Kontrak backend | [Tahap 2: masa berlaku quotation](../../../erp-backend/docs/changes/2026-11-09-rfq-sprint-2-stage-2-validity.md) |
| Status rilis | Belum diverifikasi; belum deployment |

## Masalah dan dampak

Backend tahap 2 sudah menolak quotation kedaluwarsa, tetapi frontend belum memperhitungkan masa berlaku dalam pilihan full/split award dan pembuatan PO. Quotation kedaluwarsa dapat menjadi pilihan default karena harganya terendah atau sudah mendapat award tanpa PO. Form manual juga mengisi masa berlaku dari deadline RFQ, padahal keduanya merupakan tanggal dengan tujuan berbeda.

## Tujuan dan hasil

- [x] Tampilkan status berlaku, kedaluwarsa, dan belum ditentukan pada matriks.
- [x] Blokir pilihan award baru yang kedaluwarsa, termasuk default, vendor change, full/split, validasi, dan submit.
- [x] Blokir batch PO jika salah satu quotation award tanpa PO tidak memenuhi validitas; jangan mengirim batch parsial secara diam-diam.
- [x] Tetap tampilkan award terikat PO dan komitmennya; masa berlaku kosong yang berstatus `unspecified` tetap diizinkan.
- [x] Tangani penolakan HTTP 422 saat data berubah melalui refresh dan pesan backend, tanpa retry otomatis atau mengubah pilihan pengguna.
- [x] Selaraskan form manual/portal dan dokumentasikan verifikasi.

## Solusi dan keputusan

1. Helper `quotationValidity.js` memakai `validity_status`, `is_expired`, `can_award`, dan `can_create_purchase_order` dari server. Jam browser, timezone browser, dan deadline RFQ tidak dipakai untuk menetapkan kedaluwarsa. Tanggal batas ditampilkan langsung dari tanggal API beserta label akhir hari WIB.
2. Matriks menampilkan status dan alasan pada kolom quotation, bagian syarat pembayaran, dropdown award, dan ringkasan pemenang. Quotation kedaluwarsa tetap tersedia sebagai informasi perbandingan; ranking harga satuan/total tidak diubah.
3. Opsi kedaluwarsa dinonaktifkan. Default full dan split hanya memilih quotation yang diizinkan server; jika semuanya tidak tersedia, pilihan tetap kosong. Masa berlaku kosong ditampilkan sebagai “belum ditentukan” dan tetap dapat dipilih sesuai metadata server.
4. Ringkasan dan tombol PO memeriksa semua award tanpa `purchase_order_id`. Award terkunci dikecualikan dari pemeriksaan PO baru dan tetap ditampilkan sebagai komitmen tersimpan. Saat hubungan PO dilepas setelah pembatalan dan data disegarkan, quotation kembali menjadi kandidat yang wajib lolos validitas.
5. Halaman detail RFQ mengambil metadata dari endpoint komparasi ketika memiliki award tanpa PO, karena detail quotation belum menyediakan metadata validitas. Kegagalan fetch atau metadata tidak tersedia memblokir PO dengan alasan dan tindakan segarkan data; tidak menebak status dari tanggal.
6. HTTP 422 pada award/PO memicu refresh data. Pesan backend tetap ditampilkan; form award dipertahankan agar pengguna dapat mengoreksi pilihan. Jika refresh matriks gagal, tindakan award/PO diblokir sampai refresh berhasil. Data yang telah dimuat tetap merupakan snapshot; backend memeriksa ulang waktu aktual ketika operasi dilakukan.
7. Form manual memulai `valid_until` kosong. Manual dan portal menolak urutan tanggal yang terbalik sebelum submit serta menampilkan `errors.valid_until`/`errors.quotation_date` dari backend bila tersedia. Portal kini menyediakan input masa berlaku opsional; kedua form menjelaskan batas akhir hari WIB dan arti tanggal kosong.

## File terkait

- `src/utils/quotationValidity.js`: status/label, kelayakan tindakan, validasi tanggal, dan pesan API.
- `src/utils/rfqComparison.js`: callback kelayakan pada pilihan split default.
- `src/views/purchasing/RfqComparisonView.vue`: pilihan dan ringkasan award/PO, status, refresh 422.
- `src/composables/purchasing/useRfqDetail.js` dan `src/views/purchasing/RfqDetailView.vue`: pengambilan metadata serta pengaman PO di halaman detail.
- Form manual dan portal beserta composable portal: tanggal opsional, batas input, dan penanganan pesan validasi.
- `tests/rfqComparison.test.js` dan `tests/quotationValidity.test.js`: pengujian helper, setup halaman Vue, dan composable sebenarnya dengan API/dialog stub.

Tidak mengubah route, kontrak payload award/PO, backend aplikasi, dependensi, atau desain halaman secara menyeluruh. Perubahan lain yang sudah ada di workspace dipertahankan.

## Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `node --test tests/quotationValidity.test.js tests/rfqComparison.test.js` | Lulus, 27 tes |
| `npm test` | Lulus, 187 tes, 42 suite, 0 gagal; 15 tes tambahan dari baseline 172 |
| `npm run build` | Lulus; peringatan chunk font PDF `vfs_fonts` sekitar 1,83 MB masih ada seperti baseline |
| Whitespace pada baris yang ditambahkan tahap ini | Lulus |

Skenario meliputi pilihan kedaluwarsa termurah/award lama, semua opsi kedaluwarsa, full/split, nullable/unknown, batch PO campuran, penguncian dan pelepasan komitmen PO, penolakan 422, refresh gagal, tanggal manual/portal, dan pesan validasi backend. Tes menjalankan state kode sebenarnya dengan Vue reactivity, tetapi tidak membuktikan rendering browser atau integrasi API produksi. Sintaks template diperiksa melalui build.

Eksplorasi memakai skill codebase-memory. Indeks frontend generation `2026-10-20T09:14:37Z` belum melacak file RFQ terkait; implementasi diverifikasi melalui pembacaan source terarah dan tes. Kontrak backend diverifikasi melalui graph, snippet, dan coverage pada service validitas serta controller komparasi.

## Batasan dan tindak lanjut

- Uji browser/API staging: pergantian hari WIB ketika halaman terbuka, perubahan validitas bersamaan, PO parsial, pembatalan dan PO pengganti, serta input tanggal supplier nyata.
- Deploy bersama backend tahap 2. Backend lama tanpa metadata akan menghasilkan status belum tersedia dan memblokir tindakan baru sampai kontrak tersedia.
- Tidak ada polling jam atau timer kedaluwarsa lokal. Status berubah saat refresh; backend tetap menjadi pengaman akhir jika quotation kedaluwarsa setelah data dimuat.
- UI masih satu pilihan quotation baru per item per request seperti sebelumnya. Tidak menambahkan filter pembuatan PO per supplier; batch tetap mengikuti seluruh kandidat award tanpa PO.
- Konsistensi deadline RFQ/perpanjangan masuk tahap 4, pengiriman undangan tahap 5, dan regresi lintas alur/staging tahap 6.

## Rilis

Belum deployment atau pengujian staging. Tidak memerlukan migrasi database. Pemulihan mengikuti version control dan prosedur deployment tim.
