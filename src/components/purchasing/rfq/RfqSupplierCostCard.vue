<script setup>
import { Building2, ReceiptText, Wallet, Truck, CalendarDays, Coins, BadgeCheck, ShieldCheck } from '@lucide/vue'
import ReviewDisclosure from '../../ui/ReviewDisclosure.vue'
import { formatCurrency } from '../../../composables/useFormatter.js'
import { isLowestTotalCost, totalCostExclusionText } from '../../../utils/rfqComparison.js'
import { quotationValidityLabel, quotationValidityReason, canAwardQuotation } from '../../../utils/quotationValidity.js'
import { quotationReviewLabel, quotationReviewReason } from '../../../utils/quotationReview.js'

const props = defineProps({ supplier: { type: Object, required: true }, currency: { type: String, default: 'IDR' } })
const money = value => formatCurrency(value, props.currency)
</script>

<template>
    <article class="supplier-cost-card min-w-0 overflow-hidden rounded-2xl border bg-white" :class="isLowestTotalCost(supplier) ? 'border-emerald-200' : 'border-slate-200'">
        <div class="p-5">
            <header class="flex items-start gap-3">
                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Building2 class="size-5" aria-hidden="true" /></span>
                <div class="min-w-0"><h3 class="break-words text-base font-semibold text-slate-900">{{ supplier.supplier_name }}</h3><p class="mt-1 break-words text-sm text-slate-500">{{ supplier.vendor_quotation_reference || supplier.quotation_number || 'Nomor belum tersedia' }}</p></div>
            </header>
            <div class="cost-total mt-5 rounded-xl p-4" :class="isLowestTotalCost(supplier) ? 'bg-emerald-50' : 'bg-blue-50/70'">
                <p class="flex items-center gap-2 text-sm text-slate-600"><ReceiptText class="size-4" aria-hidden="true" />Total penawaran · {{ currency }}</p>
                <p class="mt-2 break-words text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{{ money(supplier.base_total_amount) }}</p>
                <p class="mt-1 text-xs text-slate-500">Termasuk pajak dan ongkir</p>
                <p v-if="isLowestTotalCost(supplier)" class="mt-3 flex items-start gap-2 text-sm font-medium text-emerald-800"><BadgeCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" />Total terendah · cakupan setara</p>
                <p v-else-if="totalCostExclusionText(supplier)" class="mt-3 text-sm text-slate-600">Total tidak diranking: {{ totalCostExclusionText(supplier) }}</p>
            </div>
            <div class="mt-4 flex flex-wrap gap-2 text-xs leading-relaxed">
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5" :class="canAwardQuotation(supplier) ? 'text-slate-600' : 'text-amber-900'"><CalendarDays class="size-3.5 shrink-0" aria-hidden="true" />{{ quotationValidityLabel(supplier) }}</span>
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600"><ShieldCheck class="size-3.5 shrink-0" aria-hidden="true" />{{ quotationReviewLabel(supplier) }}</span>
            </div>
            <p v-if="!canAwardQuotation(supplier)" class="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Belum dapat dipilih untuk award baru.</p>
        </div>
        <ReviewDisclosure class="cost-disclosure mx-5 mb-5" title="Rincian biaya & ketentuan" description="Lihat komponen biaya, pembayaran & pengiriman">
            <section class="rounded-xl bg-slate-50 p-4" aria-label="Breakdown biaya">
                <h4 class="mb-4 flex items-center gap-2 text-sm font-medium text-slate-800"><ReceiptText class="size-4 text-blue-700" aria-hidden="true" />Komponen biaya</h4>
                <dl class="space-y-3 text-sm">
                    <div class="flex flex-wrap justify-between gap-2"><dt class="text-slate-500">Harga barang</dt><dd class="font-medium tabular-nums text-slate-800">{{ money(supplier.base_subtotal) }}</dd></div>
                    <div class="flex flex-wrap justify-between gap-2"><dt class="text-slate-500">Pajak<template v-if="supplier.tax_rate"> ({{ supplier.tax_rate }}%)</template></dt><dd class="font-medium tabular-nums text-slate-800">{{ money(supplier.base_tax_amount) }}</dd></div>
                    <div class="flex flex-wrap justify-between gap-2"><dt class="text-slate-500">Ongkir</dt><dd class="font-medium tabular-nums text-slate-800">{{ money(supplier.base_shipping_cost) }}</dd></div>
                    <div class="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-3"><dt class="font-medium text-slate-800">Total penawaran</dt><dd class="font-semibold tabular-nums text-[#014BAA]">{{ money(supplier.base_total_amount) }}</dd></div>
                </dl>
            </section>
            <dl class="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div class="min-w-0 rounded-xl border border-slate-100 p-3"><dt class="flex items-center gap-2 text-slate-500"><Wallet class="size-4 shrink-0 text-blue-700" aria-hidden="true" />Pembayaran</dt><dd class="mt-2 whitespace-pre-wrap break-words font-medium text-slate-800">{{ supplier.payment_terms || 'Belum tersedia' }}</dd></div>
                <div class="min-w-0 rounded-xl border border-slate-100 p-3"><dt class="flex items-center gap-2 text-slate-500"><Truck class="size-4 shrink-0 text-blue-700" aria-hidden="true" />Waktu kirim</dt><dd class="mt-2 font-medium text-slate-800">{{ supplier.lead_time_days == null ? 'Belum tersedia' : `${supplier.lead_time_days} hari` }}</dd></div>
                <div class="rounded-xl border border-slate-100 p-3 sm:col-span-2"><dt class="flex items-center gap-2 text-slate-500"><CalendarDays class="size-4 shrink-0 text-blue-700" aria-hidden="true" />Berlaku sampai</dt><dd class="mt-2 font-medium text-slate-800">{{ supplier.valid_until || 'Belum tersedia' }}<span v-if="supplier.valid_until" class="mt-1 block text-xs font-normal text-slate-500">Sampai akhir hari WIB</span></dd></div>
            </dl>
            <section class="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm" aria-label="Mata uang penawaran">
                <h4 class="flex items-center gap-2 font-medium text-slate-700"><Coins class="size-4 text-slate-500" aria-hidden="true" />Mata uang penawaran</h4>
                <dl class="mt-3 space-y-3"><div class="flex flex-wrap justify-between gap-2"><dt class="text-slate-500">Total dalam mata uang asli</dt><dd class="font-medium tabular-nums text-slate-800">{{ formatCurrency(supplier.total_amount, supplier.currency) }}</dd></div><div class="flex flex-wrap justify-between gap-2"><dt class="text-slate-500">Kurs penawaran</dt><dd class="text-slate-700">1 {{ supplier.currency }} = {{ supplier.comparison_exchange_rate ?? '—' }} {{ currency }}</dd></div></dl>
            </section>
            <div v-if="supplier.comparison_error || quotationReviewReason(supplier) || quotationValidityReason(supplier)" class="mt-4 space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <p v-if="supplier.comparison_error">Kurs tidak valid; nilai konversi tidak tersedia.</p>
                <p v-if="quotationReviewReason(supplier)">{{ quotationReviewReason(supplier) }}</p>
                <p v-if="quotationValidityReason(supplier)">{{ quotationValidityReason(supplier) }}</p>
            </div>
        </ReviewDisclosure>
    </article>
</template>

<style scoped>
.supplier-cost-card { align-self: start; transition: box-shadow 160ms ease, border-color 160ms ease; }
.supplier-cost-card:hover { box-shadow: 0 5px 20px rgb(15 23 42 / 5%); }
.supplier-cost-card :deep(.cost-disclosure) { border-color: #e2e8f0; transition: border-color 160ms ease; }
.supplier-cost-card :deep(.cost-disclosure[open]) { border-color: #b5ccec; }
.supplier-cost-card :deep(summary) { border-radius: 12px; transition: background-color 160ms ease; }
.supplier-cost-card :deep(summary:hover) { background: #f8faff; }
.supplier-cost-card :deep(.disclosure-chevron) { transition: transform 180ms ease; }
@media (prefers-reduced-motion: reduce) { .supplier-cost-card, .supplier-cost-card :deep(.cost-disclosure), .supplier-cost-card :deep(summary), .supplier-cost-card :deep(.disclosure-chevron) { transition: none; } }
</style>
