<script setup>
import { Check } from '@lucide/vue'

defineProps({
    stepMeta: {
        type: Array,
        required: true,
    },
    currentStep: {
        type: Number,
        required: true,
    },
})

defineEmits(['go-to-step'])
</script>

<template>
    <nav aria-label="Tahapan Pembuatan PR" class="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs">
        <ol class="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-5">
            <li v-for="(step, sIdx) in stepMeta" :key="step.no" class="flex-1 flex items-center">
                <button
                    type="button"
                    @click="$emit('go-to-step', step.no)"
                    class="flex items-center gap-3.5 text-left w-full group cursor-pointer"
                >
                    <span
                        :class="[
                            'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold shrink-0 transition-colors',
                            currentStep > step.no
                                ? 'bg-[#EEF4FC] text-[#177245] border-2 border-[#177245]/30'
                                : (currentStep === step.no
                                    ? 'bg-[#014BAA] text-white shadow-sm ring-4 ring-[#014BAA]/15'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200')
                        ]"
                    >
                        <Check v-if="currentStep > step.no" class="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                        <span v-else>{{ step.no }}</span>
                    </span>
                    <div class="min-w-0">
                        <span
                            :class="[
                                'block text-sm sm:text-base font-bold leading-tight truncate',
                                currentStep === step.no ? 'text-[#014BAA]' : (currentStep > step.no ? 'text-slate-900' : 'text-slate-500')
                            ]"
                        >
                            {{ step.title }}
                        </span>
                        <span class="block text-xs sm:text-sm text-slate-500 leading-tight truncate mt-1">
                            {{ step.desc }}
                        </span>
                    </div>
                </button>
                <div v-if="sIdx < stepMeta.length - 1" class="hidden md:block w-8 lg:w-16 h-0.5 bg-slate-200 mx-3 shrink-0"></div>
            </li>
        </ol>
    </nav>
</template>
