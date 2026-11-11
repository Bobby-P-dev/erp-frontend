<script setup>
import BaseModal from '../../../ui/BaseModal.vue'
import BaseButton from '../../../ui/BaseButton.vue'
import { Layers, FileText } from '@lucide/vue'

defineProps({
    modelValue: { type: Boolean, default: false },
    plan: { type: Object, default: null },
    prCount: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'open-detail'])
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
        :title="`Dokumen PR Asal (${prCount} Dokumen)`"
        :subtitle="`Rencana Pengadaan: ${plan?.pp_number || '-'}`"
        :icon="Layers"
        size="lg"
        :show-backdrop="true"
        @close="emit('update:modelValue', false)"
    >
        <div v-if="plan" class="space-y-4">
            <!-- Summary Banner -->
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                    <span class="text-slate-500">Metode Pengadaan:</span>
                    <span class="font-bold text-slate-800 ml-1.5 uppercase font-mono">{{ plan.procurement_method }}</span>
                </div>
                <div>
                    <span class="text-slate-500">Total Item Rencana:</span>
                    <span class="font-bold text-blue-600 ml-1.5">{{ plan.items?.length || plan.items_count || 0 }} Item</span>
                </div>
            </div>

            <!-- List of PRs -->
            <div class="space-y-3">
                <div 
                    v-for="(pr, pIdx) in (plan.source_prs || [])" 
                    :key="pr.id || pIdx"
                    class="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all space-y-2.5"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="font-mono font-bold text-blue-700 text-sm flex items-center gap-1.5">
                                <FileText class="w-4 h-4 text-blue-500" />
                                {{ pr.pr_number }}
                            </span>
                            <span v-if="pr.items_count" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {{ pr.items_count }} Item Dialokasikan
                            </span>
                        </div>
                        <span v-if="pr.division_name" class="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {{ pr.division_name }}
                        </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 text-slate-600">
                        <div>
                            <span class="text-slate-400">Pemohon:</span>
                            <span class="font-medium text-slate-800 ml-1">{{ pr.requester_name || '-' }}</span>
                        </div>
                        <div>
                            <span class="text-slate-400">Perusahaan:</span>
                            <span class="font-medium text-slate-800 ml-1">{{ pr.company_name || '-' }}</span>
                        </div>
                    </div>

                    <div v-if="pr.purpose" class="text-xs text-slate-500 bg-slate-50/80 p-2 rounded-lg italic">
                        "{{ pr.purpose }}"
                    </div>
                </div>

                <!-- Fallback if source_prs is empty but pr_numbers has values -->
                <div 
                    v-if="(!plan.source_prs || plan.source_prs.length === 0) && plan.pr_numbers?.length > 0"
                    class="space-y-2"
                >
                    <div 
                        v-for="prNo in plan.pr_numbers" 
                        :key="prNo"
                        class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                        <span class="font-mono font-bold text-blue-600 flex items-center gap-1.5">
                            <FileText class="w-3.5 h-3.5 text-blue-500" />
                            {{ prNo }}
                        </span>
                        <span class="text-slate-500">Dokumen PR Terkait</span>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <BaseButton
                variant="outline"
                size="sm"
                @click="emit('update:modelValue', false)"
            >
                Tutup
            </BaseButton>
            <BaseButton
                v-if="plan"
                variant="primary"
                size="sm"
                @click="emit('open-detail', plan)"
            >
                Buka Detail Rencana
            </BaseButton>
        </template>
    </BaseModal>
</template>
