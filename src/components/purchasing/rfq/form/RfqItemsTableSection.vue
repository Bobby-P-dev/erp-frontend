<script setup>
import { formatCurrency } from '../../../../utils/stringUtils.js'
import { CheckCircle2, Package } from '@lucide/vue'

defineProps({
    hasPlanSelected: { type: Boolean, default: false },
    planItems: { type: Array, required: true },
    activeItemsCount: { type: Number, default: 0 },
    totalEstimatedHpsAmount: { type: Number, default: 0 }
})

const emit = defineEmits(['select-all'])
</script>

<template>
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-sm">
                    3
                </div>
                <div>
                    <h3 class="text-base font-bold text-slate-900">Rincian Item yang Ditenderkan</h3>
                    <p class="text-xs text-slate-500">Tentukan kuantitas target dan Harga Perkiraan Sendiri (HPS) per item untuk acuan evaluasi vendor.</p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <span class="text-xs font-semibold text-slate-600">
                    <strong class="text-blue-700 font-mono">{{ activeItemsCount }}</strong> / {{ planItems.length }} Item Terpilih
                </span>
                <button
                    v-if="planItems.length > 0"
                    type="button"
                    @click="emit('select-all')"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    <span>Pilih Semua Kuota Penuh</span>
                </button>
            </div>
        </div>

        <!-- Empty Plan Notice -->
        <div v-if="!hasPlanSelected" class="py-12 text-center text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Package class="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p class="text-sm font-semibold text-slate-700">Belum Ada Rencana Pengadaan Terpilih</p>
            <p class="text-xs text-slate-400 mt-1">Pilih Dokumen Rencana Pengadaan pada Langkah 1 di atas untuk memuat daftar item.</p>
        </div>

        <!-- Items Table -->
        <template v-else>
            <div class="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table class="w-full text-xs text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/80 text-slate-700 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider">
                            <th class="py-3.5 px-4 w-12 text-center">Pilih</th>
                            <th class="py-3.5 px-4 min-w-[220px]">Item & Spesifikasi</th>
                            <th class="py-3.5 px-4 w-24 text-center">Satuan</th>
                            <th class="py-3.5 px-4 w-28 text-center">Sisa Kuota</th>
                            <th class="py-3.5 px-4 w-36 text-center">Kuantitas Target *</th>
                            <th class="py-3.5 px-4 w-44 text-right">Target Price / HPS (Rp)</th>
                            <th class="py-3.5 px-4 w-36 text-right">Subtotal HPS (Rp)</th>
                            <th class="py-3.5 px-4 min-w-[180px]">Catatan Khusus</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr
                            v-for="it in planItems"
                            :key="it.procurement_plan_item_id"
                            :class="[
                                it.is_selected ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/50 opacity-60',
                                'transition-colors'
                            ]"
                        >
                            <!-- Checkbox -->
                            <td class="py-3.5 px-4 text-center">
                                <input
                                    type="checkbox"
                                    v-model="it.is_selected"
                                    class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                            </td>

                            <!-- Item Name & Code -->
                            <td class="py-3.5 px-4">
                                <div class="font-bold text-sm text-slate-900">{{ it.item_name }}</div>
                                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                                    <span v-if="it.item_code" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                                        {{ it.item_code }}
                                    </span>
                                    <span v-if="it.source_pp_number" class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200">
                                        {{ it.source_pp_number }}
                                    </span>
                                    <span v-if="it.source_pr_number" class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] border border-blue-200">
                                        {{ it.source_pr_number }}
                                    </span>
                                </div>
                                <div v-if="it.item_specifications" class="text-[11px] text-slate-500 line-clamp-1 mt-1" :title="it.item_specifications">
                                    Spec: {{ it.item_specifications }}
                                </div>
                            </td>

                            <!-- Unit -->
                            <td class="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                                {{ it.unit_name }}
                            </td>

                            <!-- Sisa Kuota -->
                            <td class="py-3.5 px-4 text-center">
                                <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                                    {{ Number(it.remaining_quantity).toLocaleString('id-ID') }}
                                </span>
                            </td>

                            <!-- Target Qty Input -->
                            <td class="py-3.5 px-4 text-center">
                                <input
                                    v-model.number="it.target_quantity"
                                    :disabled="!it.is_selected"
                                    type="number"
                                    min="1"
                                    :max="it.remaining_quantity"
                                    class="w-28 px-3 py-1.5 text-center font-mono font-bold text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-50"
                                />
                            </td>

                            <!-- Target Price / HPS Input -->
                            <td class="py-3.5 px-4 text-right">
                                <input
                                    v-model.number="it.target_price"
                                    :disabled="!it.is_selected"
                                    type="number"
                                    min="0"
                                    step="500"
                                    placeholder="0"
                                    class="w-36 px-3 py-1.5 text-right font-mono font-semibold text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-50"
                                />
                            </td>

                            <!-- Subtotal HPS -->
                            <td class="py-3.5 px-4 text-right font-mono font-bold text-blue-700">
                                {{ formatCurrency(Number(it.target_quantity || 0) * Number(it.target_price || 0), 'IDR') }}
                            </td>

                            <!-- Notes Input -->
                            <td class="py-3.5 px-4">
                                <input
                                    v-model="it.notes"
                                    :disabled="!it.is_selected"
                                    type="text"
                                    placeholder="Catatan item..."
                                    class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-50"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Summary Bar -->
            <div v-if="planItems.length > 0" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80">
                <div class="flex items-center gap-4 flex-wrap">
                    <span>Item Ditenderkan: <strong class="text-slate-900 font-bold font-mono">{{ activeItemsCount }} dari {{ planItems.length }} item</strong></span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-slate-500 font-medium">Total Estimasi HPS Paket Tender:</span>
                    <span class="text-sm font-bold text-blue-700 font-mono bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-xl">
                        {{ formatCurrency(totalEstimatedHpsAmount, 'IDR') }}
                    </span>
                </div>
            </div>
        </template>
    </div>
</template>
