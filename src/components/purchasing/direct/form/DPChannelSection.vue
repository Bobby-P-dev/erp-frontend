<script setup>
import { Store, Building2, ShoppingCart, Check } from '@lucide/vue'
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
</script>

<template>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                2
            </div>
            <div>
                <h3 class="text-base font-bold text-gray-900">Saluran Pembelian & Rekanan (Purchase Channel)</h3>
                <p class="text-xs text-gray-500">Tentukan platform atau tempat pembelian barang ini dilakukan.</p>
            </div>
        </div>

        <!-- Channel Option Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Marketplace Online -->
            <div 
                @click="form.purchase_channel = 'marketplace'"
                class="p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                :class="form.purchase_channel === 'marketplace' ? 'border-orange-500 bg-orange-50/20 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'"
            >
                <div class="flex items-start justify-between">
                    <div class="p-2.5 rounded-xl" :class="form.purchase_channel === 'marketplace' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'">
                        <Store class="w-5 h-5" />
                    </div>
                    <span v-if="form.purchase_channel === 'marketplace'" class="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs">
                        <Check class="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                </div>
                <div class="mt-3">
                    <h4 class="font-bold text-sm text-gray-900">Marketplace Online</h4>
                    <p class="text-[11px] text-gray-500 mt-1">Pembelian melalui Tokopedia, Shopee, Blibli, Lazada, dsb.</p>
                </div>
            </div>

            <!-- Direct Supplier -->
            <div 
                @click="form.purchase_channel = 'direct_supplier'"
                class="p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                :class="form.purchase_channel === 'direct_supplier' ? 'border-indigo-600 bg-indigo-50/20 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'"
            >
                <div class="flex items-start justify-between">
                    <div class="p-2.5 rounded-xl" :class="form.purchase_channel === 'direct_supplier' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'">
                        <Building2 class="w-5 h-5" />
                    </div>
                    <span v-if="form.purchase_channel === 'direct_supplier'" class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                        <Check class="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                </div>
                <div class="mt-3">
                    <h4 class="font-bold text-sm text-gray-900">Supplier Rekanan Resmi</h4>
                    <p class="text-[11px] text-gray-500 mt-1">Pembelian langsung ke supplier/vendor terdaftar di master data.</p>
                </div>
            </div>

            <!-- Retail Store -->
            <div 
                @click="form.purchase_channel = 'retail_store'"
                class="p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between"
                :class="form.purchase_channel === 'retail_store' ? 'border-emerald-600 bg-emerald-50/20 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'"
            >
                <div class="flex items-start justify-between">
                    <div class="p-2.5 rounded-xl" :class="form.purchase_channel === 'retail_store' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'">
                        <ShoppingCart class="w-5 h-5" />
                    </div>
                    <span v-if="form.purchase_channel === 'retail_store'" class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                        <Check class="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                </div>
                <div class="mt-3">
                    <h4 class="font-bold text-sm text-gray-900">Toko Retail / Fisik</h4>
                    <p class="text-[11px] text-gray-500 mt-1">Toko fisik offline seperti Ace Hardware, Mitra10, toko lokal.</p>
                </div>
            </div>
        </div>

        <!-- Channel Specific Input Fields -->
        <div class="pt-4 border-t border-gray-100 space-y-4">
            <!-- Marketplace Fields -->
            <template v-if="form.purchase_channel === 'marketplace'">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-2">
                            Platform Marketplace <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            v-model="form.marketplace_name" 
                            placeholder="Contoh: Tokopedia, Shopee"
                            class="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500"
                        />
                        <!-- Popular marketplace chips -->
                        <div class="flex items-center gap-1.5 flex-wrap mt-2">
                            <span class="text-[10px] text-gray-400">Pilihan cepat:</span>
                            <button 
                                type="button" 
                                v-for="mp in popularMarketplaces" 
                                :key="mp" 
                                @click="form.marketplace_name = mp"
                                class="px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors"
                                :class="form.marketplace_name === mp ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'"
                            >
                                {{ mp }}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-2">
                            Nama Toko / Official Store <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            v-model="form.merchant_name" 
                            placeholder="Contoh: Logitech Official Store, Toko Elektronik Jaya"
                            class="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500"
                        />
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-2">Tautan Profil Toko (Store URL)</label>
                    <input 
                        type="url" 
                        v-model="form.store_url" 
                        placeholder="https://www.tokopedia.com/logitechofficial"
                        class="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 font-mono text-xs"
                    />
                </div>
            </template>

            <!-- Direct Supplier Field -->
            <template v-else-if="form.purchase_channel === 'direct_supplier'">
                <div>
                    <SearchableSelect
                        v-model="form.supplier_id"
                        label="Pilih Supplier Terdaftar"
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
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-2">
                            Nama Toko Retail / Supermarket <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            v-model="form.merchant_name" 
                            placeholder="Contoh: Ace Hardware Living World, Toko Bangunan Subur"
                            class="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-2">Website / Lokasi Toko</label>
                        <input 
                            type="text" 
                            v-model="form.store_url" 
                            placeholder="Contoh: https://www.acehardware.co.id atau Jl. Boulevard No. 12"
                            class="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 text-xs"
                        />
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
