import { 
    FileText, 
    CheckSquare,
    Layers, 
    ShoppingCart, 
    Scale 
} from '@lucide/vue'

/**
 * Purchasing Module Submenu & Operations Registry.
 * Represents the procurement lifecycle in sequential operational stages.
 */
export const purchasingMenuItems = [
    {
        id: 'pr',
        title: 'Purchase Requisition',
        subtitle: 'Tahap 1: Pengajuan Kebutuhan',
        description: 'Buat dan monitor kebutuhan pembelian barang atau jasa divisi Anda.',
        routeName: 'user.purchasing.requisitions',
        icon: FileText,
        color: 'blue',
        badge: 'Semua Divisi',
        badgeVariant: 'blue',
        actionText: 'Kelola Requisition',
        status: 'active',
        permission: null // Accessible to all authenticated employees
    },
    {
        id: 'purchasing-approvals',
        title: 'Persetujuan Pengadaan (Approvals)',
        subtitle: 'Tahap 2: Otorisasi & Persetujuan',
        description: 'Tinjau, setujui, minta revisi, atau tolak pengajuan pembelian (Purchase Requisition) yang membutuhkan wewenang Anda.',
        routeName: 'user.purchasing.approvals',
        icon: CheckSquare,
        color: 'amber',
        badge: 'Otorisasi',
        badgeVariant: 'amber',
        actionText: 'Buka Persetujuan',
        status: 'active',
        permission: null // Accessible to all authenticated employees
    },
    {
        id: 'procurement-plans',
        title: 'Procurement Plans',
        subtitle: 'Tahap 3: Perencanaan & Alokasi',
        description: 'Atur metode sourcing, konsolidasi item PR, dan alokasi anggaran procurement.',
        routeName: 'user.purchasing.plans',
        icon: Layers,
        color: 'blue',
        badge: 'Sourcing Strategy',
        badgeVariant: 'blue',
        actionText: 'Kelola Rencana',
        status: 'active',
        permission: 'procurement-plan.read'
    },
    {
        id: 'direct-purchases',
        title: 'Direct Purchases',
        subtitle: 'Tahap 4: Eksekusi Pembelian Langsung',
        description: 'Pembelian marketplace atau direct supplier dengan bukti bayar & penerimaan.',
        routeName: 'user.purchasing.direct',
        icon: ShoppingCart,
        color: 'emerald',
        badge: 'Eksekusi Cepat',
        badgeVariant: 'emerald',
        actionText: 'Lihat Pembelian',
        status: 'active',
        permission: 'direct-purchase.read'
    },
    {
        id: 'rfq',
        title: 'RFQ (Request for Quotation)',
        subtitle: 'Tahap 5: Penawaran Rekanan',
        description: 'Request quotation ke beberapa supplier. Fitur komparasi penawaran multi-vendor sedang dipersiapkan.',
        routeName: null,
        icon: Scale,
        color: 'slate',
        badge: 'Coming Soon',
        badgeVariant: 'slate',
        actionText: 'Segera Hadir',
        status: 'coming_soon',
        permission: null
    }
]

/**
 * Filter purchasing menu items by user permissions.
 * If user lacks permission for an active item, it can either be filtered or marked restricted.
 */
export const getAuthorizedPurchasingMenuItems = (authStore = null) => {
    return purchasingMenuItems.map(item => {
        if (!item.permission || !authStore || typeof authStore.hasPermission !== 'function') {
            return { ...item, isAuthorized: true, restricted: false }
        }
        const hasAccess = authStore.hasPermission(item.permission)
        return {
            ...item,
            isAuthorized: hasAccess,
            // If user lacks permission, mark as restricted
            restricted: !hasAccess
        }
    })
}
