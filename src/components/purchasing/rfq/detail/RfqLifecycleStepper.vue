<script setup>
import { Check } from '@lucide/vue'
import ReviewDisclosure from '@/components/ui/ReviewDisclosure.vue'

defineProps({
    rfq: {
        type: Object,
        required: true,
    },
    steps: {
        type: Array,
        required: true,
    },
    deadlineInfo: {
        type: Object,
        default: null,
    },
    getStepState: {
        type: Function,
        required: true,
    },
})
</script>

<template>
    <ReviewDisclosure v-if="rfq.status !== 'cancelled'" title="Alur tender" description="Lihat tahapan penyusunan, undangan, evaluasi, dan penetapan pemenang">
        <ol class="grid gap-5 pt-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tahapan tender">
            <li v-for="(step, idx) in steps" :key="step.key" class="flex items-start gap-3" :aria-current="getStepState(idx) === 'active' ? 'step' : undefined">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-full text-sm" :class="getStepState(idx) === 'completed' ? 'bg-emerald-50 text-emerald-800' : getStepState(idx) === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'">
                    <Check v-if="getStepState(idx) === 'completed'" class="size-4" /><span v-else>{{ idx + 1 }}</span>
                </span>
                <div class="min-w-0 text-sm">
                    <p class="font-medium text-slate-900">{{ step.label }}</p>
                    <p class="mt-1 text-slate-500">{{ getStepState(idx) === 'completed' ? 'Selesai' : getStepState(idx) === 'active' ? 'Sedang berjalan' : 'Menunggu' }}</p>
                    <p class="mt-2 text-slate-600">{{ step.meta }}</p>
                </div>
            </li>
        </ol>
    </ReviewDisclosure>
</template>
