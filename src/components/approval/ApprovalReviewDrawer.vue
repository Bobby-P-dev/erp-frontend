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
    AlertCircle
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

const isCurrentRequester = computed(() => {
    const currentUserId = authStore.user?.id
    const requesterId = props.task?.requester_id || props.task?.requester?.id || trackerData.value?.request?.requester_id
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
    const status = props.task?.status || trackerData.value?.request?.status
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
            showSuccess('Revisi Diminta!', `Instruksi revisi untuk ${props.task.document_number} telah dikirim ke pemohon.`)
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
</script>

<template>
    <Teleport to="body">
        <div v-if="isDrawerVisible" class="fixed inset-0 z-[100] overflow-hidden">
            <!-- Backdrop (Tanpa backdrop-blur agar scroll ringan dan tidak patah-patah) -->
            <div 
                class="fixed inset-0 bg-gray-900/40 transition-opacity"
                @click="emit('close')"
            ></div>

            <div class="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
                <div class="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden pointer-events-auto">
                    <!-- DRAWER HEADER (Sticky) -->
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                <FileText class="w-5 h-5" />
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-base font-bold text-gray-900">
                                        {{ task?.document_number || 'Review Dokumen' }}
                                    </h3>
                                    <ApprovalBadge :status="task?.status || 'pending'" size="sm" />
                                </div>
                                <p class="text-xs text-gray-400 capitalize">
                                    {{ String(task?.document_type || '').replace(/_/g, ' ') }}
                                </p>
                            </div>
                        </div>

                        <button 
                            @click="emit('close')"
                            class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <!-- DRAWER CONTENT (Scrollable) -->
                    <div class="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
                        <!-- Overview Card -->
                        <div class="bg-gray-50/80 rounded-3xl p-5 border border-gray-100 space-y-4">
                            <div class="flex items-center justify-between pb-3 border-b border-gray-200/60">
                                <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Ringkasan Pengajuan
                                </span>
                                <span v-if="task?.is_overdue" class="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                    SLA Overdue
                                </span>
                                <span v-else-if="task?.sla_hours_left !== undefined" class="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                    {{ task.sla_hours_left }}j tersisa
                                </span>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span class="text-gray-400">Pemohon (Requester):</span>
                                    <div class="font-bold text-gray-800 mt-0.5 flex items-center gap-1.5">
                                        <User class="w-3.5 h-3.5 text-gray-400" />
                                        {{ task?.requester?.name || '-' }}
                                    </div>
                                    <div class="text-[11px] text-gray-500 ml-5">
                                        {{ task?.requester?.division || task?.requester?.email || '' }}
                                    </div>
                                </div>

                                <div>
                                    <span class="text-gray-400">Total Nilai Nominal:</span>
                                    <div class="font-bold text-emerald-700 text-sm mt-0.5">
                                        {{ formatCurrency(task?.total_amount) }}
                                    </div>
                                </div>

                                <div class="sm:col-span-2">
                                    <span class="text-gray-400">Perihal / Deskripsi Pengajuan:</span>
                                    <div class="text-gray-800 font-medium mt-1 leading-relaxed bg-white p-3 rounded-2xl border border-gray-100">
                                        {{ task?.document_title || '-' }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Stepper Section -->
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <h4 class="text-xs font-bold uppercase tracking-wider text-gray-700">
                                    Progres Alur Persetujuan
                                </h4>
                                <span class="text-xs text-indigo-600 font-semibold">
                                    Tahap {{ task?.current_step_order || 1 }} dari {{ task?.total_steps || task?.levels?.length || 2 }}
                                </span>
                            </div>

                            <div class="bg-white rounded-3xl p-5 border border-gray-100 shadow-2xs">
                                <ApprovalStepper
                                    :levels="trackerData?.levels || task?.levels || []"
                                    :currentStepOrder="trackerData?.request?.current_step_order || task?.current_step_order || 1"
                                    :overallStatus="task?.status || 'pending'"
                                    orientation="vertical"
                                />
                            </div>
                        </div>

                        <!-- Audit Trail Section -->
                        <div class="bg-white rounded-3xl p-5 border border-gray-100 shadow-2xs">
                            <ApprovalAuditTrail
                                :actions="trackerData?.actions || task?.actions || []"
                                :isLoading="isLoadingTracker"
                            />
                        </div>
                    </div>

                    <!-- DRAWER FOOTER (Sticky Decision Action Bar) -->
                    <div class="p-5 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                        <button
                            type="button"
                            @click="emit('close')"
                            class="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200/70 transition-colors"
                        >
                            Tutup Panel
                        </button>

                        <!-- Action Buttons (when user is authorized approver) -->
                        <div v-if="canUserAct" class="flex items-center gap-2">
                            <!-- Request Revision -->
                            <button
                                type="button"
                                @click="openDecision('revision')"
                                class="px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            >
                                <RotateCcw class="w-4 h-4" />
                                Minta Revisi
                            </button>

                            <!-- Reject -->
                            <button
                                type="button"
                                @click="openDecision('reject')"
                                class="px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            >
                                <XCircle class="w-4 h-4" />
                                Tolak
                            </button>

                            <!-- Approve -->
                            <button
                                type="button"
                                @click="openDecision('approve')"
                                class="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-200 cursor-pointer"
                            >
                                <CheckCircle2 class="w-4 h-4" />
                                Setujui Dokumen
                            </button>
                        </div>

                        <!-- Maker-Checker Alert (Requester cannot approve their own document) -->
                        <div v-else-if="isCurrentRequester" class="text-xs text-amber-800 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 flex items-center gap-2">
                            <AlertCircle class="w-4 h-4 text-amber-600 shrink-0" />
                            <span><strong>Prinsip Maker-Checker:</strong> Anda adalah pemohon dokumen ini sehingga tidak dapat menyetujuinya sendiri.</span>
                        </div>

                        <!-- Inactive / Unauthorized info -->
                        <div v-else class="text-xs text-gray-500 bg-gray-100 px-3.5 py-2 rounded-xl border border-gray-200 flex items-center gap-2">
                            <Clock class="w-4 h-4 text-gray-400 shrink-0" />
                            <span>Menunggu tindakan pejabat approver berwenang atau alur telah selesai.</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Action Confirmation Dialog -->
            <ApprovalActionDialog
                :isOpen="showActionDialog"
                :actionType="selectedActionType"
                :documentNumber="task?.document_number"
                :documentTitle="task?.document_title"
                :currentStepName="task?.current_step_name"
                @close="showActionDialog = false"
                @confirm="handleActionConfirm"
            />
        </div>
    </Teleport>
</template>
