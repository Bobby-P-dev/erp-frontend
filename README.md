# ERP Frontend (Vue 3 + Vite + Tailwind CSS v4)

Sistem antarmuka pengguna (Frontend SPA) untuk Enterprise Resource Planning (ERP), dibangun dengan performa tinggi, modularitas bersih, dan pengalaman pengguna yang responsif.

---

## 🚀 Teknologi & Stack Utama

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API dengan `<script setup>`)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Routing**: [Vue Router 4](https://router.vuejs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) dengan `@tailwindcss/vite`
- **Icon Pack**: [Lucide Vue](https://lucide.dev/) (`@lucide/vue`)
- **HTTP Client**: [Axios](https://axios-http.com/) (Instance terpusat dengan Cookie & CSRF credentials)
- **Dialog & Notifications**: [SweetAlert2](https://sweetalert2.github.io/) (Diabstraksikan di `src/utils/swal.js`)
- **Validation**: [Vee-Validate](https://vee-validate.logaretm.com/) & [Zod](https://zod.dev/)

---

## 📁 Struktur Direktori Project

```text
src/
├── assets/                  # File statis (gambar, logo, svg)
├── components/
│   ├── layout/              # Komponen struktur halaman (Header, Sidebar, Footer, ProfileDropdown)
│   └── ui/                  # Reusable UI Design System (BaseButton, BaseInput, BaseTable, dll.)
├── layouts/                 # Layout wrappers (AdminLayouts, UserLayouts, GuestLayouts)
├── routers/                 # Definisi rute Vue Router & Navigation Guards
│   └── index.js
├── services/                # Layer API HTTP Client terisolasi per domain/fitur
│   ├── api.js               # Konfigurasi dasar instance Axios
│   ├── authServices.js
│   ├── companyServices.js
│   ├── divisionServices.js
│   ├── employeeServices.js
│   ├── jobLevelServices.js
│   ├── positionServices.js
│   ├── roleServices.js
│   ├── permissionServices.js
│   ├── permissionCategoryServices.js
│   ├── userServices.js
│   ├── accountingCategoryServices.js
│   ├── accountingSubcategoryServices.js
│   ├── accountingAccountServices.js
│   └── accountingServices.js
├── stores/                  # Global state management dengan Pinia (e.g. auth.js)
├── utils/                   # Utility helpers (swal.js, stringUtils.js)
├── views/                   # Tampilan halaman utama
│   ├── guest/               # Halaman publik (Login, Welcome)
│   ├── user/                # Halaman operasional user umum
│   └── admin/               # Halaman Administrator & Master Data
│       ├── DashboardView.vue
│       └── master/          # Master data CRUD views
├── App.vue                  # Root App component
├── main.js                  # Entrypoint Vue application
└── style.css                # Global CSS & Tailwind imports
```

---

## ⚙️ Setup & Menjalankan Aplikasi

### 1. Prasyarat

- Node.js versi 18+ atau 20+
- Backend ERP sudah berjalan (e.g. `http://erp-backend.test` atau sesuai konfigurasi Axios)

### 2. Instalasi Dependency

```bash
npm install
```

### 3. Menjalankan Server Development

```bash
npm run dev
```

### 4. Build untuk Production

```bash
npm run build
```

---

## 🧩 Standar Desain & Komponen UI (`src/components/ui`)

Proyek ini telah menyediakan komponen UI siap pakai yang wajib digunakan untuk menjaga konsistensi antarmuka:

| Komponen                    | Kegunaan                                                         |
| :-------------------------- | :--------------------------------------------------------------- |
| `PageHeader.vue`            | Header standar halaman (Judul, Deskripsi, Tombol Aksi Utama)     |
| `BaseTable.vue`             | Tabel data responsif dengan slot kustom untuk kolom              |
| `Pagination.vue`            | Kontrol paginasi data                                            |
| `BaseButton.vue`            | Tombol dengan varian (primary, secondary, danger, outline, dll.) |
| `BaseInput.vue`             | Input teks / email / password dengan label & error state         |
| `BaseSelect.vue`            | Select dropdown standar                                          |
| `SearchInput.vue`           | Input pencarian dengan ikon search                               |
| `SearchableSelect.vue`      | Dropdown dengan fitur live search opsi data                      |
| `SearchableMultiSelect.vue` | Dropdown multi-pilihan dengan live search                        |
| `StatusBadge.vue`           | Label badge status (Aktif, Nonaktif, Pending, dll.)              |
| `ToggleSwitch.vue`          | Switch toggle boolean                                            |

---

## 🌐 Arsitektur Service Layer

Semua komunikasi HTTP ke Backend **wajib** melalui folder `src/services/`.
Format fungsi standar per service:

- `get{Entities}(search, page, filter)`: Mengambil data paginasi dengan filter.
- `search{Entities}(search)`: Pencarian cepat untuk dropdown / autocomplete.
- `create{Entity}(data)`: Menyimpan data baru.
- `show{Entity}(id)`: Mengambil detail satu entitas.
- `update{Entity}(id, data)`: Memperbarui data entitas.
- `delete{Entity}(id)`: Menghapus data entitas.

Contoh pemanggilan:

```javascript
import { getDivisions, createDivision } from "@/services/divisionServices";

const loadData = async () => {
  const response = await getDivisions(searchQuery.value, currentPage.value);
  items.value = response.data;
};
```

---

## 🔐 Autentikasi & Otorisasi

- Autentikasi dikelola oleh Pinia store (`src/stores/auth.js`) menggunakan Laravel Sanctum cookie session.
- **Route Guards**:
  - `meta.requiresAuth`: Memerlukan login aktif.
  - `meta.guest`: Hanya untuk pengguna yang belum login (Login, Welcome).
  - `meta.permission`: Memerlukan permission tertentu (e.g. `admin.read`).
- **Menu Sidebar Dinamis**:
  Menu pada `AdminSidebar.vue` tersinkronisasi berdasarkan struktur Master Data (`Core`, `Purchasing`, `Accounting`).

---

## 🔔 Feedback Pengguna (SweetAlert2)

Gunakan utility `src/utils/swal.js` untuk interaksi pop-up seragam:

```javascript
import { showLoading, showSuccess, showError, showConfirm } from "@/utils/swal";

// Konfirmasi Hapus
const confirmed = await showConfirm(
  "Hapus Data?",
  "Data yang dihapus tidak dapat dikembalikan.",
);
if (confirmed) {
  await deleteDivision(id);
  showSuccess("Berhasil!", "Data telah dihapus.");
}
```
