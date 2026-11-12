# Direct Purchase — Redesign form pembelian langsung

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Redesign antarmuka internal |
| Plan terkait | [Redesign internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi; UAT data asli terbuka |

## Masalah dan dampak

Form create membagi toko/barang dan pembayaran/ringkasan ke dua kolom dengan sidebar sticky. Bagian kiri menyisakan ruang kosong sedangkan kanan menumpuk banyak input. Pilihan marketplace dan bank menjadi deretan tombol kecil. Detail barang otomatis terbuka ketika link atau catatan sudah ada, sehingga tombol tutup tidak benar-benar menyembunyikan detail tersebut. Tombol Batal tidak memiliki bentuk yang konsisten. Nomor rencana menggunakan fallback PLAN meskipun respons memiliki pp_number.

## Tujuan dan kriteria penerimaan

- [x] Satu alur vertikal: sumber kebutuhan, toko, barang, pembayaran, ringkasan dan aksi.
- [x] Ringkasan berada di bawah seluruh input, tanpa sidebar.
- [x] Detail item dapat ditutup tanpa menghapus nilai yang tersimpan.
- [x] Pilihan saluran/metode memakai radio native dengan dukungan keyboard.
- [x] Input barang disusun sebagai kartu pada ponsel tanpa scroll halaman horizontal.
- [x] Tombol utama biru solid, draft outline biru dan batal netral dengan ukuran konsisten.
- [x] Draft, pembayaran, kuota, mata uang dan bulk tetap bekerja pada fixture.

## Cakupan dan rencana

Audit view/composable dan komponen melalui graph serta sumber terkait; ubah presentasi dengan diff terbatas; jalankan build, tes kontrak dan browser fixture. Komponen form digunakan juga oleh edit, sehingga lakukan pemeriksaan regresi komponen pada halaman edit. Tidak mengubah composable bisnis, endpoint atau backend. Header/footer aplikasi tetap.

## Solusi dan keputusan

- Form mengikuti lebar penuh konten halaman; panel diberi heading lebih jelas, jarak lebih longgar serta input minimal 42 px pada create.
- Radio saluran menampilkan konteks pendek. Marketplace dan bank menggunakan input teks biasa tanpa datalist atau deretan chip.
- Pembayaran menjelaskan bahwa rekening dapat dilengkapi setelah menyimpan draft. Kondisi cash, field rekening dan aturan validasi yang sudah ada dipertahankan.
- Detail link/catatan/diskon item hanya dibuka lewat tombol; ada indikator detail tersimpan. Nilai tidak dihapus ketika panel ditutup dan tetap masuk payload.
- Tabel barang tetap untuk desktop, dengan kartu pada layar di bawah 768 px. Input diberi nama aksesibel dan pesan error dihubungkan ke input. Pilihan tambah item di edit dibatasi lebar agar tidak meluber pada ponsel.
- Metode pembayaran menggunakan grid yang menyesuaikan lebar kontainer, termasuk sidebar edit. Struktur halaman edit secara keseluruhan belum didesain ulang.
- Ringkasan dan pengaturan ongkir/diskon/pajak berada di bawah; dukungan desimal pada input biaya diperjelas dengan step any. Kalkulasi tetap berasal dari composable yang sama.
- Tombol simpan disabled selama memuat rencana atau mengirim data. Tidak mengubah aturan persetujuan/pembayaran. Desain merupakan adaptasi aplikasi, bukan klaim tampilan standar ERPNext.

## Implementasi

| File | Perubahan |
| --- | --- |
| [DirectPurchaseCreateView.vue](../../src/views/purchasing/DirectPurchaseCreateView.vue) | Susunan satu kolom, heading, ringkasan/aksi bawah dan gaya create. |
| [DPPlanSection.vue](../../src/components/purchasing/direct/form/DPPlanSection.vue) | Heading sumber kebutuhan dan nomor pp_number yang benar. |
| [DPChannelSection.vue](../../src/components/purchasing/direct/form/DPChannelSection.vue) | Radio saluran, input teks marketplace dan nama input. |
| [DPItemsTableSection.vue](../../src/components/purchasing/direct/form/DPItemsTableSection.vue) | Detail benar-benar opsional, kartu mobile, label/error input dan lebar kontrol tambah item. |
| [DPPaymentInfoSection.vue](../../src/components/purchasing/direct/form/DPPaymentInfoSection.vue) | Radio metode responsif, input teks bank dan penjelasan draft. |
| [DPCostSummarySection.vue](../../src/components/purchasing/direct/form/DPCostSummarySection.vue) | Heading ringkasan, input berlabel, aria-expanded dan grid biaya mobile. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan chunk >500 kB tetap ada. |
| `node --test tests/directPurchase.test.js tests/bulkDirectPurchase.test.js` | 17 tes kontrak lulus; bukan bukti integrasi API nyata. |
| `git diff --check` | Lulus. |
| Browser create 1440/1024/390 px | Tanpa overflow halaman/runtime error; ringkasan berada setelah pembayaran. Screenshot desktop dan ponsel ditinjau. |
| Detail barang | Link/catatan bawaan tertutup; buka, ubah dan tutup mempertahankan nilai. Diskon/catatan/link diverifikasi dalam payload draft. |
| Saluran/pembayaran | Radio keyboard, marketplace/retail, cash menyembunyikan rekening dan VA membutuhkan nomor sebelum pengajuan lulus. |
| Validasi/kalkulasi | Kuota berlebih tidak mengirim POST; input mendapat aria-invalid. Kuantitas 1,5, ongkir/diskon/platform/pajak serta mata uang USD/kurs lulus. |
| Simpan draft | Satu create dengan procurement_plan_id, item, nilai desimal dan biaya yang sesuai fixture. |
| Ajukan pembayaran | Create lalu submit-for-payment dengan rekening dan mata uang yang sesuai fixture. |
| Bulk | Hapus item, POST bulk dengan sumber item PR/company/submit_for_payment dan pembersihan sessionStorage lulus. |
| Form kosong | Tombol draft dan pengajuan disabled. |
| Browser komponen pada edit 1440/1024/390 px | Nilai draft, kuota dengan mengecualikan alokasi sendiri, tutup/buka detail, radio cash dan lebar halaman diperiksa. Tidak mencakup PATCH edit end-to-end. |

Semua API browser disimulasikan. Tidak membuat transaksi atau pembayaran nyata. Harness sementara: `/tmp/erp-dp-create-preview.mjs`, `/tmp/erp-dp-edit-preview.mjs`; log: `/tmp/erp-dp-create-browser.log`, `/tmp/erp-dp-edit-browser.log`; screenshot create: `/tmp/erp-dp-create-{1440,1024,390}.png`. Artefak /tmp bukan bagian permanen repository.

### Koreksi lebar dan input — 2026-11-11

Sesuai review pengguna, hapus pembatas max-w-6xl/mx-auto agar tepi form sejajar dengan konten halaman. Datalist pada marketplace dan bank dihapus karena browser menampilkan indikator dropdown, padahal pengguna mengharapkan input teks biasa. Select yang memang berisi pilihan, seperti mata uang dan kategori penerima, tetap dipertahankan. Koreksi ini juga berlaku pada input bersama di halaman edit. Build dan browser fixture 1875/1024/390 px dijalankan untuk memeriksa kesamaan lebar form/konten, ketiadaan input[list]/datalist, serta regresi alur create. Bukti sementara: `/tmp/erp-dp-create-width-preview.mjs`, `/tmp/erp-dp-create-width-browser.log`, `/tmp/erp-dp-create-width-build.log`.

## Risiko dan tindak lanjut

Hasil koreksi: build dan diff check lulus. Fixture 1875/1024 px lulus; skenario konfirmasi pembayaran pada 390 px sempat timeout, lalu pengujian ulang khusus ponsel lulus (termasuk lebar, input teks dan regresi transaksi). Log pengujian ulang: `/tmp/erp-dp-create-width-mobile.log`. Tidak ada perubahan backend atau transaksi nyata.

- [ ] UAT akun nyata, pilihan supplier, seluruh metode pembayaran dan respons validasi backend.
- [ ] Review kegagalan submit setelah create berhasil; alur lama masih dipertahankan.
- [ ] Aksesibilitas SearchableSelect bersama, pergantian rencana saat request lambat dan pagination pemilih sumber tetap pekerjaan terpisah.
- [ ] Redesign struktur halaman edit/detail jika diminta; perubahan saat ini memeriksa kompatibilitas komponen bersama.
- [ ] Verifikasi deployment dan tampilan dengan shell aplikasi lengkap.

## Deployment dan pemulihan

Belum deployment; tidak ada migrasi database. Pemulihan dengan mengembalikan diff khusus enam file di atas, tanpa menimpa perubahan frontend lainnya.
