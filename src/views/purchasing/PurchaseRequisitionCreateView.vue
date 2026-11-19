<script setup>
import { onMounted } from 'vue'
import { 
    FileText, 
    ArrowLeft, 
    TriangleAlert, 
    Save, 
    ChevronRight, 
    Send,
    Loader2
} from '@lucide/vue'

import BaseButton from '@/components/ui/BaseButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { formatCurrency } from '@/composables/useFormatter.js'
import { usePurchaseRequisitionForm } from '@/composables/purchasing/usePurchaseRequisitionForm.js'

import PRWizardStepper from '@/components/purchasing/requisition/form/PRWizardStepper.vue'
import PRHeaderSection from '@/components/purchasing/requisition/form/PRHeaderSection.vue'
import PRItemsTableSection from '@/components/purchasing/requisition/form/PRItemsTableSection.vue'
import PRReviewSection from '@/components/purchasing/requisition/form/PRReviewSection.vue'
import PRProcurementRouteSection from '@/components/purchasing/requisition/form/PRProcurementRouteSection.vue'

const {
    router,
    isEditMode,
    existingPrNumber,
    existingPrStatus,
    latestRevisionAction,
    isLoadingMeta,
    isLoadingPr,
    isSubmitting,
    currentStep,
    stepMeta,
    currenciesList,
    itemsCatalog,
    unitsList,
    errors,
    stepErrorSummary,
    form,
    today,

    // Options
    approvalConfigOptions,
    selectedWorkflow,
    selectedWorkflowLevels,
    itemOptions,
    unitOptions,
    accountingCategoryOptions,
    accountingSubcategoryOptions,
    accountingAccountOptions,

    // Metric computeds
    totalQuantity,
    totalEstimatedAmount,
    totalEstimatedAmountInBase,
    daysUntilRequired,
    employeeName,
    employeePosition,
    employeeCompanyName,
    employeeDivisionName,

    // Actions
    addItemRow,
    removeItemRow,
    handleItemChange,
    fetchInitialMetadata,
    fetchCurrenciesList,
    fetchItemsSearch,
    fetchUnitsSearch,
    fetchAccountingCategoriesSearch,
    fetchAccountingSubcategoriesSearch,
    fetchAccountingAccountsSearch,
    formatDisplayDate,
    markTouched,
    getFieldError,
    getItemError,
    markItemTouched,
    goToStep,
    nextStep,
    prevStep,
    handleSubmit,
} = usePurchaseRequisitionForm()

onMounted(() => {
    fetchInitialMetadata()
    fetchCurrenciesList()
})
</script>

