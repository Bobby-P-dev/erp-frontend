<script setup>
import { formatCurrency } from '../../../composables/useFormatter.js'
import { ChevronDown, ClipboardList, Package, Truck, Tag, MessageSquareText, Coins, TrendingDown, Info } from '@lucide/vue'

defineProps({
    offer: { type: Object, required: true },
    currency: { type: String, default: 'IDR' },
    priceDifference: { type: Object, default: null }
})
</script>

<template>
    <details class="offer-details mt-4 text-sm">
        <summary class="offer-toggle flex cursor-pointer items-center gap-3 rounded-xl p-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#014BAA]"><ClipboardList class="size-5" aria-hidden="true" /></span>
            <span class="min-w-0 flex-1"><span class="block font-medium text-slate-800">Rincian penawaran barang</span><span class="mt-0.5 block text-xs leading-relaxed text-slate-500"><span class="when-closed">Lihat detail barang & pengiriman</span><span class="when-open">Tutup rincian</span></span></span>
            <ChevronDown class="offer-chevron size-4 shrink-0 text-slate-500" aria-hidden="true" />
        </summary>
        <div class="offer-body space-y-4 border-t border-slate-100 p-4">
            <div v-if="priceDifference" class="price-insight flex items-start gap-2 rounded-lg px-3 py-3" :class="priceDifference.type">
                <TrendingDown v-if="priceDifference.type === 'saving'" class="mt-0.5 size-4 shrink-0" aria-hidden="true" /><Info v-else class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p class="text-sm leading-relaxed">{{ priceDifference.text }} per satuan.</p>
            </div>
            <dl class="space-y-4">
                <div>
                    <dt class="flex items-center gap-2 text-xs font-medium text-slate-500"><Package class="size-4" aria-hidden="true" />Deskripsi barang</dt>
                    <dd class="mt-2 whitespace-pre-wrap break-words leading-relaxed text-slate-800">{{ offer.item_description || 'Belum tersedia' }}</dd>
                </div>
                <div class="offer-facts grid grid-cols-2 gap-3">
                    <div class="min-w-0 rounded-lg bg-slate-50 p-3"><dt class="flex items-center gap-2 text-xs text-slate-500"><Tag class="size-4 shrink-0" aria-hidden="true" />Merek</dt><dd class="mt-2 break-words font-medium text-slate-800" :class="{ 'font-normal text-slate-400': !offer.brand }">{{ offer.brand || 'Belum tersedia' }}</dd></div>
                    <div class="min-w-0 rounded-lg bg-slate-50 p-3"><dt class="flex items-center gap-2 text-xs text-slate-500"><Truck class="size-4 shrink-0" aria-hidden="true" />Waktu kirim</dt><dd class="mt-2 font-medium text-slate-800" :class="{ 'font-normal text-slate-400': offer.lead_time_days == null }">{{ offer.lead_time_days == null ? 'Belum tersedia' : `${offer.lead_time_days} hari` }}</dd></div>
                </div>
                <div class="rounded-lg border border-slate-200 p-3"><dt class="flex items-center gap-2 text-xs text-slate-500"><Coins class="size-4 shrink-0" aria-hidden="true" />Harga satuan asli · {{ currency }}</dt><dd class="mt-2 font-semibold tabular-nums text-slate-900">{{ formatCurrency(offer.unit_price, currency) }}</dd></div>
                <div class="border-t border-slate-100 pt-4"><dt class="flex items-center gap-2 text-xs font-medium text-slate-500"><MessageSquareText class="size-4" aria-hidden="true" />Catatan supplier</dt><dd class="mt-2 whitespace-pre-wrap break-words leading-relaxed" :class="offer.notes ? 'text-slate-700' : 'text-slate-400'">{{ offer.notes || 'Tidak ada catatan tambahan.' }}</dd></div>
            </dl>
        </div>
    </details>
</template>

<style scoped>
.offer-details { min-width: 0; border: 1px solid #dbe3ee; border-radius: 12px; background: #fff; transition: border-color 160ms ease, box-shadow 160ms ease; }
.offer-details:hover { border-color: #93b4df; }
.offer-details[open] { border-color: #b5ccec; box-shadow: 0 3px 12px rgb(15 23 42 / 4%); }
.offer-toggle { list-style: none; transition: background-color 160ms ease; }
.offer-toggle::-webkit-details-marker { display: none; }
.offer-toggle:hover { background: #f8faff; }
.offer-toggle:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
.offer-chevron { transition: transform 180ms ease; }
.offer-details[open] .offer-chevron { transform: rotate(180deg); }
.when-open, .offer-details[open] .when-closed { display: none; }
.offer-details[open] .when-open { display: inline; }
.offer-body { overflow-wrap: anywhere; }
.price-insight { background: #eff6ff; color: #1e40af; }
.price-insight.saving { background: #ecfdf5; color: #065f46; }
.price-insight.higher { background: #fffbeb; color: #92400e; }
@media (prefers-reduced-motion: reduce) { .offer-details, .offer-toggle, .offer-chevron { transition: none; } }
</style>
