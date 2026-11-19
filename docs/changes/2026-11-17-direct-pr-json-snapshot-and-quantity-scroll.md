# PR langsung → PO — validasi JSON dan jumlah berubah saat scroll

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-17 |
| Jenis | Perbaikan |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Lanjutan PR supplier langsung → PO; belum commit/push |
| Status rilis | Belum diverifikasi; UAT pengguna belum dilakukan |

## Masalah dan dampak

1. Pembuatan draft PO dari PR approved ditolak dengan “Barang, jumlah, atau harga PR berubah dari dasar approval” walaupun nilainya tidak berubah.
2. Jumlah 30 pada form PR menjadi 28 sebelum draft tersimpan.

Diagnosis read-only database lokal: PR 48 approved memiliki snapshot dan barang dengan field/nilai sama tetapi urutan key JSON berbeda. Perbandingan array PHP `===` menganggapnya berbeda. MySQL menyusun ulang key object JSON; tes SQLite sebelumnya tidak mereproduksi perilaku ini. PR 49 draft memang menyimpan jumlah 28, tanpa commercial snapshot.

Browser Chrome dengan komponen asli `PRItemRow` mereproduksi tepat 30 → 28 setelah dua scroll ke bawah saat input number fokus. Input mengubah nilai sebelum payload dikirim. Tes API terpisah memastikan input 30 tetap tersimpan/dibaca sebagai 30.

## Tujuan dan kriteria penerimaan

- [x] Urutan key JSON tidak menggagalkan pembuatan/penerbitan PO jika field dan nilainya identik.
- [x] Perubahan harga, jumlah atau ketentuan yang nyata tetap ditolak.
- [x] Scroll pada input angka tidak mengubah jumlah, sementara input manual/desimal tetap bekerja.
- [x] Tes reproduksi dan dokumentasi ditambahkan.

## Cakupan dan rencana

Telusuri simpan PR → snapshot approval → pembuatan/penerbitan PO dengan Codebase Memory dan sumber terarah, reproduksi kedua kasus sebelum perbaikan, perbaiki service/komponen reusable, jalankan regresi lalu catat hasil. File controller PO yang sudah berubah sebelumnya tidak disentuh.

## Solusi dan implementasi

- Backend `DirectRequisitionPurchaseOrderService`: helper `matchesSnapshot` mengurutkan key object datar sebelum membandingkan nilai secara strict. Digunakan pada ketentuan PR, baris snapshot approval dan pricing snapshot PO. Tidak melonggarkan perbandingan tipe/nilai dan tidak membuat ulang dasar approval.
- Backend `DirectRequisitionTest`: regresi untuk key JSON yang diubah urutannya pada terms/baris PR/PO, penolakan perubahan harga/terms nyata, serta simpan/baca draft 30.
- Frontend `BaseInput.vue`: input number melepas fokus pada wheel sehingga halaman tetap dapat discroll tanpa native increment/decrement. Berlaku untuk penggunaan BaseInput di seluruh aplikasi, termasuk jumlah dan harga PR; tombol panah keyboard tetap tersedia.
- Frontend `tests/browser/prQuantity.smoke.mjs`: komponen PRItemRow asli, simulasi mouse wheel, simpan payload fixture dan input desimal pada viewport 1440/390. Tes memakai API/aksi fixture dan tidak membuat PR nyata.

## Verifikasi

| Skenario / perintah | Hasil |
| --- | --- |
| Tes reproduksi sebelum fix `--filter='json_object_key_order\|thirty_units'` | 1 gagal pada key JSON (422), 1 lulus pada penyimpanan 30 |
| Browser sebelum fix `prQuantity.smoke.mjs` | Gagal: 30 menjadi 28 setelah dua wheel |
| Tes DirectRequisition setelah fix awal | 13 lulus, 99 assertions; lalu ditambah tes proteksi perubahan harga/terms |
| Regresi final DirectRequisition, RfqRequisition, PurchaseOrderWorkflow, PurchaseRequisitionController/Service | 129 total: 119 lulus, 10 dilewati; 1439 assertions; SQLite disposable |
| Validasi ulang approvedLines PR 48 pada MySQL lokal secara read-only | Lulus, 1 baris dengan jumlah 50; tidak membuat PO atau mengubah PR |
| Browser final `prQuantity.smoke.mjs` | Lulus 1440/390: tetap 30 setelah scroll, payload fixture 30 dan desimal 30.5 |
| `npm test` | 278 lulus |
| `npm run build` | Lulus; peringatan chunk besar masih ada |
| Pint service dan tes backend | Lulus |

Browser menggunakan `PLAYWRIGHT_MODULE_PATH=/home/bobby/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs` dan Chrome lokal. Tidak menambah dependency proyek.

## Hasil dan batasan

Validasi approved PR 48 sudah lolos dengan snapshot yang tersimpan sebelumnya. Snapshot atau transaksi historis tidak ditulis ulang. Draft 49 tetap bernilai 28; pengguna perlu mengeditnya ke 30 bila itu kebutuhan yang benar. Reproduksi membuktikan scroll dapat menjelaskan gejala, tetapi tidak ada rekaman browser/payload kejadian pengguna yang lalu untuk memastikan gerakan yang dilakukan saat itu.

## Deployment dan pemulihan

Tidak memerlukan migrasi. Deploy service backend dan build frontend yang sesuai. Belum ada bukti deployment/penerbitan PO akun nyata. Pemulihan melalui revert perubahan kode; data transaksi tidak dihapus atau diubah otomatis.

## Tindak lanjut / UAT

- [ ] Refresh aplikasi, ulangi buat draft PO dari PR approved yang tadi ditolak, lalu cek jumlah/harganya sebelum terbitkan.
- [ ] Edit draft dengan kebutuhan 30, lakukan scroll pada form dan pastikan tetap 30 setelah simpan/buka ulang.
- [ ] UAT perusahaan dan deployment.
