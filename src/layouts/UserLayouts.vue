<script setup>
import { onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import UserProfileDropdown from '../components/layout/UserProfileDropdown.vue'
import { Hexagon, CheckSquare } from '@lucide/vue'
import { useApprovalStore } from '../stores/approvalStore'

const approvalStore = useApprovalStore()

onMounted(() => {
    approvalStore.fetchPendingCount()
})
</script>

<template>
    <div class="min-h-screen flex flex-col bg-slate-50/50 font-sans">
        
        <AppHeader isSticky>
            <template #left>
                <RouterLink :to="{ name: 'user.dashboard' }" class="flex items-center gap-2 text-indigo-600 group">
                    <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200 transition-transform group-hover:scale-105">
                        <Hexagon class="w-5 h-5 text-white" />
                    </div>
                    <span class="text-xl font-bold text-gray-900 tracking-tight">ERP System</span>
                </RouterLink>
            </template>

            <template #right>
                <!-- Approval Inbox Quick Access for Non-Admin / Standard Users -->
                <RouterLink
                    :to="{ name: 'user.approvals.inbox' }"
                    class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors relative flex items-center justify-center"
                    title="Kotak Masuk Persetujuan"
                >
                    <CheckSquare class="w-5 h-5" />
                    <span 
                        v-if="approvalStore.pendingCount > 0"
                        class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs"
                    >
                        {{ approvalStore.formattedBadge }}
                    </span>
                </RouterLink>

                <div class="w-px h-6 bg-gray-200 mx-1"></div>

                <UserProfileDropdown />
            </template>
        </AppHeader>

        <main class="flex-1 flex flex-col">
            <div class="max-w-7xl mx-auto w-full px-6 py-8 flex-1">
                <RouterView />
            </div>
        </main>

        <AppFooter />
    </div>
</template>