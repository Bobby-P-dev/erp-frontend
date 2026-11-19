<script setup>
import { computed, ref } from 'vue'
import { Trash2, Package, ExternalLink, ChevronDown, Landmark } from '@lucide/vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { formatCurrency, parseCurrency } from '@/composables/useFormatter.js'

const props = defineProps({
    errors: { type: Object, default: () => ({}) },
    row: {
        type: Object,
        required: true,
    },
    index: {
        type: Number,
        required: true,
    },
    totalItems: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'IDR',
    },
    procurementRoute: {
        type: String,
        default: 'standard',
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
    getItemError: {
        type: Function,
        required: true,
    },
})

const emit = defineEmits([
    'remove',
    'search-items',
    'search-units',
    'search-accounting-categories',
    'search-accounting-subcategories',
    'search-accounting-accounts',
    'item-change',
    'mark-item-touched',
])

const isPriceFocused = ref(false)
const rawPriceText = ref('')

const displayPrice = computed(() => {
    const raw = props.row.estimated_price
    if (raw === '' || raw === null || raw === undefined) return ''
    const num = Number(raw)
    if (isNaN(num)) return String(raw)
    const isIdr = String(props.currency || 'IDR').toUpperCase() === 'IDR'
    return num.toLocaleString('id-ID', {
        maximumFractionDigits: isIdr ? 0 : 2
    })
})

const handlePriceFocus = () => {
    isPriceFocused.value = true
    const raw = props.row.estimated_price
    rawPriceText.value = raw !== '' && raw !== null && raw !== undefined ? String(raw) : ''
}

const handlePriceInput = (event) => {
    rawPriceText.value = event.target.value
    if (!rawPriceText.value.trim()) {
        props.row.estimated_price = ''
    } else {
        const parsed = parseCurrency(rawPriceText.value)
        if (parsed !== null) {
            props.row.estimated_price = parsed
        }
    }
    emit('mark-item-touched', props.index, 'estimated_price')
}

const handlePriceBlur = () => {
    isPriceFocused.value = false
    emit('mark-item-touched', props.index, 'estimated_price')
}

const priceLabel = computed(() => {
    return props.procurementRoute === 'direct_supplier'
        ? `Harga Disepakati (${props.currency})`
        : `Estimasi Harga (${props.currency})`
})

const filteredSubcategoryOptions = computed(() => {
    if (!props.row.accounting_category_id) return props.accountingSubcategoryOptions
    return props.accountingSubcategoryOptions.filter(
        opt => !opt.categoryId || opt.categoryId == props.row.accounting_category_id
    )
})

const filteredAccountOptions = computed(() => {
    if (!props.row.accounting_subcategory_id) return props.accountingAccountOptions
    return props.accountingAccountOptions.filter(
        opt => !opt.subcategoryId || opt.subcategoryId == props.row.accounting_subcategory_id
    )
})

const handleAccountingCategoryChange = (val) => {
    props.row.accounting_subcategory_id = null
    props.row.accounting_account_id = null
    emit('search-accounting-subcategories', '', val || '')
}

const handleAccountingSubcategoryChange = (val) => {
    props.row.accounting_account_id = null
    emit('search-accounting-accounts', '', val || '')
}

const localAccountingOpen = ref(Boolean(props.row.showAccounting))
const hasAccountingSelection = computed(() =>
    Boolean(props.row.accounting_category_id || props.row.accounting_subcategory_id || props.row.accounting_account_id)
)
const hasAccountingError = computed(() =>
    Boolean(
        props.errors[`items.${props.index}.accounting_category_id`] ||
        props.errors[`items.${props.index}.accounting_subcategory_id`] ||
        props.errors[`items.${props.index}.accounting_account_id`]
    )
)
const isAccountingExpanded = computed(() =>
    Boolean(localAccountingOpen.value || props.row.showAccounting || hasAccountingSelection.value || hasAccountingError.value)
)
const toggleAccountingPanel = () => {
    const next = !isAccountingExpanded.value
    localAccountingOpen.value = next
    props.row.showAccounting = next
}
</script>

