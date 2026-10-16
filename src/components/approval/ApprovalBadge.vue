<script setup>
import { computed } from 'vue'
import { 
    Clock, 
    Check, 
    X, 
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
                label: 'Menunggu Persetujuan',
                icon: Clock,
                classes: 'bg-[#FEF3E2] text-[#B45309] border border-[#B45309]/15',
                iconBg: 'bg-[#B45309]'
            }
        case 'in_review':
        case 'in_progress':
        case 'review':
        case 'sedang_ditinjau':
            return {
                label: 'Sedang Ditinjau',
                icon: Clock,
                classes: 'bg-[#E8F1FD] text-[#014BAA] border border-[#014BAA]/15',
                iconBg: 'bg-[#014BAA]'
            }
        case 'waiting':
        case 'queue':
        case 'menunggu_antrean':
        case 'menunggu_giliran':
            return {
                label: 'Menunggu Antrean',
                icon: Clock,
                classes: 'bg-[#F1F5F9] text-[#475569] border border-[#475569]/15',
                iconBg: 'bg-[#475569]'
            }
        case 'approved':
            return {
                label: 'Disetujui',
                icon: Check,
                classes: 'bg-[#E8F8EE] text-[#1B5E20] border border-[#1B5E20]/15',
                iconBg: 'bg-[#1B5E20]'
            }
        case 'rejected':
            return {
                label: 'Ditolak',
                icon: X,
                classes: 'bg-[#FDE8E8] text-[#991B1B] border border-[#991B1B]/15',
                iconBg: 'bg-[#991B1B]'
            }
        case 'revision':
        case 'revision_requested':
        case 'request_revision':
            return {
                label: 'Perlu Revisi',
                icon: RotateCcw,
                classes: 'bg-[#FFF1E6] text-[#C2410C] border border-[#C2410C]/15',
                iconBg: 'bg-[#C2410C]'
            }
        case 'skipped':
            return {
                label: 'Dilewati',
                icon: SkipForward,
                classes: 'bg-[#F1F5F9] text-[#475569] border border-[#475569]/15',
                iconBg: 'bg-[#475569]'
            }
        case 'cancelled':
            return {
                label: 'Dibatalkan',
                icon: Ban,
                classes: 'bg-[#F1F5F9] text-[#475569] border border-[#475569]/15',
                iconBg: 'bg-[#475569]'
            }
        default:
            return {
                label: props.status || 'Unknown',
                icon: HelpCircle,
                classes: 'bg-[#F1F5F9] text-[#475569] border border-[#475569]/15',
                iconBg: 'bg-[#475569]'
            }
    }
})

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'lg':
            return {
                badge: 'pl-2 pr-4 py-1.5 text-sm font-bold gap-2 min-h-[32px] leading-none',
                circle: 'w-5 h-5',
                icon: 'w-3 h-3 stroke-[2.75]'
            }
        case 'sm':
            return {
                badge: 'pl-1.5 pr-3 py-1 text-xs font-bold gap-1.5 min-h-[26px] leading-none',
                circle: 'w-4 h-4',
                icon: 'w-2.5 h-2.5 stroke-[2.75]'
            }
        case 'md':
        default:
            return {
                badge: 'pl-1.5 pr-3.5 py-1.5 text-xs sm:text-sm font-bold gap-2 min-h-[30px] leading-none',
                circle: 'w-5 h-5',
                icon: 'w-3 h-3 stroke-[2.75]'
            }
    }
})
</script>

<template>
    <span
        :class="[
            'inline-flex items-center justify-center font-bold rounded-full border whitespace-nowrap transition-all select-none tracking-tight shadow-2xs',
            badgeConfig.classes,
            sizeClasses.badge
        ]"
    >
        <span
            :class="[
                'rounded-full flex items-center justify-center shrink-0 text-white shadow-2xs',
                badgeConfig.iconBg,
                sizeClasses.circle
            ]"
        >
            <component :is="badgeConfig.icon" :class="sizeClasses.icon" />
        </span>
        <span class="leading-none pt-0.5">{{ badgeConfig.label }}</span>
    </span>
</template>
