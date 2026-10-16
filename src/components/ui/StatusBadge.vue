<script setup>
import { computed } from 'vue'
import {
    Check,
    Clock,
    X,
    RotateCcw,
    FileText,
    CheckCheck,
    Package,
    ShoppingBag,
    Wallet,
    Search,
    Minus,
    Pause,
    Ban,
    ArrowDown,
    CircleDot,
    Info,
    HelpCircle
} from '@lucide/vue'

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
     * Explicit color variant override ('emerald', 'amber', 'rose', 'blue', 'slate', 'zinc', 'indigo', 'purple', 'teal').
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
     * Whether to show the circular icon indicator.
     */
    dot: {
        type: Boolean,
        default: true
    },
    /**
     * Optional icon component override to display inside the left circular badge.
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
    // 1. If legacy isActive boolean prop is supplied (Master Data)
    if (props.isActive !== null && props.isActive !== undefined) {
        const active = Boolean(props.isActive)
        return {
            label: active ? 'Aktif' : 'Nonaktif',
            bg: active
                ? 'bg-[#E8F8EE] text-[#1B5E20] border-[#1B5E20]/15'
                : 'bg-[#F1F5F9] text-[#475569] border-[#475569]/15',
            iconBg: active ? 'bg-[#1B5E20]' : 'bg-[#475569]',
            icon: active ? Check : Minus
        }
    }

    // 2. Check if custom label specifically indicates unstarted or waiting queue
    if (props.label) {
        const lbl = String(props.label).toLowerCase().trim()
        if (lbl.includes('belum') || lbl.includes('antrean') || lbl.includes('antri') || lbl.includes('menunggu pengiriman')) {
            return {
                label: props.label,
                bg: 'bg-[#F1F5F9] text-[#475569] border-[#475569]/15',
                iconBg: 'bg-[#475569]',
                icon: Clock
            }
        }
        if (lbl.includes('ditinjau') || lbl.includes('in review') || lbl.includes('sedang')) {
            return {
                label: props.label,
                bg: 'bg-[#E8F1FD] text-[#014BAA] border-[#014BAA]/15',
                iconBg: 'bg-[#014BAA]',
                icon: Clock
            }
        }
    }

    // 3. If status string is supplied
    const st = rawStatus.value
    switch (st) {
        case 'draft':
            return {
                label: 'Draft',
                bg: 'bg-[#F1F5F9] text-[#475569] border-[#475569]/15',
                iconBg: 'bg-[#475569]',
                icon: FileText
            }
        case 'pending':
        case 'pending_approval':
            return {
                label: 'Menunggu Approval',
                bg: 'bg-[#FEF3E2] text-[#B45309] border-[#B45309]/15',
                iconBg: 'bg-[#B45309]',
                icon: Clock
            }
        case 'waiting':
        case 'queue':
        case 'menunggu_antrean':
        case 'menunggu_giliran':
        case 'belum_dimulai':
        case 'not_started':
        case 'unstarted':
        case 'belum_ada_tagihan':
        case 'menunggu_pengiriman':
        case 'belum_diserahkan':
            return {
                label: props.label || 'Menunggu Antrean',
                bg: 'bg-[#F1F5F9] text-[#475569] border-[#475569]/15',
                iconBg: 'bg-[#475569]',
                icon: Clock
            }
        case 'in_progress':
        case 'in_review':
        case 'review':
        case 'sedang_ditinjau':
        case 'berjalan':
            return {
                label: 'Sedang Ditinjau',
                bg: 'bg-[#E8F1FD] text-[#014BAA] border-[#014BAA]/15',
                iconBg: 'bg-[#014BAA]',
                icon: Clock
            }
        case 'approved':
        case 'disetujui':
            return {
                label: 'Disetujui',
                bg: 'bg-[#E8F8EE] text-[#1B5E20] border-[#1B5E20]/15',
                iconBg: 'bg-[#1B5E20]',
                icon: Check
            }
        case 'ready_for_payment':
            return {
                label: 'Siap Dibayar',
                bg: 'bg-[#E8F1FD] text-[#014BAA] border-[#014BAA]/15',
                iconBg: 'bg-[#014BAA]',
                icon: Wallet
            }
        case 'ready_to_disburse':
            return {
                label: 'Siap Dicairkan Kasir',
                bg: 'bg-[#E0F2FE] text-[#0369A1] border-[#0369A1]/15',
                iconBg: 'bg-[#0369A1]',
                icon: Wallet
            }
        case 'paid':
        case 'telah_dibayar':
            return {
                label: 'Telah Dibayar',
                bg: 'bg-[#E8F8EE] text-[#1B5E20] border-[#1B5E20]/15',
                iconBg: 'bg-[#1B5E20]',
                icon: Check
            }
        case 'in_procurement':
        case 'procurement':
        case 'proses_pengadaan':
        case 'dalam_pengadaan':
            return {
                label: 'Dalam Pengadaan',
                bg: 'bg-[#E8F1FD] text-[#014BAA] border-[#014BAA]/15',
                iconBg: 'bg-[#014BAA]',
                icon: ShoppingBag
            }
        case 'ready_for_pickup':
            return {
                label: 'Siap Diambil',
                bg: 'bg-[#FEF3E2] text-[#B45309] border-[#B45309]/15',
                iconBg: 'bg-[#B45309]',
                icon: Package
            }
        case 'pending_pickup':
            return {
                label: 'Sampai di Gudang (Belum Diambil)',
                bg: 'bg-[#FEF3E2] text-[#B45309] border-[#B45309]/15',
                iconBg: 'bg-[#B45309]',
                icon: Package
            }
        case 'handed_over':
            return {
                label: 'Sudah Diambil Pemohon',
                bg: 'bg-[#E8F8EE] text-[#1B5E20] border-[#1B5E20]/15',
                iconBg: 'bg-[#1B5E20]',
                icon: CheckCheck
            }
        case 'completed':
        case 'selesai':
        case 'selesai_diajukan':
        case 'done':
            return {
                label: 'Selesai',
                bg: 'bg-[#E8F8EE] text-[#1B5E20] border-[#1B5E20]/15',
                iconBg: 'bg-[#1B5E20]',
                icon: Check
            }
        case 'partial':
        case 'partially_received':
            return {
                label: 'Diterima Sebagian',
                bg: 'bg-[#FEF3E2] text-[#B45309] border-[#B45309]/15',
                iconBg: 'bg-[#B45309]',
                icon: Clock
            }
        case 'revision':
        case 'revision_requested':
        case 'request_revision':
            return {
                label: 'Perlu Revisi',
                bg: 'bg-[#FFF1E6] text-[#C2410C] border-[#C2410C]/15',
                iconBg: 'bg-[#C2410C]',
                icon: RotateCcw
            }
        case 'rejected':
        case 'ditolak':
        case 'blocked':
            return {
                label: 'Ditolak',
                bg: 'bg-[#FDE8E8] text-[#991B1B] border-[#991B1B]/15',
                iconBg: 'bg-[#991B1B]',
                icon: X
            }
        case 'hold':
        case 'on_hold':
        case 'suspended':
            return {
                label: 'Ditahan (Hold)',
                bg: 'bg-[#FFEDD5] text-[#9A3412] border-[#9A3412]/15',
                iconBg: 'bg-[#9A3412]',
                icon: Pause
            }
        case 'cancelled':
        case 'dibatalkan':
            return {
                label: 'Dibatalkan',
                bg: 'bg-[#F1F5F9] text-[#475569] border-[#475569]/15',
                iconBg: 'bg-[#475569]',
                icon: Ban
            }
        case 'archived':
            return {
                label: 'Diarsipkan',
                bg: 'bg-[#E0F2FE] text-[#0369A1] border-[#0369A1]/15',
                iconBg: 'bg-[#0369A1]',
                icon: ArrowDown
            }
        case 'todo':
        case 'to_do':
            return {
                label: 'To-do',
                bg: 'bg-[#E6FFFA] text-[#0F766E] border-[#0F766E]/15',
                iconBg: 'bg-[#0F766E]',
                icon: CircleDot
            }
        default: {
            const fallbackLabel = props.label || (st ? st.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-')
            return {
                label: fallbackLabel,
                bg: 'bg-[#F1F5F9] text-[#475569] border-[#475569]/15',
                iconBg: 'bg-[#475569]',
                icon: Info
            }
        }
    }
})

// Variant override
const finalClasses = computed(() => {
    if (props.variant) {
        switch (props.variant) {
            case 'emerald':
                return {
                    ...badgeConfig.value,
                    bg: 'bg-[#E8F8EE] text-[#1B5E20] border-[#1B5E20]/15',
                    iconBg: 'bg-[#1B5E20]',
                    icon: badgeConfig.value.icon || Check
                }
            case 'amber':
                return {
                    ...badgeConfig.value,
                    bg: 'bg-[#FEF3E2] text-[#B45309] border-[#B45309]/15',
                    iconBg: 'bg-[#B45309]',
                    icon: badgeConfig.value.icon || Clock
                }
            case 'rose':
                return {
                    ...badgeConfig.value,
                    bg: 'bg-[#FDE8E8] text-[#991B1B] border-[#991B1B]/15',
                    iconBg: 'bg-[#991B1B]',
                    icon: badgeConfig.value.icon || X
                }
            case 'blue':
                return {
                    ...badgeConfig.value,
                    bg: 'bg-[#E8F1FD] text-[#014BAA] border-[#014BAA]/15',
                    iconBg: 'bg-[#014BAA]',
                    icon: badgeConfig.value.icon || Search
                }
            case 'purple':
            case 'indigo':
                return {
                    ...badgeConfig.value,
                    bg: 'bg-[#F3E8FF] text-[#6B21A8] border-[#6B21A8]/15',
                    iconBg: 'bg-[#6B21A8]',
                    icon: badgeConfig.value.icon || CircleDot
                }
            case 'teal':
                return {
                    ...badgeConfig.value,
                    bg: 'bg-[#E6FFFA] text-[#0F766E] border-[#0F766E]/15',
                    iconBg: 'bg-[#0F766E]',
                    icon: badgeConfig.value.icon || CircleDot
                }
            case 'zinc':
            case 'slate':
                return {
                    ...badgeConfig.value,
                    bg: 'bg-[#F1F5F9] text-[#475569] border-[#475569]/15',
                    iconBg: 'bg-[#475569]',
                    icon: badgeConfig.value.icon || FileText
                }
        }
    }
    return badgeConfig.value
})

const activeIcon = computed(() => {
    return props.icon || finalClasses.value.icon || Check
})

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'lg':
            return {
                badge: 'pl-2 pr-4 py-1.5 text-sm font-bold gap-2 min-h-[32px] leading-none',
                circle: 'w-5 h-5',
                icon: 'w-3 h-3 stroke-[2.75]'
            }
        case 'md':
            return {
                badge: 'pl-1.5 pr-3.5 py-1.5 text-xs sm:text-sm font-bold gap-2 min-h-[30px] leading-none',
                circle: 'w-5 h-5',
                icon: 'w-3 h-3 stroke-[2.75]'
            }
        case 'sm':
        default:
            return {
                badge: 'pl-1.5 pr-3 py-1 text-xs font-bold gap-1.5 min-h-[26px] leading-none',
                circle: 'w-4 h-4',
                icon: 'w-2.5 h-2.5 stroke-[2.75]'
            }
    }
})
</script>

<template>
    <span
        :class="[
            'inline-flex items-center justify-center rounded-full border whitespace-nowrap transition-colors select-none tracking-tight shadow-2xs',
            finalClasses.bg,
            sizeClasses.badge
        ]"
    >
        <!-- Circular Icon Indicator on the Left (Matching Reference Design) -->
        <span
            v-if="dot"
            :class="[
                'rounded-full flex items-center justify-center shrink-0 text-white shadow-2xs',
                finalClasses.iconBg,
                sizeClasses.circle
            ]"
        >
            <component
                :is="activeIcon"
                :class="sizeClasses.icon"
            />
        </span>

        <!-- Badge Label -->
        <span class="leading-none pt-0.5">
            <slot>
                {{ label || finalClasses.label }}
            </slot>
        </span>
    </span>
</template>
