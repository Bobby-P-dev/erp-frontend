# Rencana pengadaan — Redesign modal PR sumber

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Iterasi redesign Purchasing |
| Plan terkait | [Dashboard dan Purchasing](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Modal PR asal pada daftar rencana, termasuk tab Selesai, masih menggunakan banyak kartu/badge, teks kecil, ringkasan berbingkai dan kode metode `DIRECT_PURCHASE`. Informasi perusahaan terjepit pada kolom sempit dan gaya tombol berbeda dari keputusan desain terbaru.

## Tujuan dan kriteria penerimaan

- [x] Daftar PR mudah dipindai tanpa kartu dan badge bertingkat.
- [x] Metode memakai label Pembelian langsung / Tender RFQ.
- [x] Pemohon, divisi, perusahaan, keperluan dan jumlah alokasi tetap tersedia.
- [x] Tombol Tutup netral dan Lihat detail rencana biru; responsif di ponsel.
- [x] Membuka detail menutup modal sumber terlebih dahulu dan mempertahankan filter daftar.

## Cakupan dan rencana

Perubahan terbatas pada `ConsolidatedPrModal.vue`. Gunakan BaseModal yang sudah tersedia; ubah hierarki informasi, penyajian daftar, label metode dan tombol. Verifikasi alur tab Selesai → dua PR sumber → detail rencana, build dan tes procurement.

## Solusi dan keputusan

Judul menjadi PR sumber dengan nomor rencana sebagai konteks. Ringkasan metode dan jumlah barang memakai dua kolom ringan. PR disajikan sebagai daftar bernomor secara semantik dengan garis pemisah, nomor PR sebagai heading dan jumlah alokasi sebagai teks sekunder. Label metadata berada di atas nilainya, perusahaan mendapat ruang penuh dan keperluan ditampilkan sebagai teks biasa tanpa kotak/italic/kutipan.

Ponsel memakai satu kolom metadata dan tombol lebar penuh. Fallback `pr_numbers` tetap tersedia ketika `source_prs` kosong; metadata kosong tidak ditampilkan sebagai sekumpulan label tanpa isi. Jumlah item menggunakan nullish fallback agar nol tidak diganti dengan nilai lain. Tidak ada perubahan API atau status transaksi.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/plan/list/ConsolidatedPrModal.vue` | Layout, label metode, fallback sumber, tombol dan event perpindahan modal |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan chunk >500 kB tetap ada |
| `node --test tests/procurementPlan.test.js` | 6 tes lulus |
| Browser fixture Chrome 1440/1024/390 px | Lulus: tab Selesai, dua PR, label Pembelian langsung, nama panjang, Tutup, perpindahan ke detail, filter daftar, fallback pr_numbers dan jumlah nol; tidak ada pageerror/overflow halaman |
| Regresi detail rencana dengan fixture | Lulus: aktivasi, alasan pembatalan, lazy approval, halaman penuh, keyboard detail dan retry |

Harness sementara: `/tmp/erp-source-pr-preview.mjs`; log `/tmp/erp-source-pr-browser.log`; screenshot `/tmp/erp-source-pr-{1440,1024,390}.png`. Screenshot desktop dan ponsel diperiksa secara visual. Fixture tidak mengubah transaksi asli.

## Risiko dan tindak lanjut

- [ ] UAT dengan PR dan rencana perusahaan asli, termasuk sumber PR dalam jumlah besar.
- [ ] Audit aksesibilitas BaseModal bersama secara terpisah; komponen ini tetap memakai perilaku dasar BaseModal yang ada.

## Deployment dan pemulihan

Belum dilakukan deployment. Tidak ada migrasi database. Pemulihan melalui build frontend sebelumnya.
