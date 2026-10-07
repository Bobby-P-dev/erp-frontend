<script setup>
import { computed } from 'vue'

const props = defineProps({
    /**
     * Backward-compatible boolean active prop for master data.
     */
    isActive: {
        type: [Boolean, Number],
        default: null
    },
    /**
     * ERP workflow status string (e.g. 'draft', 'pending_approval', 'ready_for_pickup', 'completed').
     */
    status: {
        type: [String, Object],
        default: ''
    },
    /**
     * Custom text label override.
     */
    label: {
        type: String,
        default: ''
    },
    /**
     * Explicit color variant override ('emerald', 'amber', 'rose', 'blue', 'slate', 'zinc', 'indigo').
     */
    variant: {
        type: String,
        default: ''
    },
    /**
     * Size variant: 'sm', 'md', 'lg'.
     */
    size: {
        type: String,
        default: 'sm',
        validator: (v) => ['sm', 'md', 'lg'].includes(v)
    },
    /**
     * Whether to show a colored status dot indicator.
     */
    dot: {
        type: Boolean,
        default: true
    },
    /**
     * Optional icon component to display beside the label.
     */
    icon: {
        type: [Object, Function],
        default: null
    }
})

// Normalizes status string (unwraps backend enum object if present: { value: 'draft', label: 'Draft' })
const rawStatus = computed(() => {
    if (typeof props.status === 'object' && props.status !== null) {
        return props.status.value || props.status.name || ''
    }
    return String(props.status || '').toLowerCase().trim()
})

const badgeConfig = computed(() => {
    // 1. If legacy isActive boolean prop is supplied
    if (props.isActive !== null && props.isActive !== undefined) {
        const active = Boolean(props.isActive)
        return {
            label: active ? 'Active' : 'Inactive',
            bg: active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
            dot: active ? 'bg-emerald-500' : 'bg-rose-500',
            pulse: false
        }
    }

    // 2. If status string is supplied
    const st = rawStatus.value
    switch (st) {
        case 'draft':
            return {
                label: 'Draft',
                bg: 'bg-slate-100 text-slate-700 border-slate-200',
                dot: 'bg-slate-400',
                pulse: false
            }
        case 'pending_approval':
            return {
                label: 'Menunggu Approval',
                bg: 'bg-amber-50 text-amber-800 border-amber-200',
                dot: 'bg-amber-500',
                pulse: true
            }
        case 'approved':
            return {
                label: 'Disetujui',
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                dot: 'bg-emerald-600',
                pulse: false
            }
        case 'ready_for_pickup':
            return {
                label: 'Siap Diambil di Gudang',
                bg: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/20',
                dot: 'bg-amber-500',
                pulse: true
            }
        case 'pending_pickup':
            return {
                label: 'Sampai di Gudang (Belum Diambil)',
                bg: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/20',
                dot: 'bg-amber-500',
                pulse: true
            }
        case 'handed_over':
            return {
                label: 'Sudah Diambil Pemohon',
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                dot: 'bg-emerald-600',
                pulse: false
            }
        case 'ready_to_disburse':
            return {
                label: 'Siap Dicairkan Kasir',
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                dot: 'bg-emerald-600',
                pulse: false
            }
        case 'paid':
            return {
                label: 'Telah Dibayar (Paid)',
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                dot: 'bg-emerald-600',
                pulse: false
            }
        case 'completed':
            return {
                label: 'Selesai',
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                dot: 'bg-emerald-600',
                pulse: false
            }
        case 'partial':
        case 'partially_received':
            return {
                label: 'Diterima Sebagian',
                bg: 'bg-amber-50 text-amber-800 border-amber-200',
                dot: 'bg-amber-500',
                pulse: false
            }
        case 'revision':
        case 'revision_requested':
            return {
                label: 'Perlu Revisi',
                bg: 'bg-amber-50 text-amber-800 border-amber-200',
                dot: 'bg-amber-500',
                pulse: true
            }
        case 'rejected':
            return {
                label: 'Ditolak',
                bg: 'bg-rose-50 text-rose-800 border-rose-200',
                dot: 'bg-rose-500',
                pulse: false
            }
        case 'cancelled':
            return {
                label: 'Dibatalkan',
                bg: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                dot: 'bg-zinc-400',
                pulse: false
            }
        default:
            return {
                label: props.label || st || '-',
                bg: 'bg-slate-50 text-slate-700 border-slate-200',
                dot: 'bg-slate-400',
                pulse: false
            }
    }
})

// Variant override
const finalClasses = computed(() => {
    if (props.variant) {
        switch (props.variant) {
            case 'emerald':
                return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600' }
            case 'amber':
                return { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' }
            case 'rose':
                return { bg: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500' }
            case 'blue':
                return { bg: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-600' }
            case 'indigo':
                return { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-600' }
            case 'zinc':
            case 'slate':
                return { bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' }
        }
    }
    return badgeConfig.value
})

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'sm':
            return 'px-2.5 py-0.5 text-xs'
        case 'lg':
            return 'px-3.5 py-1.5 text-sm font-bold'
        case 'md':
        default:
            return 'px-3 py-1 text-xs sm:text-sm font-semibold'
    }
})
</script>

<template>
    <span
        :class="[
            'inline-flex items-center gap-1.5 rounded-full font-semibold border whitespace-nowrap transition-colors',
            finalClasses.bg,
            sizeClasses
        ]"
    >
        <span
            v-if="dot"
            :class="[
                'w-1.5 h-1.5 rounded-full shrink-0',
                finalClasses.dot,
                badgeConfig.pulse ? 'animate-pulse' : ''
            ]"
        ></span>

        <component
            :is="icon"
            v-if="icon"
            class="w-3.5 h-3.5 shrink-0"
        />

        <slot>
            {{ label || badgeConfig.label }}
        </slot>
    </span>
</template>
