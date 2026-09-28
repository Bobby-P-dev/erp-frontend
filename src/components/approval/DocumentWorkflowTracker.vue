<script setup>
import { ref, computed, watch } from 'vue'
import { getApprovalTrackerByDocument } from '../../services/approvalServices.js'
import {
    Clock,
    History,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Send,
    UserCheck,
    User,
    Layers,
    Users,
    MessageSquareQuote,
} from '@lucide/vue'

const props = defineProps({
    // Fetching props
    documentType: {
        type: String,
        default: null, // e.g. 'purchase_requisition', 'procurement_plan', 'direct_purchase'
    },
    documentId: {
        type: [Number, String],
        default: null,
    },
    // Direct data props (if provided by parent)
    tracker: {
        type: Object,
        default: null,
    },
    levels: {
        type: Array,
        default: null,
    },
    actions: {
        type: Array,
        default: null,
    },
    currentStepOrder: {
        type: Number,
        default: null,
    },
    overallStatus: {
        type: String,
        default: null,
    },
    // Titles & customization
    title: {
        type: String,
        default: 'Progres Alur Persetujuan (Workflow)',
    },
    auditTrailTitle: {
        type: String,
        default: 'Jejak Audit Persetujuan (Audit Trail)',
    },
    hideIfEmpty: {
        type: Boolean,
        default: false,
    },
})

// State for fetched tracker
const fetchedTracker = ref(null)
const isLoadingTracker = ref(false)

const loadTracker = async () => {
    if (!props.documentType || !props.documentId) return
    try {
        isLoadingTracker.value = true
        const response = await getApprovalTrackerByDocument(props.documentType, props.documentId)
        fetchedTracker.value = response?.data || response || null
    } catch (e) {
        // Silently handle if no approval request exists for document
        fetchedTracker.value = null
    } finally {
        isLoadingTracker.value = false
    }
}

watch(
    () => [props.documentType, props.documentId],
    ([newType, newId]) => {
        if (newType && newId) {
            loadTracker()
        } else {
            fetchedTracker.value = null
        }
    },
    { immediate: true }
)

// Computed Data Sources
const effectiveTracker = computed(() => {
    const hasPropsData = props.tracker && (
        (Array.isArray(props.tracker.levels) && props.tracker.levels.length > 0) ||
        (Array.isArray(props.tracker.actions) && props.tracker.actions.length > 0)
    )
    if (hasPropsData) {
        return props.tracker
    }
    return fetchedTracker.value || props.tracker
})

const effectiveLevels = computed(() => {
    if (props.levels && Array.isArray(props.levels) && props.levels.length > 0) {
        return props.levels
    }
    if (effectiveTracker.value?.levels && effectiveTracker.value.levels.length > 0) {
        return effectiveTracker.value.levels
    }
    return fetchedTracker.value?.levels || []
})

const effectiveActions = computed(() => {
    if (props.actions && Array.isArray(props.actions) && props.actions.length > 0) {
        return props.actions
    }
    if (effectiveTracker.value?.actions && effectiveTracker.value.actions.length > 0) {
        return effectiveTracker.value.actions
    }
    return fetchedTracker.value?.actions || []
})

const effectiveCurrentStep = computed(() => {
    if (props.currentStepOrder !== null && props.currentStepOrder !== undefined) {
        return Number(props.currentStepOrder)
    }
    return Number(effectiveTracker.value?.request?.current_step_order || 1)
})

const effectiveOverallStatus = computed(() => {
    if (props.overallStatus) {
        return String(props.overallStatus).toLowerCase()
    }
    return String(effectiveTracker.value?.request?.status || 'pending').toLowerCase()
})

const configurationName = computed(() => {
    return effectiveTracker.value?.request?.configuration?.name || null
})

// Sorted Actions (Newest First)
const sortedActions = computed(() => {
    return [...effectiveActions.value].sort((a, b) => {
        const timeA = new Date(a.acted_at || a.created_at || 0).getTime()
        const timeB = new Date(b.acted_at || b.created_at || 0).getTime()
        return timeB - timeA
    })
})

