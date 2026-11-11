<script setup>
import { RouterLink } from 'vue-router'
import SearchableSelect from '../../../ui/SearchableSelect.vue'
import SearchableMultiSelect from '../../../ui/SearchableMultiSelect.vue'
import { Layers, FileText, Building2, CheckCircle2, AlertCircle } from '@lucide/vue'

defineProps({
    form: { type: Object, required: true },
    primaryPlanOptions: { type: Array, required: true },
    availableAdditionalPlanOptions: { type: Array, required: true },
    additionalPlanIds: { type: Array, required: true },
    selectedPlan: { type: Object, default: null },
    additionalPlans: { type: Array, default: () => [] },
    planItemsCount: { type: Number, default: 0 },
    isLoadingPlans: { type: Boolean, default: false },
    isLoadingPlanDetail: { type: Boolean, default: false },
    getPlanPrSummary: { type: Function, required: true },
    getPlanPurposeSummary: { type: Function, required: true },
    getPlanDivisionSummary: { type: Function, required: true }
})

const emit = defineEmits(['update:additionalPlanIds'])
</script>

<template>
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-sm">
                    1
                </div>
                <div>
                    <h3 class="text-base font-bold text-slate-900">Pilih Alokasi Rencana Pengadaan (Procurement Plan)</h3>
                    <p class="text-xs text-slate-500">Pilih dokumen Rencana Pengadaan (PP) bertipe Tender RFQ yang siap ditenderkan ke vendor.</p>
                </div>
            </div>

            <RouterLink
                :to="{ name: 'user.purchasing.rfq', query: { tab: 'queue' } }"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
            >
                <Layers class="w-3.5 h-3.5" />
                <span>Pilih dari Antrean Rencana RFQ</span>
            </RouterLink>
        </div>

        <div class="space-y-4">
            <!-- Selector Box -->
            <div class="bg-slate-50/70 p-4.5 rounded-xl border border-slate-200/80 space-y-3">
                <div>
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                        <label class="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Dokumen Rencana Pengadaan Utama (PP Approved) <span class="text-rose-500">*</span>
                        </label>
                        <span v-if="selectedPlan" class="text-[11px] text-slate-500 font-medium">
                            Ganti dokumen PP untuk memuat alokasi item lainnya
                        </span>
                    </div>

                    <SearchableSelect
                        v-model="form.procurement_plan_id"
                        :options="primaryPlanOptions"
                        placeholder="-- Cari atau Pilih Dokumen Rencana Pengadaan (PP) --"
                        searchPlaceholder="Ketik nomor PP, PR, divisi, atau keperluan..."
                        :disabled="isLoadingPlans || isLoadingPlanDetail"
                        :loading="isLoadingPlans || isLoadingPlanDetail"
                        required
                    />

                    <p v-if="primaryPlanOptions.length === 0 && !isLoadingPlans" class="text-xs text-amber-600 flex items-center gap-1 mt-2 font-medium">
                        <AlertCircle class="w-3.5 h-3.5 shrink-0" />
                        Tidak ada Rencana Pengadaan (PP) bertipe Tender RFQ berstatus Aktif yang siap dieksekusi.
                    </p>
                </div>

                <!-- Multi-Plan Consolidation Option -->
                <div v-if="selectedPlan && availableAdditionalPlanOptions.length > 0" class="pt-2 border-t border-slate-200/70">
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">
                        Gabungkan Item dari Rencana Pengadaan RFQ Lainnya <span class="text-slate-400 font-normal">(Opsional — Konsolidasi Multi-Plan)</span>
                    </label>
                    <SearchableMultiSelect
                        :model-value="additionalPlanIds"
                        @update:model-value="emit('update:additionalPlanIds', $event)"
                        :options="availableAdditionalPlanOptions"
                        placeholder="Pilih dokumen rencana pengadaan tambahan untuk digabung ke dalam 1 tender..."
                        :loading="isLoadingPlanDetail"
                    />
                </div>
            </div>

            <!-- Selected Plan Summary Bento Card -->
            <div v-if="selectedPlan" class="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-4.5 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-blue-200/60">
                    <div class="flex flex-wrap items-center gap-2 font-bold text-slate-900 text-sm">
                        <Layers class="w-4 h-4 text-blue-600" />
                        <span class="font-mono">{{ selectedPlan.pp_number }}</span>
                        <template v-for="addPlan in additionalPlans" :key="addPlan.id">
                            <span class="text-blue-500">+</span>
                            <span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-xs">{{ addPlan.pp_number }}</span>
                        </template>
                        <span
                            v-if="selectedPlan.is_consolidated || (selectedPlan.pr_numbers && selectedPlan.pr_numbers.length > 1) || additionalPlans.length > 0"
                            class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider"
                        >
                            Konsolidasi Multi-PR / Multi-Plan
                        </span>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                        <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 class="w-3.5 h-3.5" /> Rencana Aktif
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full bg-white border border-blue-200 text-blue-700 text-xs font-bold font-mono">
                            {{ planItemsCount }} Item Tersedia
                        </span>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div class="bg-white/90 p-3 rounded-xl border border-blue-100">
                        <span class="text-slate-400 block text-[11px] font-medium mb-0.5">Perusahaan & Divisi:</span>
                        <div class="font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span class="truncate">{{ selectedPlan.company?.name || selectedPlan.purchase_requisition?.company?.name || selectedPlan.source_prs?.[0]?.company_name || '-' }}</span>
                        </div>
                        <span class="text-slate-500 text-[11px] block mt-0.5">{{ getPlanDivisionSummary(selectedPlan) }}</span>
                    </div>

                    <div class="bg-white/90 p-3 rounded-xl border border-blue-100">
                        <span class="text-slate-400 block text-[11px] font-medium mb-0.5">Dokumen PR Asal:</span>
                        <div class="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                            <FileText class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span class="truncate">{{ getPlanPrSummary(selectedPlan) }}</span>
                        </div>
                        <span class="text-slate-500 text-[11px] block mt-0.5">Metode: Tender RFQ Multi-Vendor</span>
                    </div>

                    <div class="bg-white/90 p-3 rounded-xl border border-blue-100">
                        <span class="text-slate-400 block text-[11px] font-medium mb-0.5">Tujuan / Keperluan Pengadaan:</span>
                        <span class="font-semibold text-slate-800 line-clamp-2">{{ getPlanPurposeSummary(selectedPlan) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
