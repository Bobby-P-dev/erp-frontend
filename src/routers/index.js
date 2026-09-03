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