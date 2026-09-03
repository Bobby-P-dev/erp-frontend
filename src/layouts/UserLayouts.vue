<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import UserProfileDropdown from '../components/layout/UserProfileDropdown.vue'
import { Hexagon } from '@lucide/vue'
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