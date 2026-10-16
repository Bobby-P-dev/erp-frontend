<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { truncateText } from '../../utils/stringUtils'
import { LogOut, User, Shield, ChevronDown } from '@lucide/vue'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = async () => {
    await authStore.logout()
    router.push({ name: 'welcome' })
}

const goToProfile = () => {
    router.push({ name: 'user.profile' })
}

const goToAdmin = () => {
    router.push({ name: 'admin.dashboard' })
}
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <button 
                type="button" 
                class="flex items-center gap-3 p-1.5 pr-3.5 rounded-full hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer group select-none"
            >
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold shadow-xs border border-blue-200">
                    {{ authStore.profile?.name?.charAt(0)?.toUpperCase() || 'U' }}
                </div>
                <div class="text-left hidden sm:block">
                    <p class="text-sm font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                        {{ truncateText(authStore.profile?.name || 'User', 20) }}
                    </p>
                    <p class="text-xs font-medium text-slate-500 leading-tight mt-0.5">
                        {{ authStore.profile?.position?.name || 'Karyawan' }}
                    </p>
                </div>
                <ChevronDown class="w-4 h-4 text-slate-400 hidden sm:block transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" :side-offset="8" class="w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-1.5 z-50">
            <DropdownMenuLabel class="px-3 py-2.5 border-b border-slate-100 mb-1 sm:hidden">
                <p class="text-sm font-bold text-slate-900">{{ authStore.profile?.name || 'User' }}</p>
                <p class="text-xs text-slate-500">{{ authStore.profile?.position?.name || 'Karyawan' }}</p>
            </DropdownMenuLabel>

            <DropdownMenuItem 
                @click="goToProfile"
                class="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
            >
                <div class="flex items-center gap-2.5">
                    <User class="w-4 h-4 text-slate-500" />
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
            </DropdownMenuItem>

            <DropdownMenuItem 
                v-if="authStore.hasPermission('admin.read')"
                @click="goToAdmin"
                class="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
            >
                <Shield class="w-4 h-4 text-slate-500" />
                <span>Admin Panel</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator class="my-1 border-slate-100" />

            <DropdownMenuItem 
                @click="handleLogout"
                class="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
            >
                <LogOut class="w-4 h-4 text-rose-500" />
                <span>Keluar (Logout)</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
