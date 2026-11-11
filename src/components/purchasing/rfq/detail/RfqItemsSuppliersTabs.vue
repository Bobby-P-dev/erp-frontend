<script setup>
import { RouterLink } from 'vue-router'
import { Package, Users, Plus, CheckCircle2, Eye, XCircle, Clock, Check, Copy } from '@lucide/vue'
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
</script>

<template>
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <!-- Tab Header Nav -->
        <div class="flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50/50">
            <div class="flex items-center gap-6">
                <button
                    type="button"
                    @click="$emit('update:activeTab', 'items')"
                    class="py-4 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer"
                    :class="[
                        activeTab === 'items' 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    ]"
                >
                    <Package class="w-4 h-4" />
                    Item yang Ditenderkan
                    <span class="px-2 py-0.5 rounded-full text-[11px]" :class="activeTab === 'items' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'">
                        {{ rfq.items?.length || 0 }}
                    </span>
                </button>

                <button
                    type="button"
                    @click="$emit('update:activeTab', 'suppliers')"
                    class="py-4 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer"
                    :class="[
                        activeTab === 'suppliers' 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    ]"
                >
                    <Users class="w-4 h-4" />
                    Vendor Undangan & Penawaran Masuk
                    <span class="px-2 py-0.5 rounded-full text-[11px]" :class="activeTab === 'suppliers' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'">
                        {{ invitedSuppliers.length }}
                    </span>
                </button>
            </div>

            <div v-if="activeTab === 'suppliers'">
                <BaseButton variant="outline" size="sm" @click="$emit('refresh-invitations')">Perbarui Status</BaseButton>
                <BaseButton
                    variant="primary"
                    size="sm"
                    @click="$emit('open-manual-modal')"
                    :disabled="!canReceiveQuotation"
                    class="bg-blue-600 hover:bg-blue-700"
                >
                    <Plus class="w-4 h-4 mr-1.5" />
                    Input Penawaran Manual
                </BaseButton>
            </div>
        </div>

        <!-- Tab 1: Line Items -->
        <div v-if="activeTab === 'items'" class="p-6">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-slate-200 bg-slate-50/70">
                            <th class="w-12 text-center text-xs font-semibold text-slate-600 py-3 px-4">No</th>
                            <th class="text-left text-xs font-semibold text-slate-600 py-3 px-4">Barang & Spesifikasi</th>
                            <th class="text-center text-xs font-semibold text-slate-600 py-3 px-4">Satuan</th>
                            <th class="text-right text-xs font-semibold text-slate-600 py-3 px-4">Target Qty</th>
                            <th class="text-right text-xs font-semibold text-slate-600 py-3 px-4">HPS / Target Harga</th>
                            <th class="text-right text-xs font-semibold text-slate-600 py-3 px-4">Subtotal Target</th>
                            <th class="text-center text-xs font-semibold text-slate-600 py-3 px-4">Tgl Dibutuhkan</th>
                            <th class="text-left text-xs font-semibold text-slate-600 py-3 px-4">Catatan</th>
                        </tr>
                    </thead>

                    <tbody class="divide-y divide-slate-100">
                        <tr v-if="!rfq.items || rfq.items.length === 0">
                            <td colspan="8" class="text-center py-8 text-sm text-slate-400">
                                Tidak ada rincian item dalam tender ini.
                            </td>
                        </tr>
                        <tr 
                            v-for="(item, idx) in rfq.items" 
                            :key="item.id"
                            class="hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                        >
                            <td class="text-center text-xs text-slate-500 py-3 px-4 font-medium">{{ idx + 1 }}</td>
                            <td class="py-3 px-4">
                                <div class="font-semibold text-xs text-slate-900">
                                    {{ (item.item_name && item.item_name !== 'Item Tanpa Nama') ? item.item_name : (item.item?.name || 'Item Tanpa Nama') }}
                                </div>
                                <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    <span class="text-[11px] text-slate-500 font-mono">
                                        {{ item.item?.code || item.item?.item_code || '-' }}
                                    </span>
                                    <span v-if="item.source_pp_number" class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200">
                                        {{ item.source_pp_number }}
                                    </span>
                                    <span v-if="item.source_pr_number" class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] border border-blue-200">
                                        {{ item.source_pr_number }}
                                    </span>
                                </div>
                                <div v-if="item.item_specifications || item.item?.description" class="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                                    {{ item.item_specifications || item.item?.description }}
                                </div>
                            </td>
                            <td class="text-center text-xs text-slate-600 py-3 px-4">
                                {{ item.unit?.name || 'Unit' }}
                            </td>
                            <td class="text-right text-xs font-semibold text-slate-800 py-3 px-4 font-mono">
                                {{ Number(item.target_quantity).toLocaleString('id-ID') }}
                            </td>
                            <td class="text-right text-xs text-slate-700 py-3 px-4 font-mono">
                                {{ item.target_price ? formatCurrency(item.target_price) : '-' }}
                            </td>
                            <td class="text-right text-xs font-semibold text-slate-900 py-3 px-4 font-mono">
                                {{ item.target_price ? formatCurrency(Number(item.target_price) * Number(item.target_quantity)) : '-' }}
                            </td>
                            <td class="text-center text-xs text-slate-600 py-3 px-4">
                                {{ formatDate(item.required_delivery_date) }}
                            </td>
                            <td class="text-xs text-slate-500 py-3 px-4">
                                {{ item.notes || '-' }}
                            </td>
                        </tr>
                    </tbody>

                    <tfoot>
                        <tr class="bg-slate-50 font-bold border-t-2 border-slate-200">
                            <td colspan="3" class="text-left text-xs text-slate-800 py-3 px-4">
                                Total {{ rfq.items?.length || 0 }} Rincian Barang
                            </td>
                            <td class="text-right text-xs text-slate-800 py-3 px-4 font-mono">
                                {{ rfq.items?.reduce((sum, it) => sum + Number(it.target_quantity || 0), 0).toLocaleString('id-ID') }}
                            </td>
                            <td class="text-right text-xs text-slate-600 py-3 px-4">
                                Total HPS:
                            </td>
                            <td class="text-right text-xs text-blue-700 py-3 px-4 font-mono">
                                {{ formatCurrency(totalTargetHps) }}
                            </td>
                            <td colspan="2" class="py-3 px-4"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <!-- Tab 2: Invited Vendors & Quotes -->
        <div v-if="activeTab === 'suppliers'" class="p-6">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-slate-200 bg-slate-50/50">
                            <th class="py-3 px-4 text-xs font-semibold text-slate-600">Vendor / Pemasok</th>
                            <th class="py-3 px-4 text-xs font-semibold text-slate-600">Kontak Person</th>
                            <th class="py-3 px-4 text-xs font-semibold text-slate-600 text-center">Status Penawaran</th>
                            <th class="py-3 px-4 text-xs font-semibold text-slate-600">Tautan Form Vendor</th>
                            <th class="py-3 px-4 text-xs font-semibold text-slate-600">Waktu Aktivitas</th>
                            <th class="py-3 px-4 text-xs font-semibold text-slate-600 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-if="invitedSuppliers.length === 0">
                            <td colspan="6" class="py-8 text-center text-sm text-slate-400">
                                Belum ada vendor yang diundang dalam tender ini.
                            </td>
                        </tr>
                        <tr 
                            v-for="sup in invitedSuppliers" 
                            :key="sup.id"
                            class="hover:bg-slate-50/80 transition-colors"
                        >
                            <td class="py-3 px-4">
                                <div class="font-semibold text-xs text-slate-900">
                                    {{ sup.supplier?.name || `Supplier #${sup.supplier_id}` }}
                                </div>
                                <div class="text-[11px] text-slate-500 font-mono mt-0.5">
                                    {{ sup.supplier?.supplier_code || '-' }}
                                </div>
                            </td>
                            <td class="py-3 px-4">
                                <div class="text-xs text-slate-800 font-medium">{{ sup.contact_person || sup.supplier?.contact_name || '-' }}</div>
                                <div class="text-[11px] text-slate-500 mt-0.5">
                                    {{ sup.email || sup.phone || '-' }}
                                </div>
                            </td>
                            <td class="py-3 px-4 text-center">
                                <span 
                                    v-if="sup.quote_status === 'submitted' || sup.quote_status === 'received'"
                                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                >
                                    <CheckCircle2 class="w-3 h-3" />
                                    Penawaran Masuk
                                </span>
                                <span 
                                    v-else-if="sup.quote_status === 'viewed'"
                                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                    <Eye class="w-3 h-3" />
                                    Telah Dilihat
                                </span>
                                <span 
                                    v-else-if="sup.quote_status === 'declined'"
                                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                                >
                                    <XCircle class="w-3 h-3" />
                                    Menolak Tender
                                </span>
                                <span 
                                    v-else
                                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                                >
                                    <Clock class="w-3 h-3" />
                                    Menunggu Respon
                                </span>
                            </td>
                            <td class="py-3 px-4">
                                <div v-if="sup.portal_access_token" class="flex items-center gap-1.5 flex-wrap">
                                    <button
                                        type="button"
                                        @click="$emit('copy-magic-link', sup.portal_access_token)"
                                        class="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1 font-medium bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors cursor-pointer"
                                        title="Salin tautan form penawaran untuk dikirim ke vendor"
                                    >
                                        <Check v-if="copiedToken === sup.portal_access_token" class="w-3.5 h-3.5 text-emerald-600" />
                                        <Copy v-else class="w-3.5 h-3.5" />
                                        <span>{{ copiedToken === sup.portal_access_token ? 'Tautan Tersalin' : 'Salin Tautan' }}</span>
                                    </button>
                                    <RouterLink
                                        :to="`/portal/rfq/${sup.portal_access_token}`"
                                        class="text-xs text-slate-700 hover:text-blue-700 flex items-center gap-1 font-medium bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded border border-slate-200 transition-colors"
                                        title="Lihat halaman form penawaran vendor"
                                    >
                                        <Eye class="w-3.5 h-3.5 text-slate-500" />
                                        <span>Lihat Form</span>
                                    </RouterLink>
                                </div>
                                <span v-else class="text-xs text-slate-400 italic">Tautan belum aktif (terbitkan tender dulu)</span>
                            </td>
                            <td class="py-3 px-4">
                                <div class="text-[11px] text-slate-600">
                                    <span class="font-medium">{{ invitationLabel(sup.invitation_status) }}</span>
                                    <div v-if="sup.invitation_status === 'sent'">{{ formatRfqTimestamp(sup.invitation_sent_at) }}</div>
                                    <div v-if="['failed', 'unknown'].includes(sup.invitation_status) && sup.invitation_attempts?.[0]?.error_code" class="text-amber-700">{{ invitationError(sup.invitation_attempts[0].error_code) }}</div>
                                    <details v-if="sup.invitation_attempts?.length" class="mt-1">
                                        <summary class="cursor-pointer">Riwayat pengiriman ({{ sup.invitation_attempts.length }})</summary>
                                        <div v-for="attempt in sup.invitation_attempts" :key="attempt.id" class="mt-1">
                                            {{ formatRfqTimestamp(attempt.queued_at) }} · {{ invitationLabel(attempt.status) }}
                                            <div>{{ attempt.recipient || 'Email kosong' }}</div>
                                            <div v-if="attempt.error_code">{{ invitationError(attempt.error_code) }}</div>
                                            <div v-if="attempt.resolution_note">Hasil pemeriksaan: {{ attempt.resolution_note }}</div>
                                        </div>
                                    </details>
                                </div>
                                <div v-if="sup.submitted_at" class="text-[11px] text-emerald-700 font-medium mt-0.5">
                                    <span class="text-slate-400">Penawaran Masuk:</span> {{ formatDate(sup.submitted_at) }}
                                </div>
                            </td>
                            <td class="py-3 px-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <BaseButton v-if="canSendInvitation(sup, canReceiveQuotation)" variant="outline" size="sm"
                                        :disabled="sendingInvitation !== null" @click="$emit('send-invitation', sup)">
                                        {{ sendingInvitation === sup.id ? 'Memproses...' : (sup.invitation_status === 'failed' ? 'Coba Kirim Lagi' : 'Kirim Undangan') }}
                                    </BaseButton>
                                    <BaseButton
                                        variant="outline"
                                        size="sm"
                                        @click="$emit('open-manual-modal', sup.supplier_id)"
                                        :disabled="!canReceiveQuotation"
                                        class="text-xs"
                                        title="Catat penawaran vendor secara manual"
                                    >
                                        <Plus class="w-3.5 h-3.5 mr-1" />
                                        Catat Penawaran
                                    </BaseButton>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
