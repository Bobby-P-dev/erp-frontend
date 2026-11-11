<script setup>
import { reactive } from 'vue'
import { Package, AlertCircle, Trash2, Link2, MessageSquare, ChevronDown, ChevronUp, Plus } from '@lucide/vue'
import { formatCurrency } from '@/composables/useFormatter.js'

defineProps({
    form: {
        type: Object,
        required: true,
    },
    isBulkMode: {
        type: Boolean,
        default: false,
    },
    allowRemoveItem: {
        type: Boolean,
        default: false,
    },
    extraPlanItemOptions: {
        type: Array,
        default: () => [],
    },
    selectedExtraPlanItemId: {
        type: [String, Number],
        default: '',
    },
    isPlanFullyExhausted: {
        type: Boolean,
        default: false,
    },
    hasExhaustedItems: {
        type: Boolean,
        default: false,
    },
})

defineEmits(['remove-bulk-item', 'remove-item', 'update:selectedExtraPlanItemId', 'add-plan-item'])

const expandedDetails = reactive({})

const toggleItemDetails = (idx) => {
    expandedDetails[idx] = !expandedDetails[idx]
}

const hasExtraDetail = (item) => {
    return Boolean(item.product_url || item.notes || Number(item.discount_amount) > 0)
}
</script>

