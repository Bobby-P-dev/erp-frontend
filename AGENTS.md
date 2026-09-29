# AI Agent Guidelines - ERP Frontend

Dokumen ini berisi kumpulan aturan, standar kode, dan arsitektur untuk pengembangan **ERP Frontend** menggunakan **Vue 3, Vite, Tailwind CSS v4, dan Pinia**. Setiap agen AI yang bekerja di repositori ini WAJIB mematuhi panduan ini tanpa pengecualian.

---

## 1. Prinsip Utama & Tech Stack

- **Framework**: Vue 3 dengan Composition API dan sintaks `<script setup>`. DILARANG menggunakan Options API.
- **Build Tool**: Vite.
- **CSS Framework**: Tailwind CSS v4 (`@tailwindcss/vite`). Gunakan utility classes Tailwind yang konsisten dengan tema desain yang sudah ada.
- **State Management**: Pinia (`src/stores/`).
- **Routing**: Vue Router (`src/routers/index.js`).
- **HTTP Client**: Axios terpusat (`src/services/api.js`).
- **Icon Set**: Lucide Vue (`@lucide/vue`).
- **Alert & Notification**: SweetAlert2 melalui utility wrapper `src/utils/swal.js`.

---

## 1.1. Tema Warna & Identitas Desain (Color Palette)

- **Primary Color**: **BIRU (Corporate Blue / Royal Blue)**:
  - Kelas Tailwind: `bg-blue-600`, `hover:bg-blue-700`, `text-blue-600`, `border-blue-200`, `bg-blue-50`.
  - Digunakan untuk: Tombol aksi utama, tab/navigasi aktif, ikon brand, dan highlight interaktif.
- **Secondary & Functional Accents**:
  - **Emerald / Green**: Status aktif, disetujui (*Approved*), sukses, dan nominal positif (`text-emerald-700 bg-emerald-50 border-emerald-200`).
  - **Amber / Yellow**: Status antrean (*Queue*), pending, draft, dan peringatan (*Warning*) (`text-amber-800 bg-amber-50 border-amber-200`).
  - **Rose / Red**: Status ditolak (*Rejected*), tombol hapus (*Delete*), dan error (`text-rose-700 bg-rose-50 border-rose-200`).
- **Surface & Canvas**:
  - Latar belakang bersih dan cerah (`bg-slate-50`, `bg-white`, border `border-slate-200/80`).
  - **DILARANG** mendesain antarmuka yang serba hitam pekat (`bg-slate-900`, `bg-black`) atau monokrom mati tanpa warna (*colorless*). Antarmuka harus profesional, kaya warna fungsional, dan ramah pengguna dengan warna utama **Biru**.

---

## 2. Struktur Direktori & Tanggung Jawab Layer

Patuhi struktur folder yang sudah mapan:

```text
src/
├── components/
│   ├── layout/       # Komponen tata letak (AdminSidebar, AppHeader, AppFooter, UserProfileDropdown)
│   └── ui/           # Design System & UI Kit siap pakai (BaseButton, BaseInput, BaseTable, dll.)
├── layouts/          # Wrapper layout halaman (AdminLayouts, UserLayouts, GuestLayouts)
├── routers/          # Konfigurasi Vue Router (index.js)
├── services/         # Layer komunikasi HTTP API (terisolasi per modul/fitur)
├── stores/           # Pinia store untuk state global (auth.js, dll.)
├── utils/            # Helper utilitas (swal.js, stringUtils.js)
└── views/            # Halaman tampilan (views)
    ├── admin/        # Tampilan admin & master data (admin/master/)
    ├── guest/        # Tampilan publik (Login, Welcome)
    └── user/         # Tampilan pengguna standar (dashboard)
```

---

## 3. Aturan Service Layer (HTTP Communication)

1. **Dilarang Keras Melakukan Axios Call Langsung di Komponen**:
   - Seluruh pemanggilan endpoint API backend WAJIB diabstraksi di dalam folder `src/services/`.
   - File service dinamai dengan pola camelCase berakhiran `Services.js` (contoh: `divisionServices.js`, `accountingCategoryServices.js`).

