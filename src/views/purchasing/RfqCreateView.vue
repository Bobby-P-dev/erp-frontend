<script setup>
import { RouterLink } from 'vue-router'
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import { formatCurrency } from '../../utils/stringUtils.js'
import RfqPlanSelectionSection from '../../components/purchasing/rfq/form/RfqPlanSelectionSection.vue'
import RfqTermsFormSection from '../../components/purchasing/rfq/form/RfqTermsFormSection.vue'
import RfqItemsTableSection from '../../components/purchasing/rfq/form/RfqItemsTableSection.vue'
import RfqSuppliersInviteSection from '../../components/purchasing/rfq/form/RfqSuppliersInviteSection.vue'
import { useRfqCreateForm } from '../../composables/purchasing/useRfqCreateForm.js'
import { Save, Send } from '@lucide/vue'

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
    <div class="rfq-create space-y-6 w-full min-w-0">
        <BaseBreadcrumb
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Tender RFQ', to: { name: 'user.purchasing.rfq' } },
                { label: 'Buat tender' }
            ]"
        />
        <div>
            <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Buat paket tender</h1>
            <p class="mt-1.5 text-sm text-slate-500">
                Siapkan barang dan undang supplier untuk mengajukan penawaran. Kolom bertanda
                <span class="text-rose-500">*</span> wajib diisi.
            </p>
        </div>

        <!-- Form Container -->
        <form @submit.prevent class="space-y-5" :aria-busy="isSubmitting || isLoadingPlanDetail">
            <!-- Step 1: Pilih Alokasi Rencana Pengadaan -->
            <RfqPlanSelectionSection
                :form="form"
                :primary-plan-options="primaryPlanOptions"
                :available-additional-plan-options="availableAdditionalPlanOptions"
                v-model:additional-plan-ids="additionalPlanIds"
                :selected-plan="selectedPlan"
                :additional-plans="additionalPlans"
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

            <section class="rfq-form-section" aria-labelledby="rfq-summary-heading">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                    <div>
                        <h2 id="rfq-summary-heading" class="text-base font-semibold text-slate-900">
                            Ringkasan tender
                        </h2>
                        <p class="mt-2 text-sm text-slate-500">
                            {{ activeItems.length }} barang dipilih · {{ selectedSuppliers.length }} supplier
                            · {{ selectedPlan ? 1 + additionalPlans.length : 0 }} rencana
                        </p>
                    </div>
                    <div class="sm:text-right">
                        <p class="text-xs text-slate-500">Total estimasi HPS</p>
                        <p class="mt-1 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                            {{ formatCurrency(totalEstimatedHpsAmount, 'IDR') }}
                        </p>
                    </div>
                </div>
                <p class="text-xs text-slate-500 leading-relaxed">
                    Simpan draf untuk diperiksa kembali, atau publikasikan untuk membuka penawaran dan
                    memproses undangan supplier.
                </p>
                <div
                    class="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-5"
                >
                    <RouterLink
                        :to="{ name: 'user.purchasing.rfq' }"
                        class="rfq-secondary-button justify-center"
                        :class="{ 'pointer-events-none opacity-50': isSubmitting }"
                        :aria-disabled="isSubmitting"
                        >Batal</RouterLink
                    >
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            class="rfq-secondary-button justify-center"
                            :disabled="
                                isSubmitting ||
                                isLoadingPlans ||
                                isLoadingPlanDetail ||
                                activeItems.length === 0
                            "
                            @click="handleSubmit(false)"
                        >
                            <Save class="size-4" />Simpan draf
                        </button>
                        <button
                            type="button"
                            class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#014BAA] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            :disabled="
                                isSubmitting ||
                                isLoadingPlans ||
                                isLoadingPlanDetail ||
                                activeItems.length === 0
                            "
                            @click="handleSubmit(true)"
                        >
                            <Send class="size-4" />{{ isSubmitting ? 'Menyimpan…' : 'Simpan & publikasikan' }}
                        </button>
                    </div>
                </div>
            </section>
        </form>
    </div>
</template>

<style scoped>
.rfq-create :deep(.rfq-form-section) {
    min-width: 0;
    padding: 24px;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: white;
}
.rfq-create :deep(.rfq-form-section > * + *) {
    margin-top: 20px;
}
.rfq-create :deep(.rfq-section-heading) {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
}
.rfq-create :deep(.rfq-section-heading h2) {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
}
.rfq-create :deep(.rfq-section-heading p) {
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.6;
    color: #64748b;
}
.rfq-create :deep(.rfq-field-label) {
    display: block;
    margin-bottom: 7px;
    font-size: 13px;
    font-weight: 500;
    color: #475569;
}
.rfq-create :deep(input.rfq-input),
.rfq-create :deep(textarea) {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: white;
    font-size: 14px;
    color: #1e293b;
}
.rfq-create :deep(textarea) {
    resize: vertical;
}
.rfq-create :deep(input:disabled),
.rfq-create :deep(textarea:disabled) {
    background: #f8fafc;
    color: #94a3b8;
}
.rfq-create :deep(.rfq-secondary-button) {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: white;
    color: #475569;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
}
.rfq-create :deep(.rfq-secondary-button:hover) {
    background: #f8fafc;
}
.rfq-create :deep(.rfq-secondary-button:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
}
.rfq-create :deep(input:focus-visible),
.rfq-create :deep(textarea:focus-visible),
.rfq-create :deep(button:focus-visible),
.rfq-create :deep(a:focus-visible),
.rfq-create :deep(summary:focus-visible) {
    outline: 2px solid #014baa;
    outline-offset: 3px;
}
.rfq-create :deep(.rfq-item-row) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 20px;
    padding: 24px 0;
}
.rfq-create :deep(.rfq-item-row > :first-child) {
    grid-column: 1 / -1;
}
.rfq-create :deep(.rfq-item-subtotal) {
    align-self: start;
}
@media (min-width: 1100px) {
    .rfq-create :deep(.rfq-item-row) {
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
        gap: 28px;
    }
    .rfq-create :deep(.rfq-item-row > :first-child) {
        grid-column: auto;
    }
    .rfq-create :deep(.rfq-item-subtotal) {
        text-align: right;
    }
}
@media (max-width: 639px) {
    .rfq-create :deep(.rfq-form-section) {
        padding: 20px 16px;
    }
    .rfq-create :deep(.rfq-item-row) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 16px;
    }
    .rfq-create :deep(.rfq-item-subtotal) {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }
    .rfq-create :deep(.rfq-item-subtotal .rfq-field-label) {
        margin: 0;
    }
}
</style>
