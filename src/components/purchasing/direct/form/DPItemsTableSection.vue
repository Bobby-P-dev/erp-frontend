<script setup>
import { Package, AlertCircle, Trash2 } from '@lucide/vue'
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
    isPlanFullyExhausted: {
        type: Boolean,
        default: false,
    },
    hasExhaustedItems: {
        type: Boolean,
        default: false,
    },
})

defineEmits(['remove-bulk-item'])
</script>

<template>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                3
            </div>
            <div>
                <h3 class="text-base font-bold text-gray-900">Rincian Barang & Realisasi Harga Beli</h3>
                <p class="text-xs text-gray-500">Masukkan kuantitas dan harga satuan aktual pembelian di toko/marketplace.</p>
            </div>
        </div>

        <div v-if="form.items.length === 0" class="py-10 text-center text-gray-400">
            <Package class="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p class="text-sm font-semibold text-gray-600">Belum Ada Item Terpilih</p>
            <p class="text-xs text-gray-400 mt-1">Pilih Rencana Pengadaan pada Langkah 1 untuk memuat rincian item.</p>
        </div>

        <!-- Items Table -->
        <div v-else class="space-y-3">
            <div v-if="isPlanFullyExhausted" class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                <AlertCircle class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                    <p class="font-bold text-sm text-rose-900">Seluruh Kuota Rencana Pengadaan Telah Terpakai</p>
                    <p class="mt-0.5 text-rose-700">Semua item pada rencana pengadaan ini sudah dialokasikan sepenuhnya ke transaksi Direct Purchase sebelumnya. Anda tidak dapat membuat pembelian baru dari rencana ini.</p>
                </div>
            </div>
            <div v-else-if="hasExhaustedItems" class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                <AlertCircle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                    <p class="font-bold">Perhatian: Sebagian Kuota Item Telah Habis</p>
                    <p class="mt-0.5 text-amber-700">Item dengan tanda kuota habis (0) tidak dapat dibeli lagi. Mohon hanya masukkan kuantitas untuk item yang masih memiliki sisa kuota.</p>
                </div>
            </div>

            <div class="overflow-x-auto border border-gray-100 rounded-xl">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-gray-50/80 border-b border-gray-100 font-bold text-gray-700 uppercase tracking-wider">
                            <th v-if="isBulkMode" class="px-3 py-3 text-center w-12">Aksi</th>
                            <th class="px-4 py-3 min-w-[240px]">Barang / Item</th>
                            <th class="px-4 py-3 text-right w-28">Sisa / Rencana</th>
                            <th class="px-4 py-3 w-36">Kuantitas Beli</th>
                            <th class="px-4 py-3 w-44">Harga Satuan (Rp)</th>
                            <th class="px-4 py-3 w-36">Diskon Item (Rp)</th>
                            <th class="px-4 py-3 text-right w-36">Subtotal</th>
                            <th class="px-4 py-3 min-w-[200px]">Link Produk & Catatan</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr v-for="(item, idx) in form.items" :key="item.purchase_requisition_item_id || item.procurement_plan_item_id || idx" class="hover:bg-gray-50/50" :class="{ 'bg-rose-50/20': Number(item.allocated_qty) <= 0 }">
                            <td v-if="isBulkMode" class="px-3 py-3 text-center">
                                <button 
                                    type="button" 
                                    @click="$emit('remove-bulk-item', idx)"
                                    class="text-gray-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                                    title="Hapus dari daftar pembelian sekaligus"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </td>

                            <td class="px-4 py-3">
                                <div class="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                                    <span v-if="item.pr_number" class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        {{ item.pr_number }}
                                    </span>
                                    <span>{{ item.item_name }}</span>
                                    <span v-if="item.is_custom_item" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Non-Katalog
                                    </span>
                                    <span v-else-if="item.item_code" class="text-[10px] text-gray-400 font-mono">
                                        {{ item.item_code }}
                                    </span>
                                </div>
                                <div v-if="item.detail_name" class="text-xs text-slate-500 font-medium mt-0.5">
                                    {{ item.detail_name }}
                                </div>
                                <p v-if="item.error" class="text-[11px] text-rose-600 font-semibold mt-1">
                                    {{ item.error }}
                                </p>
                            </td>

                            <td class="px-4 py-3 text-right font-semibold">
                                <div v-if="Number(item.allocated_qty) <= 0" class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                    Habis (0)
                                </div>
                                <div v-else class="text-gray-700">
                                    <span class="font-bold text-indigo-700">{{ item.allocated_qty }}</span>
                                    <span class="text-gray-400 text-[10px]"> / {{ item.planned_qty }}</span>
                                    <span class="text-gray-500 text-[10px] ml-1">{{ item.unit_name }}</span>
                                </div>
                            </td>

                            <td class="px-4 py-3">
                                <div class="relative flex items-center">
                                    <input 
                                        type="number" 
                                        step="any" 
                                        min="0"
                                        :max="item.allocated_qty"
                                        :disabled="Number(item.allocated_qty) <= 0"
                                        v-model="item.quantity" 
                                        class="w-full p-2 border rounded-lg font-bold text-right pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                        :class="[
                                            Number(item.allocated_qty) <= 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : (item.error ? 'border-rose-400' : 'border-gray-200')
                                        ]"
                                    />
                                    <span class="absolute right-2 text-[10px] font-semibold text-gray-400">
                                        {{ item.unit_name }}
                                    </span>
                                </div>
                            </td>

                            <td class="px-4 py-3">
                                <div class="relative flex items-center">
                                    <span class="absolute left-2 text-[10px] font-bold text-gray-500 font-mono">{{ form.currency }}</span>
                                    <input 
                                        type="number" 
                                        step="any" 
                                        min="0"
                                        v-model="item.unit_price" 
                                        placeholder="0"
                                        class="w-full p-2 border rounded-lg font-bold text-right pl-12 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                        :class="item.error ? 'border-rose-400' : 'border-gray-200'"
                                    />
                                </div>
                            </td>

                            <td class="px-4 py-3">
                                <div class="relative flex items-center">
                                    <span class="absolute left-2 text-[10px] font-bold text-gray-500 font-mono">{{ form.currency }}</span>
                                    <input 
                                        type="number" 
                                        step="any" 
                                        min="0"
                                        v-model="item.discount_amount" 
                                        placeholder="0"
                                        class="w-full p-2 border border-gray-200 rounded-lg text-right pl-12 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-700"
                                    />
                                </div>
                            </td>

                            <td class="px-4 py-3 text-right font-black text-gray-900 font-mono text-sm">
                                {{ formatCurrency(Math.max(0, ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)) - (Number(item.discount_amount) || 0)), form.currency) }}
                            </td>

                            <td class="px-4 py-3 space-y-1">
                                <input 
                                    type="url" 
                                    v-model="item.product_url" 
                                    placeholder="https://tokopedia.com/product/..."
                                    class="w-full p-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <input 
                                    type="text" 
                                    v-model="item.notes" 
                                    placeholder="Catatan item (warna, spek)..."
                                    class="w-full p-1.5 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-600"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
