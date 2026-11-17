# Purchasing — Preview PDF, TTD biasa dan aksi PR

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Perbaikan UI dan alur dokumen |
| Status pekerjaan | Selesai implementasi dan tes lokal |
| Sprint / issue / PR | Revisi UAT; belum di-commit |
| Plan terkait | [Penyelarasan frontend](../plans/rfq-frontend-alignment.md) |
| Status rilis | Belum di-deploy; UAT akun nyata belum dilakukan |

## Masalah dan dampak

PDF langsung diunduh, tanda tangan memakai QR, dan PR pending tidak memiliki aksi edit/hapus yang mengikuti persetujuan pertama.

## Tujuan dan kriteria penerimaan

- [x] PDF PR dan BAST dibuka di preview sebelum unduh.
- [x] Gambar TTD upload/canvas menggantikan QR pada PDF PR.
- [x] QR footer PR/BAST dihapus.
- [x] Edit/hapus mengikuti capability backend dan terkunci setelah persetujuan pertama.

## Cakupan dan rencana pengerjaan

Telusuri generator PDF dan aksi PR, buat dialog reusable, ganti QR dengan TTD, selaraskan aksi, verifikasi build dan browser desktop/ponsel.

## Solusi dan keputusan

`previewPdf` membuat Blob URL dan membuka `PdfPreviewDialog`. Tombol Unduh tersedia setelah iframe dimuat; file yang diunduh menggunakan bytes yang sama dengan preview. Menutup dialog melepas Blob URL dan mengembalikan fokus. PR approved tetap menjadi syarat akses PDF PR.

Gambar pemohon diambil dari profil dan gambar approver dari aksi persetujuan/profil. Tahap pending/rejected tidak dibubuhi gambar TTD. Bila gambar tidak tersedia, kolom tanda tangan manual tetap disediakan. BAST mempertahankan kolom TTD manual. Data audit dan endpoint verifikasi historis tetap dipertahankan.

PR biasa diedit melalui form; PR RFQ melalui Ubah pengajuan untuk menjaga snapshot dan alokasi. Edit pending kembali ke draft dan perlu diajukan ulang. Hapus meminta konfirmasi lalu memperbarui daftar. Setelah persetujuan pertama, capability backend menonaktifkan kedua aksi.

## Implementasi

| Komponen | Perubahan |
| --- | --- |
| `PdfPreviewDialog.vue`, `utils/pdf/previewPdf.js` | Preview reusable, unduh dan cleanup |
| Kedua generator PDF | Preview sebelum unduh, hapus QR, TTD gambar pada PR |
| Daftar/detail/form/service PR | Edit pending dan hapus mengikuti capability API |
| `tests/browser/pdfPreview.smoke.mjs` | PDF nyata, TTD gambar, tanpa QR, download, cleanup dan visibility aksi |

Tidak ada dependency atau migrasi baru khusus revisi ini.

## Verifikasi

| Perintah | Hasil |
| --- | --- |
| `node --test tests/signatureAndPdf.test.js` | 9 lulus |
| `npm run build` | Lulus; peringatan chunk besar pdfmake |
| `node tests/browser/pdfPreview.smoke.mjs` dengan Playwright/Chrome lokal | Lulus desktop 1440px dan ponsel 390px |
| `node tests/browser/rfqRequisitionLifecycle.smoke.mjs` dengan Playwright/Chrome lokal | Lulus desktop 1440px dan ponsel 390px |

Browser memakai fixture terisolasi, generator PDF asli dan mock API untuk lifecycle; tidak membuat transaksi pada database aplikasi. Uji PDF memeriksa bytes `%PDF-`, dua gambar TTD PR, tanpa QR, tidak mengunduh saat preview dibuka, nama file, cleanup URL, serta edit/hapus sebelum dan sesudah persetujuan.

## Hasil, risiko dan batasan

Preview/unduh dan capability PR lulus tes lokal. Render PDF inline bergantung pada dukungan browser. PDF browser dapat memiliki toolbar unduh bawaan. Pengujian belum mencakup semua browser, gambar tanda tangan akun produksi atau UAT perusahaan.

## Deployment dan pemulihan

Belum di-deploy. Deploy bersama backend yang menyediakan DELETE PR dan capability resource. Rollback frontend mengembalikan tampilan sebelumnya; mutasi dokumen yang sudah tersimpan tidak dibatalkan oleh rollback kode.

## Tindak lanjut

- [ ] UAT dengan gambar TTD profil dan workflow perusahaan.
- [ ] Verifikasi preview PDF di browser pengguna perusahaan.
