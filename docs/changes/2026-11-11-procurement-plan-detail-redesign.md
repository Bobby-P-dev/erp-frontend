# Rencana pengadaan — Redesign detail dan modal dari daftar

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

Detail menampilkan banner metode, dua kartu metadata panjang, workflow dan audit sebelum alokasi barang. Banyak teks, badge dan garis pemisah membuat informasi utama sulit dipindai. Daftar menavigasi pengguna keluar halaman, berbeda dengan pola preview PR. Parent detail juga mengambil tracker yang diambil kembali oleh komponen workflow. Total kuantitas menggabungkan barang dengan satuan berbeda.

## Tujuan dan kriteria penerimaan

- [x] Nomor dokumen dan tombol lihat di daftar membuka modal tanpa mengganti route/filter daftar.
- [x] URL detail tetap tersedia dengan komponen isi yang sama.
- [x] Identitas, status, aksi dan barang diprioritaskan; sumber PR, approval dan riwayat opsional.
- [x] Aktivasi, pembatalan dengan alasan, serta navigasi RFQ/direct purchase dipertahankan.
- [x] Fokus awal, siklus Tab, Escape dan pengembalian fokus tersedia.
- [x] Header/footer aplikasi tidak diubah.

## Cakupan dan rencana

1. Pisahkan isi detail dari route menjadi komponen bersama.
2. Hubungkan daftar dan modal sumber PR ke modal detail.
3. Ringkas metadata dan tabel, ambil approval saat panel pertama kali dibuka.
4. Verifikasi build, kontrak procurement dan interaksi browser dengan API fixture.

## Solusi dan keputusan

Modal mempertahankan konteks daftar untuk pemeriksaan sehari-hari. Tautan **Buka halaman penuh** menyediakan ruang untuk pemeriksaan panjang dan URL yang dapat dibagikan. Kedua bentuk menggunakan komponen yang sama agar tampilan dan aksi konsisten.

Tabel menjadi empat kolom: barang/jasa, alokasi beserta satuan, harga estimasi, subtotal. Catatan/referensi per barang menjadi disclosure. Total estimasi berada di bawah tabel; penjumlahan jumlah lintas satuan dihapus. Ponsel memakai tabel yang dapat digeser dengan petunjuk eksplisit.

Sumber PR tetap mendukung konsolidasi. Panel persetujuan menyebutkan bahwa tracker untuk PR utama bukan bukti persetujuan seluruh PR konsolidasi. Request tracker hanya berasal dari komponen workflow dan baru dipicu saat panel dibuka. Status PR tidak diberi label approved secara hardcoded.

Modal memiliki scroll konten, tombol tutup, semantik dialog, background aplikasi inert, pemulihan scroll/fokus, dan menjaga dialog konfirmasi bersama tetap dapat digunakan. Kegagalan load ditampilkan inline dengan tombol coba lagi, tanpa mengalihkan pengguna dari daftar.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/plan/ProcurementPlanDetail.vue` | Isi detail bersama, data/aksi, disclosure dan tabel empat kolom |
| `src/components/purchasing/plan/ProcurementPlanDetailModal.vue` | Pembungkus modal, navigasi halaman penuh dan interaksi keyboard |
| `src/views/purchasing/ProcurementPlanDetailView.vue` | Pembungkus halaman route menggunakan isi bersama |
| `src/views/purchasing/ProcurementPlanListView.vue` | Buka modal dan refresh daftar/antrean setelah perubahan status |
| `src/components/purchasing/plan/list/ProcurementPlansTab.vue` | Nomor dan tombol lihat mengirim event buka detail |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan ukuran chunk >500 kB masih ada |
| `node --test tests/procurementPlan.test.js` | 6 tes lulus |
| Chrome headless fixture, 1440/1024/390 px | 3 rangkaian skenario lulus; tidak ada pageerror atau overflow halaman |
| Modal dan keyboard | Route daftar tetap, empat kolom, Tab/Shift+Tab, Escape, fokus kembali dan background inert lulus |
| Disclosure dan approval | Sumber/item tampil; nol request tracker sebelum dibuka, satu request setelah buka/tutup ulang |
| Aktivasi/pembatalan | Konfirmasi, refresh detail, alasan wajib dan payload pembatalan lulus pada API fixture |
| Navigasi dan status | Halaman penuh, konsolidasi dua PR, direct purchase dengan plan_id, status completed/cancelled tanpa aksi mutasi lulus |
| Gagal load | Pesan inline dan coba lagi lulus |

Harness lokal: `/tmp/erp-plan-detail-preview.mjs`; log `/tmp/erp-plan-detail-browser.log`. Screenshot `/tmp/erp-plan-detail-modal-{1440,1024,390}.png` dan `/tmp/erp-plan-detail-page-{1440,1024,390}.png`. Berkas `/tmp` bersifat sementara. Tampilan desktop dan ponsel diperiksa dari screenshot. Tes browser menggunakan fixture; tidak mengubah transaksi asli.

## Risiko dan tindak lanjut

- [ ] UAT akun perusahaan dengan data rencana asli, hak akses, dan pesan validasi backend.
- [ ] Verifikasi transaksi aktivasi/pembatalan end-to-end pada lingkungan pengujian.
- [ ] Pengujian pembaca layar dan browser lain.
- [ ] Audit mata uang rencana konsolidasi terpisah; perhitungan tetap mengikuti kontrak nilai rencana/PR utama yang sudah digunakan.

## Deployment dan pemulihan

Belum ada deployment. Rilis frontend mengikuti prosedur proyek. Pemulihan menggunakan build frontend sebelumnya; perubahan ini tidak memerlukan migrasi database atau perubahan API.
