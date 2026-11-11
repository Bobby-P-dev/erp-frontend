<script setup>
import { formatCurrency } from '@/composables/useFormatter.js'

defineProps({
    items: {
        type: Array,
        required: true,
    },
})
</script>

<template>
    <div class="bg-white rounded-2xl border border-[#E5EAF1] shadow-xs overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#EAF2FF] text-[#014BAA] font-bold text-xs flex items-center justify-center">1</span>
                    <h3 class="text-base font-bold text-slate-900">
                        Daftar Kebutuhan Barang & Rincian Harga
                    </h3>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                    Masukkan harga penawaran satuan terbaik Anda (sebelum PPN) dan estimasi waktu pengiriman barang.
                </p>
            </div>
            <span class="text-xs font-semibold text-[#014BAA] bg-[#EAF2FF] px-3 py-1 rounded-lg border border-blue-200/80 self-start sm:self-auto">
                {{ items.length }} Item Ditenderkan
            </span>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                        <th class="py-3.5 px-4 w-12 text-center">No</th>
                        <th class="py-3.5 px-4 min-w-[240px]">Deskripsi Barang & Kebutuhan</th>
                        <th class="py-3.5 px-4 w-28 text-center">Target Qty</th>
                        <th class="py-3.5 px-4 w-44">
                            Merk / Tipe
                            <span class="block text-[10px] font-normal text-slate-400">Opsional</span>
                        </th>
                        <th class="py-3.5 px-4 w-36">Qty Ditawarkan</th>
                        <th class="py-3.5 px-4 w-52">
                            Harga Satuan (Rp) *
                            <span class="block text-[10px] font-normal text-slate-400">Sebelum PPN</span>
                        </th>
                        <th class="py-3.5 px-4 w-32">
                            Waktu Kirim *
                            <span class="block text-[10px] font-normal text-slate-400">Hari kerja</span>
                        </th>
                        <th class="py-3.5 px-4 w-44 text-right">Subtotal Baris</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="(it, idx) in items" :key="it.rfq_item_id" class="hover:bg-slate-50/50 transition-colors">
                        <td class="py-4 px-4 text-center font-mono text-slate-400 font-medium">
                            {{ idx + 1 }}
                        </td>
                        <td class="py-4 px-4 space-y-1">
                            <div class="font-bold text-slate-900 text-sm">
                                {{ it.item_name }}
                            </div>
                            <div v-if="it.item_specifications" class="text-[11px] text-slate-500 leading-snug">
                                {{ it.item_specifications }}
                            </div>
                        </td>
                        <td class="py-4 px-4 text-center">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-slate-700 bg-slate-100">
                                {{ it.target_quantity }} {{ it.unit_name }}
                            </span>
                        </td>
                        <td class="py-4 px-4">
                            <input 
                                v-model="it.brand"
                                type="text" 
                                placeholder="Contoh: Lokal / Sandvik"
                                class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-[#014BAA] focus:ring-1 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
                            />
                        </td>
                        <td class="py-4 px-4">
                            <div class="flex items-center gap-1.5">
                                <input 
                                    v-model.number="it.offered_quantity"
                                    type="number" 
                                    min="0.0001" 
                                    step="any"
                                    class="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 text-center font-medium focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                />
                                <span class="text-[11px] text-slate-500 font-medium">{{ it.unit_name }}</span>
                            </div>
                        </td>
                        <td class="py-4 px-4">
                            <div class="relative">
                                <span class="absolute left-3 top-2 text-[11px] font-bold text-slate-400">Rp</span>
                                <input 
                                    v-model.number="it.unit_price"
                                    type="number" 
                                    min="0"
                                    placeholder="0"
                                    class="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                />
                            </div>
                        </td>
                        <td class="py-4 px-4">
                            <div class="flex items-center gap-1.5">
                                <input 
                                    v-model.number="it.lead_time_days"
                                    type="number" 
                                    min="0"
                                    class="w-16 px-2.5 py-1.5 rounded-lg border border-slate-200 text-center font-medium focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                />
                                <span class="text-[11px] text-slate-500">hari</span>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-right font-mono font-bold text-[#014BAA] text-sm">
                            {{ formatCurrency((Number(it.offered_quantity) || 0) * (Number(it.unit_price) || 0)) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
