<script setup>
import BaseTable from '../../../ui/BaseTable.vue'
import SearchInput from '../../../ui/SearchInput.vue'
import TableDocumentCell from '../../../ui/TableDocumentCell.vue'
import { Layers, Plus, RefreshCw, FileText, ChevronDown, ChevronUp } from '@lucide/vue'

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
const itemColumns = [
    { key: 'select', label: 'Pilih', width: '64px', align: 'center' },
    { key: 'item', label: 'Barang / jasa' },
    { key: 'requested', label: 'Diminta', align: 'right' },
    { key: 'remaining', label: 'Belum dialokasikan', align: 'right' },
    { key: 'price', label: 'Estimasi satuan', align: 'right' },
]
</script>

<template>
    <div class="space-y-6">
        <p class="text-sm text-slate-500 leading-relaxed">Pilih PR atau beberapa item untuk menyusun rencana. Rincian menampilkan sisa kebutuhan per satuan barang.</p>

        <!-- Toolbar & Search -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100">
                <div class="flex-1 max-w-md w-full"><SearchInput :model-value="queueSearch" @update:model-value="emit('update:queueSearch', $event)" label="Cari PR siap direncanakan" placeholder="Cari nomor PR, pemohon, atau barang…" compact clearable /></div>

                <div class="flex items-center gap-3 self-end sm:self-auto">
                    <span class="text-xs text-slate-400">{{ isLoadingQueue ? 'Memuat…' : `${groupedPurchaseRequisitions.length} PR ditampilkan` }}</span>
                    <button 
                        type="button"
                        @click="emit('fetch-queue')"
                        :disabled="isLoadingQueue"
                        class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        aria-label="Segarkan antrean PR" title="Segarkan antrean PR"
                    >
                        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingQueue }" />
                    </button>
                </div>
            </div>

            <!-- Table of Pending PRs -->
            <p class="px-5 pb-3 pt-3 text-xs text-slate-400 lg:hidden">Geser tabel untuk melihat seluruh kolom.</p>
            <BaseTable :columns="queueTableColumns" min-width="1100px" layout="fixed" label="PR siap direncanakan" :busy="isLoadingQueue">
                <!-- Loading State -->
                <tr v-if="isLoadingQueue">
                    <td :colspan="queueTableColumns.length" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat daftar Purchase Requisition approved...
                        </div>
                    </td>
                </tr>

                <!-- Empty State -->
                <tr v-else-if="groupedPurchaseRequisitions.length === 0">
                    <td :colspan="queueTableColumns.length" class="px-6 py-14 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2.5">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                <FileText class="w-6 h-6 text-slate-400" />
                            </div>
                            <div class="text-sm font-medium text-slate-700">
                                {{ queueSearch ? 'Tidak ada PR antrean yang cocok dengan pencarian' : 'Semua PR Telah Dibuatkan Rencana' }}
                            </div>
                            <p class="text-xs text-slate-400">
                                {{ queueSearch ? 'Coba ubah kata kunci pencarian Anda.' : 'Seluruh Purchase Requisition (PR) approved sudah dialokasikan ke dalam rencana pengadaan.' }}
                            </p>
                            <button
                                v-if="!queueSearch"
                                type="button"
                                @click="emit('switch-tab', 'plans')"
                                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs shadow-blue-200 mt-1 cursor-pointer"
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
                    v-for="pr in groupedPurchaseRequisitions"
                    :key="pr.pr_id"
                >
                    <tr 
                        :class="[
                            (isPrFullyChecked(pr) || isPrPartiallyChecked(pr)) ? 'bg-blue-50/40' : 'hover:bg-slate-50/80',
                            'transition-colors group border-b border-slate-100 last:border-b-0'
                        ]"
                    >
                        <!-- Select Checkbox -->
                        <td class=" whitespace-nowrap text-center">
                            <input 
                                type="checkbox"
                                :checked="isPrFullyChecked(pr)"
                                :indeterminate.prop="isPrPartiallyChecked(pr)"
                                @change="emit('toggle-select-pr', pr)"
                                class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                :aria-label="`Pilih seluruh item ${pr.pr_number}`" title="Pilih seluruh item PR"
                            />
                        </td>

                        <td>
                            <TableDocumentCell :number="pr.pr_number" :description="pr.purpose || '—'" :kind="`Diajukan ${formatDate(pr.request_date)}`" @open="emit('create-plan-for-pr', pr)" />
                        </td>
                        <td>
                            <p class="text-sm text-slate-700 break-words">{{ pr.company?.name || '—' }}</p>
                            <p class="mt-1 text-xs text-slate-500 break-words">{{ pr.division?.name || '—' }}</p>
                            <p v-if="pr.requester?.name" class="mt-1 text-xs text-slate-400 break-words">{{ pr.requester.name }}</p>
                        </td>
                        <td class="text-sm text-slate-700">{{ formatDate(pr.required_date) }}</td>
                        <td>
                            <p class="text-sm text-slate-700">{{ pr.items?.length || 0 }} item</p>
                            <p v-if="pr.has_custom_item" class="mt-1 text-xs text-amber-700">Termasuk non-katalog</p>
                            <button type="button" @click="emit('toggle-expand-pr', pr.pr_id)" :aria-expanded="Boolean(expandedPrs[pr.pr_id])" :aria-controls="`queue-items-${pr.pr_id}`" :aria-label="`Rincian item ${pr.pr_number}`" class="mt-2 inline-flex items-center gap-1 text-xs text-[#014BAA] hover:underline">
                                {{ expandedPrs[pr.pr_id] ? 'Tutup rincian' : 'Rincian item' }}
                                <ChevronUp v-if="expandedPrs[pr.pr_id]" class="size-3" /><ChevronDown v-else class="size-3" />
                            </button>
                        </td>

                        <!-- Actions -->
                        <td class=" whitespace-nowrap text-center">
                            <div class="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    @click="emit('create-plan-for-pr', pr)"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-[#014BAA] border border-slate-200 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                                    title="Pilih PR ini dan buat rencana pengadaan"
                                >
                                    <Plus class="w-3.5 h-3.5" />
                                    <span>Buat rencana</span>
                                </button>
                            </div>
                        </td>
                    </tr>

                    <!-- Expanded Item Details -->
                    <tr v-if="expandedPrs[pr.pr_id]" :id="`queue-items-${pr.pr_id}`" class="bg-slate-50/60 border-b border-slate-200/60">
                        <td :colspan="queueTableColumns.length" class="p-4 sm:p-5">
                            <div class="space-y-3">
                                <div class="flex flex-wrap items-center justify-between gap-3">
                                    <p class="text-sm font-medium text-slate-700">Barang / jasa · {{ pr.pr_number }}</p>
                                    <button type="button" @click="emit('toggle-select-pr', pr)" class="text-xs text-[#014BAA] hover:underline">{{ isPrFullyChecked(pr) ? 'Batalkan pilihan PR' : 'Pilih seluruh item PR' }}</button>
                                </div>
                                <BaseTable :columns="itemColumns" min-width="800px" label="Rincian sisa kebutuhan PR">
                                    <tr v-for="item in pr.items" :key="item.purchase_requisition_item_id" :class="{ 'bg-blue-50/30': isItemChecked(item) }">
                                        <td class="text-center"><input type="checkbox" :checked="isItemChecked(item)" @change="emit('toggle-select-item', item, pr)" :aria-label="`Pilih ${item.item_name || item.item?.name || 'item'} dari ${pr.pr_number}`" class="size-4 rounded text-blue-600 cursor-pointer" /></td>
                                        <td><p class="text-sm text-slate-700">{{ item.item_name || item.item?.name || 'Item non-katalog' }}</p><p v-if="item.item?.code" class="mt-1 text-xs text-slate-400">{{ item.item.code }}</p></td>
                                        <td class="text-right tabular-nums">{{ Number(item.requested_quantity || 0).toLocaleString('id-ID') }} {{ item.unit?.symbol || item.unit?.code || item.unit_name || 'Unit' }}</td>
                                        <td class="text-right tabular-nums font-medium">{{ Number(item.remaining_quantity || 0).toLocaleString('id-ID') }} {{ item.unit?.symbol || item.unit?.code || item.unit_name || 'Unit' }}</td>
                                        <td class="text-right tabular-nums">{{ item.estimated_unit_price != null ? 'Rp ' + Number(item.estimated_unit_price).toLocaleString('id-ID') : '—' }}</td>
                                    </tr>
                                </BaseTable>
                            </div>
                        </td>
                    </tr>
                </template>
            </BaseTable>

            <!-- Selection actions remain in document flow so they do not cover rows or the app footer. -->
            <div v-if="selectedItemList.length > 0" class="selection-actions border-t border-slate-200 bg-blue-50/40 p-5 space-y-4" aria-label="Tindakan item terpilih">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-slate-800" role="status">{{ selectedItemList.length }} item dipilih dari {{ selectedPrCount }} PR</p>
                        <p v-if="selectedCompany" class="mt-1 text-xs text-slate-500 break-words">{{ selectedCompany.name }}</p>
                    </div>
                    <button type="button" @click="emit('clear-selection')" class="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-4">Hapus pilihan</button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" @click="emit('create-consolidated-plan')" class="rounded-xl px-4 py-2.5 text-sm font-medium bg-[#014BAA] hover:bg-blue-800 text-white">Buat rencana konsolidasi</button>
                    <button type="button" @click="emit('fast-track-bulk-rfq')" class="rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">Lanjut ke tender RFQ</button>
                    <button type="button" @click="emit('fast-track-bulk-dp')" class="rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">Lanjut ke pembelian langsung</button>
                </div>
            </div>
        </div>
    </div>
</template>
