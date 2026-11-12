<script setup>
import { ref, computed, watch } from 'vue'
import {
    X,
    ExternalLink,
    FileText,
    Clock,
    CheckCircle2,
    RotateCcw,
    XCircle,
    AlertCircle,
    Layers,
    Package,
    AlertTriangle,
    Pencil
} from '@lucide/vue'
import ApprovalBadge from './ApprovalBadge.vue'
import ApprovalReviewSummary from './ApprovalReviewSummary.vue'
import BaseTable from '../ui/BaseTable.vue'
import ReviewDisclosure from '../ui/ReviewDisclosure.vue'
import ApprovalStepper from './ApprovalStepper.vue'
import ApprovalAuditTrail from './ApprovalAuditTrail.vue'
import ApprovalActionDialog from './ApprovalActionDialog.vue'
import DocumentLifecycleTimeline from './DocumentLifecycleTimeline.vue'
import { formatCurrency } from '../../utils/stringUtils.js'
import { 
    getApprovalTracker, 
    approveDocument, 
    rejectDocument, 
    requestRevisionDocument 
} from '../../services/approvalServices.js'
import { showSuccess, showError, showLoading } from '../../utils/swal.js'
import { useApprovalStore } from '../../stores/approvalStore.js'
import { useAuthStore } from '../../stores/auth.js'
import { getQuotationApprovalTracker, decideQuotationApproval } from '../../services/rfqServices.js'
import { formatCurrency as formatQuotationCurrency } from '../../composables/useFormatter.js'

const props = defineProps({
    isOpen: {
        type: Boolean,
        default: false,
    },
    show: {
        type: Boolean,
        default: false,
    },
    task: {
        type: Object,
        default: null,
    },
})

const emit = defineEmits(['close', 'acted', 'action-success', 'refresh-requested'])

const isDrawerVisible = computed(() => props.isOpen || props.show)

const approvalStore = useApprovalStore()
const authStore = useAuthStore()
const isLoadingTracker = ref(false)
const trackerData = ref(null)
const trackerError = ref('')
let trackerLoad = 0
const isQuotationReview = computed(() => props.task?.document_type === 'supplier_quotation')
const activeWorkflowTab = ref('tiers') // 'lifecycle' | 'tiers'

const effectiveDoc = computed(() => {
    return trackerData.value?.request || props.task || {}
})

const effectiveItems = computed(() => {
    if (isQuotationReview.value) return (effectiveDoc.value?.items || []).map(item => ({
        ...item, estimated_price: item.unit_price, estimated_subtotal: item.subtotal,
    }))
    return effectiveDoc.value?.items || []
})

const isCurrentRequester = computed(() => {
    const currentUserId = authStore.user?.id
    const requesterId = effectiveDoc.value?.requester_id || effectiveDoc.value?.requester?.id
    if (currentUserId && requesterId) {
        return Number(currentUserId) === Number(requesterId)
    }
    return false
})

const canUserAct = computed(() => {
    if (isQuotationReview.value) return !isLoadingTracker.value && !trackerError.value
        && Number(trackerData.value?.request?.id) === Number(props.task?.id)
        && trackerData.value?.can_current_user_approve === true
    if (trackerData.value?.can_current_user_approve !== undefined) {
        return Boolean(trackerData.value.can_current_user_approve)
    }
    if (props.task?.can_current_user_approve !== undefined) {
        return Boolean(props.task.can_current_user_approve)
    }
    // Maker-checker rule: requester cannot self-approve
    if (isCurrentRequester.value) {
        return false
    }
    // Cannot act on already completed/rejected/cancelled request
    const status = effectiveDoc.value?.status
    if (status && ['approved', 'rejected', 'cancelled'].includes(status)) {
        return false
    }
    return true
})

// Action Dialog state
const showActionDialog = ref(false)
const selectedActionType = ref('approve')

// Item-level approval decisions state
const itemRejectionStates = ref({})

const isDocPurchaseRequisition = computed(() => {
    const docType = String(effectiveDoc.value?.document_type || effectiveDoc.value?.approvable_type || '').toLowerCase()
    return docType.includes('purchase_requisition')
})

