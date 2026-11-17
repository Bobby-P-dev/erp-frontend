<script setup>
import { RouterLink } from 'vue-router'
import { computed, ref } from 'vue'
import { Plus, Eye, Check, Copy, Package, Users, FileText, ChevronDown, CalendarDays, ClipboardList, StickyNote, Wallet } from '@lucide/vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatCurrency, formatDate } from '@/composables/useFormatter.js'
import { invitationLabel, invitationError, canSendInvitation } from '@/utils/rfqInvitation.js'
import { formatRfqTimestamp } from '@/utils/rfqTimestamp.js'

const props = defineProps({
    sendingInvitation: { type: Number, default: null },
    canReceiveQuotation: {
        type: Boolean,
        default: false,
    },
    rfq: {
        type: Object,
        required: true,
    },
    activeTab: {
        type: String,
        required: true,
    },
    invitedSuppliers: {
        type: Array,
        required: true,
    },
    totalTargetHps: {
        type: Number,
        default: 0,
    },
    copiedToken: {
        type: String,
        default: null,
    },
})

defineEmits(['update:activeTab', 'open-manual-modal', 'copy-magic-link', 'send-invitation', 'refresh-invitations'])
const itemColumns = [
    { key: 'item', label: 'Barang / jasa' },
    { key: 'quantity', label: 'Kebutuhan', width: '150px', align: 'right' },
    { key: 'price', label: 'HPS satuan', width: '160px', align: 'right' },
    { key: 'subtotal', label: 'Estimasi', width: '170px', align: 'right' },
]
const supplierColumns = [
    { key: 'supplier', label: 'Supplier' },
    { key: 'response', label: 'Respons', width: '170px' },
    { key: 'invitation', label: 'Undangan email', width: '200px' },
    { key: 'actions', label: 'Tindakan', width: '210px', align: 'right' },
]
const responseLabel = status => ({ submitted: 'Penawaran masuk', received: 'Penawaran masuk', viewed: 'Sudah dilihat', declined: 'Menolak tender' }[status] || 'Menunggu respons')
const expandedItems = ref(new Set())
const allItemsExpanded = computed(() => !!props.rfq.items?.length && props.rfq.items.every(item => expandedItems.value.has(item.id)))
function toggleItem(id) {
    if (expandedItems.value.has(id)) expandedItems.value.delete(id)
    else expandedItems.value.add(id)
}
function toggleAllItems() {
    expandedItems.value = allItemsExpanded.value ? new Set() : new Set((props.rfq.items || []).map(item => item.id))
}
</script>

