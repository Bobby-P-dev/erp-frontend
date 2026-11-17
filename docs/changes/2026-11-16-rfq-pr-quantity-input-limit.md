# RFQ — Batas langsung jumlah PR dari penawaran

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Perbaikan validasi frontend |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Ralat case 2: PR dari RFQ kebutuhan awal |
| Plan terkait | [RFQ frontend](../plans/rfq-frontend-alignment.md) |
| Status rilis | UAT perusahaan dan deployment belum diverifikasi |

## Masalah dan dampak

Input jumlah menerima 10 meskipun sisa RFQ hanya 1. Validasi saat melanjutkan menolak jumlah tersebut, tetapi nilai di form tetap berlebih. Pembagian ke beberapa supplier juga hanya ditolak setelah melanjutkan.

## Tujuan dan kriteria penerimaan

- [x] Sisa RFQ 1: mengetik atau mengisi 10 langsung menghasilkan nilai 1.
- [x] Batas mengikuti sisa kebutuhan, sisa penawaran dan alokasi ke supplier lain.
- [x] Pembagian 40/10 dari kebutuhan 50 tetap valid; 41/10 atau 40/11 tidak dapat dimasukkan.
- [x] Mendukung penghapusan sementara dan pengetikan desimal hingga empat angka desimal.
- [x] Teks tidak valid, negatif dan notasi eksponen tidak menggantikan nilai terakhir yang valid.
- [x] Pemeriksaan harga, penyimpanan draft dan retry tetap berfungsi pada desktop/ponsel.

## Cakupan dan rencana

1. Gunakan perhitungan maksimum yang sudah dipakai validasi PR.
2. Batasi jumlah pada event input; pulihkan DOM meskipun nilai state tetap sama.
3. Normalisasi titik desimal yang belum lengkap saat blur.
4. Tambahkan regresi unit/browser untuk kuota 1 dan pembagian supplier; jalankan build.

## Solusi dan keputusan

Jumlah berlebih langsung dikembalikan ke maksimum. Perhitungan memakai integer empat desimal untuk menjaga presisi. Handler berlaku untuk pengetikan dan pengisian/paste. Jumlah tetap dapat dikurangi untuk PR sebagian, selama positif dan tidak melebihi batas; input tidak dikunci permanen karena alokasi sebagian tetap didukung.

Input kosong/desimal yang sedang diketik dapat dipertahankan sementara; validasi sebelum pemeriksaan harga tetap menolak jumlah kosong/nol. Pesan kesalahan pilihan sebelumnya dibersihkan saat pilihan berubah. Tidak ada perubahan API atau kontrak backend.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/utils/rfqRequisition.js` | Helper pembatas jumlah berdasarkan `selectionMaximum`. |
| `src/components/purchasing/rfq/RfqRequisitionForm.vue` | Handler pembatas input, normalisasi blur dan pembersihan error pilihan lama. |
| `tests/rfqRequisition.test.js` | Regresi kuota, desimal presisi, input sementara dan teks tidak valid. |
| `tests/browser/rfqRequisition.smoke.mjs` | Kuota 1 desktop/ponsel dan batas kedua arah pembagian 40/10. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `node --test tests/rfqRequisition.test.js` | Lulus: 8 tes. |
| `node tests/browser/rfqRequisition.smoke.mjs` | Lulus 1440px dan 390px: kuota 1, teks/desimal, pembagian supplier, penolakan harga, biaya dan retry setelah reload. |
| `npm run build` | Lulus; peringatan ukuran chunk besar masih muncul. |
| `git diff --check` | Lulus. |

Browser memakai Playwright runtime Codex, Google Chrome lokal dan fixture API. Tidak membuat PR pada database perusahaan. Suite penuh tidak dijalankan ulang; pengujian berfokus pada utilitas jumlah dan alur form yang berubah.

## Risiko dan tindak lanjut

- [ ] UAT dengan RFQ kebutuhan awal yang mempunyai sisa kuota 1 dan supplier perusahaan.
- [ ] Konfirmasi kenyamanan input desimal bersama purchasing.

## Deployment dan pemulihan

Deployment belum dilakukan. Tidak ada migrasi. Pemulihan melalui pengembalian handler input dan helper pada file di atas.
