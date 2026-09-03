<script setup>
import { useRouter } from 'vue-router'
import AdminSidebar from '../components/layout/AdminSidebar.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import UserProfileDropdown from '../components/layout/UserProfileDropdown.vue'
import { Bell, Search } from '@lucide/vue'
</script>

<template>
    <div class="min-h-screen flex bg-slate-50 font-sans">
        
        <AdminSidebar />

        <div class="flex-1 flex flex-col min-w-0">
            <AppHeader isSticky>
                <template #left>
                    <div class="relative hidden sm:block">
                        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            class="pl-10 pr-4 py-2 bg-gray-100/80 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all w-64 text-gray-700"
                        >
                    </div>
                </template>

                <template #right>
                    <button type="button" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors relative">
                        <Bell class="w-5 h-5" />
                        <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                    
                    <div class="w-px h-6 bg-gray-200 mx-1"></div>

                    <UserProfileDropdown />
                </template>
            </AppHeader>

            <main class="flex-1 p-6 lg:p-8 overflow-x-hidden">
                <div class="w-full">
                    <RouterView />
                </div>
            </main>

            <AppFooter />
        </div>

    </div>
</template>