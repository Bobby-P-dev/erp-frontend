export const purchasingRoutes = [
    {
        path: '/purchasing',
        component: () => import('../../layouts/UserLayouts.vue'),
        meta: {
            requiresAuth: true
        },
        children: [
            {
                path: '',
                name: 'user.purchasing',
                component: () => import('../../views/purchasing/PurchasingHomeView.vue'),
            },
            {
                path: 'approvals',
                name: 'user.purchasing.approvals',
                component: () => import('../../views/purchasing/PurchasingApprovalInboxView.vue'),
                meta: {
                    requiresAuth: true,
                    title: 'Persetujuan Pengadaan (Approvals)'
                }
            },
            {
                path: 'purchase-requisitions',
                name: 'user.purchasing.requisitions',
                component: () => import('../../views/purchasing/PurchaseRequisitionListView.vue'),
            },
            {
                path: 'purchase-requisitions/create',
                name: 'user.purchasing.requisitions.create',
                component: () => import('../../views/purchasing/PurchaseRequisitionCreateView.vue'),
            },
            {
                path: 'purchase-requisitions/:id/edit',
                name: 'user.purchasing.requisitions.edit',
                component: () => import('../../views/purchasing/PurchaseRequisitionCreateView.vue'),
            },
            {
                path: 'procurement-queue',
                redirect: { name: 'user.purchasing.plans' }
            },
            {
                path: 'procurement-plans',
                name: 'user.purchasing.plans',
                component: () => import('../../views/purchasing/ProcurementPlanListView.vue'),
                meta: {
                    permission: 'procurement-plan.read'
                }
            },
            {
                path: 'procurement-plans/create',
                name: 'user.purchasing.plans.create',
                component: () => import('../../views/purchasing/ProcurementPlanCreateView.vue'),
                meta: {
                    permission: 'procurement-plan.create'
                }
            },
            {
                path: 'procurement-plans/:id',
                name: 'user.purchasing.plans.detail',
                component: () => import('../../views/purchasing/ProcurementPlanDetailView.vue'),
                meta: {
                    permission: 'procurement-plan.read'
                }
            },
            {
                path: 'direct-purchases',
                name: 'user.purchasing.direct',
                component: () => import('../../views/purchasing/DirectPurchaseListView.vue'),
                meta: {
                    permission: 'direct-purchase.read'
                }
            },
            {
                path: 'direct-purchases/create',
                name: 'user.purchasing.direct.create',
                component: () => import('../../views/purchasing/DirectPurchaseCreateView.vue'),
                meta: {
                    permission: 'direct-purchase.create'
                }
            },
            {
                path: 'direct-purchases/:id',
                name: 'user.purchasing.direct.detail',
                component: () => import('../../views/purchasing/DirectPurchaseDetailView.vue'),
                meta: {
                    permission: 'direct-purchase.read'
                }
            },
            {
                path: 'direct-purchases/:id/edit',
                name: 'user.purchasing.direct.edit',
                component: () => import('../../views/purchasing/DirectPurchaseEditView.vue'),
                meta: {
                    permission: 'direct-purchase.create'
                }
            },
            {
                path: 'rfqs',
                name: 'user.purchasing.rfq',
                component: () => import('../../views/purchasing/RfqListView.vue'),
                meta: {
                    permission: 'rfq.read'
                }
            },
            {
                path: 'rfqs/create',
                name: 'user.purchasing.rfq.create',
                component: () => import('../../views/purchasing/RfqCreateView.vue'),
                meta: {
                    permission: 'rfq.create'
                }
            },
            {
                path: 'rfqs/:id',
                name: 'user.purchasing.rfq.detail',
                component: () => import('../../views/purchasing/RfqDetailView.vue'),
                meta: {
                    permission: 'rfq.read'
                }
            },
            {
                path: 'rfqs/:id/comparison',
                name: 'user.purchasing.rfq.comparison',
                component: () => import('../../views/purchasing/RfqComparisonView.vue'),
                meta: {
                    permission: 'rfq.read'
                }
            },
            {
                path: 'purchase-orders',
                name: 'user.purchasing.orders',
                component: () => import('../../views/purchasing/PurchaseOrderListView.vue'),
                meta: {
                    permission: 'rfq.read'
                }
            },
            {
                path: 'purchase-orders/:id',
                name: 'user.purchasing.orders.detail',
                component: () => import('../../views/purchasing/PurchaseOrderDetailView.vue'),
                meta: {
                    permission: 'rfq.read'
                }
            },
        ],
    }
]
