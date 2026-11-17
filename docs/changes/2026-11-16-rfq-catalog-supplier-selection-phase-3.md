# RFQ — Fase 3 form katalog/custom

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Fitur |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Sprint sisipan katalog RFQ, fase 3 |
| Plan terkait | [Plan backend](/var/www/erp-backend/docs/plans/rfq-catalog-supplier-selection.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

RFQ kebutuhan awal belum memiliki pemilihan barang master sehingga semua kebutuhan ditulis manual dan tidak membawa identitas katalog.

## Tujuan dan kriteria penerimaan

- [x] Katalog/custom per baris, campuran, tambah/hapus dan reset identitas.
- [x] Cari nama/kode dengan pagination, loading, kosong, error/retry dan proteksi hasil usang.
- [x] Nama/satuan katalog otomatis; harga master tidak disalin.
- [x] Snapshot lama tetap kompatibel pada helper/payload; header/footer tetap.

## Cakupan dan rencana

Telusuri form dan kontrak API dengan Codebase Memory, tambahkan picker reusable dan helper, jalankan tes/build/browser desktop/ponsel, lalu catat hasil. Form katalog hanya untuk kebutuhan awal; barang PP mengikuti alur sebelumnya.

## Solusi dan keputusan

Baris baru memakai custom seperti sebelumnya, dengan radio berlabel untuk memilih katalog. Hasil katalog dibatasi 10 per halaman dan panel daftar dapat digulir. Nama dan satuan mengikuti master, sementara jumlah, estimasi dan rincian kebutuhan tetap dari pengguna. Pergantian mode membersihkan nama, ID dan satuan agar tidak tertinggal. Detail opsional tetap dalam disclosure; ringkasan berada di bawah.

Mode draft lama disimpulkan dari `item_id` tanpa mengganti snapshot dengan master terbaru. Metadata UI tidak masuk payload; ID katalog yang tersisa pada custom diabaikan. Belum menambahkan layar edit draft baru atau menyambungkan kandidat supplier fase 4.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/rfq/form/RfqCatalogItemPicker.vue` | Picker reusable, pagination, debounce dan version guard |
| `src/components/purchasing/rfq/form/RfqInitialNeedItemsSection.vue` | Mode katalog/custom, satuan katalog readonly dan layout |
| `src/services/rfqServices.js` | GET katalog RFQ |
| `src/utils/rfqSource.js` | Inferensi mode lama, apply/reset identitas, payload dan validasi |
| `tests/rfqSource.test.js` | Empat tes tambahan kontrak identitas/snapshot |
| `tests/browser/rfqInitialNeed.smoke.mjs` | Katalog/campuran, async, pagination, error/retry dan regresi PP |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm test` | 273 tes lulus |
| `npm run build` | Lulus; warning ukuran chunk >500 kB |
| `PLAYWRIGHT_MODULE_PATH=…/playwright/index.mjs CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome node tests/browser/rfqInitialNeed.smoke.mjs` | Lulus pada 1440 dan 390 px, API fixture |
| `git diff --check` | Lulus pada kedua repo |

Nama, ID, satuan, nullable estimasi dan custom diverifikasi pada payload submit campuran. Test juga memeriksa tidak ada horizontal overflow; screenshot `/tmp/rfq-catalog-phase3-{1440,390}.png`. Respons 422 dan 503 sengaja disimulasikan untuk validasi/error, bukan kegagalan layanan aktual.

## Risiko dan tindak lanjut

Browser belum menguji penyimpanan database nyata atau buka ulang draft melalui editor; kompatibilitas snapshot diuji pada helper. Lihat [catatan backend](/var/www/erp-backend/docs/changes/2026-11-16-rfq-catalog-supplier-selection-phase-3.md) untuk batas bukti dan tindak lanjut fase 4–6. UAT dan deployment belum dilakukan.

## Deployment dan pemulihan

Deploy frontend setelah API katalog fase 2 tersedia. Tidak memerlukan migration/config baru. Pemulihan dengan build frontend sebelumnya, tanpa perubahan data.