<template>
    <section class="rfq-records min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <nav aria-label="Bagian detail tender" class="flex flex-wrap gap-2 border-b border-slate-100 p-4 sm:px-5">
            <button v-for="tab in [
                { key: 'items', label: 'Barang / jasa', icon: Package, count: rfq.items?.length || 0 },
                { key: 'suppliers', label: 'Supplier & undangan', icon: Users, count: invitedSuppliers.length },
                { key: 'review', label: 'Rincian & revisi', icon: FileText, count: rfq.quotations?.length || 0 },
            ]" :key="tab.key" type="button" :aria-pressed="activeTab === tab.key"
                class="detail-tab inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer transition-colors"
                :class="activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'"
                @click="$emit('update:activeTab', tab.key)">
                <component :is="tab.icon" class="size-4 shrink-0" aria-hidden="true" />
                {{ tab.label }} <span class="ml-1 rounded-md px-1.5 py-0.5 text-xs" :class="activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">{{ tab.count }}</span>
            </button>
        </nav>
        <div v-if="activeTab === 'items'" class="record-table">
              <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
                  <div><h3 class="text-base font-semibold text-slate-900">Kebutuhan tender</h3><p class="mt-1 text-sm text-slate-500">Bandingkan jumlah dan estimasi. Buka rincian untuk melihat spesifikasi serta asal kebutuhan.</p></div>
                  <BaseButton v-if="rfq.items?.length" variant="secondary" size="sm" :aria-expanded="allItemsExpanded" @click="toggleAllItems"><ClipboardList class="size-4" aria-hidden="true" />{{ allItemsExpanded ? 'Tutup semua rincian' : 'Buka semua rincian' }}</BaseButton>
              </div>
            <BaseTable :columns="itemColumns" layout="fixed" label="Barang tender RFQ">
                <tr v-if="!rfq.items?.length"><td colspan="4" class="text-center text-slate-500">Belum ada barang dalam tender ini.</td></tr>
                  <template v-for="(item, index) in rfq.items" :key="item.id">
                  <tr class="record-row" :class="{ 'item-row-open': expandedItems.has(item.id) }">
                    <td class="item-cell">
                          <div class="flex items-start gap-3">
                          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
                          <div class="min-w-0">
                        <p class="break-words font-medium text-slate-900">{{ (item.item_name && item.item_name !== 'Item Tanpa Nama') ? item.item_name : (item.item?.name || 'Item Tanpa Nama') }}</p>
                          <span v-if="item.item?.code || item.item?.item_code" class="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{{ item.item?.code || item.item?.item_code }}</span>
                          <button type="button" class="item-toggle mt-2 flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-blue-700 hover:bg-blue-50 cursor-pointer transition-colors" :aria-expanded="expandedItems.has(item.id)" :aria-controls="`rfq-${rfq.id}-item-${item.id}`" :aria-label="`Rincian barang ${index + 1}: ${item.item_name || item.item?.name || 'Item Tanpa Nama'}`" @click="toggleItem(item.id)">Rincian barang<ChevronDown class="size-4 transition-transform" :class="{ 'rotate-180': expandedItems.has(item.id) }" aria-hidden="true" /></button>
                          </div></div>
                    </td>
                      <td data-label="Kebutuhan" class="text-right tabular-nums"><span class="inline-flex flex-wrap items-baseline justify-end gap-1.5 font-semibold text-slate-800">{{ Number(item.target_quantity || 0).toLocaleString('id-ID') }} <span class="text-xs font-medium text-slate-500">{{ item.unit?.name || 'Unit' }}</span></span></td>
                      <td data-label="HPS satuan" class="text-right tabular-nums"><span>{{ item.target_price != null && item.target_price !== '' ? formatCurrency(item.target_price) : '—' }}</span></td>
                      <td data-label="Estimasi" class="text-right font-semibold tabular-nums text-slate-900"><span class="inline-block rounded-lg bg-slate-50 px-2.5 py-1.5">{{ item.target_price != null && item.target_price !== '' ? formatCurrency(Number(item.target_price) * Number(item.target_quantity || 0)) : '—' }}</span></td>
                </tr>
                  <tr v-show="expandedItems.has(item.id)" class="item-detail-row">
                      <td colspan="4">
                          <div :id="`rfq-${rfq.id}-item-${item.id}`" class="rounded-xl border border-blue-100 bg-slate-50/70 p-4 sm:p-5">
                              <dl class="grid gap-5 break-words text-sm sm:grid-cols-3">
                                  <div v-if="item.item_specifications || item.item?.description" class="sm:col-span-3 border-b border-slate-200/70 pb-4"><dt class="flex items-center gap-2 font-medium text-slate-500"><Package class="size-4" aria-hidden="true" />Spesifikasi</dt><dd class="mt-2 whitespace-pre-line leading-relaxed text-slate-800">{{ item.item_specifications || item.item?.description }}</dd></div>
                                  <div><dt class="flex items-center gap-2 font-medium text-slate-500"><ClipboardList class="size-4 shrink-0" aria-hidden="true" />Dokumen sumber</dt><dd class="mt-2 flex flex-wrap gap-2"><span v-for="(source, sourceIndex) in [item.source_pp_number, item.source_pr_number].filter(Boolean)" :key="sourceIndex" class="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700">{{ source }}</span><span v-if="!item.source_pp_number && !item.source_pr_number" class="text-slate-500">Belum tersedia</span></dd></div>
                                  <div><dt class="flex items-center gap-2 font-medium text-slate-500"><CalendarDays class="size-4 shrink-0" aria-hidden="true" />Dibutuhkan pada</dt><dd class="mt-2 text-slate-800">{{ item.required_delivery_date ? formatDate(item.required_delivery_date) : 'Belum ditentukan' }}</dd></div>
                                  <div><dt class="flex items-center gap-2 font-medium text-slate-500"><StickyNote class="size-4 shrink-0" aria-hidden="true" />Catatan</dt><dd class="mt-2 whitespace-pre-line leading-relaxed" :class="item.notes ? 'text-slate-800' : 'text-slate-500'">{{ item.notes || 'Tidak ada catatan tambahan' }}</dd></div>
                              </dl>
                          </div>
                      </td>
                  </tr>
                  </template>
            </BaseTable>
              <div class="flex flex-wrap items-center justify-between gap-4 border-t border-blue-100 bg-blue-50/50 px-5 py-5 text-sm">
                  <div class="flex items-center gap-3"><span class="flex size-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-700"><Wallet class="size-5" aria-hidden="true" /></span><div><p class="font-medium text-slate-800">Total estimasi HPS</p><p class="mt-0.5 text-xs text-slate-500">{{ rfq.items?.length || 0 }} barang / jasa · Acuan estimasi tender</p></div></div>
                  <strong class="text-xl font-semibold tabular-nums text-blue-900">{{ formatCurrency(totalTargetHps) }}</strong>
            </div>
        </div>
        <div v-if="activeTab === 'suppliers'">
            <div class="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
                <p class="text-sm text-slate-600">Pantau respons dan pengiriman undangan supplier.</p>
                <div class="flex flex-wrap gap-2">
                    <BaseButton variant="secondary" size="sm" :disabled="sendingInvitation !== null" @click="$emit('refresh-invitations')">Perbarui status</BaseButton>
                    <BaseButton size="sm" :disabled="!canReceiveQuotation" @click="$emit('open-manual-modal')"><Plus class="size-4" />Catat penawaran</BaseButton>
                </div>
                <p v-if="!canReceiveQuotation" class="w-full text-sm text-slate-500">Pencatatan penawaran dan pengiriman undangan tidak tersedia saat tender tidak menerima respons.</p>
            </div>
            <div class="record-table">
                <BaseTable :columns="supplierColumns" layout="fixed" label="Supplier dan undangan RFQ">
                    <tr v-if="!invitedSuppliers.length"><td colspan="4" class="text-center text-slate-500">Belum ada supplier yang diundang.</td></tr>
                    <tr v-for="sup in invitedSuppliers" :key="sup.id" class="record-row">
                        <td class="item-cell">
                            <p class="break-words font-medium text-slate-900">{{ sup.supplier?.name || `Supplier #${sup.supplier_id}` }}</p>
                            <p class="mt-1 break-all text-slate-500">{{ sup.email || sup.phone || 'Kontak belum tersedia' }}</p>
                            <details class="mt-3 text-slate-600">
                                <summary class="cursor-pointer font-medium text-blue-700">Kontak & akses supplier</summary>
                                <p class="mt-3">{{ sup.contact_person || sup.supplier?.contact_name || 'Nama kontak belum tersedia' }}</p>
                                <p v-if="sup.supplier?.supplier_code" class="mt-1">{{ sup.supplier.supplier_code }}</p>
                                <p v-if="sup.phone" class="mt-1">{{ sup.phone }}</p>
                                <div v-if="sup.portal_access_token" class="mt-3 flex flex-wrap gap-3">
                                    <BaseButton variant="secondary" size="sm" @click="$emit('copy-magic-link', sup.portal_access_token)"><Check v-if="copiedToken === sup.portal_access_token" class="size-4" /><Copy v-else class="size-4" />{{ copiedToken === sup.portal_access_token ? 'Tautan tersalin' : 'Salin tautan' }}</BaseButton>
                                    <RouterLink :to="`/portal/rfq/${sup.portal_access_token}`" class="inline-flex items-center gap-2 font-medium text-blue-700 underline underline-offset-4"><Eye class="size-4" />Lihat form supplier</RouterLink>
                                </div>
                                <p v-else class="mt-3 text-slate-500">Tautan tersedia setelah tender diterbitkan.</p>
                            </details>
                        </td>
                        <td data-label="Respons"><div>
                            <p class="font-medium" :class="['submitted', 'received'].includes(sup.quote_status) ? 'text-emerald-800' : sup.quote_status === 'declined' ? 'text-rose-700' : 'text-slate-700'">{{ responseLabel(sup.quote_status) }}</p>
                            <p v-if="sup.submitted_at" class="mt-2 text-slate-500">{{ formatRfqTimestamp(sup.submitted_at) }}</p>
                        </div></td>
                        <td data-label="Undangan email"><div>
                            <p class="font-medium text-slate-700">{{ invitationLabel(sup.invitation_status) }}</p>
                            <p v-if="sup.invitation_status === 'sent'" class="mt-2 text-slate-500">{{ formatRfqTimestamp(sup.invitation_sent_at) }}</p>
                            <p v-if="['failed', 'unknown'].includes(sup.invitation_status) && sup.invitation_attempts?.[0]?.error_code" class="mt-2 text-amber-800">{{ invitationError(sup.invitation_attempts[0].error_code) }}</p>
                            <details v-if="sup.invitation_attempts?.length" class="mt-3">
                                <summary class="cursor-pointer text-blue-700">Riwayat pengiriman ({{ sup.invitation_attempts.length }})</summary>
                                <div v-for="attempt in sup.invitation_attempts" :key="attempt.id" class="mt-3 space-y-1 text-slate-600">
                                    <p>{{ formatRfqTimestamp(attempt.queued_at) }} · {{ invitationLabel(attempt.status) }}</p>
                                    <p class="break-all">{{ attempt.recipient || 'Email kosong' }}</p>
                                    <p v-if="attempt.error_code">{{ invitationError(attempt.error_code) }}</p>
                                    <p v-if="attempt.resolution_note">Hasil pemeriksaan: {{ attempt.resolution_note }}</p>
                                </div>
                            </details>
                        </div></td>
                        <td data-label="Tindakan" class="text-right"><div class="flex flex-wrap justify-end gap-2">
                            <BaseButton v-if="canSendInvitation(sup, canReceiveQuotation)" variant="secondary" size="sm" :disabled="sendingInvitation !== null" @click="$emit('send-invitation', sup)">{{ sendingInvitation === sup.id ? 'Memproses…' : sup.invitation_status === 'failed' ? 'Coba kirim lagi' : 'Kirim undangan' }}</BaseButton>
                            <BaseButton variant="secondary" size="sm" :disabled="!canReceiveQuotation" @click="$emit('open-manual-modal', sup.supplier_id)">Catat penawaran</BaseButton>
                        </div></td>
                    </tr>
                </BaseTable>
            </div>
        </div>
        <div v-show="activeTab === 'review'" class="review-content p-5 sm:p-6">
            <p v-if="!rfq.quotations?.length" class="py-5 text-center text-sm text-slate-500">Belum ada penawaran yang dapat diperiksa.</p>
            <slot name="review" />
        </div>
    </section>
