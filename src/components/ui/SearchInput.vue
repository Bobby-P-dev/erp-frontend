<script setup>
import { ref } from 'vue'
import { Search, X } from '@lucide/vue'

defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    placeholder: {
        type: String,
        default: 'Search...'
    },
    label: { type: String, default: 'Cari data' },
    compact: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
const inputRef = ref(null)
</script>

<template>
    <div class="relative w-full">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" :class="compact ? 'size-4' : 'size-5'" aria-hidden="true" />
        <input 
            ref="inputRef"
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            type="text" 
            :placeholder="placeholder"
            :aria-label="label"
            class="w-full rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-slate-800 placeholder:text-slate-400"
            :class="[compact ? 'pl-10 py-2.5 text-sm border border-slate-200' : 'pl-11 py-2.5 sm:py-3 text-base border border-slate-300 shadow-xs', clearable ? 'pr-10' : 'pr-4']"
        >
        <button v-if="clearable && modelValue" type="button" aria-label="Hapus pencarian" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 cursor-pointer" @click="$emit('update:modelValue', ''); inputRef?.focus()">
            <X class="size-4" aria-hidden="true" />
        </button>
    </div>
</template>
