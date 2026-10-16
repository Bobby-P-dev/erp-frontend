<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
    variant: {
        type: String,
        default: 'primary'
    },
    size: {
        type: String,
        default: 'md'
    },
    disabled: {
        type: Boolean,
        default: false
    },
    class: {
        type: [String, Object, Array],
        default: ''
    }
})

const variantClasses = computed(() => {
    switch (props.variant) {
        case 'primary':
            return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-md shadow-blue-200'
        case 'secondary':
            return 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-300 shadow-xs'
        case 'danger':
            return 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-md shadow-rose-200'
        case 'outline':
            return 'bg-transparent text-blue-600 border-2 border-blue-600 hover:bg-blue-50 focus:ring-blue-500'
        case 'ghost':
            return 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        default:
            return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
    }
})

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'xs':
            return 'px-2.5 py-1 text-xs'
        case 'sm':
            return 'px-4 py-2 text-sm'
        case 'lg':
            return 'px-6 py-3.5 sm:py-4 text-base sm:text-lg'
        case 'icon':
            return 'p-2'
        case 'md':
        default:
            return 'px-5 py-2.5 sm:py-3 text-base'
    }
})
</script>

<template>
    <button 
        :disabled="disabled"
        :class="cn(
            'inline-flex items-center justify-center gap-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]',
            sizeClasses,
            variantClasses,
            props.class
        )"
    >
        <slot></slot>
    </button>
</template>
