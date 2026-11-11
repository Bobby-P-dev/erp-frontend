export const publicRoutes = [
    {
        path: '/',
        component: () => import('../../layouts/GuestLayouts.vue'),
        meta: {
            guest: true
        },
        children: [
            {
                path: '',
                name: 'welcome',
                component: () => import('../../views/guest/WelcomeView.vue'),
            },
            {
                path: 'login',
                name: 'login',
                component: () => import('../../views/guest/LoginView.vue'),
            },
        ],
    },
    {
        path: '/verify/:token',
        name: 'public.verify',
        component: () => import('../../views/public/VerificationView.vue'),
        meta: {
            requiresAuth: false
        }
    },
    {
        path: '/portal/rfq/:token',
        name: 'public.portal.rfq',
        component: () => import('../../views/public/SupplierPortalRfqView.vue'),
        meta: {
            requiresAuth: false
        }
    }
]
