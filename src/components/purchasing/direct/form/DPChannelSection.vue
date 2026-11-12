<script setup>
import SearchableSelect from '@/components/ui/SearchableSelect.vue'

defineProps({
    form: {
        type: Object,
        required: true,
    },
    popularMarketplaces: {
        type: Array,
        required: true,
    },
    supplierOptions: {
        type: Array,
        required: true,
    },
    isLoadingSuppliers: {
        type: Boolean,
        default: false,
    },
})

const channels = [
    {
        id: 'marketplace',
        label: 'Marketplace Online',
        desc: 'Tokopedia, Shopee, Blibli, dll',
    },
    {
        id: 'direct_supplier',
        label: 'Supplier Rekanan',
        desc: 'Vendor terdaftar di master data',
    },
    {
        id: 'retail_store',
        label: 'Toko Retail / Fisik',
        desc: 'Ace Hardware, Mitra10, toko lokal',
    },
]
</script>

<template>
    <div class="dp-section bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div>
                <h3 class="text-sm font-bold text-slate-900">Toko & saluran pembelian</h3>
                <p class="text-xs text-slate-500 mt-2">Pilih tempat Anda membeli, lalu lengkapi identitas tokonya.</p>
            </div>

        </div>

        <fieldset class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <legend class="sr-only">Saluran pembelian</legend>
            <label v-for="ch in channels" :key="ch.id" class="flex items-center gap-3 rounded-xl border p-4 cursor-pointer" :class="form.purchase_channel === ch.id ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200 hover:bg-slate-50'">
                <input type="radio" name="purchase-channel" :value="ch.id" v-model="form.purchase_channel" class="size-4 shrink-0 accent-[#014BAA]" />
                <span class="min-w-0"><span class="block text-sm text-slate-800">{{ ch.label }}</span><span class="block text-xs text-slate-500 mt-1 leading-relaxed">{{ ch.desc }}</span></span>
            </label>
        </fieldset>

        <!-- Channel Specific Input Fields -->
        <div class="space-y-3.5">
            <!-- Marketplace Fields -->
            <template v-if="form.purchase_channel === 'marketplace'">
                <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                    <div class="md:col-span-4">
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                            Platform Marketplace <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            aria-label="Platform marketplace"
                            v-model="form.marketplace_name" 
                            placeholder="Tokopedia, Shopee..."
                            class="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                    </div>

                    <div class="md:col-span-4">
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                            Nama Toko / Official Store <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            v-model="form.merchant_name" 
                            aria-label="Nama toko marketplace"
                            placeholder="Contoh: Logitech Official Store"
                            class="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                    </div>

                    <div class="md:col-span-4">
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                            Tautan Toko (Opsional)
                        </label>
                        <input 
                            type="url" 
                            v-model="form.store_url" 
                            aria-label="Tautan toko"
                            placeholder="https://tokopedia.com/..."
                            class="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                        />
                    </div>
                </div>
            </template>

            <!-- Direct Supplier Field -->
            <template v-else-if="form.purchase_channel === 'direct_supplier'">
                <div>
                    <SearchableSelect
                        v-model="form.supplier_id"
                        label="Pilih Supplier Rekanan Terdaftar"
                        :options="supplierOptions"
                        placeholder="-- Cari atau Pilih Supplier Rekanan --"
                        searchPlaceholder="Ketik nama atau kode supplier..."
                        required
                        :loading="isLoadingSuppliers"
                        clearable
                    />
                </div>
            </template>

            <!-- Retail Store Field -->
            <template v-else-if="form.purchase_channel === 'retail_store'">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                            Nama Toko Retail / Fisik <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            v-model="form.merchant_name" 
                            aria-label="Nama toko retail"
                            placeholder="Contoh: Ace Hardware Living World, Mitra10"
                            class="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">Lokasi / Website Toko (Opsional)</label>
                        <input 
                            type="text" 
                            v-model="form.store_url" 
                            aria-label="Lokasi atau website toko"
                            placeholder="Contoh: Jl. Boulevard No. 12 atau URL maps"
                            class="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
