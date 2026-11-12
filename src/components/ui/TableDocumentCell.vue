<script setup>
import { ArrowUpRight } from '@lucide/vue'

defineProps({
    number: { type: String, default: '' },
    description: { type: String, default: '' },
    kind: { type: String, default: '' },
})
defineEmits(['open'])
</script>

<template>
    <div class="min-w-0">
        <button type="button" class="document-link group/document inline-flex max-w-full items-center gap-1.5 text-left text-sm font-semibold text-[#014BAA] hover:text-blue-800 cursor-pointer" @click="$emit('open')">
            <span class="truncate group-hover/document:underline">{{ number || 'Lihat dokumen' }}</span>
            <ArrowUpRight class="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
        <p v-if="description" class="mt-1 truncate text-sm text-slate-500" :title="description">{{ description }}</p>
        <p v-if="kind" class="mt-1 text-xs text-slate-400">{{ kind }}</p>
    </div>
</template>

<style scoped>
.document-link:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; border-radius: 4px; }
</style>
