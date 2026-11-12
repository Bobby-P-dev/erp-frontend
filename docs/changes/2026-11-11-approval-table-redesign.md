# Purchasing — Redesign approval dan pola tabel bersama

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan tampilan / komponen reusable |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Redesign antarmuka internal |
| Plan terkait | [Redesign dashboard](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Tabel persetujuan memiliki delapan kolom, badge jenis dokumen berulang, font berat dan status/SLA yang berjauhan. Header halaman serta toolbar juga menambah kepadatan. Gaya ringan daftar PR masih berada dalam CSS halaman, sehingga sulit dipakai ulang.

## Tujuan dan kriteria penerimaan

- [x] Approval mengikuti hierarki tabel PR dengan enam kolom tanpa kehilangan informasi penting.
- [x] Dasar visual tabel dipusatkan pada komponen bersama.
- [x] PR dan approval memakai sel dokumen serta pencarian yang sama.
- [x] Tab, pencarian, pagination, tinjau, status, SLA dan visibilitas PDF tetap berfungsi pada fixture.

## Cakupan dan rencana

1. Telusuri graph frontend, coverage dan sumber approval/PR/BaseTable.
2. Pindahkan gaya header/baris PR ke BaseTable; ekstrak sel dokumen dan gunakan SearchInput yang sudah tersedia.
3. Susun ulang approval; uji PR, approval dan sampel konsumen BaseTable lain.
4. Catat pola penggunaan dan batasan pengujian.

## Solusi dan keputusan

- Enam kolom approval: pengajuan, pemohon/divisi, tahap, estimasi, status/tindak lanjut, aksi.
- Jenis dokumen menjadi metadata pengajuan. Dropdown kategori satu opsi dihapus; request tetap dibatasi ke purchase_requisition.
- Status dipasangkan dengan SLA untuk pending atau keputusan/waktu untuk riwayat. Varian badge subtle tidak memakai lingkaran ikon bertingkat.
- Nilai nol ditampilkan sebagai Rp 0. SLA null tidak lagi dibaca sebagai mendekati batas waktu; tanggal pembuatan tidak ditampilkan seolah-olah deadline.
- Header halaman lebih ringan, tab dapat membungkus di layar kecil, scroll horizontal hanya pada tabel.
- BaseTable menyediakan tipografi header 0.75rem, padding sel 16/20px, pemisah lembut, fokus keyboard, label region, scope header dan opsi minWidth/layout/busy. Dasar ini berlaku pada konsumen BaseTable lain tanpa mengganti susunan kolomnya.
- Listener pagination PR/approval memakai satu event; komponen Pagination mengirim dua nama event kompatibilitas, sehingga memasang keduanya menyebabkan dua fetch. Reset pencarian cukup melalui watcher; pergantian tab membatalkan timer pencarian lama.
- Tidak mengubah endpoint, keputusan approval, aturan PDF, header/footer aplikasi, maupun isi modal review.

## Implementasi

| File | Perubahan |
| --- | --- |
| src/components/ui/BaseTable.vue | Pola tabel bersama dan parameter layout/aksesibilitas. |
| src/components/ui/TableDocumentCell.vue | Tombol nomor dokumen, deskripsi terpotong dengan title, metadata jenis. |
| src/components/ui/SearchInput.vue | Opsi compact/clearable/label; fokus kembali ke input sesudah reset. |
| src/components/approval/ApprovalBadge.vue | Varian subtle opsional, varian lama tetap tersedia. |
| src/views/purchasing/PurchasingApprovalInboxView.vue | Redesign halaman, enam kolom dan penggabungan informasi. |
| src/views/purchasing/PurchaseRequisitionListView.vue | Memakai pola bersama, menghapus CSS tabel duplikat. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| npm run build | Lulus; peringatan chunk besar masih ada. |
| node --test tests/approval.test.js tests/purchaseRequisition.test.js | 34 tes lulus. |
| node /tmp/erp-approval-preview.mjs | 3 viewport: 1440/1024/390 px; enam kolom, nama/deskripsi panjang, tidak ada tabrakan sel/overflow halaman/error runtime, tinjau dengan keyboard, pagination satu request, pencarian/no match/reset, riwayat dan visibilitas PDF lulus. |
| node /tmp/erp-pr-preview.mjs | 3 viewport: jumlah kolom, visibilitas aksi, filter, pencarian, page size, pagination, detail dan layout PR lulus. |
| node /tmp/erp-table-smoke.mjs | PO dan master mata uang pada 1440/390 px: header bersama, rendering baris, tanpa overflow halaman/error runtime lulus (4 skenario). |

Browser menggunakan API fixture. Pengujian visibilitas PDF tidak membuat/menyimpan PDF. Status/SLA diperiksa lewat fixture pending, warning, overdue dan tanpa deadline; bukan transaksi persetujuan nyata. Bukti sementara: /tmp/erp-approval-1440.png, /tmp/erp-approval-390.png, /tmp/erp-approval-history-1440.png.

## Risiko dan tindak lanjut

- [ ] UAT akun nyata, aksi persetujuan/penolakan dan unduh PDF dengan data perusahaan.
- [ ] Review halaman lain yang memakai BaseTable; perubahan dasar berlaku bersama, tetapi belum seluruh halaman diuji satu per satu.
- [ ] Tabel HTML khusus yang belum memakai BaseTable perlu dimigrasikan sesuai struktur datanya. Tidak mengklaim semua susunan tabel ERP sudah selesai didesain ulang.
- [ ] Fallback data mock pada service approval ketika HTTP 401/404 sudah ada sebelum perubahan; tidak diubah dalam pekerjaan presentasi ini.

## Deployment dan pemulihan

Belum ada bukti deployment. Pulihkan hanya diff enam file implementasi pada pekerjaan ini, pertahankan perubahan sebelumnya, lalu build ulang frontend.

Panduan pengembangan: [Pola tabel](../guides/table-pattern.md).
