# Redesign dashboard internal

Tanggal: 2026-11-11. Status: dashboard awal selesai implementasi dan pemeriksaan lokal; review pengguna/UAT dan rilis belum diverifikasi.

## Target

Arah desain lintas modul: [clean, modern, elegan, hidup dan interaktif secukupnya](../guides/design-principles.md), tanpa dekorasi berlebihan. Penyempurnaan detail PO menempatkan disclosure barang selebar tabel dan memperjelas hierarki ringkasan/status; [catatan perkembangan](../changes/2026-11-11-po-detail-visual-refinement.md). Implementasi lokal tersedia; hasil pemeriksaan dicatat pada catatan tersebut, UAT dan deployment masih terbuka.

Perkembangan PO — 2026-11-11: daftar diringankan menjadi enam kolom dan filter status tunggal; detail menggunakan modal reusable dengan tab, barang ponsel berbentuk kartu, serta ringkasan biaya di bawah barang. Pagination dan kontrak prompt pembatalan dikoreksi. Build, 227 tes frontend dan browser fixture 1440/1024/390 px lulus; UAT akun nyata serta deployment tetap terbuka. [Catatan PO](../changes/2026-11-11-purchase-order-redesign.md).

Dashboard menjadi pintu masuk modul yang ringan, jelas dan lebih hidup. Header/footer tetap. Tidak menambahkan metrik operasional tanpa sumber data.

## Tahapan

1. Audit screenshot dan komponen dashboard — selesai.
2. Rapikan sapaan, metadata dan kartu modul dengan CSS lokal — selesai.
3. Build dan verifikasi browser desktop/mobile dengan fixture — selesai; [catatan hasil](../changes/2026-11-11-dashboard-redesign.md).
4. Review pengguna pada `/dashboard` dengan akun nyata, termasuk badge approval — menunggu.
5. Audit dan redesign form PR — selesai lokal; [catatan hasil](../changes/2026-11-11-pr-create-redesign.md). Form RFQ selesai lokal; [catatan hasil](../changes/2026-11-11-rfq-create-redesign.md).

## Perkembangan halaman modul — 2026-11-11

Halaman awal Purchasing selesai implementasi serta build dan empat skenario browser fixture; [catatan hasil](../changes/2026-11-11-purchasing-home-redesign.md). Menu dikelompokkan, panel siklus menjadi panduan opsional di bawah, dan fallback literal jumlah dihapus. Review akun nyata/UAT/rilis serta audit fallback service approval masih terbuka. Form PR/RFQ belum diubah.

## Perkembangan daftar PR — 2026-11-11

Redesign tabel daftar PR selesai implementasi dan verifikasi browser fixture pada 1440, 1024, dan 390 px. Enam kolom dengan hierarki lebih ringan, filter responsif dan estimasi rata kanan. [Catatan hasil dan batasan](../changes/2026-11-11-pr-list-redesign.md). UAT akun nyata, transaksi submit/PDF dan rilis belum diverifikasi. Form PR/RFQ belum diubah.

## Perkembangan form PR — 2026-11-11

Form create PR selesai dirapikan: informasi utama diprioritaskan, detail opsional expandable, validasi membuka panel terkait, dan bilah aksi ponsel mengikuti konten. Build, 7 tes kontrak PR serta tiga skenario browser fixture lulus. [Catatan implementasi, bukti dan batasan](../changes/2026-11-11-pr-create-redesign.md). UAT akun nyata, edit/revisi dan rilis masih terbuka. Form RFQ belum diubah.

## Perkembangan approval dan tabel bersama — 2026-11-11

Approval menggunakan enam kolom dengan informasi terkait digabung. Pola header/baris PR dipusatkan pada BaseTable; PR dan approval berbagi TableDocumentCell dan SearchInput compact/clearable. Build, 34 tes kontrak dan enam skenario browser fixture PR/approval lulus. [Catatan hasil dan batasan](../changes/2026-11-11-approval-table-redesign.md), [panduan komponen](../guides/table-pattern.md). UAT akun nyata, review setiap konsumen BaseTable, migrasi tabel HTML khusus dan deployment masih terbuka.

## Perkembangan dialog global — 2026-11-11

Dialog bersama untuk konfirmasi, hapus, input alasan, sukses, gagal, informasi dan loading selesai dirapikan. Build dan browser fixture pada tiga ukuran layar lulus. [Catatan implementasi dan batasan](../changes/2026-11-11-global-feedback-redesign.md). UAT akun nyata dan rilis masih terbuka; dialog khusus per halaman serta toast belum menjadi cakupan perubahan ini.

