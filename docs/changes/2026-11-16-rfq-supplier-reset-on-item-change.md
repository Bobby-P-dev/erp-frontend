# RFQ — Reset supplier ketika barang berubah

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Perbaikan perilaku form |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Ralat case 1 setelah perapihan form RFQ |
| Plan terkait | [RFQ frontend](../plans/rfq-frontend-alignment.md) |
| Status rilis | Deployment dan UAT perusahaan belum diverifikasi |

## Masalah dan dampak

Pilihan supplier sebelumnya dipertahankan saat barang berubah. Sesuai koreksi requirement, pengguna ingin mulai memilih ulang supplier yang relevan dengan barang terbaru, tanpa membawa pilihan dari barang sebelumnya. Filter pencarian lama juga dapat menyembunyikan kandidat terbaru.

## Tujuan dan kriteria penerimaan

- [x] Mengganti/menambah/menghapus barang mengosongkan supplier yang dipilih.
- [x] Nama barang custom dan perpindahan katalog/custom juga membatalkan pilihan lama.
- [x] Pencarian dikosongkan, halaman kembali ke 1 dan mode rekomendasi dipulihkan.
- [x] Barang katalog menampilkan kandidat sesuai katalog terbaru; tanpa katalog, kandidat tetap semua supplier aktif.
- [x] Edit jumlah/harga dan pencarian/pagination supplier mempertahankan pilihan.
- [x] Respons pemeriksaan supplier lama tidak memulihkan pilihan yang sudah dihapus.

## Cakupan dan rencana

1. Pantau identitas daftar barang di composable kandidat supplier.
2. Reset pilihan, cache pilihan dan filter; muat kandidat terbaru.
3. Tambahkan pemberitahuan reset serta koreksi petunjuk form.
4. Perbarui regresi browser dan jalankan build.

## Solusi dan keputusan

Perubahan identitas barang memicu reset pilihan secara sinkron. Request pemeriksaan pilihan sebelumnya dibatalkan secara logis melalui versi request. Kandidat dikosongkan selama memuat ulang agar pilihan lama tidak dapat ditambahkan kembali. Pengguna melihat pemberitahuan untuk memilih supplier ulang. Supplier baru tetap dipilih manual; sistem tidak otomatis mengundang kandidat.

Identitas mencakup mode barang, ID katalog/asal PP dan nama custom. Jumlah, estimasi harga dan catatan tidak memicu reset. Perilaku ini menggantikan keputusan lama untuk mempertahankan supplier saat daftar barang berubah; retensi saat pencarian/pagination tetap berlaku.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/composables/purchasing/useRfqSupplierCandidates.js` | Watch identitas barang, reset pilihan/filter, invalidasi request dan notice. |
| `src/components/purchasing/rfq/form/RfqSuppliersInviteSection.vue` | Pemberitahuan reset dan petunjuk yang sesuai perilaku baru. |
| `tests/browser/rfqSupplierCandidates.smoke.mjs` | Reset katalog/custom/tambah/hapus, kandidat terbaru, preservasi jumlah/harga dan respons lama. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `node tests/browser/rfqSupplierCandidates.smoke.mjs` | Lulus 1440px dan 390px: reset saat barang berubah, mode rekomendasi, supplier relevan, jumlah/harga tidak mereset, respons lama tidak mengembalikan pilihan, pencarian/pagination, retry, supplier nonaktif dan 101 pilihan. |
| `npm run build` | Lulus; peringatan ukuran chunk besar tetap ada. |
| `git diff --check` | Lulus. |

Browser memakai Playwright runtime Codex, Google Chrome lokal dan fixture API. Tidak mengirim undangan maupun menulis transaksi nyata. Suite unit penuh tidak dijalankan ulang untuk koreksi ini; verifikasi difokuskan pada perilaku composable/UI yang berubah dan build.

## Risiko dan tindak lanjut

- [ ] UAT dengan katalog dan pemetaan supplier perusahaan pada form create RFQ.
- [ ] Verifikasi kenyamanan reset pilihan saat menambah barang bersama pengguna purchasing.

## Deployment dan pemulihan

Deployment belum dilakukan. Tidak ada migrasi/perubahan API. Pemulihan melalui pengembalian perubahan composable dan petunjuk UI pada catatan ini.
