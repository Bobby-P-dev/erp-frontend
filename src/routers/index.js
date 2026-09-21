import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'guest',
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
            ],
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/guest/LoginView.vue'),
            meta: {
                guest: true
            }
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
            ],
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