<template>
    <div class="pr-create w-full min-w-0 flex flex-col gap-6 pb-12">
        <PageHeader
            :title="isEditMode ? (existingPrStatus === 'revision_requested' ? `Perbaiki PR ${existingPrNumber || ''}` : `Edit Draft PR ${existingPrNumber || ''}`) : 'Buat Pengajuan Pembelian'"
            :description="`Diajukan oleh ${employeeName} (${employeeCompanyName} / ${employeeDivisionName})`"
            :breadcrumbs="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Purchase Requisitions', to: { name: 'user.purchasing.requisitions' } },
                { label: isEditMode ? (existingPrStatus === 'revision_requested' ? `Perbaiki PR (${existingPrNumber || 'Loading...'})` : `Edit Draft PR (${existingPrNumber || 'Loading...'})`) : 'Buat Pengajuan Baru' }
            ]"
        >
            <template #icon>
                <FileText class="w-6 h-6 text-blue-600" />
            </template>
            <template #actions>
                <BaseButton
                    variant="secondary"
                    size="sm"
                    :disabled="isSubmitting"
                    @click="router.push({ name: 'user.purchasing.requisitions' })"
                >
                    <span class="inline-flex items-center gap-1.5">
                        <ArrowLeft class="w-4 h-4" />
                        Batal
                    </span>
                </BaseButton>
            </template>
        </PageHeader>

        <!-- INDIKATOR LANGKAH WIZARD -->
        <PRWizardStepper
            :step-meta="stepMeta"
            :current-step="currentStep"
            @go-to-step="goToStep"
        />

        <!-- CATATAN REVISI (hanya saat perlu perbaikan) -->
        <div
            v-if="isEditMode && existingPrStatus === 'revision_requested'"
            class="bg-amber-50/90 border border-amber-200 rounded-xl p-4 sm:p-5 flex items-start gap-3.5"
        >
            <span class="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <TriangleAlert class="w-4 h-4" />
            </span>
            <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-amber-900">
                    Perlu perbaikan<span v-if="latestRevisionAction?.user_name" class="font-normal text-amber-700">, catatan {{ latestRevisionAction.user_name }}<span v-if="latestRevisionAction.user_role"> ({{ latestRevisionAction.user_role }})</span></span>
                </p>
                <p class="text-xs text-amber-800 leading-relaxed mt-1">
                    {{ latestRevisionAction?.notes || 'Periksa kembali item kebutuhan serta estimasi harganya.' }}
                </p>
            </div>
        </div>

        <!-- RINGKASAN VALIDASI INLINE -->
        <div
            v-if="stepErrorSummary"
            role="alert"
            class="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-900"
        >
            <span class="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <TriangleAlert class="w-4 h-4" />
            </span>
            <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold">{{ stepErrorSummary }}</p>
                <p class="text-xs text-rose-700 mt-0.5">Periksa kolom yang ditandai merah di bawah ini.</p>
            </div>
        </div>

        <!-- FORM UTAMA / SKELETON INITIAL LOAD -->
        <div
            v-if="isLoadingPr || (isLoadingMeta && !itemOptions.length)"
            class="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5"
            aria-busy="true"
            aria-label="Memuat data formulir pengajuan pembelian"
        >
            <div class="flex items-center gap-2.5 text-sm font-medium text-slate-600">
                <Loader2 class="w-4 h-4 animate-spin text-[#014BAA]" />
                <span>{{ isLoadingPr ? 'Memuat data Purchase Requisition…' : 'Menyiapkan referensi master & alur persetujuan…' }}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div v-for="n in 4" :key="`pr-form-skel-${n}`" class="space-y-2">
                    <div class="erp-skeleton h-3.5 w-28 rounded" />
                    <div class="erp-skeleton h-10 w-full rounded-lg" />
                </div>
            </div>
            <div class="space-y-2 pt-2">
                <div class="erp-skeleton h-3.5 w-36 rounded" />
                <div class="erp-skeleton h-20 w-full rounded-lg" />
            </div>
        </div>

        <!-- FORM UTAMA -->
        <form v-else @submit.prevent="handleSubmit('submit')" class="space-y-6">
            <PRProcurementRouteSection v-if="currentStep === 1" :form="form" :errors="errors" />
            <!-- LANGKAH 1: INFO PENGAJUAN -->
            <PRHeaderSection
                v-show="currentStep === 1"
                :form="form"
                :errors="errors"
                :today="today"
                :approval-config-options="approvalConfigOptions"
                :selected-workflow-levels="selectedWorkflowLevels"
                :days-until-required="daysUntilRequired"
                :employee-name="employeeName"
                :employee-position="employeePosition"
                :employee-company-name="employeeCompanyName"
                :employee-division-name="employeeDivisionName"
                :format-display-date="formatDisplayDate"
                :get-field-error="getFieldError"
                @mark-touched="markTouched"
            />

            <!-- LANGKAH 2: DAFTAR ITEM -->
            <PRItemsTableSection
                v-show="currentStep === 2"
                :form="form"
                :errors="errors"
                :procurement-route="form.procurement_route"
                :currencies-list="currenciesList"
                :total-estimated-amount="totalEstimatedAmount"
                :item-options="itemOptions"
                :unit-options="unitOptions"
                :accounting-category-options="accountingCategoryOptions"
                :accounting-subcategory-options="accountingSubcategoryOptions"
                :accounting-account-options="accountingAccountOptions"
                :get-item-error="getItemError"
                @add-item="addItemRow"
                @remove-item="removeItemRow"
                @search-items="fetchItemsSearch"
                @search-units="fetchUnitsSearch"
                @search-accounting-categories="fetchAccountingCategoriesSearch"
                @search-accounting-subcategories="fetchAccountingSubcategoriesSearch"
                @search-accounting-accounts="fetchAccountingAccountsSearch"
                @item-change="handleItemChange"
                @mark-item-touched="markItemTouched"
            />

            <!-- LANGKAH 3: REVIEW & KONFIRMASI -->
            <PRReviewSection
                v-show="currentStep === 3"
                :form="form"
                :items-catalog="itemsCatalog"
                :units-list="unitsList"
                :selected-workflow="selectedWorkflow"
                :selected-workflow-levels="selectedWorkflowLevels"
                :days-until-required="daysUntilRequired"
                :total-quantity="totalQuantity"
                :total-estimated-amount="totalEstimatedAmount"
                :total-estimated-amount-in-base="totalEstimatedAmountInBase"
                :format-display-date="formatDisplayDate"
                @go-to-step="goToStep"
            />
        </form>

        <!-- BILAH AKSI (STICKY ACTION BAR) -->
        <div class="pr-actions sticky bottom-4 z-20 bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p class="text-xs sm:text-sm font-medium text-slate-600">
                <span v-if="currentStep === 1">Langkah 1 dari 3: Informasi Pengadaan</span>
                <span v-else-if="currentStep === 2">Langkah 2 dari 3: Total <span class="font-bold text-slate-900">{{ form.items.length }}</span> item (<span class="font-mono tabular-nums font-bold text-blue-700">{{ formatCurrency(totalEstimatedAmount, form.currency) }}</span>)</span>
                <span v-else>Langkah 3 dari 3: Siap diajukan ke tahap otorisasi</span>
            </p>
            <div class="flex flex-wrap items-center gap-3">
                <BaseButton
                    v-if="currentStep > 1"
                    variant="secondary"
                    size="md"
                    :disabled="isSubmitting"
                    @click="prevStep"
                >
                    <span class="inline-flex items-center gap-2">
                        <ArrowLeft class="w-4 h-4" />
                        Kembali
                    </span>
                </BaseButton>
                <BaseButton
                    variant="secondary"
                    size="md"
                    :disabled="isSubmitting"
                    @click="handleSubmit('draft')"
                >
                    <span class="inline-flex items-center gap-2">
                        <Save class="w-4 h-4" />
                        {{ isEditMode ? 'Simpan Perubahan' : 'Simpan Draft' }}
                    </span>
                </BaseButton>
                <BaseButton
                    v-if="currentStep < 3"
                    variant="primary"
                    size="md"
                    :disabled="isSubmitting"
                    @click="nextStep"
                >
                    <span class="inline-flex items-center gap-2">
                        {{ currentStep === 1 ? 'Lanjut ke Daftar Item' : 'Lanjut ke Review' }}
                        <ChevronRight class="w-4 h-4" />
                    </span>
                </BaseButton>
                <BaseButton
                    v-else
                    variant="primary"
                    size="md"
                    :disabled="isSubmitting"
                    @click="handleSubmit('submit')"
                >
                    <span class="inline-flex items-center gap-2">
                        <Send class="w-4 h-4" />
                        {{ existingPrStatus === 'revision_requested' ? 'Ajukan Ulang PR' : 'Kirim Pengajuan PR' }}
                    </span>
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pr-create :deep(input:not([type=checkbox]):not([type=radio])) { min-height: 44px; }
.pr-create :deep(button:focus-visible), .pr-create :deep(summary:focus-visible), .pr-create :deep(a:focus-visible) { outline: 2px solid #014baa; outline-offset: 3px; }
@media (max-width: 639px) {
    .pr-actions { position: static; }
    .pr-actions > div { width: 100%; }
    .pr-actions :deep(button) { flex: 1 1 auto; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) { .pr-create :deep(*) { transition: none !important; animation: none !important; } }
</style>
