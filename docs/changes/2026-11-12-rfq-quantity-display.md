# RFQ — Format jumlah tanpa nol desimal berlebih

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Perbaikan UI dan preview |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Review form penawaran supplier |
| Plan terkait | [Quantity pricing](../../../erp-backend/docs/plans/rfq-quantity-pricing.md) |
| Status rilis | Belum diverifikasi pada lingkungan tujuan |

## Masalah dan dampak

Jumlah dari API berupa decimal string empat desimal. Form menampilkan `20.0000` pada input/label sehingga pengguna merasa jumlahnya ambigu. Preview dengan harga kosong juga mengirim string kosong yang menjadi null lewat middleware Laravel, lalu menghasilkan pesan validasi decimal yang tidak membantu sebelum pengguna selesai mengisi.

## Tujuan dan kriteria penerimaan

- [x] `20.0000` menjadi `20`, `20.5000` menjadi `20.5`, dan `0.0001` tetap utuh.
- [x] Jumlah besar dan pecahan tidak dibulatkan melalui floating point.
- [x] Input, label total, placeholder dan jumlah hasil preview konsisten.
- [x] Harga kosong menampilkan petunjuk pengisian tanpa mengirim preview prematur; harga nol tetap diterima.

## Cakupan dan rencana pengerjaan

Perbaikan editor reusable yang digunakan form manual dan portal supplier. Tambahkan formatter string, rapikan nilai awal/ketika blur, terapkan pada label, batasi preview kosong, lalu jalankan tes dan pemeriksaan browser. Tidak mengubah skala database, aturan harga atau payload decimal string.

## Solusi dan keputusan

`compactQuantity()` hanya menghapus nol di akhir bagian pecahan dan titik yang tidak lagi diperlukan. Tidak memakai `Number()` sehingga presisi tetap terjaga. Input dinormalisasi ketika item dimuat dan ketika kehilangan fokus; pengguna tetap dapat mengetik pecahan termasuk nol di tengah tanpa format ulang pada setiap ketikan. Label selalu memakai formatter yang sama.

Preview menunggu jumlah ditawarkan serta sumber harga terisi. Ketika kosong, tampilkan “Lengkapi jumlah dan harga untuk melihat pratinjau.” Validasi backend tetap berlaku saat input lengkap atau submit.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `src/utils/quotationPricing.js` | Formatter quantity berbasis string |
| `src/components/purchasing/rfq/RfqQuotationItemEditor.vue` | Normalisasi input, label dan placeholder; guard preview harga kosong |
| `tests/quotationPricing.test.js` | Regresi jumlah bulat, pecahan kecil dan decimal besar |

API, database, konfigurasi dan migrasi: tidak diperlukan.

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | 245 lulus | Termasuk formatter tanpa pembulatan |
| `npm run build` | Lulus | Peringatan chunk existing masih ada |
| Browser manual/portal, 1440 dan 390 px | 4 skenario lulus | Nilai awal `3.0000` tampil `3`; harga kosong tidak mengirim preview; setelah diisi payload string tetap tepat |
| Regresi browser pricing | Lulus | Total, tier tambah/hapus, fixed quantity, token portal, respons terlambat dan tanpa overflow/error JS |
| `git diff --check` | Lulus | Pemeriksaan whitespace |

Browser memakai fixture dan mock API. Belum memverifikasi data RFQ pengguna pada lingkungan tujuan.

## Hasil, risiko dan batasan

Form menampilkan jumlah lebih ringkas sambil mempertahankan nilai pecahan dan presisi transaksi. Pemisah desimal input tetap titik sesuai kontrak API; perubahan ini tidak menerapkan format ribuan pada input. Error validasi input lain tetap ditangani backend.

## Deployment dan pemulihan

Deploy bundle frontend; tidak memerlukan migrasi. Untuk pemulihan, kembalikan perubahan formatter/editor ini tanpa membatalkan integrasi pricing sebelumnya.

## Tindak lanjut

- [ ] Review pengguna pada form supplier setelah halaman memuat bundle terbaru.

## Penyempurnaan nominal preview — 2026-11-12

Review berikutnya menemukan padding pada total dan harga ekuivalen: `550000.00` dan `27500.00000000`. `formatPricingMoney()` pada util pricing kini menambahkan pemisah ribuan Indonesia, label mata uang dan menghapus nol di akhir pecahan: **Rp550.000** serta **Rp27.500 / KG**. Penyesuaian pembulatan menggunakan format yang sama. Mata uang selain IDR tetap memakai kode currency quotation.

Formatter mengolah string tanpa konversi ke Number: pecahan bernilai, misalnya `27500.12500000`, tampil `Rp27.500,125`; decimal besar tetap presisi. Nilai input, payload dan perhitungan backend tetap sama. Scope perubahan hanya hasil preview pada editor bersama manual/portal.

Verifikasi tambahan: `npm test` 246 lulus, termasuk nominal bulat, pecahan, angka besar, nol, penyesuaian negatif dan mata uang asing. Build lulus dengan peringatan ukuran chunk existing. Browser terarah manual/portal pada 1440 dan 390 px: 4 skenario lulus, total `Rp550.000`, ekuivalen `Rp27.500 / KG`, payload asli tetap `550000`, tanpa overflow/error JavaScript. `git diff --check` lulus.

Percobaan memakai ulang script regresi browser tahap sebelumnya tidak selesai pada ponsel: timeout ketika menunggu petunjuk input kosong, lalu timeout pada skenario perubahan jumlah cepat saat dicoba ulang. Tidak mengklaim skenario tersebut lulus pada perubahan ini. Pemeriksaan browser terarah nominal di atas dan seluruh tes otomatis lulus; penyebab timeout script lama belum ditentukan.
