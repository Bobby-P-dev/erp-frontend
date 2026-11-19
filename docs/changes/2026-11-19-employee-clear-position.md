# Employee — Kosongkan Position saat edit

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-19 |
| Jenis | Perbaikan |
| Status pekerjaan | Selesai |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Form Employee memuat Position lama saat edit tanpa menyediakan tombol untuk mengosongkannya. Pengguna yang ingin menyimpan Division dan Job Level saja masih membawa Position lama ke payload.

## Rencana dan solusi

Aktifkan opsi `clearable` yang sudah tersedia pada `SearchableSelect` di [EmployeeView.vue](../../src/views/admin/master/EmployeeView.vue). Tombol hapus mengosongkan pilihan. Saat simpan, form mengirim `position_id: null` dan mempertahankan Division serta Job Level terpilih. Aturan minimal satu dari Position dan Job Level tetap berlaku.

## Verifikasi dan hasil

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run build` | Lulus |
| `npm test` | 282 tes lulus |
| Chromium 1440 px dan 390 px dengan data uji | Hapus Position lalu simpan. Payload memuat `position_id: null` bersama ID Division dan Job Level yang sama. |

## Tindak lanjut

Penyimpanan melalui API dengan data perusahaan dan status deployment belum diverifikasi.
