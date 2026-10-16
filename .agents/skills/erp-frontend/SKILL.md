---
name: erp-frontend
description: Comprehensive guide, architecture patterns, and engineering workflows for developing and maintaining the PSES ERP Frontend application (Vue 3, Vite, Tailwind CSS v4, shadcn-vue, Pinia). Use when creating, modifying, refactoring, or testing ERP pages, components, services, composables, dialogs, and forms.
---

# PSES ERP Frontend Engineering Skill

Sistem panduan komprehensif untuk pengembangan dan pemeliharaan repositori **PSES ERP Frontend**. Panduan ini mencakup konvensi arsitektur **Clean Code**, pola dekomposisi berbasis domain, aturan desain **Anti-Slop**, sistem dialog feedback terpusat, dan standar pengujian otomatis.

---

## 1. Quick Stack Reference

| Kategori | Teknologi & Versi | Catatan Implementasi |
| :--- | :--- | :--- |
| **Framework** | Vue 3.5+ (Composition API) | Wajib `<script setup>`. Dilarang Options API. |
| **Build Tool** | Vite 8.2+ | Plugin `@vitejs/plugin-vue`. |
| **CSS** | Tailwind CSS v4.3+ | `@tailwindcss/vite`, CSS Variables di `src/style.css`. |
| **Primitives** | shadcn-vue (Reka UI) | Radix primitives di `src/components/ui/`. |
| **Toasts** | vue-sonner | Container `<Toaster />` di `App.vue`. |
| **State** | Pinia 4.0+ | Store terisolasi di `src/stores/auth.js`. |
| **Routing** | Vue Router 5.3+ | `src/routers/index.js` dengan guard auth & permission. |
| **HTTP** | Axios terpusat | `src/services/api.js` dengan Sanctum credentials. |
| **Icons** | Lucide Vue (`@lucide/vue`) | Ukuran konsisten `size-4`, `size-5`, `size-6`. |
| **Validation** | Vee-Validate 4 + Zod 4 | Skema validasi form reaktif. |
| **PDF Engine** | pdfMake | Berkas resmi persetujuan & serah terima BAST. |
| **Test Runner**| Node Native Test Runner | `npm test` (`node --test tests/**/*.test.js`). |

---

## 2. Aturan Desain & Identitas Visual (Anti-Slop Corporate Blue)

1. **Warna Brand Utama**:
   - **Corporate Blue `#014BAA`**: Digunakan untuk aksi primer (`bg-blue-600 hover:bg-blue-700`), tab aktif, badge modul, link interaktif.
2. **Aksen Status Fungsional**:
   - **Emerald Green** (`text-emerald-700 bg-emerald-50 border-emerald-200`): Sukses, Disetujui (*Approved*), status aktif.
   - **Amber** (`text-amber-800 bg-amber-50 border-amber-200`): Antrean (*Queue*), Menunggu Persetujuan (*Pending*), Perbaikan (*Revision*).
   - **Rose** (`text-rose-700 bg-rose-50 border-rose-200`, `bg-rose-600`): Ditolak (*Rejected*), Hapus (*Delete*), Pembatalan (*Cancel*), Error.
3. **Aturan Tegas Backdrop Modal (Zero Backdrop-Blur)**:
   - **DILARANG KERAS** menambahkan class `backdrop-blur`, `backdrop-blur-md`, atau `backdrop-blur-xs` pada modal dialog atau overlay!
   - Efek blur mengaburkan data operasional penting di tabel background.
   - Gunakan overlay redup solid: `bg-slate-900/40` dengan transisi opacity bersih.
4. **Ukuran Modal Dialog Proporsional**:
   - Modal alert / dialog konfirmasi harus memiliki lebar nyaman (`sm:max-w-lg md:max-w-xl`) dengan padding lapang (`p-7 sm:p-9`) dan kontras tinggi.

---

## 3. Arsitektur Feedback Terpusat (`src/utils/swal.js`)

**DILARANG** mengimpor `sweetalert2` secara langsung di file komponen atau view mana pun. Seluruh feedback wajib melalui adapter terpusat:

```javascript
import { 
    showSuccess, 
    showError, 
    showLoading, 
    closeSwal, 
    showConfirm, 
    showPrompt 
} from '@/utils/swal'
```

### Panduan Penggunaan Fungsi:
1. **`showSuccess(title, text)`**:
   - Menampilkan toast Sonner hijau emerald di pojok kanan atas.
   - **Penting**: Secara otomatis memanggil `closeGlobalDialog()` sehingga jika sebelumnya ada loading modal yang aktif, modal tersebut akan langsung tertutup tanpa menggantung.
2. **`showError(title, text, error)`**:
   - Menampilkan toast Sonner merah rose.
   - Otomatis mengekstrak pesan server jika parameter `error` diberikan (`error.response.data.message`).
   - Otomatis menutup dialog loading yang aktif.
