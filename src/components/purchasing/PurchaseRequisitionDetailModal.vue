<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BaseModal from '../ui/BaseModal.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import DocumentWorkflowTracker from '../approval/DocumentWorkflowTracker.vue'
import { formatCurrency, formatDate } from '../../composables/useFormatter.js'
import {
    FileText,
    CheckCircle2,
    RotateCcw,
    Package,
    FileEdit,
    Send,
    ExternalLink,
    RefreshCw,
    XCircle,
    Clock
} from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    item: {
        type: Object,
        default: null
    },
    isLoading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue', 'close', 'confirmReceipt', 'submitPR'])

const close = () => {
    emit('update:modelValue', false)
    emit('close')
}

const calculateTotalPR = (items) => {
    if (!items || !Array.isArray(items)) return 0
    return items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.estimated_price) || 0)), 0)
}

const getLatestRevisionNote = (pr) => {
    if (!pr?.approval_request?.actions || !Array.isArray(pr.approval_request.actions)) return null
    const revAction = pr.approval_request.actions
        .filter(a => a.action === 'revision' || a.action === 'request_revision')
        .sort((a, b) => new Date(b.acted_at || 0) - new Date(a.acted_at || 0))[0]
    return revAction || null
}
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        @close="close"
        size="5xl"
        body-class="p-5 space-y-5 text-xs"
    >
        <template #header>
            <div class="flex items-center gap-3">
                <div class="p-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                    <FileText class="w-5 h-5 text-slate-800" />
                </div>
                <div>
                    <div class="flex items-center gap-2.5">
                        <h3 class="text-sm sm:text-base font-bold text-slate-900 font-mono tracking-tight">
                            {{ item?.pr_number }}
                        </h3>
                        <StatusBadge v-if="item?.status" :status="item.status" size="sm" />
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5">
                        Rincian lengkap dokumen pengajuan pengadaan barang & jasa
                    </p>
                </div>
            </div>
        </template>

        <div v-if="isLoading" class="py-12 text-center">
            <RefreshCw class="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
            <span class="text-xs text-slate-500">Memuat rincian dokumen PR...</span>
        </div>

        <template v-else-if="item">
            <!-- Ready for Pickup Alert Banner -->
            <div 
                v-if="item.status === 'ready_for_pickup'" 
                class="p-4 bg-gradient-to-r from-amber-50 via-amber-50/70 to-emerald-50 border border-amber-300 rounded-xl space-y-3 shadow-2xs"
            >
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Package class="w-5 h-5" />
                        </div>
                        <div>
                            <h4 class="text-sm font-bold text-slate-900">Barang Telah Tiba di Gudang & Siap Diambil!</h4>
                            <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                Barang pesanan Anda telah tiba di gudang dan selesai diverifikasi oleh petugas inventaris. Silakan lakukan pengambilan di loket gudang dan konfirmasi penerimaan barang untuk menyelesaikan pengajuan ini.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        @click="emit('confirmReceipt', item)"
                        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                        <CheckCircle2 class="w-4 h-4" />
                        <span>Konfirmasi Terima Barang</span>
                    </button>
                </div>
            </div>

            <!-- Revision Notice Banner if revision_requested -->
            <div 
                v-if="item.status === 'revision_requested'" 
                class="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2"
            >
                <div class="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <RotateCcw class="w-4 h-4 text-amber-600" />
                    <span>Permintaan Revisi Dokumen dari Peninjau:</span>
                </div>
                <p class="text-xs text-amber-900 bg-white/80 p-3 rounded-lg border border-amber-200/70 font-medium leading-relaxed">
                    "{{ getLatestRevisionNote(item)?.notes || 'Mohon sesuaikan rincian barang dan perkiraan harga sesuai arahan pimpinan.' }}"
                </p>
                <div class="flex items-center justify-between text-[11px] text-amber-700">
                    <span>Peninjau: <strong>{{ getLatestRevisionNote(item)?.user_name || 'Approver' }}</strong></span>
                    <span v-if="getLatestRevisionNote(item)?.acted_at">{{ formatDate(getLatestRevisionNote(item).acted_at) }}</span>
                </div>
            </div>

            <!-- Key Metadata Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <div>
                    <span class="text-slate-400 font-medium block text-[11px]">Perusahaan:</span>
                    <span class="font-semibold text-slate-800 mt-0.5 block">{{ item.company?.name || '-' }}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-medium block text-[11px]">Divisi:</span>
                    <span class="font-semibold text-slate-800 mt-0.5 block">{{ item.division?.name || '-' }}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-medium block text-[11px]">Tanggal Pengajuan:</span>
                    <span class="font-semibold text-slate-800 mt-0.5 block">{{ formatDate(item.request_date) }}</span>
                </div>
                <div>
                    <span class="text-slate-400 font-medium block text-[11px]">Target Kebutuhan:</span>
                    <span class="font-semibold text-slate-800 mt-0.5 block">{{ formatDate(item.required_date) }}</span>
                </div>
            </div>

            <!-- Total Estimated Amount Card -->
            <div class="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-xl shadow-xs">
                <div class="space-y-0.5">
                    <span class="text-xs text-blue-100 font-medium">Total Estimasi Nilai Pengadaan</span>
                    <p class="text-[11px] text-blue-200/90">Total akumulasi perkiraan biaya dari seluruh item yang diajukan.</p>
                </div>
                <div class="text-base font-mono font-bold tracking-tight text-white">
                    {{ formatCurrency(item.total_estimated_amount || calculateTotalPR(item.items)) }}
                </div>
            </div>

            <!-- Purpose & Notes -->
            <div class="space-y-2.5">
                <div class="bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                    <span class="text-xs font-bold text-slate-800 block mb-1">Keperluan Pengadaan:</span>
                    <p class="text-slate-700 leading-relaxed">
                        {{ item.purpose }}
                    </p>
                </div>

                <div v-if="item.notes" class="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                    <span class="text-xs font-bold text-slate-600 block mb-1">Catatan Tambahan:</span>
                    <p class="text-slate-600">{{ item.notes }}</p>
                </div>
            </div>

            <!-- Approval Workflow Progress Tracker & Audit Trail -->
            <DocumentWorkflowTracker
                documentType="purchase_requisition"
                :documentId="item.id"
                title="Progres Alur Persetujuan (Workflow)"
                auditTrailTitle="Jejak Audit Persetujuan (Audit Trail)"
            />

            <!-- Items Table -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Daftar Barang / Jasa Diajukan ({{ item.items?.length || 0 }} Item)
                    </h4>
                </div>

                <div class="border border-slate-200 rounded-lg overflow-hidden">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                <th class="py-2 px-3 w-10 text-center">No</th>
                                <th class="py-2 px-3">Item / Barang</th>
                                <th class="py-2 px-3 text-right w-20">Qty</th>
                                <th class="py-2 px-3 w-20">Satuan</th>
                                <th class="py-2 px-3 text-right w-28">Est. Harga Satuan</th>
                                <th class="py-2 px-3 text-right w-28">Subtotal</th>
                                <th class="py-2 px-3">Catatan / Referensi</th>
                                <th class="py-2 px-3 text-center min-w-[130px]">Status Item</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">
                            <tr 
                                v-for="(it, idx) in item.items" 
                                :key="it.id || idx" 
                                class="hover:bg-slate-50/50"
                                :class="{'bg-rose-50/20': it.approval_status === 'rejected'}"
                            >
                                <td class="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{{ idx + 1 }}</td>
                                <td class="py-2 px-3">
                                    <div class="font-bold text-slate-900 flex items-center gap-2">
                                        <span>{{ it.item?.name || it.item_name || 'Item #' + (it.item_id || '-') }}</span>
                                        <span 
                                            v-if="!it.item_id" 
                                            class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                        >
                                            Non-Katalog
                                        </span>
                                    </div>
                                    <div v-if="it.detail_name" class="text-xs text-slate-600 font-medium mt-0.5">
                                        {{ it.detail_name }}
                                    </div>
                                    <div v-if="it.item?.code" class="text-[10px] text-slate-400 font-mono mt-0.5">
                                        {{ it.item.code }}
                                    </div>
                                </td>
                                <td class="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                    {{ it.quantity }}
                                </td>
                                <td class="py-2 px-3 text-slate-600">
                                    {{ it.unit?.code || it.unit?.name || '-' }}
                                </td>
                                <td class="py-2 px-3 text-right font-mono text-slate-700">
                                    {{ formatCurrency(it.estimated_price || 0) }}
                                </td>
                                <td class="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                    {{ formatCurrency((Number(it.quantity) || 0) * (Number(it.estimated_price) || 0)) }}
                                </td>
                                <td class="py-2 px-3">
                                    <div v-if="it.notes" class="text-slate-700">
                                        {{ it.notes }}
                                    </div>
                                    <a 
                                        v-if="it.reference_url" 
                                        :href="it.reference_url" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        class="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium mt-0.5"
                                    >
                                        <ExternalLink class="w-3 h-3" />
                                        <span>Link Referensi</span>
                                    </a>
                                </td>
                                <td class="py-2 px-3 text-center">
                                    <div v-if="it.approval_status === 'approved'">
                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <CheckCircle2 class="w-3 h-3 text-emerald-600" />
                                            Disetujui
                                        </span>
                                    </div>
                                    <div v-else-if="it.approval_status === 'rejected'" class="space-y-0.5">
                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                            <XCircle class="w-3 h-3 text-rose-600" />
                                            Ditolak
                                        </span>
                                        <div v-if="it.rejection_reason" class="text-[10px] text-rose-600 italic line-clamp-2" :title="it.rejection_reason">
                                            "{{ it.rejection_reason }}"
                                        </div>
                                    </div>
                                    <div v-else>
                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                            <Clock class="w-3 h-3 text-amber-600" />
                                            Menunggu
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr class="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                                <td colspan="5" class="py-2.5 px-3 text-right text-xs">
                                    Total Disetujui:
                                </td>
                                <td class="py-2.5 px-3 text-right text-xs font-mono font-bold text-slate-900">
                                    {{ formatCurrency(item.total_estimated_amount || calculateTotalPR(item.items)) }}
                                </td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </template>

        <template #footer>
            <button
                type="button"
                @click="close"
                class="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors border border-slate-300 bg-white cursor-pointer"
            >
                Tutup
            </button>

            <div class="flex items-center gap-2">
                <button
                    v-if="item?.status === 'ready_for_pickup'"
                    type="button"
                    @click="emit('confirmReceipt', item)"
                    class="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    <span>Konfirmasi Terima Barang</span>
                </button>

                <RouterLink
                    v-if="item?.status === 'draft' || item?.status === 'revision_requested'"
                    :to="{ name: 'user.purchasing.requisitions.edit', params: { id: item.id } }"
                    class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
                >
                    <FileEdit class="w-3.5 h-3.5" />
                    <span>{{ item?.status === 'revision_requested' ? 'Perbaiki & Edit PR' : 'Edit Draft PR' }}</span>
                </RouterLink>

                <button
                    v-if="item?.can_be_submitted || item?.status === 'draft' || item?.status === 'revision_requested'"
                    type="button"
                    @click="emit('submitPR', item)"
                    class="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                    <Send class="w-3.5 h-3.5" />
                    <span>{{ item?.status === 'revision_requested' ? 'Ajukan Ulang Persetujuan' : 'Ajukan Persetujuan Sekarang' }}</span>
                </button>
            </div>
        </template>
    </BaseModal>
</template>
