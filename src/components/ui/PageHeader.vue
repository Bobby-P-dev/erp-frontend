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
        <BaseBreadcrumb v-if="showBreadcrumbs" :items="breadcrumbs" />
        <div class="bg-white p-6 sm:p-7 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
                <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3.5">
                    <div v-if="$slots.icon" class="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                        <slot name="icon"></slot>
                    </div>
                    {{ title }}
                </h1>
                <p v-if="description" class="text-base sm:text-lg text-slate-500 mt-2 font-normal leading-relaxed">{{ description }}</p>
            </div>
            <div v-if="$slots.actions || $slots.default" class="flex items-center flex-wrap gap-3 shrink-0">
                <slot name="actions"></slot>
                <slot></slot>
            </div>
        </div>
    </div>
</template>
