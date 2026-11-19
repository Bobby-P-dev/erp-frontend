# PR - Visibilitas pilihan workflow pada modal pengajuan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-19 |
| Jenis | Perbaikan |
| Status pekerjaan | Selesai |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Dropdown workflow terpotong oleh area gulir modal Ajukan PR. Pengguna harus menggulir modal untuk menemukan opsi, walaupun pilihan sudah dibuka.

## Rencana dan solusi

Tampilkan pilihan workflow langsung sebagai radio di [modal Ajukan PR](../../src/components/purchasing/PurchaseRequisitionSubmitModal.vue). Batasi tinggi daftar untuk jumlah workflow yang banyak. Tampilkan urutan persetujuan setelah pengguna memilih workflow dan aktifkan tombol Ajukan PR setelah pilihan tersedia.

## Verifikasi dan hasil

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run build` | Lulus |
| `npm test` | 282 tes lulus |
| `tests/browser/prSubmitWorkflow.smoke.mjs` | Lulus di Chromium pada 1440 x 440 dan 390 x 440. Kedua pilihan workflow dapat diklik tanpa menggulir. Preview, payload pengajuan, serta kondisi gagal dan kosong teruji dengan respons API simulasi. |

## Tindak lanjut

UAT dengan data perusahaan dan status deployment belum diverifikasi.
