<script setup>
import { Plus } from '@lucide/vue'
import { formatCurrency } from '@/composables/useFormatter.js'
import PRItemRow from './PRItemRow.vue'

defineProps({
    form: {
        type: Object,
        required: true,
    },
    errors: {
        type: Object,
        default: () => ({}),
    },
    currenciesList: {
        type: Array,
        required: true,
    },
    totalEstimatedAmount: {
        type: Number,
        required: true,
    },
    itemOptions: {
        type: Array,
        required: true,
    },
    unitOptions: {
        type: Array,
        required: true,
    },
    accountingCategoryOptions: {
        type: Array,
        required: true,
    },
    accountingSubcategoryOptions: {
        type: Array,
        required: true,
    },
    accountingAccountOptions: {
        type: Array,
        required: true,
    },
    procurementRoute: {
        type: String,
        default: 'standard',
    },
    getItemError: {
        type: Function,
        required: true,
    },
})

defineEmits([
    'add-item',
    'remove-item',
    'search-items',
    'search-units',
    'search-accounting-categories',
    'search-accounting-subcategories',
    'search-accounting-accounts',
    'item-change',
    'mark-item-touched',
])
</script>

<template>
    <div class="space-y-6">
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 flex flex-col gap-5">
            <div>
                <h2 class="text-lg font-bold text-slate-900">Daftar Item Pengadaan</h2>
                <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Lengkapi barang, kuantitas, {{ procurementRoute === 'direct_supplier' ? 'harga satuan disepakati' : 'estimasi harga satuan' }}, dan spesifikasi teknis
                </p>
            </div>
            <div class="flex w-full flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <!-- Selector Mata Uang & Kurs -->
                <div class="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm">
                    <label for="currency-selector" class="font-semibold text-slate-600">Mata Uang:</label>
                    <select
                        id="currency-selector"
                        v-model="form.currency"
                        class="font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
                    >
                        <option
                            v-for="c in currenciesList"
                            :key="c.code"
                            :value="c.code"
                        >
                            {{ c.code }} ({{ c.symbol }})
                        </option>
                    </select>
                </div>
                <div v-if="form.currency !== 'IDR'" class="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm">
                    <span class="font-semibold text-slate-600">1 {{ form.currency }} = Rp</span>
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        v-model.number="form.exchange_rate"
                        class="w-24 font-mono font-bold text-slate-900 bg-transparent focus:outline-none text-right"
                    />
                </div>

                <!-- Total Estimasi Sementara -->
                <div class="inline-flex flex-wrap items-center gap-2.5 px-1 py-2 sm:ml-auto">
                    <span class="text-xs sm:text-sm font-semibold text-slate-600">{{ (procurementRoute === 'direct_supplier' || form.procurement_route === 'direct_supplier') ? 'Total Harga Disepakati:' : 'Total Estimasi:' }}</span>
                    <span class="font-mono tabular-nums text-base sm:text-lg font-bold text-slate-900">
                        {{ formatCurrency(totalEstimatedAmount, form.currency) }}
                    </span>
                </div>

                <button
                    type="button"
                    @click="$emit('add-item')"
                    class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                    <Plus class="w-4 h-4" />
                    <span>Tambah Item</span>
                </button>
            </div>
        </div>

        <p v-if="errors.items" role="alert" class="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{{ errors.items }}</p>

        <div class="space-y-6">
            <PRItemRow
                v-for="(row, index) in form.items"
                :key="row._uid"
                :row="row"
                :index="index"
                :total-items="form.items.length"
                :currency="form.currency"
                :procurement-route="procurementRoute || form.procurement_route || 'standard'"
                :item-options="itemOptions"
                :unit-options="unitOptions"
                :accounting-category-options="accountingCategoryOptions"
                :accounting-subcategory-options="accountingSubcategoryOptions"
                :accounting-account-options="accountingAccountOptions"
                :get-item-error="getItemError"
                :errors="errors"
                @remove="(idx) => $emit('remove-item', idx)"
                @search-items="(q) => $emit('search-items', q)"
                @search-units="(q) => $emit('search-units', q)"
                @search-accounting-categories="(q) => $emit('search-accounting-categories', q)"
                @search-accounting-subcategories="(q, catId) => $emit('search-accounting-subcategories', q, catId)"
                @search-accounting-accounts="(q, subId) => $emit('search-accounting-accounts', q, subId)"
                @item-change="(r, val) => $emit('item-change', r, val)"
                @mark-item-touched="(idx, f) => $emit('mark-item-touched', idx, f)"
            />
        </div>

        <button
            v-if="form.items.length >= 2"
            type="button"
            @click="$emit('add-item')"
            class="w-full py-3.5 border-2 border-dashed border-slate-300 hover:border-blue-600 hover:bg-blue-50/40 text-blue-700 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
            <Plus class="w-4 h-4" />
            <span>Tambah Item Lainnya</span>
        </button>
    </div>
</template>
