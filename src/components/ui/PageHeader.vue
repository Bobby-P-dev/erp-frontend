<script setup>
defineProps({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    }
})
</script>

<template>
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div class="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                <slot name="icon"></slot>
            </div>
            {{ title }}
        </h1>
        <p v-if="description" class="text-base text-gray-500 mt-2">{{ description }}</p>
    </div>
</template>
