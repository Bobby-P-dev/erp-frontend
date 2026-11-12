# Purchasing — Redesign preview approval

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan tampilan / komponen reusable |
| Status pekerjaan | Selesai implementasi dan pemeriksaan lokal |
| Sprint / issue / PR | Redesign antarmuka internal |
| Plan terkait | [Redesign dashboard](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Preview approval memiliki delapan kolom, ringkasan dalam kartu bertingkat, banyak label kapital serta alur dokumen dan audit yang langsung memenuhi layar. Pengguna perlu memindai banyak elemen sebelum mengambil keputusan. Komponen ini juga dipakai review quotation sehingga mata uang, izin dan perhitungan harus dipertahankan.

## Tujuan dan kriteria penerimaan

- [x] Keperluan, nilai, pemohon dan target kebutuhan menjadi ringkasan utama.
- [x] Tabel PR lima kolom menggunakan pola BaseTable bersama; quotation empat kolom.
- [x] Detail pemohon, catatan item, alur dan audit tersedia melalui panel yang bisa dibuka.
- [x] Penolakan item, batal tolak dan total efektif tetap berfungsi pada fixture.
- [x] Tombol keputusan terlihat di ponsel; overflow dibatasi pada tabel.

## Cakupan dan rencana

1. Telusuri komponen dengan skill codebase-memory, coverage dan sumber terarah.
2. Pisahkan ringkasan, pakai tabel bersama dan disclosure reusable.
3. Periksa build, kontrak PR/approval/quotation dan browser fixture.
4. Dokumentasikan hasil; lanjutkan review akun nyata sebelum rilis.

## Solusi dan keputusan

- Ringkasan tanpa kartu bertingkat; keperluan dan total di atas, metadata tiga kolom pada desktop dan vertikal pada ponsel.
- Jumlah dan satuan digabung; nomor urut dihapus; catatan/referensi dipindahkan ke detail barang yang dapat dibuka. Header tabel menggunakan kapitalisasi normal dan bobot font lebih ringan.
- Alur persetujuan dibuka sesuai kebutuhan, dengan tahapan approval sebagai tab awal. Riwayat aktivitas menjadi panel terpisah. Panel ringkasan/alur/audit direset saat dokumen berganti melalui key dokumen.
- Quotation tetap menampilkan mata uangnya; ketentuan supplier, versi, pembayaran, lead time, validitas, pajak dan ongkir tersedia pada disclosure. Label total quotation menjelaskan bahwa pajak dan ongkir termasuk.
- BaseTable mendapat slot footer opsional. Tidak mengubah fungsi keputusan, API, aturan maker-checker atau header/footer aplikasi.
- Bilah aksi modal membungkus pada ponsel, aksi utama selebar baris; tinggi modal dibatasi viewport dan konten dapat digulir. Tabel menyediakan petunjuk geser dan region fokus keyboard.

## Implementasi

| File | Perubahan |
| --- | --- |
| src/components/approval/ApprovalReviewDrawer.vue | Susunan preview, tabel bersama, disclosure dan footer responsif. |
| src/components/approval/ApprovalReviewSummary.vue | Ringkasan dokumen dan detail pemohon/catatan. |
| src/components/ui/ReviewDisclosure.vue | Disclosure native reusable, fokus keyboard dan indikator buka/tutup. |
| src/components/ui/BaseTable.vue | Slot footer opsional untuk total. |
| docs/guides/table-pattern.md | Panduan footer dan disclosure. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| npm run build | Lulus; peringatan chunk >500 kB masih ada. |
| node --test tests/approval.test.js tests/purchaseRequisition.test.js | 34 tes lulus. |
| node --test tests/quotationReview.test.js | 12 tes lulus, termasuk pengaman izin/refresh dan keputusan quotation. |
| node /tmp/erp-review-preview.mjs | Enam skenario fixture: PR 1440/1024/390 px, quotation USD 1440/390 px, PR tanpa izin pada 390 px. Jumlah kolom, tidak ada overflow halaman/modal, visibilitas aksi sesuai izin, total parsial/seluruh item ditolak/batal tolak, detail item, ketentuan quotation, disclosure keyboard dan tidak ada error runtime diperiksa. |
| node /tmp/erp-approval-preview.mjs | Regresi inbox PR/approval 1440/1024/390 px lulus: enam kolom, pencarian, reset, pagination satu request, riwayat dan visibilitas PDF. |
| git diff --check | Lulus. |

Harness browser di /tmp bersifat sementara dan memakai respons API fixture, bukan akun produksi. Pemeriksaan visual dilakukan melalui screenshot desktop/ponsel. Tidak mengirim persetujuan transaksi nyata atau email.

## Risiko dan tindak lanjut

- [ ] UAT akun nyata dengan PR panjang, item ditolak permanen pada tier sebelumnya, quotation mata uang lain dan riwayat aktivitas aktual.
- [ ] Verifikasi tindakan end-to-end dengan backend, signature dan konflik approver secara nyata sebelum rilis.
- [ ] Tabel ponsel tetap memakai scroll horizontal agar angka dan keputusan tidak dipadatkan.

## Deployment dan pemulihan

Belum ada bukti deployment. Rilis melalui proses frontend yang berlaku; jika perlu pemulihan, kembalikan perubahan presentasi ini melalui Git tanpa menimpa pekerjaan frontend lain. Tidak ada migrasi backend.