<template>
    <div class="pr-item min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-5">
        <!-- Item Header Bar -->
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div class="flex flex-wrap items-center gap-3">
                <span class="font-mono text-sm font-bold text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
                    Item {{ String(index + 1).padStart(2, '0') }}
                </span>
                <div class="inline-flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs sm:text-sm font-semibold">
                    <button
                        type="button"
                        @click="row.entry_mode = 'catalog'"
                        :aria-pressed="row.entry_mode === 'catalog'"
                        :class="row.entry_mode === 'catalog' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                        class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                        Katalog Master
                    </button>
                    <button
                        type="button"
                        @click="row.entry_mode = 'custom'"
                        :aria-pressed="row.entry_mode === 'custom'"
                        :class="row.entry_mode === 'custom' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
                        class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                        Non-Katalog (Manual)
                    </button>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <!-- Subtotal per Item -->
                <div class="text-right">
                    <span class="text-xs text-slate-500 block">Subtotal Item:</span>
                    <span class="font-mono tabular-nums text-sm sm:text-base font-bold text-blue-700">
                        {{ formatCurrency((Number(row.quantity) || 0) * (Number(row.estimated_price) || 0), currency) }}
                    </span>
                </div>

                <button
                    type="button"
                    @click="$emit('remove', index)"
                    :disabled="totalItems <= 1"
                    :class="[
                        'inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl transition-colors',
                        totalItems > 1
                            ? 'text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer'
                            : 'text-slate-300 border border-slate-200 cursor-not-allowed'
                    ]"
                    :title="totalItems <= 1 ? 'Minimal harus ada 1 item' : 'Hapus item ini'"
                >
                    <Trash2 class="w-4 h-4" />
                    <span>Hapus</span>
                </button>
            </div>
        </div>

        <!-- 1. DATA UTAMA BARANG -->
        <div>
            <h3 class="text-sm sm:text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Package class="w-4 h-4 text-blue-600 shrink-0" />
                <span>Data Barang & Kuantitas</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-6 xl:grid-cols-12 gap-4 items-start">
                <!-- Nama Barang / Pencarian Katalog -->
                <div v-if="row.entry_mode === 'catalog'" class="sm:col-span-6 xl:col-span-5">
                    <SearchableSelect
                        v-model="row.item_id"
                        :options="itemOptions"
                        label="Pencarian Barang Master"
                        placeholder="Ketik kode atau nama barang katalog..."
                        :error="getItemError(index, 'item_id')"
                        :searchable="true"
                        @search="(q) => $emit('search-items', q)"
                        @update:modelValue="(val) => { $emit('item-change', row, val); $emit('mark-item-touched', index, 'item_id'); }"
                        required
                    />
                </div>
                <div v-else class="sm:col-span-6 xl:col-span-5">
                    <BaseInput
                        v-model="row.item_name"
                        label="Nama Barang / Jasa"
                        placeholder="Contoh: Mouse wireless silent hitam"
                        :error="getItemError(index, 'item_name')"
                        @focusout="$emit('mark-item-touched', index, 'item_name')"
                        @input="$emit('mark-item-touched', index, 'item_name')"
                        required
                    />
                </div>

                <!-- Satuan -->
                <div class="sm:col-span-2 xl:col-span-2">
                    <SearchableSelect
                        v-model="row.unit_id"
                        :options="unitOptions"
                        label="Satuan"
                        placeholder="Pilih..."
                        :error="getItemError(index, 'unit_id')"
                        :searchable="true"
                        @search="(q) => $emit('search-units', q)"
                        @update:modelValue="() => $emit('mark-item-touched', index, 'unit_id')"
                        required
                    />
                </div>

                <!-- Jumlah -->
                <div class="sm:col-span-2 xl:col-span-2">
                    <BaseInput
                        v-model="row.quantity"
                        type="number"
                        min="0.001"
                        step="any"
                        label="Jumlah"
                        placeholder="1"
                        :error="getItemError(index, 'quantity')"
                        @focusout="$emit('mark-item-touched', index, 'quantity')"
                        @input="$emit('mark-item-touched', index, 'quantity')"
                        required
                    />
                </div>

                <!-- Harga Satuan (dengan format ribuan saat blur + pratinjau angka) -->
                <div class="sm:col-span-2 xl:col-span-3">
                    <label :for="`item-price-${index}`" class="block text-sm font-semibold text-slate-700 mb-2">
                        {{ priceLabel }} <span class="text-rose-500">*</span>
                    </label>
                    <input
                        :id="`item-price-${index}`"
                        :value="isPriceFocused ? rawPriceText : displayPrice"
                        type="text"
                        inputmode="decimal"
                        placeholder="0"
                        :aria-invalid="Boolean(getItemError(index, 'estimated_price'))"
                        @focus="handlePriceFocus"
                        @input="handlePriceInput"
                        @blur="handlePriceBlur"
                        class="w-full px-4 py-3 sm:py-3.5 bg-slate-50 border rounded-xl text-base font-mono tabular-nums transition-all font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white"
                        :class="[
                            getItemError(index, 'estimated_price')
                                ? 'border-rose-300 ring-1 ring-rose-400 bg-rose-50/20 text-rose-900 focus:ring-2 focus:ring-rose-400/50 focus:border-rose-500'
                                : 'border-slate-300 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
                        ]"
                    />
                    <p v-if="getItemError(index, 'estimated_price')" class="text-sm text-rose-600 mt-1.5 font-medium">
                        {{ getItemError(index, 'estimated_price') }}
                    </p>
                    <p v-else-if="isPriceFocused && Number(row.estimated_price) > 0" class="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                        = {{ formatCurrency(Number(row.estimated_price), currency) }}
                    </p>
                </div>
            </div>
        </div>

        <!-- 2. SPESIFIKASI & CATATAN TEKNIS (Terbuka langsung agar mudah diisi user baru) -->
        <div class="pt-4 border-t border-slate-100 space-y-3.5">
            <div>
                <h4 class="text-sm font-semibold text-slate-800">
                    Spesifikasi, Referensi & Catatan Barang <span class="text-xs font-normal text-slate-500 ml-1">(Opsional)</span>
                </h4>
                <p class="text-xs text-slate-500 mt-0.5">
                    Cantumkan tipe, dimensi, merk yang diinginkan, tautan katalog online, atau catatan untuk tim purchasing.
                </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div class="md:col-span-12">
                    <BaseInput
                        v-model="row.detail_name"
                        label="Detail Spesifikasi Teknis"
                        placeholder="Contoh: M8 x 40mm SS304, RAM 16GB SSD 512GB, warna hitam size L"
                        :error="errors[`items.${index}.detail_name`] || getItemError(index, 'detail_name')"
                        @focusout="$emit('mark-item-touched', index, 'detail_name')"
                    />
                </div>
                <div class="md:col-span-6">
                    <BaseInput
                        v-model="row.reference_url"
                        label="Tautan / Link Referensi Produk"
                        placeholder="Contoh: https://www.tokopedia.com/product/..."
                        :error="errors[`items.${index}.reference_url`] || getItemError(index, 'reference_url')"
                        @focusout="$emit('mark-item-touched', index, 'reference_url')"
                    />
                    <div v-if="row.reference_url" class="mt-1.5">
                        <a
                            :href="row.reference_url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-semibold"
                        >
                            <span>Buka link referensi</span>
                            <ExternalLink class="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
                <div class="md:col-span-6">
                    <BaseInput
                        v-model="row.notes"
                        label="Catatan Khusus untuk Pembelian"
                        placeholder="Contoh: Wajib bergaransi resmi, sertakan sertifikat kalibrasi"
                        :error="errors[`items.${index}.notes`] || getItemError(index, 'notes')"
                        @focusout="$emit('mark-item-touched', index, 'notes')"
                    />
                </div>
            </div>
        </div>

        <!-- 3. KLASIFIKASI AKUN AKUNTANSI (Tombol interaktif yang jelas, tidak tersembunyi) -->
        <div class="pt-4 border-t border-slate-100">
            <button
                type="button"
                @click="toggleAccountingPanel"
                :aria-expanded="isAccountingExpanded"
                class="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
            >
                <div class="flex items-center gap-3 min-w-0">
                    <span class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0">
                        <Landmark class="w-4 h-4" />
                    </span>
                    <div class="min-w-0">
                        <span class="block text-sm font-semibold text-slate-800">
                            Klasifikasi Akun Akuntansi
                            <span
                                class="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
                                :class="hasAccountingSelection ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-200/70 text-slate-600'"
                            >
                                {{ hasAccountingSelection ? 'Sudah dipilih' : 'Opsional' }}
                            </span>
                        </span>
                        <span class="block text-xs text-slate-500 mt-0.5">
                            Boleh dikosongkan — akan dilengkapi otomatis oleh tim Keuangan / Purchasing.
                        </span>
                    </div>
                </div>
                <ChevronDown
                    class="w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200"
                    :class="isAccountingExpanded ? 'rotate-180 text-blue-600' : ''"
                />
            </button>

            <div v-if="isAccountingExpanded" class="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <SearchableSelect
                        v-model="row.accounting_category_id"
                        :options="accountingCategoryOptions"
                        :error="errors[`items.${index}.accounting_category_id`]"
                        label="Kategori Akun (opsional)"
                        placeholder="Pilih Kategori..."
                        :searchable="true"
                        :clearable="true"
                        @search="(q) => $emit('search-accounting-categories', q)"
                        @change="handleAccountingCategoryChange"
                    />
                </div>
                <div>
                    <SearchableSelect
                        v-model="row.accounting_subcategory_id"
                        :options="filteredSubcategoryOptions"
                        :error="errors[`items.${index}.accounting_subcategory_id`]"
                        label="Subkategori Akun (opsional)"
                        placeholder="Pilih Subkategori..."
                        :searchable="true"
                        :clearable="true"
                        @search="(q) => $emit('search-accounting-subcategories', q, row.accounting_category_id || '')"
                        @change="handleAccountingSubcategoryChange"
                    />
                </div>
                <div>
                    <SearchableSelect
                        v-model="row.accounting_account_id"
                        :options="filteredAccountOptions"
                        :error="errors[`items.${index}.accounting_account_id`]"
                        label="Akun Beban / Aset (opsional)"
                        placeholder="Pilih Akun..."
                        :searchable="true"
                        :clearable="true"
                        @search="(q) => $emit('search-accounting-accounts', q, row.accounting_subcategory_id || '')"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pr-item :deep(.grid > div) { min-width: 0; }
.pr-item :deep(label) { line-height: 1.4; font-size: 0.875rem; font-weight: 600; }
@media (max-width: 639px) {
    .pr-item > div:first-child > div { width: 100%; justify-content: space-between; }
    .pr-item > div:first-child .inline-flex { flex-wrap: wrap; }
}
</style>
