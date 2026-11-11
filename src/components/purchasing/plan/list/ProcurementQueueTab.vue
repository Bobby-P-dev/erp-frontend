<script setup>
import BaseTable from '../../../ui/BaseTable.vue'
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
    Building2,
    ArrowUpRight,
    ClipboardList,
    ChevronDown,
    ChevronUp,
    Package
} from '@lucide/vue'

defineProps({
    groupedPurchaseRequisitions: { type: Array, required: true },
    isLoadingQueue: { type: Boolean, default: false },
    queueSearch: { type: String, default: '' },
    expandedPrs: { type: Object, required: true },
    queueTableColumns: { type: Array, required: true },
    selectedItemList: { type: Array, required: true },
    selectedCompany: { type: Object, default: null },
    selectedPrCount: { type: Number, default: 0 },
    isItemChecked: { type: Function, required: true },
    isPrFullyChecked: { type: Function, required: true },
    isPrPartiallyChecked: { type: Function, required: true },
    formatDate: { type: Function, required: true }
})

const emit = defineEmits([
    'update:queueSearch',
    'fetch-queue',
    'switch-tab',
    'toggle-select-pr',
    'toggle-select-item',
    'toggle-expand-pr',
    'create-plan-for-pr',
    'clear-selection',
    'create-consolidated-plan',
    'fast-track-bulk-rfq',
    'fast-track-bulk-dp'
])
</script>

