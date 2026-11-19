import { useAuthStore } from '../stores/auth.js'
import { dialogState, closeGlobalDialog } from '../composables/useFeedback.js'
import { startRouteLoading, finishRouteLoading } from '../composables/useAppLoader.js'

export const registerRouterGuards = (router) => {
    router.beforeEach((to, from) => {
        const authStore = useAuthStore()

        if (to.meta.requiresAuth && !authStore.isAuthenticated) {
            return { name: 'login' }
        }

        if (to.meta.guest && authStore.isAuthenticated) {
            if (authStore.user?.account_type === 'supplier') {
                return { name: 'supplier.portal.dashboard' }
            }
            return { name: 'user.dashboard' }
        }

        // 1. Jika akun supplier mencoba mengakses menu internal karyawan
        if (authStore.isAuthenticated && authStore.user?.account_type === 'supplier') {
            if (!to.path.startsWith('/portal/supplier') && to.name !== 'public.portal.rfq') {
                return { name: 'supplier.portal.dashboard' }
            }
        }

        // 2. Jika akun karyawan mencoba mengakses rute portal rekanan
        if (authStore.isAuthenticated && authStore.user?.account_type !== 'supplier') {
            if (to.meta.accountType === 'supplier' || to.matched?.some(record => record.meta?.accountType === 'supplier')) {
                return { name: 'user.dashboard' }
            }
        }

        if (to.meta.permission) {
            const allowed = to.meta.strictPermission
                ? (typeof authStore.hasStrictPermission === 'function'
                    ? authStore.hasStrictPermission(to.meta.permission)
                    : authStore.hasPermission(to.meta.permission))
                : authStore.hasPermission(to.meta.permission)
            if (!allowed) {
                return { name: 'user.dashboard' }
            }
        }

        if (to.fullPath !== from?.fullPath) {
            startRouteLoading(to.meta?.title || '')
        }

        return true
    })

    router.afterEach(() => {
        finishRouteLoading()
        if (dialogState.value?.isOpen && dialogState.value?.type === 'loading') {
            closeGlobalDialog()
        }
    })

    if (typeof router.onError === 'function') {
        router.onError(() => {
            finishRouteLoading()
        })
    }
}
