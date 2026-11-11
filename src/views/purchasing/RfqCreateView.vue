<script setup>
import { RouterLink } from 'vue-router'
import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import RfqPlanSelectionSection from '../../components/purchasing/rfq/form/RfqPlanSelectionSection.vue'
import RfqTermsFormSection from '../../components/purchasing/rfq/form/RfqTermsFormSection.vue'
import RfqItemsTableSection from '../../components/purchasing/rfq/form/RfqItemsTableSection.vue'
import RfqSuppliersInviteSection from '../../components/purchasing/rfq/form/RfqSuppliersInviteSection.vue'
import { useRfqCreateForm } from '../../composables/purchasing/useRfqCreateForm.js'
import { ArrowLeft, Save, Send } from '@lucide/vue'

const {
    isSubmitting,
    isLoadingPlans,
    isLoadingPlanDetail,
    isLoadingSuppliers,
    selectedPlan,
    additionalPlanIds,
    additionalPlans,
    form,
    planItems,
    selectedSupplierIds,
    primaryPlanOptions,
    availableAdditionalPlanOptions,
    supplierOptions,
    selectedSuppliers,
    activeItems,
    totalEstimatedHpsAmount,
    getPlanPrSummary,
    getPlanPurposeSummary,
    getPlanDivisionSummary,
    selectAllItems,
    removeSupplier,
    handleSubmit
} = useRfqCreateForm()
</script>

<template>
    <div class="space-y-6 w-full pb-16">
        <!-- Page Header (Consistent Full-Width with Breadcrumbs) -->
        <PageHeader
            title="Buat Paket Tender (Request for Quotation / RFQ)"
            description="Inisiasi paket permintaan penawaran harga multi-vendor dari alokasi Rencana Pengadaan (Procurement Plan) bertipe RFQ."
            :breadcrumbs="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Tender RFQ', to: { name: 'user.purchasing.rfq' } },
                { label: 'Buat Paket Tender' }
            ]"
        >
            <template #actions>
                <RouterLink :to="{ name: 'user.purchasing.rfq' }">
                    <BaseButton variant="secondary">
                        <ArrowLeft class="w-4 h-4 mr-1.5" />
                        <span>Kembali ke Daftar RFQ</span>
                    </BaseButton>
                </RouterLink>
            </template>
        </PageHeader>

        <!-- Form Container -->
        <form @submit.prevent class="space-y-8">
            <!-- Step 1: Pilih Alokasi Rencana Pengadaan -->
            <RfqPlanSelectionSection
                :form="form"
                :primary-plan-options="primaryPlanOptions"
                :available-additional-plan-options="availableAdditionalPlanOptions"
                v-model:additional-plan-ids="additionalPlanIds"
                :selected-plan="selectedPlan"
                :additional-plans="additionalPlans"
                :plan-items-count="planItems.length"
                :is-loading-plans="isLoadingPlans"
                :is-loading-plan-detail="isLoadingPlanDetail"
                :get-plan-pr-summary="getPlanPrSummary"
                :get-plan-purpose-summary="getPlanPurposeSummary"
                :get-plan-division-summary="getPlanDivisionSummary"
            />

            <!-- Step 2: Informasi Tender & Ketentuan -->
            <RfqTermsFormSection :form="form" />

            <!-- Step 3: Rincian Item yang Ditenderkan -->
            <RfqItemsTableSection
                :has-plan-selected="Boolean(form.procurement_plan_id)"
                :plan-items="planItems"
                :active-items-count="activeItems.length"
                :total-estimated-hps-amount="totalEstimatedHpsAmount"
                @select-all="selectAllItems"
            />

            <!-- Step 4: Undang Supplier / Rekanan Tender -->
            <RfqSuppliersInviteSection
                v-model:selected-supplier-ids="selectedSupplierIds"
                :supplier-options="supplierOptions"
                :selected-suppliers="selectedSuppliers"
                :is-loading-suppliers="isLoadingSuppliers"
                @remove-supplier="removeSupplier"
            />

            <!-- Actions Footer Card (Consistent with ProcurementPlanCreateView) -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <RouterLink :to="{ name: 'user.purchasing.rfq' }">
                    <BaseButton variant="secondary">
                        <span>Batal</span>
                    </BaseButton>
                </RouterLink>

                <div class="flex items-center gap-3 flex-wrap justify-end">
                    <button
                        type="button"
                        @click="handleSubmit(false)"
                        :disabled="isSubmitting || activeItems.length === 0"
                        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-xs transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Save class="w-4 h-4 text-slate-500" />
                        <span>Simpan sebagai Draft RFQ</span>
                    </button>

                    <button
                        type="button"
                        @click="handleSubmit(true)"
                        :disabled="isSubmitting || activeItems.length === 0"
                        class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Send class="w-4 h-4" />
                        <span>Simpan & Publikasikan Tender</span>
                    </button>
                </div>
            </div>
        </form>
    </div>
</template>
