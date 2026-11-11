export const financeRoutes = [
    {
        path: '/finance',
        component: () => import('../../layouts/UserLayouts.vue'),
        meta: {
            requiresAuth: true
        },
        children: [
            {
                path: '',
                redirect: { name: 'user.finance.payment-requests' }
            },
            {
                path: 'payment-requests',
                name: 'user.finance.payment-requests',
                alias: '/dashboard/finance/payment-requests',
                component: () => import('../../views/finance/PaymentRequestListView.vue'),
                meta: { requiresAuth: true, title: 'Permohonan Pembayaran (Finance)' }
            },
            {
                path: 'payments',
                name: 'user.finance.payments',
                alias: '/dashboard/finance/payments',
                component: () => import('../../views/finance/DisbursedPaymentListView.vue'),
                meta: { requiresAuth: true, title: 'Riwayat Pencairan Kas/Bank' }
            },
        ]
    }
]
