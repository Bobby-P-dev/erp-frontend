# RFQ — Sprint 2 tahap 4: deadline dan perpanjangan

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-09 |
| Jenis | Integrasi frontend dan perbaikan alur |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint | Sprint 2 perbaikan RFQ, tahap 4 / case 7 |
| Kontrak backend | [Aturan dan endpoint deadline](../../../erp-backend/docs/changes/2026-11-09-rfq-sprint-2-stage-4-deadline.md) |
| Plan | [Penyesuaian RFQ](../plans/rfq-frontend-alignment.md) |
| Status rilis | Belum deployment/staging |

## Masalah

Countdown portal/dashboard memakai timezone dan jam browser. Detail buyer memakai batas tengah malam yang berbeda dari akhir hari portal. Computed tanpa jam reaktif tidak memperbarui countdown ketika halaman dibiarkan terbuka. Belum tersedia kontrol perpanjangan beserta riwayat, dan input manual tidak menjelaskan penolakan deadline baru dari backend.

## Solusi dan hasil implementasi

- Helper `rfqDeadline.js` membaca `server_now`, `deadline_at`, `is_expired`, dan `can_receive_quotation`. Composable `useRfqDeadline` menambahkan waktu berlalu dari `performance.now()`, memperbarui state tiap detik, dan membersihkan interval saat unmount. Tidak menghitung akhir hari dari timezone/jam browser. Penghitungan browser merupakan perkiraan tampilan; backend selalu memeriksa waktu aktual saat mutasi.
- Portal memeriksa kelayakan RFQ dan `portal.can_submit` sebelum mengirim. Decline juga memerlukan `portal.can_decline`. Setelah batas terlewati, form diganti pemberitahuan; nilai harga/file tetap disimpan di state sehingga bisa muncul kembali setelah perpanjangan.
- Portal mengambil metadata baru setiap 60 detik dan sesudah penolakan 422, dengan mempertahankan form dan lampiran. Tidak melakukan retry submit otomatis. Kegagalan refresh menampilkan error dan memblokir tindakan sampai pemuatan berhasil. Perpanjangan pada halaman yang terbuka terdeteksi pada refresh berikutnya.
- Dashboard supplier, daftar tender, serta detail buyer menggunakan helper yang sama. KPI/filter server mengikuti WIB; angka KPI atau keanggotaan tab tetap snapshot sampai pengguna menyegarkan daftar, sedangkan label countdown bergerak setiap detik.
- Detail buyer menyediakan form perpanjangan tanggal/alasan dan riwayat. Validasi penolakan server ditampilkan, tanggal terkini di-refresh, dan input alasan/tanggal pengguna dipertahankan saat gagal. Token dan status respons supplier tidak diubah. Form tidak dikirim ulang otomatis.
- Tombol input manual dinonaktifkan jika RFQ tidak menerima quotation. Pengaman pada pembukaan dan submit form tetap memeriksa metadata, termasuk ketika modal sudah terbuka lalu deadline lewat. Setelah 422, detail diperbarui tanpa menghapus input manual.
- Metadata yang belum tersedia/tidak valid memblokir tindakan baru; tidak memakai `deadline_date` sebagai fallback waktu browser. Deadline null didukung sebagai kompatibilitas kontrak, bukan fitur form baru.

## File utama

- `src/utils/rfqDeadline.js`, `src/composables/purchasing/useRfqDeadline.js`.
- Composable/detail buyer, layanan `extendRfqDeadline`, tampilan riwayat, dan tombol input manual.
- Composable/halaman portal, header batas WIB, dashboard, dan daftar supplier.
- `tests/rfqDeadline.test.js`, `tests/quotationValidity.test.js`: helper, timer sebenarnya dengan clock/lifecycle stub, dan state composable sebenarnya dengan API stub.

## Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test` | Lulus: 194 tes, 44 suite, 0 gagal; 7 tes tambahan dari tahap 3 |
| `npm run build` | Lulus; peringatan bundle font PDF besar tetap ada seperti baseline |
| Regresi backend RFQ/PO/portal/dashboard | Lulus: 65 tes, 633 assertion |

Pengujian mencakup batas milidetik, timestamp UTC/WIB setara, metadata tidak valid, interval/cleanup, refresh snapshot, input manual terblokir, penolakan perpanjangan, serta harga/lampiran yang dipertahankan setelah refresh portal. Tes menjalankan helper dan state composable sebenarnya dengan stub API/lifecycle. Build memeriksa template Vue; interaksi browser belum diuji.

`git diff --check` frontend masih melaporkan whitespace lama pada baris template `SupplierPortalRfqView.vue` yang sudah berubah sebelum tahap ini. Baris penambahan tahap ini diperiksa tanpa whitespace baru; perubahan lama dipertahankan.

## Risiko dan rilis

- Belum pengujian browser/API staging; build memeriksa sintaks template, bukan rendering dan interaksi browser nyata.
- Deadline snapshot bisa berubah di server ketika UI terbuka. Refresh portal maksimal sekitar satu menit dalam kondisi aktif; timer browser dapat ditunda ketika tab tidak aktif. Backend tetap pengaman transaksi terakhir.
- RFQ evaluation tetap menerima respons sebelum deadline sesuai alur portal yang sudah ada; dashboard sekarang menampilkan perilaku ini secara konsisten.
- Tidak menambahkan notifikasi email perpanjangan; pengiriman undangan masuk tahap 5.
- Deploy bersama backend tahap 4 setelah migrasi audit. Perubahan workspace sebelumnya dipertahankan; belum commit/push/deploy.

## Tindak lanjut

- [ ] Uji lintas timezone browser, tengah malam WIB, perpanjangan ketika form terbuka, refresh gagal, serta kontrol form/riwayat pada staging.
- [ ] Lanjutkan tahap 5 dan regresi lintas alur tahap 6.
