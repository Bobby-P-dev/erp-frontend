<script setup>
import BaseTable from '../../../ui/BaseTable.vue'
import { formatCurrency } from '../../../../utils/stringUtils.js'
import { Package, ExternalLink } from '@lucide/vue'

defineProps({
    dp: { type: Object, required: true },
    tableColumns: { type: Array, required: true }
})
</script>

<template>
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <Package class="w-4 h-4 text-blue-600" />
                <h3 class="text-sm font-bold text-slate-900">Daftar Barang yang Dibeli</h3>
            </div>
            <span class="text-xs font-semibold text-slate-500">
                {{ dp.items?.length || 0 }} Item Transaksi
            </span>
        </div>

        <BaseTable :columns="tableColumns">
            <tr 
                v-for="(item, idx) in dp.items" 
                :key="item.id"
                class="hover:bg-slate-50/70 transition-colors"
            >
                <!-- No -->
                <td class="px-6 py-4 text-sm text-slate-500 text-center font-medium">
                    {{ idx + 1 }}
                </td>

                <!-- Item details -->
                <td class="px-6 py-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-slate-900 text-sm">
                                {{ item.item?.name || item.description || 'Item Pengadaan' }}
                            </span>
                            <span 
                                v-if="!item.item_id" 
                                class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                            >
                                Non-Katalog
                            </span>
                            <span 
                                v-else-if="item.item?.code" 
                                class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600"
                            >
                                {{ item.item.code }}
                            </span>
                        </div>

                        <!-- Product link -->
                        <a 
                            v-if="item.product_url" 
                            :href="item.product_url" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                        >
                            <ExternalLink class="w-3 h-3" />
                            <span>Buka Link Produk</span>
                        </a>
                    </div>
                </td>

                <!-- Unit -->
                <td class="px-6 py-4 text-center text-xs font-semibold text-gray-700">
                    {{ item.unit?.code || item.unit?.name || '-' }}
                </td>

                <!-- Qty -->
                <td class="px-6 py-4 text-right font-black text-gray-900 text-sm">
                    {{ Number(item.quantity).toLocaleString('id-ID') }}
                </td>

                <!-- Unit Price -->
                <td class="px-6 py-4 text-right font-mono text-gray-800 text-xs">
                    {{ formatCurrency(item.unit_price, dp.currency) }}
                </td>

                <!-- Item Discount -->
                <td class="px-6 py-4 text-right font-mono text-emerald-700 text-xs">
                    {{ Number(item.discount_amount) > 0 ? formatCurrency(item.discount_amount, dp.currency) : '-' }}
                </td>

                <!-- Subtotal -->
                <td class="px-6 py-4 text-right font-black font-mono text-gray-900 text-sm">
                    {{ formatCurrency(item.total || item.subtotal, dp.currency) }}
                </td>

                <!-- Notes -->
                <td class="px-6 py-4 text-xs text-gray-500 italic">
                    {{ item.notes || '-' }}
                </td>
            </tr>
        </BaseTable>
    </div>
</template>
