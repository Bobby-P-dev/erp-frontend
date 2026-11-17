# RFQ — Fase 6 regresi UI/API dan checklist UAT

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Hasil sprint / Pengujian |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal; UAT/deployment terbuka |
| Sprint | Katalog barang dan kandidat supplier RFQ — fase 6 |
| Plan terkait | Backend `docs/plans/rfq-catalog-supplier-selection.md` |
| Status rilis | Belum deployment/UAT perusahaan |

## Masalah dan dampak

Tes komponen fase 5 belum membuktikan halaman frontend menggunakan kontrak API nyata untuk katalog/campuran dan quotation parsial. Pemeriksaan lebih dari 100 supplier terpilih memerlukan pengujian kelompok request secara eksplisit.

## Tujuan dan kriteria penerimaan

- [x] Katalog/custom/campuran dapat dibuat melalui halaman asli dan HTTP Laravel nyata.
- [x] Penawaran subset tidak memaksa harga barang lain dan identitas tetap sampai PR/PO.
- [x] Pemeriksaan 101 pilihan supplier memakai request 100+1, tanpa supplier hilang.
- [x] Checklist UAT backend tersedia untuk purchasing/supplier.

## Cakupan dan rencana

Periksa struktur/coverage melalui Codebase Memory, perluas browser integrasi dan fixture kandidat, jalankan tes/build/browser, lalu catat hasil serta batas verifikasi. Tidak mengubah header/footer, desain form, approval atau SMTP.

## Solusi dan keputusan

Gunakan halaman/komponen Vue asli dengan router harness dan API Laravel nyata di SQLite disposable; tidak ada intercept API dalam integrasi. Tes kandidat dan portal/manual terpisah menggunakan fixture agar error, respons terlambat dan status supplier bisa diuji konsisten. Suite transaksi dan konkurensi MySQL dijalankan dari backend dengan database disposable.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `tests/browser/rfqTwoSources.integration.mjs` | Custom/katalog/campuran dan PP; subset quotation, identitas master sampai PR/PO, privasi portal dan cache/watch Vite terisolasi |
| `tests/browser/rfqSupplierCandidates.smoke.mjs` | 101 pilihan diverifikasi dalam kelompok 100+1 di desktop/ponsel |
| Backend `tests/Support/seedRfqTwoSourceBrowser.php` | Fixture katalog/mapping supplier integrasi nyata |
| Backend `docs/plans/rfq-catalog-supplier-selection-uat.md` | Checklist C01–C13 dan status penerimaan/rilis |

Tidak ada perubahan API, migration atau dependensi baru.

## Verifikasi

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 280/280 lulus, tanpa skipped |
| `npm run build` | Lulus; warning chunk besar terutama font PDF |
| `rfqInitialNeed.smoke.mjs` | Lulus desktop 1440 px / ponsel 390 px; katalog/custom/campuran dan error/stale response |
| `rfqSupplierCandidates.smoke.mjs` | Lulus 1440/390 px termasuk 101 pilihan dan request 100+1 |
| `rfqPartialQuotation.smoke.mjs` | Lulus portal/manual 1440/390 px, payload subset dan retensi input |
| `rfqTwoSources.integration.mjs` | Empat skenario lulus: custom/katalog desktop, campuran parsial ponsel sampai PR/approval/PO/issue/cancel serta PP ponsel sampai award/PO |
| Node syntax dua skrip browser; `git diff --check` | Lulus |
| Backend katalog/initial need/lifecycle/race MySQL | 126 tes, 1.314 assertions lulus; database disposable dibersihkan |
| Backend purchasing/approval/unit SQLite | 488 lulus, 14 skipped dari 502 tes; 4.596 assertions |

Browser dijalankan menggunakan Playwright runtime bawaan dan `/usr/bin/google-chrome`. Saat memperluas tes, fixture katalog dilengkapi description wajib dan assertion/locator disesuaikan dengan identitas barang; tidak mengandalkan urutan relasi API. Cache Vite terpisah di direktori sementara dan watcher dimatikan untuk mencegah reload lintas runner/perubahan file. Run final empat skenario lulus. Warning route kosong pada router harness serta HTTP gagal yang sengaja disimulasikan dicatat sebagai konteks, bukan kegagalan skenario. Percobaan regresi luas MySQL dihentikan sebelum hasil; tidak diklaim lulus. Suite spesifik MySQL dan regresi luas SQLite di atas sudah selesai.

## Hasil, risiko dan batasan

Browser ponsel merupakan simulasi viewport, bukan perangkat fisik. Pengujian memakai router harness dan akun fixture; tidak mencakup seluruh shell/login aplikasi. Email aktual, UAT purchasing/supplier dan deployment belum dilakukan. Build memberi warning ukuran chunk besar yang sudah ada, terutama font PDF.

## Deployment dan pemulihan

Deploy frontend/backend yang kompatibel bersama, lalu smoke lingkungan tujuan. Jika perlu pulihkan kode versi sebelumnya setelah memeriksa dukungan quotation parsial; jangan menghapus data transaksi.

## Tindak lanjut

- [ ] Jalankan penerimaan perusahaan memakai checklist backend C01–C13.
- [ ] Catat commit/versi, waktu deployment dan hasil smoke lingkungan tujuan.
