<script setup>
import { Send, X, ShieldCheck } from '@lucide/vue'
import { formatCurrency } from '@/composables/useFormatter.js'

defineProps({
    quoteForm: {
        type: Object,
        required: true,
    },
    subtotalAmount: {
        type: Number,
        required: true,
    },
    taxAmount: {
        type: Number,
        required: true,
    },
    shippingAmount: {
        type: Number,
        required: true,
    },
    grandTotalAmount: {
        type: Number,
        required: true,
    },
    isSubmitting: {
        type: Boolean,
        default: false,
    },
})

defineEmits(['decline'])
</script>

<template>
    <div class="space-y-4 lg:sticky lg:top-24">
        <div class="bg-white rounded-2xl border border-[#E5EAF1] p-5 sm:p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Ringkasan Biaya Penawaran
                </h4>
                <span class="text-[11px] font-semibold text-[#014BAA] bg-[#EAF2FF] px-2 py-0.5 rounded-md">
                    Otomatis
                </span>
            </div>

            <div class="space-y-3 text-xs">
                <div class="flex items-center justify-between text-slate-600">
                    <span>Subtotal Barang:</span>
                    <span class="font-mono font-semibold text-slate-900">
                        {{ formatCurrency(subtotalAmount) }}
                    </span>
                </div>

                <div class="flex items-center justify-between text-slate-600">
                    <span>PPN ({{ quoteForm.tax_rate }}%):</span>
                    <span class="font-mono font-semibold text-slate-900">
                        {{ formatCurrency(taxAmount) }}
                    </span>
                </div>

                <div class="flex items-center justify-between text-slate-600">
                    <span>Ongkos Kirim:</span>
                    <span class="font-mono font-semibold" :class="shippingAmount > 0 ? 'text-slate-900' : 'text-emerald-700'">
                        {{ shippingAmount > 0 ? formatCurrency(shippingAmount) : 'Rp 0 (Franco)' }}
                    </span>
                </div>

                <div class="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                        <span class="text-xs font-bold text-slate-900 block">Total Penawaran:</span>
                        <span class="text-[10px] text-slate-400">Termasuk PPN & Biaya</span>
                    </div>
                    <span class="text-xl font-black text-[#014BAA] font-mono">
                        {{ formatCurrency(grandTotalAmount) }}
                    </span>
                </div>
            </div>

            <div class="pt-3 space-y-2.5">
                <button 
                    type="submit"
                    :disabled="isSubmitting"
                    class="w-full py-3.5 px-4 rounded-xl bg-[#014BAA] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow cursor-pointer transition-all"
                >
                    <Send class="w-4 h-4" />
                    <span>{{ isSubmitting ? 'Mengirim Penawaran...' : 'Kirim Surat Penawaran' }}</span>
                </button>

                <button 
                    type="button"
                    @click="$emit('decline')"
                    :disabled="isSubmitting"
                    class="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                    <X class="w-4 h-4 text-slate-400" />
                    <span>Tolak Partisipasi Tender</span>
                </button>
            </div>
        </div>

        <!-- Security / SLA Note -->
        <div class="p-4 rounded-xl bg-slate-100/70 border border-slate-200/70 text-[11px] text-slate-500 space-y-1.5">
            <div class="flex items-center gap-1.5 font-semibold text-slate-700">
                <ShieldCheck class="w-3.5 h-3.5 text-[#014BAA]" />
                <span>Pemberitahuan Kerahasiaan</span>
            </div>
            <p class="leading-relaxed">
                Data harga yang Anda berikan dienkripsi dan hanya dapat dievaluasi oleh tim pengadaan PT Padma Soode Indonesia setelah batas waktu tender berakhir.
            </p>
        </div>
    </div>
</template>
