<script setup>
import SearchInput from '../../../ui/SearchInput.vue'
import TableDocumentCell from '../../../ui/TableDocumentCell.vue'
import BaseTable from '../../../ui/BaseTable.vue'
import Pagination from '../../../ui/Pagination.vue'
import StatusBadge from '../../../ui/StatusBadge.vue'
import {
    Scale,
    Plus,
    RefreshCw,
    Calendar,
    Play,
    Ban,
    Building2,
    Layers,
    Users,
} from '@lucide/vue'

defineProps({
    rfqs: { type: Array, required: true },
    isLoading: { type: Boolean, default: false },
    searchQuery: { type: String, default: '' },
    selectedStatus: { type: String, default: '' },
    pagination: { type: Object, required: true },
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
        <!-- Filter Bar & Table Section -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <!-- Filter Toolbar -->
            <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div class="flex items-center gap-2.5 flex-1 max-w-md w-full">
                    <SearchInput :model-value="searchQuery" compact clearable label="Cari tender RFQ" placeholder="Cari nomor atau judul tender…" @update:model-value="emit('update:searchQuery', $event)" />

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

                <select :value="selectedStatus" aria-label="Filter status tender" class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 w-full lg:w-auto" @change="emit('status-filter', $event.target.value)">
                    <option v-for="tab in statusTabs" :key="tab.id" :value="tab.id">{{ tab.label }}</option>
                </select>
            </div>

            <!-- RFQ Table -->
            <BaseTable :columns="tableColumns" min-width="1100px" label="Daftar tender RFQ" :busy="isLoading">
                <tr v-if="isLoading">
                    <td colspan="6" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat daftar Request for Quotation (RFQ)...
                        </div>
                    </td>
                </tr>

                <tr v-else-if="rfqs.length === 0">
                    <td colspan="6" class="px-6 py-14 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2.5">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                <Scale class="w-6 h-6 text-slate-400" />
                            </div>
                            <div class="text-sm font-semibold text-slate-700">
                                {{ (searchQuery || selectedStatus) ? 'Tidak ada tender RFQ yang cocok dengan pencarian' : 'Belum Ada Dokumen Tender RFQ' }}
                            </div>
                            <p class="text-xs text-slate-400">
                                {{ (searchQuery || selectedStatus) ? 'Coba ubah kata kunci pencarian atau reset filter status Anda.' : 'Pilih Rencana Pengadaan di tab "Rencana Siap Ditenderkan" untuk membuat paket tender baru.' }}
                            </p>
                            <button
                                v-if="!searchQuery && !selectedStatus"
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
                    v-for="rfq in rfqs"
                    :key="rfq.id"
                    class="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-b-0"
                >
                    <td class="px-6 py-4.5">
                        <div class="max-w-[270px]"><TableDocumentCell :number="rfq.rfq_number" :description="rfq.title" :kind="`${rfq.items_count ?? rfq.items?.length ?? 0} item`" @open="emit('go-detail', rfq.id)" /></div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div class="text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5">
                            <Layers class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{{ rfq.procurement_plan?.pp_number || `PP #${rfq.procurement_plan_id || '-'}` }}</span>
                        </div>
                        <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                            <Building2 class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span class="truncate max-w-[200px]">{{ rfq.company?.name || rfq.procurement_plan?.purchase_requisition?.company?.name || '—' }}</span>
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div class="text-xs text-slate-800 font-semibold flex items-center gap-1.5">
                            <Calendar class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{{ formatDate(rfq.deadline_date) }}</span>
                        </div>
                        <div v-if="getDeadlineInfo(rfq)" class="mt-1">
                            <span
                                :class="[
                                    'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border',
                                    getDeadlineInfo(rfq).badgeClass
                                ]"
                            >
                                {{ getDeadlineInfo(rfq).text }}
                            </span>
                        </div>
                    </td>

                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <div class="inline-flex flex-col items-center justify-center">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                <Users class="w-3.5 h-3.5 text-slate-500" />
                                <span>{{ rfq.quotations_count ?? rfq.quotations?.length ?? 0 }} / {{ rfq.suppliers_count ?? rfq.rfq_suppliers?.length ?? 0 }} supplier</span>
                            </span>
                            <span class="text-[10px] text-slate-500 font-medium mt-1">
                                Penawaran masuk / diundang
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
                                @click="emit('go-comparison', rfq.id)"
                                :class="[
                                    'inline-flex items-center gap-1.5 p-2 rounded-lg transition-colors border cursor-pointer',
                                    (rfq.quotations_count > 0 || ['published', 'evaluation', 'completed'].includes(rfq.status?.value || rfq.status))
                                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                        : 'text-slate-400 bg-slate-50 border-slate-200 hover:text-slate-600'
                                ]"
                                title="Buka Matriks Komparasi Penawaran" :aria-label="`Buka Matriks Komparasi Penawaran ${rfq.rfq_number}`"
                            >
                                <Scale class="w-4 h-4" /><span class="text-xs font-medium">Bandingkan</span>
                            </button>

                            <button
                                v-if="(rfq.status?.value || rfq.status) === 'draft'"
                                type="button"
                                @click="emit('publish', rfq)"
                                class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                                title="Publikasikan Tender Sekarang" :aria-label="`Publikasikan Tender Sekarang ${rfq.rfq_number}`"
                            >
                                <Play class="w-4 h-4" />
                            </button>

                            <button
                                v-if="['draft', 'published', 'evaluation'].includes(rfq.status?.value || rfq.status)"
                                type="button"
                                @click="emit('cancel', rfq)"
                                class="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                                title="Batalkan Tender RFQ" :aria-label="`Batalkan Tender RFQ ${rfq.rfq_number}`"
                            >
                                <Ban class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            </BaseTable>

            <!-- Pagination -->
            <div v-if="!isLoading">
                <Pagination
                    :pagination="pagination"
                    @page-change="emit('page-change', $event)"
                />
            </div>
        </div>
    </div>
</template>
