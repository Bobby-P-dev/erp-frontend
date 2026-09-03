<script setup>
defineProps({
    variant: {
        type: String,
        default: 'primary'
    }
})
</script>

<template>
    <button 
        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all hover:-translate-y-0.5"
        :class="{
            'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-md shadow-indigo-200': variant === 'primary',
            'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200 shadow-sm': variant === 'secondary',
            'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-md shadow-rose-200': variant === 'danger'
        }"
    >
        <slot></slot>
    </button>
</template>
