# Purchasing — Redesign modal detail PR

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Redesign bertahap |
| Plan terkait | [Redesign dashboard internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Modal memiliki banyak kotak bertingkat, kartu nilai biru besar, serta avatar dan nomor tahap approval yang berulang. Daftar barang berada setelah approval/proses sehingga kebutuhan utama lebih lambat ditemukan. Stepper horizontal menyulitkan pembacaan pada ponsel.

## Tujuan dan kriteria penerimaan

- [x] Ringkasan ringan, nilai dan catatan tetap tersedia.
- [x] Daftar barang langsung mengikuti ringkasan.
- [x] Approval dan riwayat keputusan tetap dapat dibuka.
- [x] Proses vertikal pada ponsel, horizontal pada desktop.
- [x] Header/footer aplikasi dan logika transaksi dipertahankan.

## Cakupan dan rencana

Audit komponen dengan MCP dan pemeriksaan sumber terarah; rapikan presentasi modal dan tiga komponennya; build, browser fixture, dokumentasi. Referensi visual mengikuti arah Attio/Linear pada plan. Tidak mengubah aturan procurement ERPNext maupun API.

## Solusi dan keputusan

Ringkasan memakai dua kolom pada layar cukup lebar dan satu kolom pada ponsel. Kartu total diganti baris nilai netral; kotak catatan dan keperluan dihapus. Approval cukup memakai nomor tahap dan identitas peninjau tanpa avatar tambahan. Indikator tahap aktif memakai nomor, tanpa titik berdenyut. Semua bagian tetap terbuka awalnya dan dapat ditutup. Daftar barang dipindahkan sebelum approval/proses. Tinggi isi modal menyesuaikan viewport; CSS `.pr-detail` ditargetkan khusus karena BaseModal menggunakan Teleport.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/PurchaseRequisitionDetailModal.vue` | Urutan isi, heading, badge tanpa dot, jarak dan tinggi body |
| `src/components/purchasing/detail/PRDetailSummary.vue` | Ringkasan tanpa kartu bertingkat, nilai netral, teks pemohon responsif |
| `src/components/purchasing/detail/PRApprovalList.vue` | Hapus avatar berulang, ringan tanpa border pembungkus, label dapat membungkus |
| `src/components/purchasing/detail/PRProcessStepper.vue` | Stepper responsif, indikator aktif bernomor, label riwayat singkat |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; warning bundle besar masih ada |
| `git diff --check` | Lulus |
| Chrome fixture 1440/in_procurement, 390/in_procurement, 390/revision_requested, 1024/draft, 1440/ready_for_pickup | Lima skenario lulus |
| Interaksi | Urutan bagian, accordion lewat klik/keyboard, catatan keputusan, enam tahap, aksi sesuai status, Escape, tanpa page error |
| Responsif | Body tidak overflow horizontal; stepper menjadi vertikal di ponsel; screenshot desktop/mobile ditinjau |

Harness sementara `/tmp/erp-pr-detail-preview.mjs` menggunakan komponen dan service aktual dengan respons API simulasi. Tidak menguji akun nyata, mengirim pengajuan, atau menghasilkan PDF. Logika status, perhitungan nilai, dan handler tetap mengikuti implementasi sebelumnya. Pengujian ini bukan UAT/deployment.

## Risiko dan tindak lanjut

### Penyesuaian review pengguna

Kolom target kebutuhan/keperluan ditambah padding kiri 24 px mulai breakpoint desktop/tablet (`md`) agar lebih terpisah dari informasi pemohon. Susunan ponsel tetap satu kolom. Verifikasi perubahan kelas dan `git diff --check` dilakukan; browser tidak diulang untuk penyesuaian jarak ini.

- [ ] Review data nyata dan UAT submit/edit/PDF.
- [ ] Verifikasi riwayat lifecycle/audit terhadap API nyata; panel terkait tidak diubah.
- [ ] Audit form PR/RFQ terpisah.

## Deployment dan pemulihan

Belum ada bukti rilis. Jika diperlukan, pulihkan diff empat komponen di atas tanpa menghapus perubahan daftar PR/dashboard/Purchasing home yang terpisah.
