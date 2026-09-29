<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Home, ChevronRight } from '@lucide/vue'

const props = defineProps({
    items: {
        type: Array,
        default: null
    },
    showHome: {
        type: Boolean,
        default: true
    },
    homeRoute: {
        type: [String, Object],
        default: null
    },
    homeLabel: {
        type: String,
        default: 'Dashboard'
    },
    homeIcon: {
        type: [Object, Function],
        default: null
    }
})

const route = useRoute()

// Predefined route dictionary for automatic resolution across the ERP system
const ROUTE_BREADCRUMBS = {
    // User / Operational
    'user.dashboard': [],
    'user.approvals.inbox': [
        { label: 'Kotak Masuk Persetujuan' }
    ],
    'user.purchasing': [
        { label: 'Purchasing' }
    ],
    'user.purchasing.approvals': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Persetujuan Pengadaan (Approvals)' }
    ],
    'user.purchasing.requisitions': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Purchase Requisitions' }
    ],
    'user.purchasing.requisitions.create': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Purchase Requisitions', to: { name: 'user.purchasing.requisitions' } },
        { label: 'Buat PR Baru' }
    ],
    'user.purchasing.requisitions.edit': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Purchase Requisitions', to: { name: 'user.purchasing.requisitions' } },
        { label: 'Edit PR' }
    ],
    'user.purchasing.plans': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Rencana Pengadaan' }
    ],
    'user.purchasing.plans.create': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Rencana Pengadaan', to: { name: 'user.purchasing.plans' } },
        { label: 'Buat Rencana Pengadaan' }
    ],
    'user.purchasing.plans.detail': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Rencana Pengadaan', to: { name: 'user.purchasing.plans' } },
        { label: 'Detail Rencana Pengadaan' }
    ],
    'user.purchasing.direct': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Direct Purchases' }
    ],
    'user.purchasing.direct.create': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Direct Purchases', to: { name: 'user.purchasing.direct' } },
        { label: 'Buat Direct Purchase' }
    ],
    'user.purchasing.direct.detail': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Direct Purchases', to: { name: 'user.purchasing.direct' } },
        { label: 'Detail Direct Purchase' }
    ],
    'user.finance.payment-requests': [
        { label: 'Finance' },
        { label: 'Permohonan Pembayaran (Payment Requests)' }
    ],
    'user.finance.payments': [
        { label: 'Finance' },
        { label: 'Permohonan Pembayaran', to: { name: 'user.finance.payment-requests' } },
        { label: 'Riwayat Kas Keluar' }
    ],
    'user.inventory.goods-receipts': [
        { label: 'Inventory' },
        { label: 'Penerimaan Barang (Goods Receipts)' }
    ],
    'user.inventory.goods-receipts.detail': [
        { label: 'Inventory', to: { name: 'user.inventory.goods-receipts' } },
        { label: 'Penerimaan Barang', to: { name: 'user.inventory.goods-receipts' } },
        { label: 'Detail Penerimaan Barang' }
    ],

    // Admin Master Data - Core
    'admin.dashboard': [],
    'admin.master.company': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Perusahaan (Companies)' }
    ],
    'admin.master.division': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Divisi (Divisions)' }
    ],
    'admin.master.position': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Jabatan (Positions)' }
    ],
    'admin.master.permission-category': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Kategori Izin' }
    ],
    'admin.master.permission': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Izin (Permissions)' }
    ],
    'admin.master.role': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Peran & Hak Akses' }
    ],
    'admin.master.role.permissions': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Peran', to: { name: 'admin.master.role' } },
        { label: 'Kelola Hak Akses' }
    ],
    'admin.master.job-level': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Tingkat Pekerjaan (Job Levels)' }
    ],
    'admin.master.employee': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Karyawan (Employees)' }
    ],
    'admin.master.user': [
        { label: 'Manajemen Pengguna (Users)' }
    ],
    'admin.master.accounting-category': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Kategori Akuntansi' }
    ],
    'admin.master.accounting-subcategory': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Subkategori Akuntansi' }
    ],
    'admin.master.accounting-account': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Akun Akuntansi (COA)' }
    ],

    // Admin Master Data - Purchasing
    'admin.master.supplier': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Suppliers' }
    ],
    'admin.master.supplier.create': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Suppliers', to: { name: 'admin.master.supplier' } },
        { label: 'Tambah Supplier Baru' }
    ],
    'admin.master.supplier.detail': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Suppliers', to: { name: 'admin.master.supplier' } },
        { label: 'Detail Supplier' }
    ],
    'admin.master.supplier.general': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Suppliers', to: { name: 'admin.master.supplier' } },
        { label: 'Informasi Umum' }
    ],
    'admin.master.supplier.contacts': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Suppliers', to: { name: 'admin.master.supplier' } },
        { label: 'Kontak Supplier' }
    ],
    'admin.master.supplier.bank-accounts': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Suppliers', to: { name: 'admin.master.supplier' } },
        { label: 'Rekening Bank' }
    ],
    'admin.master.supplier.documents': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Suppliers', to: { name: 'admin.master.supplier' } },
        { label: 'Dokumen Legalitas' }
    ],
    'admin.master.supplier.items': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Suppliers', to: { name: 'admin.master.supplier' } },
        { label: 'Daftar Barang' }
    ],
    'admin.master.item': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Master Barang (Items)' }
    ],
    'admin.master.unit': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Satuan (Units)' }
    ],

    // Admin Settings - Approvals
    'admin.settings.approval': [
        { label: 'Pengaturan' },
        { label: 'Alur Persetujuan (Approval Workflows)' }
    ],
    'admin.settings.approval.create': [
        { label: 'Pengaturan' },
        { label: 'Alur Persetujuan', to: { name: 'admin.settings.approval' } },
        { label: 'Buat Alur Persetujuan' }
    ],
    'admin.settings.approval.detail': [
        { label: 'Pengaturan' },
        { label: 'Alur Persetujuan', to: { name: 'admin.settings.approval' } },
        { label: 'Detail Alur Persetujuan' }
    ],
    'admin.settings.approval.edit': [
        { label: 'Pengaturan' },
        { label: 'Alur Persetujuan', to: { name: 'admin.settings.approval' } },
        { label: 'Edit Alur Persetujuan' }
    ]
}

