<script setup>
import { RouterLink } from 'vue-router'
import BaseTable from '../../../ui/BaseTable.vue'
import Pagination from '../../../ui/Pagination.vue'
import StatusBadge from '../../../ui/StatusBadge.vue'
import {
    Scale,
    Plus,
    RefreshCw,
    Search,
    Calendar,
    Clock,
    Eye,
    Play,
    Ban,
    Building2,
    Layers,
    FileText,
    Users,
    ArrowUpRight,
    CheckCheck,
    BarChart3
} from '@lucide/vue'

defineProps({
    rfqs: { type: Array, required: true },
    isLoading: { type: Boolean, default: false },
    searchQuery: { type: String, default: '' },
    selectedStatus: { type: String, default: '' },
    pagination: { type: Object, required: true },
    stats: { type: Object, required: true },
    tableColumns: { type: Array, required: true },
    statusTabs: { type: Array, required: true },
    getDeadlineInfo: { type: Function, required: true },
    formatDate: { type: Function, required: true }
})

const emit = defineEmits([
    'update:searchQuery',
    'status-filter',
    'fetch-rfqs',
    'page-change',
    'switch-tab',
    'go-detail',
    'go-comparison',
    'publish',
    'cancel'
])
</script>

<template>
    <div class="space-y-6">
        <!-- Operational Workbench Header (Bento KPI Dock) -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-gradient-to-r from-blue-50/30 via-slate-50/20 to-white">
                <div class="space-y-2">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-200">
                            <Scale class="w-4 h-4" />
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900">Alur Pengadaan Tender RFQ (Multi-Vendor)</h3>
                            <p class="text-xs text-slate-500">Distribusi dokumen tender berdasarkan status penawaran dan evaluasi rekanan</p>
                        </div>
                    </div>

                    <!-- Live Metric Pills -->
                    <div class="flex items-center gap-2 pt-1 flex-wrap">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <FileText class="w-3.5 h-3.5 text-slate-500" />
                            <span>Total Tender: <strong class="text-slate-900 font-mono">{{ stats.total }}</strong></span>
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock class="w-3.5 h-3.5 text-blue-600" />
                            <span>Menunggu Penawaran: <strong class="font-mono">{{ stats.published }}</strong></span>
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <BarChart3 class="w-3.5 h-3.5 text-amber-600" />
                            <span>Dalam Evaluasi: <strong class="font-mono">{{ stats.evaluation }}</strong></span>
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCheck class="w-3.5 h-3.5 text-emerald-600" />
                            <span>Selesai (Awarded): <strong class="font-mono">{{ stats.completed }}</strong></span>
                        </span>
                    </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                    <RouterLink
                        :to="{ name: 'user.purchasing.plans' }"
                        class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                        <Layers class="w-3.5 h-3.5 text-slate-500" />
                        <span>Lihat Rencana Pengadaan</span>
                    </RouterLink>
                </div>
            </div>
        </div>

        <!-- Filter Bar & Table Section -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <!-- Filter Toolbar -->
            <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div class="flex items-center gap-2.5 flex-1 max-w-md w-full">
                    <div class="relative flex-1 w-full">
                        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            :value="searchQuery"
                            @input="emit('update:searchQuery', $event.target.value)"
                            type="text"
                            placeholder="Cari No. RFQ, judul tender, atau No. Rencana (PP)..."
                            class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <button
                        type="button"
                        @click="emit('fetch-rfqs')"
                        :disabled="isLoading"
                        class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
                        title="Segarkan Data"
                    >
                        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
                    </button>
                </div>

                <!-- Segmented Status Tabs (Unified Blue Active Style) -->
                <div class="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 overflow-x-auto self-start lg:self-auto shrink-0">
                    <button
                        v-for="tab in statusTabs"
                        :key="tab.id"
                        type="button"
                        @click="emit('status-filter', tab.id)"
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer"
                        :class="selectedStatus === tab.id
                            ? 'bg-blue-600 text-white font-bold shadow-xs shadow-blue-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
                    >
                        {{ tab.label }}
                    </button>
                </div>
            </div>

            <!-- RFQ Table -->
            <BaseTable :columns="tableColumns">
                <tr v-if="isLoading">
                    <td colspan="7" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat daftar Request for Quotation (RFQ)...
                        </div>
                    </td>
                </tr>

                <tr v-else-if="rfqs.length === 0">
                    <td colspan="7" class="px-6 py-14 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2.5">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                <Scale class="w-6 h-6 text-slate-400" />
                            </div>
                            <div class="text-sm font-semibold text-slate-700">
                                {{ searchQuery ? 'Tidak ada tender RFQ yang cocok dengan pencarian' : 'Belum Ada Dokumen Tender RFQ' }}
                            </div>
                            <p class="text-xs text-slate-400">
                                {{ searchQuery ? 'Coba ubah kata kunci pencarian atau reset filter status Anda.' : 'Pilih Rencana Pengadaan di tab "Rencana Siap Ditenderkan" untuk membuat paket tender baru.' }}
                            </p>
                            <button
                                v-if="!searchQuery"
                                type="button"
                                @click="emit('switch-tab', 'queue')"
                                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-xs mt-1 cursor-pointer"
                            >
                                <Plus class="w-4 h-4" />
                                <span>Pilih Rencana untuk Ditenderkan</span>
                            </button>
                        </div>
                    </td>
                </tr>

                <tr
                    v-else
                    v-for="(rfq, index) in rfqs"
                    :key="rfq.id"
                    class="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-b-0"
                >
                    <td class="px-4 py-4.5 whitespace-nowrap text-sm font-mono font-semibold text-slate-500 text-center">
                        {{ (pagination.current_page - 1) * pagination.per_page + index + 1 }}
                    </td>

                    <td class="px-6 py-4.5">
                        <button
                            type="button"
                            @click="emit('go-detail', rfq.id)"
                            class="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors group/btn text-left cursor-pointer"
                            title="Klik untuk melihat rincian tender"
                        >
                            <span class="group-hover/btn:underline">{{ rfq.rfq_number }}</span>
                            <ArrowUpRight class="w-4 h-4 text-slate-400 group-hover/btn:text-blue-600 opacity-0 group-hover/btn:opacity-100 transition-all shrink-0" />
                        </button>
                        <div class="text-xs text-slate-600 font-medium mt-1 line-clamp-1 max-w-sm" :title="rfq.title">
                            {{ rfq.title }}
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div class="text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5">
                            <Layers class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{{ rfq.procurement_plan?.pp_number || `PP #${rfq.procurement_plan_id || '-'}` }}</span>
                        </div>
                        <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                            <Building2 class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span class="truncate max-w-[200px]">{{ rfq.company?.name || rfq.procurement_plan?.purchase_requisition?.company?.name || 'PT Padma Soode Indonesia' }}</span>
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div class="text-xs text-slate-800 font-semibold flex items-center gap-1.5">
                            <Calendar class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{{ formatDate(rfq.deadline_date) }}</span>
                        </div>
                        <div class="mt-1">
                            <span
                                :class="[
                                    'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border',
                                    getDeadlineInfo(rfq.deadline_date).badgeClass
                                ]"
                            >
                                {{ getDeadlineInfo(rfq.deadline_date).text }}
                            </span>
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <div class="inline-flex flex-col items-center justify-center">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                <Users class="w-3.5 h-3.5 text-slate-500" />
                                <span>{{ rfq.quotations_count ?? rfq.quotations?.length ?? 0 }} / {{ rfq.suppliers_count ?? rfq.rfq_suppliers?.length ?? 0 }} Vendor</span>
                            </span>
                            <span class="text-[10px] text-slate-500 font-medium mt-1">
                                {{ rfq.items_count ?? rfq.items?.length ?? 0 }} Item Ditenderkan
                            </span>
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <div class="inline-flex items-center justify-center">
                            <StatusBadge :status="rfq.status" size="md" class="min-w-[120px]" />
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <button
                                type="button"
                                @click="emit('go-detail', rfq.id)"
                                class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                                title="Lihat Rincian Tender"
                            >
                                <Eye class="w-4 h-4" />
                            </button>

                            <button
                                type="button"
                                @click="emit('go-comparison', rfq.id)"
                                :class="[
                                    'p-2 rounded-lg transition-colors border cursor-pointer',
                                    (rfq.quotations_count > 0 || ['published', 'evaluation', 'completed'].includes(rfq.status?.value || rfq.status))
                                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                        : 'text-slate-400 bg-slate-50 border-slate-200 hover:text-slate-600'
                                ]"
                                title="Buka Matriks Komparasi Penawaran"
                            >
                                <Scale class="w-4 h-4" />
                            </button>

                            <button
                                v-if="(rfq.status?.value || rfq.status) === 'draft'"
                                type="button"
                                @click="emit('publish', rfq)"
                                class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                                title="Publikasikan Tender Sekarang"
                            >
                                <Play class="w-4 h-4" />
                            </button>

                            <button
                                v-if="['draft', 'published', 'evaluation'].includes(rfq.status?.value || rfq.status)"
                                type="button"
                                @click="emit('cancel', rfq)"
                                class="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                                title="Batalkan Tender RFQ"
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
