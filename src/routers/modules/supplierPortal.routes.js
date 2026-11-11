export const supplierPortalRoutes = [
    {
        path: '/portal/supplier',
        component: () => import('../../layouts/SupplierPortalLayout.vue'),
        meta: {
            requiresAuth: true,
            accountType: 'supplier'
        },
        children: [
            {
                path: '',
                redirect: { name: 'supplier.portal.dashboard' }
            },
            {
                path: 'dashboard',
                name: 'supplier.portal.dashboard',
                component: () => import('../../views/portal/supplier/SupplierDashboardView.vue'),
                meta: {
                    title: 'Dashboard Rekanan'
                }
            },
            {
                path: 'rfqs',
                name: 'supplier.portal.rfqs',
                component: () => import('../../views/portal/supplier/SupplierRfqListView.vue'),
                meta: {
                    title: 'Tender & RFQ Saya'
                }
            },
            {
                path: 'quotations',
                name: 'supplier.portal.quotations',
                component: () => import('../../views/portal/supplier/SupplierQuotationListView.vue'),
                meta: {
                    title: 'Riwayat Penawaran'
                }
            },
            {
                path: 'purchase-orders',
                name: 'supplier.portal.purchase-orders',
                component: () => import('../../views/portal/supplier/SupplierPurchaseOrderListView.vue'),
                meta: {
                    title: 'Pesanan Pembelian (PO)'
                }
            },
            {
                path: 'purchase-orders/:id',
                name: 'supplier.portal.purchase-orders.detail',
                component: () => import('../../views/portal/supplier/SupplierPurchaseOrderDetailView.vue'),
                meta: {
                    title: 'Detail Pesanan Pembelian (PO)'
                }
            }
        ]
    }
]
