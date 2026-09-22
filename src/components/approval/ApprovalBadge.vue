<script setup>
import { computed } from 'vue'
import { 
    Clock, 
    CheckCircle2, 
    XCircle, 
    RotateCcw, 
    SkipForward, 
    Ban,
    HelpCircle 
} from '@lucide/vue'

const props = defineProps({
    status: {
        type: String,
        default: 'pending',
    },
    size: {
        type: String,
        default: 'md', // 'sm', 'md', 'lg'
    },
})

const badgeConfig = computed(() => {
    const s = String(props.status || 'pending').toLowerCase().trim()

    switch (s) {
        case 'pending':
        case 'pending_approval':
            return {
                label: 'Pending',
                icon: Clock,
                classes: 'bg-amber-50 text-amber-700 border-amber-200/60 ring-amber-500/20',
                dotClass: 'bg-amber-500',
            }
        case 'approved':
            return {
                label: 'Approved',
                icon: CheckCircle2,
                classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 ring-emerald-500/20',
                dotClass: 'bg-emerald-500',
            }
        case 'rejected':
            return {
                label: 'Rejected',
                icon: XCircle,
                classes: 'bg-rose-50 text-rose-700 border-rose-200/60 ring-rose-500/20',
                dotClass: 'bg-rose-500',
            }
        case 'revision':
        case 'revision_requested':
        case 'request_revision':
            return {
                label: 'Revision Requested',
                icon: RotateCcw,
                classes: 'bg-orange-50 text-orange-700 border-orange-200/60 ring-orange-500/20',
                dotClass: 'bg-orange-500',
            }
        case 'skipped':
            return {
                label: 'Skipped',
                icon: SkipForward,
                classes: 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-400/20',
                dotClass: 'bg-slate-400',
            }
        case 'cancelled':
            return {
                label: 'Cancelled',
                icon: Ban,
                classes: 'bg-gray-100 text-gray-600 border-gray-200 ring-gray-400/20',
                dotClass: 'bg-gray-400',
            }
        default:
            return {
                label: props.status || 'Unknown',
                icon: HelpCircle,
                classes: 'bg-gray-50 text-gray-600 border-gray-200',
                dotClass: 'bg-gray-400',
            }
    }
})

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'sm':
            return 'px-2 py-0.5 text-xs gap-1'
        case 'lg':
            return 'px-3 py-1.5 text-sm gap-2'
        default:
            return 'px-2.5 py-1 text-xs gap-1.5'
    }
})
</script>

<template>
    <span
        :class="[
            'inline-flex items-center font-semibold rounded-full border shadow-2xs transition-all',
            badgeConfig.classes,
            sizeClasses
        ]"
    >
        <component :is="badgeConfig.icon" class="w-3.5 h-3.5 shrink-0" />
        <span>{{ badgeConfig.label }}</span>
    </span>
</template>
