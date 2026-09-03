<script setup>
defineProps({
    isActive: {
        type: [Boolean, Number],
        required: true
    }
})
</script>

<template>
    <span 
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border"
        :class="isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
    >
        <span class="w-2 h-2 rounded-full" :class="isActive ? 'bg-emerald-500' : 'bg-rose-500'"></span>
        {{ isActive ? 'Active' : 'Inactive' }}
    </span>
</template>
