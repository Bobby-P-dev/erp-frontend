<script setup>
import { CheckCircle2, FileText, ExternalLink } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatDate } from '@/composables/useFormatter.js'
import { compactQuantity, formatPricingMoney } from '@/utils/quotationPricing.js'
import { supplierQuotationProgress, supplierReceiptItems } from '@/utils/supplierQuotationReceipt.js'

const props = defineProps({
    existingQuotation: {
        type: Object,
        required: true,
    },
    rfqItems: { type: Array, default: () => [] },
})
const progress = computed(() => supplierQuotationProgress(props.existingQuotation))
const items = computed(() => supplierReceiptItems(props.existingQuotation, props.rfqItems))
const hasResult = computed(() => ['awarded', 'partially_awarded', 'rejected'].includes(props.existingQuotation.evaluation_status))
const money = value => formatPricingMoney(value, props.existingQuotation.currency)
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
                    {{ money(existingQuotation.total_amount) }}
                </div>
            </div>
        </div>

        <div class="rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5 text-sm text-slate-700 space-y-2" role="status">
            <p class="font-semibold text-blue-900">{{ progress.label }}</p>
            <p v-if="existingQuotation.supplier_message" class="mt-2 whitespace-pre-wrap">Pesan revisi: {{ existingQuotation.supplier_message }}</p>
            <p class="leading-relaxed">{{ progress.message }}</p>
            <div v-for="order in existingQuotation.purchase_orders || []" :key="order.po_number" class="text-sm font-medium">
                {{ order.po_number }} · {{ order.status_label }}
            </div>
            <RouterLink v-if="existingQuotation.purchase_orders?.length" :to="{ name: 'supplier.portal.purchase-orders' }" class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                Buka pesanan pembelian <ExternalLink class="size-4" />
            </RouterLink>
            <p v-if="existingQuotation.purchase_orders?.length" class="text-xs text-slate-500">Masuk dengan akun supplier terkait untuk mengakses PO.</p>
        </div>
        <p class="text-xs text-slate-500 sm:hidden">Geser tabel ke kanan untuk melihat harga dan jumlah terpilih.</p>
        <!-- Items Submitted Table -->
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                    <tr>
                        <th class="py-3 px-4 w-12 text-center">No</th>
                        <th class="py-3 px-4 min-w-56">Barang yang Ditawarkan</th>
                        <th class="py-3 px-4 text-right">Kuantitas Ditawarkan</th>
                        <th class="py-3 px-4 text-right">Harga Satuan Ekuivalen</th>
                        <th class="py-3 px-4 text-right">Subtotal</th>
                        <th v-if="hasResult" class="py-3 px-4 text-right">Jumlah Terpilih</th>
                        <th class="py-3 px-4 text-center">Lead Time</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr v-for="(it, idx) in items" :key="it.rfq_item_id || idx" class="hover:bg-slate-50/50">
                        <td class="py-3 px-4 text-center text-slate-400 font-mono">{{ idx + 1 }}</td>
                        <td class="py-3 px-4 font-bold text-slate-900">
                            {{ it.item_name }}
                            <span v-if="it.item_description?.trim() && it.item_description !== it.item_name" class="mt-1 block text-xs font-normal text-slate-600">{{ it.item_description }}</span>
                            <span v-if="it.brand" class="block text-[11px] font-normal text-slate-500">Merk: {{ it.brand }}</span>
                            <details v-if="it.item_specifications || it.notes" class="mt-2 text-xs font-normal text-slate-600">
                                <summary class="cursor-pointer text-blue-700 py-1">Lihat spesifikasi & catatan</summary>
                                <p v-if="it.item_specifications" class="mt-2 whitespace-pre-wrap">{{ it.item_specifications }}</p>
                                <p v-if="it.notes" class="mt-2 whitespace-pre-wrap">{{ it.notes }}</p>
                            </details>
                        </td>
                        <td class="py-3 px-4 text-right font-medium text-slate-800 whitespace-nowrap">{{ compactQuantity(it.offered_quantity) }} {{ it.unit_name }}</td>
                        <td class="py-3 px-4 text-right tabular-nums text-slate-800 whitespace-nowrap">{{ money(it.unit_price) }}</td>
                        <td class="py-3 px-4 text-right tabular-nums font-bold text-slate-900 whitespace-nowrap">{{ money(it.subtotal) }}</td>
                        <td v-if="hasResult" class="py-3 px-4 text-right whitespace-nowrap">
                            <span v-if="it.is_awarded" class="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-700">{{ compactQuantity(it.awarded_quantity) }} {{ it.unit_name }}</span>
                            <span v-else class="text-slate-500">Tidak terpilih</span>
                        </td>
                        <td class="py-3 px-4 text-center text-slate-600">{{ it.lead_time_days ? it.lead_time_days + ' hari' : '-' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
                Penawaran dikirim: <strong>{{ formatDate(existingQuotation.submitted_at) }}</strong>
            </div>
            <a 
                v-if="existingQuotation.file_url" 
                :href="existingQuotation.file_url" 
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700"
            >
                <FileText class="w-4 h-4" />
                <span>Unduh Lampiran Berkas Penawaran</span>
                <ExternalLink class="w-3.5 h-3.5" />
            </a>
        </div>
    </div>
</template>
