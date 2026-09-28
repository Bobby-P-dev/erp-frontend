<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getPurchaseRequisitions } from '../../services/purchaseRequisitionServices.js'
import { getProcurementPlans } from '../../services/procurementPlanServices.js'
import { getDirectPurchases } from '../../services/directPurchaseServices.js'
import { 
    Home, 
    ChevronRight, 
    ShoppingBag, 
    Plus, 
    ArrowRight,
    FileText,
    Layers,
    ShoppingCart,
    Scale,
    Lock,
    ShieldAlert
} from '@lucide/vue'

const authStore = useAuthStore()

// Operational summary counts for live tactile feedback
const counts = ref({
    pr: null,
    plans: null,
    direct: null
})

const fetchSummaryCounts = async () => {
    try {
        const prRes = await getPurchaseRequisitions('', 1, 1)
        counts.value.pr = prRes?.meta?.total ?? prRes?.data?.total ?? null
    } catch (_) {}

    try {
        const planRes = await getProcurementPlans({}, 1, 1)
        counts.value.plans = planRes?.meta?.total ?? planRes?.data?.total ?? null
    } catch (_) {}

    try {
        const dpRes = await getDirectPurchases('', 1, {})
        counts.value.direct = dpRes?.meta?.total ?? dpRes?.data?.total ?? null
    } catch (_) {}
}

onMounted(() => {
    fetchSummaryCounts()
})
</script>

