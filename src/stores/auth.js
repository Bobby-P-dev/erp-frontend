import { defineStore } from 'pinia'
import {
    getCurrentUser,
    getProfile,
    logout as logoutRequest,
} from '../services/authServices'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        profile: null,
        isAuthenticated: false,
        loading: false,
    }),

    getters: {
        permission: (state) => {
            return state.user?.permissions ?? []
        },

        hasPermission: (state) => {
            return (permission) => {
                if (!permission) return true

                // Super Admin & Admin have full bypass access
                const roles = state.user?.roles || []
                const isSuperOrAdmin = roles.some(role => {
                    const name = typeof role === 'string' ? role : role?.name
                    return name === 'Super Admin' || name === 'Admin'
                })
                if (isSuperOrAdmin) return true

                return state.user?.all_permissions?.includes(permission) ?? false
            }
        },

        hasAnyPermission: (state) => {
            return (permissions) => {
                if (!permissions || permissions.length === 0) return true

                const roles = state.user?.roles || []
                const isSuperOrAdmin = roles.some(role => {
                    const name = typeof role === 'string' ? role : role?.name
                    return name === 'Super Admin' || name === 'Admin'
                })
                if (isSuperOrAdmin) return true

                return permissions.some(permission =>
                    state.user?.all_permissions?.includes(permission)
                )
            }
        },

        hasAllPermissions: (state) => {
            return (permissions) => {
                if (!permissions || permissions.length === 0) return true

                const roles = state.user?.roles || []
                const isSuperOrAdmin = roles.some(role => {
                    const name = typeof role === 'string' ? role : role?.name
                    return name === 'Super Admin' || name === 'Admin'
                })
                if (isSuperOrAdmin) return true

                return permissions.every(permission =>
                    state.user?.all_permissions?.includes(permission)
                )
            }
        },
    },

    actions: {
        setAuth(user, profile) {
            this.user = user
            this.profile = profile
            this.isAuthenticated = true
        },

        clearAuth() {
            this.user = null
            this.profile = null
            this.isAuthenticated = false
        },

        async initializeAuth() {

            const isLoggedIn = localStorage.getItem('is_logged_in') === 'true'
            if (!isLoggedIn) {
                this.clearAuth()
                return false
            }

            this.loading = true

            try {
                const [userResponse, profileResponse] = await Promise.all([
                    getCurrentUser(),
                    getProfile(),
                ])

                this.user = userResponse.user
                this.profile = profileResponse.data
                this.isAuthenticated = true

                return true
            } catch (error) {
                localStorage.removeItem('is_logged_in')
                this.clearAuth()

                return false
            } finally {
                this.loading = false
            }
        },

        async logout() {
            try {
                await logoutRequest()
            } finally {
                localStorage.removeItem('is_logged_in')
                this.clearAuth()
            }
        },

        updateUserSignature(hasSignature, signatureUrl = null, signatureFileId = null) {
            if (this.user) {
                this.user.has_signature = hasSignature
                this.user.signature_url = signatureUrl
                this.user.signature_file_id = signatureFileId
            }
        },
    },
})