<template>
    <div class="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div class="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100 flex-wrap">
            <div>
                <h3 class="text-sm font-bold text-slate-900">Rincian Barang & Realisasi Harga Beli</h3>
                <p class="text-xs text-slate-500">Masukkan kuantitas dan harga satuan aktual sesuai transaksi toko/marketplace.</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                <div v-if="extraPlanItemOptions.length > 0" class="flex items-center gap-1.5">
                    <select
                        :value="selectedExtraPlanItemId"
                        @change="$emit('update:selectedExtraPlanItemId', $event.target.value)"
                        class="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600 max-w-xs"
                    >
                        <option value="">-- Tambah Item dari Rencana --</option>
                        <option v-for="opt in extraPlanItemOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                    <button
                        type="button"
                        @click="$emit('add-plan-item')"
                        :disabled="!selectedExtraPlanItemId"
                        class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                    >
                        <Plus class="w-3.5 h-3.5" />
                        <span>Tambah</span>
                    </button>
                </div>
                <span v-if="form.items.length > 0" class="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                    {{ form.items.length }} Baris Item
                </span>
            </div>
        </div>

        <div v-if="form.items.length === 0" class="py-10 text-center text-slate-400">
            <Package class="w-9 h-9 mx-auto mb-2 text-slate-300" />
            <p class="text-xs font-semibold text-slate-600">Belum Ada Item Terpilih</p>
            <p class="text-xs text-slate-400 mt-0.5">Pilih Rencana Pengadaan di atas untuk memuat daftar kebutuhan barang.</p>
        </div>

        <!-- Items Table -->
        <div v-else class="space-y-3">
            <div v-if="isPlanFullyExhausted" class="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                    <p class="font-bold text-rose-900">Seluruh Kuota Rencana Pengadaan Telah Terpakai</p>
                    <p class="mt-0.5 text-rose-700">Semua item pada rencana ini sudah dialokasikan ke transaksi sebelumnya.</p>
                </div>
            </div>
            <div v-else-if="hasExhaustedItems" class="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p class="font-bold">Perhatian: Sebagian Kuota Item Habis</p>
                    <p class="mt-0.5 text-amber-700">Item bertanda kuota habis (0) tidak dapat dibeli lagi.</p>
                </div>
            </div>

            <div class="overflow-x-auto border border-slate-200/80 rounded-lg">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200/80 font-semibold text-slate-600">
                            <th v-if="isBulkMode || (allowRemoveItem && form.items.length > 1)" class="px-2.5 py-2.5 text-center w-10"></th>
                            <th class="px-3.5 py-2.5 min-w-[220px]">Barang / Spesifikasi</th>
                            <th class="px-3 py-2.5 text-right w-28">Kuota</th>
                            <th class="px-3 py-2.5 w-32">Qty Beli</th>
                            <th class="px-3 py-2.5 w-44">Harga Satuan</th>
                            <th class="px-3.5 py-2.5 text-right w-36">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <template v-for="(item, idx) in form.items" :key="item.purchase_requisition_item_id || item.procurement_plan_item_id || idx">
                            <tr class="hover:bg-slate-50/60 transition-colors" :class="{ 'bg-rose-50/20': Number(item.allocated_qty) <= 0 }">
                                <td v-if="isBulkMode || (allowRemoveItem && form.items.length > 1)" class="px-2.5 py-3 text-center align-top">
                                    <button 
                                        type="button" 
                                        @click="isBulkMode ? $emit('remove-bulk-item', idx) : $emit('remove-item', idx)"
                                        class="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50 cursor-pointer"
                                        title="Hapus dari daftar"
                                    >
                                        <Trash2 class="w-3.5 h-3.5" />
                                    </button>
                                </td>

                                <td class="px-3.5 py-3 align-top">
                                    <div class="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                        <span v-if="item.pr_number" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            {{ item.pr_number }}
                                        </span>
                                        <span>{{ item.item_name }}</span>
                                        <span v-if="item.is_custom_item" class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                            Non-Katalog
                                        </span>
                                        <span v-else-if="item.item_code" class="text-[10px] text-slate-400 font-mono">
                                            {{ item.item_code }}
                                        </span>
                                    </div>
                                    <div v-if="item.detail_name" class="text-[11px] text-slate-500 mt-0.5">
                                        {{ item.detail_name }}
                                    </div>

                                    <!-- Toggle Link/Catatan/Diskon Item -->
                                    <div class="mt-1.5 flex items-center gap-2">
                                        <button
                                            type="button"
                                            @click="toggleItemDetails(idx)"
                                            class="inline-flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
                                            :class="expandedDetails[idx] || hasExtraDetail(item) ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 hover:text-slate-600'"
                                        >
                                            <Link2 class="w-3 h-3" />
                                            <span>{{ hasExtraDetail(item) ? 'Edit Link / Diskon / Catatan' : '+ Link Produk / Diskon / Catatan' }}</span>
                                            <ChevronUp v-if="expandedDetails[idx]" class="w-3 h-3" />
                                            <ChevronDown v-else class="w-3 h-3" />
                                        </button>
                                        <span v-if="Number(item.discount_amount) > 0 && !expandedDetails[idx]" class="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                            Diskon: -{{ formatCurrency(item.discount_amount, form.currency) }}
                                        </span>
                                    </div>

                                    <p v-if="item.error" class="text-[11px] text-rose-600 font-semibold mt-1">
                                        {{ item.error }}
                                    </p>
                                </td>

                                <td class="px-3 py-3 text-right font-semibold align-top">
                                    <div v-if="Number(item.allocated_qty) <= 0" class="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                        Habis (0)
                                    </div>
                                    <div v-else class="text-slate-700 pt-1.5">
                                        <span class="font-bold text-blue-700 font-mono">{{ item.allocated_qty }}</span>
                                        <span class="text-slate-400 text-[10px] font-mono"> / {{ item.planned_qty }}</span>
                                        <span class="text-slate-500 text-[10px] ml-1">{{ item.unit_name }}</span>
                                    </div>
                                </td>

                                <td class="px-3 py-3 align-top">
                                    <div class="relative flex items-center">
                                        <input 
                                            type="number" 
                                            step="any" 
                                            min="0"
                                            :max="item.allocated_qty"
                                            :disabled="Number(item.allocated_qty) <= 0"
                                            v-model="item.quantity" 
                                            class="w-full py-1.5 pl-2.5 pr-9 border rounded-lg font-bold font-mono text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                            :class="[
                                                Number(item.allocated_qty) <= 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : (item.error ? 'border-rose-400' : 'border-slate-200')
                                            ]"
                                        />
                                        <span class="absolute right-2 text-[10px] font-semibold text-slate-400 pointer-events-none">
                                            {{ item.unit_name }}
                                        </span>
                                    </div>
                                </td>

                                <td class="px-3 py-3 align-top">
                                    <div class="relative flex items-center">
                                        <span class="absolute left-2.5 text-[10px] font-bold text-slate-400 font-mono pointer-events-none">{{ form.currency }}</span>
                                        <input 
                                            type="number" 
                                            step="any" 
                                            min="0"
                                            v-model="item.unit_price" 
                                            placeholder="0"
                                            class="w-full py-1.5 pr-2.5 pl-10 border rounded-lg font-bold text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                            :class="item.error ? 'border-rose-400' : 'border-slate-200'"
                                        />
                                    </div>
                                </td>

                                <td class="px-3.5 py-3 text-right font-bold text-slate-900 font-mono text-xs align-top pt-4">
                                    {{ formatCurrency(Math.max(0, ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)) - (Number(item.discount_amount) || 0)), form.currency) }}
                                </td>
                            </tr>

                            <!-- Collapsible Secondary Item Details (Product URL, Notes, Item Discount) -->
                            <tr v-if="expandedDetails[idx] || hasExtraDetail(item)" class="bg-slate-50/70 border-b border-slate-100">
                                <td v-if="isBulkMode || (allowRemoveItem && form.items.length > 1)"></td>
                                <td colspan="5" class="px-3.5 py-2.5">
                                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                                        <div class="sm:col-span-5 flex items-center gap-1.5">
                                            <Link2 class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <input 
                                                type="url" 
                                                v-model="item.product_url" 
                                                placeholder="Link produk (https://tokopedia.com/...)"
                                                class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] focus:outline-none focus:border-blue-600 font-mono"
                                            />
                                        </div>
                                        <div class="sm:col-span-4 flex items-center gap-1.5">
                                            <MessageSquare class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <input 
                                                type="text" 
                                                v-model="item.notes" 
                                                placeholder="Catatan varian / warna / spek..."
                                                class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] focus:outline-none focus:border-blue-600"
                                            />
                                        </div>
                                        <div class="sm:col-span-3 flex items-center gap-1.5">
                                            <span class="text-[10px] font-semibold text-slate-500 shrink-0">Diskon Item:</span>
                                            <input 
                                                type="number" 
                                                step="any" 
                                                min="0"
                                                v-model="item.discount_amount" 
                                                placeholder="0"
                                                class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-right font-mono text-[11px] focus:outline-none focus:border-blue-600"
                                            />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
