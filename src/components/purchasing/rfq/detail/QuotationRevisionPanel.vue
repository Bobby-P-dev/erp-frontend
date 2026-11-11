<script setup>
import { ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { getSupplierQuotationHistory, requestSupplierQuotationRevision, reviseSupplierQuotation } from '@/services/rfqServices.js'
import { formatCurrency } from '@/composables/useFormatter.js'
import { formatRfqTimestamp } from '@/utils/rfqTimestamp.js'
import { uploadFile } from '@/services/fileServices.js'
import { searchTaxes } from '@/services/taxServices.js'

const props = defineProps({ quotation: { type: Object, required: true }, disabled: Boolean })
const emit = defineEmits(['changed', 'busy'])
const busy = ref(false)
const error = ref('')
const history = ref(null)
const reason = ref('')
const supplierMessage = ref('')
const editing = ref(false)
const draft = ref({})
const attachment = ref(null)
const taxes = ref(null)
const fields = ['vendor_quotation_reference', 'quotation_date', 'valid_until', 'currency', 'exchange_rate', 'payment_terms', 'lead_time_days', 'shipping_cost', 'quotation_file_id', 'notes']
const fieldLabels = { vendor_quotation_reference: 'Referensi supplier', quotation_date: 'Tanggal quotation', valid_until: 'Berlaku sampai', currency: 'Mata uang', exchange_rate: 'Kurs', payment_terms: 'Syarat pembayaran', lead_time_days: 'Waktu kirim (hari)', shipping_cost: 'Ongkir', notes: 'Catatan internal' }
watch(() => [props.quotation.id, props.quotation.review_version], () => {
    history.value = null
    editing.value = false
    reason.value = ''
    supplierMessage.value = ''
}, { immediate: true })
const allowed = action => props.quotation.revision_actions?.includes(action)
const startEdit = () => {
    draft.value = Object.fromEntries(fields.map(field => [field, props.quotation[field]]))
    draft.value.items = props.quotation.items.map(item => ({ ...item }))
    attachment.value = null
    taxes.value = null
    editing.value = true
}
const run = async action => {
    if (busy.value || props.disabled) return
    busy.value = true
    emit('busy', true)
    error.value = ''
    try { await action() } catch (err) {
        error.value = err.response?.data?.message || 'Gagal memproses revisi. Muat ulang dan periksa kembali.'
        if ([403, 409, 422].includes(err.response?.status)) emit('changed')
    } finally { busy.value = false; emit('busy', false) }
}
const loadHistory = () => run(async () => { history.value = (await getSupplierQuotationHistory(props.quotation.id)).data })
const loadTaxes = () => run(async () => { const response = await searchTaxes(); taxes.value = response.data || response })
const requestRevision = () => run(async () => {
    if (!reason.value.trim() || !supplierMessage.value.trim()) { error.value = 'Alasan internal dan pesan supplier wajib diisi.'; return }
    await requestSupplierQuotationRevision(props.quotation.id, {
        expected_review_version: props.quotation.review_version,
        reason: reason.value.trim(), supplier_message: supplierMessage.value.trim(),
    })
    emit('changed')
})
const saveRevision = () => run(async () => {
    if (!reason.value.trim()) { error.value = 'Alasan perubahan wajib diisi.'; return }
    const payload = { ...draft.value, expected_review_version: props.quotation.review_version, reason: reason.value.trim() }
    if (attachment.value) {
        const result = await uploadFile(attachment.value, 'supplier_quotations')
        payload.quotation_file_id = (result.data || result).id
    }
    payload.items = draft.value.items.map(({ rfq_item_id, item_description, offered_quantity, unit_price, lead_time_days, brand, notes }) =>
        ({ rfq_item_id, item_description, offered_quantity, unit_price, lead_time_days, brand, notes }))
    await reviseSupplierQuotation(props.quotation.id, payload)
    editing.value = false
    emit('changed')
})
</script>

<template>
    <section class="border-t border-slate-200 pt-4 space-y-3 text-xs">
        <h4 class="font-bold text-sm">Revisi dan Riwayat Versi</h4>
        <p v-if="error" role="alert" class="text-rose-800">{{ error }}</p>
        <p v-if="quotation.revision_request" class="whitespace-pre-wrap text-amber-900">Pesan untuk supplier: {{ quotation.revision_request.supplier_message }}</p>
        <div v-if="allowed('request_revision') || allowed('submit_revision')" class="space-y-3">
            <p>Revisi memerlukan pengesahan ulang. Batalkan award atau selesaikan perubahan komitmen PO sebelum merevisi penawaran yang terikat.</p>
            <label class="block">Alasan internal / alasan perubahan
                <textarea v-model="reason" :disabled="busy || disabled" maxlength="2000" class="block w-full border rounded p-2 mt-1" />
            </label>
            <template v-if="allowed('request_revision')">
                <label class="block">Pesan revisi untuk supplier
                    <textarea v-model="supplierMessage" :disabled="busy || disabled" maxlength="2000" class="block w-full border rounded p-2 mt-1" />
                </label>
                <BaseButton size="sm" variant="outline" :disabled="busy || disabled" @click="requestRevision">Minta Revisi</BaseButton>
            </template>
            <BaseButton v-if="allowed('submit_revision') && !editing" size="sm" variant="outline" :disabled="busy || disabled" @click="startEdit">Catat Revisi dari Supplier</BaseButton>
            <form v-if="editing" class="space-y-3" @submit.prevent="saveRevision">
                <div class="grid grid-cols-2 gap-3">
                    <label v-for="field in fields.filter(field => field !== 'quotation_file_id')" :key="field">{{ fieldLabels[field] }}
                        <input v-model="draft[field]" :disabled="busy || disabled" :type="['quotation_date', 'valid_until'].includes(field) ? 'date' : 'text'" class="block w-full border rounded p-2 mt-1">
                    </label>
                </div>
                <label class="block">Lampiran quotation baru (opsional)
                    <input type="file" accept="application/pdf" :disabled="busy || disabled" class="block mt-1" @change="attachment = $event.target.files[0] || null">
                </label>
                <p>Pajak saat ini: {{ quotation.tax_rate }}%. Tarif dipertahankan bila tidak diubah.</p>
                <BaseButton type="button" size="sm" variant="outline" :disabled="busy || disabled" @click="loadTaxes">Ubah Pajak</BaseButton>
                <label v-if="taxes" class="block">Pajak pengganti
                    <select v-model="draft.tax_id" :disabled="busy || disabled" class="block border rounded p-2 mt-1">
                        <option :value="undefined" disabled>Pertahankan pajak saat ini</option>
                        <option :value="null">Tanpa pajak</option>
                        <option v-for="tax in taxes" :key="tax.id" :value="tax.id">{{ tax.name }} · {{ tax.rate }}%</option>
                    </select>
                </label>
                <div v-for="(item, index) in draft.items" :key="item.rfq_item_id" class="rounded border p-3 grid grid-cols-2 gap-2">
                    <p class="col-span-2 font-semibold">Barang {{ index + 1 }}: {{ item.item_description }}</p>
                    <label v-for="field in ['item_description', 'offered_quantity', 'unit_price', 'lead_time_days', 'brand', 'notes']" :key="field">{{ ({ item_description: 'Spesifikasi', offered_quantity: 'Qty', unit_price: 'Harga satuan', lead_time_days: 'Waktu kirim (hari)', brand: 'Merk', notes: 'Catatan barang' })[field] }}
                        <input v-model="item[field]" :disabled="busy || disabled" class="block w-full border rounded p-2">
                    </label>
                </div>
                <BaseButton type="submit" size="sm" :disabled="busy || disabled">Simpan Versi Baru</BaseButton>
            </form>
        </div>
        <BaseButton v-if="allowed('view_history')" size="sm" variant="outline" :disabled="busy || disabled" @click="loadHistory">Muat Riwayat Versi</BaseButton>
        <template v-if="history">
            <p v-if="!history.versions.length">Belum ada snapshot perubahan. Riwayat tersedia mulai perubahan yang dicatat setelah fitur ini aktif.</p>
            <details v-for="version in history.versions" :key="version.id" class="border rounded p-3">
                <summary>Versi {{ version.review_version }} · {{ version.actor_type === 'baseline' ? 'Baseline sebelum perubahan' : version.actor_type === 'supplier' ? 'Supplier' : `Pengguna #${version.recorded_by}` }} · {{ formatRfqTimestamp(version.created_at) }}</summary>
                <p class="mt-2 whitespace-pre-wrap">{{ version.reason }}</p>
                <p>{{ version.snapshot.header.currency }} · Total {{ formatCurrency(version.snapshot.header.total_amount, version.snapshot.header.currency) }} · Berlaku sampai {{ version.snapshot.header.valid_until || '—' }}</p>
                <dl class="grid grid-cols-2 gap-2 mt-2"><div v-for="field in fields.filter(field => field !== 'quotation_file_id')" :key="field"><dt>{{ fieldLabels[field] }}</dt><dd>{{ version.snapshot.header[field] ?? '—' }}</dd></div></dl>
                <p>Pajak: {{ version.snapshot.header.tax_rate }}% · {{ version.snapshot.header.tax_amount }}</p>
                <p>Lampiran: {{ version.snapshot.attachment?.original_name || '—' }}</p>
                <p v-for="item in version.snapshot.items" :key="item.id">{{ item.item_description }} · {{ item.offered_quantity }} × {{ item.unit_price }} · {{ item.brand }} · {{ item.notes }}</p>
            </details>
            <p v-for="request in history.revision_requests" :key="request.id" class="whitespace-pre-wrap">Permintaan revisi v{{ request.review_version }} oleh #{{ request.requested_by }} · {{ formatRfqTimestamp(request.created_at) }}: {{ request.reason }} · Pesan supplier: {{ request.supplier_message }} · {{ request.resolved_version ? `Selesai di v${request.resolved_version}` : 'Menunggu revisi' }}</p>
            <p v-for="review in history.direct_reviews" :key="review.id">Pengesahan langsung v{{ review.review_version }} oleh #{{ review.reviewed_by }} · {{ formatRfqTimestamp(review.reviewed_at) }}</p>
            <div v-for="approval in history.approval_requests" :key="approval.id">
                <p>Approval #{{ approval.id }} · v{{ approval.metadata?.context?.review_version }} · {{ approval.status }}</p>
                <p v-for="action in approval.actions" :key="action.id">{{ action.action }} oleh #{{ action.user_id }} · {{ formatRfqTimestamp(action.acted_at) }} · {{ action.notes }}</p>
            </div>
        </template>
    </section>
</template>
