# Tender RFQ — Alur evaluasi dan keputusan pemenang

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-11 |
| Jenis | Perbaikan UI/UX |
| Status pekerjaan | Selesai implementasi dan verifikasi lokal |
| Sprint / issue / PR | Penyempurnaan desain Purchasing |
| Plan terkait | [Redesign internal](../plans/dashboard-redesign.md) |
| Status rilis | Belum diverifikasi; UAT data asli belum dilakukan |

## Masalah dan dampak

Modal pemenang menggabungkan tabel enam kolom, pilihan skema, semua field evaluasi, penjelasan aturan dan tombol simpan dalam satu layar. Nama supplier terpotong dan hubungan evaluasi dengan barang sulit dipahami. Tab pemeriksaan mengulang penjelasan dan tetap meminta pengguna memeriksa quotation yang sudah disahkan. Pengguna tidak menemukan langkah evaluasi dengan jelas.

## Tujuan dan kriteria penerimaan

- [x] Pemeriksaan quotation dibedakan dari evaluasi dan keputusan pemenang.
- [x] Pemilihan supplier, evaluasi, dan pemeriksaan akhir tampil bertahap.
- [x] Alasan pemilihan tetap wajib; catatan/bukti opsional dapat dibuka.
- [x] Kuantitas, cakupan barang dan subtotal keputusan terlihat sebelum simpan.
- [x] Navigasi langkah tidak mengirim keputusan; pilihan dan evaluasi tersimpan saat kembali.
- [x] Aturan eligibility, review version, PO terkunci dan payload API tetap dipertahankan.

## Cakupan dan rencana

Telusuri state pemilihan dan evaluasi melalui graph/source; rapikan UI dengan komponen evaluasi bersama; tambahkan preview sesuai aturan payload; uji validasi langkah dan transaksi tiruan; verifikasi pemeriksaan/revisi serta regresi perbandingan; dokumentasikan hasil.

## Solusi dan keputusan

Tombol utama menjadi **Evaluasi & pilih pemenang**. Modal memiliki tiga langkah:

1. **Pilih supplier:** pilihan supplier per barang atau satu supplier, kuantitas dan harga. Tabel padat diganti kartu barang. Jumlah dibatasi sisa kebutuhan dan jumlah penawaran. Pilihan awal dijelaskan sebagai saran yang perlu diperiksa.
2. **Isi evaluasi:** kesesuaian spesifikasi dan alasan pemilihan diprioritaskan. Garansi, catatan teknis, pembayaran/pengiriman serta bukti tersedia melalui disclosure opsional. Pada satu supplier, evaluasi berlaku untuk barang yang tercakup; mode per barang mempertahankan evaluasi masing-masing barang.
3. **Periksa keputusan:** ringkasan barang/supplier/jumlah, kesesuaian, alasan, bukti opsional dan nilai barang sebelum pajak/ongkir. Barang yang tidak tercakup dijelaskan. Simpan tetap meminta konfirmasi dan belum membuat PO.

Validasi langkah mencegah jumlah tidak valid dan alasan kosong. Preview memakai sisa kebutuhan, kuantitas penawaran dan pengecualian item dengan PO yang sama dengan penyusunan payload. Pengiriman tetap memakai ID quotation item, jumlah, versi pemeriksaan dan field evaluasi sebelumnya. Backend tidak diubah. Ini merapikan evaluasi kualitatif yang sudah ada, tidak menambahkan sistem skor/bobot baru.

Pemeriksaan menampilkan jumlah quotation disahkan, badge per supplier, dan **Lihat penawaran** untuk status approved. Penawaran lainnya tetap mempunyai tindakan pemeriksaan. Petunjuk berikutnya mengarahkan pengguna ke evaluasi ketika persyaratan terpenuhi. Komponen ini dipakai bersama di detail RFQ dan perbandingan.

Modal mempunyai label dialog, heading langkah yang difokuskan saat berpindah, siklus Tab/Shift+Tab, Escape dan pengaman tutup saat request berjalan. Footer tetap terlihat dan ponsel menggunakan tombol utama selebar area aksi.

Acuan proses sebelumnya tetap [ERPNext RFQ](https://docs.frappe.io/erpnext/request-for-quotation) dan [Supplier Quotation](https://docs.frappe.io/erpnext/supplier-quotation). Wizard dan evaluasi kualitatif merupakan adaptasi sistem ini; tidak diklaim sebagai UI atau fitur evaluasi berbobot bawaan ERPNext.

## Implementasi

| File | Perubahan |
| --- | --- |
| [RfqComparisonView.vue](../../src/views/purchasing/RfqComparisonView.vue) | Wizard, validasi langkah, preview keputusan, label navigasi dan petunjuk lanjut |
| [AwardEvaluationFields.vue](../../src/components/purchasing/rfq/AwardEvaluationFields.vue) | Field utama jelas, batas input tetap, catatan/bukti opsional dan border input eksplisit |
| [QuotationReviewSection.vue](../../src/components/purchasing/rfq/detail/QuotationReviewSection.vue) | Ringkasan status, label tindakan sesuai status dan judul rincian yang jelas |
| [rfqComparison.test.js](../../tests/rfqComparison.test.js) | Tes langkah/alasan, larangan submit awal, validasi jumlah dan preview cakupan satu supplier |
| [rfqSprint3.smoke.mjs](../../tests/browser/rfqSprint3.smoke.mjs) | Selector menyesuaikan label field evaluasi baru |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan chunk >500 kB masih ada |
| `node --test tests/rfq.test.js tests/rfqComparison.test.js tests/rfqDeadline.test.js tests/rfqInvitation.test.js tests/rfqTimestamp.test.js tests/quotationReview.test.js` | 59 tes lulus |
| `/tmp/erp-rfq-award-preview.mjs`, Chrome fixture 1440/1024/390 px | Status approved, split/full wizard, validasi jumlah/alasan, catatan opsional, kembali tanpa kehilangan input, preview, siklus fokus, save dengan payload tiruan, batal/Escape dan tidak ada overflow halaman lulus |
| `tests/browser/rfqSprint3.smoke.mjs`, Playwright dengan `CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome` | Empat skenario lulus: direct review/revisi desktop dan mobile, pengajuan approval, refresh konflik versi |
| `/tmp/erp-rfq-matrix-refined-preview.mjs`, 1440/1024/390 px | Regresi matriks, rincian, navigasi, modal, PO expired, konversi kosong, refresh gagal/retry, data kosong dan enam supplier lulus |
| `git diff --check` pada file terkait | Lulus |

Screenshot `/tmp/erp-rfq-award-{select,evaluate,confirm}-{1440,1024,390}.png` dan `/tmp/erp-rfq-review-refined-{1440,1024,390}.png`; desktop dan ponsel ditinjau secara visual. Fixture router matriks/wizard mencatat peringatan route awal kosong, tanpa page error. Seluruh browser check memakai API tiruan; tidak membuktikan transaksi database, email, otorisasi akun nyata atau deployment.

## Risiko dan tindak lanjut

- [ ] UAT dengan pengguna perusahaan, banyak barang dan nama supplier panjang.
- [ ] Verifikasi transaksi nyata, konflik versi, eligibility dan penguncian PO dengan akun berwenang.
- [ ] Audit aksesibilitas menyeluruh, termasuk interaksi modal bersama/dialog konfirmasi dan pembaca layar.

## Deployment dan pemulihan

Tidak ada bukti deployment atau migrasi baru. Pemulihan mengembalikan perubahan wizard, field evaluasi dan presentasi pemeriksaan terkait saja; pertahankan redesign perbandingan dan perubahan lain yang sudah ada.
