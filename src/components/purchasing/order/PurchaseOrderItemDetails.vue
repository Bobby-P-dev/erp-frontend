<script setup>
import { formatDate } from '../../../composables/useFormatter.js'
import { ClipboardList, ChevronDown, Package, Tag, Truck, FileText, Layers, PackageCheck, MessageSquareText } from '@lucide/vue'
defineProps({ item: { type: Object, required: true } })
</script>

<template>
    <details class="po-item-details mt-3 rounded-xl border border-slate-200 bg-white text-sm">
        <summary class="flex cursor-pointer items-center gap-2.5 rounded-xl p-3">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#014baa]"><ClipboardList class="size-4" aria-hidden="true" /></span>
            <span class="min-w-0 flex-1"><span class="block font-medium text-slate-800">Spesifikasi & sumber</span><span class="mt-0.5 block text-xs text-slate-500">Detail barang dan asal pengadaan</span></span>
            <ChevronDown class="item-chevron size-4 shrink-0 text-slate-400" aria-hidden="true" />
        </summary>
        <dl class="item-detail-grid border-t border-slate-100 p-4 text-sm">
            <div><dt><Package class="size-4" aria-hidden="true" />Spesifikasi</dt><dd class="whitespace-pre-wrap">{{ item.item_specifications || 'Belum dicantumkan' }}</dd></div>
            <div class="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                <div class="min-w-0 rounded-lg bg-slate-50 p-3"><dt><Tag class="size-4" aria-hidden="true" />Merek</dt><dd>{{ item.brand || '—' }}</dd></div>
                <div class="min-w-0 rounded-lg bg-slate-50 p-3"><dt><Truck class="size-4" aria-hidden="true" />Waktu kirim</dt><dd>{{ item.lead_time_days != null ? `${item.lead_time_days} hari` : formatDate(item.expected_delivery_date) }}</dd></div>
            </div>
            <div class="space-y-3 rounded-lg border border-dashed border-slate-200 p-3">
                <div><dt><FileText class="size-4" aria-hidden="true" />PR asal</dt><dd>{{ item.source_pr_number || '—' }}</dd></div>
                <div><dt><Layers class="size-4" aria-hidden="true" />Rencana pengadaan</dt><dd>{{ item.source_pp_number || '—' }}</dd></div>
            </div>
            <div v-if="item.received_quantity != null" class="rounded-lg bg-emerald-50 p-3"><dt><PackageCheck class="size-4" aria-hidden="true" />Sudah diterima</dt><dd>{{ Number(item.received_quantity).toLocaleString('id-ID') }} {{ item.unit?.name || 'Unit' }}</dd></div>
            <div v-if="item.notes"><dt><MessageSquareText class="size-4" aria-hidden="true" />Catatan barang</dt><dd class="whitespace-pre-wrap">{{ item.notes }}</dd></div>
        </dl>
    </details>
</template>

<style scoped>
.item-detail-grid { display: grid; gap: 16px; }
@media (min-width: 640px) { .item-detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
dt { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: #64748b; }
dt svg { flex-shrink: 0; }
dd { margin-top: 4px; color: #334155; overflow-wrap: anywhere; }
.po-item-details { min-width: 0; transition: border-color 160ms ease, box-shadow 160ms ease; }
.po-item-details:hover, .po-item-details[open] { border-color: #b5ccec; }
.po-item-details[open] { box-shadow: 0 3px 12px rgb(15 23 42 / 4%); }
summary { list-style: none; transition: background-color 160ms ease; }
summary::-webkit-details-marker { display: none; }
summary:hover { background: #f8faff; }
summary:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
.item-chevron { transition: transform 180ms ease; }
.po-item-details[open] .item-chevron { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .po-item-details, summary, .item-chevron { transition: none; } }
</style>
