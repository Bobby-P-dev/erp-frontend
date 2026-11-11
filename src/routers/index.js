import { createRouter, createWebHistory } from 'vue-router'
import { registerRouterGuards } from './guards.js'
import { publicRoutes } from './modules/public.routes.js'
import { supplierPortalRoutes } from './modules/supplierPortal.routes.js'
import { userRoutes } from './modules/user.routes.js'
import { purchasingRoutes } from './modules/purchasing.routes.js'
import { financeRoutes } from './modules/finance.routes.js'
import { inventoryRoutes } from './modules/inventory.routes.js'
import { adminRoutes } from './modules/admin.routes.js'

export const appRoutes = [
    ...publicRoutes,
    ...supplierPortalRoutes,
    ...userRoutes,
    ...purchasingRoutes,
    ...financeRoutes,
    ...inventoryRoutes,
    ...adminRoutes,
]

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
    routes: appRoutes,
})

registerRouterGuards(router)

export default router
