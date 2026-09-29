<script setup>
import { onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
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
    <div class="min-h-screen flex flex-col bg-slate-50 font-sans">
        
        <AppHeader isSticky fullWidth>
            <template #left>
                <RouterLink :to="{ name: 'user.dashboard' }" class="flex items-center gap-2.5 sm:gap-3 group select-none cursor-pointer">
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

        <main class="flex-1 flex flex-col w-full">
            <div class="w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-8 flex-1">
                <RouterView />
            </div>
        </main>

        <AppFooter />
    </div>
</template>