<template>
    <section class="space-y-6">
        <!-- 1. Breadcrumb Navigation -->
        <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
            <RouterLink 
                :to="{ name: 'user.dashboard' }" 
                class="hover:text-blue-600 font-medium transition-colors flex items-center gap-1.5"
            >
                <Home class="w-4 h-4" />
                <span>Dashboard</span>
            </RouterLink>
            <ChevronRight class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span class="font-semibold text-blue-900" aria-current="page">Pengadaan (Purchasing)</span>
        </nav>

        <!-- 2. Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
            <div class="space-y-1">
                <div class="flex items-center gap-2.5">
                    <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
                        <ShoppingBag class="w-5 h-5" />
                    </div>
                    <div>
                        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Pengadaan & Pembelian
                        </h1>
                    </div>
                </div>
                <p class="text-xs sm:text-sm text-slate-500 max-w-2xl">
                    Pusat pengelolaan permohonan barang (PR), penyusunan rencana pengadaan, dan realisasi transaksi operasional perusahaan.
                </p>
            </div>

            <div class="flex items-center gap-2.5 shrink-0">
                <RouterLink
                    :to="{ name: 'user.purchasing.requisitions.create' }"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-200 transition-all group cursor-pointer"
                >
                    <Plus class="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                    <span>Buat PR Baru</span>
                </RouterLink>
            </div>
        </div>

        <!-- 3. Siklus Pengadaan Barang & Jasa (Procurement Lifecycle) -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs overflow-x-auto">
            <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Siklus Pengadaan Barang & Jasa (Procurement Lifecycle)
                </p>
                <span class="text-xs text-slate-400 hidden sm:inline">
                    Alur Kerja Operasional
                </span>
            </div>

            <div class="flex items-center min-w-[560px] justify-between gap-3 text-xs">
                <!-- Step 1 -->
                <div class="flex items-center gap-2.5 text-blue-900 font-semibold bg-blue-50/80 px-3.5 py-2 rounded-xl border border-blue-200/80 flex-1">
                    <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">1</span>
                    <div>
                        <div class="leading-tight text-slate-900 font-bold">Pengajuan PR</div>
                        <div class="text-[10px] text-blue-700 font-normal">Identifikasi Kebutuhan</div>
                    </div>
                </div>

                <ArrowRight class="w-4 h-4 text-slate-300 shrink-0" />

                <!-- Step 2 -->
                <div class="flex items-center gap-2.5 text-blue-900 font-semibold bg-blue-50/80 px-3.5 py-2 rounded-xl border border-blue-200/80 flex-1">
                    <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">2</span>
                    <div>
                        <div class="leading-tight text-slate-900 font-bold">Rencana Pengadaan</div>
                        <div class="text-[10px] text-blue-700 font-normal">Metode & Alokasi Pagu</div>
                    </div>
                </div>

                <ArrowRight class="w-4 h-4 text-slate-300 shrink-0" />

                <!-- Step 3 -->
                <div class="flex items-center gap-2.5 text-emerald-900 font-semibold bg-emerald-50/80 px-3.5 py-2 rounded-xl border border-emerald-200/80 flex-1">
                    <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">3</span>
                    <div>
                        <div class="leading-tight text-slate-900 font-bold">Realisasi Transaksi</div>
                        <div class="text-[10px] text-emerald-700 font-normal">PO, Direct Purchase & RFQ</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4. Operational Cards Grid -->
        <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                    <h2 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Menu Purchasing
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">
                        Pilih fungsi operasional pengadaan yang ingin Anda kelola.
                    </p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
                <!-- Card 1: Purchase Requisition -->
                <div 
                    class="bg-white rounded-2xl border border-blue-200/80 hover:border-blue-400 bg-gradient-to-b from-white to-blue-50/20 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-200">
                                <FileText class="w-5 h-5" />
                            </div>
                            <span v-if="counts.pr !== null" class="text-xs font-mono font-bold text-blue-800 bg-blue-100/90 border border-blue-300 px-2.5 py-0.5 rounded-md">
                                {{ counts.pr }} Permohonan
                            </span>
                            <span v-else class="text-[10px] font-semibold text-blue-700 uppercase tracking-wider bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md">
                                Tahap 1
                            </span>
                        </div>

                        <div>
                            <h4 class="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                Purchase Requisition
                            </h4>
                            <p class="text-[11px] font-medium text-blue-600/80 mt-0.5">
                                Pengajuan Kebutuhan (PR)
                            </p>
                            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                                Buat dan monitor kebutuhan pembelian barang atau jasa divisi Anda dengan alur persetujuan terintegrasi.
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 pt-3.5 border-t border-blue-100 flex items-center justify-between text-xs font-semibold text-blue-700 group-hover:text-blue-800 transition-colors">
                        <RouterLink :to="{ name: 'user.purchasing.requisitions' }" class="flex items-center justify-between w-full">
                            <span>Kelola Requisition</span>
                            <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </RouterLink>
                    </div>
                </div>

                <!-- Card 2: Procurement Plans -->
                <div 
                    v-if="authStore.hasPermission('procurement-plan.read')"
                    class="bg-white rounded-2xl border border-blue-200/80 hover:border-blue-400 bg-gradient-to-b from-white to-blue-50/20 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-200">
                                <Layers class="w-5 h-5" />
                            </div>
                            <span v-if="counts.plans !== null" class="text-xs font-mono font-bold text-blue-800 bg-blue-100/90 border border-blue-300 px-2.5 py-0.5 rounded-md">
                                {{ counts.plans }} Rencana
                            </span>
                            <span v-else class="text-[10px] font-semibold text-blue-700 uppercase tracking-wider bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md">
                                Tahap 2
                            </span>
                        </div>

                        <div>
                            <h4 class="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                Rencana Pengadaan
                            </h4>
                            <p class="text-[11px] font-medium text-blue-600/80 mt-0.5">
                                Procurement Plans
                            </p>
                            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                                Konsolidasi item kebutuhan, penentuan metode sourcing (Direct / RFQ), dan penetapan alokasi pagu anggaran.
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 pt-3.5 border-t border-blue-100 flex items-center justify-between text-xs font-semibold text-blue-700 group-hover:text-blue-800 transition-colors">
                        <RouterLink :to="{ name: 'user.purchasing.plans' }" class="flex items-center justify-between w-full">
                            <span>Kelola Rencana</span>
                            <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </RouterLink>
                    </div>
                </div>

                <!-- Restricted Card 2: Plans -->
                <div 
                    v-else
                    class="bg-slate-50/60 rounded-2xl border border-slate-200/70 p-5 opacity-75 flex flex-col justify-between"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                                <Layers class="w-5 h-5" />
                            </div>
                            <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                                Khusus Procurement
                            </span>
                        </div>
                        <div>
                            <h4 class="text-base font-bold text-slate-700">Rencana Pengadaan</h4>
                            <p class="text-xs text-slate-400 mt-1">Konsolidasi item dan penetapan metode pengadaan.</p>
                        </div>
                    </div>
                    <div class="mt-5 pt-3.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400">
                        <span class="flex items-center gap-1.5"><ShieldAlert class="w-3.5 h-3.5 text-slate-400" /> Akses Terbatas</span>
                        <Lock class="w-3.5 h-3.5" />
                    </div>
                </div>

                <!-- Card 3: Direct Purchases -->
                <div 
                    v-if="authStore.hasPermission('direct-purchase.read')"
                    class="bg-white rounded-2xl border border-emerald-200/80 hover:border-emerald-400 bg-gradient-to-b from-white to-emerald-50/20 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shadow-emerald-200">
                                <ShoppingCart class="w-5 h-5" />
                            </div>
                            <span v-if="counts.direct !== null" class="text-xs font-mono font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                                {{ counts.direct }} Transaksi
                            </span>
                            <span v-else class="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
                                Tahap 3
                            </span>
                        </div>

                        <div>
                            <h4 class="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                Pembelian Langsung
                            </h4>
                            <p class="text-[11px] font-medium text-emerald-600/80 mt-0.5">
                                Direct Purchases
                            </p>
                            <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                                Eksekusi pembelian cepat melalui marketplace online atau toko/supplier rekanan resmi perusahaan.
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 pt-3.5 border-t border-emerald-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800 transition-colors">
                        <RouterLink :to="{ name: 'user.purchasing.direct' }" class="flex items-center justify-between w-full">
                            <span>Lihat Pembelian</span>
                            <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </RouterLink>
                    </div>
                </div>

                <!-- Restricted Card 3: Direct Purchases -->
                <div 
                    v-else
                    class="bg-slate-50/60 rounded-2xl border border-slate-200/70 p-5 opacity-75 flex flex-col justify-between"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                                <ShoppingCart class="w-5 h-5" />
                            </div>
                            <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                                Khusus Procurement
                            </span>
                        </div>
                        <div>
                            <h4 class="text-base font-bold text-slate-700">Pembelian Langsung</h4>
                            <p class="text-xs text-slate-400 mt-1">Eksekusi transaksi marketplace atau toko rekanan.</p>
                        </div>
                    </div>
                    <div class="mt-5 pt-3.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400">
                        <span class="flex items-center gap-1.5"><ShieldAlert class="w-3.5 h-3.5 text-slate-400" /> Akses Terbatas</span>
                        <Lock class="w-3.5 h-3.5" />
                    </div>
                </div>

                <!-- Card 4: RFQ & Tender (Coming Soon) -->
                <div class="bg-slate-50/70 border border-dashed border-slate-200/90 rounded-2xl p-5 select-none opacity-85 flex flex-col justify-between">
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                                <Scale class="w-5 h-5" />
                            </div>
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md">
                                Segera Hadir
                            </span>
                        </div>

                        <div>
                            <h4 class="text-base font-bold text-slate-700">
                                Request for Quotation (RFQ)
                            </h4>
                            <p class="text-[11px] font-medium text-slate-400 mt-0.5">
                                Multi-Vendor Tender
                            </p>
                            <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                                Komparasi penawaran harga multi-vendor dan negosiasi tender pengadaan bernilai besar.
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 pt-3.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-medium text-slate-400">
                        <span>Dalam Pengembangan</span>
                        <Lock class="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>
