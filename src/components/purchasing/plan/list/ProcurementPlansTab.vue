<script setup>
import { RouterLink } from 'vue-router'
import BaseTable from '../../../ui/BaseTable.vue'
import Pagination from '../../../ui/Pagination.vue'
import StatusBadge from '../../../ui/StatusBadge.vue'
import {
    Layers,
    Plus,
    RefreshCw,
    Search,
    Calendar,
    ShoppingCart,
    Scale,
    FileText,
    CheckCircle2,
    Clock,
    Eye,
    Play,
    Ban,
    CheckCheck,
    ArrowUpRight
} from '@lucide/vue'

defineProps({
    plans: { type: Array, required: true },
    isLoadingPlans: { type: Boolean, default: false },
    searchQuery: { type: String, default: '' },
    selectedStatus: { type: String, default: '' },
    selectedMethod: { type: String, default: '' },
    stats: { type: Object, required: true },
    statusTabs: { type: Array, required: true },
    methodOptions: { type: Array, required: true },
    tableColumns: { type: Array, required: true },
    pagination: { type: Object, required: true },
    formatDate: { type: Function, required: true },
    isMultiPrPlan: { type: Function, required: true },
    getSinglePrNumber: { type: Function, required: true },
    getSinglePrSubtitle: { type: Function, required: true },
    getMultiPrCount: { type: Function, required: true },
    getMultiPrSubtitle: { type: Function, required: true }
})

const emit = defineEmits([
    'update:searchQuery',
    'update:selectedMethod',
    'status-tab',
    'fetch-plans',
    'page-change',
    'switch-tab',
    'open-pr-modal',
    'activate',
    'cancel'
])
</script>

