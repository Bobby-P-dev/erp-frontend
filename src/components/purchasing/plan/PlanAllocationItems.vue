<script setup>
import BaseTable from '../../ui/BaseTable.vue'
import { formatCurrency } from '../../../utils/stringUtils.js'

defineProps({
    items: { type: Array, required: true },
    currency: { type: String, default: 'IDR' },
})
const emit = defineEmits(['validate'])
const columns = [
    { key: 'select', label: 'Pilih', width: '60px', align: 'center' },
    { key: 'item', label: 'Barang / jasa' },
    { key: 'remaining', label: 'Sisa kebutuhan', width: '145px', align: 'right' },
    { key: 'quantity', label: 'Alokasikan', width: '160px' },
    { key: 'estimate', label: 'Estimasi', width: '160px', align: 'right' },
]
</script>

<template>
    <div class="allocation-items">
        <BaseTable :columns="columns" layout="fixed" label="Alokasi barang rencana pengadaan">
            <tr v-if="!items.length"><td colspan="5" class="text-center text-slate-500">Belum ada barang yang dapat dialokasikan. Pilih PR dengan sisa kebutuhan.</td></tr>
            <template v-for="item in items" :key="item.pr_item_id">
                <tr class="allocation-row" :class="{ 'opacity-60': !item.is_selected }">
                    <td class="text-center selection-cell"><input v-model="item.is_selected" type="checkbox" :aria-label="`Pilih ${item.item_name}`" @change="emit('validate', item)" class="size-4 accent-[#014baa]" /></td>
                    <td class="item-cell">
                        <p class="font-medium text-slate-800 break-words">{{ item.item_name }}</p>
                        <p v-if="item.item_code || item.is_custom_item" class="mt-1 text-xs text-slate-400">{{ item.is_custom_item ? 'Non-katalog' : item.item_code }}</p>
                        <p v-if="item.pr_number" class="mt-1 text-xs text-slate-500">{{ item.pr_number }}</p>
                        <details class="item-details mt-2">
                            <summary class="text-xs text-[#014baa] cursor-pointer">Detail & catatan<span v-if="item.notes"> · terisi</span></summary>
                            <div class="mt-3 space-y-2 text-xs text-slate-500">
                                <p v-if="item.detail_name" class="break-words">{{ item.detail_name }}</p>
                                <p>Diminta {{ item.requested_qty.toLocaleString('id-ID') }} {{ item.unit }}</p>
                                <p>Estimasi satuan {{ formatCurrency(item.estimated_price, currency) }}</p>
                                <a v-if="item.reference_url" :href="item.reference_url" target="_blank" rel="noopener noreferrer" class="block text-[#014baa] underline break-all">Lihat referensi barang</a>
                                <label :for="`item-note-${item.pr_item_id}`" class="block">Catatan item (opsional)</label>
                                <textarea :id="`item-note-${item.pr_item_id}`" v-model="item.notes" :disabled="!item.is_selected" rows="2" class="item-input" placeholder="Instruksi untuk barang ini" />
                            </div>
                        </details>
                    </td>
                    <td class="text-right remaining-cell"><span class="mobile-label">Sisa kebutuhan</span><span class="tabular-nums">{{ item.remaining_qty.toLocaleString('id-ID') }} {{ item.unit }}</span></td>
                    <td class="quantity-cell">
                        <label :for="`plan-qty-${item.pr_item_id}`" class="mobile-label">Alokasikan</label>
                        <input :id="`plan-qty-${item.pr_item_id}`" v-model="item.planned_qty" type="number" step="any" min="0" :max="item.remaining_qty" :disabled="!item.is_selected" :aria-label="`Alokasi ${item.item_name}`" :aria-invalid="Boolean(item.error)" :aria-describedby="`qty-help-${item.pr_item_id}`" @input="emit('validate', item)" class="item-input tabular-nums" :class="{ 'border-rose-400': item.error }" />
                        <p :id="`qty-help-${item.pr_item_id}`" class="mt-1 text-xs" :class="item.error ? 'text-rose-600' : 'text-slate-400'">{{ item.error || item.unit }}</p>
                    </td>
                    <td class="text-right estimate-cell"><span class="mobile-label">Estimasi</span><span class="tabular-nums font-medium">{{ item.is_selected ? formatCurrency(Number(item.planned_qty || 0) * item.estimated_price, currency) : '—' }}</span></td>
                </tr>
            </template>
        </BaseTable>
    </div>
</template>

<style scoped>
.item-input { width: 100%; min-width: 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 10px; background: white; font-size: 14px; color: #334155; }
.item-input.border-rose-400 { border-color: #fb7185; }
.item-input:disabled { background: #f1f5f9; cursor: not-allowed; }
.item-input:focus-visible, summary:focus-visible { outline: 2px solid #014baa; outline-offset: 2px; }
.mobile-label { display: none; }
/* Keep the same controls and reading order at every width. */
@media (max-width: 767px) {
    .allocation-items :deep(table), .allocation-items :deep(tbody) { display: block; }
    .allocation-items :deep(thead) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .allocation-items :deep(.allocation-row) { display: grid; grid-template-columns: 32px minmax(0, 1fr) minmax(0, 1fr); padding: 20px 16px; gap: 16px 8px; }
    .allocation-items :deep(.allocation-row > td) { display: block; padding: 0; text-align: left; min-width: 0; }
    .selection-cell { grid-column: 1; }
    .item-cell { grid-column: 2 / 4; }
    .remaining-cell { grid-column: 2; }
    .quantity-cell { grid-column: 3; }
    .estimate-cell { grid-column: 2 / 4; }
    .mobile-label { display: block; margin-bottom: 6px; font-size: 12px; color: #64748b; }
}
</style>
