import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

const router = createRouter({
    history: createWebHistory(),
    scrollBehavior(to, from, savedPosition) {
        if (to.hash) {
            return {
                el: to.hash,
                behavior: 'smooth',
            }
        }
        if (savedPosition) {
            return savedPosition
        }
        return { top: 0 }
    },
    routes: [
        {
            path: '/',
            component: () => import('../layouts/GuestLayouts.vue'),
            meta: {
                guest: true
            },
            children: [
                {
                    path: '',
                    name: 'welcome',
                    component: () => import('../views/guest/WelcomeView.vue'),
                },
                {
                    path: 'login',
                    name: 'login',
                    component: () => import('../views/guest/LoginView.vue'),
                },
            ],
        },
        {
            path: '/dashboard',
            name: 'user',
            component: () => import('../layouts/UserLayouts.vue'),
            meta: {
                requiresAuth: true
            },
            children: [
                {
                    path: '',
                    name: 'user.dashboard',
                    component: () => import('../views/user/DashboardView.vue'),
                },
                {
                    path: 'approvals/inbox',
                    name: 'user.approvals.inbox',
                    redirect: { name: 'user.purchasing.approvals' }
                },
            ],
        },
        {
            path: '/purchasing',
            component: () => import('../layouts/UserLayouts.vue'),
            meta: {
                requiresAuth: true
            },
            children: [
                {
                    path: '',
                    name: 'user.purchasing',
                    component: () => import('../views/purchasing/PurchasingHomeView.vue'),
                },
                {
                    path: 'approvals',
                    name: 'user.purchasing.approvals',
                    component: () => import('../views/purchasing/PurchasingApprovalInboxView.vue'),
                    meta: {
                        requiresAuth: true,
                        title: 'Persetujuan Pengadaan (Approvals)'
                    }
                },
                {
                    path: 'purchase-requisitions',
                    name: 'user.purchasing.requisitions',
                    component: () => import('../views/purchasing/PurchaseRequisitionListView.vue'),
                },
                {
                    path: 'purchase-requisitions/create',
                    name: 'user.purchasing.requisitions.create',
                    component: () => import('../views/purchasing/PurchaseRequisitionCreateView.vue'),
                },
                {
                    path: 'purchase-requisitions/:id/edit',
                    name: 'user.purchasing.requisitions.edit',
                    component: () => import('../views/purchasing/PurchaseRequisitionCreateView.vue'),
                },
                {
                    path: 'procurement-queue',
                    redirect: { name: 'user.purchasing.plans' }
                },
                {
                    path: 'procurement-plans',
                    name: 'user.purchasing.plans',
                    component: () => import('../views/purchasing/ProcurementPlanListView.vue'),
                    meta: {
                        permission: 'procurement-plan.read'
                    }
                },
                {
                    path: 'procurement-plans/create',
                    name: 'user.purchasing.plans.create',
                    component: () => import('../views/purchasing/ProcurementPlanCreateView.vue'),
                    meta: {
                        permission: 'procurement-plan.create'
                    }
                },
                {
                    path: 'procurement-plans/:id',
                    name: 'user.purchasing.plans.detail',
                    component: () => import('../views/purchasing/ProcurementPlanDetailView.vue'),
                    meta: {
                        permission: 'procurement-plan.read'
                    }
                },
                {
                    path: 'direct-purchases',
                    name: 'user.purchasing.direct',
                    component: () => import('../views/purchasing/DirectPurchaseListView.vue'),
                    meta: {
                        permission: 'direct-purchase.read'
                    }
                },
                {
                    path: 'direct-purchases/create',
                    name: 'user.purchasing.direct.create',
                    component: () => import('../views/purchasing/DirectPurchaseCreateView.vue'),
                    meta: {
                        permission: 'direct-purchase.create'
                    }
                },
                {
                    path: 'direct-purchases/:id',
                    name: 'user.purchasing.direct.detail',
                    component: () => import('../views/purchasing/DirectPurchaseDetailView.vue'),
                    meta: {
                        permission: 'direct-purchase.read'
                    }
                },
            ],
        },
        {
            path: '/finance',
            component: () => import('../layouts/UserLayouts.vue'),
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
                    component: () => import('../views/finance/PaymentRequestListView.vue'),
                    meta: { requiresAuth: true, title: 'Permohonan Pembayaran (Finance)' }
                },
                {
                    path: 'payments',
                    name: 'user.finance.payments',
                    alias: '/dashboard/finance/payments',
                    component: () => import('../views/finance/DisbursedPaymentListView.vue'),
                    meta: { requiresAuth: true, title: 'Riwayat Pencairan Kas/Bank' }
                },
            ]
        },
        {
            path: '/inventory',
            component: () => import('../layouts/UserLayouts.vue'),
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
                    component: () => import('../views/inventory/GoodsReceiptListView.vue'),
                    meta: { requiresAuth: true, title: 'Penerimaan Barang (Goods Receipts)' }
                },
                {
                    path: 'goods-receipts/:id',
                    name: 'user.inventory.goods-receipts.detail',
                    alias: '/dashboard/inventory/goods-receipts/:id',
                    component: () => import('../views/inventory/GoodsReceiptDetailView.vue'),
                    meta: { requiresAuth: true, title: 'Detail Surat Jalan & Penerimaan Fisik' }
                }
            ]
        },
        {
            path: '/admin',
            name: 'admin',
            component: () => import('../layouts/AdminLayouts.vue'),
            meta: {
                requiresAuth: true,
                permission: 'admin.read'
            },
            children: [
                {
                    path: 'dashboard',
                    name: 'admin.dashboard',
                    component: () => import('../views/admin/DashboardView.vue'),
                },
                {
                    path: 'master/company',
                    name: 'admin.master.company',
                    component: () => import('../views/admin/master/CompanyView.vue'),
                },
                {
                    path: 'master/division',
                    name: 'admin.master.division',
                    component: () => import('../views/admin/master/DivisionView.vue'),
                },
                {
                    path: 'master/position',
                    name: 'admin.master.position',
                    component: () => import('../views/admin/master/PositionView.vue'),
                },
                {
                    path: 'master/permission-category',
                    name: 'admin.master.permission-category',
                    component: () => import('../views/admin/master/PermissionCategory.vue'),
                },
                {
                    path: 'master/permission',
                    name: 'admin.master.permission',
                    component: () => import('../views/admin/master/PermissionView.vue'),
                },
                {
                    path: 'master/roles',
                    name: 'admin.master.role',
                    component: () => import('../views/admin/master/RoleView.vue'),
                },
                {
                    path: 'master/roles/:id/permissions',
                    name: 'admin.master.role.permissions',
                    component: () => import('../views/admin/master/RolePermissionView.vue'),
                },
                {
                    path: 'master/job-levels',
                    name: 'admin.master.job-level',
                    component: () => import('../views/admin/master/JobLevelView.vue'),
                },
                {
                    path: 'master/employees',
                    name: 'admin.master.employee',
                    component: () => import('../views/admin/master/EmployeeView.vue'),
                },
                {
                    path: 'master/users',
                    name: 'admin.master.user',
                    component: () => import('../views/admin/master/UserView.vue'),
                },
                {
                    path: 'master/accounting-categories',
                    name: 'admin.master.accounting-category',
                    component: () => import('../views/admin/master/AccountingCategoryView.vue'),
                },
                {
                    path: 'master/accounting-subcategories',
                    name: 'admin.master.accounting-subcategory',
                    component: () => import('../views/admin/master/AccountingSubcategoryView.vue'),
                },
                {
                    path: 'master/accounting-accounts',
                    name: 'admin.master.accounting-account',
                    component: () => import('../views/admin/master/AccountingAccountView.vue'),
                },
                {
                    path: 'master/suppliers',
                    name: 'admin.master.supplier',
                    component: () => import('../views/admin/master/supplier/SupplierListView.vue'),
                },
                {
                    path: 'master/items',
                    name: 'admin.master.item',
                    component: () => import('../views/admin/master/ItemView.vue'),
                },
                {
                    path: 'master/units',
                    name: 'admin.master.unit',
                    component: () => import('../views/admin/master/UnitView.vue'),
                },
                {
                    path: 'master/suppliers/create',
                    name: 'admin.master.supplier.create',
                    component: () => import('../views/admin/master/supplier/SupplierCreateView.vue'),
                },
                {
                    path: 'master/suppliers/:id',
                    component: () => import('../views/admin/master/supplier/SupplierDetailLayout.vue'),
                    children: [
                        {
                            path: '',
                            name: 'admin.master.supplier.detail',
                            redirect: to => ({ name: 'admin.master.supplier.general', params: to.params })
                        },
                        {
                            path: 'general',
                            name: 'admin.master.supplier.general',
                            component: () => import('../views/admin/master/supplier/tabs/SupplierGeneralTab.vue')
                        },
                        {
                            path: 'contacts',
                            name: 'admin.master.supplier.contacts',
                            component: () => import('../views/admin/master/supplier/tabs/SupplierContactsTab.vue')
                        },
                        {
                            path: 'bank-accounts',
                            name: 'admin.master.supplier.bank-accounts',
                            component: () => import('../views/admin/master/supplier/tabs/SupplierBankAccountsTab.vue')
                        },
                        {
                            path: 'documents',
                            name: 'admin.master.supplier.documents',
                            component: () => import('../views/admin/master/supplier/tabs/SupplierDocumentsTab.vue')
                        },
                        {
                            path: 'items',
                            name: 'admin.master.supplier.items',
                            component: () => import('../views/admin/master/supplier/tabs/SupplierItemsTab.vue')
                        }
                    ]
                },
                {
                    path: 'approvals/inbox',
                    name: 'approvals.inbox',
                    redirect: { name: 'user.purchasing.approvals' }
                },
                {
                    path: 'settings/approvals',
                    name: 'admin.settings.approval',
                    component: () => import('../views/admin/settings/approval/ApprovalConfigListView.vue'),
                },
                {
                    path: 'settings/approvals/create',
                    name: 'admin.settings.approval.create',
                    component: () => import('../views/admin/settings/approval/ApprovalConfigCreateView.vue'),
                },
                {
                    path: 'settings/approvals/:id',
                    name: 'admin.settings.approval.detail',
                    component: () => import('../views/admin/settings/approval/ApprovalConfigDetailView.vue'),
                },
                {
                    path: 'settings/approvals/:id/edit',
                    name: 'admin.settings.approval.edit',
                    component: () => import('../views/admin/settings/approval/ApprovalConfigEditView.vue'),
                }
            ],
        },
    ]
})

router.beforeEach((to) => {

    const authStore = useAuthStore()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        return {
            name: 'login',
        }
    }

    if (to.meta.guest && authStore.isAuthenticated) {
        return {
            name: 'user.dashboard',
        }
    }

    if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
        return {
            name: 'user.dashboard',
        }
    }

    return true
})

export default router;
