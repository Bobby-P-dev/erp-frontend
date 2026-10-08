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

const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'completed':
            return 'bg-emerald-50 text-emerald-800 border-emerald-200'
        case 'in_progress':
            return 'bg-blue-50 text-blue-800 border-blue-200 ring-1 ring-blue-400/30 font-bold'
        case 'rejected':
            return 'bg-rose-50 text-rose-800 border-rose-200'
        case 'revision':
            return 'bg-amber-50 text-amber-800 border-amber-200'
        case 'ready_to_start':
            return 'bg-indigo-50 text-indigo-800 border-indigo-200'
        default:
            return 'bg-slate-50 text-slate-500 border-slate-200'
    }
}

const getRailIconColor = (status) => {
    switch (status) {
        case 'completed':
            return 'bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-50'
        case 'in_progress':
            return 'bg-blue-600 text-white shadow-xs ring-4 ring-blue-100 animate-pulse'
        case 'rejected':
            return 'bg-rose-600 text-white shadow-xs ring-4 ring-rose-50'
        case 'revision':
            return 'bg-amber-600 text-white shadow-xs ring-4 ring-amber-50'
        case 'ready_to_start':
            return 'bg-indigo-600 text-white shadow-xs ring-4 ring-indigo-50'
        default:
            return 'bg-slate-100 text-slate-400 border border-slate-300'
    }
}
</script>

