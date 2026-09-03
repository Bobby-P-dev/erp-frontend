<script setup>
defineProps({
    modelValue: {
        type: [Boolean, Number],
        default: true
    },
    labelActive: {
        type: String,
        default: 'Active'
    },
    labelInactive: {
        type: String,
        default: 'Inactive'
    }
})

defineEmits(['update:modelValue'])
</script>

<template>
    <div class="flex items-center gap-3 h-[42px]">
        <button 
            type="button"
            @click="$emit('update:modelValue', !modelValue)"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            :class="modelValue ? 'bg-indigo-600' : 'bg-gray-200'"
        >
            <span class="sr-only">Toggle</span>
            <span 
                class="pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
            ></span>
        </button>
        <span class="text-sm font-bold" :class="modelValue ? 'text-indigo-600' : 'text-gray-500'">
            {{ modelValue ? labelActive : labelInactive }}
        </span>
    </div>
</template>
