<script setup>
import { ref } from 'vue'
import { Truck, Tag, Receipt, ChevronDown, ChevronUp } from '@lucide/vue'
import { formatCurrency } from '@/composables/useFormatter.js'

const props = defineProps({
    form: {
        type: Object,
        required: true,
    },
    currenciesList: {
        type: Array,
        required: true,
    },
    taxesList: {
        type: Array,
        required: true,
    },
    selectedTaxRate: {
        type: [Number, null],
        default: null,
    },
    selectedTaxName: {
        type: String,
        default: '',
    },
    itemsSubtotal: {
        type: Number,
        required: true,
    },
    grandTotal: {
        type: Number,
        required: true,
    },
    equivalentIdrGrandTotal: {
        type: Number,
        required: true,
    },
})

defineEmits(['tax-change'])

const showAdjustments = ref(false)
</script>

<template>
    <div class="dp-section dp-cost bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-6">
        <!-- Header + Compact Currency Selector -->
        <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
                <h3 class="text-sm font-bold text-slate-900">Ringkasan biaya</h3>
                <p class="text-xs text-slate-500 mt-2">Periksa total sebelum menyimpan atau mengajukan pembayaran.</p>
            </div>

            <div class="flex items-center gap-1.5">
                <select 
                    v-model="form.currency"
                    aria-label="Mata uang transaksi"
                    class="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-600"
                    title="Pilih Mata Uang Transaksi"
                >
                    <option 
                        v-for="c in currenciesList" 
                        :key="c.code" 
                        :value="c.code"
                    >
                        {{ c.code }}
                    </option>
                </select>
            </div>
        </div>

        <!-- Exchange Rate Input (Only shown when non-IDR) -->
        <div v-if="form.currency !== 'IDR'" class="flex items-center justify-between gap-2 bg-blue-50/70 px-3 py-2 rounded-lg border border-blue-200/80 text-xs">
            <span class="font-semibold text-blue-800">Kurs (1 {{ form.currency }} ke IDR):</span>
            <div class="flex items-center gap-1 bg-white px-2 py-1 rounded border border-blue-200">
                <span class="text-slate-400 font-mono">Rp</span>
                <input 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    v-model.number="form.exchange_rate" 
                    aria-label="Kurs ke IDR"
                    class="w-24 text-xs font-mono font-bold text-blue-700 text-right focus:outline-none"
                />
            </div>
        </div>

        <!-- Collapsible Cost Adjustments (Shipping, Discount, Tax, Notes) -->
        <div class="border border-slate-200/70 rounded-lg overflow-hidden">
            <button
                type="button"
                @click="showAdjustments = !showAdjustments"
                :aria-expanded="showAdjustments"
                class="w-full px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-100/70 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
                <span>Biaya Kirim, Diskon, Pajak & Catatan</span>
                <ChevronUp v-if="showAdjustments" class="w-4 h-4 text-slate-400" />
                <ChevronDown v-else class="w-4 h-4 text-slate-400" />
            </button>

            <div v-show="showAdjustments" class="p-3.5 space-y-3 bg-white border-t border-slate-100 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Truck class="w-3 h-3 text-slate-400" />
                            <span>Ongkir ({{ form.currency }})</span>
                        </label>
                        <input 
                            type="number" 
                            min="0"
                            v-model="form.shipping_cost" 
                            aria-label="Ongkos kirim"
                            step="any"
                            class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-right font-semibold focus:outline-none focus:border-blue-600"
                        />
                    </div>

                    <div>
                        <label class="font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Tag class="w-3 h-3 text-slate-400" />
                            <span>Diskon Nota ({{ form.currency }})</span>
                        </label>
                        <input 
                            type="number" 
                            min="0"
                            v-model="form.discount_amount" 
                            aria-label="Diskon nota"
                            step="any"
                            class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-right font-semibold text-emerald-700 focus:outline-none focus:border-emerald-600"
                        />
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block font-semibold text-slate-600 mb-1">Biaya Platform ({{ form.currency }})</label>
                        <input 
                            type="number" 
                            min="0"
                            v-model="form.platform_fee" 
                            aria-label="Biaya platform"
                            step="any"
                            class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-right font-semibold focus:outline-none focus:border-blue-600"
                        />
                    </div>

                    <div>
                        <label class="font-semibold text-slate-600 mb-1 flex items-center justify-between">
                            <span>Master Pajak</span>
                            <span v-if="selectedTaxRate !== null" class="text-[10px] text-blue-600 font-mono">
                                {{ selectedTaxRate }}%
                            </span>
                        </label>
                        <select 
                            v-model="form.tax_id"
                            aria-label="Master pajak"
                            @change="$emit('tax-change')"
                            class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600"
                        >
                            <option :value="null">Non-Pajak (0%)</option>
                            <option v-for="tax in taxesList" :key="tax.id" :value="tax.id">
                                {{ tax.code }} ({{ tax.rate }}%)
                            </option>
                        </select>
                    </div>
                </div>

                <div v-if="form.tax_id || Number(form.tax_amount) > 0">
                    <label class="font-semibold text-slate-600 mb-1 flex items-center justify-between">
                        <span class="flex items-center gap-1">
                            <Receipt class="w-3 h-3 text-slate-400" />
                            <span>Nominal Pajak ({{ form.currency }})</span>
                        </span>
                        <span class="text-[10px] text-slate-400 font-normal">Dapat disesuaikan</span>
                    </label>
                    <input 
                        type="number" 
                        min="0"
                        v-model="form.tax_amount" 
                        aria-label="Nominal pajak"
                        step="any"
                        class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-right font-semibold focus:outline-none focus:border-blue-600"
                    />
                </div>

                <div>
                    <label class="block font-semibold text-slate-600 mb-1">Catatan Transaksi / No. Referensi</label>
                    <textarea 
                        v-model="form.notes"
                        aria-label="Catatan transaksi"
                        rows="2"
                        placeholder="Catatan nomor invoice, instruksi gudang, dsb..."
                        class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-600"
                    ></textarea>
                </div>
            </div>
        </div>

        <!-- Financial Summary Receipt -->
        <div class="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
            <div class="flex justify-between items-center text-slate-600">
                <span>Subtotal Barang</span>
                <span class="font-bold font-mono text-slate-800">{{ formatCurrency(itemsSubtotal, form.currency) }}</span>
            </div>

            <div v-if="Number(form.discount_amount) > 0" class="flex justify-between items-center text-emerald-700">
                <span>Diskon Nota</span>
                <span class="font-bold font-mono">- {{ formatCurrency(form.discount_amount, form.currency) }}</span>
            </div>

            <div v-if="Number(form.shipping_cost) > 0" class="flex justify-between items-center text-slate-600">
                <span>Ongkos Kirim</span>
                <span class="font-bold font-mono">+ {{ formatCurrency(form.shipping_cost, form.currency) }}</span>
            </div>

            <div v-if="Number(form.platform_fee) > 0" class="flex justify-between items-center text-slate-600">
                <span>Biaya Platform</span>
                <span class="font-bold font-mono">+ {{ formatCurrency(form.platform_fee, form.currency) }}</span>
            </div>

            <div v-if="Number(form.tax_amount) > 0 || form.tax_id" class="flex justify-between items-center text-slate-600">
                <span>Pajak ({{ selectedTaxName || 'Pajak' }})</span>
                <span class="font-bold font-mono">+ {{ formatCurrency(form.tax_amount, form.currency) }}</span>
            </div>

            <div class="pt-3 border-t border-slate-200 flex items-baseline justify-between gap-2">
                <span class="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Grand Total
                </span>
                <span class="text-xl font-black text-emerald-700 font-mono">
                    {{ formatCurrency(grandTotal, form.currency) }}
                </span>
            </div>

            <!-- Converted Equivalent IDR -->
            <div v-if="form.currency !== 'IDR'" class="pt-2 border-t border-slate-200/60 flex items-baseline justify-between text-blue-800">
                <span class="text-[11px] font-semibold">Setara Pembukuan (IDR):</span>
                <span class="text-sm font-black font-mono">{{ formatCurrency(equivalentIdrGrandTotal, 'IDR') }}</span>
            </div>
        </div>
    </div>
</template>
