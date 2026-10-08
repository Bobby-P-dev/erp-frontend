<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseModal from '../ui/BaseModal.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import DocumentWorkflowTracker from '../approval/DocumentWorkflowTracker.vue'
import DocumentLifecycleTimeline from '../approval/DocumentLifecycleTimeline.vue'
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
    Clock,
    User,
    Building2,
    Briefcase,
    Calendar,
    Mail,
    ShieldCheck,
    Layers,
    UserCheck,
    AlertCircle
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

const activeWorkflowTab = ref('lifecycle') // 'lifecycle' | 'tracker'

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

const requesterProfile = computed(() => {
    const r = props.item?.requester
    const emp = r?.employee
    const name = emp?.name || r?.name || 'Staff Pemohon'
    const words = name.trim().split(/\s+/)
    const initials = words.length >= 2 
        ? (words[0][0] + words[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase()

    return {
        name,
        initials,
        nik: emp?.nik || null,
        email: emp?.email || r?.email || null,
        position: emp?.position?.name || null,
        jobLevel: emp?.job_level?.name || null,
        division: props.item?.division?.name || emp?.division?.name || null,
        company: props.item?.company?.name || emp?.company?.name || null,
    }
})

const activeApproverInfo = computed(() => {
    const req = props.item?.approval_request
    if (!req) return null
    if (props.item?.status !== 'pending_approval') return null

    const currentOrder = req.current_step_order || 1
    const levels = Array.isArray(req.levels) ? req.levels : []
    const currentLvl = req.current_level || levels.find(l => l.step_order === currentOrder) || null

    if (!currentLvl) return null

    return {
        stepOrder: currentLvl.step_order || currentOrder,
        stepName: currentLvl.step_name || `Persetujuan Tahap ${currentOrder}`,
        assigneeLabel: currentLvl.assignee_label || currentLvl.specific_user?.name || currentLvl.position?.name || currentLvl.role?.name || 'Pejabat Peninjau',
        approverScope: currentLvl.approver_scope,
        approvalMode: currentLvl.approval_mode || 'any',
        slaHours: currentLvl.sla_hours,
    }
})

const completedActions = computed(() => {
    const req = props.item?.approval_request
    if (!req || !Array.isArray(req.actions)) return []
    return req.actions.filter(a => ['approve', 'reject', 'request_revision', 'revision'].includes(a.action))
})
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

            <!-- 1. STAKEHOLDERS MATRIX (PEMBUAT & PENINJAU AKTIF) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <!-- KARTU PEMBUAT (REQUESTER PROFILE) -->
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between pb-2.5 border-b border-slate-200/80 mb-3">
                            <span class="text-[11px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
                                <User class="w-3.5 h-3.5 text-blue-600" />
                                Pembuat Dokumen (Requester)
                            </span>
                            <span v-if="requesterProfile.nik" class="px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-mono text-[10px] font-semibold">
                                NIK: {{ requesterProfile.nik }}
                            </span>
                        </div>

                        <div class="flex items-start gap-3">
                            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold font-mono text-sm flex items-center justify-center shrink-0 shadow-2xs">
                                {{ requesterProfile.initials }}
                            </div>
                            <div class="space-y-0.5 min-w-0">
                                <h4 class="text-xs font-bold text-slate-900 truncate">
                                    {{ requesterProfile.name }}
                                </h4>
                                <p v-if="requesterProfile.position || requesterProfile.jobLevel" class="text-[11px] text-slate-600 font-medium truncate flex items-center gap-1.5">
                                    <Briefcase class="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{{ requesterProfile.position || 'Staff' }}</span>
                                    <span v-if="requesterProfile.jobLevel" class="text-slate-400">• {{ requesterProfile.jobLevel }}</span>
                                </p>
                                <p v-if="requesterProfile.division || requesterProfile.company" class="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                                    <Building2 class="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{{ requesterProfile.division || item.division?.name || '-' }}</span>
                                    <span class="text-slate-400">•</span>
                                    <span class="truncate">{{ requesterProfile.company || item.company?.name || '-' }}</span>
                                </p>
                                <p v-if="requesterProfile.email" class="text-[11px] text-slate-400 truncate flex items-center gap-1.5 pt-0.5">
                                    <Mail class="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{{ requesterProfile.email }}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Waktu Pengajuan:</span>
                        <strong class="text-slate-800 font-semibold">{{ formatDate(item.request_date) }}</strong>
                    </div>
                </div>

                <!-- KARTU STATUS PENINJAUAN & APPROVER AKTIF -->
                <div 
                    class="rounded-xl p-4 flex flex-col justify-between border"
                    :class="{
                        'bg-blue-50/60 border-blue-200 text-blue-900': item.status === 'pending_approval',
                        'bg-emerald-50/60 border-emerald-200 text-emerald-900': item.status === 'approved' || item.status === 'ready_for_pickup' || item.status === 'completed',
                        'bg-amber-50/60 border-amber-200 text-amber-900': item.status === 'revision_requested',
                        'bg-rose-50/60 border-rose-200 text-rose-900': item.status === 'rejected',
                        'bg-slate-50 border-slate-200 text-slate-700': item.status === 'draft',
                    }"
                >
                    <div>
                        <!-- Header Status -->
                        <div class="flex items-center justify-between pb-2.5 border-b mb-3" :class="{
                            'border-blue-200/70': item.status === 'pending_approval',
                            'border-emerald-200/70': item.status === 'approved' || item.status === 'ready_for_pickup' || item.status === 'completed',
                            'border-amber-200/70': item.status === 'revision_requested',
                            'border-rose-200/70': item.status === 'rejected',
                            'border-slate-200/70': item.status === 'draft',
                        }">
                            <span class="text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5">
                                <ShieldCheck class="w-3.5 h-3.5" />
                                Status Peninjauan (Approval)
                            </span>
                            <StatusBadge :status="item.status" size="sm" />
                        </div>

                        <!-- Skenario 1: Menunggu Approval Aktif -->
                        <div v-if="item.status === 'pending_approval' && activeApproverInfo" class="space-y-1.5">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                <h4 class="text-xs font-bold text-blue-950">
                                    {{ activeApproverInfo.stepName }}
                                </h4>
                            </div>
                            <div class="p-2.5 rounded-lg bg-white/90 border border-blue-200/80 space-y-1 text-xs">
                                <div class="text-[11px] text-slate-500 font-medium">Peninjau yang sedang ditunggu:</div>
                                <div class="font-bold text-slate-900 flex items-center gap-1.5">
                                    <UserCheck class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span>{{ activeApproverInfo.assigneeLabel }}</span>
                                </div>
                                <div class="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                                    <span v-if="activeApproverInfo.slaHours" class="flex items-center gap-1">
                                        <Clock class="w-3 h-3 text-amber-600" />
                                        SLA: {{ activeApproverInfo.slaHours }} Jam
                                    </span>
                                    <span>
                                        Mode: {{ activeApproverInfo.approvalMode === 'all' ? 'Konsensus (Semua Pejabat)' : 'Tunggal (Cukup 1 Pejabat)' }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Skenario 2: Disetujui Penuh -->
                        <div v-else-if="['approved', 'ready_for_pickup', 'completed'].includes(item.status)" class="space-y-1.5">
                            <div class="flex items-center gap-2">
                                <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                                <h4 class="text-xs font-bold text-emerald-950">Disetujui Penuh (Approved)</h4>
                            </div>
                            <p class="text-xs text-emerald-800 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-emerald-200/80">
                                Seluruh jenjang persetujuan telah selesai diverifikasi oleh pejabat berwenang. Dokumen telah masuk ke antrean Purchasing untuk rencana pengadaan.
                            </p>
                        </div>

                        <!-- Skenario 3: Perlu Revisi -->
                        <div v-else-if="item.status === 'revision_requested'" class="space-y-1.5">
                            <div class="flex items-center gap-2">
                                <RotateCcw class="w-4 h-4 text-amber-600" />
                                <h4 class="text-xs font-bold text-amber-950">Memerlukan Revisi Pemohon</h4>
                            </div>
                            <p class="text-xs text-amber-800 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
                                Dokumen dikembalikan ke pemohon untuk penyesuaian rincian barang atau anggaran sebelum dapat diajukan kembali.
                            </p>
                        </div>

                        <!-- Skenario 4: Ditolak -->
                        <div v-else-if="item.status === 'rejected'" class="space-y-1.5">
                            <div class="flex items-center gap-2">
                                <XCircle class="w-4 h-4 text-rose-600" />
                                <h4 class="text-xs font-bold text-rose-950">Pengajuan Ditolak</h4>
                            </div>
                            <p class="text-xs text-rose-800 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-rose-200/80">
                                Seluruh item dalam pengajuan ini ditolak dan proses pengadaan tidak dapat dilanjutkan.
                            </p>
                        </div>

                        <!-- Skenario 5: Draft -->
                        <div v-else class="space-y-1.5">
                            <div class="flex items-center gap-2">
                                <Clock class="w-4 h-4 text-slate-500" />
                                <h4 class="text-xs font-bold text-slate-800">Draft Dokumen</h4>
                            </div>
                            <p class="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                                Dokumen belum diajukan untuk proses peninjauan persetujuan pimpinan.
                            </p>
                        </div>
                    </div>

                    <div class="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px]" :class="{
                        'border-blue-200/70 text-blue-700': item.status === 'pending_approval',
                        'border-emerald-200/70 text-emerald-700': item.status === 'approved' || item.status === 'ready_for_pickup' || item.status === 'completed',
                        'border-amber-200/70 text-amber-700': item.status === 'revision_requested',
                        'border-rose-200/70 text-rose-700': item.status === 'rejected',
                        'border-slate-200/70 text-slate-500': item.status === 'draft',
                    }">
                        <span>Target Kebutuhan Barang:</span>
                        <strong class="font-semibold">{{ formatDate(item.required_date) }}</strong>
                    </div>
                </div>
            </div>

            <!-- 2. TOTAL ESTIMASI & KEPERLUAN PENGADAAN -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <!-- Total Estimasi Nilai -->
                <div class="md:col-span-1 p-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-xl shadow-2xs flex flex-col justify-between">
                    <div>
                        <span class="text-[11px] text-blue-200 uppercase tracking-wider font-semibold block">Total Estimasi Biaya</span>
                        <div class="text-lg font-mono font-bold tracking-tight text-white mt-1">
                            {{ formatCurrency(item.total_estimated_amount || calculateTotalPR(item.items)) }}
                        </div>
                    </div>
                    <p class="text-[10px] text-blue-200/80 mt-2">
                        Akumulasi {{ item.items?.length || 0 }} macam barang diajukan.
                    </p>
                </div>

                <!-- Keperluan / Purpose -->
                <div class="md:col-span-2 bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex flex-col justify-between">
                    <div>
                        <span class="text-xs font-bold text-slate-800 block mb-1">Keperluan Pengadaan:</span>
                        <p class="text-slate-700 leading-relaxed">
                            {{ item.purpose }}
                        </p>
                    </div>
                    <div v-if="item.notes" class="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                        <strong>Catatan:</strong> {{ item.notes }}
                    </div>
                </div>
            </div>

            <!-- 3. RIWAYAT AKSI PENINJAU (REVIEWERS AUDIT LOG) JIKA ADA -->
            <div v-if="completedActions.length > 0" class="bg-white rounded-xl border border-slate-200/90 p-4 space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck class="w-4 h-4 text-slate-500" />
                        Catatan Keputusan Pejabat Peninjau ({{ completedActions.length }})
                    </span>
                    <span class="text-[11px] text-slate-400">Riwayat Peninjauan</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div 
                        v-for="act in completedActions" 
                        :key="act.id || act.acted_at"
                        class="p-3 rounded-lg border text-xs space-y-1.5 transition-colors"
                        :class="{
                            'bg-emerald-50/40 border-emerald-200': act.action === 'approve',
                            'bg-rose-50/40 border-rose-200': act.action === 'reject',
                            'bg-amber-50/40 border-amber-200': act.action === 'revision' || act.action === 'request_revision',
                        }"
                    >
                        <div class="flex items-center justify-between gap-2">
                            <span class="font-bold text-slate-900 truncate">{{ act.user_name }}</span>
                            <span 
                                class="px-2 py-0.2 rounded text-[10px] font-bold"
                                :class="{
                                    'bg-emerald-100 text-emerald-800': act.action === 'approve',
                                    'bg-rose-100 text-rose-800': act.action === 'reject',
                                    'bg-amber-100 text-amber-800': act.action === 'revision' || act.action === 'request_revision',
                                }"
                            >
                                {{ act.action === 'approve' ? 'Disetujui' : act.action === 'reject' ? 'Ditolak' : 'Minta Revisi' }}
                            </span>
                        </div>
                        <div class="text-[11px] text-slate-500 flex items-center justify-between">
                            <span>{{ act.user_role || 'Peninjau' }}</span>
                            <span>{{ formatDate(act.acted_at) }}</span>
                        </div>
                        <div v-if="act.notes" class="text-[11px] text-slate-700 bg-white/80 p-2 rounded border border-slate-200/60 leading-relaxed italic">
                            "{{ act.notes }}"
                        </div>
                    </div>
                </div>
            </div>

            <!-- Workflow & Lifecycle Progress Tracker -->
            <div class="space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Clock class="w-4 h-4 text-slate-600" />
                        Alur Dokumen & Jejak Persetujuan
                    </h4>

                    <!-- Segmented View Toggle -->
                    <div class="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
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
                            <span>Siklus Hidup Lengkap (End-to-End)</span>
                        </button>
                        <button
                            type="button"
                            @click="activeWorkflowTab = 'tracker'"
                            :class="[
                                'px-3 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                                activeWorkflowTab === 'tracker'
                                    ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                                    : 'text-slate-600 hover:text-slate-900'
                            ]"
                        >
                            <Clock class="w-3.5 h-3.5 text-slate-500" />
                            <span>Detail Approval & Audit</span>
                        </button>
                    </div>
                </div>

                <div v-if="activeWorkflowTab === 'lifecycle'">
                    <DocumentLifecycleTimeline
                        :documentId="item.id"
                        documentType="purchase_requisition"
                    />
                </div>

                <div v-else>
                    <DocumentWorkflowTracker
                        documentType="purchase_requisition"
                        :documentId="item.id"
                        title="Progres Alur Persetujuan (Workflow)"
                        auditTrailTitle="Jejak Audit Persetujuan (Audit Trail)"
                    />
                </div>
            </div>

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
