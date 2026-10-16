<script setup>
import { Coins, Truck, Tag, Receipt } from '@lucide/vue'
import { formatCurrency } from '@/composables/useFormatter.js'

defineProps({
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
</script>

<template>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                5
            </div>
            <div>
                <h3 class="text-base font-bold text-gray-900">Mata Uang, Biaya Tambahan & Ringkasan Transaksi</h3>
                <p class="text-xs text-gray-500">Pilih mata uang transaksi valas, konfirmasi kurs IDR, dan masukkan rincian biaya.</p>
            </div>
        </div>

        <!-- MULTI-CURRENCY SETTINGS BAR -->
        <div class="p-4 bg-blue-50/70 rounded-xl border border-blue-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Coins class="w-5 h-5" />
                </div>
                <div>
                    <span class="text-xs font-bold text-slate-800 block">Mata Uang & Kurs Transaksi (Multi-Currency)</span>
                    <span class="text-[11px] text-slate-500">Nilai transaksi akan dikonversi dan dikunci ke pembukuan Rupiah (IDR).</span>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <div class="flex items-center gap-2">
                    <label class="text-xs font-semibold text-slate-600">Valuta:</label>
                    <select 
                        v-model="form.currency"
                        class="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                    >
                        <option 
                            v-for="c in currenciesList" 
                            :key="c.code" 
                            :value="c.code"
                        >
                            {{ c.code }} - {{ c.name }} ({{ c.symbol }})
                        </option>
                    </select>
                </div>

                <div v-if="form.currency !== 'IDR'" class="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-2xs">
                    <span class="text-xs font-semibold text-slate-600">1 {{ form.currency }} = Rp</span>
                    <input 
                        type="number" 
                        step="0.01" 
                        min="0.01" 
                        v-model.number="form.exchange_rate" 
                        class="w-24 text-xs font-mono font-bold text-blue-700 text-right focus:outline-none"
                    />
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Additional Cost Form -->
            <div class="space-y-4 bg-gray-50/60 p-4 rounded-xl border border-gray-100 text-xs">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                            <Truck class="w-3.5 h-3.5 text-gray-400" />
                            <span>Ongkos Kirim ({{ form.currency }})</span>
                        </label>
                        <input 
                            type="number" 
                            min="0"
                            v-model="form.shipping_cost" 
                            class="w-full p-2.5 bg-white border border-gray-200 rounded-lg font-mono text-right font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label class="block font-bold text-gray-700 mb-1 flex items-center gap-1">
                            <Tag class="w-3.5 h-3.5 text-gray-400" />
                            <span>Diskon / Kupon ({{ form.currency }})</span>
                        </label>
                        <input 
                            type="number" 
                            min="0"
                            v-model="form.discount_amount" 
                            class="w-full p-2.5 bg-white border border-gray-200 rounded-lg font-mono text-right font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                        />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-gray-700 mb-1">Biaya Platform ({{ form.currency }})</label>
                        <input 
                            type="number" 
                            min="0"
                            v-model="form.platform_fee" 
                            class="w-full p-2.5 bg-white border border-gray-200 rounded-lg font-mono text-right font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label class="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                            <span class="flex items-center gap-1">
                                <Receipt class="w-3.5 h-3.5 text-gray-400" />
                                <span>Master Pajak</span>
                            </span>
                            <span v-if="selectedTaxRate !== null" class="text-[11px] text-indigo-600 font-mono font-semibold">
                                Tarif: {{ selectedTaxRate }}%
                            </span>
                        </label>
                        <select 
                            v-model="form.tax_id"
                            @change="$emit('tax-change')"
                            class="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                        >
                            <option :value="null">Bebas Pajak / Non-Pajak (0%)</option>
                            <option v-for="tax in taxesList" :key="tax.id" :value="tax.id">
                                {{ tax.code }} - {{ tax.name }} ({{ tax.rate }}%)
                            </option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                        <span class="flex items-center gap-1">
                            <Receipt class="w-3.5 h-3.5 text-gray-400" />
                            <span>Pajak Transaksi ({{ form.currency }})</span>
                        </span>
                        <span class="text-[10px] text-gray-400 font-normal">
                            Otomatis dihitung • Dapat disesuaikan bila ada selisih pembulatan struk
                        </span>
                    </label>
                    <input 
                        type="number" 
                        min="0"
                        v-model="form.tax_amount" 
                        class="w-full p-2.5 bg-white border border-gray-200 rounded-lg font-mono text-right font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label class="block font-bold text-gray-700 mb-1">Catatan Tambahan Transaksi</label>
                    <textarea 
                        v-model="form.notes"
                        rows="2"
                        placeholder="Catatan nomor invoice, instruksi penerimaan di gudang, dsb..."
                        class="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    ></textarea>
                </div>
            </div>

            <!-- Financial Summary Box -->
            <div class="bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 rounded-2xl border border-gray-200/80 flex flex-col justify-between shadow-2xs">
                <div class="space-y-3 text-xs">
                    <h4 class="font-bold text-gray-900 text-sm pb-2 border-b border-gray-200 flex items-center justify-between">
                        <span>Rekapitulasi Nilai Transaksi</span>
                        <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">{{ form.currency }}</span>
                    </h4>

                    <div class="flex justify-between items-center text-gray-600">
                        <span>Subtotal Barang:</span>
                        <span class="font-bold font-mono text-gray-800">{{ formatCurrency(itemsSubtotal, form.currency) }}</span>
                    </div>

                    <div v-if="Number(form.discount_amount) > 0" class="flex justify-between items-center text-emerald-700">
                        <span>Diskon Transaksi:</span>
                        <span class="font-bold font-mono">- {{ formatCurrency(form.discount_amount, form.currency) }}</span>
                    </div>

                    <div v-if="Number(form.shipping_cost) > 0" class="flex justify-between items-center text-gray-600">
                        <span>Ongkos Kirim:</span>
                        <span class="font-bold font-mono">+ {{ formatCurrency(form.shipping_cost, form.currency) }}</span>
                    </div>

                    <div v-if="Number(form.platform_fee) > 0" class="flex justify-between items-center text-gray-600">
                        <span>Biaya Layanan Platform:</span>
                        <span class="font-bold font-mono">+ {{ formatCurrency(form.platform_fee, form.currency) }}</span>
                    </div>

                    <div v-if="Number(form.tax_amount) > 0 || form.tax_id" class="flex justify-between items-center text-gray-600">
                        <span>Pajak ({{ selectedTaxName || 'Pajak Transaksi' }}):</span>
                        <span class="font-bold font-mono">+ {{ formatCurrency(form.tax_amount, form.currency) }}</span>
                    </div>
                </div>

                <div class="pt-4 border-t-2 border-gray-200 mt-4">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                        Grand Total Transaksi:
                    </span>
                    <span class="text-2xl font-black text-emerald-700 font-mono block mt-1">
                        {{ formatCurrency(grandTotal, form.currency) }}
                    </span>

                    <!-- Converted Equivalent IDR -->
                    <div v-if="form.currency !== 'IDR'" class="mt-3 p-3 bg-blue-50/90 rounded-xl border border-blue-200 text-xs">
                        <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                            Setara Pembukuan Keuangan (IDR):
                        </span>
                        <span class="text-lg font-black text-blue-900 font-mono block mt-0.5">
                            {{ formatCurrency(equivalentIdrGrandTotal, 'IDR') }}
                        </span>
                        <span class="text-[10px] text-blue-600 block mt-1">
                            Kurs Terkunci: 1 {{ form.currency }} = {{ formatCurrency(form.exchange_rate, 'IDR') }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
