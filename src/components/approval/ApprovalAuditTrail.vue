<script setup>
import { computed } from 'vue'
import { 
    CheckCircle2, 
    XCircle, 
    RotateCcw, 
    Send, 
    Clock, 
    MessageSquareQuote,
    History
} from '@lucide/vue'

const props = defineProps({
    actions: {
        type: Array,
        default: () => [],
    },
    isLoading: {
        type: Boolean,
        default: false,
    },
})

// Urutkan newest-first
const sortedActions = computed(() => {
    return [...props.actions].sort((a, b) => {
        const timeA = new Date(a.acted_at || 0).getTime()
        const timeB = new Date(b.acted_at || 0).getTime()
        return timeB - timeA
    })
})

const getActionMeta = (actionType) => {
    const act = String(actionType || '').toLowerCase()

    switch (act) {
        case 'approve':
        case 'approved':
            return {
                label: 'APPROVED',
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                dotColor: 'bg-emerald-500',
                icon: CheckCircle2,
            }
        case 'reject':
        case 'rejected':
            return {
                label: 'REJECTED',
                color: 'text-rose-700 bg-rose-50 border-rose-200',
                dotColor: 'bg-rose-500',
                icon: XCircle,
            }
        case 'request_revision':
        case 'revision':
        case 'revision_requested':
            return {
                label: 'REVISION REQUESTED',
                color: 'text-amber-700 bg-amber-50 border-amber-200',
                dotColor: 'bg-amber-500',
                icon: RotateCcw,
            }
        case 'submit':
        case 'submitted':
        case 'resubmit':
        case 'resubmitted':
            return {
                label: act.includes('resubmit') ? 'RESUBMITTED' : 'SUBMITTED',
                color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
                dotColor: 'bg-indigo-500',
                icon: Send,
            }
        default:
            return {
                label: String(actionType).toUpperCase(),
                color: 'text-gray-700 bg-gray-50 border-gray-200',
                dotColor: 'bg-gray-400',
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
</script>

<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
                <History class="w-4 h-4 text-indigo-600" />
                Jejak Audit Persetujuan (Audit Trail)
            </h3>
            <span class="text-xs text-gray-400 font-medium">Urutan terbaru</span>
        </div>

        <!-- LOADING STATE -->
        <div v-if="isLoading" class="py-8 text-center text-gray-400">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mb-2"></div>
            <p class="text-xs">Memuat jejak riwayat persetujuan...</p>
        </div>

        <!-- EMPTY STATE -->
        <div v-else-if="sortedActions.length === 0" class="py-8 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <History class="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p class="text-sm font-semibold text-gray-600">Belum ada riwayat persetujuan</p>
            <p class="text-xs text-gray-400 mt-0.5">Seluruh aktivitas keputusan akan tercatat di sini secara permanen.</p>
        </div>

        <!-- TIMELINE LIST -->
        <div v-else class="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            <div 
                v-for="act in sortedActions" 
                :key="act.id || act.acted_at"
                class="relative flex flex-col gap-1.5"
            >
                <!-- Dot node on vertical line -->
                <div 
                    class="absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                    :class="getActionMeta(act.action).dotColor"
                >
                    <component :is="getActionMeta(act.action).icon" class="w-3 h-3 text-white" />
                </div>

                <!-- Event Header -->
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-gray-900">
                            {{ act.user_name || act.acted_by || 'Sistem ERP' }}
                        </span>
                        <span v-if="act.user_role" class="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md">
                            {{ act.user_role }}
                        </span>
                    </div>

                    <span 
                        class="text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs"
                        :class="getActionMeta(act.action).color"
                    >
                        {{ getActionMeta(act.action).label }}
                    </span>
                </div>

                <!-- Timestamp -->
                <div class="text-xs text-gray-400 flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    <span>{{ formatDate(act.acted_at) }}</span>
                </div>

                <!-- Notes / Comment Box -->
                <div 
                    v-if="act.notes"
                    class="mt-1 text-xs text-gray-700 bg-gray-50/80 border-l-4 border-indigo-400 p-3 rounded-r-xl leading-relaxed italic"
                >
                    <div class="flex items-start gap-1.5 not-italic text-gray-500 mb-1 text-[11px] font-semibold">
                        <MessageSquareQuote class="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" /> Catatan Keputusan:
                    </div>
                    "{{ act.notes }}"
                </div>
            </div>
        </div>
    </div>
</template>