const getStepState = (level) => {
    if (level.status) {
        const s = String(level.status).toLowerCase()
        if (['approved', 'rejected', 'skipped', 'revision'].includes(s)) {
            return s
        }
    }

    if (effectiveOverallStatus.value === 'rejected' && level.step_order === effectiveCurrentStep.value) {
        return 'rejected'
    }

    if (effectiveOverallStatus.value === 'revision' && level.step_order === effectiveCurrentStep.value) {
        return 'revision'
    }

    if (level.step_order < effectiveCurrentStep.value) {
        return 'approved'
    } else if (level.step_order === effectiveCurrentStep.value) {
        if (effectiveOverallStatus.value === 'approved') return 'approved'
        return 'current'
    } else {
        return 'future'
    }
}

const getStepUI = (state) => {
    switch (state) {
        case 'approved':
            return {
                titleColor: 'text-slate-900',
                badgeBg: 'bg-emerald-600 text-white shadow-xs border-2 border-emerald-600',
                lineBg: 'bg-emerald-500',
                statusText: 'Disetujui',
                statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
                dotClass: 'bg-emerald-500',
            }
        case 'current':
            return {
                titleColor: 'text-blue-950 font-bold',
                badgeBg: 'bg-blue-600 text-white shadow-xs ring-4 ring-blue-100 border-2 border-blue-600',
                lineBg: 'bg-slate-200',
                statusText: 'Sedang Ditinjau',
                statusClass: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
                dotClass: 'bg-blue-600 animate-pulse',
            }
        case 'rejected':
            return {
                titleColor: 'text-rose-950',
                badgeBg: 'bg-rose-600 text-white shadow-xs border-2 border-rose-600',
                lineBg: 'bg-rose-300',
                statusText: 'Ditolak',
                statusClass: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
                dotClass: 'bg-rose-500',
            }
        case 'revision':
            return {
                titleColor: 'text-amber-950',
                badgeBg: 'bg-amber-500 text-white shadow-xs border-2 border-amber-500',
                lineBg: 'bg-amber-300',
                statusText: 'Perlu Revisi',
                statusClass: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
                dotClass: 'bg-amber-500',
            }
        case 'skipped':
            return {
                titleColor: 'text-slate-400',
                badgeBg: 'bg-slate-100 text-slate-500 border-2 border-slate-300',
                lineBg: 'bg-slate-200',
                statusText: 'Dilewati',
                statusClass: 'bg-slate-100 text-slate-500 border-slate-200 font-medium',
                dotClass: 'bg-slate-400',
            }
        case 'future':
        default:
            return {
                titleColor: 'text-slate-500',
                badgeBg: 'bg-white text-slate-400 border-2 border-slate-300',
                lineBg: 'bg-slate-200',
                statusText: 'Menunggu',
                statusClass: 'bg-slate-50 text-slate-400 border-slate-200 font-normal',
                dotClass: 'bg-slate-300',
            }
    }
}

const getActionMeta = (actionType) => {
    const act = String(actionType || '').toLowerCase()

    switch (act) {
        case 'approve':
        case 'approved':
            return {
                label: 'Disetujui',
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                dotColor: 'bg-emerald-500',
                icon: CheckCircle2,
            }
        case 'reject':
        case 'rejected':
            return {
                label: 'Ditolak',
                color: 'text-rose-700 bg-rose-50 border-rose-200',
                dotColor: 'bg-rose-500',
                icon: XCircle,
            }
        case 'request_revision':
        case 'revision':
        case 'revision_requested':
            return {
                label: 'Perlu Revisi',
                color: 'text-amber-800 bg-amber-50 border-amber-200',
                dotColor: 'bg-amber-500',
                icon: RotateCcw,
            }
        case 'submit':
        case 'submitted':
        case 'resubmit':
        case 'resubmitted':
            return {
                label: act.includes('resubmit') ? 'Diajukan Ulang' : 'Diajukan',
                color: 'text-blue-700 bg-blue-50 border-blue-200',
                dotColor: 'bg-blue-600',
                icon: Send,
            }
        default:
            return {
                label: String(actionType).toUpperCase(),
                color: 'text-slate-700 bg-slate-50 border-slate-200',
                dotColor: 'bg-slate-400',
                icon: Clock,
            }
    }
}

const formatDate = (dateString) => {
    if (!dateString) return '-'
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d)
}

