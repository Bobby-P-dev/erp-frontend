# Approval — Redesign dialog keputusan

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan antarmuka |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | Redesign antarmuka internal |
| Plan terkait | [Redesign dashboard](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Dialog Setujui menampilkan ikon besar, kartu dokumen, panel verifikasi serta gambar tanda tangan yang membuat konfirmasi terasa padat dan kaku. Dialog Tolak dan Minta Revisi memakai pola yang sama. Pengguna meminta tampilan lebih clean dan tanpa preview tanda tangan.

## Tujuan dan kriteria penerimaan

- [x] Gambar tanda tangan dan panel status tanda tangan aktif tidak tampil pada konfirmasi.
- [x] Setujui, Tolak dan Minta Revisi memakai susunan ringan dan konsisten.
- [x] Catatan opsional/wajib, validasi alasan, callback keputusan dan pencegahan submit ganda dipertahankan.
- [x] Dialog dapat digunakan pada desktop/ponsel dan melalui keyboard.

## Cakupan dan rencana

1. Telusuri ApprovalActionDialog dengan graph, trace dan coverage; periksa kode UI dan validasinya.
2. Ringkas heading, konteks dokumen, input dan bilah aksi pada komponen bersama.
3. Periksa build, tes kontrak, browser fixture dan screenshot.
4. Catat hasil serta batasan UAT/rilis.

## Solusi dan keputusan

- Heading memakai ikon kecil dan kalimat singkat; konteks dokumen tampil sebagai teks dengan pemisah lembut, tanpa kartu/badge bertingkat.
- Panel tanda tangan aktif dan gambar spesimen dihapus. Persyaratan tanda tangan yang sudah ada tetap dipertahankan; pengguna tanpa tanda tangan mendapat petunjuk ringkas dan tombol pengaturan. Ini perubahan presentasi, bukan penghapusan persyaratan approval.
- Catatan menjadi fokus utama. Tombol menggunakan teks langsung: Setujui dokumen, Tolak dokumen, Kirim permintaan revisi. Warna mengikuti jenis keputusan.
- Catatan persetujuan opsional; alasan revisi wajib; penolakan wajib minimal lima karakter. Payload tetap action/notes dengan callback done/fail.
- Label input terhubung, dialog memiliki nama/deskripsi aksesibel, fokus awal masuk ke dialog dan kembali ke pemicu saat tutup. Tab berputar di dialog; Escape diblokir saat proses dan dapat menutup setelah kegagalan. Editor tanda tangan memperoleh kontrol keyboard ketika dibuka.
- Pemberitahuan lama tentang kepatuhan ISO di panel tanda tangan tidak dipertahankan karena bukan bukti persyaratan standar tertentu.

## Implementasi

| File | Perubahan |
| --- | --- |
| src/components/approval/ApprovalActionDialog.vue | Redesign bersama tiga keputusan, hapus preview tanda tangan, responsivitas, label/fokus/Escape. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| npm run build | Lulus; peringatan chunk besar masih ada. |
| node --test tests/approval.test.js tests/purchaseRequisition.test.js tests/quotationReview.test.js | 46 tes lulus. |
| node /tmp/erp-decision-preview.mjs | Sepuluh skenario lulus: tiga keputusan pada 1440/1024/390 px dan akun tanpa tanda tangan pada 390 px. Memeriksa tidak ada gambar/panel tanda tangan aktif, tidak ada overflow, tombol terlihat, validasi wajib/minimum karakter, payload catatan yang dipangkas, loading, callback gagal, Escape, fokus kembali, Tab dan reset input. |
| git diff --check | Lulus. |

Pemeriksaan visual memakai screenshot desktop dan ponsel. Harness sementara berada di /tmp, memakai komponen asli dengan callback fixture. Tidak ada keputusan approval atau perubahan signature nyata yang dikirim ke backend.

## Risiko dan tindak lanjut

- [ ] UAT keputusan dengan akun perusahaan, signature yang sudah tersimpan, dan respons backend aktual.
- [ ] Uji simpan/unggah signature end-to-end untuk akun yang belum memiliki signature; pemeriksaan kali ini mencakup petunjuk dan tombol persetujuan yang dinonaktifkan.
- [ ] Verifikasi integrasi konflik approver dan seluruh item ditolak dengan transaksi nyata sebelum rilis.

## Deployment dan pemulihan

Belum ada bukti deployment. Tidak ada migrasi backend. Pemulihan melalui pengembalian perubahan dialog ini di Git dengan tetap menjaga perubahan frontend lain.
