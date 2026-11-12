# RFQ — Penyempurnaan biaya dan ketentuan supplier

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Refinement perbandingan RFQ; belum ada issue/PR |
| Plan terkait | [Redesign internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Bagian biaya dan ketentuan menampilkan paragraf serta label/nilai berurutan dengan bobot visual serupa. Pengguna menilai tampilan terlalu polos dan kaku. Total, komponen biaya, ketentuan pembayaran/pengiriman serta mata uang sulit dipindai sebagai kelompok berbeda.

## Tujuan dan kriteria penerimaan

- [x] Total supplier menonjol dalam panel warna lembut.
- [x] Indikator total terendah tetap memakai hasil perbandingan server dengan cakupan setara.
- [x] Rincian biaya, ketentuan transaksi dan mata uang dipisahkan secara visual.
- [x] Disclosure memiliki ikon/chevron, hover, fokus dan pengoperasian keyboard.
- [x] Kartu supplier reusable; desktop dan ponsel konsisten.
- [x] Data kosong, ongkir nol, waktu kirim nol serta peringatan eligibility/kurs dipertahankan.

## Cakupan

Presentasi biaya supplier pada halaman perbandingan. Tidak mengubah payload, endpoint, perhitungan, aturan award ataupun approval.

## Rencana pengerjaan

1. Telusuri bagian biaya dan helper data melalui codebase-memory dan source terarah.
2. Ekstrak kartu reusable dan susun hierarki biaya/ketentuan.
3. Perjelas disclosure bagian utama dan panduan.
4. Uji browser, tes frontend dan build; catat hasil.

## Solusi dan keputusan

`RfqSupplierCostCard` menampilkan identitas supplier dengan ikon, panel total biru lembut (hijau untuk total terendah setara), status validitas/review, serta disclosure rincian. Rincian memuat breakdown harga barang, pajak, ongkir dan total; kartu pembayaran, waktu kirim dan masa berlaku; lalu area terpisah untuk total mata uang asli serta kurs.

`ReviewDisclosure` yang sudah tersedia digunakan ulang untuk rincian kartu dan panduan membaca. Styling interaksi dibatasi pada komponen RFQ. Bagian utama memakai chevron berputar dan ikon biaya. Native details/summary mempertahankan dukungan keyboard, fokus dan buka-tutup independen. Transisi baru mengikuti reduced motion. Warna dan ikon mendampingi label teks; status terendah tidak otomatis memilih pemenang.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `src/components/purchasing/rfq/RfqSupplierCostCard.vue` | Komponen kartu biaya dan ketentuan per supplier. |
| `src/components/purchasing/rfq/RfqPriceComparison.vue` | Integrasi kartu reusable, disclosure bagian utama dan panduan. |
| `tests/browser/rfqSupplierCosts.smoke.mjs` | Fixture browser dengan komponen Vue asli. |

Migrasi, konfigurasi dan perubahan backend tidak diperlukan.

## Verifikasi

| Pemeriksaan | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | Lulus | 233 tes frontend |
| `npm run build` | Lulus | Peringatan chunk besar masih tersedia |
| `tests/browser/rfqSupplierCosts.smoke.mjs` | Lulus | Chrome headless, 1440/1024/390 px |
| `git diff --check` | Lulus | Repo frontend |

Browser menguji buka-tutup independen, Enter/Space, indikator total terendah, breakdown nominal, ongkir nol, waktu kirim nol, data kosong, kurs asli, peringatan kurs tidak valid, eligibility, panduan, dan tidak adanya overflow halaman. Screenshot tiga ukuran diperiksa. Semua API memakai fixture, tanpa transaksi pada data operasional.

## Hasil

Bagian biaya lebih hidup melalui ikon, panel warna, pembeda kelompok dan respons hover/focus. Informasi komersial lebih mudah dibaca tanpa mengubah makna perbandingan total ataupun penetapan pemenang.

## Risiko dan batasan

UAT akun nyata dan deployment belum diverifikasi. Pengujian fixture tidak membuktikan semua data supplier aktual atau perangkat pembaca layar telah diuji. Pada layar kecil kelompok informasi tersusun vertikal.

## Deployment dan pemulihan

Deploy frontend mengikuti proses perusahaan; tidak ada migrasi baru. Pemulihan dilakukan dengan mengembalikan integrasi parent dan komponen kartu pada perubahan ini.

## Tindak lanjut

- [ ] Review pengguna pada data RFQ aktual dan verifikasi deployment.
