<script setup>
import { onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import AdminSidebar from '../components/layout/AdminSidebar.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import UserProfileDropdown from '../components/layout/UserProfileDropdown.vue'
import { Bell, CheckSquare } from '@lucide/vue'
import { useApprovalStore } from '../stores/approvalStore'

const approvalStore = useApprovalStore()

onMounted(() => {
    approvalStore.fetchPendingCount()
})
</script>

<template>
    <div class="min-h-screen flex flex-col bg-slate-50 font-sans h-screen overflow-hidden">
        
        <AppHeader isSticky>
            <template #left>
                <div class="flex items-center gap-3 text-indigo-600 pl-2 lg:w-[15rem]">
                    <div class="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-200">
                        M
                    </div>
                </div>
            </template>

            <template #right>
                <!-- Approval Inbox Quick Access Button -->
                <RouterLink
                    :to="{ name: 'user.approvals.inbox' }"
                    class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors relative flex items-center justify-center"
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

                <button type="button" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors relative" title="Notifikasi">
                    <Bell class="w-5 h-5" />
                    <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                
                <div class="w-px h-6 bg-gray-200 mx-1"></div>

                <UserProfileDropdown />
            </template>
        </AppHeader>

        <div class="flex-1 flex min-h-0 py-4 pr-4 gap-4">
            <AdminSidebar class="rounded-r-2xl border-y border-r border-gray-100 shadow-[2px_0_8px_-3px_rgba(0,0,0,0.05)] z-20" />

            <div class="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <main class="flex-1 p-6 lg:p-8 overflow-y-auto">
                    <div class="w-full">
                        <RouterView />
                    </div>
                </main>
            </div>
        </div>

        <AppFooter class="bg-transparent border-t-0 shadow-none z-10" />

    </div>
</template>