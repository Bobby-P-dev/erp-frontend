<script setup>
import { Search } from '@lucide/vue'

defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    placeholder: {
        type: String,
        default: 'Search...'
    }
})

defineEmits(['update:modelValue'])
</script>

<template>
    <div class="relative w-full">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            type="text" 
            :placeholder="placeholder"
            class="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 shadow-xs"
        >
    </div>
</template>