3. **`showLoading(title, text)`**:
   - Menampilkan modal proses modern dengan spinner `Loader2` berputar tanpa efek blur.
   - Selalu pasangkan dengan `closeSwal()` atau `showSuccess()` / `showError()`.
   - Router navigation guard di `src/routers/index.js` otomatis membersihkan loading dialog yang tersisa saat navigasi halaman.
4. **`showConfirm(title, text, confirmText, cancelText, confirmColor)`**:
   - Membuka modal konfirmasi berbasis `AlertDialog` shadcn-vue.
   - Mengembalikan `Promise<boolean>`.
   - Otomatis mendeteksi aksi destruktif (mengandung kata 'hapus', 'delete', 'batal') dan menerapkan gaya merah rose.
5. **`showPrompt({ title, text, placeholder, confirmText, cancelText, isDestructive, validator })`**:
   - Membuka modal dialog dengan input `<textarea>` untuk alasan penolakan atau pembatalan.
   - Mengembalikan `Promise<{ isConfirmed: boolean, value: string|null }>`.
   - Mendukung validasi input realtime dan pintasan `Ctrl+Enter`.

---

## 4. Pola Clean Code Architecture (Anti-Fat Views)

### Aturan Batas Ukuran Komponen:
- View halaman yang melebihi **300 baris** WAJIB didekomposisi.

### Pola Dekomposisi:
1. **Form State & API Interaction -> Composables**:
   - Tempatkan state formulir di `src/composables/{domain}/use{Feature}Form.js`.
   - Contoh: `src/composables/purchasing/usePurchaseRequisitionForm.js`.
2. **Form Section Cards -> Sub-Komponen**:
   - Pecah tampilan formulir menjadi kartu-kartu terisolasi di `src/components/{domain}/{feature}/`.
   - Berikan props data formulir secara reaktif atau binding via `v-model`.
3. **Kalkulasi Finansial -> `useFinancialCalculation`**:
   - Selalu gunakan helper dari `src/composables/finance/useFinancialCalculation.js` untuk menghitung subtotal, pajak, diskon, biaya admin, dan kurs valuta asing:
   ```javascript
   import { useFinancialCalculation } from '@/composables/finance/useFinancialCalculation'

   const { calculateItemSubtotal, calculateTaxAmount, calculateGrandTotal } = useFinancialCalculation()
   ```
4. **Modal CRUD Standar -> `useModalState`**:
   - Gunakan `useModalState` dari `src/composables/core/useModalState.js` untuk mengelola state buka/tutup, edit ID, dan mode create/edit.
5. **Service Layer Facade Pattern**:
   - Jika service membengkak (>300 baris), pisahkan fungsi-fungsi endpoint ke dalam sub-folder (contoh: `src/services/approval/`) dan gunakan service utama (`approvalServices.js`) sebagai Facade yang mengekspor ulang fungsi-fungsi tersebut agar tidak merusak impor yang ada.

---

## 5. Prosedur Pengembangan Standar (Runbook)

### Prosedur A: Menambah Halaman Master Data Baru
1. Buat service API di `src/services/{entity}Services.js` dengan fungsi `get`, `create`, `show`, `update`, `delete`.
2. Buat view di `src/views/admin/master/{Entity}View.vue`:
   - Gunakan `PageHeader.vue`, `SearchInput.vue`, `BaseTable.vue`, dan `Pagination.vue`.
   - Kelola modal via `useModalState`.
   - Gunakan `showSuccess`, `showError`, `showConfirm` dari `@/utils/swal`.
3. Daftarkan rute di `src/routers/index.js` di bawah layout `AdminLayouts.vue` dengan `meta: { requiresAuth: true }`.
4. Daftarkan menu navigasi di `src/components/layout/AdminSidebar.vue`.
5. Buat contract test di `tests/{entity}.test.js` untuk memvalidasi ekspor fungsi service dan format payload.

### Prosedur B: Menambah Alur Form Transaksi / Workflow Baru
1. Definisikan endpoint di service domain terkait (`src/services/`).
2. Rancang composable `use{Feature}Form.js` di `src/composables/{domain}/`.
3. Pecah komponen form ke `src/components/{domain}/{feature}/`.
4. Pasang tombol aksi konfirmasi dengan `showConfirm` atau penolakan dengan `showPrompt`.
5. Tampilkan status progress via `showLoading` dan tutup dengan `showSuccess` begitu respons diterima.

---

## 6. Verifikasi & Jaminan Kualitas (Quality Assurance)

Sebelum menyerahkan tugas atau membuat commit:

1. **Jalankan Unit Test**:
   ```bash
   npm test
   ```
   Seluruh tes (minimal **128 tests** dari 29 suites) WAJIB lulus 100%.
2. **Jalankan Production Build**:
   ```bash
   npm run build
   ```
   Kompilasi Vite wajib selesai dengan exit code 0 tanpa broken chunk atau resolusi modul yang gagal.
