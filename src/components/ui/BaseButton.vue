<script setup>
defineProps({
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
    }
})
</script>

<template>
    <button 
        :disabled="disabled"
        class="inline-flex items-center justify-center gap-2.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]"
        :class="[
            size === 'sm' ? 'px-4 py-2 text-sm' : (size === 'lg' ? 'px-6 py-3.5 sm:py-4 text-base sm:text-lg' : 'px-5 py-2.5 sm:py-3 text-base'),
            {
                'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-md shadow-blue-200': variant === 'primary',
                'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-300 shadow-xs': variant === 'secondary',
                'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-md shadow-rose-200': variant === 'danger',
                'bg-transparent text-blue-600 border-2 border-blue-600 hover:bg-blue-50 focus:ring-blue-500': variant === 'outline'
            }
        ]"
    >
        <slot></slot>
    </button>
</template>
