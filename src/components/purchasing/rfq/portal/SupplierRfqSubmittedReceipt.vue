<script setup>
import { CheckCircle2, FileText, ExternalLink } from '@lucide/vue'
import { formatCurrency, formatDate } from '@/composables/useFormatter.js'
import { quotationReviewLabel } from '@/utils/quotationReview.js'

defineProps({
    existingQuotation: {
        type: Object,
        required: true,
    },
})
</script>

<template>
    <div class="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-emerald-100">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                    <CheckCircle2 class="w-6 h-6" />
                </div>
                <div>
                    <h3 class="text-base sm:text-lg font-bold text-slate-900">
                        Tanda Terima Penawaran Harga Resmi
                    </h3>
                    <p class="text-xs text-slate-500">
                        No. Registrasi Sistem: <span class="font-mono font-bold text-emerald-700">{{ existingQuotation.quotation_number }}</span>
                        • Ref Surat: <strong>{{ existingQuotation.vendor_quotation_reference || '-' }}</strong>
                    </p>
                </div>
            </div>

            <div class="text-right">
                <span class="text-xs text-slate-500">Total Nilai Penawaran:</span>
                <div class="text-xl sm:text-2xl font-black text-emerald-700">
                    {{ formatCurrency(existingQuotation.total_amount) }}
                </div>
            </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            <p class="font-semibold">Review penawaran: {{ quotationReviewLabel(existingQuotation) }}</p>
            <p v-if="existingQuotation.supplier_message" class="mt-2 whitespace-pre-wrap">Pesan revisi: {{ existingQuotation.supplier_message }}</p>
            <p class="mt-1">Tanda terima ini mencatat penawaran yang masuk. Hasil pemilihan pemenang tender ditampilkan terpisah pada portal supplier.</p>
        </div>
        <!-- Items Submitted Table -->
        <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                    <tr>
                        <th class="py-3 px-4 w-12 text-center">No</th>
                        <th class="py-3 px-4">Deskripsi Barang</th>
                        <th class="py-3 px-4 text-right">Kuantitas Ditawarkan</th>
                        <th class="py-3 px-4 text-right">Harga Satuan (Rp)</th>
                        <th class="py-3 px-4 text-right">Subtotal (Rp)</th>
                        <th class="py-3 px-4 text-center">Lead Time</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="(it, idx) in existingQuotation.items" :key="idx" class="hover:bg-slate-50/50">
                        <td class="py-3 px-4 text-center text-slate-400 font-mono">{{ idx + 1 }}</td>
                        <td class="py-3 px-4 font-bold text-slate-900">
                            {{ it.item_description }}
                            <span v-if="it.brand" class="block text-[11px] font-normal text-slate-500">Merk: {{ it.brand }}</span>
                        </td>
                        <td class="py-3 px-4 text-right font-medium text-slate-800">{{ it.offered_quantity }}</td>
                        <td class="py-3 px-4 text-right font-mono text-slate-800">{{ formatCurrency(it.unit_price) }}</td>
                        <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">{{ formatCurrency(it.subtotal) }}</td>
                        <td class="py-3 px-4 text-center text-slate-600">{{ it.lead_time_days ? it.lead_time_days + ' hari' : '-' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
                Waktu Pengiriman: <strong>{{ formatDate(existingQuotation.submitted_at) }}</strong>
            </div>
            <a 
                v-if="existingQuotation.file_url" 
                :href="existingQuotation.file_url" 
                target="_blank"
                class="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700"
            >
                <FileText class="w-4 h-4" />
                <span>Unduh Lampiran Berkas Penawaran</span>
                <ExternalLink class="w-3.5 h-3.5" />
            </a>
        </div>
    </div>
</template>
