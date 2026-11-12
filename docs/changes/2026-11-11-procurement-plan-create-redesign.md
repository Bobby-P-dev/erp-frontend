# Purchasing — Redesign form rencana pengadaan

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Redesign antarmuka internal |
| Plan terkait | [Redesign antarmuka](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Form menampilkan detail PR, alur approval dan audit sejak awal, sebelum pengguna mencapai input metode/alokasi. Pilihan metode berisi paragraf dan daftar panjang. Tabel delapan kolom mencampurkan data referensi dengan input utama. Ringkasan kuantitas menjumlahkan satuan berbeda sebagai unit. Tombol akhir berdampingan terlalu lebar untuk ponsel. Parent juga mengambil tracker approval yang tidak dipakai oleh template, sementara DocumentWorkflowTracker mengambil data sendiri.

## Tujuan dan kriteria penerimaan

- [x] Tiga bagian utama terbaca: sumber kebutuhan, metode, alokasi barang.
- [x] Detail PR/approval, detail item dan catatan bersifat opsional untuk dibuka.
- [x] Input jumlah, sisa kebutuhan, biaya dan pilihan metode mudah dikenali.
- [x] Alokasi tetap dapat dibagi; validasi nol/lebih dari sisa dan jumlah desimal diuji.
- [x] Ponsel memakai susunan kartu barang dan tombol selebar panel tanpa overflow halaman.
- [x] Header/footer aplikasi dipertahankan.

## Cakupan dan rencana

1. Telusuri struktur view, dependensi dan coverage melalui codebase-memory; periksa sumber terkait.
2. Sederhanakan template dan ekstrak presentasi barang ke komponen khusus.
3. Gunakan ulang BaseBreadcrumb, ReviewDisclosure, BaseTable dan SearchableSelect.
4. Periksa build, tes procurement yang tersedia, serta browser fixture untuk draft/aktivasi/konsolidasi.
5. Dokumentasikan batasan verifikasi dan tindak lanjut UAT.

## Solusi dan keputusan

- Informasi penting PR tetap terlihat: sumber, keperluan, perusahaan/divisi dan target kebutuhan. Pemohon, tanggal pengajuan, catatan dan workflow berada di disclosure.
- DocumentWorkflowTracker baru dipasang saat detail dibuka. Request tracker duplikat dari parent dan computed yang tak dipakai dihapus.
- Dua radio native menggantikan kartu klik dengan penjelasan panjang. Pilihan bisa dioperasikan melalui keyboard.
- Alokasi memakai lima kolom: pilihan, barang/jasa, sisa kebutuhan, alokasikan dan estimasi. Harga satuan, jumlah awal, referensi dan catatan item ada di detail item. Pada ponsel kontrol yang sama disusun menjadi kartu melalui CSS.
- Ringkasan metode, jumlah barang dan estimasi biaya tampil di bawah seluruh input pada semua ukuran layar. Form memakai lebar penuh; pada desktop metrik dan tombol disusun mendatar, sementara pada ponsel tombol bertumpuk. Penyesuaian ini mengikuti koreksi pengguna yang tidak menginginkan ringkasan di kanan. Tidak menjumlahkan kuantitas lintas satuan.
- Error jumlah tampil di dekat input dengan aria-invalid/describedby. Saat submit tidak valid, fokus menuju jumlah bermasalah atau checkbox bila belum memilih barang.
- Tombol simpan menunggu pemuatan detail PR dan dinonaktifkan selama submit. Respons detail PR yang terlambat tidak menimpa sumber PR terbaru.
- Endpoint dan struktur payload draft/aktivasi/konsolidasi dipertahankan. Tidak mengubah aturan pengadaan atau mengklaim susunan UI ini sebagai standar ERPNext.

## Implementasi

| File | Perubahan |
| --- | --- |
| src/views/purchasing/ProcurementPlanCreateView.vue | Tiga bagian utama, informasi pendukung opsional, ringkasan/aksi responsif, tracker lazy, fokus validasi dan pengaman respons PR lama. |
| src/components/purchasing/plan/PlanAllocationItems.vue | Komponen presentasi alokasi dengan BaseTable, susunan kartu ponsel, rincian/catatan dan label input. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| npm run build | Lulus; peringatan chunk >500 kB tetap ada. |
| node --test tests/procurementPlan.test.js | Enam tes kontrak yang tersedia lulus. Sebagian tes berupa contoh logika; bukan bukti interaksi komponen. |
| node /tmp/erp-plan-create-preview.mjs | Browser fixture pada 1440/1024/390 px: tanpa overflow halaman/runtime error, pilihan metode keyboard, approval tidak di-request sebelum panel dibuka. |
| Validasi alokasi | Jumlah melebihi sisa dan nol ditandai; submit tidak mengirim POST; fokus menuju input salah. Desimal 12,5, hapus pilihan, input disabled dan pilih semua diuji. |
| Draft | Payload PR 38, metode RFQ, kuantitas desimal, catatan item/rencana diperiksa; hanya satu POST create. |
| Aktivasi | POST create diikuti endpoint activate, lalu navigasi daftar pada fixture. |
| Konsolidasi | Tiga item dari dua PR, company_id, is_consolidated, hapus sessionStorage dan navigasi fast RFQ diuji pada fixture. |
| Antrean kosong | Tidak ada barang, pesan arahan dan kedua tombol simpan disabled pada tiga ukuran layar. |
| git diff --check | Lulus. |

Screenshot desktop dan ponsel ditinjau. Harness sementara dan bukti berada di /tmp/erp-plan-create-preview.mjs, /tmp/erp-plan-create-browser.log dan /tmp/erp-plan-create-{1440,1024,390}.png. Respons API disimulasikan; tidak ada PR/rencana nyata dibuat atau diaktifkan.

## Koreksi tata letak ringkasan

Hierarki warna aksi diperjelas sesuai koreksi pengguna: Simpan & aktifkan biru solid (utama), Simpan draft outline biru (sekunder), Batal abu-abu netral. Merah diperuntukkan bagi aksi destruktif, bukan navigasi batal. Ketiganya memakai border dan padding yang sama agar tinggi konsisten. Cakupan penerapan koreksi warna ini adalah form rencana pengadaan; belum merupakan migrasi seluruh tombol aplikasi. Build dijalankan ulang.

Tampilan Batal diselaraskan dengan tombol sekunder melalui class plan-action, border, padding dan perataan yang sama. Tetap menggunakan RouterLink untuk navigasi kembali ke daftar. Build dijalankan ulang setelah koreksi ini.

Ringkasan dipindahkan ke bawah form pada semua ukuran layar sesuai permintaan pengguna. Tidak mengubah kalkulasi/payload. Build dan browser fixture 1440/1024/390 px dijalankan ulang; pemeriksaan posisi memastikan ringkasan berada setelah fieldset input.

## Risiko dan tindak lanjut

- [ ] UAT dengan akun dan data perusahaan, termasuk konsolidasi, mata uang non-IDR dan transaksi RFQ/pembelian langsung berikutnya.
- [ ] Uji kegagalan aktivasi setelah draft berhasil tersimpan; penanganan alur ini masih mengikuti implementasi sebelumnya.
- [ ] Pemuatan antrean tetap maksimal 100 item sesuai implementasi sebelumnya; pencarian server/pagination sumber PR perlu pekerjaan terpisah.
- [ ] Perbaikan aksesibilitas keyboard SearchableSelect bersama masih terpisah; komponen ini masih memakai trigger div yang sudah ada.
- [ ] Halaman detail rencana dan deployment belum termasuk pekerjaan ini.

## Deployment dan pemulihan

Belum ada bukti deployment. Tidak ada migrasi atau perubahan backend. Untuk pemulihan, kembalikan perubahan view dan komponen alokasi baru saja tanpa menimpa perbaikan frontend lainnya.
