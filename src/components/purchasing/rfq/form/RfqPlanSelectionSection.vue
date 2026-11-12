<script setup>
import ReviewDisclosure from '../../../ui/ReviewDisclosure.vue'
import { RouterLink } from 'vue-router'
import SearchableSelect from '../../../ui/SearchableSelect.vue'
import SearchableMultiSelect from '../../../ui/SearchableMultiSelect.vue'

defineProps({
    form: { type: Object, required: true },
    primaryPlanOptions: { type: Array, required: true },
    availableAdditionalPlanOptions: { type: Array, required: true },
    additionalPlanIds: { type: Array, required: true },
    selectedPlan: { type: Object, default: null },
    additionalPlans: { type: Array, default: () => [] },
    isLoadingPlans: { type: Boolean, default: false },
    isLoadingPlanDetail: { type: Boolean, default: false },
    getPlanPrSummary: { type: Function, required: true },
    getPlanPurposeSummary: { type: Function, required: true },
    getPlanDivisionSummary: { type: Function, required: true }
})

const emit = defineEmits(['update:additionalPlanIds'])
</script>

<template>
    <section class="rfq-form-section" aria-labelledby="rfq-plan-heading">
        <div class="rfq-section-heading">
            <div>
                <h2 id="rfq-plan-heading">1. Rencana pengadaan</h2>
                <p>Tentukan sumber barang untuk paket tender ini.</p>
            </div>
            <RouterLink
                :to="{ name: 'user.purchasing.rfq', query: { tab: 'queue' } }"
                class="text-sm font-medium text-[#014BAA] hover:underline"
                >Lihat antrean rencana</RouterLink
            >
        </div>
        <div class="space-y-4">
            <div>
                <p id="rfq-plan-label" class="rfq-field-label">
                    Rencana utama <span class="text-rose-500">*</span>
                </p>
                <SearchableSelect
                    v-model="form.procurement_plan_id"
                    :options="primaryPlanOptions"
                    placeholder="Pilih rencana pengadaan"
                    searchPlaceholder="Cari nomor PP, PR, atau kebutuhan…"
                    :disabled="isLoadingPlans || isLoadingPlanDetail"
                    :loading="isLoadingPlans || isLoadingPlanDetail"
                    aria-labelledby="rfq-plan-label"
                />
                <p
                    v-if="primaryPlanOptions.length === 0 && !isLoadingPlans"
                    class="mt-2 text-sm text-amber-700"
                >
                    Belum ada rencana aktif untuk tender RFQ. Periksa antrean rencana atau coba muat ulang
                    halaman.
                </p>
                <p v-if="isLoadingPlanDetail" role="status" class="mt-2 text-sm text-slate-500">
                    Memuat barang dari rencana…
                </p>
            </div>
            <dl v-if="selectedPlan" class="grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
                <div>
                    <dt class="text-xs text-slate-500">Perusahaan & divisi</dt>
                    <dd class="mt-1 font-medium text-slate-800 break-words">
                        {{
                            selectedPlan.company?.name ||
                            selectedPlan.purchase_requisition?.company?.name ||
                            selectedPlan.source_prs?.[0]?.company_name ||
                            '—'
                        }}
                    </dd>
                    <dd class="mt-1 text-xs text-slate-500">{{ getPlanDivisionSummary(selectedPlan) }}</dd>
                </div>
                <div>
                    <dt class="text-xs text-slate-500">PR sumber</dt>
                    <dd class="mt-1 text-slate-700 break-words">{{ getPlanPrSummary(selectedPlan) }}</dd>
                </div>
                <div>
                    <dt class="text-xs text-slate-500">Kebutuhan</dt>
                    <dd class="mt-1 text-slate-700 break-words">{{ getPlanPurposeSummary(selectedPlan) }}</dd>
                </div>
            </dl>
            <ReviewDisclosure
                v-if="selectedPlan && (availableAdditionalPlanOptions.length || additionalPlanIds.length)"
                title="Gabungkan rencana lain"
                :description="
                    additionalPlanIds.length
                        ? `${additionalPlanIds.length} rencana tambahan dipilih`
                        : 'Opsional · hanya rencana dari perusahaan yang sama'
                "
                :open="additionalPlanIds.length > 0"
            >
                <SearchableMultiSelect
                    :model-value="additionalPlanIds"
                    @update:model-value="emit('update:additionalPlanIds', $event)"
                    :options="availableAdditionalPlanOptions"
                    placeholder="Cari rencana tambahan…"
                    :loading="isLoadingPlanDetail"
                />
                <p v-if="additionalPlans.length" class="mt-3 text-sm text-slate-600 break-words">
                    Digabung: {{ additionalPlans.map((p) => p.pp_number).join(', ') }}
                </p>
            </ReviewDisclosure>
        </div>
    </section>
</template>