// Fallback path title-casing
const formatSegment = (seg) => {
    return seg
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
}

const resolvedHomeRoute = computed(() => {
    if (props.homeRoute) return props.homeRoute
    const isUnderAdmin = route.path?.startsWith('/admin') || String(route.name || '').startsWith('admin.')
    return isUnderAdmin ? { name: 'admin.dashboard' } : { name: 'user.dashboard' }
})

const isAtRootDashboard = computed(() => {
    return route.name === 'user.dashboard' || route.name === 'admin.dashboard'
})

const rawItems = computed(() => {
    // 1. Explicit items passed via prop
    if (props.items && Array.isArray(props.items) && props.items.length > 0) {
        return props.items
    }

    // 2. Route meta breadcrumb
    if (route.meta?.breadcrumb) {
        return typeof route.meta.breadcrumb === 'function' 
            ? route.meta.breadcrumb(route) 
            : route.meta.breadcrumb
    }

    // 3. Dictionary lookup by route name
    if (route.name && ROUTE_BREADCRUMBS[route.name]) {
        return ROUTE_BREADCRUMBS[route.name]
    }

    // 4. Fallback based on URL path segments
    if (route.path && route.path !== '/' && route.path !== '/dashboard' && route.path !== '/admin/dashboard') {
        const segments = route.path.split('/').filter(Boolean)
        return segments.map((seg, idx) => {
            const isLast = idx === segments.length - 1
            return {
                label: formatSegment(seg),
                to: isLast ? undefined : '/' + segments.slice(0, idx + 1).join('/')
            }
        })
    }

    return []
})

// Normalize items to { label, to, icon }
const normalizedItems = computed(() => {
    return rawItems.value.map(item => {
        if (typeof item === 'string') {
            return { label: item }
        }
        return item
    })
})

const shouldDisplayHome = computed(() => {
    if (!props.showHome) return false
    // Don't show redundant Dashboard prefix if first item is already Dashboard/Home
    const first = normalizedItems.value[0]
    if (first && (first.label?.toLowerCase() === 'dashboard' || first.label?.toLowerCase() === 'beranda')) {
        return false
    }
    return true
})
</script>

<template>
    <nav 
        v-if="shouldDisplayHome || normalizedItems.length > 0" 
        aria-label="Breadcrumb" 
        class="flex items-center flex-wrap gap-2 text-sm sm:text-base font-medium text-slate-500 py-1.5"
    >
        <!-- Home / Dashboard Node -->
        <template v-if="shouldDisplayHome">
            <template v-if="isAtRootDashboard && normalizedItems.length === 0">
                <span class="text-slate-900 font-semibold flex items-center gap-2 py-1 px-2 bg-slate-100/80 rounded-lg" aria-current="page">
                    <component :is="homeIcon || Home" class="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-600 shrink-0" />
                    <span>{{ homeLabel }}</span>
                </span>
            </template>
            <template v-else>
                <RouterLink 
                    :to="resolvedHomeRoute" 
                    class="hover:text-blue-600 text-slate-600 transition-colors flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-100 group cursor-pointer"
                >
                    <component :is="homeIcon || Home" class="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                    <span>{{ homeLabel }}</span>
                </RouterLink>

                <slot name="separator" v-if="normalizedItems.length > 0">
                    <ChevronRight class="w-4 h-4 text-slate-400 shrink-0 select-none" />
                </slot>
            </template>
        </template>

        <!-- Dynamic Items -->
        <template v-for="(item, index) in normalizedItems" :key="index">
            <slot 
                name="item" 
                :item="item" 
                :index="index" 
                :isLast="index === normalizedItems.length - 1"
            >
                <!-- Active / Current Page (Last Item) -->
                <span 
                    v-if="index === normalizedItems.length - 1" 
                    class="text-slate-900 font-bold flex items-center gap-2 py-1 px-2 bg-slate-100/80 rounded-lg" 
                    aria-current="page"
                >
                    <component v-if="item.icon" :is="item.icon" class="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600 shrink-0" />
                    <span class="truncate max-w-[320px] sm:max-w-none">{{ item.label }}</span>
                </span>

                <!-- Navigable Parent Route -->
                <RouterLink 
                    v-else-if="item.to" 
                    :to="item.to" 
                    class="hover:text-blue-600 text-slate-600 transition-colors flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-100 group cursor-pointer"
                >
                    <component v-if="item.icon" :is="item.icon" class="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                    <span>{{ item.label }}</span>
                </RouterLink>

                <!-- Static Hierarchy Category (Non-clickable intermediate) -->
                <span 
                    v-else 
                    class="text-slate-500 select-none flex items-center gap-2 py-1 px-1.5"
                >
                    <component v-if="item.icon" :is="item.icon" class="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400 shrink-0" />
                    <span>{{ item.label }}</span>
                </span>
            </slot>

            <!-- Separator between items -->
            <slot name="separator" v-if="index < normalizedItems.length - 1">
                <ChevronRight class="w-4 h-4 text-slate-400 shrink-0 select-none" />
            </slot>
        </template>
    </nav>
</template>
