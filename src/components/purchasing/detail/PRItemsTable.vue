<script setup>
import { computed } from 'vue'
import {
    CheckCircle2,
    Clock,
    XCircle,
    ExternalLink,
    Package
} from '@lucide/vue'
import { formatCurrency } from '../../../composables/useFormatter.js'

const props = defineProps({
    item: {
        type: Object,
        required: true
    }
})

const items = computed(() => {
    return Array.isArray(props.item?.items) ? props.item.items : []
})

const calculateItemSubtotal = (it) => {
    return (Number(it.quantity) || 0) * (Number(it.estimated_price) || 0)
}

const grandTotal = computed(() => {
    if (props.item?.total_estimated_amount && Number(props.item.total_estimated_amount) > 0) {
        return Number(props.item.total_estimated_amount)
    }
    return items.value.reduce((sum, it) => sum + calculateItemSubtotal(it), 0)
})

const isApproved = computed(() => {
    const approvedStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed']
    return approvedStatuses.includes(props.item?.status)
})

const isValidUrl = (url) => {
    if (!url || typeof url !== 'string') return false
    try {
        const parsed = new URL(url)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return false
    }
}
</script>

<template>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div v-if="items.length > 0" class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
                <thead>
                    <tr class="bg-[#F8FAFC] border-b border-slate-200 text-slate-700 font-bold select-none whitespace-nowrap">
                        <th class="py-3 px-4 w-12 text-center">No</th>
                        <th class="py-3 px-4 min-w-[200px]">Item / Barang</th>
                        <th class="py-3 px-4 text-right w-20">Qty</th>
                        <th class="py-3 px-4 w-20">Satuan</th>
                        <th class="py-3 px-4 text-right min-w-[120px]">Est. Harga Satuan</th>
                        <th class="py-3 px-4 text-right min-w-[130px]">Subtotal</th>
                        <th class="py-3 px-4 min-w-[160px]">Catatan / Referensi</th>
                        <th class="py-3 px-4 text-center min-w-[130px]">Status Item</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                    <tr 
                        v-for="(it, idx) in items" 
                        :key="it.id || idx"
                        class="hover:bg-slate-50/70 transition-colors"
                        :class="{ 'bg-rose-50/20': it.approval_status === 'rejected' }"
                    >
                        <!-- No -->
                        <td class="py-3 px-4 text-center text-slate-400 font-mono text-xs font-semibold">
                            {{ idx + 1 }}
                        </td>

                        <!-- Item & Specification -->
                        <td class="py-3 px-4">
                            <div class="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                                <span>{{ it.item?.name || it.item_name || 'Item #' + (it.item_id || '-') }}</span>
                                <span 
                                    v-if="!it.item_id"
                                    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                >
                                    Non-Katalog
                                </span>
                            </div>

                            <div v-if="it.detail_name" class="text-xs text-slate-600 font-medium mt-0.5">
                                {{ it.detail_name }}
                            </div>

                            <div v-if="it.item?.code" class="text-[11px] text-slate-400 font-mono mt-0.5">
                                {{ it.item.code }}
                            </div>
                        </td>

                        <!-- Qty -->
                        <td class="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                            {{ it.quantity }}
                        </td>

                        <!-- Satuan -->
                        <td class="py-3 px-4 text-slate-600 text-xs font-medium">
                            {{ it.unit?.code || it.unit?.name || '-' }}
                        </td>

                        <!-- Est. Harga Satuan -->
                        <td class="py-3 px-4 text-right font-mono text-slate-700 text-xs sm:text-sm">
                            {{ formatCurrency(it.estimated_price || 0, item.currency) }}
                        </td>

                        <!-- Subtotal -->
                        <td class="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                            {{ formatCurrency(calculateItemSubtotal(it), item.currency) }}
                        </td>

                        <!-- Catatan / Referensi -->
                        <td class="py-3 px-4">
                            <div v-if="it.notes" class="text-xs text-slate-700 font-medium leading-relaxed">
                                {{ it.notes }}
                            </div>
                            <div v-if="it.reference_url">
                                <a 
                                    v-if="isValidUrl(it.reference_url)"
                                    :href="it.reference_url" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    class="inline-flex items-center gap-1 text-[11px] text-[#014BAA] hover:text-[#003D8B] hover:underline font-semibold mt-1"
                                    title="Buka link referensi eksternal"
                                >
                                    <ExternalLink class="w-3 h-3" />
                                    <span>Tautan Referensi</span>
                                </a>
                                <span v-else class="text-[11px] text-slate-400 italic">
                                    {{ it.reference_url }}
                                </span>
                            </div>
                            <span v-if="!it.notes && !it.reference_url" class="text-slate-300">—</span>
                        </td>

                        <!-- Status Item -->
                        <td class="py-3 px-4 text-center">
                            <div v-if="it.approval_status === 'approved'">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Disetujui</span>
                                </span>
                            </div>
                            <div v-else-if="it.approval_status === 'rejected'" class="space-y-1">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <XCircle class="w-3.5 h-3.5 text-rose-600" />
                                    <span>Ditolak</span>
                                </span>
                                <div v-if="it.rejection_reason" class="text-[11px] text-rose-600 italic line-clamp-2" :title="it.rejection_reason">
                                    "{{ it.rejection_reason }}"
                                </div>
                            </div>
                            <div v-else>
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock class="w-3.5 h-3.5 text-amber-600" />
                                    <span>Menunggu</span>
                                </span>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr class="bg-[#F8FAFC] border-t-2 border-slate-200 text-slate-900">
                        <td colspan="5" class="py-3.5 px-4 text-right text-xs sm:text-sm font-bold">
                            {{ isApproved ? 'Total Disetujui:' : 'Total Estimasi:' }}
                        </td>
                        <td class="py-3.5 px-4 text-right text-sm sm:text-base font-mono font-bold text-[#014BAA]">
                            {{ formatCurrency(grandTotal, item.currency) }}
                        </td>
                        <td colspan="2"></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- Empty State jika tidak ada item -->
        <div v-else class="p-8 text-center text-xs text-slate-500 space-y-2">
            <Package class="w-8 h-8 text-slate-400 mx-auto" />
            <p class="font-medium text-slate-700">Tidak ada item barang atau jasa yang terdaftar pada pengajuan ini.</p>
        </div>
    </div>
</template>
