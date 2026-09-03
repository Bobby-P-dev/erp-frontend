<script setup>
defineProps({
    modelValue: {
        type: [String, Number],
        default: ''
    },
    label: {
        type: String,
        required: true
    },
    options: {
        type: Array,
        required: true,
        // format: [{ value: 1, label: 'Option 1' }]
    },
    placeholder: {
        type: String,
        default: 'Select an option'
    },
    required: {
        type: Boolean,
        default: false
    }
})

defineEmits(['update:modelValue'])
</script>

<template>
    <div class="relative">
        <label v-if="label" class="block text-sm font-bold text-gray-700 mb-1.5">
            {{ label }} <span v-if="required" class="text-rose-500">*</span>
        </label>
        <div class="relative">
            <select 
                :value="modelValue"
                @change="$emit('update:modelValue', $event.target.value)"
                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-gray-900 appearance-none cursor-pointer"
            >
                <option value="" disabled>{{ placeholder }}</option>
                <option v-for="option in options" :key="option.value" :value="option.value">
                    {{ option.label }}
                </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </div>
        </div>
    </div>
</template>
