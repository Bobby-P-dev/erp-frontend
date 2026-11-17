<script setup>
import { ref } from 'vue'
import BaseButton from '../ui/BaseButton.vue'
import { createPurchaseOrderFromRequisition } from '../../services/purchaseOrderServices.js'
import { showPurchaseRequisition } from '../../services/purchaseRequisitionServices.js'
import { FileCheck2, ArrowUpRight } from '@lucide/vue'

const props = defineProps({ item: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const selected = ref(null), busy = ref(false), errors = ref([]), created = ref([])
const create = async () => {
    if (busy.value || !selected.value) return
    busy.value = true; errors.value = []
    try {
        const response = await createPurchaseOrderFromRequisition(props.item.id, selected.value.supplier_quotation_id)
        created.value = response.data || []
        selected.value = null
        const updated = await showPurchaseRequisition(props.item.id)
        emit('updated', updated.data || updated)
    } catch (error) {
        const data = error.response?.data
        errors.value = [...new Set([data?.message || 'Hasil pembuatan belum terkonfirmasi. Muat ulang detail PR sebelum mencoba lagi.',
            ...Object.values(data?.errors || {}).flat()])]
    } finally { busy.value = false }
}
</script>

<template>
    <div v-if="item.source_po_groups?.length" class="space-y-3 border-t border-blue-100 pt-4" aria-label="Purchase Order dari PR">
        <div class="flex items-start gap-3">
            <span class="rounded-xl bg-emerald-100 p-2 text-emerald-700"><FileCheck2 class="size-5" aria-hidden="true" /></span>
            <div><h4 class="font-semibold text-slate-900">Lanjutkan ke Purchase Order</h4>
                <p class="mt-1 text-sm leading-relaxed text-slate-600">{{ item.procurement_route === 'direct_supplier' ? 'Satu PO untuk supplier pilihan, mengikuti barang, harga satuan dan ketentuan PR yang disetujui. Tidak ada approval PO tambahan.' : 'Satu PO per penawaran supplier, mengikuti seluruh barang yang disetujui beserta pajak dan ongkirnya. Draft dapat diperiksa sebelum diterbitkan, tanpa approval tambahan.' }}</p></div>
        </div>
        <div v-if="errors.length" role="alert" class="rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><p v-for="error in errors" :key="error">{{ error }}</p></div>
        <p v-if="created.length" role="status" class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Draft PO berhasil dibuat: {{ created.map(po => po.po_number).join(', ') }}.</p>
        <div v-for="group in item.source_po_groups" :key="group.supplier_quotation_id" class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0"><p class="font-medium text-slate-900 break-words">{{ group.supplier_name }}</p>
                    <p class="mt-1 text-sm text-slate-500">{{ group.quotation_number }} · {{ group.line_count }} barang disetujui</p></div>
                <BaseButton v-if="group.can_create && !selected" variant="primary" size="sm" :disabled="busy" @click="selected = group; errors = []">Buat draft PO</BaseButton>
            </div>
            <div v-for="po in group.orders" :key="po.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <a :href="`/purchasing/purchase-orders/${po.id}`" class="inline-flex items-center gap-2 font-medium text-blue-700 hover:underline">{{ po.po_number }}<ArrowUpRight class="size-4" aria-hidden="true" /><span class="sr-only">Buka detail PO</span></a>
                <span class="text-slate-600">{{ po.status_label }}</span>
            </div>
            <div v-if="selected && selected.supplier_quotation_id === group.supplier_quotation_id" class="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-3">
                <p class="text-sm text-slate-700">Buat draft PO untuk {{ group.supplier_name }}? Jumlah dan harga mengikuti PR disetujui. Draft langsung memakai saldo PR.</p>
                <div class="flex flex-wrap justify-end gap-2">
                    <BaseButton variant="secondary" size="sm" :disabled="busy" @click="selected = null">Batal</BaseButton>
                    <BaseButton variant="primary" size="sm" :disabled="busy" @click="create">{{ busy ? 'Membuat PO…' : 'Konfirmasi buat PO' }}</BaseButton>
                </div>
            </div>
        </div>
    </div>
</template>