</template>

<style scoped>
.detail-tab:focus-visible, .item-toggle:focus-visible, summary:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
.record-table :deep(.item-row-open) { background: #f8faff; }
.record-table :deep(.item-detail-row > td) { padding-top: 0; border-top: 0; }
.record-table :deep(td) { vertical-align: top; overflow-wrap: anywhere; }
.record-table :deep(th) { font-size: 14px; }
.review-content :deep(section) { border: 0; padding: 0; border-radius: 0; }
.review-content :deep(.text-xs) { font-size: 14px; line-height: 1.6; }
.review-content :deep(h2) { font-size: 18px; font-weight: 600; }
@media (max-width: 900px) {
    .record-table :deep(table), .record-table :deep(tbody) { display: block; }
    .record-table :deep(thead) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .record-table :deep(.record-row) { display: block; padding: 20px; }
    .record-table :deep(.item-detail-row) { display: block; }
    .record-table :deep(.item-detail-row > td) { display: block; padding: 0 20px 20px; }
    .record-table :deep(.record-row > td) { display: flex; width: 100%; padding: 10px 0; justify-content: space-between; gap: 20px; text-align: left; }
    .record-table :deep(.record-row > td.item-cell) { display: block; padding-top: 0; }
    .record-table :deep(td[data-label]::before) { content: attr(data-label); color: #64748b; flex-shrink: 0; font-weight: 400; }
    .record-table :deep(td[data-label] > *) { min-width: 0; }
    .record-table :deep(td:last-child .flex) { justify-content: flex-start; }
}
@media (max-width: 500px) {
    .detail-tab { flex: 1 1 100%; text-align: left; }
    .record-table :deep(.record-row > td[data-label="Tindakan"]) { flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) {
    .detail-tab, .item-toggle, .item-toggle svg { transition: none; }
}
</style>
