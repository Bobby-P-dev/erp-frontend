<script setup>
import { computed } from 'vue'

const props = defineProps({
    title: {
        type: String,
        required: true
    },
    value: {
        type: [Number, String],
        default: 0
    },
    unit: {
        type: String,
        default: ''
    },
    icon: {
        type: [Object, Function],
        default: null
    },
    variant: {
        type: String,
        default: 'blue',
        validator: (v) => ['blue', 'emerald', 'amber', 'rose', 'slate', 'indigo'].includes(v)
    },
    active: {
        type: Boolean,
        default: false
    },
    clickable: {
        type: Boolean,
        default: false
    }
})

defineEmits(['click'])

const variantStyles = computed(() => {
    switch (props.variant) {
        case 'emerald':
            return {
                iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                valueText: 'text-emerald-700',
                borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20'
            }
        case 'amber':
            return {
                iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
                valueText: 'text-amber-800',
                borderActive: 'border-amber-500 ring-2 ring-amber-500/20'
            }
        case 'rose':
            return {
                iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
                valueText: 'text-rose-700',
                borderActive: 'border-rose-500 ring-2 ring-rose-500/20'
            }
        case 'indigo':
            return {
                iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                valueText: 'text-indigo-700',
                borderActive: 'border-indigo-500 ring-2 ring-indigo-500/20'
            }
        case 'slate':
            return {
                iconBg: 'bg-slate-50 text-slate-700 border-slate-200',
                valueText: 'text-slate-900',
                borderActive: 'border-slate-500 ring-2 ring-slate-500/20'
            }
        case 'blue':
        default:
            return {
                iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
                valueText: 'text-blue-700',
                borderActive: 'border-blue-500 ring-2 ring-blue-500/20'
            }
    }
})
</script>

<template>
    <div
        :class="[
            'bg-white border rounded-xl p-4.5 shadow-2xs flex items-center gap-4 transition-all duration-150',
            active ? variantStyles.borderActive : 'border-slate-200/80',
            clickable ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs hover:-translate-y-0.5' : ''
        ]"
        @click="clickable ? $emit('click') : null"
    >
        <div
            v-if="icon"
            :class="[
                'w-11 h-11 rounded-lg flex items-center justify-center border shrink-0',
                variantStyles.iconBg
            ]"
        >
            <component :is="icon" class="w-5 h-5" />
        </div>

        <div class="min-w-0 flex-1">
            <p class="text-xs sm:text-sm font-medium text-slate-500 truncate">
                {{ title }}
            </p>
            <div class="flex items-baseline gap-1.5 mt-0.5">
                <span :class="['text-xl sm:text-2xl font-bold tracking-tight', variantStyles.valueText]">
                    <slot name="value">{{ value }}</slot>
                </span>
                <span v-if="unit" class="text-xs sm:text-sm font-normal text-slate-400 truncate">
                    {{ unit }}
                </span>
            </div>
        </div>
    </div>
</template>
