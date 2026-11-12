<script setup>
import { ChevronDown } from '@lucide/vue'
defineProps({ title: { type: String, required: true }, description: { type: String, default: '' } })
</script>

<template>
    <details class="review-disclosure">
        <summary>
            <span class="min-w-0">
                <span class="block text-sm font-medium text-slate-800">{{ title }}</span>
                <span v-if="description" class="mt-1 block text-xs text-slate-500">{{ description }}</span>
            </span>
            <ChevronDown class="disclosure-chevron size-4 shrink-0 text-slate-400" aria-hidden="true" />
        </summary>
        <div class="disclosure-content"><slot /></div>
    </details>
</template>

<style scoped>
.review-disclosure { border: 1px solid #e2e8f0; border-radius: 12px; background: white; }
summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; cursor: pointer; list-style: none; overflow-wrap: anywhere; }
summary::-webkit-details-marker { display: none; }
summary:focus-visible { outline: 2px solid #014baa; outline-offset: -2px; border-radius: 12px; }
details[open] > summary .disclosure-chevron { transform: rotate(180deg); }
.disclosure-content { padding: 0 20px 20px; min-width: 0; }
@media (max-width: 640px) { summary { padding: 16px; } .disclosure-content { padding: 0 16px 16px; } }
</style>
