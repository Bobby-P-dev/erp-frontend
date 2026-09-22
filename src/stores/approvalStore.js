import { defineStore } from 'pinia'
import { getPendingApprovalCount } from '../services/approvalServices.js'

export const useApprovalStore = defineStore('approval', {
    state: () => ({
        pendingCount: 0,
        isLoading: false,
        lastFetched: null,
        pollIntervalId: null,
    }),

    getters: {
        hasPendingTasks: (state) => state.pendingCount > 0,
        formattedBadge: (state) => (state.pendingCount > 99 ? '99+' : String(state.pendingCount)),
    },

    actions: {
        async fetchPendingCount() {
            try {
                this.isLoading = true
                const response = await getPendingApprovalCount()
                this.pendingCount = response.count ?? response.data?.count ?? 0
                this.lastFetched = new Date()
            } catch (error) {
                console.error('Failed to fetch pending approval count:', error)
            } finally {
                this.isLoading = false
            }
        },

        decrementCountOptimistic() {
            if (this.pendingCount > 0) {
                this.pendingCount--
            }
        },

        incrementCountOptimistic() {
            this.pendingCount++
        },

        startPolling(intervalMs = 60000) {
            this.stopPolling()
            this.fetchPendingCount()
            // Polling hanya berjalan jika window/tab sedang aktif
            this.pollIntervalId = setInterval(() => {
                if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                    this.fetchPendingCount()
                }
            }, intervalMs)
        },

        stopPolling() {
            if (this.pollIntervalId) {
                clearInterval(this.pollIntervalId)
                this.pollIntervalId = null
            }
        },
    },
})
