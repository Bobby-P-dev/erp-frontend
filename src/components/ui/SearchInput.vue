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
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            type="text" 
            :placeholder="placeholder"
            class="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-gray-900 shadow-sm"
        >
    </div>
</template>
