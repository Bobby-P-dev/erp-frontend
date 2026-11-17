# Tender RFQ — Rincian kebutuhan lebih hidup dan mudah dipindai

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Refactor UI/UX |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Penyempurnaan detail RFQ berdasarkan review pengguna |
| Plan terkait | [Prinsip desain](../guides/design-principles.md), [redesign detail RFQ](2026-11-11-rfq-detail-redesign.md) |
| Status rilis | Belum diverifikasi pada lingkungan tujuan |

## Masalah dan dampak

Pada `/purchasing/rfqs/:id`, disclosure rincian berada di dalam kolom nama barang. Membukanya memperpanjang baris dan meninggalkan ruang kosong besar di kolom angka. Label dan metadata seragam sehingga tampilan terasa datar. Pengguna meminta clean, modern, elegan dan interaktif secukupnya.

## Tujuan dan kriteria penerimaan

- [x] Jumlah, HPS satuan dan estimasi tetap mudah dibandingkan saat rincian dibuka.
- [x] Rincian dapat dibuka per barang atau sekaligus lewat tombol yang jelas.
- [x] Aksen warna, ikon dan hierarki membantu pembacaan tanpa ornamen berlebihan.
- [x] Interaksi keyboard dan tampilan ponsel diperiksa.

## Cakupan

Komponen reusable `RfqItemsSuppliersTabs.vue`: navigasi tab dan bagian barang/jasa. Tidak mengubah header/footer aplikasi, API, alur award, approval, penyimpanan atau kalkulasi harga transaksi.

## Rencana pengerjaan

1. Telusuri komponen dan pedoman desain melalui codebase-memory serta source terarah.
2. Pisahkan baris ringkasan dari panel rincian selebar tabel.
3. Tambahkan disclosure massal, hierarki visual dan ringkasan HPS.
4. Periksa build, browser desktop/ponsel, dan dokumentasikan hasil.

## Solusi dan keputusan

Gunakan `BaseTable` dan `BaseButton` existing. Baris utama menampilkan nomor urut, nama/kode barang, jumlah, HPS dan estimasi. Rincian dibuka pada baris `colspan` terpisah sehingga tidak memperpanjang sel nama. Spesifikasi ditempatkan di atas dokumen sumber, tanggal kebutuhan dan catatan; metadata memakai ikon berlabel. Angka estimasi dan total diberi aksen lembut.

Tombol per barang memiliki `aria-expanded`, `aria-controls`, label nama barang, target klik minimal 36 px dan fokus keyboard. Tombol buka/tutup semua mengikuti status barang yang terlihat. Transisi singkat menghormati `prefers-reduced-motion`. Pada ponsel, angka disusun sebagai label/nilai dan panel rincian menjadi satu kolom. HPS yang belum diisi ditampilkan sebagai “—”, tanpa menyatakannya sebagai harga nol.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `src/components/purchasing/rfq/detail/RfqItemsSuppliersTabs.vue` | State disclosure, panel rincian terpisah, tombol massal, ikon tab, hierarki data, ringkasan HPS dan responsive styling |
| `docs/README.md` | Indeks catatan perubahan |

API, migrasi dan konfigurasi: tidak diperlukan. Penelusuran graph tidak melaporkan gap coverage untuk komponen dan parent view; sinyal best-effort tidak membuktikan kelengkapan seluruh repository.

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm run build` | Lulus | Peringatan ukuran chunk existing masih ada |
| Browser fixture 1440, 1024, 390 px | 3 skenario lulus | Buka rincian dengan Enter, buka/tutup semua, catatan kosong, navigasi supplier dan kembali ke barang |
| Pemeriksaan browser | Lulus | Tidak ada mutasi API, error JavaScript, overflow halaman atau overflow region tabel barang |
| Screenshot desktop/ponsel | Diperiksa | Panel rincian, angka dan ringkasan dapat dibaca |
| `git diff --check` | Lulus | Termasuk dokumentasi |

Browser memakai fixture API pada full RFQ detail view, bukan data RFQ 10 dari server pengguna. Tidak menjalankan ulang tes backend karena perubahan terbatas pada presentasi frontend.

## Hasil

Rincian lebih terstruktur tanpa memanjangkan kolom nama barang. Pengguna dapat memilih tingkat detail yang dibutuhkan dan membandingkan angka dengan mudah. Desain mengikuti prinsip internal yang telah disepakati; tidak mengklaim sebagai salinan UI ERPNext.

## Risiko dan batasan

Verifikasi pada data nyata pengguna dan lingkungan deployment belum dilakukan. Sumber dokumen berupa label, bukan tautan navigasi baru.

## Deployment dan pemulihan

Deploy bundle frontend mengikuti prosedur existing; tidak ada migrasi. Pemulihan cukup mengembalikan perubahan komponen ini tanpa membatalkan pekerjaan pricing yang sudah ada.

## Tindak lanjut

- [ ] Review pengguna pada RFQ 10 setelah browser memuat perubahan frontend.
