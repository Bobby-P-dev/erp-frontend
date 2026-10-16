# AI Agent Guidelines - ERP Frontend

Dokumen ini berisi kumpulan aturan, standar kode, arsitektur **Clean Code**, dan panduan desain untuk pengembangan **ERP Frontend** menggunakan **Vue 3, Vite, Tailwind CSS v4, Pinia, dan shadcn-vue**. Setiap agen AI yang bekerja di repositori ini WAJIB mematuhi panduan ini tanpa pengecualian.

---

## 1. Prinsip Utama & Tech Stack

- **Framework**: Vue 3 dengan Composition API murni dan sintaks `<script setup>`. **DILARANG KERAS** menggunakan Options API.
- **Build Tool**: Vite 8 (`@vitejs/plugin-vue`).
- **CSS Framework**: Tailwind CSS v4 (`@tailwindcss/vite`). Gunakan utility classes Tailwind yang konsisten dengan tema desain yang sudah ada.
- **Design System & Primitives**: [shadcn-vue](https://shadcn-vue.com/) berbasis [Reka UI](https://reka-ui.com/) (`AlertDialog`, `Dialog`, `Sonner`, `Alert`, `Button`, `Badge`, `DropdownMenu`, `Tooltip`).
- **State Management**: Pinia (`src/stores/auth.js`).
- **Routing**: Vue Router 5 (`src/routers/index.js`) dengan navigation guards terpusat.
- **HTTP Client**: Axios terpusat (`src/services/api.js`) dengan kredensial Sanctum session.
- **Icon Set**: Lucide Vue (`@lucide/vue`).
- **Toast & Alert Notification**: Terpusat melalui adapter `src/utils/swal.js` dan composable `src/composables/useFeedback.js` (**DILARANG** mengimpor `sweetalert2` secara langsung).
- **Document Engine**: `pdfMake` untuk cetak dokumen resmi (PR & BAST) dengan tanda tangan digital & verifikasi QR code.

---

## 1.1. Tema Warna, Tipografi & Anti-Slop UI Design

- **Primary Color**: **BIRU (Corporate Blue / Royal Blue)**:
  - Hex: `#014BAA`
  - Kelas Tailwind: `bg-blue-600`, `hover:bg-blue-700`, `text-blue-600`, `border-blue-200`, `bg-blue-50`.
  - Digunakan untuk: Tombol aksi utama, tab/navigasi aktif, ikon brand, highlight interaktif.
- **Secondary & Functional Accents**:
  - **Emerald / Green**: Status aktif, disetujui (*Approved*), sukses, dan nominal positif (`text-emerald-700 bg-emerald-50 border-emerald-200`).
  - **Amber / Yellow**: Status antrean (*Queue*), pending, draft, dan peringatan (*Warning*) (`text-amber-800 bg-amber-50 border-amber-200`).
  - **Rose / Red**: Status ditolak (*Rejected*), tombol hapus (*Delete*), pembatalan, dan error (`text-rose-700 bg-rose-50 border-rose-200`, `bg-rose-600`).
- **Surface & Canvas**:
  - Latar belakang bersih dan cerah (`bg-slate-50`, canvas `#F9FAFB`, card `#FFFFFF`, border `border-slate-200/90`).
  - **DILARANG** mendesain antarmuka serba hitam pekat (`bg-slate-900`, `bg-black`) atau monokrom mati (*colorless*). Antarmuka harus profesional dan kaya warna fungsional.
- **Aturan Tegas Anti-Slop & Modal Backdrop**:
  - **DILARANG KERAS** menggunakan efek `backdrop-blur` (`backdrop-blur-md`, `backdrop-blur-xs`) pada modal dialog atau overlay! Efek blur mengaburkan informasi operasional penting di belakangnya.
  - Gunakan overlay redup solid yang tajam dan bersih: `bg-slate-900/40` tanpa filter blur.
  - **DILARANG** menggunakan gradasi neon ungu klise AI (`from-purple-600 to-indigo-600`).
  - Modal dialog harus memiliki ukuran yang cukup (`sm:max-w-lg md:max-w-xl`), padding lapang (`p-7 sm:p-9`), dan tipografi tebal yang jelas.

---

## 2. Struktur Direktori & Tanggung Jawab Layer

Patuhi struktur folder Clean Architecture yang sudah mapan:

```text
src/
├── components/
│   ├── approval/     # Stepper, ApprovalBadge, DocumentWorkflowTracker, Lifecycle
│   ├── finance/      # Modal pencairan dan resubmit perbankan
│   ├── inventory/    # Modal penerimaan barang & serah terima BAST
│   ├── layout/       # AdminSidebar, AppHeader, AppFooter, UserProfileDropdown
│   ├── profile/      # SignaturePadModal untuk tanda tangan digital
│   ├── purchasing/   # Dekomposisi sub-komponen purchasing (detail/, direct/, requisition/)
│   └── ui/           # Design System & Primitives shadcn-vue (BaseButton, BaseTable, AlertDialog, Alert, Sonner, dll.)
├── composables/      # Logika state & kalkulasi terpisah (Clean Architecture)
│   ├── core/         # useDataTable, useModalState
│   ├── finance/      # useFinancialCalculation (subtotal, pajak, diskon, konversi kurs)
│   ├── purchasing/   # usePurchaseRequisitionForm, useDirectPurchaseForm
│   ├── useFeedback.js # Reactive controller dialog konfirmasi, prompt alasan, & loading
│   └── useFormatter.js # Formatter mata uang, tanggal, dan angka
├── config/           # Module registry & purchasing menu stages
├── layouts/          # Wrapper layout (AdminLayouts, UserLayouts, GuestLayouts)
├── lib/              # Utility Tailwind cn() helper (clsx + tailwind-merge)
├── routers/          # Konfigurasi Vue Router (index.js) & Navigation Guards
├── services/         # Layer komunikasi HTTP API (terisolasi per modul/fitur)
│   ├── approval/     # Sub-service modular persetujuan
│   ├── approvalServices.js # Facade pattern backward-compatible
│   └── ...           # Service modul lainnya
├── stores/           # Pinia store untuk state global (auth.js)
├── utils/            # Helper utilitas (swal.js, stringUtils.js, pdf/)
└── views/            # Halaman tampilan utama
    ├── admin/        # Master data & konfigurasi approval (admin/master/, admin/settings/)
    ├── guest/        # Tampilan publik (Login, Welcome)
    ├── profile/      # Profil & tanda tangan pengguna
    ├── purchasing/   # Modul lengkap Purchasing (PR, Direct Purchase, Procurement Plan, Approval Inbox)
    └── user/         # Dashboard operasional pengguna
```

---

## 3. Aturan Service Layer (HTTP Communication)

1. **Dilarang Keras Melakukan Axios Call Langsung di Komponen**:
   - Seluruh pemanggilan endpoint API backend WAJIB diabstraksi di dalam folder `src/services/`.
   - File service dinamai dengan pola camelCase berakhiran `Services.js` (contoh: `divisionServices.js`, `directPurchaseServices.js`).

2. **Konvensi Penamaan Fungsi Service**:
   - `get{Entities}(search, page, filter)`: Mengambil data paginasi dengan filter.
   - `search{Entities}(search, extraParam)`: Pencarian opsi untuk dropdown/select.
   - `create{Entity}(data)`: POST data baru.
   - `show{Entity}(id)`: GET detail spesifik ID.
   - `update{Entity}(id, data)`: PATCH/PUT pembaruan data.
   - `delete{Entity}(id)`: DELETE data.

3. **Format Standar Service**:
   ```javascript
   import api from './api'

   export const getEntities = async (search = '', page = 1, filter = {}) => {
       const params = new URLSearchParams()
       if (search) params.append('search', search)
       if (page) params.append('page', page)
       for (const key in filter) {
           if (filter[key] !== null && filter[key] !== undefined && filter[key] !== '') {
               params.append(key, filter[key])
           }
       }
       const queryString = params.toString() ? `?${params.toString()}` : ''
       const response = await api.get(`/api/v1/entity/get-all${queryString}`)
       return response.data
   }
   ```

4. **Service Facade Pattern untuk Modul Besar**:
   - Jika service bertumbuh melebihi 300 baris atau memiliki multi-domain (seperti `approvalServices.js`), pisahkan ke folder sub-service (contoh: `src/services/approval/`) dan gunakan file utama sebagai **Facade** yang mengekspor ulang fungsi-fungsi tersebut untuk menjamin kompatibilitas 100%.

---

## 4. Standar UI Kit & Feedback System (`src/utils/swal.js`)

**DILARANG** mengimpor package `sweetalert2` secara langsung. Selalu gunakan helper feedback resmi:

```javascript
import { showSuccess, showError, showLoading, closeSwal, showConfirm, showPrompt } from '@/utils/swal'
```

1. **Notifikasi Sukses / Gagal**:
   - `showSuccess('Berhasil!', 'Data telah disimpan.')`: Memunculkan toast Sonner hijau emerald. Otomatis menutup loading dialog yang sedang aktif.
   - `showError('Gagal!', 'Pesan error server', error)`: Memunculkan toast Sonner merah rose dan otomatis mengekstrak `error.response.data.message`.

2. **Dialog Konfirmasi Aksi (`showConfirm`)**:
   - Otomatis mendeteksi aksi destruktif (kata kunci 'hapus', 'delete', 'batal') dan memberi aksen merah rose.
   - Contoh konfirmasi hapus:
     ```javascript
     const confirmed = await showConfirm(
         'Apakah Anda yakin?',
         'Data yang dihapus tidak dapat dipulihkan.'
     )
     if (confirmed) {
         try {
             showLoading('Menghapus data...')
             await deleteEntity(id)
             showSuccess('Berhasil!', 'Data berhasil dihapus.')
             fetchData()
         } catch (error) {
             showError('Gagal!', 'Terjadi kesalahan saat menghapus data.', error)
         }
     }
     ```

3. **Modal Input Alasan / Penolakan (`showPrompt`)**:
   - Digunakan untuk penolakan approval atau pembatalan transaksi dengan textarea terintegrasi:
     ```javascript
     const { value: reason, isConfirmed } = await showPrompt({
         title: 'Batalkan Transaksi?',
         text: 'Masukkan alasan pembatalan dokumen ini:',
         placeholder: 'Tuliskan alasan...',
         confirmText: 'Ya, Batalkan',
         isDestructive: true,
         validator: (val) => (!val ? 'Alasan wajib diisi!' : null)
     })
     if (isConfirmed) {
         await cancelTransaction(id, reason)
     }
     ```

---

## 5. Pola Dekomposisi View (Clean Code & Anti-Fat Views)

Jika suatu halaman form atau workflow view memiliki baris kode lebih dari **300 baris** (seperti form pemesanan atau multi-step):

1. **Pisahkan Logika ke Composable**:
   - Tempatkan state form, validasi, dan handler API di dalam `src/composables/{domain}/use{Feature}Form.js`.
2. **Dekomposisi Template ke Sub-Komponen**:
   - Pecah kartu atau bagian form ke folder `src/components/{domain}/{feature}/` (contoh: `RequisitionGeneralCard.vue`, `RequisitionItemListCard.vue`).
3. **Harmonisasi Styling**:
   - Gunakan utility `cn()` dari `src/lib/utils.js` atau `src/utils/cn.js` untuk menggabungkan class Tailwind secara dinamis.
   - Selalu gunakan `useFinancialCalculation` untuk perhitungan nominal, subtotal, diskon, dan pajak agar presisi desimal terjaga.

---

## 6. Standar Routing & Navigasi

1. **Rute Baru**:
   - Daftarkan pada `src/routers/index.js` di dalam group `children` layout yang sesuai (`AdminLayouts.vue` untuk `/admin`, `UserLayouts.vue` untuk `/dashboard`).
   - Berikan properti `meta: { requiresAuth: true, permission: '...' }` untuk halaman yang memerlukan hak akses.
   - Gunakan lazy loading: `component: () => import('../views/your-path/YourView.vue')`.

2. **Menu Sidebar**:
   - Daftarkan item ke dalam array navigasi di `src/components/layout/AdminSidebar.vue` atau `src/config/purchasingMenu.js`.
   - Pastikan nama rute (`to: 'user.purchasing.requisitions'`) sama persis dengan yang terdaftar di router.

---

## 7. Kewajiban Pengujian & Verifikasi (Quality Assurance)

Setiap agen AI yang melakukan perubahan atau penambahan fitur **WAJIB** menjalankan dan memastikan:

1. **Automated Unit Tests**:
   ```bash
   npm test
   ```
   Seluruh pengujian contract (minimal **128 tests**) harus berstatus **100% PASS** tanpa satupun yang gagal.
2. **Production Build Compilation**:
   ```bash
   npm run build
   ```
   Kompilasi Vite harus selesai dengan kode keluar 0 (*clean build*) tanpa ada *broken import* atau sintaks bermasalah.
