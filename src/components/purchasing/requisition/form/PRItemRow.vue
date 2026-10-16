<script setup>
import { Trash2, Package, ClipboardList, Wallet, ExternalLink } from '@lucide/vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { formatCurrency } from '@/composables/useFormatter.js'

defineProps({
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

defineEmits([
    'remove',
    'search-items',
    'search-units',
    'search-accounting-categories',
    'item-change',
    'mark-item-touched',
])
</script>

<template>
    <div class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 space-y-6 shadow-xs transition-all">
        <!-- Item Header Bar -->
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div class="flex flex-wrap items-center gap-3">
                <span class="font-mono text-sm sm:text-base font-bold text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
                    Item {{ String(index + 1).padStart(2, '0') }}
                </span>
                <div class="inline-flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs sm:text-sm font-bold">
                    <button
                        type="button"
                        @click="row.entry_mode = 'catalog'"
                        :class="row.entry_mode === 'catalog' ? 'bg-white text-[#014BAA] shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                        class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                        Katalog Master
                    </button>
                    <button
                        type="button"
                        @click="row.entry_mode = 'custom'"
                        :class="row.entry_mode === 'custom' ? 'bg-white text-[#014BAA] shadow-xs' : 'text-slate-600 hover:text-slate-900'"
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
                    <span class="font-mono text-sm sm:text-base font-bold text-[#014BAA]">
                        {{ formatCurrency((Number(row.quantity) || 0) * (Number(row.estimated_price) || 0), currency) }}
                    </span>
                </div>

                <button
                    type="button"
                    @click="$emit('remove', index)"
                    :disabled="totalItems <= 1"
                    :class="[
                        'inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3 py-2 rounded-xl transition-colors',
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
                <Package class="w-4 h-4 text-[#014BAA]" />
                Data Barang & Kuantitas
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <!-- Nama Barang / Pencarian Katalog -->
                <div v-if="row.entry_mode === 'catalog'" class="md:col-span-6">
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
                <div v-else class="md:col-span-6">
                    <BaseInput
                        v-model="row.item_name"
                        label="Nama Barang / Jasa"
                        placeholder="Contoh: Mouse wireless silent hitam"
                        :error="getItemError(index, 'item_name')"
                        @blur="$emit('mark-item-touched', index, 'item_name')"
                        @input="$emit('mark-item-touched', index, 'item_name')"
                        required
                    />
                </div>

                <!-- Satuan -->
                <div class="md:col-span-2">
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
                <div class="md:col-span-2">
                    <BaseInput
                        v-model="row.quantity"
                        type="number"
                        min="0.001"
                        step="any"
                        label="Jumlah"
                        placeholder="1"
                        :error="getItemError(index, 'quantity')"
                        @blur="$emit('mark-item-touched', index, 'quantity')"
                        @input="$emit('mark-item-touched', index, 'quantity')"
                        required
                    />
                </div>

                <!-- Estimasi Harga Satuan -->
                <div class="md:col-span-2">
                    <BaseInput
                        v-model="row.estimated_price"
                        type="number"
                        min="0"
                        step="any"
                        :label="`Harga (${currency})`"
                        placeholder="0"
                        :error="getItemError(index, 'estimated_price')"
                        @blur="$emit('mark-item-touched', index, 'estimated_price')"
                        @input="$emit('mark-item-touched', index, 'estimated_price')"
                        required
                    />
                </div>
            </div>
        </div>

        <!-- 2. SPESIFIKASI & CATATAN TEKNIS -->
        <div class="pt-5 border-t border-slate-100">
            <h3 class="text-sm sm:text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <ClipboardList class="w-4 h-4 text-[#014BAA]" />
                Spesifikasi Teknis & Referensi Barang
            </h3>
            <p class="text-xs sm:text-sm text-slate-500 mb-3.5">
                Cantumkan rincian tipe, dimensi, merk yang diinginkan, atau tautan katalog web
            </p>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div class="md:col-span-12">
                    <BaseInput
                        v-model="row.detail_name"
                        label="Detail Spesifikasi Teknis"
                        placeholder="Contoh: M8 x 40mm SS304, RAM 16GB SSD 512GB, warna hitam size L"
                        :error="getItemError(index, 'detail_name')"
                        @blur="$emit('mark-item-touched', index, 'detail_name')"
                    />
                </div>
                <div class="md:col-span-6">
                    <BaseInput
                        v-model="row.reference_url"
                        label="Tautan / Link Referensi Produk (opsional)"
                        placeholder="Contoh: https://www.tokopedia.com/product/..."
                        :error="getItemError(index, 'reference_url')"
                        @blur="$emit('mark-item-touched', index, 'reference_url')"
                    />
                    <div v-if="row.reference_url" class="mt-1.5">
                        <a
                            :href="row.reference_url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-1.5 text-xs text-[#014BAA] hover:underline font-bold"
                        >
                            <span>Buka link referensi</span>
                            <ExternalLink class="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
                <div class="md:col-span-6">
                    <BaseInput
                        v-model="row.notes"
                        label="Catatan Khusus untuk Pembelian (opsional)"
                        placeholder="Contoh: Wajib bergaransi resmi, sertakan sertifikat kalibrasi"
                        :error="getItemError(index, 'notes')"
                        @blur="$emit('mark-item-touched', index, 'notes')"
                    />
                </div>
            </div>
        </div>

        <!-- 3. KLASIFIKASI AKUN AKUNTANSI -->
        <div class="pt-5 border-t border-slate-100 bg-slate-50/70 border border-slate-200 rounded-xl p-4 sm:p-5">
            <div class="mb-3.5">
                <h3 class="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                    <Wallet class="w-4 h-4 text-[#014BAA]" />
                    Klasifikasi Akun Akuntansi (Opsional)
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Boleh dikosongkan jika Anda tidak mengetahui akunnya — akan ditentukan oleh tim Keuangan / Purchasing.
                </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <SearchableSelect
                        v-model="row.accounting_category_id"
                        :options="accountingCategoryOptions"
                        label="Kategori Akun (opsional)"
                        placeholder="Pilih Kategori..."
                        :searchable="true"
                        @search="(q) => $emit('search-accounting-categories', q)"
                    />
                </div>
                <div>
                    <SearchableSelect
                        v-model="row.accounting_subcategory_id"
                        :options="accountingSubcategoryOptions"
                        label="Subkategori Akun (opsional)"
                        placeholder="Pilih Subkategori..."
                        :searchable="true"
                    />
                </div>
                <div>
                    <SearchableSelect
                        v-model="row.accounting_account_id"
                        :options="accountingAccountOptions"
                        label="Akun Beban / Aset (opsional)"
                        placeholder="Pilih Akun..."
                        :searchable="true"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
