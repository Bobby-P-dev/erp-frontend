<script setup>
import { ref } from 'vue'
import ProcurementPlanDetailModal from '../../components/purchasing/plan/ProcurementPlanDetailModal.vue'
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import ProcurementQueueTab from '../../components/purchasing/plan/list/ProcurementQueueTab.vue'
import ProcurementPlansTab from '../../components/purchasing/plan/list/ProcurementPlansTab.vue'
import ConsolidatedPrModal from '../../components/purchasing/plan/list/ConsolidatedPrModal.vue'
import { useProcurementPlanList } from '../../composables/purchasing/useProcurementPlanList.js'
import { Plus } from '@lucide/vue'

const {
    activeMainTab,
    isLoadingQueue,
    queueSearch,
    expandedPrs,
    plans,
    isLoadingPlans,
    searchQuery,
    selectedStatus,
    selectedMethod,
    pagination,
    groupedPurchaseRequisitions,
    statusTabs,
    methodOptions,
    queueTableColumns,
    tableColumns,
    selectedItemList,
    selectedCompany,
    selectedPrCount,
    isItemChecked,
    isPrFullyChecked,
    isPrPartiallyChecked,
    toggleSelectItem,
    toggleSelectPr,
    clearSelection,
    handleCreateConsolidatedPlan,
    handleFastTrackBulkRfq,
    handleFastTrackBulkDirectPurchase,
    fetchQueue,
    fetchPlans,
    handleStatusTab,
    handlePageChange,
    toggleExpandPr,
    handleCreatePlanForPr,
    formatDate,
    isPrModalOpen,
    selectedPlanForPrModal,
    openPrModal,
    isMultiPrPlan,
    getSinglePrNumber,
    getSinglePrSubtitle,
    getMultiPrCount,
    getMultiPrSubtitle,
    handleActivate,
    handleCancel
} = useProcurementPlanList()
const selectedDetailId = ref(null)
const openDetail = plan => {
    isPrModalOpen.value = false
    selectedDetailId.value = plan.id
}
const refreshAfterDetailChange = () => {
    fetchPlans(searchQuery.value, pagination.value?.current_page || 1)
    fetchQueue()
}
</script>

<template>
    <div class="procurement-plans space-y-6">
        <BaseBreadcrumb :items="[{ label: 'Purchasing', to: { name: 'user.purchasing' } }, { label: 'Rencana Pengadaan' }]" />
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Rencana pengadaan</h1>
                <p class="mt-2 text-sm text-slate-500 leading-relaxed">Atur kebutuhan dari PR yang disetujui menjadi pembelian langsung atau tender RFQ.</p>
            </div>
            <button v-if="activeMainTab === 'plans'" type="button" @click="activeMainTab = 'pending'" class="inline-flex items-center justify-center gap-2 self-start shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium bg-[#014BAA] hover:bg-blue-800 text-white">
                <Plus class="size-4" />Buat rencana
            </button>
        </div>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200" aria-label="Tampilan rencana pengadaan">
            <button type="button" @click="activeMainTab = 'pending'" :aria-pressed="activeMainTab === 'pending'" class="pb-3 text-sm font-medium border-b-2 -mb-px" :class="activeMainTab === 'pending' ? 'border-[#014BAA] text-[#014BAA]' : 'border-transparent text-slate-500 hover:text-slate-900'">PR siap direncanakan</button>
            <button type="button" @click="activeMainTab = 'plans'" :aria-pressed="activeMainTab === 'plans'" class="pb-3 text-sm font-medium border-b-2 -mb-px" :class="activeMainTab === 'plans' ? 'border-[#014BAA] text-[#014BAA]' : 'border-transparent text-slate-500 hover:text-slate-900'">Daftar rencana</button>
        </div>

        <!-- Tab 1: Purchase Siap Diplanning -->
        <ProcurementQueueTab
            v-if="activeMainTab === 'pending'"
            v-model:queue-search="queueSearch"
            :grouped-purchase-requisitions="groupedPurchaseRequisitions"
            :is-loading-queue="isLoadingQueue"
            :expanded-prs="expandedPrs"
            :queue-table-columns="queueTableColumns"
            :selected-item-list="selectedItemList"
            :selected-company="selectedCompany"
            :selected-pr-count="selectedPrCount"
            :is-item-checked="isItemChecked"
            :is-pr-fully-checked="isPrFullyChecked"
            :is-pr-partially-checked="isPrPartiallyChecked"
            :format-date="formatDate"
            @fetch-queue="fetchQueue"
            @switch-tab="activeMainTab = $event"
            @toggle-select-pr="toggleSelectPr"
            @toggle-select-item="toggleSelectItem"
            @toggle-expand-pr="toggleExpandPr"
            @create-plan-for-pr="handleCreatePlanForPr"
            @clear-selection="clearSelection"
            @create-consolidated-plan="handleCreateConsolidatedPlan"
            @fast-track-bulk-rfq="handleFastTrackBulkRfq"
            @fast-track-bulk-dp="handleFastTrackBulkDirectPurchase"
        />

        <!-- Tab 2: Dokumen Rencana Pengadaan -->
        <ProcurementPlansTab
            v-else
            v-model:search-query="searchQuery"
            v-model:selected-method="selectedMethod"
            :plans="plans"
            :is-loading-plans="isLoadingPlans"
            :selected-status="selectedStatus"
            :status-tabs="statusTabs"
            :method-options="methodOptions"
            :table-columns="tableColumns"
            :pagination="pagination"
            :format-date="formatDate"
            :is-multi-pr-plan="isMultiPrPlan"
            :get-single-pr-number="getSinglePrNumber"
            :get-single-pr-subtitle="getSinglePrSubtitle"
            :get-multi-pr-count="getMultiPrCount"
            :get-multi-pr-subtitle="getMultiPrSubtitle"
            @status-tab="handleStatusTab"
            @fetch-plans="fetchPlans(searchQuery, 1)"
            @page-change="handlePageChange"
            @switch-tab="activeMainTab = $event"
            @open-pr-modal="openPrModal"
            @open-detail="openDetail"
            @activate="handleActivate"
            @cancel="handleCancel"
        />

        <!-- Modal Rincian PR Asal Terkonsolidasi -->
        <ConsolidatedPrModal
            v-model="isPrModalOpen"
            :plan="selectedPlanForPrModal"
            :pr-count="getMultiPrCount(selectedPlanForPrModal)"
            @open-detail="openDetail"
        />
        <ProcurementPlanDetailModal v-if="selectedDetailId" :key="selectedDetailId" :plan-id="selectedDetailId" @close="selectedDetailId = null" @changed="refreshAfterDetailChange" />
    </div>
</template>

<style scoped>
.procurement-plans { min-width: 0; }
.procurement-plans :deep(button) { cursor: pointer; }
.procurement-plans :deep(button:disabled) { cursor: not-allowed; }
.procurement-plans :deep(button:focus-visible), .procurement-plans :deep(a:focus-visible) { outline: 2px solid #014baa; outline-offset: 3px; border-radius: 6px; }
</style>
