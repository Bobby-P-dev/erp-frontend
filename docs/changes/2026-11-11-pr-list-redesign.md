# Purchasing — Redesign daftar Purchase Requisitions

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan antarmuka |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Redesign bertahap, di luar sprint RFQ |
| Plan terkait | [Redesign dashboard internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi |

## Masalah dan dampak

Tujuh kolom dengan ikon, teks tebal, dan badge berulang membuat tabel padat. Nomor urut menggunakan ruang, sedangkan identitas pengajuan dan keperluan terpisah sehingga lebih sulit dipindai.

## Tujuan dan kriteria penerimaan

- [x] Identitas PR mudah dipindai dengan hierarki utama dan sekunder.
- [x] Estimasi rata kanan, status ringan tanpa titik, serta aksi sesuai kondisi lama.
- [x] Filter, pencarian, pagination, dan permintaan detail tetap bekerja.
- [x] Tabel bergeser di layar kecil tanpa overflow halaman.
- [x] Header/footer dan alur transaksi tetap.

## Cakupan dan rencana

Audit tabel, sederhanakan hierarki informasi dengan CSS lokal, verifikasi build dan browser fixture, lalu catat hasil. Tidak mengubah API atau komponen tabel global.

## Solusi dan keputusan

Enam kolom: pengajuan (nomor dan keperluan), tanggal/target, perusahaan/divisi, estimasi/jumlah item, status/tahap approval, serta aksi. Hapus nomor urut dan ikon dekoratif berulang. Nilai nol tetap ditampilkan sebagai Rp 0; nilai tidak tersedia menjadi tanda pisah. Teks panjang dipotong secara visual dengan judul hover dan detail tetap tersedia melalui nomor PR/tombol rincian. Filter status memakai tombol di desktop dan select pada ponsel. Lebar minimum tabel menjaga keterbacaan dan area tabel mendukung geser horizontal.

## Implementasi

| File | Perubahan |
| --- | --- |
| [PurchaseRequisitionListView.vue](../../src/views/purchasing/PurchaseRequisitionListView.vue) | Susunan kolom, toolbar, filter responsif, label aksesibilitas dan CSS scoped |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan bundle di atas 500 kB masih ada |
| `git diff --check` | Lulus setelah whitespace dirapikan |
| Chrome/Playwright fixture 1440, 1024, 390 px | Ketiga skenario lulus; enam kolom, konten sel tidak melewati batas, halaman tidak melebar |
| Filter, debounce pencarian, pagination, jumlah baris | Parameter permintaan API fixture sesuai; filter kembali ke halaman 1 |
| Aksi draft/revisi/disetujui | Edit dan PDF terlihat sesuai status lama; pengajuan tetap tersedia sesuai kondisi lama |
| Klik rincian | Permintaan detail dan render modal tidak menimbulkan page error |
| Screenshot desktop/mobile | Ditinjau; hierarki lebih ringan, tabel ponsel bergeser |

Harness sementara: `/tmp/erp-pr-preview.mjs`; screenshot `/tmp/erp-pr-list-{1440,1024,390}.png`. Fixture memakai komponen Vue dan service aktual dengan respons API simulasi. Ini bukan UAT akun nyata. Submit transaksi dan isi PDF tidak dieksekusi ulang; handler tidak diubah. Hasil indeks MCP diperiksa dan sumber terkait dibaca terarah.

## Risiko dan tindak lanjut

- [ ] Review pengguna dengan data dan permission akun nyata pada URL aplikasi.
- [ ] UAT pengajuan, unduhan PDF, dan navigasi edit dalam aplikasi lengkap.
- [ ] Form PR/RFQ tetap backlog terpisah.

## Deployment dan pemulihan

Belum ada bukti deployment. Pulihkan hanya diff daftar PR beserta dokumentasinya bila diperlukan; pertahankan perubahan dashboard dan Purchasing home yang terpisah.
