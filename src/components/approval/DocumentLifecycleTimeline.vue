<script setup>
import { ref, computed, watch } from 'vue'
import {
    CheckCircle2,
    Clock,
    XCircle,
    RotateCcw,
    FileText,
    Users,
    ShoppingBag,
    CreditCard,
    Banknote,
    Warehouse,
    UserCheck,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Paperclip,
    Building2,
    Calendar,
    ArrowRight,
    AlertCircle,
    RefreshCw
} from '@lucide/vue'
import { formatCurrency } from '../../utils/stringUtils.js'
import { getApprovalLifecycle } from '../../services/approvalServices.js'
import { getPurchaseRequisitionLifecycle } from '../../services/purchaseRequisitionServices.js'
import StatusBadge from '../ui/StatusBadge.vue'

const props = defineProps({
    lifecycle: {
        type: Object,
        default: null,
    },
    approvalRequestId: {
        type: [Number, String],
        default: null,
    },
    documentId: {
        type: [Number, String],
        default: null,
    },
    documentType: {
        type: String,
        default: 'purchase_requisition',
    },
    title: {
        type: String,
        default: 'Rantai Siklus Hidup Lengkap (End-to-End Lifecycle)',
    },
    showProgressSummary: {
        type: Boolean,
        default: true,
    },
})

const fetchedLifecycle = ref(null)
const isLoading = ref(false)
const expandedStages = ref({
    pr_submission: true,
    pr_approval: true,
    direct_purchase: true,
    payment_disbursement: true,
    goods_receipt: true,
    handover: true,
})

const loadLifecycleData = async () => {
    if (props.lifecycle) {
        return
    }

    try {
        isLoading.value = true
        if (props.approvalRequestId) {
            const res = await getApprovalLifecycle(props.approvalRequestId)
            fetchedLifecycle.value = res?.data || res || null
        } else if (props.documentId) {
            const res = await getPurchaseRequisitionLifecycle(props.documentId)
            fetchedLifecycle.value = res?.data || res || null
        }
    } catch (e) {
        console.warn('Failed to fetch lifecycle:', e)
        fetchedLifecycle.value = null
    } finally {
        isLoading.value = false
    }
}

watch(
    () => [props.approvalRequestId, props.documentId, props.lifecycle],
    () => {
        if (!props.lifecycle) {
            loadLifecycleData()
        }
    },
    { immediate: true }
)

const activeLifecycle = computed(() => {
    return props.lifecycle || fetchedLifecycle.value
})

const stages = computed(() => {
    return activeLifecycle.value?.stages || []
})

const completedStagesCount = computed(() => {
    return stages.value.filter(s => s.status === 'completed').length
})

const progressPercentage = computed(() => {
    if (!stages.value.length) return 0
    return Math.round((completedStagesCount.value / stages.value.length) * 100)
})

const toggleStage = (key) => {
    expandedStages.value[key] = !expandedStages.value[key]
}

const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

const getStageIcon = (key) => {
    switch (key) {
        case 'pr_submission': return FileText
        case 'pr_approval': return Users
        case 'direct_purchase': return ShoppingBag
        case 'payment_disbursement': return Banknote
        case 'goods_receipt': return Warehouse
        case 'handover': return UserCheck
        default: return FileText
    }
}


const getStageTiers = (stage) => {
    if (!stage) return []
    if (Array.isArray(stage.tiers) && stage.tiers.length > 0) return stage.tiers
    if (Array.isArray(stage.levels) && stage.levels.length > 0) return stage.levels
    return []
}

const getStageTitle = (stage) => {
    if (stage?.key === 'pr_approval') return 'Approval Workflow'
    return stage?.title || ''
}

const getStageSubtitle = (stage) => {
    if (stage?.key === 'pr_approval' && (stage.subtitle === 'Persetujuan Berjenjang (Kadiv & Direksi)' || !stage.subtitle)) {
        return 'Alur Persetujuan Berjenjang Dokumen'
    }
    return stage?.subtitle || ''
}

