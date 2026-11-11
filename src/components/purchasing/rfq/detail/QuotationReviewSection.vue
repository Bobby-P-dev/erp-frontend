<script setup>
import { ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ApprovalReviewDrawer from '@/components/approval/ApprovalReviewDrawer.vue'
import QuotationRevisionPanel from './QuotationRevisionPanel.vue'
import { useQuotationReview } from '@/composables/purchasing/useQuotationReview.js'
import { quotationReviewLabel, quotationReviewReason, quotationReviewAction } from '@/utils/quotationReview.js'
import { formatCurrency, formatDate } from '@/composables/useFormatter.js'
import { formatRfqTimestamp } from '@/utils/rfqTimestamp.js'

const props = defineProps({
    quotations: { type: Array, default: () => [] },
    disabled: { type: Boolean, default: false },
    reload: { type: Function, default: async () => {} },
})
const { selected, loading, submitting, error, open, submit } = useQuotationReview(() => props.reload())
const modalOpen = ref(false)
const approvalTask = ref(null)
const revisionBusy = ref(false)
const refreshRevision = async () => {
    const id = selected.value?.id
    await props.reload()
    if (id) await open(id)
}
const quotationId = quote => quote.quotation_id || quote.id
const inspect = async quote => {
    if (props.disabled || loading.value || submitting.value) return
    modalOpen.value = true
    await open(quotationId(quote))
}
const openApproval = () => {
    if (!selected.value?.latest_approval_request_id) return
    approvalTask.value = { id: selected.value.latest_approval_request_id, document_type: 'supplier_quotation', document_number: selected.value.quotation_number }
    modalOpen.value = false
}
const refreshApproval = async () => {
    selected.value = null
    await props.reload()
}
</script>

<template>
    <section v-if="quotations.length" class="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
            <h2 class="text-sm font-bold text-slate-900">Pemeriksaan Penawaran</h2>
            <p class="text-xs text-slate-600 mt-1">Penawaran yang diterima perlu disahkan internal sebelum award atau PO baru. Pengesahan belum menetapkan pemenang tender.</p>
        </div>
        <div v-for="quote in quotations" :key="quotationId(quote)" class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div class="text-xs">
                <p class="font-semibold text-slate-900">{{ quote.supplier_name || quote.supplier?.name || quote.quotation_number }}</p>
                <p class="text-slate-600">{{ quote.quotation_number }} · {{ quotationReviewLabel(quote) }} · Versi {{ quote.review_version || '—' }}</p>
                <p v-if="quotationReviewReason(quote)" class="text-amber-800 mt-1">{{ quotationReviewReason(quote) }}</p>
            </div>
            <BaseButton variant="outline" size="sm" :disabled="disabled || loading || submitting" @click="inspect(quote)">Periksa Penawaran</BaseButton>
        </div>
    </section>

    <BaseModal :model-value="modalOpen" title="Review Quotation" size="4xl" :close-on-backdrop="!submitting && !revisionBusy" :close-on-escape="!submitting && !revisionBusy" @update:model-value="value => { if (!submitting && !loading && !revisionBusy) modalOpen = value }">
        <p v-if="loading" class="text-sm text-slate-600" role="status">Memuat rincian quotation...</p>
        <p v-if="error" class="text-sm text-rose-800 mb-3" role="alert">{{ error }}</p>
        <div v-if="selected && !loading" class="space-y-4 text-sm text-slate-800">
            <div>
                <h3 class="font-bold">{{ selected.quotation_number }} · {{ selected.supplier?.name }}</h3>
                <p>{{ quotationReviewLabel(selected) }} · Versi {{ selected.review_version }}</p>
                <p class="text-xs text-slate-600">{{ selected.review_mode === 'direct' ? 'Pengesahan langsung oleh buyer berizin' : 'Approval oleh pemeriksa terpisah' }}</p>
                <p v-if="quotationReviewReason(selected)" class="text-xs text-amber-800 mt-1">{{ quotationReviewReason(selected) }}</p>
            </div>
            <dl class="grid grid-cols-2 gap-3 text-xs">
                <div><dt>Referensi supplier</dt><dd class="font-semibold">{{ selected.vendor_quotation_reference || '—' }}</dd></div>
                <div><dt>Mata uang</dt><dd class="font-semibold">{{ selected.currency }}</dd></div>
                <div><dt>Tanggal / berlaku sampai</dt><dd>{{ formatDate(selected.quotation_date) }} / {{ formatDate(selected.valid_until) || 'Belum ditentukan' }}</dd></div>
                <div><dt>Waktu pengiriman</dt><dd>{{ selected.lead_time_days ?? '—' }} hari</dd></div>
                <div><dt>Syarat pembayaran</dt><dd>{{ selected.payment_terms || '—' }}</dd></div>
                <div><dt>Catatan penawaran</dt><dd class="whitespace-pre-wrap">{{ selected.notes || '—' }}</dd></div>
            </dl>
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                    <thead><tr class="border-b"><th class="p-2">Barang / spesifikasi / merk</th><th class="p-2">Qty</th><th class="p-2">Harga satuan</th><th class="p-2">Subtotal</th></tr></thead>
                    <tbody><tr v-for="item in selected.items" :key="item.id" class="border-b">
                        <td class="p-2">{{ item.item_description || item.rfq_item?.item_description || '—' }}<p>{{ item.brand || '' }}</p><p>{{ item.notes || '' }}</p></td>
                        <td class="p-2">{{ item.offered_quantity }}</td><td class="p-2">{{ formatCurrency(item.unit_price, selected.currency) }}</td><td class="p-2">{{ formatCurrency(item.subtotal, selected.currency) }}</td>
                    </tr></tbody>
                </table>
            </div>
            <p class="text-xs">Pajak: {{ formatCurrency(selected.tax_amount, selected.currency) }} · Ongkir: {{ formatCurrency(selected.shipping_cost, selected.currency) }}</p>
            <p class="font-bold">Total: {{ formatCurrency(selected.total_amount, selected.currency) }}</p>
            <p v-if="selected.direct_review" class="text-xs text-slate-600">Disahkan langsung oleh pengguna #{{ selected.direct_review.reviewed_by }} · {{ formatRfqTimestamp(selected.direct_review.reviewed_at) }} · Versi {{ selected.direct_review.review_version }}</p>
            <p v-if="selected.review_method === 'approval'" class="text-xs text-slate-600">Disahkan melalui approval #{{ selected.latest_approval_request_id }}.</p>
            <QuotationRevisionPanel :quotation="selected" :disabled="disabled || submitting" @changed="refreshRevision" @busy="revisionBusy = $event" />
        </div>
        <template #footer>
            <BaseButton variant="outline" :disabled="submitting || loading || revisionBusy" @click="modalOpen = false">Tutup</BaseButton>
            <BaseButton v-if="selected?.latest_approval_request_id" variant="outline" :disabled="submitting || loading || revisionBusy" @click="openApproval">Lihat Approval</BaseButton>
            <BaseButton v-if="quotationReviewAction(selected)" :disabled="disabled || loading || submitting || revisionBusy" @click="submit">
                {{ submitting ? 'Memproses...' : quotationReviewAction(selected) === 'confirm_review' ? 'Sahkan Quotation' : 'Ajukan Approval' }}
            </BaseButton>
        </template>
    </BaseModal>
    <ApprovalReviewDrawer :is-open="!!approvalTask" :task="approvalTask" @close="approvalTask = null" @action-success="refreshApproval" @refresh-requested="refreshApproval" />
</template>
