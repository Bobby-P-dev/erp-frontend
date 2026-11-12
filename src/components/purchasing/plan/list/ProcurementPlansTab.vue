<script setup>
import SearchInput from '../../../ui/SearchInput.vue'
import TableDocumentCell from '../../../ui/TableDocumentCell.vue'
import BaseTable from '../../../ui/BaseTable.vue'
import Pagination from '../../../ui/Pagination.vue'
import StatusBadge from '../../../ui/StatusBadge.vue'
import { Layers, Plus, RefreshCw, FileText, Eye, Play, Ban } from '@lucide/vue'


defineProps({
    plans: { type: Array, required: true },
    isLoadingPlans: { type: Boolean, default: false },
    searchQuery: { type: String, default: '' },
    selectedStatus: { type: String, default: '' },
    selectedMethod: { type: String, default: '' },
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
    'open-detail',
    'activate',
    'cancel'
])
</script>

<template>
    <div class="space-y-6">
        <!-- Table & Filter Card -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <!-- Filter Toolbar -->
            <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                    <div class="flex-1 min-w-0"><SearchInput :model-value="searchQuery" @update:model-value="emit('update:searchQuery', $event)" label="Cari rencana pengadaan" placeholder="Cari nomor rencana atau PR…" compact clearable /></div>

                    <select 
                        :value="selectedMethod" aria-label="Metode pengadaan"
                        @change="emit('update:selectedMethod', $event.target.value)"
                        class="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs transition-colors shrink-0"
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
                        aria-label="Segarkan daftar rencana" title="Segarkan data"
                    >
                        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingPlans }" />
                    </button>
                </div>

            </div>
            <div class="px-5 py-4 flex flex-wrap gap-2" aria-label="Filter status rencana">
                <button v-for="tab in statusTabs" :key="tab.id" type="button" @click="emit('status-tab', tab.id)" :aria-pressed="selectedStatus === tab.id" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" :class="selectedStatus === tab.id ? 'bg-blue-50 text-[#014BAA]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'">{{ tab.label }}</button>
                <span class="ml-auto self-center text-xs text-slate-400">{{ isLoadingPlans ? 'Memuat…' : `${pagination.total} hasil` }}</span>
            </div>
            <p class="px-5 pb-3 text-xs text-slate-400 lg:hidden">Geser tabel untuk melihat seluruh kolom.</p>

            <!-- Table -->
            <BaseTable :columns="tableColumns" min-width="1080px" layout="fixed" label="Daftar rencana pengadaan" :busy="isLoadingPlans">
                <tr v-if="isLoadingPlans">
                    <td :colspan="tableColumns.length" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat rencana pengadaan...
                        </div>
                    </td>
                </tr>

                <tr v-else-if="plans.length === 0">
                    <td :colspan="tableColumns.length" class="px-6 py-14 text-center text-slate-500">
                        <div class="flex flex-col items-center justify-center max-w-md mx-auto space-y-2.5">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                <Layers class="w-6 h-6 text-slate-400" />
                            </div>
                            <h4 class="text-sm font-medium text-slate-900 mb-1">{{ searchQuery || selectedStatus || selectedMethod ? 'Tidak ada rencana yang cocok' : 'Belum ada rencana pengadaan' }}</h4>
                            <p class="text-xs text-slate-500 leading-relaxed mb-4">
                                Pilih PR yang telah disetujui di tab "PR siap direncanakan" untuk membuat rencana pengadaan.
                            </p>
                            <button
                                type="button"
                                @click="emit('switch-tab', 'pending')"
                                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer"
                            >
                                <Plus class="w-3.5 h-3.5" />
                                <span>Pilih PR untuk Dibuat Rencana</span>
                            </button>
                        </div>
                    </td>
                </tr>

                <tr 
                    v-else 
                    v-for="plan in plans"
                    :key="plan.id"
                    class="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-b-0"
                >
                    <td>
                        <TableDocumentCell :number="plan.pp_number || 'PP #' + plan.id" :kind="formatDate(plan.created_at)" @open="emit('open-detail', plan)" />
                    </td>

                    <td>
                        <div v-if="isMultiPrPlan(plan)">
                            <button
                                type="button"
                                @click.stop="emit('open-pr-modal', plan)"
                                class="inline-flex items-center gap-1.5 py-0.5 rounded-md text-xs font-medium text-[#014BAA] hover:bg-blue-50 transition-colors cursor-pointer group/modal"
                                title="Klik untuk melihat rincian dokumen PR asal"
                            >
                                <Layers class="w-3.5 h-3.5 text-indigo-500 group-hover/modal:scale-110 transition-transform" />
                                <span>{{ getMultiPrCount(plan) }} PR Terkonsolidasi</span>
                            </button>
                            <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5 truncate max-w-full" :title="getMultiPrSubtitle(plan)">
                                <FileText class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span class="truncate">{{ getMultiPrSubtitle(plan) }}</span>
                            </div>
                        </div>

                        <div v-else>
                            <div class="text-sm text-slate-700 break-words">
                                <span>{{ getSinglePrNumber(plan) }}</span>
                            </div>
                            <div class="text-xs text-slate-500 font-medium mt-1 truncate max-w-full" :title="getSinglePrSubtitle(plan)">
                                <span>{{ getSinglePrSubtitle(plan) }}</span>
                            </div>
                        </div>
                    </td>

                    <td>
                        <p class="text-sm text-slate-700">{{ plan.procurement_method === 'direct_purchase' ? 'Pembelian langsung' : plan.procurement_method === 'rfq' ? 'Tender RFQ' : '—' }}</p>
                        <p class="mt-1 text-xs text-slate-400">{{ plan.items_count ?? plan.items?.length ?? 0 }} item dialokasikan</p>
                    </td>
                    <td><StatusBadge :status="plan.status" size="sm" :dot="false" /></td>

                    <td>
                        <div class="text-sm text-slate-700 break-words">
                            {{ plan.created_by_user?.name || plan.created_by_user?.employee?.name || '—' }}
                        </div>
                        <div class="text-xs text-slate-500 mt-1 break-words">
                            {{ plan.created_by_user?.employee?.division?.name || '—' }}
                        </div>
                    </td>

                    <td class="  text-center">
                        <div class="flex items-center justify-end gap-1.5">
                            <button type="button"
                                @click="emit('open-detail', plan)"
                                class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                :aria-label="`Lihat rencana ${plan.pp_number || plan.id}`" title="Lihat rincian rencana"
                            >
                                <Eye class="w-4 h-4" />
                            </button>

                            <button 
                                v-if="plan.status === 'draft'"
                                @click="emit('activate', plan)"
                                class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                                :aria-label="`Aktifkan rencana ${plan.pp_number || plan.id}`" title="Aktifkan rencana"
                            >
                                <Play class="w-4 h-4" />
                            </button>

                            <button 
                                v-if="['draft', 'active'].includes(plan.status)"
                                @click="emit('cancel', plan)"
                                class="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                                :aria-label="`Batalkan rencana ${plan.pp_number || plan.id}`" title="Batalkan rencana"
                            >
                                <Ban class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            </BaseTable>

            <!-- Pagination -->
            <Pagination
                :pagination="pagination"
                @page-change="emit('page-change', $event)"
            />
        </div>
    </div>
</template>
