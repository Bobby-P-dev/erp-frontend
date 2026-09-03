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
        permission: (state) =>{
            return state.user?.permissions ?? []
        },

        hasPermission: (state) => {
            return (permission) => {
                return state.user?.all_permissions?.includes(permission) ?? false
            }
        },

        hasAnyPermission: (state) => {
            return (permissions) => {
                return permissions.some(permission =>
                    state.user?.all_permissions?.includes(permission)
                )
            }
        },

        hasAllPermissions: (state) => {
            return (permissions) => {
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
                this.clearAuth()
            }
        },
    },
})