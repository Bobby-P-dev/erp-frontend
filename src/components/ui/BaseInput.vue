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
    type: {
        type: String,
        default: 'text'
    },
    placeholder: {
        type: String,
        default: ''
    },
    required: {
        type: Boolean,
        default: false
    }
})

defineEmits(['update:modelValue'])
</script>

<template>
    <div>
        <label v-if="label" class="block text-sm font-bold text-gray-700 mb-1.5">
            {{ label }} <span v-if="required" class="text-rose-500">*</span>
        </label>
        <input 
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            :type="type" 
            :placeholder="placeholder"
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-gray-900"
        >
    </div>
</template>