const formatTierStatus = (status) => {
    switch (status) {
        case 'approved': return 'Disetujui'
        case 'rejected': return 'Ditolak'
        case 'revision': return 'Minta Revisi'
        case 'skipped': return 'Dilewati'
        case 'in_progress': return 'Sedang Ditinjau'
        case 'pending': return 'Menunggu Antrean'
        default: return status || 'Menunggu'
    }
}

const formatPurchaseChannel = (channel) => {
    switch (channel) {
        case 'marketplace': return 'Online Marketplace'
        case 'direct_supplier': return 'Supplier Langsung'
        case 'retail_store': return 'Toko Fisik / Retail'
        default: return channel ? String(channel).replace(/_/g, ' ') : 'Pembelian Langsung'
    }
}

const getRailIconColor = (status) => {
    switch (status) {
        case 'completed':
            return 'bg-[#1B5E20] text-white shadow-xs ring-4 ring-[#E8F8EE]'
        case 'in_progress':
            return 'bg-[#014BAA] text-white shadow-xs ring-4 ring-[#EAF2FF] animate-pulse'
        case 'rejected':
            return 'bg-rose-600 text-white shadow-xs ring-4 ring-rose-50'
        case 'revision':
            return 'bg-amber-600 text-white shadow-xs ring-4 ring-amber-50'
        case 'ready_to_start':
            return 'bg-[#014BAA] text-white shadow-xs ring-4 ring-[#EAF2FF]'
        default:
            return 'bg-slate-100 text-slate-400 border border-slate-300'
    }
}
</script>

