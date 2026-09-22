<script setup>
import { computed } from 'vue'
import { 
    Check, 
    Clock, 
    X, 
    RotateCcw, 
    SkipForward, 
    Circle,
    UserCheck,
    Users
} from '@lucide/vue'

const props = defineProps({
    levels: {
        type: Array,
        default: () => [],
    },
    steps: {
        type: Array,
        default: null,
    },
    currentStepOrder: {
        type: Number,
        default: 1,
    },
    overallStatus: {
        type: String,
        default: 'pending',
    },
    orientation: {
        type: String,
        default: 'horizontal', // 'horizontal' | 'vertical'
    },
})

const effectiveLevels = computed(() => {
    if (props.steps && Array.isArray(props.steps) && props.steps.length > 0) {
        return props.steps
    }
    return props.levels || []
})

const getStepState = (level) => {
    // Jika status eksplisit ada di level
    if (level.status) {
        const s = String(level.status).toLowerCase()
        if (['approved', 'rejected', 'skipped', 'revision'].includes(s)) {
            return s
        }
    }

    // Jika overall status ditolak pada step ini
    if (props.overallStatus === 'rejected' && level.step_order === props.currentStepOrder) {
        return 'rejected'
    }

    // Jika overall status minta revisi pada step ini
    if (props.overallStatus === 'revision' && level.step_order === props.currentStepOrder) {
        return 'revision'
    }

    // Berdasarkan perbandingan step_order
    if (level.step_order < props.currentStepOrder) {
        return 'approved'
    } else if (level.step_order === props.currentStepOrder) {
        if (props.overallStatus === 'approved') return 'approved'
        return 'current'
    } else {
        return 'future'
    }
}

const getStepUI = (state) => {
    switch (state) {
        case 'approved':
            return {
                icon: Check,
                titleColor: 'text-emerald-900',
                badgeBg: 'bg-emerald-600 text-white shadow-emerald-200 ring-4 ring-emerald-50',
                lineBg: 'bg-emerald-500',
                statusText: 'Approved',
                statusClass: 'text-emerald-600 font-semibold',
            }
        case 'current':
            return {
                icon: Clock,
                titleColor: 'text-indigo-950',
                badgeBg: 'bg-indigo-600 text-white shadow-indigo-200 ring-4 ring-indigo-100 animate-pulse',
                lineBg: 'bg-gray-200',
                statusText: 'In Progress / Pending',
                statusClass: 'text-indigo-600 font-semibold',
            }
        case 'rejected':
            return {
                icon: X,
                titleColor: 'text-rose-950',
                badgeBg: 'bg-rose-600 text-white shadow-rose-200 ring-4 ring-rose-50',
                lineBg: 'bg-rose-300',
                statusText: 'Rejected',
                statusClass: 'text-rose-600 font-semibold',
            }
        case 'revision':
            return {
                icon: RotateCcw,
                titleColor: 'text-orange-950',
                badgeBg: 'bg-orange-500 text-white shadow-orange-200 ring-4 ring-orange-50',
                lineBg: 'bg-orange-300',
                statusText: 'Revision Requested',
                statusClass: 'text-orange-600 font-semibold',
            }
        case 'skipped':
            return {
                icon: SkipForward,
                titleColor: 'text-slate-500 line-through',
                badgeBg: 'bg-slate-300 text-slate-700 ring-4 ring-slate-50',
                lineBg: 'bg-slate-200',
                statusText: 'Skipped',
                statusClass: 'text-slate-400 font-medium',
            }
        case 'future':
        default:
            return {
                icon: Circle,
                titleColor: 'text-gray-500',
                badgeBg: 'bg-white text-gray-400 border-2 border-gray-300 ring-4 ring-gray-50',
                lineBg: 'bg-gray-200',
                statusText: 'Not Started',
                statusClass: 'text-gray-400 font-normal',
            }
    }
}
</script>

