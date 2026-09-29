<script setup>
import { onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import AdminSidebar from '../components/layout/AdminSidebar.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import UserProfileDropdown from '../components/layout/UserProfileDropdown.vue'
import { Bell } from '@lucide/vue'
import { useApprovalStore } from '../stores/approvalStore'

const approvalStore = useApprovalStore()

onMounted(() => {
    approvalStore.fetchPendingCount()
})
</script>

<template>
    <div class="min-h-screen flex flex-col bg-slate-50 font-sans h-screen overflow-hidden">
        
        <AppHeader isSticky fullWidth>
            <template #left>
                <RouterLink :to="{ name: 'admin.dashboard' }" class="flex items-center gap-2.5 sm:gap-3 group select-none cursor-pointer">
                    <img 
                        src="/pses_transparent.png" 
                        alt="Padma Soode ERP Sistem" 
                        class="h-6.5 sm:h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105" 
                    />
                </RouterLink>
            </template>

            <template #right>
                <button type="button" class="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors relative" title="Notifikasi">
                    <Bell class="w-5 h-5" />
                    <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                
                <div class="w-px h-6 bg-slate-200 mx-1"></div>

                <UserProfileDropdown />
            </template>
        </AppHeader>

        <div class="flex-1 flex min-h-0 px-4 sm:px-6 py-3 sm:py-4 gap-4 w-full">
            <AdminSidebar class="z-20" />

            <div class="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-xs border border-slate-200/70 overflow-hidden">
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