<script setup>
import { onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import UserProfileDropdown from '../components/layout/UserProfileDropdown.vue'
import { Bell, Sun } from '@lucide/vue'
import { useApprovalStore } from '../stores/approvalStore'

const approvalStore = useApprovalStore()

onMounted(() => {
    approvalStore.fetchPendingCount()
})
</script>

<template>
    <div class="min-h-screen flex flex-col bg-[#F7F9FC] font-sans">
        
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
                <button type="button" class="p-2.5 text-slate-500 hover:text-[#014BAA] hover:bg-[#EAF2FF] rounded-[10px] transition-colors relative cursor-pointer" title="Notifikasi">
                    <Bell class="w-5 h-5" />
                    <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <button type="button" class="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-[10px] transition-colors cursor-pointer" title="Mode Tampilan">
                    <Sun class="w-5 h-5" />
                </button>

                <div class="w-px h-6 bg-[#E5EAF1] mx-1"></div>

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