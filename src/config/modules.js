import { 
    ShoppingBag, 
    CheckSquare,
    Landmark, 
    Boxes, 
    Users 
} from '@lucide/vue'

/**
 * Top-level ERP Module Registry.
 * Only modules with `active: true` are displayed in the dashboard launcher.
 * Other modules illustrate clean extensibility without cluttering the UI.
 */
export const erpModules = [
    {
        id: 'purchasing',
        title: 'Purchasing',
        description: 'Kelola pengajuan pembelian, antrean alokasi pengadaan, pesanan direct purchase, dan riwayat vendor.',
        routeName: 'user.purchasing',
        icon: ShoppingBag,
        color: 'indigo',
        badge: 'Aktif',
        status: 'active',
        permission: null, // Accessible to all authenticated employees
        active: true
    },
    {
        id: 'approvals',
        title: 'Approvals',
        description: 'Tinjau dokumen pending dan riwayat persetujuan tugas Anda (Pending & History).',
        routeName: 'user.approvals.inbox',
        icon: CheckSquare,
        color: 'amber',
        badge: 'Tugas Saya',
        status: 'active',
        permission: null, // Accessible to all authenticated employees
        active: true
    },
    // Future extensible modules (inactive until module features are built):
    {
        id: 'inventory',
        title: 'Inventory',
        description: 'Manajemen stok gudang, penerimaan barang, transfer antar gudang, dan stock opname.',
        routeName: null,
        icon: Boxes,
        color: 'amber',
        badge: 'Coming Soon',
        status: 'coming_soon',
        permission: 'inventory.read',
        active: false
    },
    {
        id: 'finance',
        title: 'Finance & Accounting',
        description: 'Buku besar, jurnal penyesuaian, laporan keuangan, dan arus kas perusahaan.',
        routeName: null,
        icon: Landmark,
        color: 'emerald',
        badge: 'Coming Soon',
        status: 'coming_soon',
        permission: 'accounting.read',
        active: false
    },
    {
        id: 'hr',
        title: 'Human Resources',
        description: 'Data karyawan, kehadiran, struktur organisasi, dan manajemen talenta.',
        routeName: null,
        icon: Users,
        color: 'purple',
        badge: 'Coming Soon',
        status: 'coming_soon',
        permission: 'hr.read',
        active: false
    }
]

/**
 * Get active modules visible to the user based on permissions.
 */
export const getActiveModules = (authStore = null) => {
    return erpModules.filter(mod => {
        if (!mod.active) return false
        if (mod.permission && authStore && typeof authStore.hasPermission === 'function') {
            return authStore.hasPermission(mod.permission)
        }
        return true
    })
}
