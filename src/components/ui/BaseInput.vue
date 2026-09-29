<script setup>
defineProps({
    modelValue: {
        type: [String, Number],
        default: ''
    },
    label: {
        type: String,
        default: ''
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
    },
    disabled: {
        type: Boolean,
        default: false
    },
    error: {
        type: String,
        default: ''
    },
    min: {
        type: [String, Number],
        default: undefined
    },
    max: {
        type: [String, Number],
        default: undefined
    },
    step: {
        type: [String, Number],
        default: undefined
    }
})

defineEmits(['update:modelValue'])
</script>

<template>
    <div class="w-full">
        <label v-if="label" class="block text-base font-bold text-slate-700 mb-2">
            {{ label }} <span v-if="required" class="text-rose-500">*</span>
        </label>
        <div class="relative">
            <input 
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value)"
                :type="type" 
                :placeholder="placeholder"
                :disabled="disabled"
                :min="min"
                :max="max"
                :step="step"
                class="w-full px-4 py-3 sm:py-3.5 bg-slate-50 border rounded-xl text-base transition-all font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white"
                :class="[
                    disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : '',
                    error 
                        ? 'border-rose-300 ring-1 ring-rose-400 bg-rose-50/20 text-rose-900 focus:ring-2 focus:ring-rose-400/50 focus:border-rose-500' 
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
                ]"
            >
        </div>
        <p v-if="error" class="text-sm text-rose-600 mt-1.5 font-medium">
            {{ error }}
        </p>
    </div>
</template>

