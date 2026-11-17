# Procurement — Sprint 2 fase 3: form PR dari penawaran

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-13 |
| Jenis | Fitur / hasil sprint |
| Status pekerjaan | Selesai implementasi dan pengujian lokal |
| Sprint / issue / PR | Sprint 2 inisiatif dua jalur, fase 3 |
| Plan terkait | [Rencana frontend](../plans/rfq-frontend-alignment.md), [rencana Sprint 2 backend](../../../erp-backend/docs/plans/procurement-two-entry-sprint-2.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Belum tersedia UI untuk mengubah penawaran RFQ kebutuhan awal menjadi draft PR melalui endpoint fase 2. Pengguna tidak dapat membagi supplier/jumlah, memeriksa biaya dan melihat hasil konversi.

## Tujuan dan kriteria penerimaan

- [x] Pilihan supplier per barang, jumlah dengan batas saldo dan satu mata uang/kurs.
- [x] Preview backend, ringkasan biaya di bawah, dan hasil draft PR.
- [x] Error validasi/konflik serta retry idempotent setelah koneksi putus/reload.
- [x] Desain full width, dua langkah, tombol konsisten dan responsif.

## Cakupan

RFQ sumber kebutuhan awal pada Perbandingan penawaran. Jalur PP/award existing tidak berubah. Approval PR dan PO baru mengikuti fase 4 dan 5.

## Rencana pengerjaan

1. Verifikasi endpoint convert, pricing preview dan saldo sumber.
2. Pisahkan form/helper/service dan integrasikan pada comparison.
3. Uji pembagian jumlah, harga gagal, penyimpanan dan retry.
4. Dokumentasikan hasil dan batasan fase berikutnya.

## Solusi dan keputusan

Form menggunakan dua langkah: pilih penawaran → lengkapi tanggal/tujuan dan periksa biaya. Ringkasan berada di bawah, tanpa sidebar. Pemohon/divisi berasal dari profil login, tanpa fallback ID hardcode. Informasi saldo berasal dari metadata backend, lalu dikurangi pilihan supplier lain dengan integer empat desimal. Preview dan penyimpanan menghitung harga di backend.

Saat save, payload dan UUID dibekukan serta disimpan di sessionStorage per user/RFQ. Respons hilang/5xx menampilkan Periksa hasil / coba lagi yang memakai request identik, termasuk setelah reload. Respons validasi/akses/konflik membuka form dan meminta preview baru. UUID memakai `getRandomValues` agar berfungsi pada hostname HTTP internal.

## Implementasi

| File / komponen | Perubahan |
| --- | --- |
| `src/components/purchasing/rfq/RfqRequisitionForm.vue` | Form, preview supplier, hasil draft dan retry. |
| `src/utils/rfqRequisition.js` | Validasi jumlah, split maksimum, grouping pilihan dan UUID. |
| `src/services/rfqServices.js` | `createRequisitionFromRfq`. |
| `src/views/purchasing/RfqComparisonView.vue` | Menampilkan form hanya untuk initial_need; blokir saat data gagal/loading. |
| `src/components/purchasing/rfq/detail/RfqSourceNotice.vue` | Petunjuk masuk ke comparison untuk membuat PR. |
| `tests/rfqRequisition.test.js`, `tests/browser/rfqRequisition.smoke.mjs` | Helper serta browser fixture. |
| `tests/browser/rfqTwoSources.integration.mjs` | Perluasan alur UI/API nyata menjadi draft PR. |

Tidak ada konfigurasi email/migration frontend. Backend metadata tambahan memerlukan versi backend fase 3 dan migration fase 2. [Catatan backend lengkap](../../../erp-backend/docs/changes/2026-11-13-procurement-sprint-2-phase-3.md).

## Verifikasi

| Skenario / perintah | Hasil | Catatan |
| --- | --- | --- |
| `npm test` | Lulus | 269 tes, termasuk regresi reaktivitas pilihan baru pada computed Vue. |
| `npm run build` | Lulus | Peringatan ukuran chunk existing masih muncul. |
| `tests/browser/rfqRequisition.smoke.mjs` | Lulus | Satu supplier, fixture 1440/390 px, split 40/10, tolak 40/11, tambah supplier setelah preview, harga gagal, ringkasan dan retry setelah reload dengan payload sama. Tidak membuat data aplikasi. |
| `tests/browser/rfqTwoSources.integration.mjs` | Lulus | UI/API Laravel nyata pada SQLite disposable: draft PR 10,5 dari 20,5, snapshot subtotal/pajak/total 105.000/11.550/116.550 dan sisa 10; jalur PP → award → PO tetap lulus. |
| Backend purchasing + kalkulator | Lulus | 376 lulus / 6 dilewati; 3.615 assertion. |
| `git diff --check` | Lulus | Kedua repo. |

Browser membutuhkan Playwright; set `PLAYWRIGHT_MODULE_PATH` bila package berada di luar repo dan `CHROME_EXECUTABLE_PATH` bila menggunakan Chrome sistem. Pada mesin ini digunakan dependency runtime Codex dan `/usr/bin/google-chrome`.

## Hasil

Pengguna dapat memilih dasar PR dari comparison dan melihat nomor draft beserta barang, supplier, jumlah, subtotal dan total. Kebutuhan tersisa dapat dibuat menjadi PR berikutnya. Draft konversi belum bisa diajukan/diubah melalui form PR biasa sampai lifecycle fase 4 tersedia.

Bug reaktivitas saat satu supplier dan saat menambah supplier setelah preview diperbaiki memakai operator `in` pada proxy pilihan Vue. Screenshot desktop lokal diperiksa: form full width, ringkasan di bawah dan tombol konsisten.

## Risiko dan batasan

Metadata saldo bukan jaminan reservasi sampai save berhasil. Retry sessionStorage hanya mencakup tab/session browser; validasi saldo akhir tetap backend. Belum UAT perusahaan atau rilis produksi.

## Deployment dan pemulihan

Rilis bersama backend metadata. Tanpa backend tersebut tombol tidak mengizinkan konversi. Rollback frontend tidak menghapus draft/alokasi yang tersimpan.

## Tindak lanjut

- [ ] Fase 4: approval/revisi/pembatalan PR dari penawaran.
- [ ] Fase 5: PO dari PR approved.
- [ ] Fase 6: UAT/rilis dan verifikasi konkurensi MySQL.