<template>
    <div class="space-y-6">
        <!-- Operational Workbench Header (Anti-Slop Bento Dock) -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-gradient-to-r from-blue-50/30 via-slate-50/20 to-white">
                <!-- Left: Pipeline Stage Breakdown -->
                <div class="space-y-2">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-200">
                            <Layers class="w-4 h-4" />
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900">Alur Eksekusi Rencana Sourcing</h3>
                            <p class="text-xs text-slate-500">Distribusi dokumen rencana pengadaan berdasarkan status kesiapan operasi</p>
                        </div>
                    </div>

                    <!-- Live Metric Pills -->
                    <div class="flex items-center gap-2 pt-1 flex-wrap">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Layers class="w-3.5 h-3.5 text-slate-500" />
                            <span>Total Rencana: <strong class="text-slate-900 font-mono">{{ stats.total }}</strong></span>
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock class="w-3.5 h-3.5 text-amber-600" />
                            <span>Draft: <strong class="font-mono">{{ stats.draft }}</strong></span>
                            <span v-if="stats.draft > 0" class="text-[10px] bg-amber-200/60 px-1.5 py-0.2 rounded font-semibold text-amber-900">Perlu Aktivasi</span>
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <CheckCircle2 class="w-3.5 h-3.5 text-blue-600" />
                            <span>Aktif Berjalan: <strong class="font-mono">{{ stats.active }}</strong></span>
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCheck class="w-3.5 h-3.5 text-emerald-600" />
                            <span>Selesai: <strong class="font-mono">{{ stats.completed }}</strong></span>
                        </span>
                    </div>
                </div>

                <!-- Right: Sourcing Method Split Card -->
                <div class="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200/80 lg:pl-6">
                    <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                            <ShoppingCart class="w-5 h-5" />
                        </div>
                        <div>
                            <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Direct Purchase</span>
                            <div class="flex items-baseline gap-1.5">
                                <span class="text-lg font-bold text-emerald-700 font-mono">{{ stats.direct }}</span>
                                <span class="text-[11px] text-slate-500 font-medium">Paket</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                            <Scale class="w-5 h-5" />
                        </div>
                        <div>
                            <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Tender RFQ</span>
                            <div class="flex items-baseline gap-1.5">
                                <span class="text-lg font-bold text-blue-700 font-mono">{{ stats.rfq }}</span>
                                <span class="text-[11px] text-slate-500 font-medium">Paket</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Table & Filter Card -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <!-- Filter Toolbar -->
            <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                    <div class="relative flex-1 w-full">
                        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input 
                            :value="searchQuery"
                            @input="emit('update:searchQuery', $event.target.value)"
                            type="text"
                            placeholder="Cari No. Rencana (PP) atau Dokumen PR..." 
                            class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <select 
                        :value="selectedMethod"
                        @change="emit('update:selectedMethod', $event.target.value)"
                        class="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs transition-colors shrink-0"
                    >
                        <option v-for="opt in methodOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>

                    <button 
                        type="button"
                        @click="emit('fetch-plans')"
                        :disabled="isLoadingPlans"
                        class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0 self-center sm:self-auto"
                        title="Segarkan Data"
                    >
                        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingPlans }" />
                    </button>
                </div>

                <!-- Segmented Status Tabs -->
                <div class="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 overflow-x-auto self-start lg:self-auto shrink-0">
                    <button
                        v-for="tab in statusTabs"
                        :key="tab.id"
                        type="button"
                        @click="emit('status-tab', tab.id)"
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer"
                        :class="selectedStatus === tab.id 
                            ? 'bg-blue-600 text-white font-bold shadow-xs shadow-blue-200' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
                    >
                        {{ tab.label }}
                    </button>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns">
                <tr v-if="isLoadingPlans">
                    <td colspan="8" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat rencana pengadaan...
                        </div>
                    </td>
                </tr>

                <tr v-else-if="plans.length === 0">
                    <td colspan="8" class="px-6 py-14 text-center text-slate-500">
                        <div class="flex flex-col items-center justify-center max-w-md mx-auto space-y-2.5">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                <Layers class="w-6 h-6 text-slate-400" />
                            </div>
                            <h4 class="text-sm font-bold text-slate-900 mb-1">Belum Ada Rencana Pengadaan</h4>
                            <p class="text-xs text-slate-500 leading-relaxed mb-4">
                                Pilih Purchase Requisition (PR) yang telah disetujui di tab "Purchase Siap Diplanning" untuk membuat rencana pengadaan.
                            </p>
                            <button
                                type="button"
                                @click="emit('switch-tab', 'pending')"
                                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer"
                            >
                                <Plus class="w-3.5 h-3.5" />
                                <span>Pilih PR untuk Dibuat Rencana</span>
                            </button>
                        </div>
                    </td>
                </tr>

                <tr 
                    v-else 
                    v-for="(plan, index) in plans" 
                    :key="plan.id"
                    class="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-b-0"
                >
                    <td class="px-6 py-4.5 whitespace-nowrap text-sm font-mono font-semibold text-slate-500 text-center">
                        {{ ((pagination.current_page - 1) * pagination.per_page) + index + 1 }}
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <RouterLink 
                            :to="{ name: 'user.purchasing.plans.detail', params: { id: plan.id } }"
                            class="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors group/link text-left"
                            title="Lihat detail rencana pengadaan"
                        >
                            <span class="group-hover/link:underline">{{ plan.pp_number || 'PP #' + plan.id }}</span>
                            <ArrowUpRight class="w-4 h-4 text-slate-400 group-hover/link:text-blue-600 opacity-0 group-hover/link:opacity-100 transition-all shrink-0" />
                        </RouterLink>
                        <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                            <Calendar class="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{{ formatDate(plan.created_at) }}</span>
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div v-if="isMultiPrPlan(plan)">
                            <button
                                type="button"
                                @click.stop="emit('open-pr-modal', plan)"
                                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors cursor-pointer group/modal"
                                title="Klik untuk melihat rincian dokumen PR asal"
                            >
                                <Layers class="w-3.5 h-3.5 text-indigo-500 group-hover/modal:scale-110 transition-transform" />
                                <span>{{ getMultiPrCount(plan) }} PR Terkonsolidasi</span>
                            </button>
                            <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5 truncate max-w-[200px]" :title="getMultiPrSubtitle(plan)">
                                <FileText class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span class="truncate">{{ getMultiPrSubtitle(plan) }}</span>
                            </div>
                        </div>

                        <div v-else>
                            <div class="text-sm font-mono font-bold text-slate-900 flex items-center gap-2">
                                <FileText class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ getSinglePrNumber(plan) }}</span>
                            </div>
                            <div class="text-xs text-slate-500 font-medium mt-1 truncate max-w-[200px]" :title="getSinglePrSubtitle(plan)">
                                <span>{{ getSinglePrSubtitle(plan) }}</span>
                            </div>
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <span 
                            v-if="plan.procurement_method === 'direct_purchase'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                            <ShoppingCart class="w-3.5 h-3.5" />
                            Direct Purchase
                        </span>
                        <span 
                            v-else-if="plan.procurement_method === 'rfq'"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                        >
                            <Scale class="w-3.5 h-3.5" />
                            Tender RFQ
                        </span>
                        <span v-else class="text-xs text-slate-400">-</span>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                            {{ plan.items?.length || 0 }} Item
                        </span>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <div class="inline-flex items-center justify-center">
                            <StatusBadge :status="plan.status" size="md" class="min-w-[110px]" />
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div class="text-sm font-semibold text-slate-900">
                            {{ plan.created_by_user?.name || plan.created_by_user?.employee?.name || 'Staff Purchasing' }}
                        </div>
                        <div class="text-xs text-slate-500 font-medium mt-0.5">
                            {{ plan.created_by_user?.employee?.division?.name || 'Purchasing Dept' }}
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <RouterLink 
                                :to="{ name: 'user.purchasing.plans.detail', params: { id: plan.id } }"
                                class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                title="Lihat Rincian Rencana"
                            >
                                <Eye class="w-4 h-4" />
                            </RouterLink>

                            <button 
                                v-if="plan.status === 'draft'"
                                @click="emit('activate', plan)"
                                class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                                title="Aktifkan Rencana Ini"
                            >
                                <Play class="w-4 h-4" />
                            </button>

                            <button 
                                v-if="['draft', 'active'].includes(plan.status)"
                                @click="emit('cancel', plan)"
                                class="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                                title="Batalkan Rencana"
                            >
                                <Ban class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            </BaseTable>

            <!-- Pagination -->
            <div class="p-5 border-t border-slate-100 flex items-center justify-between">
                <Pagination 
                    :pagination="pagination" 
                    @page-change="emit('page-change', $event)" 
                />
            </div>
        </div>
    </div>
</template>
