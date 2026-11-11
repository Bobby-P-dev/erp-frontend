export const inventoryRoutes = [
    {
        path: '/inventory',
        component: () => import('../../layouts/UserLayouts.vue'),
        meta: {
            requiresAuth: true
        },
        children: [
            {
                path: '',
                redirect: { name: 'user.inventory.goods-receipts' }
            },
            {
                path: 'goods-receipts',
                name: 'user.inventory.goods-receipts',
                alias: '/dashboard/inventory/goods-receipts',
                component: () => import('../../views/inventory/GoodsReceiptListView.vue'),
                meta: { requiresAuth: true, title: 'Penerimaan Barang (Goods Receipts)' }
            },
            {
                path: 'goods-receipts/:id',
                name: 'user.inventory.goods-receipts.detail',
                alias: '/dashboard/inventory/goods-receipts/:id',
                component: () => import('../../views/inventory/GoodsReceiptDetailView.vue'),
                meta: { requiresAuth: true, title: 'Detail Surat Jalan & Penerimaan Fisik' }
            }
        ]
    }
]
