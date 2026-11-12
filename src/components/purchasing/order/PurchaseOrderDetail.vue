<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { RefreshCw, Send, Pencil, Ban, ArrowUpRight, CalendarDays, Truck, Coins, Package, FileText, ReceiptText, Info, Wallet, MapPin, MessageSquareText, BadgeCheck } from '@lucide/vue'
import { showPurchaseOrder, updatePurchaseOrder, issuePurchaseOrder, cancelPurchaseOrder } from '../../../services/purchaseOrderServices.js'
import { showSuccess, showError, showConfirm, showPrompt } from '../../../utils/swal.js'
import { formatCurrency, formatDate, formatDateTime } from '../../../composables/useFormatter.js'
import BaseButton from '../../ui/BaseButton.vue'
import BaseTable from '../../ui/BaseTable.vue'
import StatusBadge from '../../ui/StatusBadge.vue'
import DocumentWorkflowTracker from '../../approval/DocumentWorkflowTracker.vue'
import PurchaseOrderItemDetails from './PurchaseOrderItemDetails.vue'

const props = defineProps({ orderId: { type: [Number, String], required: true } })
const emit = defineEmits(['changed'])
const po = ref(null)
const loading = ref(false)
const error = ref('')
const busy = ref(false)
const editing = ref(false)
const editForm = ref({})
const editSection = ref(null)
const editButton = ref(null)
const activeTab = ref('items')
const tabs = [{ id: 'items', label: 'Barang & biaya', icon: Package }, { id: 'delivery', label: 'Pengiriman', icon: Truck }, { id: 'documents', label: 'Dokumen & proses', icon: FileText }]
const legacy = computed(() => ['pending_approval', 'revision_requested', 'rejected'].includes(po.value?.status))
const canEdit = computed(() => ['draft', 'revision_requested'].includes(po.value?.status))
const canIssue = computed(() => ['draft', 'approved'].includes(po.value?.status))
const canCancel = computed(() => ['draft', 'revision_requested', 'pending_approval', 'approved', 'issued'].includes(po.value?.status))
const money = value => formatCurrency(value, po.value?.currency || 'IDR')
const columns = [{ key: 'item', label: 'Barang', minWidth: '240px' }, { key: 'quantity', label: 'Jumlah', align: 'right' }, { key: 'price', label: 'Harga satuan', align: 'right' }, { key: 'subtotal', label: 'Subtotal', align: 'right' }]
const nextAction = computed(() => {
    switch (po.value?.status) {
        case 'draft': case 'approved': return 'Pastikan barang dan ketentuan sesuai, lalu terbitkan PO ke portal pemasok.'
        case 'issued': return 'PO sudah diterbitkan. Menunggu konfirmasi dari pemasok.'
        case 'acknowledged': return 'Pemasok sudah mengonfirmasi pesanan. Pantau jadwal pengiriman.'
        case 'partially_received': return 'Sebagian barang sudah diterima. Menunggu sisa pengiriman.'
        case 'completed': return 'Pesanan pembelian sudah selesai.'
        case 'cancelled': return 'Pesanan pembelian ini telah dibatalkan.'
        default: return 'Dokumen ini masih menggunakan proses lama. Periksa status pada Dokumen & proses.'
    }
})

let requestVersion = 0
async function fetchDetail() {
    const version = ++requestVersion
    loading.value = true
    error.value = ''
    try {
        const result = await showPurchaseOrder(props.orderId)
        if (version === requestVersion) po.value = result.data || result
    } catch (err) {
        if (version === requestVersion) error.value = err.response?.data?.message || 'Gagal memuat detail Purchase Order.'
    } finally { if (version === requestVersion) loading.value = false }
}
watch(() => props.orderId, () => { po.value = null; activeTab.value = 'items'; editing.value = false; fetchDetail() }, { immediate: true })

