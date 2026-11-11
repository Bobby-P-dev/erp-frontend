<script setup>
import { RouterLink } from 'vue-router'
import { Clock, CheckCircle2, Check } from '@lucide/vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

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
    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-600">Alur Tahapan Tender</span>
                <StatusBadge :status="rfq.status" />
            </div>
            <div v-if="deadlineInfo && rfq.status !== 'completed' && rfq.status !== 'cancelled'" class="flex items-center gap-1.5">
                <Clock class="w-4 h-4 text-slate-500" />
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full border" :class="deadlineInfo.color">
                    Batas Penawaran: {{ deadlineInfo.label }}
                </span>
            </div>
            <div v-else-if="rfq.status === 'completed'" class="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                <span>Seluruh tahapan tender telah selesai dilaksanakan</span>
            </div>
        </div>

        <div v-if="rfq.status !== 'cancelled'" class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div 
                v-for="(step, idx) in steps" 
                :key="step.key"
                class="relative rounded-xl border p-4 transition-all flex flex-col justify-between"
                :class="[
                    getStepState(idx) === 'completed'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : getStepState(idx) === 'active'
                            ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-100 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200'
                ]"
            >
                <div>
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <div class="flex items-center gap-2">
                            <div 
                                class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                                :class="[
                                    getStepState(idx) === 'completed'
                                        ? 'bg-emerald-600 text-white'
                                        : getStepState(idx) === 'active'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-200 text-slate-600'
                                ]"
                            >
                                <Check v-if="getStepState(idx) === 'completed'" class="w-4 h-4 stroke-[2.5]" />
                                <span v-else>{{ idx + 1 }}</span>
                            </div>
                            <span 
                                class="text-xs font-bold uppercase tracking-wider"
                                :class="[
                                    getStepState(idx) === 'completed'
                                        ? 'text-emerald-800'
                                        : getStepState(idx) === 'active'
                                            ? 'text-blue-800'
                                            : 'text-slate-500'
                                ]"
                            >
                                Tahap {{ idx + 1 }}
                            </span>
                        </div>

                        <span 
                            class="text-[11px] font-semibold px-2 py-0.5 rounded border"
                            :class="[
                                getStepState(idx) === 'completed'
                                    ? 'bg-emerald-100/80 text-emerald-800 border-emerald-200'
                                    : getStepState(idx) === 'active'
                                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                                        : 'bg-white text-slate-500 border-slate-200'
                            ]"
                        >
                            {{ getStepState(idx) === 'completed' ? 'Selesai' : getStepState(idx) === 'active' ? 'Sedang Berjalan' : 'Menunggu' }}
                        </span>
                    </div>

                    <h4 
                        class="text-sm font-bold"
                        :class="getStepState(idx) === 'upcoming' ? 'text-slate-500' : 'text-slate-900'"
                    >
                        {{ step.label }}
                    </h4>
                    <p class="text-xs text-slate-600 mt-1 leading-relaxed">
                        {{ step.description }}
                    </p>
                </div>

                <div 
                    class="mt-3 pt-2.5 border-t text-xs font-medium flex items-center justify-between"
                    :class="[
                        getStepState(idx) === 'completed'
                            ? 'border-emerald-200/70 text-emerald-900'
                            : getStepState(idx) === 'active'
                                ? 'border-blue-200 text-blue-900'
                                : 'border-slate-200/80 text-slate-500'
                    ]"
                >
                    <span>{{ step.meta }}</span>
                    <RouterLink
                        v-if="step.key === 'completed' && rfq.status === 'completed'"
                        :to="{ name: 'user.purchasing.rfq.comparison', params: { id: rfq.id } }"
                        class="text-emerald-700 hover:text-emerald-900 font-bold underline underline-offset-2"
                    >
                        Lihat Hasil
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>
</template>