const formatScopeName = (scope) => {
    switch (scope) {
        case 'divisional_hierarchy': return 'Hierarki Divisi'
        case 'position': return 'Jabatan Tertentu'
        case 'role': return 'Role Akses'
        case 'job_level': return 'Jenjang Karir'
        case 'specific_user': return 'User Spesifik'
        case 'role_only': return 'Role Saja'
        case 'job_level_and_division': return 'Jenjang & Divisi'
        case 'department_head': return 'Kepala Departemen'
        default: return scope ? String(scope).replace(/_/g, ' ') : '-'
    }
}
</script>

<template>
    <div v-if="!hideIfEmpty || effectiveLevels.length > 0 || sortedActions.length > 0" class="space-y-6">
        <!-- 1. TOP CARD: Progres Alur Persetujuan (Workflow) -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-5">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Clock class="w-4 h-4" />
                    </div>
                    <div>
                        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            {{ title }}
                        </h3>
                        <p v-if="configurationName" class="text-[11px] text-slate-500 mt-0.5">
                            Konfigurasi: {{ configurationName }}
                        </p>
                    </div>
                </div>

                <div v-if="effectiveLevels.length > 0" class="text-xs text-slate-500 font-medium">
                    Tahap Aktif: 
                    <strong class="text-blue-700 font-bold font-mono">
                        Ke-{{ Math.min(effectiveCurrentStep, effectiveLevels.length) }}
                    </strong> 
                    dari {{ effectiveLevels.length }}
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoadingTracker" class="py-8 text-center text-slate-400">
                <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p class="text-xs font-medium text-slate-500">Memuat alur persetujuan...</p>
            </div>

            <!-- Empty State -->
            <div v-else-if="effectiveLevels.length === 0" class="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Clock class="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p class="text-xs font-semibold text-slate-600">Belum ada alur persetujuan bertingkat</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Dokumen ini belum diajukan atau tidak memerlukan persetujuan bertingkat.</p>
            </div>

            <!-- Vertical Stepper (Numbered Nodes: 1, 2, 3...) -->
            <div v-else class="space-y-4 pt-1">
                <div 
                    v-for="(level, index) in effectiveLevels" 
                    :key="level.id || level.step_order || index"
                    class="flex items-start gap-4 relative group"
                >
                    <!-- Vertical Connecting Line -->
                    <div 
                        v-if="index < effectiveLevels.length - 1"
                        class="absolute left-4 top-8 w-0.5 -bottom-4 z-0 transition-colors duration-300"
                        :class="getStepUI(getStepState(level)).lineBg"
                    ></div>

                    <!-- Number Circle Node (Angka 1, 2, 3...) -->
                    <div 
                        class="w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-xs shrink-0 z-10 select-none transition-all duration-200 shadow-xs"
                        :class="getStepUI(getStepState(level)).badgeBg"
                    >
                        {{ level.step_order || index + 1 }}
                    </div>

                    <!-- Step Card -->
                    <div 
                        class="flex-1 bg-white rounded-xl p-4 border transition-all duration-200"
                        :class="getStepState(level) === 'current' ? 'border-blue-400 ring-2 ring-blue-50 shadow-xs' : 'border-slate-200/90 shadow-2xs hover:border-slate-300'"
                    >
                        <div class="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                            <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                Tahap {{ level.step_order || index + 1 }}
                            </span>
                            <span 
                                class="text-[11px] px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5"
                                :class="getStepUI(getStepState(level)).statusClass"
                            >
                                <span class="w-1.5 h-1.5 rounded-full" :class="getStepUI(getStepState(level)).dotClass"></span>
                                {{ getStepUI(getStepState(level)).statusText }}
                            </span>
                        </div>

                        <h4 
                            class="text-sm font-bold mt-2"
                            :class="getStepUI(getStepState(level)).titleColor"
                        >
                            {{ level.step_name || level.name }}
                        </h4>

                        <div class="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <span v-if="level.acted_by" class="flex items-center gap-1.5 font-semibold text-emerald-700">
                                <UserCheck class="w-3.5 h-3.5" /> Disetujui oleh: {{ level.acted_by }}
                            </span>
                            <span v-else-if="level.assignee_label || level.approver_name" class="flex items-center gap-1.5 text-slate-500">
                                <User class="w-3.5 h-3.5 text-slate-400" />
                                Target Approver: <strong class="text-slate-700 font-semibold">{{ level.assignee_label || level.approver_name }}</strong>
                            </span>
                            <span v-else-if="level.approver_scope" class="flex items-center gap-1.5 text-slate-500">
                                <Layers class="w-3.5 h-3.5 text-slate-400" />
                                Lingkup: <strong class="text-slate-700 font-semibold">{{ formatScopeName(level.approver_scope) }}</strong>
                            </span>

                            <span v-if="level.sla_hours" class="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                                <Clock class="w-3 h-3" /> SLA: {{ level.sla_hours }} Jam
                            </span>
                        </div>

                        <div v-if="level.approval_mode === 'all'" class="mt-2 text-[11px] text-blue-700 bg-blue-50/80 p-2 rounded-lg flex items-center gap-1.5 font-medium border border-blue-100">
                            <Users class="w-3.5 h-3.5 shrink-0" />
                            Mode Konsensus: Semua pejabat dalam tingkatan ini wajib menyetujui.
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. BOTTOM CARD: Jejak Audit Persetujuan (Audit Trail) -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 space-y-5">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <History class="w-4 h-4" />
                    </div>
                    <div>
                        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <span>{{ auditTrailTitle }}</span>
                            <span v-if="sortedActions.length > 0" class="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.2 rounded-full font-mono">
                                {{ sortedActions.length }} Catatan
                            </span>
                        </h3>
                    </div>
                </div>
                <span class="text-xs text-slate-400 font-medium">Urutan terbaru</span>
            </div>

            <!-- Loading State -->
            <div v-if="isLoadingTracker" class="py-6 text-center text-slate-400">
                <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p class="text-xs">Memuat jejak riwayat...</p>
            </div>

            <!-- Empty State -->
            <div v-else-if="sortedActions.length === 0" class="py-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <History class="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p class="text-xs font-semibold text-slate-600">Belum ada riwayat persetujuan</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Seluruh aktivitas persetujuan akan tercatat di sini secara permanen.</p>
            </div>

            <!-- Timeline List -->
            <div v-else class="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                <div 
                    v-for="(act, idx) in sortedActions" 
                    :key="act.id || act.acted_at || idx"
                    class="flex items-start gap-3.5 relative group"
                >
                    <!-- Timeline Vertical Line -->
                    <div 
                        v-if="idx < sortedActions.length - 1"
                        class="absolute left-3 top-6 w-0.5 -bottom-4 bg-slate-200 z-0"
                    ></div>

                    <!-- Action Dot Node -->
                    <div 
                        class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 shadow-2xs border-2 border-white"
                        :class="getActionMeta(act.action).dotColor"
                    >
                        <component :is="getActionMeta(act.action).icon" class="w-3.5 h-3.5 text-white" />
                    </div>

                    <!-- Action Details Card -->
                    <div class="flex-1 bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-slate-900">
                                    {{ act.user_name || act.acted_by || 'Sistem ERP' }}
                                </span>
                                <span v-if="act.user_role" class="text-[10px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                                    {{ act.user_role }}
                                </span>
                            </div>

                            <span 
                                class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                                :class="getActionMeta(act.action).color"
                            >
                                {{ getActionMeta(act.action).label }}
                            </span>
                        </div>

                        <!-- Timestamp -->
                        <div class="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                            <Clock class="w-3.5 h-3.5 text-slate-400" />
                            <span>{{ formatDate(act.acted_at || act.created_at) }}</span>
                        </div>

                        <!-- Decision Note Quote Box (Matching user screenshot) -->
                        <div 
                            v-if="act.notes"
                            class="border-l-3 border-blue-500 bg-slate-50/70 p-3 rounded-r-xl border-y border-r border-slate-200/60 text-xs space-y-1 mt-1"
                        >
                            <div class="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                                <MessageSquareQuote class="w-3.5 h-3.5" />
                                <span>Catatan Keputusan:</span>
                            </div>
                            <p class="text-slate-700 italic font-medium leading-relaxed">
                                "{{ act.notes }}"
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
