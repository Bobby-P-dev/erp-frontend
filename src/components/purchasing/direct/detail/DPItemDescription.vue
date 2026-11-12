<script setup>
import { computed } from 'vue'
import { ExternalLink, ChevronDown } from '@lucide/vue'
import { formatCurrency } from '../../../../utils/stringUtils.js'

const props = defineProps({
    item: { type: Object, required: true },
    currency: { type: String, default: 'IDR' },
    showPrice: { type: Boolean, default: false }
})
const productLink = computed(() => {
    try {
        const url = new URL(props.item.product_url)
        return ['http:', 'https:'].includes(url.protocol) ? url : null
    } catch { return null }
})
</script>

<template>
    <div class="min-w-0">
        <p class="font-medium text-slate-800 break-words">{{ item.item?.name || item.description || 'Item pengadaan' }}</p>
        <p v-if="item.item?.code" class="mt-1 text-xs text-slate-400">{{ item.item.code }}</p>
        <p v-if="showPrice" class="mt-1 text-xs text-slate-500">{{ formatCurrency(item.unit_price, currency) }} / {{ item.unit?.code || item.unit?.name || 'unit' }}</p>
        <a v-if="productLink" :href="productLink.href" target="_blank" rel="noopener noreferrer" :aria-label="`Buka tautan produk ${item.item?.name || item.description || ''} di ${productLink.hostname}, tab baru`" class="product-link">
            <ExternalLink class="size-3.5 shrink-0" />
            <span>Buka tautan produk <span class="font-normal text-slate-500">· {{ productLink.hostname }} · tab baru</span></span>
        </a>
        <details v-if="item.notes || Number(item.discount_amount) > 0 || (item.description && item.item?.name)" class="item-notes mt-3 text-xs text-slate-500">
            <summary class="inline-flex cursor-pointer list-none items-center gap-1.5 rounded py-1 font-medium hover:text-slate-800"><ChevronDown class="size-3.5 transition-transform" />Catatan & spesifikasi</summary>
            <div class="mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                <p v-if="item.item?.name && item.description" class="whitespace-pre-line break-words">{{ item.description }}</p>
                <p v-if="Number(item.discount_amount) > 0">Diskon barang: {{ formatCurrency(item.discount_amount, currency) }}</p>
                <p v-if="item.notes" class="whitespace-pre-line break-words">{{ item.notes }}</p>
            </div>
        </details>
    </div>
</template>
<style scoped>
.product-link { display: inline-flex; align-items: start; gap: .375rem; margin-top: .625rem; border-radius: 6px; padding: .125rem 0; color: #014baa; font-size: .75rem; font-weight: 500; overflow-wrap: anywhere; }
.product-link svg { margin-top: .125rem; }
.product-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.product-link:focus-visible, summary:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
.item-notes[open] summary svg { transform: rotate(180deg); }
summary::-webkit-details-marker { display: none; }
</style>
