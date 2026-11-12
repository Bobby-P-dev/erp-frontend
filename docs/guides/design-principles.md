# Prinsip desain aplikasi internal

Arah yang disepakati: **clean, modern, elegan, hidup, dan interaktif secukupnya tanpa berlebihan**. Clean berarti informasi mudah dibaca dan tindakan mudah ditemukan; bukan tampilan polos tanpa hierarki.

## Penerapan

- Utamakan data dan tindakan kerja. Bedakan judul, nilai utama, metadata, serta informasi pendukung dengan ukuran, jarak, dan warna lembut.
- Gunakan warna aksen biru untuk aksi utama dan fokus informasi; warna status harus sesuai makna. Jangan membuat seluruh bagian berwarna dominan.
- Ikon membantu mengenali informasi dan selalu didampingi label yang jelas. Jangan menambahkan ornamen atau titik dekoratif tanpa fungsi.
- Beri respons hover/fokus pada tombol, tab, dan panel yang dapat dibuka. Informasi penting tidak boleh hanya muncul saat hover; kartu informasi tidak diberi kursor tombol.
- Detail tambahan menggunakan disclosure berlabel yang dapat dibuka lewat keyboard. Saat terbuka, sediakan ruang yang cukup dan pertahankan keterbacaan angka pada tabel.
- Ringkasan biaya berada di bawah barang, bukan sidebar kanan. Jaga form tetap lebar dan kelompokkan sesuai urutan kerja pengguna.
- Submit memakai tombol primer biru; batal memakai tombol netral berbatas; tindakan destruktif memakai merah dengan label eksplisit.
- Animasi cukup sebagai umpan balik singkat, tanpa gerakan otomatis atau efek mencolok; hormati prefers-reduced-motion.
- Pertahankan konsistensi komponen reusable, tampilan ponsel, fokus keyboard, kontras, dan target klik yang nyaman.
- Header dan footer aplikasi tetap mengikuti desain yang telah disepakati.

## Referensi

ERPNext menjadi referensi alur procurement dan struktur informasi bisnis. Pola visual di atas merupakan keputusan desain aplikasi internal berdasarkan review pengguna; jangan menganggapnya salinan UI ERPNext.

Contoh penerapan: [pola tabel](table-pattern.md), [penyempurnaan detail PO](../changes/2026-11-11-po-detail-visual-refinement.md).
