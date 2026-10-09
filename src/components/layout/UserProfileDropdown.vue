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
    router.push({ name: 'user.profile' })
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
            class="flex items-center gap-3 p-1.5 pr-4 rounded-full hover:bg-gray-100/80 transition-colors border border-transparent hover:border-gray-200 focus:outline-none z-50 relative group cursor-pointer"
        >
            <div class="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-base font-bold shadow-xs border border-blue-200">
                {{ authStore.profile?.name?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div class="text-left hidden sm:block">
                <p class="text-base font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                    {{ truncateText(authStore.profile?.name || 'User', 20) }}
                </p>
                <p class="text-sm font-medium text-slate-500 leading-tight mt-0.5">
                    {{ authStore.profile?.position?.name || 'Employee' }}
                </p>
            </div>
            <ChevronDown class="w-5 h-5 text-gray-400 hidden sm:block transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
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
                class="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 py-2.5 z-50"
            >
                <div class="px-4 py-3 border-b border-gray-100 mb-1 sm:hidden">
                    <p class="text-base font-bold text-slate-900">{{ authStore.profile?.name || 'User' }}</p>
                    <p class="text-sm text-slate-500">{{ authStore.profile?.position?.name || 'Employee' }}</p>
                </div>

                <button 
                    @click="goToProfile"
                    class="w-full flex items-center justify-between px-4 py-3 text-base font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                >
                    <div class="flex items-center gap-3">
                        <User class="w-5 h-5 text-slate-500" />
                        <span>Profil Saya</span>
                    </div>
                    <span
                        v-if="authStore.user?.has_signature"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                        TTD Aktif
                    </span>
                    <span
                        v-else
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                    >
                        TTD Kosong
                    </span>
                </button>
                
                <button 
                    v-if="authStore.hasPermission('admin.read')"
                    @click="goToAdmin"
                    class="w-full flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                >
                    <Shield class="w-5 h-5 text-slate-500" />
                    <span>Admin Panel</span>
                </button>
                
                <div class="h-px bg-gray-100 my-1"></div>
                
                <button 
                    @click="handleLogout"
                    class="w-full flex items-center gap-3 px-4 py-3 text-base font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                >
                    <LogOut class="w-5 h-5 text-rose-500" />
                    <span>Logout</span>
                </button>
            </div>
        </Transition>
    </div>
</template>
