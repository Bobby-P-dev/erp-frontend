<script setup>
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import { Hexagon, LogIn } from '@lucide/vue'
</script>

<template>
    <div class="min-h-screen flex flex-col bg-slate-50/50 font-sans">
        <AppHeader isSticky>
            <template #left>
                <div class="flex items-center gap-2 text-indigo-600">
                    <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
                        <Hexagon class="w-5 h-5 text-white" />
                    </div>
                    <span class="text-xl font-bold text-gray-900 tracking-tight">ERP System</span>
                </div>
            </template>
            <template #center>
                <nav class="text-sm text-gray-500 cursor-pointer hover:border-b-2 hover:border-gray-200 hover:text-indigo-600 transition-all px-2 py-2">Beranda</nav>
                <nav class="text-sm text-gray-500 cursor-pointer hover:border-b-2 hover:border-gray-200 hover:text-indigo-600 transition-all px-2 py-2">Tentang</nav>
                <nav class="text-sm text-gray-500 cursor-pointer hover:border-b-2 hover:border-gray-200 hover:text-indigo-600 transition-all px-2 py-2">Hubungi</nav>
            </template>
            <template #right>
                <RouterLink
                    :to="{ name: 'login' }"
                    class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200 group"
                >
                    <LogIn class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Login</span>
                </RouterLink>
            </template>
        </AppHeader>

        <main class="flex-1 flex flex-col pt-6">
            <RouterView />
        </main>

        <AppFooter />
    </div>
</template>