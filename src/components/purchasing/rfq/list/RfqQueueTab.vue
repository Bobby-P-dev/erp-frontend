<script setup>
import { RouterLink } from 'vue-router'
import BaseTable from '../../../ui/BaseTable.vue'
import StatusBadge from '../../../ui/StatusBadge.vue'
import {
    Scale,
    Plus,
    RefreshCw,
    Search,
    Calendar,
    FileText,
    CheckCircle2,
    Building2,
    Layers,
    ArrowUpRight,
    ChevronDown,
    ChevronUp,
    Package
} from '@lucide/vue'

defineProps({
    filteredQueuePlans: { type: Array, required: true },
    readyQueueCount: { type: Number, default: 0 },
    isLoadingQueue: { type: Boolean, default: false },
    queueSearch: { type: String, default: '' },
    onlyWithQuota: { type: Boolean, default: true },
    expandedPlans: { type: Object, required: true },
    queueColumns: { type: Array, required: true },
    selectedPlansList: { type: Array, required: true },
    selectedQueueCompany: { type: Object, default: null },
    hasRemainingQuota: { type: Function, required: true },
    getRemainingQuotaCount: { type: Function, required: true },
    isPlanSelected: { type: Function, required: true },
    formatDate: { type: Function, required: true }
})

const emit = defineEmits([
    'update:queueSearch',
    'update:onlyWithQuota',
    'fetch-queue',
    'switch-tab',
    'toggle-select-plan',
    'toggle-expand-plan',
    'execute-single',
    'execute-combined',
    'clear-selection'
])
</script>