const itemColumns = computed(() => [
    { key: 'item', label: 'Barang / jasa', width: '32%', minWidth: '240px' },
    { key: 'quantity', label: 'Jumlah', width: '14%', align: 'right' },
    { key: 'price', label: isQuotationReview.value ? 'Harga satuan' : 'Estimasi satuan', width: '19%', align: 'right' },
    { key: 'subtotal', label: 'Subtotal', width: '19%', align: 'right' },
    ...(isDocPurchaseRequisition.value ? [{ key: 'decision', label: 'Keputusan item', width: '240px' }] : []),
])

watch([effectiveItems, isDrawerVisible], ([items, visible]) => {
    if (visible && Array.isArray(items)) {
        const nextState = {}
        items.forEach(it => {
            const isAlreadyRejected = it.approval_status === 'rejected'
            nextState[it.id] = {
                isRejected: isAlreadyRejected,
                isPermanentlyLocked: isAlreadyRejected,
                reason: it.rejection_reason || '',
            }
        })
        itemRejectionStates.value = nextState
    } else {
        itemRejectionStates.value = {}
    }
}, { immediate: true })

const activeApprovedItemsCount = computed(() => {
    if (!effectiveItems.value.length) return 0
    return effectiveItems.value.filter(it => !itemRejectionStates.value[it.id]?.isRejected).length
})

const totalRejectedItemsCount = computed(() => {
    if (!effectiveItems.value.length) return 0
    return effectiveItems.value.filter(it => itemRejectionStates.value[it.id]?.isRejected).length
})

const isAllItemsRejected = computed(() => {
    if (!effectiveItems.value.length) return false
    return activeApprovedItemsCount.value === 0
})

const dynamicEffectiveTotal = computed(() => {
    if (!isDocPurchaseRequisition.value) {
        return effectiveDoc.value?.total_amount
    }
    return effectiveItems.value
        .filter(it => !itemRejectionStates.value[it.id]?.isRejected)
        .reduce((acc, it) => {
            const qty = Number(it.quantity) || 0
            const price = Number(it.estimated_price) || 0
            return acc + (qty * price)
        }, 0)
})

// Item Rejection Dialog state
const isItemRejectDialogOpen = ref(false)
const selectedItemForRejection = ref(null)
const itemRejectReasonInput = ref('')
const itemRejectError = ref('')

const openRejectItemDialog = (item) => {
    selectedItemForRejection.value = item
    itemRejectReasonInput.value = itemRejectionStates.value[item.id]?.reason || ''
    itemRejectError.value = ''
    isItemRejectDialogOpen.value = true
}

const confirmRejectItem = () => {
    const trimmed = itemRejectReasonInput.value.trim()
    if (!trimmed) {
        itemRejectError.value = 'Alasan penolakan item wajib diisi.'
        return
    }
    if (trimmed.length < 3) {
        itemRejectError.value = 'Alasan penolakan minimal 3 karakter.'
        return
    }

    const itemId = selectedItemForRejection.value.id
    if (!itemRejectionStates.value[itemId]) {
        itemRejectionStates.value[itemId] = { isRejected: false, isPermanentlyLocked: false, reason: '' }
    }
    itemRejectionStates.value[itemId].isRejected = true
    itemRejectionStates.value[itemId].reason = trimmed
    
    isItemRejectDialogOpen.value = false
    selectedItemForRejection.value = null
    itemRejectReasonInput.value = ''
    itemRejectError.value = ''
}

const cancelItemRejection = (itemId) => {
    if (itemRejectionStates.value[itemId]?.isPermanentlyLocked) return
    if (itemRejectionStates.value[itemId]) {
        itemRejectionStates.value[itemId].isRejected = false
        itemRejectionStates.value[itemId].reason = ''
    }
}

const toggleItemRejection = (itemId, shouldReject) => {
    if (!itemRejectionStates.value[itemId]) {
        itemRejectionStates.value[itemId] = { isRejected: false, isPermanentlyLocked: false, reason: '' }
    }
    if (itemRejectionStates.value[itemId].isPermanentlyLocked) return
    itemRejectionStates.value[itemId].isRejected = shouldReject
    if (!shouldReject) {
        itemRejectionStates.value[itemId].reason = ''
    }
}

