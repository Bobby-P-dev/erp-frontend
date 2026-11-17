<script setup>
import { hasPreviewPricing, offeredQuotationItems } from '@/utils/quotationPricing.js'
import { Send, X, ClipboardCheck } from '@lucide/vue'
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
    <div class="space-y-4">
        <div class="bg-white rounded-2xl border border-[#E5EAF1] p-5 sm:p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 class="text-base font-semibold text-slate-900">
                    Periksa & kirim penawaran
                </h4>
                <span class="text-xs font-semibold text-[#014BAA] bg-[#EAF2FF] px-2 py-0.5 rounded-md">
                    Langkah terakhir
                </span>
            </div>

            <p class="text-sm font-medium text-slate-700">{{ offeredQuotationItems(quoteForm.items).length }} dari {{ quoteForm.items.length }} barang ditawarkan</p>
            <div v-if="hasPreviewPricing(quoteForm.items)" class="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3 text-sm">
                <p class="text-slate-600">Perkiraan harga ada di setiap barang. Total akhir akan dihitung sistem saat dikirim, termasuk pajak dan ongkos kirim.</p>
                <div class="flex flex-wrap gap-x-6 gap-y-2 text-slate-700"><span>PPN <strong>{{ quoteForm.tax_rate }}%</strong></span><span>Ongkos kirim <strong>{{ formatCurrency(shippingAmount) }}</strong></span></div>
            </div>
            <div v-else class="space-y-3 text-sm">
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

            <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row-reverse gap-3">
                <button 
                    type="submit"
                    :disabled="isSubmitting"
                    class="w-full sm:w-auto py-3.5 px-4 rounded-xl bg-[#014BAA] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow cursor-pointer transition-all"
                >
                    <Send class="w-4 h-4" />
                    <span>{{ isSubmitting ? 'Mengirim Penawaran...' : 'Kirim Surat Penawaran' }}</span>
                </button>

                <button 
                    type="button"
                    @click="$emit('decline')"
                    :disabled="isSubmitting"
                    class="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                    <X class="w-4 h-4 text-slate-400" />
                    <span>Tolak Partisipasi Tender</span>
                </button>
            </div>
        </div>

        <!-- Final review guidance -->
        <div class="p-4 rounded-xl bg-slate-100/70 border border-slate-200/70 text-xs text-slate-500 space-y-1.5">
            <div class="flex items-center gap-1.5 font-semibold text-slate-700">
                <ClipboardCheck class="w-3.5 h-3.5 text-[#014BAA]" />
                <span>Sebelum mengirim</span>
            </div>
            <p class="leading-relaxed">
                Pastikan jumlah, ketentuan harga, dan dokumen sudah sesuai. Penawaran yang dikirim akan digunakan tim pengadaan untuk membandingkan penawaran supplier.
            </p>
        </div>
    </div>
</template>
