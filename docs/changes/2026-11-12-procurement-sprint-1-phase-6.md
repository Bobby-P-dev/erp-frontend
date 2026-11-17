# Procurement — Sprint 1 fase 6: integrasi RFQ dua sumber

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-12 |
| Jenis | Hasil sprint / pengujian integrasi |
| Status pekerjaan | Selesai implementasi dan regresi lokal Sprint 1 fase 1–6 |
| Sprint / issue / PR | Sprint 1 inisiatif dua jalur pengadaan |
| Plan terkait | [Sprint 1 bersama backend](../../../erp-backend/docs/plans/procurement-two-entry-sprint-1.md), [penyesuaian frontend](../plans/rfq-frontend-alignment.md) |
| Status rilis | Belum dirilis ke produksi; UAT belum dilakukan |

## Masalah dan dampak

Tes browser fase 5 memakai API fixture. Keberhasilan create/publish dan pengiriman quotation perlu dibuktikan terhadap request/resource Laravel asli sebelum menutup sprint.

## Tujuan dan kriteria penerimaan

- [x] Form kebutuhan awal dan PP berhasil berkomunikasi dengan API nyata.
- [x] Supplier melihat barang/satuan/jumlah dan mengirim quotation melalui UI.
- [x] Comparison berhasil; award/PO kebutuhan awal ditolak dengan alasan PR approved.
- [x] Jalur PP dari PR approved berhasil award dan membentuk PO tanpa approval quotation/PO tambahan.
- [x] Regresi frontend, browser fixture dan build lulus; dokumentasi diperbarui.

## Cakupan

Pengujian integrasi halaman Vue asli dalam harness router sederhana ke server Laravel HTTP sebenarnya, menggunakan database SQLite sementara. Login dan seluruh shell aplikasi bukan cakupan browser ini. Tidak mengubah header/footer, kode runtime atau kontrak API pada fase 6.

## Rencana pengerjaan

1. Periksa kontrak form, portal dan comparison.
2. Tambahkan runner API nyata dengan fixture backend yang aman.
3. Jalankan kedua jalur, regresi frontend/backend, build dan pemeriksaan diff.
4. Tutup status implementasi lokal Sprint 1 dan catat pekerjaan rilis terpisah.

## Solusi dan keputusan

`tests/browser/rfqTwoSources.integration.mjs` membuat database baru di folder temporary `erp-rfq-sprint1-*`, menjalankan migration dan fixture backend, lalu menyalakan Laravel serta Vite. Request diteruskan ke Laravel tanpa API interception. Buyer memakai token Sanctum sementara; halaman supplier tidak mengirim header Authorization buyer. Mailer `array` dan queue `database` memastikan pengujian tidak mengirim email nyata. Browser/server dihentikan dan database sementara dihapus setelah tes.

Fixture membutuhkan backend pendamping yang sudah terpasang. Path default `../erp-backend` dapat diganti melalui `ERP_BACKEND_PATH`. Script seed backend menolak database di luar lokasi SQLite testing milik runner. Token tidak dicetak ke dokumentasi. Tidak ada perubahan package aplikasi untuk memasang Playwright.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `tests/browser/rfqTwoSources.integration.mjs` | Orkestrasi database/server, interaksi buyer/supplier, assertion API aktual dan cleanup |
| Backend `tests/Support/seedRfqTwoSourceBrowser.php` | Fixture perusahaan, buyer, supplier, satuan dan PR approved/PP aktif |
| Plan dan indeks docs kedua repo | Status selesai lokal dan batas UAT/rilis |

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | Lulus | 263 tes, 54 suite |
| `npm run build` | Lulus | Peringatan chunk >500 kB masih ada |
| `node tests/browser/rfqInitialNeed.smoke.mjs` | Lulus | API fixture, 1440/390 px; kedua sumber, validasi/422, reset dan guard |
| `node tests/browser/rfqTwoSources.integration.mjs` | Lulus | Kebutuhan awal 1440 px; PP 390 px; API Laravel asli |
| `node --check tests/browser/rfqTwoSources.integration.mjs` | Lulus | Syntax runner |
| Regresi backend purchasing + pricing calculator | Lulus | 357 lulus, 4 tes konkurensi MySQL dilewati, 3.431 assertions |
| `git diff --check` | Lulus | Kedua repo |

Untuk menjalankan browser, sediakan Playwright dan Chrome; set `PLAYWRIGHT_MODULE_PATH` ke entry `playwright/index.mjs` bila package berada di luar repo dan `CHROME_EXECUTABLE_PATH` ke executable Chrome bila tidak memakai browser Playwright. Pada mesin verifikasi, Playwright dari dependency runtime lokal dipakai bersama `/usr/bin/google-chrome`. Jalankan perintah dari root frontend. Backend memakai environment testing dan SQLite disposable yang dikelola runner; jangan menjalankan seed secara manual pada database aplikasi.

Log hasil lokal: `/tmp/erp-phase6-frontend-tests.log`, `/tmp/erp-phase6-frontend-build.log`, `/tmp/erp-phase6-browser-fixture.log`, `/tmp/erp-phase6-browser-integration.log`. Log bersifat sementara. [Rincian verifikasi backend dan batasan](../../../erp-backend/docs/changes/2026-11-12-procurement-sprint-1-phase-6.md).

## Hasil

Kebutuhan awal dapat dibuat/dipublikasikan dari UI, menerima quotation supplier melalui UI dan tampil pada comparison. Award/PO ditolak oleh backend dengan alasan keterkaitan PR approved. Jalur PP dari PR approved tetap berhasil sampai PO: 50 kg dengan subtotal Rp500.000. Approval quotation/PO tambahan tidak diperlukan dalam mode `none` yang diuji.

Sprint 1 fase 1–6 selesai implementasi dan regresi lokal. Tidak ada bug produk tambahan yang ditemukan oleh skenario ini. Perbaikan selector supplier dan pengambilan ID internal untuk award hanya dilakukan pada test harness sebelum hasil final lulus.

## Risiko dan batasan

Pengujian bukan UAT/staging atau bukti rilis. SMTP/worker nyata, konkurensi MySQL dan login dengan seluruh shell aplikasi belum diuji pada browser fase ini. Alur quotation → PR belum tersedia dan masuk Sprint 2.

## Deployment dan pemulihan

Belum commit/push/deployment pada fase ini. Frontend memerlukan backend dua sumber beserta migration sumber RFQ; fase 6 tidak menambah migration. Pertahankan data transaksi ketika memulihkan versi kode.

## Tindak lanjut

- [ ] UAT perusahaan, pengiriman email/queue nyata dan deployment.
- [ ] Empat tes konkurensi MySQL pada database terisolasi.
- [ ] Sprint 2: quotation → PR → approval PR → PO.
- [ ] Sprint 3: kesepakatan harga dan repeat order.