Modal detail PR selesai dirapikan: ringkasan tanpa kartu bertingkat, daftar barang sebelum approval, dan proses vertikal pada ponsel. Build dan lima skenario browser fixture lulus; [catatan perubahan](../changes/2026-11-11-pr-detail-redesign.md). UAT data nyata dan rilis belum diverifikasi.

## Perkembangan preview approval — 2026-11-11

Preview selesai dirapikan secara lokal: ringkasan ringan, tabel PR lima kolom dengan BaseTable, detail expandable, alur/audit opsional dan aksi ponsel yang membungkus. Quotation tetap memakai mata uang dan ketentuan supplier. Build, 46 tes kontrak dan enam skenario browser fixture preview serta tiga skenario regresi inbox lulus. [Catatan perubahan](../changes/2026-11-11-approval-preview-redesign.md). UAT akun nyata, signature/keputusan end-to-end dan rilis belum diverifikasi.

## Perkembangan dialog keputusan — 2026-11-11

Dialog Setujui, Tolak dan Minta Revisi selesai dirapikan secara lokal dengan heading/konteks ringan, input dan aksi konsisten, serta tanpa preview tanda tangan aktif. Validasi keputusan dan persyaratan signature tetap dipertahankan. Build, 46 tes kontrak dan sepuluh skenario browser fixture lulus. [Catatan perubahan](../changes/2026-11-11-approval-decision-dialog-redesign.md). UAT akun nyata, simpan signature dan keputusan end-to-end serta rilis belum diverifikasi.

## Perkembangan rencana pengadaan — 2026-11-11

Daftar rencana dan antrean PR selesai dirapikan dengan pola tabel PR: enam kolom, heading/filter ringan, rincian per item dan tindakan pilihan dalam alur halaman. Agregasi status halaman aktif serta penjumlahan kuantitas lintas satuan dihapus. Build, enam tes kontrak procurement dan browser fixture pada 1440/1024/390 px lulus. [Catatan hasil dan batasan](../changes/2026-11-11-procurement-plans-redesign.md). UAT data riil, transaksi end-to-end, pagination antrean di atas 100 item dan deployment masih terbuka. Form create/detail rencana belum masuk cakupan.

## Perkembangan form rencana pengadaan — 2026-11-11

Form create selesai dirapikan menjadi tiga bagian utama, detail/approval dan catatan opsional, radio metode native, alokasi lima kolom dengan kartu ponsel, serta ringkasan di bawah seluruh input pada semua ukuran layar (sesuai koreksi pengguna; tanpa sidebar). Build, enam tes procurement dan browser fixture pada 1440/1024/390 px lulus untuk validasi, draft, aktivasi, konsolidasi dan antrean kosong. [Catatan implementasi dan batasan](../changes/2026-11-11-procurement-plan-create-redesign.md). UAT data riil, penanganan kegagalan aktivasi, aksesibilitas SearchableSelect bersama, halaman detail dan rilis tetap terbuka.

## Perkembangan detail rencana pengadaan — 2026-11-11

Detail dari daftar kini memakai modal dan tetap menyediakan halaman penuh dengan isi bersama. Barang/aksi diprioritaskan, tabel empat kolom, metadata/approval/riwayat opsional, dan request approval duplikat dihapus. Build, enam tes procurement serta browser fixture 1440/1024/390 px lulus. [Catatan implementasi dan batasan](../changes/2026-11-11-procurement-plan-detail-redesign.md). UAT data asli, transaksi end-to-end, audit mata uang konsolidasi dan deployment masih terbuka.

## Perkembangan modal PR sumber — 2026-11-11

Modal sumber PR pada daftar rencana dirapikan menjadi daftar dengan pemisah ringan, label metode yang terbaca, metadata responsif dan tombol netral/primer yang konsisten. [Catatan hasil](../changes/2026-11-11-procurement-plan-source-pr-modal.md). Build dan enam tes procurement lulus; alur tab Selesai hingga detail diuji dengan browser fixture pada tiga ukuran layar. UAT data asli, audit aksesibilitas BaseModal bersama dan deployment masih terbuka.

Pagination daftar rencana diperbaiki dengan menghapus wrapper flex/padding yang berulang. Build dan browser fixture tiga ukuran lulus untuk lebar footer, posisi navigasi, satu request per klik dan kondisi kosong. [Catatan perbaikan](../changes/2026-11-11-procurement-plan-pagination-layout.md). UAT data asli dan deployment belum diverifikasi.

