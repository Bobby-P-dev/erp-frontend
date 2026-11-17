# RFQ — Harga final supplier saat jumlah berubah

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Fitur dan perbaikan form revisi |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Lanjutan quantity pricing |
| Plan terkait | [RFQ frontend](../plans/rfq-frontend-alignment.md) |
| Status rilis | Backend/migrasi lokal tersedia; UAT perusahaan dan produksi belum diverifikasi |

## Masalah dan dampak

Supplier belum dapat menyatakan bahwa harga berubah bila pembelian hanya sebagian. Buyer tidak memiliki aksi untuk meminta harga sesuai jumlah pilihannya. Editor revisi manual juga masih membentuk payload harga satuan legacy, sehingga ketentuan harga baru berpotensi hilang.

## Tujuan dan kriteria penerimaan

- [x] Pilihan “Konfirmasi harga jika jumlah berubah” tersedia pada editor bersama.
- [x] Evaluasi menampilkan alasan penolakan dan aksi meminta harga final tanpa award.
- [x] Supplier melihat jumlah permintaan yang ringkas dan mengisi total baru yang kosong saat awal.
- [x] Jumlah dan ketentuan harga pada jawaban konfirmasi terkunci di UI; backend memvalidasi ulang.
- [x] Revisi manual mempertahankan original total, mode dan tier tanpa konversi ke harga legacy.

## Cakupan

Editor harga bersama, serializer, hidrasi revisi portal, panel revisi manual dan wizard pemilihan supplier. Header/footer aplikasi tetap.

## Rencana pengerjaan

1. Periksa kontrak kalkulator dan revision request backend.
2. Tambahkan mode dan penjelasan harga pada editor.
3. Hubungkan alokasi buyer ke permintaan revisi terstruktur.
4. Integrasikan hidrasi supplier/revisi manual, tes dan browser fixture.

## Solusi dan keputusan

Buyer memilih jumlah, lalu “Minta harga final dari supplier”. Dialog menjelaskan bahwa permintaan belum menetapkan pemenang. API menerima versi quotation dan jumlah per RFQ item untuk supplier yang dipilih. Setelah berhasil, modal ditutup dan matriks diperbarui pada tab rincian/revisi. Tautan portal tetap sama; pesan hasil meminta buyer menghubungi supplier tanpa mengklaim email sudah terkirim.

Form supplier memakai jumlah permintaan, mode `reconfirm` dan total kosong. Banner amber menjelaskan jumlah yang perlu ditawar ulang; label “Harga final untuk …” membedakannya dari simulasi harga. Form revisi manual memakai editor bersama dan serializer yang sama. Jika deadline sudah berakhir, request ditolak backend dan form buyer tetap terbuka dengan pesan kesalahan.

Desain memakai disclosure, aksen biru/amber, informasi singkat dan susunan header responsif sesuai pedoman clean, modern dan interaktif secukupnya. Tidak menambah approval setelah PR; status pemeriksaan mengikuti konfigurasi backend.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `RfqQuotationItemEditor.vue` | Mode baru, penjelasan, jumlah terkunci saat konfirmasi dan label total final |
| `quotationPricing.js`, `rfqComparison.js` | Serializer total asli dan pesan ketentuan/alasan penolakan |
| `useSupplierPortalRfqForm.js` | Hidrasi jumlah permintaan tanpa membawa total lama sebagai jawaban |
| `RfqComparisonView.vue` | Aksi permintaan harga final dari alokasi buyer dengan versi quotation |
| `QuotationRevisionPanel.vue` | Rincian jumlah permintaan dan editor revisi bersama |

Kontrak dan migrasi dijelaskan pada [catatan backend](../../../erp-backend/docs/changes/2026-11-12-rfq-price-reconfirmation.md).

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | 254 lulus | Payload buyer, kegagalan request, hidrasi supplier dan revisi manual |
| `npm run build` | Lulus | Peringatan chunk besar tetap ada |
| Browser fixture comparison 1440/390 px | Lulus | Jumlah 30 dari 50 diblokir; permintaan membawa jumlah/versi yang benar; tidak mengirim award |
| Browser fixture editor 1440/390 px | Lulus | Jumlah permintaan 30, total awal kosong, input Rp360.000 dan simulasi jumlah lain ditolak; tanpa overflow/exception JavaScript |
| Backend suite terkait | 139 lulus, 4 race MySQL dilewati | 2.084 assertion; PO Rp360.000 mengikuti total revisi |
| `git diff --check` | Lulus | Kedua repository |

Browser menggunakan fixture. Ada warning route awal kosong pada harness comparison; tidak ada exception halaman. UAT nyata belum dijalankan.

## Hasil

Harga 50 kg tidak diasumsikan proporsional ketika supplier memilih konfirmasi. Buyer meminta harga untuk 30 kg; supplier memasukkan total baru dan buyer mengevaluasi ulang sebelum award/PO. Ketentuan harga tetap tersimpan saat revisi manual.

## Risiko dan batasan

Mode harga historis dipertahankan. Deadline perlu diperpanjang melalui alur resmi bila sudah berakhir. Permintaan revisi belum menghasilkan email notifikasi otomatis. Alokasi yang masih diedit dalam wizard belum disimpan sebagai award; buyer perlu memeriksa kembali pembagian setelah supplier merespons.

## Deployment dan pemulihan

Deploy backend beserta migrasi baru sebelum frontend. Migrasi aplikasi lokal telah dijalankan; produksi belum diverifikasi. Gunakan koreksi maju jika sudah ada data mode `reconfirm`, karena frontend/backend lama belum mengenal mode tersebut.

## Tindak lanjut

- [ ] UAT supplier nyata, split beberapa supplier dan tindak lanjut komunikasi harga final.
- [ ] Verifikasi rilis frontend bersama backend.
