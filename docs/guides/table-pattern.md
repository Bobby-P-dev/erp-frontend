# Pola tabel aplikasi

Gunakan daftar PR dan Purchasing Approvals sebagai acuan hierarki informasi. BaseTable adalah dasar visual bersama; jumlah kolom mengikuti kebutuhan halaman.

## Komponen

| Komponen | Tanggung jawab |
| --- | --- |
| BaseTable | Header, padding baris, scrollbar, region keyboard, alignment dan lebar kolom. |
| TableDocumentCell | Nomor dokumen sebagai tombol, deskripsi dan jenis dokumen opsional; emit open. |
| SearchInput | v-model, label aksesibel, compact dan clearable opsional. Debounce tetap di halaman/composable. |
| ApprovalBadge | Status domain approval; appearance="subtle" untuk tabel yang ringan. |
| Pagination | Navigasi halaman; dengarkan hanya change-page atau page-change, bukan keduanya. |

## Contoh

```vue
<SearchInput v-model="search" label="Cari pengajuan" placeholder="Cari nomor atau keperluan..." compact clearable />
<BaseTable
  :columns="columns"
  min-width="1180px"
  layout="fixed"
  label="Daftar pengajuan"
  :busy="loading"
>
  <tr v-for="row in rows" :key="row.id">
    <td>
      <TableDocumentCell :number="row.number" :description="row.title" @open="openDetail(row)" />
    </td>
    <!-- Tambahkan sel sesuai columns, termasuk state loading/kosong dengan colspan yang benar. -->
  </tr>
</BaseTable>
<Pagination :pagination="pagination" @change-page="fetchPage" />
```

Kolom mendukung key, label, width, minWidth, align (left/center/right), dan class untuk kompatibilitas. Gunakan min-width sesuai isi tabel, bukan angka wajib untuk semua tabel. Layout default auto; gunakan fixed bila lebar kolom sudah dipetakan. Label region harus spesifik untuk halaman.

## Pedoman

- Kelompokkan nomor/judul/jenis dokumen, pemohon/divisi, dan status/tindak lanjut. Hindari metadata yang sama menjadi badge dominan di setiap baris.
- Estimasi rata kanan, gunakan tabular-nums, bedakan nilai nol dari nilai yang tidak tersedia.
- Teks panjang bisa dibungkus atau dipotong dengan title; rincian lengkap tersedia melalui tombol dokumen.
- Gunakan tombol/link untuk interaksi sehingga bisa diakses keyboard. Hindari klik pada seluruh baris sebagai satu-satunya cara membuka detail.
- Hindari mengulang CSS th/td per halaman. Tetapkan ukuran khusus melalui konfigurasi columns.
- Pada ponsel, batasi overflow ke region tabel, sediakan petunjuk geser, dan biarkan toolbar/tab membungkus.
- Jangan mengubah aturan transaksi saat menerapkan pola visual. Uji filter, pagination dan aksi dengan API fixture, lalu UAT dengan akun nyata.

Dasar visual mengikuti PR yang telah direview pengguna. Ini bukan klaim standar tampilan ERPNext; ERPNext tetap menjadi referensi alur bisnis procurement.

## Total dan detail opsional

BaseTable menyediakan slot `footer` opsional. Isikan elemen `tr` dan `td`; pastikan jumlah sel/colspan sesuai konfigurasi kolom. Contoh pemakaian terdapat pada ApprovalReviewDrawer, dengan empat kolom untuk quotation dan lima untuk PR. Tanpa slot, `tfoot` tidak dirender sehingga konsumen lain tidak perlu diubah.

Gunakan ReviewDisclosure untuk bagian pendukung seperti alur dan audit. Props: `title` wajib, `description` opsional; isi menggunakan default slot. Komponen memakai elemen native details/summary, tertutup saat awal dan dapat dibuka dengan keyboard. Pasang key identitas dokumen jika state buka/tutup harus direset saat dokumen berganti. Informasi kritis untuk keputusan tetap tampil di ringkasan utama.
