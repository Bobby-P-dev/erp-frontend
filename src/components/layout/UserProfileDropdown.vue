<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { truncateText } from '../../utils/stringUtils'
import { LogOut, User, Shield, ChevronDown } from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()

const isOpen = ref(false)

const toggleDropdown = () => {
    isOpen.value = !isOpen.value
}

const closeDropdown = () => {
    isOpen.value = false
}

const handleLogout = async () => {
    closeDropdown()
    await authStore.logout()
    router.push({ name: 'welcome' })
}

const goToProfile = () => {
    closeDropdown()
    router.push({ name: 'user.dashboard' })
}

const goToAdmin = () => {
    closeDropdown()
    router.push({ name: 'admin.dashboard' })
}
</script>

<template>
    <div class="relative">
        <div v-if="isOpen" class="fixed inset-0 z-40" @click="closeDropdown"></div>

        <button 
            type="button" 
            @click="toggleDropdown"
            class="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 focus:outline-none z-50 relative group"
        >
            <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shadow-sm border border-indigo-200">
                {{ authStore.profile?.name?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div class="text-left hidden sm:block">
                <p class="text-sm font-semibold text-gray-900 leading-tight group-hover:text-indigo-700 transition-colors">
                    {{ truncateText(authStore.profile?.name || 'User', 15) }}
                </p>
                <p class="text-xs text-gray-500 leading-tight">
                    {{ authStore.profile?.position?.name || 'Employee' }}
                </p>
            </div>
            <ChevronDown class="w-4 h-4 text-gray-400 hidden sm:block transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
        </button>

        <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform scale-95 opacity-0 translate-y-2"
            enter-to-class="transform scale-100 opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="transform scale-100 opacity-100 translate-y-0"
            leave-to-class="transform scale-95 opacity-0 translate-y-2"
        >
            <div 
                v-if="isOpen" 
                class="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100/50 py-2 z-50"
            >
                <div class="px-4 py-3 border-b border-gray-50 mb-1 sm:hidden">
                    <p class="text-sm font-semibold text-gray-900">{{ authStore.profile?.name || 'User' }}</p>
                    <p class="text-xs text-gray-500">{{ authStore.profile?.position?.name || 'Employee' }}</p>
                </div>

                <button 
                    @click="goToProfile"
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                    <User class="w-4 h-4" />
                    <span>Profil Saya</span>
                </button>
                
                <button 
                    v-if="authStore.hasPermission('admin.read')"
                    @click="goToAdmin"
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                    <Shield class="w-4 h-4" />
                    <span>Admin Panel</span>
                </button>
                
                <div class="h-px bg-gray-100 my-1"></div>
                
                <button 
                    @click="handleLogout"
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                    <LogOut class="w-4 h-4" />
                    <span>Logout</span>
                </button>
            </div>
        </Transition>
    </div>
</template>