const fetchTracker = async (requestId) => {
    if (!requestId) return
    const loadId = ++trackerLoad
    trackerData.value = null
    trackerError.value = ''
    try {
        isLoadingTracker.value = true
        const response = await (isQuotationReview.value ? getQuotationApprovalTracker : getApprovalTracker)(requestId)
        if (loadId !== trackerLoad || props.task?.id !== requestId) return
        trackerData.value = response.data
    } catch (err) {
        if (loadId !== trackerLoad || props.task?.id !== requestId) return
        trackerError.value = err.response?.data?.message || 'Gagal memuat approval. Buka kembali untuk memperbarui data.'
        console.error('Failed to fetch approval tracker:', err)
    } finally {
        if (loadId === trackerLoad) isLoadingTracker.value = false
    }
}

watch(isDrawerVisible, (newVal) => {
    if (newVal && props.task) {
        activeWorkflowTab.value = 'tiers'
        fetchTracker(props.task.id)
    } else {
        trackerData.value = null
        isItemRejectDialogOpen.value = false
        selectedItemForRejection.value = null
    }
})

watch(() => props.task, (newTask) => {
    if (isDrawerVisible.value && newTask) {
        fetchTracker(newTask.id)
    }
})

const openDecision = (actionType) => {
    selectedActionType.value = actionType
    showActionDialog.value = true
}

const handleActionConfirm = async ({ action, notes, done, fail }) => {
    if (!props.task) return
    if (isQuotationReview.value && !canUserAct.value) {
        fail('Data atau izin approval belum tersedia. Muat ulang approval.')
        return
    }
    try {
        showLoading('Memproses Keputusan...', 'Mohon tunggu sebentar.')

        const expectedStep = trackerData.value?.request?.current_step_order || props.task.current_step_order

        if (isQuotationReview.value) {
            await decideQuotationApproval(props.task.id, action, notes, expectedStep)
            showSuccess('Keputusan review tercatat', 'Status quotation telah diperbarui.')
        } else if (action === 'approve') {
            const rejectedDecisions = isDocPurchaseRequisition.value
                ? effectiveItems.value
                    .filter(it => itemRejectionStates.value[it.id]?.isRejected && !itemRejectionStates.value[it.id]?.isPermanentlyLocked)
                    .map(it => ({
                        item_id: it.id,
                        action: 'reject',
                        rejection_reason: itemRejectionStates.value[it.id]?.reason || notes || 'Ditolak oleh peninjau.',
                    }))
                : []

            await approveDocument(props.task.id, notes, expectedStep, rejectedDecisions)
            if (isAllItemsRejected.value) {
                showSuccess('Ditolak Otomatis!', `Karena seluruh item ditolak, dokumen ${props.task.document_number} telah ditolak.`)
            } else if (rejectedDecisions.length > 0) {
                showSuccess('Disetujui Sebagian!', `Dokumen ${props.task.document_number} disetujui dengan ${rejectedDecisions.length} item dicoret/ditolak.`)
            } else {
                showSuccess('Disetujui!', `Dokumen ${props.task.document_number} berhasil disetujui.`)
            }
        } else if (action === 'revision') {
            await requestRevisionDocument(props.task.id, notes, expectedStep)
            showSuccess('Permintaan Revisi Terkirim!', `Dokumen ${props.task.document_number} telah dikembalikan kepada pemohon dengan instruksi perbaikan Anda.`)
        } else if (action === 'reject') {
            await rejectDocument(props.task.id, notes, expectedStep)
            showSuccess('Ditolak!', `Dokumen ${props.task.document_number} telah ditolak.`)
        }

        approvalStore.decrementCountOptimistic()
        done()
        emit('acted')
        emit('action-success')
        emit('close')
    } catch (error) {
        if (isQuotationReview.value) {
            const message = error.response?.data?.message || 'Gagal memproses review quotation.'
            fail(message)
            await fetchTracker(props.task.id)
            emit('refresh-requested')
            showError('Review belum diproses', message)
            return
        }
        if (error.response?.status === 409) {
            fail('Tahapan persetujuan telah diselesaikan oleh approver lain. Data akan diperbarui.')
            fetchTracker(props.task.id)
        } else {
            const msg = error.response?.data?.message || 'Gagal memproses persetujuan dokumen.'
            fail(msg)
            showError('Gagal!', msg, error)
        }
    }
}

const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })
}
</script>