<template>
    <div class="w-full">
        <!-- HORIZONTAL STEPPER -->
        <div v-if="orientation === 'horizontal'" class="hidden md:flex items-start w-full relative">
            <div 
                v-for="(level, index) in effectiveLevels" 
                :key="level.id || level.step_order"
                class="flex-1 relative flex flex-col items-center text-center px-3"
            >
                <!-- Connector Line Behind Badges -->
                <div 
                    v-if="index < effectiveLevels.length - 1"
                    class="absolute top-5 left-1/2 w-full h-0.5 z-0 transition-colors duration-300"
                    :class="getStepUI(getStepState(level)).lineBg"
                ></div>

                <!-- Step Badge Icon -->
                <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-all duration-300 shadow-md"
                    :class="getStepUI(getStepState(level)).badgeBg"
                >
                    <component :is="getStepUI(getStepState(level)).icon" class="w-5 h-5" />
                </div>

                <!-- Step Content -->
                <div class="mt-3 space-y-1">
                    <div class="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                        Step {{ level.step_order }}
                    </div>
                    <div 
                        class="text-xs font-bold line-clamp-2 max-w-[160px] mx-auto leading-tight"
                        :class="getStepUI(getStepState(level)).titleColor"
                    >
                        {{ level.step_name || level.name }}
                    </div>
                    <div class="text-[11px]" :class="getStepUI(getStepState(level)).statusClass">
                        {{ getStepUI(getStepState(level)).statusText }}
                    </div>

                    <!-- Assigned / Acted Info -->
                    <div v-if="level.acted_by" class="text-[11px] text-gray-600 font-medium">
                        {{ level.acted_by }}
                    </div>
                    <div v-else-if="level.assignee_label || level.approver_name" class="text-[11px] text-gray-500 truncate max-w-[140px] mx-auto" :title="level.assignee_label || level.approver_name">
                        {{ level.assignee_label || level.approver_name }}
                    </div>

                    <!-- Mode Indicator -->
                    <div v-if="level.approval_mode === 'all'" class="inline-flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium mt-1">
                        <Users class="w-3 h-3" /> Mode: All
                    </div>
                </div>
            </div>
        </div>

        <!-- VERTICAL STEPPER (Mobile or Drawer orientation) -->
        <div :class="[orientation === 'horizontal' ? 'flex md:hidden' : 'flex', 'flex-col space-y-6 relative']">
            <div 
                v-for="(level, index) in effectiveLevels" 
                :key="level.id || level.step_order"
                class="flex items-start gap-4 relative"
            >
                <!-- Vertical Connecting Line -->
                <div 
                    v-if="index < effectiveLevels.length - 1"
                    class="absolute left-5 top-10 w-0.5 bottom-[-24px] z-0 transition-colors"
                    :class="getStepUI(getStepState(level)).lineBg"
                ></div>

                <!-- Step Badge -->
                <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 z-10 shadow-md"
                    :class="getStepUI(getStepState(level)).badgeBg"
                >
                    <component :is="getStepUI(getStepState(level)).icon" class="w-5 h-5" />
                </div>

                <!-- Step Info -->
                <div class="flex-1 bg-gray-50/80 rounded-2xl p-4 border border-gray-100 shadow-2xs">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                            Tier {{ level.step_order }}
                        </span>
                        <span class="text-xs" :class="getStepUI(getStepState(level)).statusClass">
                            {{ getStepUI(getStepState(level)).statusText }}
                        </span>
                    </div>

                    <h4 
                        class="text-sm font-bold mt-0.5"
                        :class="getStepUI(getStepState(level)).titleColor"
                    >
                        {{ level.step_name || level.name }}
                    </h4>

                    <div class="mt-2 text-xs text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span v-if="level.acted_by" class="flex items-center gap-1 font-semibold text-emerald-700">
                            <UserCheck class="w-3.5 h-3.5" /> Disetujui oleh: {{ level.acted_by }}
                        </span>
                        <span v-else-if="level.assignee_label || level.approver_name" class="text-gray-500">
                            Target Approver: <strong class="text-gray-700">{{ level.assignee_label || level.approver_name }}</strong>
                        </span>

                        <span v-if="level.sla_hours" class="text-gray-400">
                            SLA: {{ level.sla_hours }} Jam
                        </span>
                    </div>

                    <div v-if="level.approval_mode === 'all'" class="mt-2 text-[11px] text-indigo-600 bg-indigo-50/70 p-2 rounded-xl flex items-center gap-1.5 font-medium">
                        <Users class="w-3.5 h-3.5 shrink-0" />
                        Semua pejabat dalam tingkatan ini wajib memberikan persetujuan (Konsensus).
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
