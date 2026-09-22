<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getAuthorizedPurchasingMenuItems } from '../../config/purchasingMenu'
import PageHeader from '../../components/ui/PageHeader.vue'
import ModuleCard from '../../components/ui/ModuleCard.vue'
import { 
    Home, 
    ChevronRight, 
    ShoppingBag, 
    Plus, 
    ArrowRight 
} from '@lucide/vue'

const authStore = useAuthStore()

// Filter / check permissions for purchasing menu items
const menuItems = computed(() => {
    return getAuthorizedPurchasingMenuItems(authStore)
})
</script>

<template>
    <section class="space-y-6">
        <!-- 1. Breadcrumb Navigation -->
        <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-sm text-gray-500">
            <RouterLink 
                :to="{ name: 'user.dashboard' }" 
                class="hover:text-indigo-600 font-medium transition-colors flex items-center gap-1.5"
            >
                <Home class="w-4 h-4" />
                <span>Dashboard</span>
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400 shrink-0" />
            <span class="font-semibold text-gray-900" aria-current="page">Purchasing</span>
        </nav>

        <!-- 2. Page Header -->
        <PageHeader
            title="Purchasing"
            description="Kelola seluruh proses pengadaan barang dan jasa perusahaan."
        >
            <template #icon>
                <ShoppingBag class="w-6 h-6" />
            </template>
            <template #actions>
                <RouterLink
                    :to="{ name: 'user.purchasing.requisitions' }"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-sm hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
                >
                    <Plus class="w-4 h-4" />
                    <span>Buat PR Baru</span>
                </RouterLink>
            </template>
        </PageHeader>

        <!-- 3. Visual Workflow Pipeline Strip -->
        <div class="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs overflow-x-auto">
            <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Siklus Pengadaan Barang & Jasa (Procurement Lifecycle)
                </p>
                <span class="text-xs text-gray-400">
                    Alur Kerja Operasional
                </span>
            </div>

            <div class="flex items-center min-w-[680px] justify-between gap-3 text-xs">
                <!-- Step 1 -->
                <div class="flex items-center gap-2.5 text-indigo-700 font-semibold bg-indigo-50/80 px-3.5 py-2 rounded-xl border border-indigo-100 flex-1">
                    <span class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <div>
                        <div class="leading-tight">Pengajuan PR</div>
                        <div class="text-[10px] text-indigo-500 font-normal">Identifikasi Kebutuhan</div>
                    </div>
                </div>

                <ArrowRight class="w-4 h-4 text-gray-300 shrink-0" />

                <!-- Step 2 -->
                <div class="flex items-center gap-2.5 text-amber-800 font-semibold bg-amber-50/80 px-3.5 py-2 rounded-xl border border-amber-100 flex-1">
                    <span class="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <div>
                        <div class="leading-tight">Antrean Pengadaan</div>
                        <div class="text-[10px] text-amber-600 font-normal">Verifikasi PR Approved</div>
                    </div>
                </div>

                <ArrowRight class="w-4 h-4 text-gray-300 shrink-0" />

                <!-- Step 3 -->
                <div class="flex items-center gap-2.5 text-blue-700 font-semibold bg-blue-50/80 px-3.5 py-2 rounded-xl border border-blue-100 flex-1">
                    <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    <div>
                        <div class="leading-tight">Rencana Pengadaan</div>
                        <div class="text-[10px] text-blue-500 font-normal">Metode & Alokasi Pagu</div>
                    </div>
                </div>

                <ArrowRight class="w-4 h-4 text-gray-300 shrink-0" />

                <!-- Step 4 -->
                <div class="flex items-center gap-2.5 text-emerald-700 font-semibold bg-emerald-50/80 px-3.5 py-2 rounded-xl border border-emerald-100 flex-1">
                    <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
                    <div>
                        <div class="leading-tight">Eksekusi Direct / RFQ</div>
                        <div class="text-[10px] text-emerald-600 font-normal">PO & Penerimaan Barang</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4. Operational Cards Grid -->
        <div>
            <div class="mb-5">
                <h2 class="text-lg font-bold text-gray-900">
                    Menu Purchasing
                </h2>
                <p class="text-sm text-gray-500 mt-0.5">
                    Pilih fungsi operasional pengadaan yang ingin Anda kelola.
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                <ModuleCard
                    v-for="item in menuItems"
                    :key="item.id"
                    :title="item.title"
                    :subtitle="item.subtitle"
                    :description="item.description"
                    :icon="item.icon"
                    :to="item.routeName ? { name: item.routeName } : null"
                    :color="item.color"
                    :badge="item.badge"
                    :badgeVariant="item.badgeVariant"
                    :status="item.status"
                    :actionText="item.actionText"
                    :restricted="item.restricted"
                    restrictedMessage="Akses khusus tim Purchasing / Procurement"
                />
            </div>
        </div>
    </section>
</template>
