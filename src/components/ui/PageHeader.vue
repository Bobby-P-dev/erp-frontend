<script setup>
import BaseBreadcrumb from './BaseBreadcrumb.vue'

defineProps({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    subtitle: {
        type: String,
        default: ''
    },
    breadcrumbs: {
        type: Array,
        default: null
    },
    showBreadcrumbs: {
        type: Boolean,
        default: true
    }
})
</script>

<template>
    <div class="flex flex-col gap-3.5">
        <slot v-if="$slots.breadcrumbs" name="breadcrumbs"></slot>
        <BaseBreadcrumb v-else-if="showBreadcrumbs" :items="breadcrumbs" />
        <div class="bg-white p-5 sm:p-6 rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <div v-if="$slots.icon" class="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 shrink-0">
                        <slot name="icon"></slot>
                    </div>
                    {{ title }}
                </h1>
                <p v-if="description || subtitle" class="text-xs sm:text-sm text-slate-500 mt-1.5 font-normal leading-relaxed">{{ description || subtitle }}</p>
            </div>
            <div v-if="$slots.actions || $slots.default" class="flex items-center flex-wrap gap-2.5 shrink-0">
                <slot name="actions"></slot>
                <slot></slot>
            </div>
        </div>
    </div>
</template>
