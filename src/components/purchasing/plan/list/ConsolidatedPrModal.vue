<script setup>
import BaseModal from '../../../ui/BaseModal.vue'
import { computed } from 'vue'
import { ArrowRight } from '@lucide/vue'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    plan: { type: Object, default: null },
    prCount: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'open-detail'])
const methodLabel = computed(() => ({ direct_purchase: 'Pembelian langsung', rfq: 'Tender RFQ' })[props.plan?.procurement_method] || 'Belum ditentukan')
const sourcePrs = computed(() => props.plan?.source_prs?.length
    ? props.plan.source_prs
    : (props.plan?.pr_numbers || []).map(pr_number => ({ pr_number })))
const openDetail = () => {
    emit('update:modelValue', false)
    emit('open-detail', props.plan)
}
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
        size="2xl"
        body-class="p-5 sm:p-6"
        @close="emit('update:modelValue', false)"
    >
        <template #header>
            <div class="min-w-0">
                <h2 class="text-base font-semibold tracking-tight text-slate-900">PR sumber</h2>
                <p class="mt-1 text-xs text-slate-500 break-words">{{ plan?.pp_number || 'Rencana pengadaan' }}</p>
            </div>
        </template>

        <div v-if="plan" class="source-prs min-w-0">
            <div class="mb-6">
                <p class="text-sm leading-relaxed text-slate-600">Rencana ini menggabungkan kebutuhan dari <span class="font-medium text-slate-900">{{ prCount }} dokumen PR</span>.</p>
                <dl class="mt-5 grid grid-cols-2 gap-4 border-b border-slate-100 pb-5">
                    <div><dt>Metode pengadaan</dt><dd>{{ methodLabel }}</dd></div>
                    <div><dt>Barang dalam rencana</dt><dd>{{ plan.items_count ?? plan.items?.length ?? 0 }} item</dd></div>
                </dl>
            </div>

            <ol v-if="sourcePrs.length" class="divide-y divide-slate-100" aria-label="Dokumen PR sumber">
                <li v-for="(pr, index) in sourcePrs" :key="pr.id || pr.pr_number || index" class="py-5 first:pt-0 last:pb-0">
                    <article>
                        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                            <h3 class="text-sm font-semibold text-slate-900 break-words">{{ pr.pr_number || 'Nomor PR belum tersedia' }}</h3>
                            <span v-if="pr.items_count != null" class="text-xs text-slate-500">{{ pr.items_count }} item dialokasikan</span>
                        </div>
                        <dl v-if="pr.requester_name || pr.division_name || pr.company_name" class="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                            <div><dt>Pemohon</dt><dd>{{ pr.requester_name || '—' }}</dd></div>
                            <div><dt>Divisi</dt><dd>{{ pr.division_name || '—' }}</dd></div>
                            <div class="sm:col-span-2"><dt>Perusahaan</dt><dd>{{ pr.company_name || '—' }}</dd></div>
                        </dl>
                        <div v-if="pr.purpose" class="mt-4">
                            <p class="text-xs text-slate-400">Keperluan</p>
                            <p class="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{{ pr.purpose }}</p>
                        </div>
                    </article>
                </li>
            </ol>
            <p v-else class="py-6 text-center text-sm text-slate-500" role="status">Informasi PR sumber belum tersedia.</p>
        </div>

        <template #footer>
            <div class="source-actions flex w-full flex-wrap items-center justify-end gap-2">
                <button type="button" class="source-close" @click="emit('update:modelValue', false)">Tutup</button>
                <button v-if="plan" type="button" class="source-open" @click="openDetail">Lihat detail rencana<ArrowRight class="size-4" /></button>
            </div>
        </template>
    </BaseModal>
</template>

<style scoped>
.source-prs dt { font-size: 12px; color: #94a3b8; margin-bottom: 5px; }
.source-prs dd { font-size: 14px; color: #334155; overflow-wrap: anywhere; }
.source-close, .source-open { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; }
.source-close { border: 1px solid #e2e8f0; background: white; color: #475569; }
.source-close:hover { background: #f8fafc; }
.source-open { border: 1px solid #014baa; background: #014baa; color: white; }
.source-open:hover { background: #003d8c; }
.source-actions button:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
@media (max-width: 400px) { .source-actions { flex-direction: column-reverse; align-items: stretch; } }
</style>
