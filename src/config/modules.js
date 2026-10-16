import { 
    ShoppingBag, 
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
        subtitle: 'Pengadaan & Pembelian',
        description: 'Kelola pengajuan pembelian, antrean alokasi pengadaan, pesanan direct purchase, dan riwayat vendor.',
        routeName: 'user.purchasing',
        icon: ShoppingBag,
        color: 'blue',
        badge: '',
        status: 'active',
        permission: null, // Accessible to all authenticated employees
        active: true
    },
    // Modul operasional utama:
    {
        id: 'finance',
        title: 'Finance & Payments',
        subtitle: 'Tagihan & Pembayaran',
        description: 'Kelola verifikasi tagihan supplier, permohonan pembayaran (Payment Requests), dan pencairan kas/bank.',
        routeName: 'user.finance.payment-requests',
        icon: Landmark,
        color: 'blue',
        badge: '',
        status: 'active',
        permission: null,
        active: true
    },
    {
        id: 'inventory',
        title: 'Warehouse & Inventory',
        subtitle: 'Gudang & Persediaan',
        description: 'Penerimaan fisik barang (Goods Receipts), pemeriksaan surat jalan vendor, dan verifikasi kualitas barang masuk.',
        routeName: 'user.inventory.goods-receipts',
        icon: Boxes,
        color: 'blue',
        badge: '',
        status: 'active',
        permission: null,
        active: true
    },
    {
        id: 'hr',
        title: 'Human Resources',
        subtitle: 'SDM & Organisasi',
        description: 'Data karyawan, kehadiran, struktur organisasi, dan manajemen talenta.',
        routeName: null,
        icon: Users,
        color: 'slate',
        badge: 'Segera Hadir',
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
