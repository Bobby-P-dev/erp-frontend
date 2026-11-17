# Purchasing — Pilihan workflow saat mengajukan PR dari RFQ awal

## Ringkasan

| Atribut | Nilai |
| --- | --- |
| Tanggal | 2026-11-16 |
| Jenis | Perbaikan, case 3 |
| Status pekerjaan | Selesai lokal |
| Sprint / issue / PR | UAT RFQ katalog/supplier |
| Plan terkait | [Penyesuaian frontend RFQ](../plans/rfq-frontend-alignment.md) |
| Status rilis | Deployment belum diverifikasi |

## Masalah dan dampak

Konversi RFQ kebutuhan awal menghasilkan draft PR. Tombol Ajukan pada daftar/detail langsung mengirim submit tanpa `approval_configuration_id`, sehingga pengguna tidak dapat memilih workflow seperti pada form PR biasa.

## Tujuan dan kriteria penerimaan

- [x] Draft PR dari daftar maupun detail membuka pemilih workflow sebelum pengajuan.
- [x] Pengguna melihat urutan persetujuan dan harus memilih workflow aktif untuk perusahaan PR atau workflow umum.
- [x] ID pilihan dikirim pada endpoint submit yang sudah tersedia.
- [x] Error pemuatan tidak menghasilkan pilihan workflow dari mock; error submit mempertahankan pilihan.

## Cakupan dan rencana

Telusuri handler submit dan kontrak backend; buat modal reusable; integrasikan kedua pintu pengajuan; verifikasi browser desktop/ponsel, regresi approval dan build; dokumentasikan hasil.

## Solusi dan keputusan

Workflow dipilih saat mengajukan draft PR, setelah draft dibuat dari penawaran. Konversi RFQ tetap hanya membuat draft. Modal memakai BaseSelect dan ApprovalStepper, membaca seluruh halaman konfigurasi, menyaring perusahaan PR, workflow aktif dan workflow yang memiliki tahap. Tidak ada pilihan otomatis/default pada modal ini.

Pengajuan ulang setelah permintaan revisi tetap melanjutkan request/alur sebelumnya. Backend resubmit memang tidak mengganti workflow; modal baru hanya untuk draft. Tidak ada perubahan backend pada case ini.

## Implementasi

| File | Perubahan |
| --- | --- |
| `src/components/purchasing/PurchaseRequisitionSubmitModal.vue` | Pemilih, preview, loading/error/retry, submit eksplisit dan guard klik ganda. |
| `src/views/purchasing/PurchaseRequisitionListView.vue` | Handler daftar/detail membuka modal; menutup detail agar modal tidak bertumpuk. |
| `src/services/approval/approvalConfigServices.js` | Opsi `allowMock: false` untuk pemuatan konfigurasi pada pengajuan nyata; kompatibilitas pemanggil lama dipertahankan. |
| `tests/browser/prSubmitWorkflow.smoke.mjs` | Browser fixture untuk pemilihan dan payload nyata dari komponen. |

## Verifikasi dan hasil

| Perintah / skenario | Hasil |
| --- | --- |
| `npm run build` | Lulus; peringatan ukuran chunk tetap ada. |
| `node --test tests/approval.test.js tests/rfqRequisition.test.js` | 35 tes lulus. |
| `tests/browser/prSubmitWorkflow.smoke.mjs` dengan Playwright runtime dan Chrome lokal | Lulus 1440/390 px: gagal load tanpa mock, pagination, filter perusahaan, preview, ID workflow, retry 422, reset saat buka ulang, batal dan daftar kosong. |
| `git diff --check` | Lulus. |

Browser menggunakan fixture API terisolasi, bukan transaksi database nyata. Belum memverifikasi end-to-end approval dengan akun perusahaan pada case ini.

## Risiko dan tindak lanjut

- [ ] UAT: RFQ awal → penawaran → draft PR → Ajukan dari daftar/detail → pilih workflow → pastikan request approval memakai konfigurasi tersebut.
- [ ] Pastikan akun pemohon dapat membaca konfigurasi approval; kegagalan akses ditampilkan sebagai error dan menghentikan pengajuan.
- [ ] UAT pengajuan ulang revisi tetap memakai alur sebelumnya.

## Deployment dan pemulihan

Belum ada bukti deployment produksi. Rilis bundle frontend sesuai prosedur proyek; pemulihan dengan bundle sebelumnya. Tidak membutuhkan migrasi database.