async function openEdit() {
    editForm.value = Object.fromEntries(['po_date', 'expected_delivery_date', 'payment_terms', 'delivery_address', 'shipping_cost', 'notes'].map(key => [key, po.value[key] ?? (key === 'shipping_cost' ? 0 : '')]))
    editing.value = true
    await nextTick()
    editSection.value?.querySelector('input')?.focus()
}
async function closeEdit() {
    if (busy.value) return
    editing.value = false
    await nextTick()
    editButton.value?.focus()
}
async function saveEdit() {
    if (busy.value) return
    busy.value = true
    try {
        await updatePurchaseOrder(props.orderId, { ...editForm.value, po_date: editForm.value.po_date || null, expected_delivery_date: editForm.value.expected_delivery_date || null, shipping_cost: Number(editForm.value.shipping_cost || 0) })
        busy.value = false
        await closeEdit()
        await fetchDetail()
        emit('changed')
        await showSuccess('Ketentuan disimpan', 'Purchase Order berhasil diperbarui.')
    } catch (err) { showError(err.response?.data?.message || 'Gagal menyimpan ketentuan PO.') }
    finally { busy.value = false }
}
async function issue() {
    if (busy.value || loading.value) return
    busy.value = true
    try {
        if (!await showConfirm('Terbitkan PO ke pemasok?', `${po.value.po_number} akan tersedia di portal ${po.value.supplier?.name || 'pemasok'} untuk dikonfirmasi.`)) return
        await issuePurchaseOrder(props.orderId)
        await fetchDetail()
        emit('changed')
        await showSuccess('PO diterbitkan', 'Pemasok dapat melihat dan mengonfirmasi pesanan di portal.')
    } catch (err) { showError(err.response?.data?.message || 'Gagal menerbitkan PO.') }
    finally { busy.value = false }
}
async function cancel() {
    if (busy.value || loading.value) return
    busy.value = true
    try {
        const result = await showPrompt({ title: 'Batalkan Purchase Order', text: 'Tuliskan alasan pembatalan pesanan ini.', placeholder: 'Alasan pembatalan', confirmText: 'Batalkan PO', isDestructive: true })
        if (!result.isConfirmed || !result.value?.trim()) return
        await cancelPurchaseOrder(props.orderId, result.value.trim())
        await fetchDetail()
        emit('changed')
        await showSuccess('PO dibatalkan', 'Pesanan pembelian berhasil dibatalkan.')
    } catch (err) { showError(err.response?.data?.message || 'Gagal membatalkan PO.') }
    finally { busy.value = false }
}
</script>