<template>
    <Teleport to="body">
        <div 
            v-if="isDrawerVisible" 
            class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/40"
            @click="emit('close')"
        >
            <!-- Centered Modal Box -->
            <div 
                class="approval-review bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl xl:max-w-6xl flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
                role="dialog" aria-modal="true" aria-labelledby="approval-review-title"
                @click.stop
            >
                <!-- MODAL HEADER -->
                <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                            <FileText class="w-5 h-5" />
                        </div>
                        <div>
                            <div class="flex flex-wrap items-center gap-2.5">
                                <h3 id="approval-review-title" class="text-base font-semibold text-slate-900 tracking-tight">
                                    {{ effectiveDoc.document_number || 'Review Dokumen' }}
                                </h3>
                                <ApprovalBadge :status="effectiveDoc.status || 'pending'" size="sm" appearance="subtle" />
                            </div>
                            <p class="text-xs text-slate-500 capitalize mt-0.5">
                                {{ effectiveDoc.document_type_label || String(effectiveDoc.document_type || '').replace(/_/g, ' ') }}
                            </p>
                        </div>
                    </div>

                    <button 
                        type="button"
                        @click="emit('close')"
                        class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Tutup Modal"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- MODAL CONTENT (Scrollable) -->
                <div class="review-body flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-7 overscroll-contain">
                    <p v-if="isQuotationReview && trackerError" role="alert" class="text-sm text-rose-800 mb-4">{{ trackerError }}</p>
                    <ApprovalReviewSummary :key="`summary-${props.task?.id}`" :document="effectiveDoc" :currency="isQuotationReview ? effectiveDoc.supplier_quotation?.currency || 'IDR' : 'IDR'" :format-date="formatDate" />
                    <ReviewDisclosure v-if="isQuotationReview && effectiveDoc.supplier_quotation" :key="`quotation-${props.task?.id}`" title="Ketentuan quotation" :description="`${effectiveDoc.supplier_quotation.supplier?.name || 'Supplier'} · Versi ${effectiveDoc.supplier_quotation.review_version}`">
                        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
                            <div><dt class="text-xs text-slate-500 mb-1">Syarat pembayaran</dt><dd>{{ effectiveDoc.supplier_quotation.payment_terms || '—' }}</dd></div>
                            <div><dt class="text-xs text-slate-500 mb-1">Lead time</dt><dd>{{ effectiveDoc.supplier_quotation.lead_time_days ?? '—' }} hari</dd></div>
                            <div><dt class="text-xs text-slate-500 mb-1">Berlaku sampai</dt><dd>{{ formatDate(effectiveDoc.supplier_quotation.valid_until) }}</dd></div>
                            <div><dt class="text-xs text-slate-500 mb-1">Pajak / ongkir</dt><dd>{{ formatQuotationCurrency(effectiveDoc.supplier_quotation.tax_amount, effectiveDoc.supplier_quotation.currency) }} / {{ formatQuotationCurrency(effectiveDoc.supplier_quotation.shipping_cost, effectiveDoc.supplier_quotation.currency) }}</dd></div>
                        </dl>
                    </ReviewDisclosure>

                    <!-- RINCIAN BARANG / JASA (ITEMS TABLE) -->
                    <div class="space-y-2.5">
                        <div class="flex items-center justify-between">
                            <h4 class="text-sm font-semibold text-slate-800 flex flex-wrap items-center gap-2">
                                <Package class="w-4 h-4 text-slate-600" />
                                Barang & jasa
                                <span class="px-2 py-0.2 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {{ effectiveItems.length }} Item
                                </span>
                            </h4>
                        </div>

                        <!-- Alert Banner for Item-Level Decisions -->
                        <div 
                            v-if="canUserAct && isDocPurchaseRequisition && totalRejectedItemsCount > 0" 
                            class="p-3 rounded-lg border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150"
                            :class="isAllItemsRejected ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'"
                        >
                            <div class="flex items-center gap-2">
                                <AlertTriangle class="w-4 h-4 shrink-0" :class="isAllItemsRejected ? 'text-rose-600' : 'text-amber-600'" />
                                <span v-if="isAllItemsRejected" class="font-medium">
                                    <strong>Perhatian:</strong> Seluruh item ({{ totalRejectedItemsCount }} item) ditandai ditolak. Jika Anda melanjutkan persetujuan dengan kondisi ini, dokumen pengajuan akan <strong>otomatis ditolak secara keseluruhan</strong>.
                                </span>
                                <span v-else class="font-medium">
                                    <strong>Catatan Persetujuan Parsial:</strong> {{ totalRejectedItemsCount }} dari {{ effectiveItems.length }} item ditandai ditolak. Nilai estimasi disetujui disesuaikan menjadi <strong>{{ formatCurrency(dynamicEffectiveTotal) }}</strong>.
                                </span>
                            </div>
                        </div>

                        <div v-if="isLoadingTracker && effectiveItems.length === 0" class="p-8 text-center bg-slate-50 rounded-lg border border-slate-200">
                            <div class="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <span class="text-xs text-slate-500">Memuat rincian item pengajuan...</span>
                        </div>

                        <div v-else-if="effectiveItems.length === 0" class="p-6 text-center bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                            Dokumen ini tidak memiliki rincian item barang/jasa atau item dimuat dari sistem dokumen terkait.
                        </div>

                        <div v-else class="border border-slate-200 rounded-xl overflow-hidden">
                            <p class="px-5 py-2.5 text-xs text-slate-500 border-b border-slate-100 lg:hidden">Geser tabel untuk melihat nilai dan keputusan item.</p>
                            <BaseTable :columns="itemColumns" min-width="860px" label="Barang dan keputusan pengajuan">
                                <tr v-for="(item, idx) in effectiveItems" :key="item.id || idx" :class="{ 'bg-rose-50/50': itemRejectionStates[item.id]?.isRejected }">
                                    <td class="review-item">
                                        <p class="font-medium text-slate-900" :class="{ 'line-through text-slate-400': itemRejectionStates[item.id]?.isRejected }">{{ item.item_name || 'Item #' + (item.item_id || item.id) }}</p>
                                        <p v-if="item.detail_name" class="mt-1 text-xs text-slate-500">{{ item.detail_name }}</p>
                                        <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                            <span v-if="item.item_code">{{ item.item_code }}</span>
                                            <span v-if="item.is_non_catalog" class="text-amber-700">Non-katalog</span>
                                        </div>
                                        <details v-if="item.notes || item.reference_url" class="mt-2 text-xs text-slate-500">
                                            <summary class="cursor-pointer w-fit">Catatan & referensi</summary>
                                            <p v-if="item.notes" class="mt-2 whitespace-pre-line">{{ item.notes }}</p>
                                            <a v-if="item.reference_url" :href="item.reference_url" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1 text-blue-700 hover:underline"><ExternalLink class="size-3" />Buka referensi</a>
                                        </details>
                                    </td>
                                    <td class="text-right tabular-nums whitespace-nowrap">
                                        <p :class="{ 'line-through text-slate-400': itemRejectionStates[item.id]?.isRejected }">{{ item.quantity }}</p>
                                        <p class="mt-1 text-xs text-slate-500">{{ item.unit?.code || item.unit?.name || item.unit_name || '—' }}</p>
                                    </td>
                                    <td class="text-right tabular-nums whitespace-nowrap" :class="{ 'line-through text-slate-400': itemRejectionStates[item.id]?.isRejected }">{{ formatCurrency(item.estimated_price || 0, isQuotationReview ? item.currency || effectiveDoc.supplier_quotation?.currency || 'IDR' : 'IDR') }}</td>
                                    <td class="text-right tabular-nums whitespace-nowrap">
                                        <p :class="itemRejectionStates[item.id]?.isRejected ? 'line-through text-slate-400' : 'font-medium text-slate-900'">{{ formatCurrency(item.estimated_subtotal ?? ((Number(item.quantity) || 0) * (Number(item.estimated_price) || 0)), isQuotationReview ? item.currency || effectiveDoc.supplier_quotation?.currency || 'IDR' : 'IDR') }}</p>
                                        <p v-if="itemRejectionStates[item.id]?.isRejected" class="mt-1 text-xs text-rose-700">Ditolak · {{ formatCurrency(0) }}</p>
                                    </td>
                                    <td v-if="isDocPurchaseRequisition">
                                                <!-- Jika barang sudah ditolak permanen dari tier sebelumnya -->
                                                <div v-if="itemRejectionStates[item.id]?.isPermanentlyLocked" class="text-center">
                                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <XCircle class="w-3.5 h-3.5 text-rose-600" />
                                                        Ditolak Sebelumnya
                                                    </span>
                                                    <div v-if="itemRejectionStates[item.id]?.reason" class="text-[11px] text-rose-600 mt-1 italic" :title="itemRejectionStates[item.id]?.reason">
                                                        "{{ itemRejectionStates[item.id]?.reason }}"
                                                    </div>
                                                </div>

                                                <!-- Jika user adalah approver berwenang di step aktif -->
                                                <div v-else-if="canUserAct" class="flex flex-col items-center gap-2">
                                                    <!-- Sub-kasus A: Item sedang ditandai DITOLAK -->
                                                    <div v-if="itemRejectionStates[item.id]?.isRejected" class="w-full space-y-2">
                                                        <div class="flex items-center justify-between gap-1.5">
                                                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                                                <XCircle class="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                                                Item Ditolak
                                                            </span>
                                                            <button
                                                                type="button"
                                                                @click="cancelItemRejection(item.id)"
                                                                class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                                                                title="Kembalikan item ini menjadi disetujui"
                                                            >
                                                                <CheckCircle2 class="w-3 h-3 text-emerald-600" />
                                                                <span>Batal Tolak</span>
                                                            </button>
                                                        </div>

                                                        <!-- Reason callout with edit button -->
                                                        <div class="p-2 rounded-lg bg-white border border-rose-200 text-xs text-rose-950 flex items-start justify-between gap-2 shadow-2xs">
                                                            <div class="min-w-0">
                                                                <span class="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Alasan:</span>
                                                                <p class="text-xs text-rose-900 mt-0.5 break-words line-clamp-3">
                                                                    "{{ itemRejectionStates[item.id].reason }}"
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                @click="openRejectItemDialog(item)"
                                                                class="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors shrink-0 cursor-pointer"
                                                                title="Ubah alasan penolakan"
                                                            >
                                                                <Pencil class="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <!-- Sub-kasus B: Item berstatus DISETUJUI (Default) -->
                                                    <div v-else class="flex items-center justify-center gap-2">
                                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                            <span>Disetujui</span>
                                                        </span>

                                                        <button
                                                            type="button"
                                                            @click="openRejectItemDialog(item)"
                                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
                                                            title="Tolak / coret item ini dari pengajuan"
                                                        >
                                                            <XCircle class="w-3.5 h-3.5" />
                                                            <span>Tolak</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <!-- Tampilan status read-only ketika melihat history / bukan reviewer -->
                                                <div v-else class="text-center">
                                                    <span 
                                                        v-if="item.approval_status === 'approved'"
                                                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    >
                                                        <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                                                        Disetujui
                                                    </span>
                                                    <span 
                                                        v-else-if="item.approval_status === 'rejected'"
                                                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                                                    >
                                                        <XCircle class="w-3.5 h-3.5 text-rose-600" />
                                                        Ditolak
                                                    </span>
                                                    <span 
                                                        v-else
                                                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                                                    >
                                                        <Clock class="w-3.5 h-3.5 text-amber-600" />
                                                        Menunggu
                                                    </span>
                                                </div>
                                    </td>
                                </tr>
                                <template #footer>
                                    <tr class="border-t border-slate-200 bg-slate-50/70">
                                        <td colspan="3" class="px-5 py-4 text-sm text-slate-500 text-right">{{ isQuotationReview ? 'Total quotation (termasuk pajak & ongkir)' : 'Total estimasi' }}{{ totalRejectedItemsCount > 0 ? ' disetujui' : '' }}</td>
                                        <td class="px-5 py-4 text-sm text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">{{ formatCurrency(dynamicEffectiveTotal, isQuotationReview ? effectiveDoc.supplier_quotation?.currency || 'IDR' : 'IDR') }}</td>
                                        <td v-if="isDocPurchaseRequisition"></td>
                                    </tr>
                                </template>
                            </BaseTable>
                        </div>
                    </div>

                    <!-- Stepper & Lifecycle Section (Alur Persetujuan & Siklus Hidup) -->
                    <ReviewDisclosure :key="`workflow-${props.task?.id}`" title="Alur persetujuan" :description="effectiveDoc.current_step_name || 'Lihat tahapan persetujuan dan perjalanan dokumen'">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">

                            <!-- Segmented View Toggle -->
                            <div class="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                                <button
                                    type="button"
                                    @click="activeWorkflowTab = 'lifecycle'"
                                    :class="[
                                        'px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                                        activeWorkflowTab === 'lifecycle'
                                            ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                                            : 'text-slate-600 hover:text-slate-900'
                                    ]"
                                >
                                    <Layers class="w-3.5 h-3.5 text-blue-600" />
                                    <span>Perjalanan dokumen</span>
                                </button>
                                <button
                                    type="button"
                                    @click="activeWorkflowTab = 'tiers'"
                                    :class="[
                                        'px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                                        activeWorkflowTab === 'tiers'
                                            ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                                            : 'text-slate-600 hover:text-slate-900'
                                    ]"
                                >
                                    <Clock class="w-3.5 h-3.5 text-slate-500" />
                                    <span>Tahapan ({{ effectiveDoc.current_step_order || 1 }}/{{ effectiveDoc.total_steps || trackerData?.levels?.length || '—' }})</span>
                                </button>
                            </div>
                        </div>

                        <!-- TAB 1: SIKLUS HIDUP LENGKAP (END-TO-END) -->
                        <div v-if="activeWorkflowTab === 'lifecycle'">
                            <DocumentLifecycleTimeline
                                :approvalRequestId="props.task?.id || effectiveDoc.id"
                                :documentId="effectiveDoc.approvable_id || effectiveDoc.id"
                                :documentType="effectiveDoc.document_type || effectiveDoc.approvable_type || 'purchase_requisition'"
                            />
                        </div>

                        <!-- TAB 2: STEPPER INTERNAL TIERS -->
                        <div v-else class="space-y-3">
                            <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <ApprovalStepper
                                    :levels="trackerData?.levels || effectiveDoc.levels || []"
                                    :currentStepOrder="trackerData?.request?.current_step_order || effectiveDoc.current_step_order || 1"
                                    :overallStatus="effectiveDoc.status || 'pending'"
                                    orientation="vertical"
                                />
                            </div>
                        </div>
                    </ReviewDisclosure>

                    <!-- Audit Trail Section -->
                    <ReviewDisclosure :key="`audit-${props.task?.id}`" title="Riwayat aktivitas" description="Keputusan, catatan, dan waktu tindakan">
                        <ApprovalAuditTrail
                            :actions="trackerData?.actions || effectiveDoc.actions || []"
                            :isLoading="isLoadingTracker"
                        />
                    </ReviewDisclosure>
                </div>

                <!-- MODAL FOOTER (Decision Action Bar) -->
                <div class="review-footer px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        @click="emit('close')"
                        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        Tutup
                    </button>

                    <!-- Action Buttons (when user is authorized approver) -->
                    <div v-if="canUserAct" class="review-actions flex flex-wrap items-center gap-2">
                        <!-- Request Revision -->
                        <button
                            type="button"
                            @click="openDecision('revision')"
                            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <RotateCcw class="w-3.5 h-3.5" />
                            Minta Revisi
                        </button>

                        <!-- Reject -->
                        <button
                            type="button"
                            @click="openDecision('reject')"
                            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <XCircle class="w-3.5 h-3.5" />
                            Tolak
                        </button>

                        <!-- Approve -->
                        <button
                            type="button"
                            @click="openDecision('approve')"
                            class="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                            <CheckCircle2 class="w-3.5 h-3.5" />
                            Setujui Dokumen
                        </button>
                    </div>

                    <!-- Maker-Checker Alert (Requester cannot approve their own document) -->
                    <div v-else-if="isCurrentRequester" class="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-2">
                        <AlertCircle class="w-4 h-4 text-amber-600 shrink-0" />
                        <span><strong>Prinsip Maker-Checker:</strong> Anda adalah pemohon dokumen ini sehingga tidak dapat menyetujuinya sendiri.</span>
                    </div>

                    <!-- Inactive / Unauthorized info -->
                    <div v-else class="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                        <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Menunggu tindakan pejabat approver berwenang atau alur telah selesai.</span>
                    </div>
                </div>
            </div>

            <!-- Action Confirmation Dialog -->
            <ApprovalActionDialog
                :isOpen="showActionDialog"
                :actionType="selectedActionType"
                :documentNumber="effectiveDoc.document_number"
                :documentTitle="effectiveDoc.document_title"
                :currentStepName="effectiveDoc.current_step_name"
                @close="showActionDialog = false"
                @confirm="handleActionConfirm"
            />

            <!-- Dedicated Item Rejection Dialog -->
            <Teleport to="body">
                <div 
                    v-if="isItemRejectDialogOpen" 
                    class="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-slate-900/50"
                    @click="isItemRejectDialogOpen = false"
                >
                    <div 
                        class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
                        @click.stop
                    >
                        <!-- Header -->
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                                <XCircle class="w-6 h-6" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                                    Tolak / Coret Item Ini?
                                </h3>
                                <p class="text-xs text-slate-500 mt-1">
                                    Item yang ditolak tidak akan diproses dalam alur pengadaan ini.
                                </p>
                            </div>
                            <button
                                type="button"
                                @click="isItemRejectDialogOpen = false"
                                class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Batal"
                            >
                                <X class="w-5 h-5" />
                            </button>
                        </div>

                        <!-- Item Detail Info Card -->
                        <div v-if="selectedItemForRejection" class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                            <div class="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span>{{ selectedItemForRejection.item_name || 'Item #' + (selectedItemForRejection.item_id || selectedItemForRejection.id) }}</span>
                                <span 
                                    v-if="selectedItemForRejection.is_non_catalog" 
                                    class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                >
                                    Non-Katalog
                                </span>
                            </div>
                            <div v-if="selectedItemForRejection.detail_name" class="text-slate-600">
                                {{ selectedItemForRejection.detail_name }}
                            </div>
                            <div class="flex items-center justify-between text-slate-700 pt-1.5 border-t border-slate-200/70 font-mono text-[11px]">
                                <span>Jumlah: <strong>{{ selectedItemForRejection.quantity }} {{ selectedItemForRejection.unit?.code || selectedItemForRejection.unit?.name || 'PCS' }}</strong></span>
                                <span>Subtotal: <strong>{{ formatCurrency(selectedItemForRejection.estimated_subtotal || ((Number(selectedItemForRejection.quantity) || 0) * (Number(selectedItemForRejection.estimated_price) || 0))) }}</strong></span>
                            </div>
                        </div>

                        <!-- Form Rejection Reason -->
                        <div class="space-y-1.5">
                            <label class="block text-xs font-bold text-slate-800">
                                Alasan Penolakan Item <span class="text-rose-600">*</span>
                            </label>
                            <textarea
                                v-model="itemRejectReasonInput"
                                rows="3"
                                class="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-400 bg-white"
                                placeholder="Tuliskan alasan penolakan secara jelas (contoh: spesifikasi tidak sesuai kebutuhan departemen, stok masih ada di gudang, dll)..."
                                @keydown.enter.ctrl="confirmRejectItem"
                            ></textarea>
                            <p v-if="itemRejectError" class="text-xs text-rose-600 font-medium flex items-center gap-1">
                                <AlertCircle class="w-3.5 h-3.5 shrink-0" />
                                <span>{{ itemRejectError }}</span>
                            </p>
                            <p v-else class="text-[11px] text-slate-400">
                                Alasan ini akan tercatat dalam riwayat audit penolakan parsial dokumen.
                            </p>
                        </div>

                        <!-- Footer Buttons -->
                        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                @click="isItemRejectDialogOpen = false"
                                class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                @click="confirmRejectItem"
                                class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <XCircle class="w-4 h-4" />
                                <span>Konfirmasi Tolak Item</span>
                            </button>
                        </div>
                    </div>
                </div>
            </Teleport>
        </div>
    </Teleport>
</template>

<style scoped>
.approval-review { max-height: calc(100dvh - 40px); }
.review-item { overflow-wrap: anywhere; max-width: 360px; }
.review-item summary:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
.review-footer button { min-height: 38px; }
@media (max-width: 640px) {
    .approval-review { max-height: calc(100dvh - 24px); }
    .review-body { padding: 20px 16px; }
    .review-footer { padding: 12px 16px; }
    .review-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
    .review-actions button { justify-content: center; }
    .review-actions button:last-child { grid-column: 1 / -1; }
}
</style>