<template>
    <div class="space-y-4">
        <!-- HEADER / PROGRESS SUMMARY -->
        <div v-if="showProgressSummary" class="bg-gradient-to-r from-slate-50 to-slate-100/60 p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        6-T
                    </div>
                    <div>
                        <h4 class="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <span>{{ title }}</span>
                            <span v-if="activeLifecycle?.document_number" class="px-2 py-0.5 rounded font-mono text-[11px] bg-white border border-slate-200 text-slate-700 font-semibold">
                                {{ activeLifecycle.document_number }}
                            </span>
                        </h4>
                        <p class="text-[11px] text-slate-500 mt-0.5">
                            Rantai kolaborasi lintas divisi: Pemohon &rarr; Approver PR &rarr; Purchasing Buyer &rarr; Kasir Keuangan &rarr; Gudang &rarr; Penerima
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-3 self-end sm:self-auto">
                    <div class="text-right">
                        <span class="text-[11px] font-bold text-slate-700 block">
                            {{ completedStagesCount }} dari {{ stages.length || 6 }} Tahap Selesai
                        </span>
                        <span class="text-[10px] text-slate-500 font-medium font-mono">
                            {{ progressPercentage }}% Progres Alur
                        </span>
                    </div>
                    <div class="w-16 sm:w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                            class="bg-emerald-600 h-2 rounded-full transition-all duration-500" 
                            :style="{ width: `${progressPercentage}%` }"
                        ></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- LOADING STATE -->
        <div v-if="isLoading && !stages.length" class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
            <RefreshCw class="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
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
                        stage.status === 'in_progress' ? 'border-blue-300 shadow-xs ring-1 ring-blue-100' : 'border-slate-200 shadow-2xs',
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
                                    stage.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                    stage.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                    stage.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                ]"
                            >
                                <component :is="getStageIcon(stage.key)" class="w-4 h-4" />
                            </div>

                            <div>
                                <div class="flex items-center gap-2">
                                    <h5 class="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                                        {{ stage.title }}
                                    </h5>
                                    <span 
                                        class="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold border"
                                        :class="getStatusBadgeClass(stage.status)"
                                    >
                                        {{ stage.status_label || stage.status }}
                                    </span>
                                </div>
                                <p class="text-[11px] text-slate-500 mt-0.5">
                                    {{ stage.subtitle }}
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
                            <div class="text-[11px] text-slate-500 font-medium">
                                Persetujuan berjenjang internal dengan {{ stage.tiers?.length || 0 }} tingkat peninjau:
                            </div>

                            <!-- Approver Tiers Cards -->
                            <div class="space-y-2">
                                <div 
                                    v-for="tier in stage.tiers" 
                                    :key="tier.step_order"
                                    class="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                    :class="[
                                        tier.status === 'approved' ? 'bg-emerald-50/40 border-emerald-200' : 
                                        tier.status === 'rejected' ? 'bg-rose-50/40 border-rose-200' : 
                                        tier.status === 'skipped' ? 'bg-slate-50 border-slate-200 opacity-60' : 
                                        'bg-blue-50/30 border-blue-200'
                                    ]"
                                >
                                    <div class="flex items-center gap-3">
                                        <div 
                                            class="w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[11px]"
                                            :class="[
                                                tier.status === 'approved' ? 'bg-emerald-600 text-white' : 
                                                tier.status === 'rejected' ? 'bg-rose-600 text-white' : 
                                                'bg-blue-600 text-white'
                                            ]"
                                        >
                                            {{ tier.step_order }}
                                        </div>
                                        <div>
                                            <div class="font-bold text-slate-900 flex items-center gap-1.5">
                                                <span>{{ tier.step_name || 'Tier ' + tier.step_order }}</span>
                                                <span class="text-[11px] text-slate-500 font-normal">({{ tier.role_name }})</span>
                                            </div>
                                            <div class="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1.5">
                                                <span class="font-medium text-slate-800">{{ tier.specific_user?.name || 'Pejabat Peninjau' }}</span>
                                                <span v-if="tier.specific_user?.nik" class="font-mono text-[10px] text-slate-500">
                                                    [{{ tier.specific_user.nik }}]
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                                        <span 
                                            class="px-2 py-0.5 rounded text-[10px] font-bold border"
                                            :class="getStatusBadgeClass(tier.status)"
                                        >
                                            {{ tier.status_label || tier.status }}
                                        </span>
                                        <span v-if="tier.completed_at" class="text-[10px] text-slate-500 font-medium">
                                            {{ formatDate(tier.completed_at) }}
                                        </span>
                                    </div>
                                </div>
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
                                        <span class="font-bold text-slate-900">{{ act.actor?.name }}</span>
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
                            <div v-if="stage.documents?.length" class="space-y-2.5">
                                <div 
                                    v-for="dp in stage.documents" 
                                    :key="dp.id"
                                    class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5"
                                >
                                    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                                        <div class="flex items-center gap-2">
                                            <span class="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                {{ dp.number }}
                                            </span>
                                            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                {{ dp.purchase_channel || 'Pembelian Langsung' }}
                                            </span>
                                        </div>
                                        <div class="font-mono font-bold text-slate-900 text-sm">
                                            {{ formatCurrency(dp.grand_total || 0) }}
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                        <div>
                                            <span class="text-slate-400 block text-[10px]">Toko / Supplier / Vendor:</span>
                                            <span class="font-bold text-slate-800">{{ dp.supplier_name }}</span>
                                        </div>
                                        <div>
                                            <span class="text-slate-400 block text-[10px]">Staf Buyer (Purchasing):</span>
                                            <div class="font-bold text-slate-800 flex items-center gap-1">
                                                <span>{{ dp.buyer?.name || '-' }}</span>
                                                <span v-if="dp.buyer?.nik" class="font-mono text-[10px] text-slate-500">[{{ dp.buyer.nik }}]</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div v-if="dp.notes" class="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/70">
                                        <strong>Catatan Checkout:</strong> {{ dp.notes }}
                                    </div>
                                </div>
                            </div>

                            <div v-else class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 italic text-[11px]">
                                {{ stage.status_label || 'Menunggu proses belanja staf Purchasing.' }}
                            </div>
                        </div>

                        <!-- 4. STAGE SPECIFIC: PAYMENT DISBURSEMENT (PEMBAYARAN KEUANGAN) -->
                        <div v-else-if="stage.key === 'payment_disbursement'" class="space-y-3">
                            <div v-if="stage.documents?.length" class="space-y-2.5">
                                <div 
                                    v-for="(pay, pIdx) in stage.documents" 
                                    :key="pIdx"
                                    class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5"
                                >
                                    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                                        <div class="flex items-center gap-2">
                                            <span class="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                {{ pay.number || pay.prq_number }}
                                            </span>
                                            <span 
                                                class="px-2 py-0.5 rounded text-[10px] font-bold border"
                                                :class="pay.type === 'payment' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'"
                                            >
                                                {{ pay.type === 'payment' ? 'Lunas Ditransfer' : 'Menunggu Transfer Kasir' }}
                                            </span>
                                            <span v-if="pay.prq_number && pay.number" class="text-[10px] text-slate-500 font-mono">
                                                Tagihan: {{ pay.prq_number }}
                                            </span>
                                        </div>
                                        <div class="font-mono font-bold text-slate-900 text-sm">
                                            {{ formatCurrency(pay.amount_paid || 0) }}
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                        <div>
                                            <span class="text-slate-400 block text-[10px]">Tujuan Pembayaran (Vendor/Toko):</span>
                                            <span class="font-bold text-slate-800">{{ pay.recipient_name || '-' }}</span>
                                            <div v-if="pay.bank_name" class="text-slate-500 text-[10px] mt-0.5">
                                                {{ pay.bank_name }} - {{ pay.bank_account_number }} (a.n. {{ pay.bank_account_holder }})
                                            </div>
                                        </div>
                                        <div>
                                            <span class="text-slate-400 block text-[10px]">Kasir / Staf Keuangan:</span>
                                            <span class="font-bold text-slate-800">{{ pay.disbursed_by?.name || stage.actor?.name || '-' }}</span>
                                            <div v-if="pay.source_account" class="text-slate-500 text-[10px] mt-0.5">
                                                Sumber Dana: {{ pay.source_account }}
                                            </div>
                                            <div v-else-if="pay.payment_method" class="text-slate-500 text-[10px] mt-0.5 capitalize">
                                                Metode: {{ String(pay.payment_method).replace(/_/g, ' ') }}
                                            </div>
                                        </div>
                                    </div>

                                    <div v-if="pay.payment_date || pay.reference_number" class="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/50">
                                        <span v-if="pay.payment_date">Tanggal Transfer: <strong>{{ formatDateOnly(pay.payment_date) }}</strong></span>
                                        <span v-if="pay.reference_number" class="font-mono">Ref: {{ pay.reference_number }}</span>
                                    </div>

                                    <div v-if="pay.proof_file" class="pt-1">
                                        <a 
                                            :href="pay.proof_file.url" 
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-slate-200 text-blue-600 hover:text-blue-800 hover:bg-slate-50 shadow-2xs transition-colors"
                                        >
                                            <Paperclip class="w-3.5 h-3.5" />
                                            <span>Lihat Bukti Transfer: {{ pay.proof_file.file_name }}</span>
                                            <ExternalLink class="w-3 h-3 text-slate-400" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div v-else class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 italic text-[11px]">
                                {{ stage.status_label || 'Menunggu pencairan/pembayaran dana oleh Kasir Finance.' }}
                            </div>
                        </div>

                        <!-- 6. STAGE SPECIFIC: GOODS RECEIPT -->
                        <div v-else-if="stage.key === 'goods_receipt'" class="space-y-3">
                            <div v-if="stage.documents?.length" class="space-y-2.5">
                                <div 
                                    v-for="gr in stage.documents" 
                                    :key="gr.id"
                                    class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5"
                                >
                                    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                                        <div class="flex items-center gap-2">
                                            <span class="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                {{ gr.number }}
                                            </span>
                                            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                Tiba di Gudang
                                            </span>
                                        </div>
                                        <div class="text-[11px] text-slate-600">
                                            Tiba: <strong>{{ formatDateOnly(gr.receipt_date) }}</strong>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                        <div>
                                            <span class="text-slate-400 block text-[10px]">Petugas Pemeriksa Gudang:</span>
                                            <span class="font-bold text-slate-800">{{ gr.received_by?.name || stage.actor?.name || '-' }}</span>
                                            <div v-if="gr.received_by?.position" class="text-slate-500 text-[10px]">
                                                {{ gr.received_by.position }}
                                            </div>
                                        </div>
                                        <div>
                                            <span class="text-slate-400 block text-[10px]">Kurir & Surat Jalan:</span>
                                            <span class="font-bold text-slate-800">{{ gr.delivery_note_number || 'Tanpa No. SJ' }}</span>
                                            <div v-if="gr.shipping_carrier" class="text-slate-500 text-[10px]">
                                                Ekspedisi: {{ gr.shipping_carrier }}
                                            </div>
                                        </div>
                                    </div>

                                    <div v-if="gr.notes" class="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/70">
                                        <strong>Catatan Verifikasi Fisik:</strong> {{ gr.notes }}
                                    </div>
                                </div>
                            </div>

                            <div v-else class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 italic text-[11px]">
                                {{ stage.status_label || 'Menunggu pengiriman barang tiba di loket gudang.' }}
                            </div>
                        </div>

                        <!-- 7. STAGE SPECIFIC: HANDOVER -->
                        <div v-else-if="stage.key === 'handover'" class="space-y-3">
                            <div class="p-3 rounded-lg border" :class="stage.status === 'completed' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                    <div>
                                        <span class="text-slate-400 block text-[10px]">Penerima Akhir (Pemohon):</span>
                                        <div class="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                                            <span>{{ stage.actor?.name || '-' }}</span>
                                            <span v-if="stage.actor?.nik" class="font-mono text-[10px] text-slate-500">[{{ stage.actor.nik }}]</span>
                                        </div>
                                        <div class="text-[10px] text-slate-500">
                                            {{ stage.actor?.position || 'Pemohon Asli' }}
                                        </div>
                                    </div>

                                    <div>
                                        <span class="text-slate-400 block text-[10px]">Status Serah Terima:</span>
                                        <div class="font-bold mt-0.5 flex items-center gap-1.5" :class="stage.status === 'completed' ? 'text-emerald-700' : 'text-slate-700'">
                                            <CheckCircle2 v-if="stage.status === 'completed'" class="w-4 h-4 text-emerald-600" />
                                            <Clock v-else class="w-4 h-4 text-slate-400" />
                                            <span>{{ stage.status_label }}</span>
                                        </div>
                                        <div v-if="stage.completed_at" class="text-[10px] text-slate-500">
                                            Waktu: {{ formatDate(stage.completed_at) }}
                                        </div>
                                    </div>
                                </div>

                                <div v-if="stage.notes" class="mt-2.5 pt-2 border-t border-slate-200/80 text-[11px] text-slate-700 italic">
                                    "{{ stage.notes }}"
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
