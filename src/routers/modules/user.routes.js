export const userRoutes = [
    {
        path: '/dashboard',
        name: 'user',
        component: () => import('../../layouts/UserLayouts.vue'),
        meta: {
            requiresAuth: true
        },
        children: [
            {
                path: '',
                name: 'user.dashboard',
                component: () => import('../../views/user/DashboardView.vue'),
            },
            {
                path: 'approvals/inbox',
                name: 'user.approvals.inbox',
                redirect: { name: 'user.purchasing.approvals' }
            },
            {
                path: 'profile',
                name: 'user.profile',
                component: () => import('../../views/profile/UserProfileView.vue'),
            },
        ],
    }
]
