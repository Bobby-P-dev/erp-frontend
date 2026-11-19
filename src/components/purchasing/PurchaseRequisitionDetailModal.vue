<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BaseModal from '../ui/BaseModal.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import PRDetailSummary from './detail/PRDetailSummary.vue'
import PRApprovalList from './detail/PRApprovalList.vue'
import PRProcessStepper from './detail/PRProcessStepper.vue'
import PRItemsTable from './detail/PRItemsTable.vue'
import RfqRequisitionLifecycle from './RfqRequisitionLifecycle.vue'
import RequisitionPurchaseOrders from './RequisitionPurchaseOrders.vue'
import DocumentActivityTimeline from './DocumentActivityTimeline.vue'
import { useAuthStore } from '../../stores/auth.js'
import { formatDate } from '../../composables/useFormatter.js'
import {
    FileText,
    RotateCcw,
    Package,
    FileEdit,
    Send,
    RefreshCw,
    ChevronDown,
    Eye,
    Trash2,
    Loader2
} from '@lucide/vue'

const props = defineProps({
    allowDelete: { type: Boolean, default: false },
    deleting: { type: Boolean, default: false },
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

const emit = defineEmits(['update:modelValue', 'close', 'submitPR', 'updated', 'deletePR'])

const authStore = useAuthStore()
const isDownloadingPdf = ref(false)
const sourceEditing = ref(false)

const sections = ref({
    summary: true,
    items: true,
    approval: false,
    process: false,
    history: false
})

watch(
    () => props.item?.status,
    (status) => {
        const isDraft = !status || status === 'draft'
        sections.value = {
            summary: true,
            items: true,
            approval: !isDraft,
            process: ['in_procurement', 'ready_for_pickup', 'completed'].includes(status),
            history: false
        }
    },
    { immediate: true }
)

const showPoFollowUp = computed(() => {
    const it = props.item
    if (!it || it.procurement_route !== 'direct_supplier') return false
    const readyStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed']
    const hasActionableOrCreatedPo = it.source_po_groups?.some(g => g.can_create || g.orders?.length > 0)
    return readyStatuses.includes(it.status) || Boolean(hasActionableOrCreatedPo)
})

const toggleSection = (key) => {
    sections.value[key] = !sections.value[key]
}

const close = () => {
    emit('update:modelValue', false)
    emit('close')
}

const getLatestRevisionNote = (pr) => {
    if (!pr?.approval_request?.actions || !Array.isArray(pr.approval_request.actions)) return null
    const revAction = pr.approval_request.actions
        .filter(a => a.action === 'revision' || a.action === 'request_revision')
        .sort((a, b) => new Date(b.acted_at || 0) - new Date(a.acted_at || 0))[0]
    return revAction || null
}

const canDownloadPdf = computed(() => {
    if (!props.item) return false
    const approvedStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed']
    return approvedStatuses.includes(props.item.status)
})

const handleDownloadPdf = async () => {
    if (!props.item || isDownloadingPdf.value) return
    isDownloadingPdf.value = true
    try {
        const { generatePurchaseRequisitionPdf } = await import('../../utils/pdf/purchaseRequisitionPdfGenerator.js')
        await generatePurchaseRequisitionPdf(props.item, {
            currentUser: authStore.user?.name || 'Petugas ERP'
        })
    } finally {
        isDownloadingPdf.value = false
    }
}
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        @close="close"
        size="5xl"
        body-class="pr-detail p-5 sm:p-6 space-y-5 text-sm bg-white"
    >
        <!-- 1. HEADER MODAL -->
        <template #header>
            <div class="flex items-center gap-3.5">
                <!-- Simple Clean Document Icon -->
                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                    <FileText class="w-5 h-5" />
                </div>

                <!-- Document Identity -->
                <div class="space-y-0.5 min-w-0">
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <h3 class="text-base sm:text-lg font-mono font-bold text-slate-900 tracking-tight">
                            {{ item?.pr_number || 'Purchase Requisition' }}
                        </h3>
                        <StatusBadge 
                            v-if="item?.status" 
                            :status="item.status" 
                            size="sm" :dot="false"
                        />
                    </div>
                    <p class="text-xs text-slate-500">
                        Detail pengajuan pengadaan barang & jasa
                    </p>
                </div>
            </div>
        </template>

        <!-- Loading State Skeleton -->
        <div v-if="isLoading" class="py-16 text-center space-y-3">
            <RefreshCw class="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <div class="text-xs font-semibold text-slate-700">Memuat rincian dokumen PR...</div>
            <p class="text-[11px] text-slate-400">Menyinkronkan data pemohon, status persetujuan, dan rincian item pengadaan.</p>
        </div>

        <template v-else-if="item">
            <!-- 1. CRITICAL STATUS BANNERS -->
            <!-- Ready for Pickup Banner -->
            <div 
                v-if="item.status === 'ready_for_pickup'" 
                class="p-4 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-start gap-3"
            >
                <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Package class="w-5 h-5" />
                </div>
                <div class="space-y-0.5">
                    <h4 class="text-xs sm:text-sm font-bold text-emerald-950">
                        Barang Telah Tiba di Gudang & Siap Diambil
                    </h4>
                    <p class="text-xs text-emerald-800 leading-relaxed">
                        Barang pesanan telah tiba di gudang dan selesai diverifikasi petugas logistik. Proses pencatatan penerimaan fisik dan serah terima dilakukan oleh staf gudang pada modul <strong>Inventory</strong>.
                    </p>
                </div>
            </div>

            <!-- Revision Requested Banner -->
            <div 
                v-if="item.status === 'revision_requested'" 
                class="p-4 bg-amber-50 border border-amber-200/90 rounded-xl space-y-2"
            >
                <div class="flex items-center gap-2 text-amber-950 font-bold text-xs">
                    <RotateCcw class="w-4 h-4 text-amber-600" />
                    <span>Permintaan Revisi Dokumen dari Peninjau:</span>
                </div>
                <p class="text-xs text-amber-900 bg-white/90 p-3 rounded-lg border border-amber-200/80 font-medium leading-relaxed">
                    "{{ getLatestRevisionNote(item)?.notes || 'Mohon sesuaikan rincian barang dan perkiraan harga sesuai arahan pimpinan.' }}"
                </p>
                <div class="flex items-center justify-between text-[11px] text-amber-800 pt-0.5">
                    <span>Peninjau: <strong>{{ getLatestRevisionNote(item)?.user_name || 'Approver' }}</strong></span>
                    <span v-if="getLatestRevisionNote(item)?.acted_at" class="font-mono">
                        {{ formatDate(getLatestRevisionNote(item).acted_at) }}
                    </span>
                </div>
            </div>

            <!-- 2. RINGKASAN DOKUMEN (Paling atas agar langsung terbaca sekilas) -->
            <section class="space-y-2.5">
                <button
                    type="button"
                    @click="toggleSection('summary')"
                    class="w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/70 transition-colors cursor-pointer select-none"
                    :aria-expanded="sections.summary"
                >
                    <span class="text-sm font-semibold text-slate-800">
                        Ringkasan Dokumen
                    </span>
                    <ChevronDown
                        class="w-4 h-4 text-slate-500 transition-transform duration-200"
                        :class="{'rotate-180': sections.summary}"
                    />
                </button>

                <div v-show="sections.summary">
                    <PRDetailSummary :item="item" />
                </div>
            </section>

            <!-- 3. DAFTAR BARANG / JASA -->
            <section class="space-y-2.5">
                <button
                    type="button"
                    @click="toggleSection('items')"
                    class="w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/70 transition-colors cursor-pointer select-none"
                    :aria-expanded="sections.items"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-slate-800">
                            Daftar Barang / Jasa
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-slate-700 border border-slate-200">
                            {{ item.items?.length || 0 }} Item
                        </span>
                    </div>
                    <ChevronDown
                        class="w-4 h-4 text-slate-500 transition-transform duration-200"
                        :class="{'rotate-180': sections.items}"
                    />
                </button>

                <div v-show="sections.items">
                    <PRItemsTable :item="item" />
                </div>
            </section>

            <!-- 4. TINDAK LANJUT PO / RFQ (Kontekstual saat relevan) -->
            <RfqRequisitionLifecycle
                v-if="item.source?.type === 'rfq_quotation'"
                :item="item"
                @updated="emit('updated', $event)"
                @editing="sourceEditing = $event"
            />

            <section
                v-if="showPoFollowUp"
                class="rounded-xl border border-blue-100 bg-blue-50/30 p-4"
            >
                <RequisitionPurchaseOrders :item="item" class="!border-t-0 !pt-0" @updated="emit('updated', $event)" />
            </section>

            <!-- 5. APPROVAL (ALUR PERSETUJUAN) -->
            <section class="space-y-2.5">
                <button
                    type="button"
                    @click="toggleSection('approval')"
                    class="w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/70 transition-colors cursor-pointer select-none"
                    :aria-expanded="sections.approval"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-slate-800">
                            Alur Persetujuan
                        </span>
                        <span 
                            v-if="item.approval_request?.levels?.length" 
                            class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-slate-700 border border-slate-200"
                        >
                            {{ item.approval_request.levels.length }} Tingkat
                        </span>
                    </div>
                    <ChevronDown 
                        class="w-4 h-4 text-slate-500 transition-transform duration-200" 
                        :class="{'rotate-180': sections.approval}"
                    />
                </button>

                <div v-show="sections.approval" class="rounded-xl border border-slate-200/80 px-3">
                    <PRApprovalList :item="item" />
                </div>
            </section>

            <!-- 6. TAHAPAN PROSES -->
            <section class="space-y-2.5">
                <button
                    type="button"
                    @click="toggleSection('process')"
                    class="w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/70 transition-colors cursor-pointer select-none"
                    :aria-expanded="sections.process"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-slate-800">
                            Tahapan Proses
                        </span>
                        <span class="text-xs text-slate-500 font-normal">
                            Progres pengadaan lintas divisi
                        </span>
                    </div>
                    <ChevronDown 
                        class="w-4 h-4 text-slate-500 transition-transform duration-200" 
                        :class="{'rotate-180': sections.process}"
                    />
                </button>

                <div v-show="sections.process" class="rounded-xl border border-slate-200/80 p-4">
                    <PRProcessStepper :item="item" />
                </div>
            </section>

            <!-- 7. RIWAYAT PERUBAHAN DATA -->
            <section class="space-y-2.5">
                <button
                    type="button"
                    @click="toggleSection('history')"
                    class="w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/70 transition-colors cursor-pointer select-none"
                    :aria-expanded="sections.history"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-slate-800">
                            Riwayat Perubahan Data
                        </span>
                        <span class="text-xs text-slate-500 font-normal">
                            Jejak edit, pembatalan &amp; item pengajuan
                        </span>
                    </div>
                    <ChevronDown 
                        class="w-4 h-4 text-slate-500 transition-transform duration-200" 
                        :class="{'rotate-180': sections.history}"
                    />
                </button>

                <div v-show="sections.history">
                    <DocumentActivityTimeline
                        v-if="item?.id"
                        document-type="purchase_requisition"
                        :document-id="item.id"
                        :active="modelValue && sections.history"
                    />
                </div>
            </section>
        </template>

        <!-- 7. FOOTER MODAL & ACTION BUTTONS -->
        <template #footer>
            <div class="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <!-- Left: Tutup -->
                <button
                    type="button"
                    @click="close"
                    class="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300 bg-white cursor-pointer"
                >
                    Tutup
                </button>

                <!-- Right: Action Buttons -->
                <div class="flex items-center gap-2.5 flex-wrap">
                    <!-- Unduh PDF jika disetujui -->
                    <button
                        v-if="canDownloadPdf"
                        type="button"
                        :disabled="isDownloadingPdf"
                        @click="handleDownloadPdf"
                        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-slate-700 hover:text-[#014BAA] hover:bg-[#EAF2FF] rounded-lg text-xs font-semibold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                        title="Preview Lembar Persetujuan PR (PDF)"
                    >
                        <Loader2 v-if="isDownloadingPdf" class="w-4 h-4 animate-spin text-[#014BAA]" />
                        <Eye v-else class="w-4 h-4 text-slate-600" />
                        <span>Preview PDF</span>
                    </button>


                    <!-- Edit Draft / Revisi PR -->
                    <RouterLink
                        v-if="!item?.source && (item?.can_be_edited ?? ['draft', 'revision_requested'].includes(item?.status))"
                        :to="{ name: 'user.purchasing.requisitions.edit', params: { id: item.id } }"
                        class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EAF2FF] hover:bg-blue-100 text-[#014BAA] border border-[#014BAA]/20 rounded-lg text-xs font-bold transition-colors"
                    >
                        <FileEdit class="w-4 h-4" />
                        <span>Edit PR</span>
                    </RouterLink>

                    <button v-if="allowDelete && !sourceEditing && item?.can_be_deleted" type="button" :disabled="deleting" class="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50" @click="emit('deletePR', item)"><Trash2 class="size-4" />Hapus PR</button>

                    <!-- Submit PR -->
                    <button
                        v-if="!sourceEditing && (item?.can_be_submitted ?? ['draft', 'revision_requested'].includes(item?.status))"
                        type="button"
                        @click="emit('submitPR', item)"
                        class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                        <Send class="w-3.5 h-3.5" />
                        <span>{{ item?.status === 'revision_requested' ? 'Ajukan Ulang Persetujuan' : 'Ajukan Persetujuan Sekarang' }}</span>
                    </button>
                </div>
            </div>
        </template>
    </BaseModal>
</template>

<style scoped>
:global(.pr-detail) { max-height: min(74vh, calc(100dvh - 210px)); }
:global(.pr-detail button:focus-visible), :global(.pr-detail a:focus-visible) { outline: 2px solid #014baa; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { :global(.pr-detail *) { transition: none !important; animation: none !important; } }
@media (max-width: 639px) { :global(.pr-detail) { max-height: max(140px, calc(100dvh - 310px)); } }
</style>
