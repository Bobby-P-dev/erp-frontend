# PSES ERP Frontend

[![Vue 3](https://img.shields.io/badge/Vue-3.5+-4FC08D?style=flat&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2+-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![shadcn--vue](https://img.shields.io/badge/shadcn--vue-reka--nova-000000?style=flat&logo=shadcnui&logoColor=white)](https://shadcn-vue.com/)
[![Pinia](https://img.shields.io/badge/Pinia-4.0+-FFE57F?style=flat&logo=vuedotjs&logoColor=black)](https://pinia.vuejs.org/)
[![Tests](https://img.shields.io/badge/Tests-128%20Passing-brightgreen?style=flat&logo=node.js&logoColor=white)]()

Sistem antarmuka pengguna (**Frontend SPA**) modern untuk **Enterprise Resource Planning (ERP)** manufaktur & korporat, dibangun dengan arsitektur **Clean Code**, performa tinggi, modularitas berbasis domain, dan pengalaman pengguna tactile tanpa *AI-slop*.

---

## 🚀 Teknologi & Stack Utama

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API murni dengan `<script setup>`)
- **Build Tool**: [Vite 8](https://vitejs.dev/) dengan `@vitejs/plugin-vue`
- **CSS Framework**: [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite` & CSS Variables modern)
- **Design System & Primitives**: [shadcn-vue](https://shadcn-vue.com/) berbasis [Reka UI](https://reka-ui.com/) (AlertDialog, Dialog, Sonner, Alert, Button, Badge, Dropdown, Tooltip)
- **Toast Notifications**: [vue-sonner](https://vue-sonner.vercel.app/) dengan integrasi tema enterprise
- **State Management**: [Pinia](https://pinia.vuejs.org/) (`src/stores/auth.js`)
- **Routing**: [Vue Router 5](https://router.vuejs.org/) dengan dynamic authentication & permission navigation guards
- **HTTP Client**: [Axios](https://axios-http.com/) terpusat (`src/services/api.js`) dengan kredensial session & CSRF protection
- **Icon Set**: [Lucide Vue](https://lucide.dev/) (`@lucide/vue`)
- **Form Validation**: [Vee-Validate](https://vee-validate.logaretm.com/) & [Zod](https://zod.dev/)
- **Document Generation**: [pdfMake](https://pdfmake.github.io/docs/) untuk cetak Lembar Persetujuan PR resmi dan Berita Acara Serah Terima (BAST) dengan tanda tangan digital & QR Code

---

## 🎨 Tema Warna & Identitas Desain (Color Palette)

Antarmuka ERP mengadopsi standar **Anti-Slop AI Design**: kontras tajam, layout asimetris fungsional, tipografi Geist yang presisi, border halus, serta **tanpa backdrop-blur yang mengaburkan data operasional**.

| Peran Warna | Hex / Utility Tailwind | Penggunaan Utama |
| :--- | :--- | :--- |
| **Primary Brand** | `#014BAA` (`bg-blue-600`, `hover:bg-blue-700`, `text-blue-600`) | Tombol aksi utama, tab aktif, brand accent, indikator navigasi |
| **Success / Approved** | `#177245` (`text-emerald-700 bg-emerald-50 border-emerald-200`) | Status Disetujui, Berhasil, Aktif, nominal kas masuk |
| **Warning / Pending** | `#92400e` (`text-amber-800 bg-amber-50 border-amber-200`) | Status Antrean (*Queue*), Menunggu Persetujuan, Perbaikan (*Revision*) |
| **Destructive / Error** | `#c62828` (`text-rose-700 bg-rose-50 border-rose-200`, `bg-rose-600`) | Tombol Hapus, Batalkan Transaksi, Ditolak (*Rejected*), pesan error |
| **Surface & Neutral** | `#F9FAFB` canvas, `#FFFFFF` cards, `border-slate-200/90` | Latar belakang bersih dengan kontras tinggi tanpa serba hitam/gelap |

---

## 📁 Struktur Direktori Proyek

```text
src/
├── assets/                    # Gambar, ilustrasi hero operasional, dan ikon SVG
├── components/
│   ├── approval/              # ApprovalStepper, ApprovalBadge, DocumentWorkflowTracker, Lifecycle
│   ├── finance/               # Modal pencairan pembayaran dan resubmit verifikasi bank
│   ├── inventory/             # Modal penerimaan barang (Goods Receipt) & serah terima (BAST)
│   ├── layout/                # AdminSidebar, AppHeader, AppFooter, UserProfileDropdown
│   ├── profile/               # SignaturePadModal untuk spesimen tanda tangan digital
│   ├── purchasing/            # Dekomposisi form PR & Direct Purchase berbasis domain
│   │   ├── detail/            # Modal & panel detail dokumen pengadaan
│   │   ├── direct/            # DirectPurchaseGeneralCard, ItemList, FinancialSummary
│   │   └── requisition/       # RequisitionGeneralCard, ItemList, ApprovalPreviewCard
│   └── ui/                    # Reusable Design System & shadcn-vue Primitives
│       ├── alert/             # Alert inline dengan varian status (success, error, warning, info)
│       ├── alert-dialog/      # Modal dialog konfirmasi, hapus, prompt alasan, dan loading
│       ├── button/            # Button variants (cva)
│       ├── sonner/            # Sonner toast provider container
│       ├── GlobalAlertDialog.vue # Centralized modal dialog renderer
│       ├── BaseButton.vue     # Tombol kompatibilitas tinggi dengan cn() utility
│       ├── BaseTable.vue      # Tabel data enterprise dengan slot kustom
│       ├── Pagination.vue     # Kontrol navigasi halaman responsif
│       ├── StatusBadge.vue    # Pemetaan status cerdas untuk seluruh siklus ERP
│       └── SearchInput.vue    # Input pencarian terintegrasi
├── composables/               # Logic reusable terisolasi (Clean Architecture)
│   ├── core/                  # useDataTable, useModalState
│   ├── finance/               # useFinancialCalculation (subtotal, pajak, diskon, konversi kurs)
│   ├── purchasing/            # usePurchaseRequisitionForm, useDirectPurchaseForm
│   ├── useFeedback.js         # Reactive controller untuk dialog konfirmasi, prompt, dan loading
│   └── useFormatter.js        # Formatter mata uang IDR/Valas, tanggal Indonesia, dan angka
├── config/                    # Registry modul ERP dan tahapan procurement lifecycle
├── layouts/                   # Layout wrappers (AdminLayouts, UserLayouts, GuestLayouts)
├── lib/                       # Utility Tailwind `cn()` helper (clsx + tailwind-merge)
├── routers/                   # Definisi rute Vue Router & global navigation guards
├── services/                  # Layer API terisolasi per domain modul (Axios Client)
│   ├── approval/              # approvalConfig, approvalDocument, approvalWorkflow services
│   ├── approvalServices.js    # Facade pattern backward-compatible untuk persetujuan
│   ├── directPurchaseServices.js
│   ├── procurementPlanServices.js
│   ├── purchaseRequisitionServices.js
│   └── ...                    # Service master data (unit, currency, company, division, dll.)
├── stores/                    # Pinia global store (auth.js)
├── utils/
│   ├── pdf/                   # Generator PDF lembar persetujuan & serah terima BAST
│   ├── swal.js                # Drop-in feedback adapter (Sonner + shadcn AlertDialog)
│   └── stringUtils.js         # Manipulasi string dan pemformatan data
├── views/                     # Halaman tampilan antarmuka
│   ├── admin/                 # Master data & pengaturan alur persetujuan
│   ├── guest/                 # Halaman login & welcome publik
│   ├── profile/               # Pengaturan akun & manajemen tanda tangan digital
│   ├── purchasing/            # Alur lengkap Procurement Lifecycle
│   └── user/                  # Dashboard operasional utama
├── App.vue                    # Root application component dengan GlobalAlertDialog & Toaster
├── main.js                    # Entrypoint aplikasi
└── style.css                  # Konfigurasi Tailwind v4, CSS Variables, dan tema Geist
```

---

## 🔔 Sistem Feedback Terpadu (shadcn-vue + Sonner)

Sistem dialog SweetAlert2 lama telah dimodernisasi sepenuhnya ke **shadcn-vue** melalui wrapper adapter transparan di [`src/utils/swal.js`](file:///var/www/erp-frontend/src/utils/swal.js) dan [`useFeedback.js`](file:///var/www/erp-frontend/src/composables/useFeedback.js):

### 1. Notifikasi Toast Mengambang (`showSuccess`, `showError`)
- Menggunakan `vue-sonner` dengan ikon Lucide, sudut `rounded-xl`, dan styling enterprise:
  ```javascript
  import { showSuccess, showError } from '@/utils/swal'

  showSuccess('Berhasil!', 'Data Purchase Requisition telah disimpan.')
  showError('Gagal!', 'Terjadi kendala saat menghubungi server.', error)
  ```
- Menutup modal loading secara otomatis saat respons berhasil/gagal diterima.

### 2. Dialog Konfirmasi & Hapus (`showConfirm`)
- Modal `AlertDialog` dengan deteksi aksi destruktif (merah) atau konstruktif (biru):
  ```javascript
  import { showConfirm } from '@/utils/swal'

  const confirmed = await showConfirm(
      'Hapus Item Barang?',
      'Data yang dihapus tidak dapat dikembalikan.',
      'Ya, Hapus!'
  )
  if (confirmed) {
      await deleteItem(id)
  }
  ```

### 3. Modal Prompt Alasan Penolakan/Pembatalan (`showPrompt`)
- Menyediakan textarea input dengan validasi realtime dan pintasan `Ctrl+Enter`:
  ```javascript
  import { showPrompt } from '@/utils/swal'

  const { value: reason, isConfirmed } = await showPrompt({
      title: 'Batalkan Pembelian Langsung?',
      text: 'Masukkan alasan pembatalan transaksi ini:',
      placeholder: 'Tuliskan alasan pembatalan...',
      confirmText: 'Ya, Batalkan Pembelian',
      isDestructive: true,
      validator: (val) => (!val ? 'Alasan wajib diisi!' : null)
  })
  ```

### 4. Indikator Loading Modern (`showLoading`, `closeSwal`)
- Modal proses bersih tanpa efek blur yang mengganggu:
  ```javascript
  import { showLoading, closeSwal } from '@/utils/swal'

  showLoading('Memproses Transaksi...', 'Mohon tunggu sebentar.')
  // Setelah proses selesai:
  closeSwal() // atau panggil showSuccess() yang otomatis menutup dialog
  ```

---

## ⚙️ Panduan Menjalankan Proyek

### 1. Prasyarat Lingkungan
- **Node.js**: versi 20.x atau 22.x LTS
- **NPM**: versi 10.x+

### 2. Instalasi Dependency
```bash
npm install
```

### 3. Menjalankan Server Development
```bash
npm run dev
```
Aplikasi akan aktif di `http://localhost:5173/`.

### 4. Menjalankan Automated Unit Tests
Seluruh pengujian contract API, composable lifecycle, kalkulasi finansial, dan feedback state dijalankan menggunakan Node native test runner:
```bash
npm test
```
*Status saat ini: **128 passing tests** dari 29 test suites.*

### 5. Kompilasi Produksi (Production Build)
```bash
npm run build
```
Hasil build produksi yang teroptimasi akan dihasilkan di direktori `dist/`.

---

## 🏛️ Pola Arsitektur Kode (Clean Architecture)

1. **Anti-Fat Views**:
   - Tampilan kompleks didekomposisi ke komponen berbasis domain (`components/purchasing/`) dan composables terpisah (`composables/purchasing/`).
   - Kode view hanya bertanggung jawab atas template layout utama, sedangkan kalkulasi dan form state diisolasi di composable.
2. **Service Facade Pattern**:
   - File service besar seperti `approvalServices.js` menggunakan Facade pattern yang mendelegasikan ke modul terspesialisasi di `src/services/approval/`, menjaga backward-compatibility 100%.
3. **Reusabilitas UI System**:
   - Seluruh tombol, badge, input, dan tabel memanfaatkan utility `cn()` (`clsx` + `tailwind-merge`) untuk penggabungan kelas dinamis yang aman dari konflik.
4. **Zero-Lag Form Financial Engine**:
   - Perhitungan subtotal, pajak, diskon, biaya admin, dan konversi kurs mata uang asing menggunakan `useFinancialCalculation` dengan pembulatan presisi desimal tanpa side-effect numerik.

---

## 📄 Lisensi & Hak Cipta

Proyek ini dikembangkan secara internal untuk sistem operasional PT PSES ERP. Hak cipta dilindungi undang-undang.
