<script setup>
import { RouterLink } from 'vue-router'
import { Plus, Eye, Check, Copy } from '@lucide/vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatCurrency, formatDate } from '@/composables/useFormatter.js'
import { invitationLabel, invitationError, canSendInvitation } from '@/utils/rfqInvitation.js'
import { formatRfqTimestamp } from '@/utils/rfqTimestamp.js'

defineProps({
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
</script>

<template>
    <section class="rfq-records min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <nav aria-label="Bagian detail tender" class="flex flex-wrap gap-2 border-b border-slate-100 p-4 sm:px-5">
            <button v-for="tab in [
                { key: 'items', label: 'Barang / jasa', count: rfq.items?.length || 0 },
                { key: 'suppliers', label: 'Supplier & undangan', count: invitedSuppliers.length },
                { key: 'review', label: 'Rincian & revisi', count: rfq.quotations?.length || 0 },
            ]" :key="tab.key" type="button" :aria-pressed="activeTab === tab.key"
                class="detail-tab rounded-lg px-4 py-2.5 text-sm font-medium cursor-pointer"
                :class="activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'"
                @click="$emit('update:activeTab', tab.key)">
                {{ tab.label }} <span class="ml-2 opacity-75">{{ tab.count }}</span>
            </button>
        </nav>
        <div v-if="activeTab === 'items'" class="record-table">
            <BaseTable :columns="itemColumns" layout="fixed" label="Barang tender RFQ">
                <tr v-if="!rfq.items?.length"><td colspan="4" class="text-center text-slate-500">Belum ada barang dalam tender ini.</td></tr>
                <tr v-for="item in rfq.items" :key="item.id" class="record-row">
                    <td class="item-cell">
                        <p class="break-words font-medium text-slate-900">{{ (item.item_name && item.item_name !== 'Item Tanpa Nama') ? item.item_name : (item.item?.name || 'Item Tanpa Nama') }}</p>
                        <p v-if="item.item?.code || item.item?.item_code" class="mt-1 text-slate-500">{{ item.item?.code || item.item?.item_code }}</p>
                        <details class="mt-3 text-slate-600">
                            <summary class="cursor-pointer font-medium text-blue-700">Rincian barang</summary>
                            <dl class="mt-3 space-y-3 break-words">
                                <div v-if="item.item_specifications || item.item?.description"><dt class="text-slate-500">Spesifikasi</dt><dd class="mt-1 whitespace-pre-line">{{ item.item_specifications || item.item?.description }}</dd></div>
                                <div v-if="item.source_pp_number || item.source_pr_number"><dt class="text-slate-500">Dokumen sumber</dt><dd class="mt-1">{{ [item.source_pp_number, item.source_pr_number].filter(Boolean).join(' · ') }}</dd></div>
                                <div><dt class="text-slate-500">Dibutuhkan pada</dt><dd class="mt-1">{{ item.required_delivery_date ? formatDate(item.required_delivery_date) : 'Belum ditentukan' }}</dd></div>
                                <div><dt class="text-slate-500">Catatan</dt><dd class="mt-1 whitespace-pre-line">{{ item.notes || 'Tidak ada catatan' }}</dd></div>
                            </dl>
                        </details>
                    </td>
                    <td data-label="Kebutuhan" class="text-right tabular-nums"><span>{{ Number(item.target_quantity || 0).toLocaleString('id-ID') }} {{ item.unit?.name || 'Unit' }}</span></td>
                    <td data-label="HPS satuan" class="text-right tabular-nums"><span>{{ formatCurrency(item.target_price) }}</span></td>
                    <td data-label="Estimasi" class="text-right font-medium tabular-nums text-slate-900"><span>{{ item.target_price != null && item.target_price !== '' ? formatCurrency(Number(item.target_price) * Number(item.target_quantity || 0)) : '—' }}</span></td>
                </tr>
            </BaseTable>
            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-5 text-sm">
                <span class="text-slate-500">{{ rfq.items?.length || 0 }} barang / jasa</span>
                <p class="text-slate-600">Total estimasi HPS <strong class="ml-3 font-semibold tabular-nums text-slate-900">{{ formatCurrency(totalTargetHps) }}</strong></p>
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
.detail-tab:focus-visible, summary:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
.record-table :deep(td) { vertical-align: top; overflow-wrap: anywhere; }
.record-table :deep(th) { font-size: 14px; }
.review-content :deep(section) { border: 0; padding: 0; border-radius: 0; }
.review-content :deep(.text-xs) { font-size: 14px; line-height: 1.6; }
.review-content :deep(h2) { font-size: 18px; font-weight: 600; }
@media (max-width: 900px) {
    .record-table :deep(table), .record-table :deep(tbody) { display: block; }
    .record-table :deep(thead) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .record-table :deep(.record-row) { display: block; padding: 20px; }
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
</style>