## Perkembangan Direct Purchase — 2026-11-11

Daftar pembelian langsung dirapikan menjadi tab Siap dibeli/Riwayat pembelian dengan lima/enam kolom, modal rencana/PR sumber bersama serta aksi konsisten. Kartu statistik dan total realisasi halaman aktif dihapus. Antrean kini memiliki pagination; pencarian/filter kuota masih per halaman dan batasannya dijelaskan di UI. Build, 17 tes kontrak serta browser fixture 1440/1024/390 px lulus. [Catatan hasil dan batasan](../changes/2026-11-11-direct-purchase-list-redesign.md). UAT akun nyata, pencarian antrean server-side, form/detail pembelian dan deployment masih terbuka.

Form create Direct Purchase selesai dirapikan menjadi satu alur dengan ringkasan bawah, radio saluran/pembayaran, saran marketplace/bank tanpa chip dan detail barang yang dapat ditutup. Barang memakai kartu pada ponsel; aksi mengikuti warna primer/draft/batal yang konsisten. Build, 17 tes kontrak dan browser fixture create serta kompatibilitas komponen edit pada 1440/1024/390 px diperiksa. [Catatan hasil dan batasan](../changes/2026-11-11-direct-purchase-create-redesign.md). UAT data asli, struktur edit/detail, kegagalan submit setelah create dan deployment masih terbuka.

Koreksi form Direct Purchase: lebar mengikuti penuh konten halaman tanpa max-width; marketplace/bank menjadi input teks biasa tanpa indikator datalist sesuai review pengguna. Ringkasan tetap di bawah. Lihat [catatan koreksi](../changes/2026-11-11-direct-purchase-create-redesign.md).

Detail Direct Purchase selesai dirapikan menjadi modal dari daftar dan URL langsung, menggunakan isi reusable. Informasi dipisahkan dalam tab Ringkasan/Pembayaran/Penerimaan/Persetujuan PR; tabel barang dipadatkan menjadi empat kolom, dan stepper/aksi duplikat dihapus. Build, 17 tes kontrak dan browser fixture 1440/1024/390 px lulus, termasuk enam status, error/retry, fokus/dialog bertingkat dan pengajuan pembayaran API tiruan yang menyegarkan daftar. [Catatan implementasi dan batasan](../changes/2026-11-11-direct-purchase-detail-redesign.md). UAT akun nyata, transaksi end-to-end, audit aksesibilitas lengkap dan deployment masih terbuka.

Review lanjutan preview Direct Purchase: blok penjual lebih ringan, barang diprioritaskan, biaya/total di bawah, tautan produk langsung terlihat dengan domain/tab baru, serta kartu barang ponsel memakai deskripsi reusable. Tombol/dialog/handler pencairan di Purchasing dihapus sesuai pembagian tanggung jawab Finance; tab pembayaran tetap informatif. Build, 17 tes kontrak dan browser fixture tiga ukuran lulus. [Catatan refinement](../changes/2026-11-11-direct-purchase-preview-ux-refinement.md). UAT, transaksi nyata dan implementasi/otorisasi alur Finance masih terpisah dan belum diverifikasi.

## Perkembangan daftar Tender RFQ — 2026-11-11

Daftar tender dan antrean rencana dirapikan menjadi heading ringan, dua tab dan tabel enam kolom menggunakan komponen bersama. Banner/statistik halaman aktif dihapus; filter status menjadi dropdown. Antrean memiliki pagination dan modal rencana; pilihan gabungan berada dalam alur halaman, dibersihkan saat filter/halaman berubah dan checkbox perusahaan berbeda dikembalikan ke keadaan tidak terpilih. Deadline published memakai metadata waktu server, tanpa peringatan merah pada status terminal. Build, 51 tes dan browser fixture 1440/1024/390 px lulus, termasuk publikasi/pembatalan API tiruan. [Catatan implementasi dan batasan](../changes/2026-11-11-rfq-list-redesign.md). Pencarian/filter kuota antrean masih per halaman dan dijelaskan di UI. Form/detail/komparasi, UAT data asli, transaksi nyata, aksesibilitas lengkap dan deployment tetap terbuka.

## Referensi desain dan proses pengadaan