2. **Konvensi Penamaan Fungsi Service**:
   - `get{Entities}(search, page, filter)`: Mengambil data paginasi dengan filter.
   - `search{Entities}(search, extraParam)`: Pencarian opsi untuk dropdown/select.
   - `create{Entity}(data)`: POST data baru.
   - `show{Entity}(id)`: GET detail spesifik ID.
   - `update{Entity}(id, data)`: PATCH pembaruan data.
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

---

## 4. Standar Penggunaan Komponen UI (`src/components/ui`)

Untuk menjaga estetika dan konsistensi, **JANGAN membuat elemen HTML manual (seperti raw `<button>` atau raw `<input>`) jika komponen UI sudah tersedia**:

| Komponen | Props / Kegunaan Utama |
| :--- | :--- |
| `PageHeader.vue` | `title`, `description`, `:breadcrumbs`, slot tombol aksi header |
| `BaseBreadcrumb.vue` | `:items="breadcrumbs"`, `showHome`, auto route resolution |
| `BaseTable.vue` | `:columns="tableColumns"`, `:data="items"`, scoped slots untuk kolom khusus (status, actions) |
| `Pagination.vue` | `:pagination="pagination"`, `@page-change="handlePageChange"` |
| `BaseButton.vue` | `variant="primary|secondary|danger|outline"`, `size="sm|md|lg"` |
| `BaseInput.vue` | `v-model`, `label`, `placeholder`, `error`, `required` |
| `SearchInput.vue` | `v-model`, input pencarian dengan debounce |
| `SearchableSelect.vue` | Select tunggal dengan fitur pencarian live |
| `SearchableMultiSelect.vue` | Select multi-item dengan fitur pencarian live |
| `StatusBadge.vue` | `:status="item.is_active"`, menampilkan badge aktif/nonaktif |
| `ToggleSwitch.vue` | `v-model="form.is_active"`, switch boolean |

---

## 5. Pola Standar CRUD Master Data View (`src/views/admin/master/`)

Saat membuat atau memperbarui halaman master data view (contoh: `DivisionView.vue`, `JobLevelView.vue`):

1. **Struktur Skrip**:
   - Gunakan `<script setup>`.
   - Simpan state data utama: `items = ref([])`.
   - Simpan state paginasi:
     ```javascript
     const pagination = ref({
         current_page: 1,
         last_page: 1,
         from: 0,
         to: 0,
         total: 0
     })
     ```
   - Gunakan debounced search (300-500ms) menggunakan `watch(searchQuery, ...)`.
   - Modal state: `showModal`, `isEditing`, `editId`, `form = ref({ ... })`.

2. **Feedback Pengguna (SweetAlert2)**:
   - Selalu gunakan `showLoading`, `showSuccess`, `showError`, dan `showConfirm` dari `src/utils/swal.js`.
   - Contoh konfirmasi hapus:
     ```javascript
     const confirmed = await showConfirm(
         'Apakah Anda yakin?',
         'Data yang dihapus tidak dapat dikembalikan.'
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

3. **Struktur Template View**:
   - `PageHeader` di bagian atas.
   - Filter & `SearchInput`.
   - `BaseTable` dengan kolom `actions` (tombol Edit & Hapus).
   - `Pagination` di bawah tabel.
   - Modal dialog form (Create / Edit) dengan tombol Simpan & Batal.

---

## 6. Routing & Sidebar Navigation

1. **Rute Baru**:
   - Daftarkan pada `src/routers/index.js` di dalam group `children` layout yang sesuai (`AdminLayouts.vue` untuk `/admin`).
   - Berikan properti `meta: { requiresAuth: true, permission: '...' }` untuk halaman yang memerlukan hak akses.
   - Gunakan lazy loading: `component: () => import('../views/admin/master/YourView.vue')`.

2. **Menu Sidebar**:
   - Jika halaman merupakan master data atau menu navigasi baru, daftarkan item ke dalam array `navigation` di `src/components/layout/AdminSidebar.vue`.
   - Pastikan nama rute (`to: 'admin.master.your-name'`) sama persis dengan yang terdaftar di router.
