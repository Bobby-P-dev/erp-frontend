<script setup>
import { computed } from 'vue'
import { useRouter, RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { showConfirm, showSuccess } from '../utils/swal.js'

import AppHeader from '../components/layout/AppHeader.vue'
import AppFooter from '../components/layout/AppFooter.vue'

import {
    LayoutDashboard,
    FileText,
    ReceiptText,
    ShoppingBag,
    LogOut,
    ShieldCheck,
    Bell,
    Sun,
    ChevronDown
} from '@lucide/vue'

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

const user = computed(() => authStore.user || {})
const supplier = computed(() => user.value.supplier || {})

const supplierInitials = computed(() => {
    const name = supplier.value.name || user.value.name || 'Vendor'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
})

const handleLogout = async () => {
    const confirmed = await showConfirm(
        'Keluar dari Portal?',
        'Anda akan keluar dari sesi akun rekanan PT Padma Soode Indonesia.',
        'Ya, Keluar',
        'Batal',
        '#ef4444'
    )
    if (!confirmed) return

    await authStore.logout()
    showSuccess('Berhasil Keluar', 'Anda telah keluar dari Portal Rekanan.')
    router.push({ name: 'login' })
}
</script>

<template>
    <div class="min-h-screen flex flex-col bg-[#F7F9FC] font-sans antialiased text-slate-800 selection:bg-blue-100 selection:text-blue-900">
        <!-- 1. Header (Identik dengan Dashboard Main: AppHeader fullWidth & isSticky) -->
        <AppHeader isSticky fullWidth>
            <template #left>
                <RouterLink 
                    :to="{ name: 'supplier.portal.dashboard' }" 
                    class="flex items-center gap-2.5 sm:gap-3 group select-none cursor-pointer"
                >
                    <img 
                        src="/pses_transparent.png" 
                        alt="Padma Soode ERP Sistem" 
                        class="h-6.5 sm:h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105" 
                    />
                    <div class="hidden sm:block h-5 w-px bg-[#E5EAF1]"></div>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF2FF] text-[#014BAA] border border-blue-200/80">
                        <ShieldCheck class="w-3.5 h-3.5 text-[#014BAA]" />
                        <span>PORTAL REKANAN</span>
                    </span>
                </RouterLink>
            </template>

            <!-- Right slot: Quick Action & Supplier Profile Dropdown (Identik dengan Dashboard Main) -->
            <template #right>
                <button 
                    type="button" 
                    class="p-2.5 text-slate-500 hover:text-[#014BAA] hover:bg-[#EAF2FF] rounded-[10px] transition-colors relative cursor-pointer" 
                    title="Notifikasi Pengadaan"
                >
                    <Bell class="w-5 h-5" />
                </button>

                <button 
                    type="button" 
                    class="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-[10px] transition-colors cursor-pointer" 
                    title="Mode Tampilan"
                >
                    <Sun class="w-5 h-5" />
                </button>

                <div class="w-px h-6 bg-[#E5EAF1] mx-1"></div>

                <!-- Supplier Profile Dropdown -->
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <button 
                            type="button" 
                            class="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer group select-none"
                        >
                            <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-[#014BAA] text-xs font-bold shadow-2xs border border-blue-200/80 shrink-0">
                                {{ supplierInitials }}
                            </div>
                            <div class="text-left hidden sm:block">
                                <p class="text-xs font-bold text-slate-900 leading-tight group-hover:text-[#014BAA] transition-colors uppercase tracking-tight truncate max-w-[150px]">
                                    {{ supplier.name || user.name || 'Akun Rekanan' }}
                                </p>
                                <p class="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5 uppercase tracking-wider font-mono">
                                    {{ supplier.supplier_code || 'VENDOR' }}
                                </p>
                            </div>
                            <ChevronDown class="w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" :side-offset="8" class="w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50">
                        <DropdownMenuLabel class="px-3 py-2.5 border-b border-slate-100 mb-1">
                            <p class="text-xs font-bold text-slate-900 uppercase truncate">{{ supplier.name || user.name || 'Akun Rekanan' }}</p>
                            <p class="text-[10px] font-semibold text-slate-500 font-mono mt-0.5">{{ supplier.supplier_code || 'VENDOR REKANAN' }}</p>
                        </DropdownMenuLabel>

                        <DropdownMenuItem 
                            @click="router.push({ name: 'supplier.portal.dashboard' })"
                            class="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <LayoutDashboard class="w-4 h-4 text-slate-500" />
                            <span>Dashboard Rekanan</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                            @click="router.push({ name: 'supplier.portal.rfqs' })"
                            class="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <FileText class="w-4 h-4 text-slate-500" />
                            <span>Tender & RFQ Saya</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                            @click="router.push({ name: 'supplier.portal.quotations' })"
                            class="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <ReceiptText class="w-4 h-4 text-slate-500" />
                            <span>Riwayat Penawaran</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                            @click="router.push({ name: 'supplier.portal.purchase-orders' })"
                            class="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <ShoppingBag class="w-4 h-4 text-slate-500" />
                            <span>Pesanan Pembelian (PO)</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator class="my-1 border-slate-100" />

                        <DropdownMenuItem 
                            @click="handleLogout"
                            class="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <LogOut class="w-4 h-4 text-rose-500" />
                            <span>Keluar (Logout)</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </template>
        </AppHeader>

        <!-- 2. Main Body Content (Ukuran Full Width identik dengan Dashboard Main) -->
        <main class="flex-1 flex flex-col w-full">
            <div class="w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-8 flex-1">
                <RouterView />
            </div>
        </main>

        <!-- 3. Footer (Identik dengan Dashboard Main: AppFooter) -->
        <AppFooter />
    </div>
</template>