<template>
    <div class="po-detail space-y-6" :data-detail-busy="busy ? '' : undefined">
        <div v-if="error" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            <p>{{ error }}</p><BaseButton variant="secondary" size="sm" class="mt-3" :disabled="loading" @click="fetchDetail">Coba lagi</BaseButton>
        </div>
        <p v-if="loading && !po" role="status" class="py-16 text-center text-sm text-slate-500">Memuat detail pesanan…</p>
        <template v-if="po">
            <header class="space-y-4">
                <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-3"><h3 class="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{{ po.po_number }}</h3><StatusBadge :status="po.status" :label="po.status_label" /></div>
                        <p class="mt-2 text-base text-slate-600">{{ po.supplier?.name || 'Pemasok belum tersedia' }}</p>
                    </div>
                    <button type="button" class="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Muat ulang detail PO" :disabled="loading || busy || editing" @click="fetchDetail"><RefreshCw class="size-4" :class="{ 'animate-spin': loading }" /></button>
                </div>
                <dl class="po-highlights grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div class="rounded-xl border border-slate-200 p-4"><dt class="flex items-center gap-2"><CalendarDays class="size-4 text-blue-700" aria-hidden="true" />Tanggal PO</dt><dd>{{ formatDate(po.po_date) }}</dd></div>
                    <div class="rounded-xl border border-slate-200 p-4"><dt class="flex items-center gap-2"><Truck class="size-4 text-blue-700" aria-hidden="true" />Target pengiriman</dt><dd>{{ formatDate(po.expected_delivery_date) }}</dd></div>
                    <div class="rounded-xl border border-blue-100 bg-blue-50/70 p-4"><dt class="flex items-center gap-2"><Coins class="size-4 text-blue-700" aria-hidden="true" />Total pesanan · {{ po.currency || 'IDR' }}</dt><dd class="text-lg! text-[#014baa]!">{{ money(po.total_amount) }}</dd></div>
                </dl>
                <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <p role="status" class="po-status-note flex max-w-xl items-start gap-2 text-sm leading-relaxed text-slate-600"><Info class="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden="true" />{{ nextAction }}</p>
                    <div v-if="!editing" class="flex shrink-0 flex-wrap gap-2">
                        <button v-if="canEdit" ref="editButton" type="button" class="secondary-action" :disabled="busy || loading" @click="openEdit"><Pencil class="size-4" />Ubah ketentuan</button>
                        <BaseButton v-if="canIssue" size="sm" :disabled="busy || loading" @click="issue"><Send class="size-4" />Terbitkan PO</BaseButton>
                    </div>
                </div>
            </header>

            <section v-if="editing" ref="editSection" class="rounded-2xl border border-blue-100 bg-blue-50/30 p-5" aria-labelledby="po-edit-title">
                <h4 id="po-edit-title" class="text-base font-semibold text-slate-900">Ubah ketentuan pesanan</h4>
                <form class="mt-5 space-y-4" @submit.prevent="saveEdit">
                    <fieldset :disabled="busy" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label>Tanggal PO<input v-model="editForm.po_date" type="date" /></label>
                        <label>Target pengiriman<input v-model="editForm.expected_delivery_date" type="date" /></label>
                        <label>Syarat pembayaran<input v-model="editForm.payment_terms" maxlength="255" type="text" /></label>
                        <label>Biaya pengiriman ({{ po.currency || 'IDR' }})<input v-model="editForm.shipping_cost" type="number" min="0" step="0.01" /></label>
                        <label class="sm:col-span-2">Alamat pengiriman<textarea v-model="editForm.delivery_address" rows="2" maxlength="2000" /></label>
                        <label class="sm:col-span-2">Catatan tambahan<textarea v-model="editForm.notes" rows="2" maxlength="2000" /></label>
                    </fieldset>
                    <div class="flex flex-wrap justify-end gap-2"><button data-detail-cancel type="button" class="secondary-action" :disabled="busy" @click="closeEdit">Batal</button><BaseButton type="submit" size="sm" :disabled="busy">{{ busy ? 'Menyimpan…' : 'Simpan perubahan' }}</BaseButton></div>
                </form>
            </section>

            <nav class="flex gap-5 overflow-x-auto border-b border-slate-200" aria-label="Bagian detail PO">
                <button v-for="tab in tabs" :key="tab.id" type="button" class="po-tab inline-flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3 pb-3 pt-2 text-sm font-medium" :class="activeTab === tab.id ? 'border-[#014baa] bg-blue-50/70 text-[#014baa]' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'" :aria-current="activeTab === tab.id ? 'true' : undefined" @click="activeTab = tab.id"><component :is="tab.icon" class="size-4" aria-hidden="true" />{{ tab.label }}</button>
            </nav>

            <section v-if="activeTab === 'items'" class="space-y-5" aria-label="Barang dan biaya pesanan">
                <div class="flex items-center gap-2"><Package class="size-5 text-blue-700" aria-hidden="true" /><h4 class="text-base font-semibold text-slate-900">Barang yang dipesan</h4><span class="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">{{ po.items?.length || 0 }} item</span></div>
                <div class="hidden sm:block"><BaseTable :columns="columns" min-width="680px" label="Barang dalam Purchase Order">
                    <template v-for="item in po.items" :key="item.id">
                    <tr class="po-item-row">
                        <td><p class="font-medium text-slate-900">{{ item.item_name }}</p><p v-if="item.item?.code" class="mt-1 text-xs text-slate-400">{{ item.item.code }}</p>
                        </td>
                        <td class="text-right whitespace-nowrap tabular-nums">{{ Number(item.quantity).toLocaleString('id-ID') }} {{ item.unit?.name || 'Unit' }}</td>
                        <td class="text-right whitespace-nowrap tabular-nums">{{ money(item.unit_price) }}</td>
                        <td class="text-right whitespace-nowrap font-medium tabular-nums text-slate-900">{{ money(item.subtotal) }}</td>
                    </tr>
                    <tr class="po-item-expansion"><td colspan="4"><PurchaseOrderItemDetails :item="item" /></td></tr>
                    </template>
                    <tr v-if="!po.items?.length"><td colspan="4" class="text-center text-slate-500">Belum ada barang dalam pesanan ini.</td></tr>
                </BaseTable></div>
                <div class="space-y-4 sm:hidden">
                    <article v-for="item in po.items" :key="item.id" class="rounded-xl border border-slate-200 p-4">
                        <h5 class="font-medium text-slate-900">{{ item.item_name }}</h5>
                        <p v-if="item.item?.code" class="mt-1 text-xs text-slate-400">{{ item.item.code }}</p>
                        <dl class="my-4 grid grid-cols-2 gap-4"><div><dt>Jumlah</dt><dd>{{ Number(item.quantity).toLocaleString('id-ID') }} {{ item.unit?.name || 'Unit' }}</dd></div><div><dt>Harga satuan</dt><dd>{{ money(item.unit_price) }}</dd></div><div class="col-span-2"><dt>Subtotal</dt><dd>{{ money(item.subtotal) }}</dd></div></dl>
                        <PurchaseOrderItemDetails :item="item" />
                    </article>
                    <p v-if="!po.items?.length" class="py-6 text-center text-sm text-slate-500">Belum ada barang dalam pesanan ini.</p>
                </div>
                <div class="po-cost-card rounded-2xl border border-slate-200 p-5"><h4 class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><ReceiptText class="size-4 text-blue-700" aria-hidden="true" />Ringkasan biaya</h4><dl class="cost-summary space-y-3 text-sm">
                    <div><dt>Subtotal barang</dt><dd>{{ money(po.subtotal) }}</dd></div>
                    <div v-if="Number(po.discount_amount)"><dt>Diskon</dt><dd>− {{ money(po.discount_amount) }}</dd></div>
                    <div><dt>Pajak ({{ Number(po.tax_rate || 0) }}%)</dt><dd>{{ money(po.tax_amount) }}</dd></div>
                    <div><dt>Biaya pengiriman</dt><dd>{{ money(po.shipping_cost) }}</dd></div>
                    <div class="rounded-xl bg-blue-50 p-4"><dt class="font-semibold text-slate-900!">Total pesanan</dt><dd class="text-base! text-[#014baa]!">{{ money(po.total_amount) }}</dd></div>
                </dl></div>
            </section>

            <section v-else-if="activeTab === 'delivery'" class="space-y-6" aria-label="Pengiriman dan ketentuan">
                <h4 class="text-base font-semibold text-slate-900">Pengiriman & pembayaran</h4>
                <dl class="po-info-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div><dt><Truck class="size-4" aria-hidden="true" />Target pengiriman</dt><dd>{{ formatDate(po.expected_delivery_date) }}</dd></div>
                    <div><dt><Wallet class="size-4" aria-hidden="true" />Syarat pembayaran</dt><dd>{{ po.payment_terms || 'Belum dicantumkan' }}</dd></div>
                    <div class="sm:col-span-2"><dt><MapPin class="size-4" aria-hidden="true" />Alamat tujuan</dt><dd class="whitespace-pre-line">{{ po.delivery_address || 'Belum dicantumkan' }}</dd></div>
                    <div class="sm:col-span-2"><dt><MessageSquareText class="size-4" aria-hidden="true" />Catatan pesanan</dt><dd class="whitespace-pre-line">{{ po.notes || 'Tidak ada catatan tambahan.' }}</dd></div>
                </dl>
                <div class="rounded-2xl bg-slate-50 p-5"><h5 class="flex items-center gap-2 font-medium text-slate-900"><BadgeCheck class="size-4 text-blue-700" aria-hidden="true" />Konfirmasi pemasok</h5><p class="mt-2 text-sm text-slate-600">{{ po.acknowledged_at ? `${po.acknowledged_by_name || 'Pemasok'} · ${formatDateTime(po.acknowledged_at)}` : 'Belum ada konfirmasi dari pemasok.' }}</p><p v-if="po.vendor_notes" class="mt-3 whitespace-pre-line text-sm text-slate-600">{{ po.vendor_notes }}</p></div>
            </section>

            <section v-else class="space-y-6" aria-label="Dokumen dan proses pesanan">
                <div><h4 class="text-base font-semibold text-slate-900">Dokumen sumber</h4><p class="mt-1 text-sm text-slate-500">Persetujuan pengadaan dilakukan pada PR asal.</p></div>
                <dl class="po-info-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div><dt>Tender RFQ</dt><dd><RouterLink v-if="po.rfq" :to="{ name: 'user.purchasing.rfq.detail', params: { id: po.rfq.id } }" class="inline-flex items-center gap-1 text-[#014baa] hover:underline">{{ po.rfq.rfq_number }}<ArrowUpRight class="size-4" /></RouterLink><span v-else>—</span></dd><p v-if="po.rfq?.title" class="mt-1 text-sm text-slate-500">{{ po.rfq.title }}</p></div>
                    <div><dt>Penawaran pemasok</dt><dd>{{ po.supplier_quotation?.quotation_number || '—' }}</dd><p v-if="po.supplier_quotation?.vendor_quotation_reference" class="mt-1 text-sm text-slate-500">Ref: {{ po.supplier_quotation.vendor_quotation_reference }}</p></div>
                    <div><dt>Rencana pengadaan</dt><dd>{{ po.procurement_plan?.pp_number || '—' }}</dd></div>
                    <div><dt>Kode pemasok</dt><dd>{{ po.supplier?.supplier_code || '—' }}</dd></div>
                </dl>
                <div class="border-t border-slate-100 pt-5"><h4 class="mb-4 font-semibold text-slate-900">Jejak proses</h4>
                    <ol class="space-y-4 border-l-2 border-slate-100 pl-5 text-sm"><li><p class="font-medium text-slate-800">PO dibuat</p><p class="mt-1 text-slate-500">{{ formatDateTime(po.created_at) }} · {{ po.created_by_user?.name || 'Pengguna' }}</p></li><li><p class="font-medium text-slate-800">Diterbitkan ke pemasok</p><p class="mt-1 text-slate-500">{{ po.issued_at ? formatDateTime(po.issued_at) : 'Belum diterbitkan' }}</p></li><li><p class="font-medium text-slate-800">Konfirmasi pemasok</p><p class="mt-1 text-slate-500">{{ po.acknowledged_at ? `${formatDateTime(po.acknowledged_at)} · ${po.acknowledged_by_name || 'Pemasok'}` : 'Belum dikonfirmasi' }}</p></li></ol>
                </div>
                <p v-if="po.rejection_reason" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Catatan keputusan: {{ po.rejection_reason }}</p>
                <DocumentWorkflowTracker v-if="legacy" document-type="purchase_order" :document-id="po.id" title="Riwayat approval lama" hide-if-empty />
                <div v-if="canCancel" class="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5"><p class="text-sm text-slate-500">Batalkan jika pesanan tidak dilanjutkan. Alasan wajib diisi.</p><button type="button" class="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40" :disabled="busy || loading || editing" @click="cancel"><Ban class="size-4" />Batalkan PO</button></div>
            </section>
        </template>
    </div>
</template>

<style scoped>
.po-detail { overflow-wrap: anywhere; }
.po-status-note { border-left: 3px solid #93b9eb; border-radius: 0 10px 10px 0; background: #f5f8fd; padding: 10px 12px; }
.po-highlights > div { background: linear-gradient(135deg, #fff, #f5f8fd); }
.po-highlights > div:last-child { background: #eff6ff; border-color: #bfdbfe; }
.po-item-row:hover { background: #f8faff; }
.po-item-expansion > td { padding-top: 0; }
.po-item-expansion :deep(.po-item-details) { margin-top: 0; }
.po-cost-card { background: linear-gradient(135deg, #fff 60%, #f5f8fd); }
dt { font-size: 0.875rem; color: #64748b; }
dd { margin-top: 5px; font-size: 0.875rem; font-weight: 500; color: #0f172a; }
button, summary { cursor: pointer; }
.po-item-row > td { vertical-align: top; }
.po-highlights > div, .po-tab { transition: background-color 160ms ease, border-color 160ms ease; }
.po-highlights > div:hover { border-color: #b5ccec; }
.po-tab:focus-visible { outline: 2px solid #014baa; outline-offset: -2px; }
.po-info-grid > div { min-width: 0; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
.po-info-grid dt { display: flex; align-items: center; gap: 8px; }
.po-info-grid dt svg { flex-shrink: 0; color: #014baa; }
@media (prefers-reduced-motion: reduce) { .po-highlights > div, .po-tab { transition: none; } }
button:disabled { cursor: not-allowed; }
.secondary-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid #cbd5e1; border-radius: 12px; background: white; padding: 8px 16px; color: #334155; font-size: 0.875rem; font-weight: 500; }
.secondary-action:hover { background: #f8fafc; }
.secondary-action:disabled { opacity: 0.4; }
label { display: block; font-size: 0.875rem; font-weight: 500; color: #475569; }
input, textarea { display: block; width: 100%; margin-top: 8px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: white; color: #0f172a; font-weight: 400; }
.cost-summary > div { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; }
.cost-summary dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
</style>
