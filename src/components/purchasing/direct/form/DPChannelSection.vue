<script setup>
import { Store, Building2, ShoppingCart } from '@lucide/vue'
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
        icon: Store,
    },
    {
        id: 'direct_supplier',
        label: 'Supplier Rekanan',
        desc: 'Vendor terdaftar di master data',
        icon: Building2,
    },
    {
        id: 'retail_store',
        label: 'Toko Retail / Fisik',
        desc: 'Ace Hardware, Mitra10, toko lokal',
        icon: ShoppingCart,
    },
]
</script>

<template>
    <div class="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div>
                <h3 class="text-sm font-bold text-slate-900">Saluran Pembelian & Identitas Toko</h3>
                <p class="text-xs text-slate-500">Pilih saluran tempat pembelian barang dilakukan.</p>
            </div>

            <!-- Compact Segmented Channel Selector -->
            <div class="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/70 self-start">
                <button
                    v-for="ch in channels"
                    :key="ch.id"
                    type="button"
                    @click="form.purchase_channel = ch.id"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    :class="form.purchase_channel === ch.id
                        ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/60 font-bold'
                        : 'text-slate-600 hover:text-slate-900'"
                >
                    <component :is="ch.icon" class="w-3.5 h-3.5" :class="form.purchase_channel === ch.id ? 'text-blue-600' : 'text-slate-400'" />
                    <span>{{ ch.label }}</span>
                </button>
            </div>
        </div>

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
                            v-model="form.marketplace_name" 
                            placeholder="Tokopedia, Shopee..."
                            class="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                        <div class="flex items-center gap-1 flex-wrap mt-1.5">
                            <button 
                                type="button" 
                                v-for="mp in popularMarketplaces" 
                                :key="mp" 
                                @click="form.marketplace_name = mp"
                                class="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                :class="form.marketplace_name === mp ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'"
                            >
                                {{ mp }}
                            </button>
                        </div>
                    </div>

                    <div class="md:col-span-4">
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                            Nama Toko / Official Store <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            v-model="form.merchant_name" 
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
                            placeholder="Contoh: Ace Hardware Living World, Mitra10"
                            class="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">Lokasi / Website Toko (Opsional)</label>
                        <input 
                            type="text" 
                            v-model="form.store_url" 
                            placeholder="Contoh: Jl. Boulevard No. 12 atau URL maps"
                            class="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