<template>
    <div class="space-y-6">
        <!-- Context Banner -->
        <div class="bg-gradient-to-r from-blue-50/70 via-slate-50/40 to-white border border-blue-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-start gap-4">
                <div class="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-200 mt-0.5">
                    <ClipboardList class="w-5 h-5" />
                </div>
                <div>
                    <h3 class="text-sm font-bold text-slate-900">Daftar Purchase Requisition Disetujui (Approved)</h3>
                    <p class="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-2xl">
                        Berikut adalah daftar dokumen PR yang telah disetujui dan menunggu penentuan strategi pengadaan. Klik tombol <strong>"Buat Rencana"</strong> pada baris PR yang ingin Anda proses.
                    </p>
                </div>
            </div>

            <div class="shrink-0 flex items-center gap-2 self-start md:self-auto">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-blue-700 border border-blue-200 shadow-2xs">
                    <CheckCircle2 class="w-3.5 h-3.5 text-blue-600" />
                    <span>{{ groupedPurchaseRequisitions.length }} Dokumen PR Menunggu</span>
                </span>
            </div>
        </div>

        <!-- Toolbar & Search -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100">
                <div class="relative flex-1 max-w-md w-full">
                    <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        :value="queueSearch"
                        @input="emit('update:queueSearch', $event.target.value)"
                        type="text"
                        placeholder="Cari nomor PR, divisi, pemohon, atau entitas..."
                        class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                </div>

                <div class="flex items-center gap-2.5 self-end sm:self-auto">
                    <button 
                        type="button"
                        @click="emit('fetch-queue')"
                        :disabled="isLoadingQueue"
                        class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="Segarkan Antrean PR"
                    >
                        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingQueue }" />
                    </button>
                </div>
            </div>

            <!-- Table of Pending PRs -->
            <BaseTable :columns="queueTableColumns">
                <!-- Loading State -->
                <tr v-if="isLoadingQueue">
                    <td colspan="8" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat daftar Purchase Requisition approved...
                        </div>
                    </td>
                </tr>

                <!-- Empty State -->
                <tr v-else-if="groupedPurchaseRequisitions.length === 0">
                    <td colspan="8" class="px-6 py-14 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2.5">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                <FileText class="w-6 h-6 text-slate-400" />
                            </div>
                            <div class="text-sm font-semibold text-slate-700">
                                {{ queueSearch ? 'Tidak ada PR antrean yang cocok dengan pencarian' : 'Semua PR Telah Dibuatkan Rencana' }}
                            </div>
                            <p class="text-xs text-slate-400">
                                {{ queueSearch ? 'Coba ubah kata kunci pencarian Anda.' : 'Seluruh Purchase Requisition (PR) approved sudah dialokasikan ke dalam rencana pengadaan.' }}
                            </p>
                            <button
                                v-if="!queueSearch"
                                type="button"
                                @click="emit('switch-tab', 'plans')"
                                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs shadow-blue-200 mt-1 cursor-pointer"
                            >
                                <Layers class="w-4 h-4" />
                                <span>Lihat Dokumen Rencana Pengadaan</span>
                            </button>
                        </div>
                    </td>
                </tr>

                <!-- Data Rows -->
                <template 
                    v-else 
                    v-for="(pr, index) in groupedPurchaseRequisitions" 
                    :key="pr.pr_id"
                >
                    <tr 
                        :class="[
                            (isPrFullyChecked(pr) || isPrPartiallyChecked(pr)) ? 'bg-blue-50/40' : 'hover:bg-slate-50/80',
                            'transition-colors group border-b border-slate-100 last:border-b-0'
                        ]"
                    >
                        <!-- Select Checkbox -->
                        <td class="px-4 py-4.5 whitespace-nowrap text-center">
                            <input 
                                type="checkbox"
                                :checked="isPrFullyChecked(pr)"
                                :indeterminate.prop="isPrPartiallyChecked(pr)"
                                @change="emit('toggle-select-pr', pr)"
                                class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                title="Pilih seluruh item pada PR ini untuk rencana konsolidasi"
                            />
                        </td>

                        <!-- No -->
                        <td class="px-4 py-4.5 whitespace-nowrap text-sm font-mono font-semibold text-slate-500 text-center">
                            {{ index + 1 }}
                        </td>

                        <!-- PR Number -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <button
                                type="button"
                                @click="emit('create-plan-for-pr', pr)"
                                class="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors group/btn text-left cursor-pointer"
                                title="Klik untuk membuat rencana pengadaan"
                            >
                                <span class="group-hover/btn:underline">{{ pr.pr_number }}</span>
                                <ArrowUpRight class="w-4 h-4 text-slate-400 group-hover/btn:text-blue-600 opacity-0 group-hover/btn:opacity-100 transition-all shrink-0" />
                            </button>
                        </td>

                        <!-- Dates: Tanggal & Target -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <div class="text-sm text-slate-800 font-semibold flex items-center gap-2">
                                <Calendar class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ formatDate(pr.request_date) }}</span>
                            </div>
                            <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                                <Clock class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>Target: {{ formatDate(pr.required_date) }}</span>
                            </div>
                        </td>

                        <!-- Company & Division -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <div class="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Building2 class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ pr.company?.name || 'Perusahaan #' + (pr.company_id || '-') }}</span>
                            </div>
                            <div class="text-xs font-medium text-slate-600 mt-1 flex items-center gap-2">
                                <Layers class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ pr.division?.name || 'Divisi Pemohon' }}</span>
                            </div>
                        </td>

                        <!-- Purpose & Items Summary -->
                        <td class="px-6 py-4.5">
                            <div class="text-sm font-medium text-slate-900 max-w-sm truncate" :title="pr.purpose">
                                {{ pr.purpose || '-' }}
                            </div>
                            <div class="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
                                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                    {{ pr.items ? pr.items.length : 0 }} Item
                                </span>
                                <span 
                                    v-if="pr.has_custom_item" 
                                    class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                >
                                    Non-Katalog
                                </span>
                                <button 
                                    type="button" 
                                    @click="emit('toggle-expand-pr', pr.pr_id)"
                                    class="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                    <span>{{ expandedPrs[pr.pr_id] ? 'Tutup Rincian' : 'Rincian Item' }}</span>
                                    <ChevronUp v-if="expandedPrs[pr.pr_id]" class="w-3 h-3" />
                                    <ChevronDown v-else class="w-3 h-3" />
                                </button>
                            </div>
                        </td>

                        <!-- Status & Kuota -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="inline-flex flex-col items-center justify-center">
                                <StatusBadge status="approved" size="md" class="min-w-[125px]" />
                                <span 
                                    class="text-xs font-semibold text-slate-600 mt-1 font-mono"
                                    title="Total sisa kuota yang belum dialokasikan"
                                >
                                    {{ pr.total_remaining_qty.toLocaleString('id-ID') }} Unit Terbuka
                                </span>
                            </div>
                        </td>

                        <!-- Actions -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    @click="emit('create-plan-for-pr', pr)"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                                    title="Pilih PR ini dan buat rencana pengadaan"
                                >
                                    <Plus class="w-3.5 h-3.5" />
                                    <span>Buat Rencana</span>
                                </button>
                            </div>
                        </td>
                    </tr>

                    <!-- Expanded Item Details -->
                    <tr v-if="expandedPrs[pr.pr_id]" class="bg-slate-50/60 border-b border-slate-200/60">
                        <td colspan="8" class="p-4 sm:p-5">
                            <div class="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <Package class="w-4 h-4 text-slate-500" />
                                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                            Daftar Item PR {{ pr.pr_number }}
                                        </span>
                                        <span class="text-xs text-slate-500 font-medium">({{ pr.items?.length || 0 }} item)</span>
                                    </div>
                                    <button
                                        type="button"
                                        @click="emit('toggle-select-pr', pr)"
                                        class="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                                    >
                                        {{ isPrFullyChecked(pr) ? 'Batalkan Semua Item' : 'Pilih Semua Item PR Ini' }}
                                    </button>
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-xs text-left">
                                        <thead>
                                            <tr class="border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                                                <th class="py-2.5 px-3 w-10 text-center">Pilih</th>
                                                <th class="py-2.5 px-3">Item / Deskripsi</th>
                                                <th class="py-2.5 px-3 text-center">Qty Diminta</th>
                                                <th class="py-2.5 px-3 text-center">Sisa Kuota</th>
                                                <th class="py-2.5 px-3 text-right">Est. Harga Satuan</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100">
                                            <tr 
                                                v-for="item in pr.items" 
                                                :key="item.purchase_requisition_item_id"
                                                :class="{ 'bg-blue-50/30': isItemChecked(item) }"
                                                class="hover:bg-slate-50 transition-colors"
                                            >
                                                <td class="py-2.5 px-3 text-center">
                                                    <input 
                                                        type="checkbox"
                                                        :checked="isItemChecked(item)"
                                                        @change="emit('toggle-select-item', item, pr)"
                                                        class="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                                    />
                                                </td>
                                                <td class="py-2.5 px-3">
                                                    <div class="font-semibold text-slate-900">
                                                        {{ item.item_name || item.item?.name || 'Item Non-Katalog' }}
                                                    </div>
                                                    <div v-if="item.item?.code" class="text-[11px] font-mono text-slate-500">
                                                        {{ item.item.code }}
                                                    </div>
                                                </td>
                                                <td class="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                                                    {{ Number(item.requested_quantity || 0).toLocaleString('id-ID') }} {{ item.unit?.symbol || item.unit?.code || item.unit_name || 'Unit' }}
                                                </td>
                                                <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                                                    {{ Number(item.remaining_quantity || 0).toLocaleString('id-ID') }} {{ item.unit?.symbol || item.unit?.code || item.unit_name || 'Unit' }}
                                                </td>
                                                <td class="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                                                    {{ item.estimated_unit_price ? 'Rp ' + Number(item.estimated_unit_price).toLocaleString('id-ID') : '-' }}
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

            <!-- Floating Bulk Selection Bar -->
            <div 
                v-if="selectedItemList.length > 0"
                class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[92%] bg-slate-900 text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
            >
                <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shadow-blue-500">
                            {{ selectedItemList.length }}
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{{ selectedItemList.length }} Item Terpilih</span>
                                <span class="text-slate-400 font-normal">({{ selectedPrCount }} Dokumen PR)</span>
                            </span>
                            <span v-if="selectedCompany" class="text-[11px] text-slate-300 flex items-center gap-1">
                                <Building2 class="w-3.5 h-3.5 text-blue-400" />
                                <span>{{ selectedCompany.name }}</span>
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

                <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                    <button
                        type="button"
                        @click="emit('create-consolidated-plan')"
                        class="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all cursor-pointer flex items-center gap-1.5"
                        title="Kelompokkan item dari beberapa PR ke dalam 1 Rencana Pengadaan Konsolidasi"
                    >
                        <Layers class="w-3.5 h-3.5 text-blue-400" />
                        <span>Buat Rencana Konsolidasi</span>
                    </button>

                    <button
                        type="button"
                        @click="emit('fast-track-bulk-rfq')"
                        class="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-900/40 transition-all cursor-pointer flex items-center gap-1.5"
                        title="Gabungkan seluruh item terpilih menjadi Rencana Konsolidasi RFQ & lanjut buat paket Tender Multi-Vendor"
                    >
                        <Scale class="w-3.5 h-3.5" />
                        <span>Tender RFQ Sekaligus (Bulk RFQ)</span>
                    </button>

                    <button
                        type="button"
                        @click="emit('fast-track-bulk-dp')"
                        class="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-900/40 transition-all cursor-pointer flex items-center gap-1.5"
                        title="Beli seluruh item terpilih dalam 1 kali Direct Purchase & 1 kali pembayaran Finance"
                    >
                        <ShoppingCart class="w-3.5 h-3.5" />
                        <span>Beli Langsung Sekaligus (Bulk DP)</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
