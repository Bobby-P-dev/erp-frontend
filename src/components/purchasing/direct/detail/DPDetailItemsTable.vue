<script setup>
import { formatCurrency } from '../../../../utils/stringUtils.js'
import { Package } from '@lucide/vue'
import DPItemDescription from './DPItemDescription.vue'

defineProps({
    dp: { type: Object, required: true }
})
</script>

<template>
    <div class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <Package class="w-4 h-4 text-blue-600" />
                <h3 class="text-sm font-semibold text-slate-900">Barang pembelian</h3>
            </div>
            <span class="text-xs font-semibold text-slate-500">
                {{ dp.items?.length || 0 }} barang
            </span>
        </div>

        <ul class="divide-y divide-slate-100 sm:hidden">
            <li v-for="item in dp.items" :key="item.id" class="space-y-4 p-5">
                <DPItemDescription :item="item" :currency="dp.currency || 'IDR'" show-price />
                <dl class="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-3 text-sm">
                    <div><dt class="text-xs text-slate-500">Jumlah</dt><dd class="mt-1 text-slate-800">{{ Number(item.quantity).toLocaleString('id-ID') }} {{ item.unit?.code || item.unit?.name || '' }}</dd></div>
                    <div class="text-right"><dt class="text-xs text-slate-500">Subtotal</dt><dd class="mt-1 break-words font-medium text-slate-900 tabular-nums">{{ formatCurrency(item.total ?? item.subtotal, dp.currency) }}</dd></div>
                </dl>
            </li>
            <li v-if="!dp.items?.length" class="p-8 text-center text-sm text-slate-500">Belum ada barang.</li>
        </ul>
        <div class="hidden overflow-x-auto sm:block">
        <table class="w-full text-left text-sm">
            <thead class="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-500"><tr><th class="px-5 py-3 font-medium">Barang</th><th class="px-5 py-3 text-right font-medium">Jumlah</th><th class="hidden px-5 py-3 text-right font-medium sm:table-cell">Harga satuan</th><th class="px-5 py-3 text-right font-medium">Subtotal</th></tr></thead>
            <tbody class="divide-y divide-slate-100">
                <tr v-for="item in dp.items" :key="item.id">
                    <td class="px-5 py-4 min-w-40 align-top">
                        <DPItemDescription :item="item" :currency="dp.currency || 'IDR'" />
                    </td>
                    <td class="px-5 py-4 text-right tabular-nums align-top whitespace-nowrap">{{ Number(item.quantity).toLocaleString('id-ID') }}<span class="mt-1 block text-xs text-slate-500">{{ item.unit?.code || item.unit?.name || '—' }}</span></td>
                    <td class="hidden px-5 py-4 text-right tabular-nums align-top whitespace-nowrap sm:table-cell">{{ formatCurrency(item.unit_price, dp.currency) }}</td>
                    <td class="px-5 py-4 text-right tabular-nums align-top font-medium whitespace-nowrap">{{ formatCurrency(item.total ?? item.subtotal, dp.currency) }}</td>
                </tr>
                <tr v-if="!dp.items?.length"><td colspan="4" class="p-8 text-center text-slate-500">Belum ada barang.</td></tr>
            </tbody>
        </table>
        </div>
    </div>
</template>