<template>
    <div class="space-y-4">
        <!-- LOADING STATE -->
        <div v-if="isLoading && !stages.length" class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
            <RefreshCw class="w-6 h-6 animate-spin text-[#014BAA] mx-auto mb-2" />
            <span class="text-xs text-slate-500">Menghubungkan rantai dokumen lintas divisi...</span>
        </div>

        <!-- EMPTY STATE -->
        <div v-else-if="!stages.length" class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            Tidak ada data alur siklus hidup yang dapat ditampilkan.
        </div>

        <!-- 7-STAGE VERTICAL TIMELINE -->
        <div v-else class="relative pl-6 sm:pl-8 space-y-6">
            <!-- Vertical connecting rail line -->
            <div class="absolute left-3.5 sm:left-4.5 top-5 bottom-6 w-0.5 bg-slate-200 -z-0"></div>

            <div 
                v-for="(stage, idx) in stages" 
                :key="stage.key || idx" 
                class="relative group"
            >
                <!-- Rail Icon / Step Badge -->
                <div 
                    class="absolute -left-6 sm:-left-8 top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10"
                    :class="getRailIconColor(stage.status)"
                >
                    <CheckCircle2 v-if="stage.status === 'completed'" class="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    <XCircle v-else-if="stage.status === 'rejected'" class="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    <RotateCcw v-else-if="stage.status === 'revision'" class="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    <span v-else class="font-mono text-xs">{{ stage.stage_number || idx + 1 }}</span>
                </div>

                <!-- Stage Card -->
                <div 
                    class="bg-white rounded-xl border transition-all overflow-hidden"
                    :class="[
                        stage.status === 'in_progress' ? 'border-[#014BAA]/30 shadow-xs ring-1 ring-[#014BAA]/10' : 'border-slate-200 shadow-2xs',
                        stage.status === 'pending' ? 'bg-slate-50/50 opacity-80' : ''
                    ]"
                >
                    <!-- Stage Card Header -->
                    <div 
                        class="p-3 sm:p-4 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-slate-50/80"
                        @click="toggleStage(stage.key)"
                    >
                        <div class="flex items-center gap-3">
                            <div 
                                class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                                :class="[
                                    stage.status === 'completed' ? 'bg-[#E8F8EE] text-[#1B5E20] border-[#1B5E20]/20' : 
                                    stage.status === 'in_progress' ? 'bg-[#EAF2FF] text-[#014BAA] border-[#014BAA]/20' : 
                                    stage.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                ]"
                            >
                                <component :is="getStageIcon(stage.key)" class="w-4 h-4" />
                            </div>

                            <div>
                                <div class="flex items-center gap-2">
                                    <h5 class="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                                        {{ getStageTitle(stage) }}
                                    </h5>
                                    <StatusBadge 
                                        :status="stage.status" 
                                        :label="stage.status_label || stage.status" 
                                        size="sm" 
                                    />
                                </div>
                                <p class="text-[11px] text-slate-500 mt-0.5">
                                    {{ getStageSubtitle(stage) }}
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2.5">
                            <span v-if="stage.completed_at" class="text-[11px] text-slate-500 hidden sm:inline-block">
                                {{ formatDate(stage.completed_at) }}
                            </span>
                            <button 
                                type="button" 
                                class="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <ChevronDown v-if="expandedStages[stage.key]" class="w-4 h-4" />
                                <ChevronRight v-else class="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <!-- Stage Card Body (Expanded) -->
                    <div v-show="expandedStages[stage.key]" class="px-3 sm:px-4 pb-4 pt-1 border-t border-slate-100 space-y-3.5 text-xs">
                        <!-- 1. STAGE SPECIFIC: PR SUBMISSION -->
                        <div v-if="stage.key === 'pr_submission'" class="space-y-3">
                            <!-- Inisiator Profile Box -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
                                <div>
                                    <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Inisiator / Pembuat:</span>
                                    <div class="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                                        <span>{{ stage.actor?.name || '-' }}</span>
                                        <span v-if="stage.actor?.nik" class="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-200/70 text-slate-700">
                                            {{ stage.actor.nik }}
                                        </span>
                                    </div>
                                    <div class="text-[11px] text-slate-600 mt-0.5">
                                        <span>{{ stage.actor?.position || '-' }}</span>
                                        <span v-if="stage.actor?.division"> &bull; {{ stage.actor.division }}</span>
                                    </div>
                                </div>

                                <div>
                                    <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Waktu Pengajuan:</span>
                                    <div class="font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
                                        <Calendar class="w-3.5 h-3.5 text-slate-400" />
                                        <span>{{ formatDate(stage.completed_at || stage.document?.date) }}</span>
                                    </div>
                                    <div v-if="stage.document?.required_date" class="text-[11px] text-slate-500 mt-0.5">
                                        Target Kebutuhan: {{ formatDateOnly(stage.document.required_date) }}
                                    </div>
                                </div>
                            </div>

                            <!-- Document Attributes -->
                            <div class="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                                <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                    <div class="flex items-center gap-2">
                                        <span class="text-slate-400 text-[11px]">No. Dokumen:</span>
                                        <span class="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                            {{ stage.document?.number }}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-2 font-mono">
                                        <span class="text-slate-400 text-[11px]">Total Estimasi:</span>
                                        <span class="font-bold text-slate-900 text-sm">
                                            {{ formatCurrency(stage.document?.estimated_amount || 0) }}
                                        </span>
                                    </div>
                                </div>
                                <div v-if="stage.document?.purpose" class="text-[11px] text-slate-700 leading-relaxed">
                                    <strong class="text-slate-900">Perihal:</strong> {{ stage.document.purpose }}
                                </div>
                            </div>
                        </div>

                        <!-- 2. STAGE SPECIFIC: PR APPROVAL TIERS -->
                        <div v-else-if="stage.key === 'pr_approval'" class="space-y-3">
                            <div class="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                                <span>Alur persetujuan berjenjang dengan {{ getStageTiers(stage).length }} tingkat peninjau:</span>
                                <span v-if="stage.status === 'completed'" class="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Disetujui Penuh
                                </span>
                            </div>

                            <!-- Approver Tiers Cards -->
                            <div v-if="getStageTiers(stage).length" class="space-y-2">
                                <div 
                                    v-for="tier in getStageTiers(stage)" 
                                    :key="tier.id || tier.step_order"
                                    class="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                                    :class="[
                                        tier.status === 'approved' ? 'bg-[#E8F8EE]/60 border-[#1B5E20]/20' : 
                                        tier.status === 'rejected' ? 'bg-rose-50/40 border-rose-200' : 
                                        tier.status === 'revision' ? 'bg-amber-50/40 border-amber-200' : 
                                        tier.status === 'skipped' ? 'bg-slate-50 border-slate-200 opacity-60' : 
                                        tier.status === 'in_progress' ? 'bg-[#EAF2FF]/60 border-[#014BAA]/20 ring-1 ring-[#014BAA]/20' : 
                                        'bg-slate-50/60 border-slate-200'
                                    ]"
                                >
                                    <div class="flex items-center gap-3">
                                        <div 
                                            class="w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[11px] shrink-0"
                                            :class="[
                                                tier.status === 'approved' ? 'bg-[#1B5E20] text-white' : 
                                                tier.status === 'rejected' ? 'bg-rose-600 text-white' : 
                                                tier.status === 'revision' ? 'bg-amber-600 text-white' : 
                                                tier.status === 'in_progress' ? 'bg-[#014BAA] text-white animate-pulse' : 
                                                'bg-slate-400 text-white'
                                            ]"
                                        >
                                            {{ tier.step_order }}
                                        </div>
                                        <div>
                                            <div class="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                                <span>{{ tier.step_name || 'Tier ' + tier.step_order }}</span>
                                                <span v-if="tier.role_name || tier.assignee_label" class="text-[11px] text-slate-500 font-normal">
                                                    ({{ tier.role_name || tier.assignee_label }})
                                                </span>
                                                <span v-if="tier.approval_mode === 'all'" class="text-[10px] font-semibold text-[#014BAA] bg-[#EAF2FF] border border-[#014BAA]/20 px-1.5 py-0.2 rounded">
                                                    Konsensus (Semua)
                                                </span>
                                            </div>
                                            <div class="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                <span class="font-medium text-slate-800">
                                                    {{ tier.specific_user?.name || tier.assignee?.name || tier.user?.name || tier.assignee_label || 'Pejabat Peninjau' }}
                                                </span>
                                                <span v-if="tier.specific_user?.nik || tier.assignee?.nik" class="font-mono text-[10px] text-slate-500">
                                                    [{{ tier.specific_user?.nik || tier.assignee?.nik }}]
                                                </span>
                                                <span v-if="tier.approver_scope && !tier.role_name" class="text-[10px] text-slate-400">
                                                    &bull; {{ tier.approver_scope }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                                        <StatusBadge 
                                            :status="tier.status" 
                                            :label="tier.status_label || formatTierStatus(tier.status)" 
                                            size="sm" 
                                        />
                                        <span v-if="tier.completed_at || tier.acted_at" class="text-[10px] text-slate-500 font-medium">
                                            {{ formatDate(tier.completed_at || tier.acted_at) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="p-3 text-center bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                                Belum ada daftar peninjau yang ditugaskan untuk dokumen ini.
                            </div>

                            <!-- Audit actions notes if any -->
                            <div v-if="stage.actions?.length" class="space-y-1.5 pt-1">
                                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Catatan Evaluasi Peninjau:</span>
                                <div 
                                    v-for="(act, aIdx) in stage.actions" 
                                    :key="aIdx"
                                    class="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700"
                                >
                                    <div class="flex items-center justify-between mb-1">
                                        <span class="font-bold text-slate-900">{{ act.user?.name || act.actor?.name || 'Peninjau' }}</span>
                                        <span class="text-[10px] text-slate-500">{{ formatDate(act.acted_at) }}</span>
                                    </div>
                                    <p v-if="act.notes" class="italic bg-white p-2 rounded border border-slate-200/60 text-slate-800">
                                        "{{ act.notes }}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- 3. STAGE SPECIFIC: DIRECT PURCHASE / BUYER -->
                        <div v-else-if="stage.key === 'direct_purchase'" class="space-y-3">
                            <div v-if="stage.document || stage.actor || stage.documents?.length" class="space-y-2.5">
                                <div class="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80 space-y-2.5">
                                    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                {{ stage.document?.number || stage.document?.dp_number || stage.documents?.[0]?.number || 'Direct Purchase' }}
                                            </span>
                                            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EAF2FF] text-[#014BAA] border border-[#014BAA]/20">
                                                {{ formatPurchaseChannel(stage.document?.channel || stage.documents?.[0]?.purchase_channel || 'Pembelian Langsung') }}
                                            </span>
                                        </div>
                                        <div class="font-mono font-bold text-slate-900 text-sm">
                                            {{ formatCurrency(stage.document?.total_amount || stage.document?.grand_total || stage.documents?.[0]?.grand_total || 0) }}
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                        <div>
                                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Staf Eksekusi Pembelian (Buyer):</span>
                                            <div class="font-bold text-slate-900 mt-1 flex items-center gap-1.5 flex-wrap">
                                                <span>{{ stage.actor?.name || stage.document?.buyer?.name || stage.documents?.[0]?.buyer?.name || '-' }}</span>
                                                <span v-if="stage.actor?.nik || stage.document?.buyer?.nik" class="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-200/70 text-slate-700">
                                                    {{ stage.actor?.nik || stage.document?.buyer?.nik }}
                                                </span>
                                            </div>
                                            <div class="text-[10px] text-slate-500 mt-0.5">
                                                <span>{{ stage.actor?.position || 'Staf Purchasing Buyer' }}</span>
                                                <span v-if="stage.actor?.division"> &bull; {{ stage.actor.division }}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Toko / Supplier / Merchant:</span>
                                            <div class="font-bold text-slate-800 mt-1">
                                                {{ stage.document?.store_name || stage.document?.supplier_name || stage.documents?.[0]?.supplier_name || 'Toko Retail / Supplier' }}
                                            </div>
                                            <div v-if="stage.completed_at" class="text-[10px] text-slate-500 mt-0.5">
                                                Waktu Belanja: {{ formatDate(stage.completed_at) }}
                                            </div>
                                        </div>
                                    </div>

                                    <div v-if="stage.document?.notes || stage.documents?.[0]?.notes" class="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/70">
                                        <strong>Catatan Belanja:</strong> {{ stage.document?.notes || stage.documents?.[0]?.notes }}
                                    </div>
                                </div>
                            </div>

                            <div v-else class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 italic text-[11px]">
                                {{ stage.status_label || 'Menunggu proses belanja staf Purchasing.' }}
                            </div>
                        </div>

                        <!-- 4. STAGE SPECIFIC: PAYMENT DISBURSEMENT (PEMBAYARAN KEUANGAN) -->
                        <div v-else-if="stage.key === 'payment_disbursement'" class="space-y-3">
                            <div v-if="stage.document || stage.actor || stage.documents?.length" class="space-y-2.5">
                                <div class="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80 space-y-2.5">
                                    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                {{ stage.document?.payment_number || stage.document?.number || stage.document?.prq_number || stage.documents?.[0]?.number || 'Payment' }}
                                            </span>
                                            <span 
                                                class="px-2 py-0.5 rounded text-[10px] font-bold border"
                                                :class="stage.status === 'completed' ? 'bg-[#E8F8EE] text-[#1B5E20] border-[#1B5E20]/20' : 'bg-[#EAF2FF] text-[#014BAA] border-[#014BAA]/20'"
                                            >
                                                {{ stage.status === 'completed' ? 'Lunas Ditransfer' : 'Menunggu Transfer Kasir' }}
                                            </span>
                                            <span v-if="stage.document?.prq_number && stage.document?.payment_number" class="text-[10px] text-slate-500 font-mono">
                                                Tagihan: {{ stage.document.prq_number }}
                                            </span>
                                        </div>
                                        <div class="font-mono font-bold text-slate-900 text-sm">
                                            {{ formatCurrency(stage.document?.amount || stage.document?.amount_paid || stage.documents?.[0]?.amount_paid || 0) }}
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                        <div>
                                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Staf Eksekusi Kasir (Finance):</span>
                                            <div class="font-bold text-slate-900 mt-1 flex items-center gap-1.5 flex-wrap">
                                                <span>{{ stage.actor?.name || stage.document?.disbursed_by?.name || stage.documents?.[0]?.disbursed_by?.name || '-' }}</span>
                                                <span v-if="stage.actor?.nik" class="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-200/70 text-slate-700">
                                                    {{ stage.actor.nik }}
                                                </span>
                                            </div>
                                            <div class="text-[10px] text-slate-500 mt-0.5">
                                                <span>{{ stage.actor?.position || 'Kasir Keuangan' }}</span>
                                                <span v-if="stage.actor?.division"> &bull; {{ stage.actor.division }}</span>
                                            </div>
                                            <div v-if="stage.document?.paid_at || stage.completed_at" class="text-[10px] text-slate-500 mt-0.5">
                                                Waktu Transfer: {{ formatDate(stage.document?.paid_at || stage.completed_at) }}
                                            </div>
                                        </div>

                                        <div>
                                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Tujuan Pembayaran & Rekening:</span>
                                            <div class="font-bold text-slate-800 mt-1">
                                                {{ stage.document?.recipient_name || stage.documents?.[0]?.recipient_name || 'Vendor / Toko' }}
                                            </div>
                                            <div v-if="stage.document?.recipient_bank || stage.documents?.[0]?.bank_name" class="text-[10px] text-slate-500 mt-0.5">
                                                Bank: {{ stage.document?.recipient_bank || stage.documents?.[0]?.bank_name }}
                                                <span v-if="stage.documents?.[0]?.bank_account_number"> - {{ stage.documents[0].bank_account_number }}</span>
                                            </div>
                                            <div v-if="stage.document?.payment_method || stage.documents?.[0]?.payment_method" class="text-[10px] text-slate-500 mt-0.5 capitalize">
                                                Metode: {{ String(stage.document?.payment_method || stage.documents?.[0]?.payment_method).replace(/_/g, ' ') }}
                                                <span v-if="stage.document?.reference_number || stage.documents?.[0]?.reference_number" class="font-mono">
                                                    (Ref: {{ stage.document?.reference_number || stage.documents?.[0]?.reference_number }})
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div v-if="stage.document?.proof_file_url || stage.document?.proof_file || stage.documents?.[0]?.proof_file" class="pt-1 border-t border-slate-100">
                                        <a 
                                            :href="stage.document?.proof_file_url || stage.document?.proof_file?.url || stage.documents?.[0]?.proof_file?.url" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-slate-200 text-[#014BAA] hover:bg-[#EAF2FF] shadow-2xs transition-colors"
                                        >
                                            <Paperclip class="w-3.5 h-3.5" />
                                            <span>Lihat Bukti Transfer Bank</span>
                                            <ExternalLink class="w-3 h-3 text-slate-400" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div v-else class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 italic text-[11px]">
                                {{ stage.status_label || 'Menunggu pencairan/pembayaran dana oleh Kasir Finance.' }}
                            </div>
                        </div>

                        <!-- 5. STAGE SPECIFIC: GOODS RECEIPT (PENERIMAAN GUDANG) -->
                        <div v-else-if="stage.key === 'goods_receipt'" class="space-y-3">
                            <div v-if="stage.document || stage.actor || stage.documents?.length" class="space-y-2.5">
                                <div class="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80 space-y-2.5">
                                    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                {{ stage.document?.number || stage.document?.grn_number || stage.documents?.[0]?.number || 'Goods Receipt' }}
                                            </span>
                                            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8F8EE] text-[#1B5E20] border border-[#1B5E20]/20">
                                                Tiba di Gudang
                                            </span>
                                        </div>
                                        <div v-if="stage.document?.received_date || stage.document?.receipt_date || stage.documents?.[0]?.receipt_date" class="text-[11px] text-slate-600">
                                            Tiba: <strong>{{ formatDateOnly(stage.document?.received_date || stage.document?.receipt_date || stage.documents?.[0]?.receipt_date) }}</strong>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                        <div>
                                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Petugas Pemeriksa Gudang:</span>
                                            <div class="font-bold text-slate-900 mt-1 flex items-center gap-1.5 flex-wrap">
                                                <span>{{ stage.actor?.name || stage.document?.received_by?.name || stage.documents?.[0]?.received_by?.name || '-' }}</span>
                                                <span v-if="stage.actor?.nik || stage.document?.received_by?.nik" class="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-200/70 text-slate-700">
                                                    {{ stage.actor?.nik || stage.document?.received_by?.nik }}
                                                </span>
                                            </div>
                                            <div class="text-[10px] text-slate-500 mt-0.5">
                                                <span>{{ stage.actor?.position || 'Staff Gudang' }}</span>
                                                <span v-if="stage.actor?.division"> &bull; {{ stage.actor.division }}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Kurir & Surat Jalan:</span>
                                            <div class="font-bold text-slate-800 mt-1">
                                                {{ stage.document?.delivery_order_number || stage.document?.delivery_note_number || stage.documents?.[0]?.delivery_note_number || 'Tanpa No. SJ' }}
                                            </div>
                                            <div v-if="stage.document?.courier_name || stage.document?.shipping_carrier || stage.documents?.[0]?.shipping_carrier" class="text-[10px] text-slate-500 mt-0.5">
                                                Ekspedisi: {{ stage.document?.courier_name || stage.document?.shipping_carrier || stage.documents?.[0]?.shipping_carrier }}
                                            </div>
                                        </div>
                                    </div>

                                    <div v-if="stage.document?.notes || stage.documents?.[0]?.notes" class="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/70">
                                        <strong>Catatan Verifikasi Fisik:</strong> {{ stage.document?.notes || stage.documents?.[0]?.notes }}
                                    </div>
                                </div>
                            </div>

                            <div v-else class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 italic text-[11px]">
                                {{ stage.status_label || 'Menunggu pengiriman barang tiba di loket gudang.' }}
                            </div>
                        </div>

                        <!-- 6. STAGE SPECIFIC: HANDOVER (SERAH TERIMA KE PEMOHON) -->
                        <div v-else-if="stage.key === 'handover'" class="space-y-3">
                            <div class="p-3 rounded-lg border" :class="stage.status === 'completed' ? 'bg-[#E8F8EE]/50 border-[#1B5E20]/20' : 'bg-slate-50 border-slate-200'">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                    <div>
                                        <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Penerima Akhir (Pemohon):</span>
                                        <div class="font-bold text-slate-900 flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span>{{ stage.actor?.name || '-' }}</span>
                                            <span v-if="stage.actor?.nik" class="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-200/70 text-slate-700">
                                                {{ stage.actor.nik }}
                                            </span>
                                        </div>
                                        <div class="text-[10px] text-slate-500 mt-0.5">
                                            <span>{{ stage.actor?.position || 'Pemohon Asli' }}</span>
                                            <span v-if="stage.actor?.division"> &bull; {{ stage.actor.division }}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Diserahkan Oleh (Gudang):</span>
                                        <div class="font-bold text-slate-900 flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span>{{ stage.handover_by?.name || 'Petugas Gudang' }}</span>
                                            <span v-if="stage.handover_by?.nik" class="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-200/70 text-slate-700">
                                                {{ stage.handover_by.nik }}
                                            </span>
                                        </div>
                                        <div class="mt-1 flex items-center gap-1.5 font-bold" :class="stage.status === 'completed' ? 'text-[#1B5E20]' : 'text-slate-700'">
                                            <CheckCircle2 v-if="stage.status === 'completed'" class="w-4 h-4 text-[#1B5E20]" />
                                            <Clock v-else class="w-4 h-4 text-slate-400" />
                                            <span class="text-xs">{{ stage.status_label }}</span>
                                        </div>
                                        <div v-if="stage.document?.handed_over_at || stage.completed_at" class="text-[10px] text-slate-500 mt-0.5">
                                            Waktu: {{ formatDate(stage.document?.handed_over_at || stage.completed_at) }}
                                        </div>
                                    </div>
                                </div>

                                <div v-if="stage.document?.handover_notes || stage.notes" class="mt-2.5 pt-2 border-t border-slate-200/80 text-[11px] text-slate-700 italic">
                                    "{{ stage.document?.handover_notes || stage.notes }}"
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