<template>
    <div class="space-y-6">
        <!-- Context Banner (Matches ProcurementPlanListView & DirectPurchaseListView) -->
        <div class="bg-gradient-to-r from-blue-50/70 via-slate-50/40 to-white border border-blue-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-start gap-4">
                <div class="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-200 mt-0.5">
                    <Scale class="w-5 h-5" />
                </div>
                <div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-sm font-bold text-slate-900">Daftar Rencana Pengadaan Siap Ditenderkan (Tender RFQ)</h3>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                            Siap Eksekusi
                        </span>
                    </div>
                    <p class="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-2xl">
                        Berikut adalah daftar dokumen Rencana Pengadaan (PP) bertipe <strong>Tender RFQ</strong> berstatus <strong>Aktif</strong> yang menunggu pembuatan paket penawaran vendor. Klik tombol <strong>"Buat Paket RFQ"</strong> pada baris rencana yang ingin Anda proses.
                    </p>
                </div>
            </div>

            <div class="shrink-0 flex items-center gap-2 self-start md:self-auto">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-blue-700 border border-blue-200 shadow-2xs">
                    <CheckCircle2 class="w-3.5 h-3.5 text-blue-600" />
                    <span>{{ readyQueueCount }} Rencana Siap Tender</span>
                </span>
            </div>
        </div>

        <!-- Toolbar & Table -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100">
                <div class="relative flex-1 max-w-md w-full">
                    <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        :value="queueSearch"
                        @input="emit('update:queueSearch', $event.target.value)"
                        type="text"
                        placeholder="Cari nomor PP, nomor PR, divisi, perusahaan, atau nama item..."
                        class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                </div>

                <div class="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                    <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            :checked="onlyWithQuota"
                            @change="emit('update:onlyWithQuota', $event.target.checked)"
                            class="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 h-4 w-4 cursor-pointer"
                        />
                        <span>Hanya Kuota Tersedia</span>
                    </label>

                    <button
                        type="button"
                        @click="emit('fetch-queue')"
                        :disabled="isLoadingQueue"
                        class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="Segarkan Antrean Rencana"
                    >
                        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingQueue }" />
                    </button>
                </div>
            </div>

            <!-- Table of Ready RFQ Plans -->
            <BaseTable :columns="queueColumns">
                <!-- Loading State -->
                <tr v-if="isLoadingQueue">
                    <td colspan="8" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat daftar rencana pengadaan siap ditenderkan...
                        </div>
                    </td>
                </tr>

                <!-- Empty State -->
                <tr v-else-if="filteredQueuePlans.length === 0">
                    <td colspan="8" class="px-6 py-14 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2.5">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                <Scale class="w-6 h-6 text-slate-400" />
                            </div>
                            <div class="text-sm font-semibold text-slate-700">
                                {{ queueSearch ? 'Tidak ada rencana yang cocok dengan pencarian' : 'Semua Rencana RFQ Telah Dibuatkan Tender' }}
                            </div>
                            <p class="text-xs text-slate-500 text-center leading-relaxed">
                                {{ queueSearch ? 'Coba ubah kata kunci pencarian Anda.' : 'Seluruh rencana pengadaan bertipe Tender RFQ sudah dieksekusi atau belum ada rencana baru yang diaktifkan.' }}
                            </p>
                            <div class="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    @click="emit('switch-tab', 'rfqs')"
                                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                                >
                                    <Scale class="w-3.5 h-3.5" />
                                    <span>Lihat Dokumen Tender RFQ</span>
                                </button>
                                <RouterLink
                                    :to="{ name: 'user.purchasing.plans' }"
                                    class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    <Layers class="w-3.5 h-3.5" />
                                    <span>Ke Rencana Pengadaan</span>
                                </RouterLink>
                            </div>
                        </div>
                    </td>
                </tr>

                <!-- Data Rows -->
                <template
                    v-else
                    v-for="(plan, index) in filteredQueuePlans"
                    :key="plan.id"
                >
                    <tr
                        :class="[
                            isPlanSelected(plan.id) ? 'bg-blue-50/40' : 'hover:bg-slate-50/80',
                            'transition-colors group border-b border-slate-100 last:border-b-0'
                        ]"
                    >
                        <!-- Select Checkbox for Multi-Plan RFQ Consolidation -->
                        <td class="px-4 py-4.5 whitespace-nowrap text-center">
                            <input
                                type="checkbox"
                                :checked="isPlanSelected(plan.id)"
                                :disabled="!hasRemainingQuota(plan)"
                                @change="emit('toggle-select-plan', plan)"
                                class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer disabled:opacity-40"
                                title="Centang untuk menggabungkan beberapa Rencana Pengadaan ke dalam 1 paket Tender RFQ"
                            />
                        </td>

                        <!-- No -->
                        <td class="px-4 py-4.5 whitespace-nowrap text-sm font-mono font-semibold text-slate-500 text-center">
                            {{ index + 1 }}
                        </td>

                        <!-- No. Rencana & Tanggal -->
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

                        <!-- Dokumen PR Asal -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <div v-if="plan.is_consolidated || (plan.source_prs_count && plan.source_prs_count > 1) || (plan.pr_numbers && plan.pr_numbers.length > 1)">
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                    <Layers class="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{{ plan.source_prs_count || plan.pr_numbers?.length || 2 }} PR Terkonsolidasi</span>
                                </span>
                                <div class="text-xs text-slate-500 font-medium mt-1 truncate max-w-[200px]">
                                    {{ plan.pr_numbers?.join(', ') || 'Multi-PR' }}
                                </div>
                            </div>
                            <div v-else>
                                <div class="text-sm font-mono font-bold text-slate-900 flex items-center gap-2">
                                    <FileText class="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>{{ plan.purchase_requisition?.pr_number || plan.pr_numbers?.[0] || '-' }}</span>
                                </div>
                                <div class="text-xs text-slate-500 font-medium mt-1 truncate max-w-[200px]" :title="plan.purchase_requisition?.requester?.name">
                                    <span>Pemohon: {{ plan.purchase_requisition?.requester?.name || '-' }}</span>
                                </div>
                            </div>
                        </td>

                        <!-- Perusahaan & Divisi -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <div class="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Building2 class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ plan.company?.name || plan.purchase_requisition?.company?.name || 'Perusahaan' }}</span>
                            </div>
                            <div class="text-xs font-medium text-slate-600 mt-1 flex items-center gap-2">
                                <Layers class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ plan.purchase_requisition?.division?.name || 'Divisi Pemohon' }}</span>
                            </div>
                        </td>

                        <!-- Keperluan & Rincian Item -->
                        <td class="px-6 py-4.5">
                            <div class="text-sm font-medium text-slate-900 max-w-xs truncate" :title="plan.purchase_requisition?.purpose || plan.notes">
                                {{ plan.purchase_requisition?.purpose || plan.notes || 'Pengadaan Barang via Tender RFQ' }}
                            </div>
                            <div class="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
                                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                    {{ plan.items ? plan.items.length : 0 }} Item
                                </span>
                                <button
                                    v-if="plan.items && plan.items.length > 0"
                                    type="button"
                                    @click="emit('toggle-expand-plan', plan.id)"
                                    class="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <span>{{ expandedPlans[plan.id] ? 'Tutup Rincian' : 'Rincian Item' }}</span>
                                    <ChevronUp v-if="expandedPlans[plan.id]" class="w-3 h-3" />
                                    <ChevronDown v-else class="w-3 h-3" />
                                </button>
                            </div>
                        </td>

                        <!-- Status & Sisa Kuota -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="inline-flex flex-col items-center justify-center">
                                <StatusBadge :status="plan.status" size="md" class="min-w-[115px]" />
                                <span
                                    class="text-xs font-bold mt-1 font-mono"
                                    :class="hasRemainingQuota(plan) ? 'text-emerald-700' : 'text-slate-400'"
                                >
                                    {{ hasRemainingQuota(plan) ? `${getRemainingQuotaCount(plan)} Item Siap Tender` : 'Kuota Habis' }}
                                </span>
                            </div>
                        </td>

                        <!-- Aksi -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button
                                    v-if="hasRemainingQuota(plan)"
                                    type="button"
                                    @click="emit('execute-single', plan)"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                                    title="Buat paket Tender RFQ untuk rencana ini"
                                >
                                    <Plus class="w-3.5 h-3.5" />
                                    <span>Buat Paket RFQ</span>
                                </button>
                                <span
                                    v-else
                                    class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-400 border border-slate-200"
                                >
                                    Selesai Ditender
                                </span>
                            </div>
                        </td>
                    </tr>

                    <!-- Expanded Item Details -->
                    <tr v-if="expandedPlans[plan.id]" class="bg-slate-50/60 border-b border-slate-200/60">
                        <td colspan="8" class="p-4 sm:p-5">
                            <div class="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <Package class="w-4 h-4 text-slate-500" />
                                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                            Daftar Item Rencana {{ plan.pp_number }}
                                        </span>
                                        <span class="text-xs text-slate-500 font-medium">({{ plan.items?.length || 0 }} item)</span>
                                    </div>
                                    <button
                                        v-if="hasRemainingQuota(plan)"
                                        type="button"
                                        @click="emit('execute-single', plan)"
                                        class="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1"
                                    >
                                        <Plus class="w-3.5 h-3.5" />
                                        <span>Proses Rencana Ini ke RFQ</span>
                                    </button>
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-xs text-left">
                                        <thead>
                                            <tr class="border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                                                <th class="py-2.5 px-3">Item / Deskripsi</th>
                                                <th class="py-2.5 px-3 text-center">Kuantitas Rencana</th>
                                                <th class="py-2.5 px-3 text-center">Sisa Kuota Tender</th>
                                                <th class="py-2.5 px-3 text-right">Est. Harga Satuan (HPS)</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100">
                                            <tr
                                                v-for="item in plan.items"
                                                :key="item.id"
                                                class="hover:bg-slate-50 transition-colors"
                                            >
                                                <td class="py-2.5 px-3">
                                                    <div class="font-semibold text-slate-900">
                                                        {{ item.item_name || item.item?.name || item.purchase_requisition_item?.item_name || 'Item Pengadaan' }}
                                                    </div>
                                                    <div v-if="item.item?.code || item.purchase_requisition_item?.item?.code" class="text-[11px] font-mono text-slate-500">
                                                        {{ item.item?.code || item.purchase_requisition_item?.item?.code }}
                                                    </div>
                                                </td>
                                                <td class="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                                                    {{ Number(item.planned_quantity || 0).toLocaleString('id-ID') }} {{ item.unit?.code || item.unit_name || 'Unit' }}
                                                </td>
                                                <td class="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                                                    {{ Number(item.remaining_quantity ?? item.remaining_rfq_quantity ?? item.planned_quantity ?? 0).toLocaleString('id-ID') }} {{ item.unit?.code || item.unit_name || 'Unit' }}
                                                </td>
                                                <td class="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                                                    {{ (item.estimated_unit_price || item.purchase_requisition_item?.estimated_price) ? 'Rp ' + Number(item.estimated_unit_price || item.purchase_requisition_item?.estimated_price).toLocaleString('id-ID') : '-' }}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </td>
                    </tr>
                </template>
            </BaseTable>

            <!-- Floating Multi-Plan Selection Bar -->
            <div
                v-if="selectedPlansList.length > 0"
                class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[92%] bg-slate-900 text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 transition-all duration-300"
            >
                <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shadow-blue-500">
                            {{ selectedPlansList.length }}
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{{ selectedPlansList.length }} Rencana Pengadaan Terpilih</span>
                            </span>
                            <span v-if="selectedQueueCompany" class="text-[11px] text-slate-300 flex items-center gap-1">
                                <Building2 class="w-3.5 h-3.5 text-blue-400" />
                                <span>{{ selectedQueueCompany.name }}</span>
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        @click="emit('clear-selection')"
                        class="text-xs text-slate-400 hover:text-white underline cursor-pointer ml-2"
                    >
                        Batal
                    </button>
                </div>

                <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                        type="button"
                        @click="emit('execute-combined')"
                        class="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-900/40 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <Scale class="w-3.5 h-3.5" />
                        <span>{{ selectedPlansList.length > 1 ? 'Gabung & Buat 1 Paket Tender RFQ' : 'Buat Paket Tender RFQ' }}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
