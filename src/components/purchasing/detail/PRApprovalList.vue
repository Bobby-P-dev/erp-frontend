<script setup>
import { computed, ref } from 'vue'
import {
    ShieldCheck,
    UserCheck,
    Clock,
    ChevronDown,
    CheckCircle2,
    XCircle,
    RotateCcw,
    MessageSquareQuote
} from '@lucide/vue'
import ApprovalBadge from '../../approval/ApprovalBadge.vue'
import { formatDate } from '../../../composables/useFormatter.js'

const props = defineProps({
    item: {
        type: Object,
        required: true
    }
})

const showDecisionNotes = ref(false)

const approvalRequest = computed(() => {
    return props.item?.approval_request || null
})

const currentStepOrder = computed(() => {
    return approvalRequest.value?.current_step_order || 1
})

const levels = computed(() => {
    if (!approvalRequest.value?.levels || !Array.isArray(approvalRequest.value.levels)) {
        return []
    }
    return [...approvalRequest.value.levels].sort((a, b) => (a.step_order || 0) - (b.step_order || 0))
})

const completedActions = computed(() => {
    const acts = approvalRequest.value?.actions
    if (!acts || !Array.isArray(acts)) return []
    return acts.filter(a => ['approve', 'reject', 'request_revision', 'revision'].includes(a.action))
})

const getApproverInitials = (label) => {
    if (!label) return 'AP'
    const words = label.trim().split(/\s+/)
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
    }
    return label.slice(0, 2).toUpperCase()
}

const getLevelComputedStatus = (lvl) => {
    // If the whole PR was rejected and this level was active
    if (props.item?.status === 'rejected' && lvl.step_order === currentStepOrder.value) {
        return 'rejected'
    }
    // If revision requested at this level
    if (props.item?.status === 'revision_requested' && lvl.step_order === currentStepOrder.value) {
        return 'revision_requested'
    }
    // If level has explicit status
    if (lvl.status) {
        if (lvl.status === 'pending' && lvl.step_order > currentStepOrder.value) {
            return 'waiting'
        }
        if (lvl.status === 'pending' && lvl.step_order === currentStepOrder.value) {
            return 'in_review'
        }
        return lvl.status
    }
    // Fallback based on step order vs current step order
    if (props.item?.status === 'draft') return 'waiting'
    if (['approved', 'in_procurement', 'ready_for_pickup', 'completed'].includes(props.item?.status)) {
        return 'approved'
    }
    if (lvl.step_order < currentStepOrder.value) return 'approved'
    if (lvl.step_order === currentStepOrder.value) return 'in_review'
    return 'waiting'
}
</script>

<template>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <!-- Approver Rows -->
        <div v-if="levels.length > 0" class="divide-y divide-slate-100">
            <div 
                v-for="lvl in levels" 
                :key="lvl.id || lvl.step_order"
                class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-slate-50/60"
                :class="{
                    'bg-blue-50/30': getLevelComputedStatus(lvl) === 'in_review'
                }"
            >
                <div class="flex items-center gap-3.5 min-w-0">
                    <!-- Circle Step Order -->
                    <div 
                        class="w-7 h-7 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 border transition-all"
                        :class="[
                            getLevelComputedStatus(lvl) === 'approved' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                : getLevelComputedStatus(lvl) === 'in_review'
                                    ? 'bg-[#EAF2FF] text-[#014BAA] border-[#014BAA]/30 ring-2 ring-[#014BAA]/10'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                        ]"
                    >
                        {{ lvl.step_order }}
                    </div>

                    <!-- Initials Avatar -->
                    <div 
                        class="w-9 h-9 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 border"
                        :class="[
                            getLevelComputedStatus(lvl) === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : getLevelComputedStatus(lvl) === 'in_review'
                                    ? 'bg-[#EAF2FF] text-[#014BAA] border-[#014BAA]/20'
                                    : 'bg-slate-100 text-slate-500 border-slate-200/80'
                        ]"
                    >
                        {{ getApproverInitials(lvl.assignee_label || lvl.specific_user?.name || lvl.position?.name || lvl.role?.name) }}
                    </div>

                    <!-- Detail Level -->
                    <div class="min-w-0 space-y-0.5">
                        <div class="flex items-center gap-2">
                            <h5 class="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {{ lvl.step_name || 'Persetujuan Tahap ' + lvl.step_order }}
                            </h5>
                            <span 
                                v-if="getLevelComputedStatus(lvl) === 'in_review'" 
                                class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#EAF2FF] text-[#014BAA] border border-[#014BAA]/20"
                            >
                                <span class="w-1.5 h-1.5 rounded-full bg-[#014BAA] animate-pulse"></span>
                                Tahap Berjalan
                            </span>
                        </div>

                        <p class="text-xs text-slate-600 font-medium truncate flex items-center gap-1.5">
                            <UserCheck class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{{ lvl.assignee_label || lvl.specific_user?.name || lvl.position?.name || lvl.role?.name || 'Pejabat Peninjau Berwenang' }}</span>
                            <span v-if="lvl.sla_hours" class="text-slate-400 font-normal">
                                • SLA {{ lvl.sla_hours }} Jam
                            </span>
                        </p>
                    </div>
                </div>

                <!-- Status Aktual di Kanan -->
                <div class="shrink-0 self-start sm:self-center pl-10 sm:pl-0">
                    <ApprovalBadge 
                        :status="getLevelComputedStatus(lvl)" 
                        size="sm"
                    />
                </div>
            </div>
        </div>

        <!-- Empty State jika belum ada konfigurasi -->
        <div v-else class="p-6 text-center text-xs text-slate-500 space-y-2">
            <ShieldCheck class="w-8 h-8 text-slate-400 mx-auto" />
            <p class="font-medium text-slate-700">Alur persetujuan otomatis belum aktif atau dokumen masih berupa draft.</p>
            <p class="text-[11px] text-slate-400">Persetujuan berjenjang akan otomatis terhubung ke pimpinan saat dokumen diajukan.</p>
        </div>

        <!-- Decision Notes / Audit Comments (Expandable on-demand) -->
        <div v-if="completedActions.length > 0" class="border-t border-slate-100 bg-slate-50/50">
            <button
                type="button"
                @click="showDecisionNotes = !showDecisionNotes"
                class="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                :aria-expanded="showDecisionNotes"
            >
                <span class="flex items-center gap-1.5">
                    <MessageSquareQuote class="w-3.5 h-3.5 text-slate-500" />
                    Catatan Keputusan Pejabat ({{ completedActions.length }})
                </span>
                <ChevronDown 
                    class="w-4 h-4 text-slate-400 transition-transform duration-200" 
                    :class="{'rotate-180': showDecisionNotes}"
                />
            </button>

            <div v-if="showDecisionNotes" class="p-4 pt-1 space-y-2">
                <div 
                    v-for="act in completedActions" 
                    :key="act.id || act.acted_at"
                    class="p-3 rounded-lg border text-xs space-y-1 bg-white"
                    :class="{
                        'border-emerald-200': act.action === 'approve',
                        'border-rose-200': act.action === 'reject',
                        'border-amber-200': act.action === 'revision' || act.action === 'request_revision',
                    }"
                >
                    <div class="flex items-center justify-between gap-2">
                        <span class="font-bold text-slate-900">{{ act.user_name }} ({{ act.user_role || 'Peninjau' }})</span>
                        <span class="text-[11px] text-slate-400 font-mono">{{ formatDate(act.acted_at) }}</span>
                    </div>
                    <div v-if="act.notes" class="text-xs text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-100">
                        "{{ act.notes }}"
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
