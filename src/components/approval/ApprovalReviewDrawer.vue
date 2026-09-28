<script setup>
import { ref, computed, watch } from 'vue'
import { 
    X, 
    ExternalLink, 
    Building2, 
    FileText, 
    Clock, 
    DollarSign, 
    User, 
    CheckCircle2, 
    RotateCcw, 
    XCircle,
    AlertCircle,
    Calendar,
    Layers,
    Package,
    ShieldAlert
} from '@lucide/vue'
import ApprovalBadge from './ApprovalBadge.vue'
import ApprovalStepper from './ApprovalStepper.vue'
import ApprovalAuditTrail from './ApprovalAuditTrail.vue'
import ApprovalActionDialog from './ApprovalActionDialog.vue'
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

const emit = defineEmits(['close', 'acted', 'action-success'])

const isDrawerVisible = computed(() => props.isOpen || props.show)

const approvalStore = useApprovalStore()
const authStore = useAuthStore()
const isLoadingTracker = ref(false)
const trackerData = ref(null)

const effectiveDoc = computed(() => {
    return trackerData.value?.request || props.task || {}
})

const effectiveItems = computed(() => {
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

const fetchTracker = async (requestId) => {
    if (!requestId) return
    try {
        isLoadingTracker.value = true
        const response = await getApprovalTracker(requestId)
        trackerData.value = response.data
    } catch (err) {
        console.error('Failed to fetch approval tracker:', err)
    } finally {
        isLoadingTracker.value = false
    }
}

watch(isDrawerVisible, (newVal) => {
    if (newVal && props.task) {
        fetchTracker(props.task.id)
    } else {
        trackerData.value = null
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
    try {
        showLoading('Memproses Keputusan...', 'Mohon tunggu sebentar.')

        const expectedStep = trackerData.value?.request?.current_step_order || props.task.current_step_order

        if (action === 'approve') {
            await approveDocument(props.task.id, notes, expectedStep)
            showSuccess('Disetujui!', `Dokumen ${props.task.document_number} berhasil disetujui.`)
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
            class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/50"
            @click="emit('close')"
        >
            <!-- Centered Modal Box -->
            <div 
                class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl lg:max-w-5xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
                @click.stop
            >
                <!-- MODAL HEADER -->
                <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                            <FileText class="w-5 h-5" />
                        </div>
                        <div>
                            <div class="flex items-center gap-2.5">
                                <h3 class="text-base font-bold text-slate-900 font-mono tracking-tight">
                                    {{ effectiveDoc.document_number || 'Review Dokumen' }}
                                </h3>
                                <ApprovalBadge :status="effectiveDoc.status || 'pending'" size="sm" />
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
                <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 overscroll-contain">
                    <!-- Overview Card -->
                    <div class="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3.5">
                        <div class="flex items-center justify-between pb-3 border-b border-slate-200">
                            <span class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText class="w-4 h-4 text-slate-500" />
                                Ringkasan Pengajuan Dokumen
                            </span>
                            <div class="flex items-center gap-2">
                                <span v-if="effectiveDoc.is_overdue" class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                    <ShieldAlert class="w-3.5 h-3.5 text-rose-600" />
                                    SLA Overdue
                                </span>
                                <span v-else-if="effectiveDoc.sla_hours_left !== undefined && effectiveDoc.sla_hours_left !== null" class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    <Clock class="w-3.5 h-3.5 text-amber-600" />
                                    {{ effectiveDoc.sla_hours_left }}j tersisa
                                </span>
                            </div>
                        </div>

                        <!-- Metadata Grid -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                            <!-- Pemohon -->
                            <div>
                                <span class="text-slate-400 font-medium block text-[11px]">Pemohon (Requester):</span>
                                <div class="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                                    <User class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span class="truncate">{{ effectiveDoc.requester?.name || effectiveDoc.requester_name || '-' }}</span>
                                </div>
                                <div class="text-[11px] text-slate-500 ml-5 truncate">
                                    {{ effectiveDoc.requester?.division || effectiveDoc.division_name || effectiveDoc.requester?.email || '' }}
                                </div>
                            </div>

                            <!-- Perusahaan & Divisi -->
                            <div>
                                <span class="text-slate-400 font-medium block text-[11px]">Perusahaan & Divisi:</span>
                                <div class="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                                    <Building2 class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span class="truncate">{{ effectiveDoc.company?.name || effectiveDoc.company_name || '-' }}</span>
                                </div>
                                <div class="text-[11px] text-slate-500 ml-5 truncate">
                                    Divisi: {{ effectiveDoc.division?.name || effectiveDoc.division_name || '-' }}
                                </div>
                            </div>

                            <!-- Tanggal Pengajuan & Dibutuhkan -->
                            <div>
                                <span class="text-slate-400 font-medium block text-[11px]">Tanggal Pengajuan:</span>
                                <div class="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                                    <Calendar class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{{ formatDate(effectiveDoc.request_date || effectiveDoc.submitted_at || effectiveDoc.created_at) }}</span>
                                </div>
                                <div v-if="effectiveDoc.required_date" class="text-[11px] text-slate-600 font-medium ml-5 mt-0.5">
                                    Target: {{ formatDate(effectiveDoc.required_date) }}
                                </div>
                            </div>

                            <!-- Total Nilai Nominal -->
                            <div>
                                <span class="text-slate-400 font-medium block text-[11px]">Total Nilai Pengajuan:</span>
                                <div class="font-mono font-bold text-slate-900 text-sm mt-1">
                                    {{ effectiveDoc.total_amount ? formatCurrency(effectiveDoc.total_amount) : '-' }}
                                </div>
                            </div>

                            <!-- Perihal / Deskripsi Pengajuan -->
                            <div class="sm:col-span-2 lg:col-span-4">
                                <span class="text-slate-400 font-medium block text-[11px]">Perihal / Keperluan Pengajuan:</span>
                                <div class="text-slate-900 font-medium mt-1 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                                    {{ effectiveDoc.purpose || effectiveDoc.document_title || '-' }}
                                </div>
                            </div>

                            <!-- Catatan Tambahan -->
                            <div v-if="effectiveDoc.notes" class="sm:col-span-2 lg:col-span-4">
                                <span class="text-slate-400 font-medium block text-[11px]">Catatan Tambahan:</span>
                                <div class="text-slate-700 mt-1 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 text-xs">
                                    {{ effectiveDoc.notes }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- RINCIAN BARANG / JASA (ITEMS TABLE) -->
                    <div class="space-y-2.5">
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                <Package class="w-4 h-4 text-slate-600" />
                                Daftar Barang / Jasa yang Diajukan
                                <span class="px-2 py-0.2 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {{ effectiveItems.length }} Item
                                </span>
                            </h4>
                        </div>

                        <div v-if="isLoadingTracker && effectiveItems.length === 0" class="p-8 text-center bg-slate-50 rounded-lg border border-slate-200">
                            <div class="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <span class="text-xs text-slate-500">Memuat rincian item pengajuan...</span>
                        </div>

                        <div v-else-if="effectiveItems.length === 0" class="p-6 text-center bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                            Dokumen ini tidak memiliki rincian item barang/jasa atau item dimuat dari sistem dokumen terkait.
                        </div>

                        <div v-else class="border border-slate-200 rounded-lg overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                            <th class="py-2.5 px-3 w-10 text-center">No</th>
                                            <th class="py-2.5 px-3 min-w-[200px]">Item / Barang</th>
                                            <th class="py-2.5 px-3 text-right w-20">Jumlah</th>
                                            <th class="py-2.5 px-3 w-20">Satuan</th>
                                            <th class="py-2.5 px-3 text-right w-32">Est. Harga Satuan</th>
                                            <th class="py-2.5 px-3 text-right w-32">Subtotal</th>
                                            <th class="py-2.5 px-3 min-w-[180px]">Catatan / Referensi</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 bg-white">
                                        <tr 
                                            v-for="(item, idx) in effectiveItems" 
                                            :key="item.id || idx" 
                                            class="hover:bg-slate-50/70 transition-colors"
                                        >
                                            <td class="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{{ idx + 1 }}</td>
                                            <td class="py-2.5 px-3">
                                                <div class="font-bold text-slate-900 flex items-center gap-2">
                                                    <span>{{ item.item_name || 'Item #' + (item.item_id || item.id) }}</span>
                                                    <span 
                                                        v-if="item.is_non_catalog" 
                                                        class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                                    >
                                                        Non-Katalog
                                                    </span>
                                                </div>
                                                <div v-if="item.item_code" class="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    Kode: {{ item.item_code }}
                                                </div>
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                                {{ item.quantity }}
                                            </td>
                                            <td class="py-2.5 px-3 text-slate-600">
                                                {{ item.unit?.code || item.unit?.name || item.unit_name || '-' }}
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-mono text-slate-700">
                                                {{ formatCurrency(item.estimated_price || 0) }}
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                                {{ formatCurrency(item.estimated_subtotal || ((Number(item.quantity) || 0) * (Number(item.estimated_price) || 0))) }}
                                            </td>
                                            <td class="py-2.5 px-3">
                                                <div v-if="item.notes" class="text-slate-700 leading-snug">
                                                    {{ item.notes }}
                                                </div>
                                                <a 
                                                    v-if="item.reference_url" 
                                                    :href="item.reference_url" 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    class="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium mt-0.5"
                                                >
                                                    <ExternalLink class="w-3 h-3" />
                                                    <span>Link Referensi</span>
                                                </a>
                                                <span v-if="!item.notes && !item.reference_url" class="text-slate-400">-</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                                            <td colspan="5" class="py-2.5 px-3 text-right text-xs uppercase tracking-wider text-slate-600">
                                                Total Estimasi Pengadaan:
                                            </td>
                                            <td class="py-2.5 px-3 text-right text-xs font-mono font-bold text-slate-900">
                                                {{ formatCurrency(effectiveDoc.total_amount) }}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Stepper Section (Alur Persetujuan) -->
                    <div class="space-y-2.5">
                        <div class="flex items-center justify-between">
                            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                <Clock class="w-4 h-4 text-slate-600" />
                                Progres Alur Persetujuan (Workflow)
                            </h4>
                            <span class="text-xs text-slate-600 font-medium">
                                Tahap {{ effectiveDoc.current_step_order || 1 }} dari {{ effectiveDoc.total_steps || trackerData?.levels?.length || 2 }}
                            </span>
                        </div>

                        <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <ApprovalStepper
                                :levels="trackerData?.levels || effectiveDoc.levels || []"
                                :currentStepOrder="trackerData?.request?.current_step_order || effectiveDoc.current_step_order || 1"
                                :overallStatus="effectiveDoc.status || 'pending'"
                                orientation="vertical"
                            />
                        </div>
                    </div>

                    <!-- Audit Trail Section -->
                    <div class="bg-white rounded-lg p-4 border border-slate-200">
                        <ApprovalAuditTrail
                            :actions="trackerData?.actions || effectiveDoc.actions || []"
                            :isLoading="isLoadingTracker"
                        />
                    </div>
                </div>

                <!-- MODAL FOOTER (Decision Action Bar) -->
                <div class="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        @click="emit('close')"
                        class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        Tutup
                    </button>

                    <!-- Action Buttons (when user is authorized approver) -->
                    <div v-if="canUserAct" class="flex items-center gap-2">
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
        </div>
    </Teleport>
</template>
