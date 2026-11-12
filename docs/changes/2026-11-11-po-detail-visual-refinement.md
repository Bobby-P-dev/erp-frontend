# Purchasing — Detail PO yang clean dan lebih hidup

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX dan dokumentasi |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Penyempurnaan desain Purchasing |
| Plan terkait | [Redesign internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Pengguna menilai detail PO masih terlalu polos. Pada screenshot, rincian spesifikasi terbuka panjang di kolom barang dan memisahkan angka jumlah/harga dari identitas barang sehingga pemindaian informasi sulit.

## Tujuan dan kriteria penerimaan

- [x] Catat pedoman clean, hidup, interaktif secukupnya tanpa dekorasi berlebihan.
- [x] Angka jumlah dan harga tetap berada di baris identitas barang.
- [x] Detail tambahan desktop memakai lebar tabel; ponsel tetap menggunakan kartu.
- [x] Gunakan aksen lembut, ikon berlabel, tab dan disclosure dengan fokus serta hover yang jelas.

## Cakupan dan rencana

1. Telusuri komponen detail PO dengan graph dan source terarah.
2. Perbaiki ruang rincian barang dan hierarki visual.
3. Catat prinsip desain, jalankan build dan browser fixture yang sudah tersedia.

## Solusi dan keputusan

Rincian spesifikasi/sumber di desktop ditempatkan dalam baris tersendiri dengan colspan empat kolom. Isi disclosure dibagi dua kolom pada layar cukup lebar; pada ponsel satu kolom. Identitas barang, jumlah, harga dan subtotal tetap sejajar di atasnya. Informasi status diberi latar lembut dan garis aksen, ringkasan pesanan serta biaya memakai penekanan warna ringan. Ikon, hover/fokus dan dukungan reduced-motion yang sudah ada dipertahankan.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/order/PurchaseOrderDetail.vue` | Rincian desktop selebar tabel, penekanan status, ringkasan dan biaya |
| `src/components/purchasing/order/PurchaseOrderItemDetails.vue` | Grid rincian responsif |
| `docs/guides/design-principles.md` | Acuan desain seluruh perkembangan berikutnya |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan chunk lebih besar dari 500 kB tetap ada |
| `tests/browser/purchaseOrderRedesign.smoke.mjs` melalui Playwright dan Chrome lokal | Lulus pada 1440, 1024 dan 390 px: daftar, pagination, filter status, modal, mata uang, disclosure, edit, terbitkan, batal, fokus, retry dan URL langsung |
| `git diff --check` | Lulus |

Screenshot fixture: `/tmp/po-detail-{1440,1024,390}.png`. Tidak mengubah endpoint, aturan transaksi, approval, header atau footer. Tes browser memakai fixture terisolasi, bukan transaksi produksi. Suite unit penuh tidak dijalankan ulang untuk perubahan tampilan ini.

## Risiko dan tindak lanjut

- [ ] Review pengguna pada data asli, khususnya banyak barang dan spesifikasi panjang.
- [ ] Verifikasi deployment dan UAT akun perusahaan.

## Deployment dan pemulihan

Belum melakukan deployment. Untuk pemulihan, kembalikan hanya perubahan visual dalam catatan ini; pertahankan pekerjaan lain yang sudah ada di workspace.