Alur evaluasi/pemenang RFQ diperjelas menjadi tiga langkah: pilih supplier, isi evaluasi dan periksa keputusan. Pemeriksaan quotation mempunyai ringkasan status dan tindakan sesuai status. Build, 59 tes, browser fixture wizard/perbandingan tiga ukuran dan empat skenario review/revisi/approval lulus. [Catatan implementasi](../changes/2026-11-11-rfq-evaluation-award-ux.md). Evaluasi ini mempertahankan field kualitatif yang ada; sistem skor berbobot baru tidak ditambahkan. UAT, transaksi nyata dan deployment tetap terbuka.

Detail Tender RFQ selesai dirapikan secara lokal: ringkasan utama, tiga tab barang/supplier/pemeriksaan, tabel empat kolom dan metadata/tahapan yang dapat dibuka. Build, 45 tes RFQ dan browser fixture 1440/1024/390 px lulus. [Catatan implementasi dan batasan](../changes/2026-11-11-rfq-detail-redesign.md). Status ini menyelesaikan backlog detail pada catatan historis sebelumnya; UAT data asli, transaksi nyata, aksesibilitas penuh dan deployment tetap terbuka.

Perkembangan perbandingan RFQ: harga, pemeriksaan, dan hasil keputusan dipisahkan menjadi tiga bagian. Mengikuti koreksi pengguna dan acuan ERPNext, desktop/tablet memakai matriks horizontal dengan barang tetap di kiri, supplier ke kanan dan total biaya sejajar di bawah; ponsel memakai susunan vertikal; biaya/ketentuan dan riwayat tersedia melalui disclosure. Build, 45 tes RFQ dan browser fixture 1440/1024/390 px lulus. [Catatan implementasi dan batasan](../changes/2026-11-11-rfq-comparison-redesign.md). Pergeseran enam supplier dan kolom tetap juga lulus pada desktop/tablet. Status ini menyelesaikan audit perbandingan secara lokal; UAT data nyata, transaksi award/PO, audit aksesibilitas penuh dan deployment masih terbuka.

Perkembangan form Tender RFQ: empat bagian dengan lebar penuh, konsolidasi/catatan opsional, grid barang responsif, daftar supplier ringkas dan ringkasan bawah selesai lokal. Build, 45 tes RFQ dan browser fixture 1440/1024/390 px lulus. [Catatan implementasi](../changes/2026-11-11-rfq-create-redesign.md). Status ini menggantikan backlog form RFQ pada catatan historis di atas. UAT akun nyata, transaksi/email nyata, detail/komparasi dan deployment tetap terbuka.

- [Attio table views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views): referensi umum hierarki dan antarmuka berorientasi data, bukan replika dashboard.
- [Linear](https://linear.app/features): inspirasi hierarki informasi dan interaksi yang tenang.
- [ERPNext Buying](https://docs.frappe.io/erpnext/buying): acuan proses procurement. Perubahan dashboard ini hanya presentasi, tanpa perubahan alur transaksi.

Visual yang diterapkan merupakan adaptasi aplikasi; bukan klaim UI standar ERPNext atau Odoo.

## Perbaikan pembagian pemenang RFQ — 2026-11-11

Selesai lokal: beberapa supplier untuk satu barang, batas sisa jumlah per supplier, pemulihan alokasi/evaluasi dan payload seluruh keputusan. 233 tes frontend, build, browser fixture tiga ukuran serta 86 tes API RFQ/PO lulus (3 dilewati). [Catatan hasil](../changes/2026-11-11-rfq-same-item-split-award.md). UAT akun nyata dan deployment belum diverifikasi.

## Penyempurnaan rincian penawaran — 2026-11-11

Selesai lokal: disclosure berbingkai, ikon/hover/focus, kelompok barang/pengiriman dan warna selisih harga di komponen bersama desktop/ponsel. 233 tes frontend, build dan browser fixture 1440/1024/390 px lulus. [Catatan hasil](../changes/2026-11-11-rfq-offer-details-refinement.md). Review RFQ 9 dengan akun nyata serta deployment belum diverifikasi.

## Penyempurnaan biaya dan ketentuan supplier — 2026-11-11

Selesai lokal: kartu biaya reusable, panel total, breakdown dan kelompok ketentuan/mata uang serta disclosure berikon. 233 tes frontend, build dan browser fixture 1440/1024/390 px lulus. [Catatan hasil](../changes/2026-11-11-rfq-supplier-costs-refinement.md). UAT akun nyata dan deployment belum diverifikasi.
