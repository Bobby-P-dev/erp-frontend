<script setup>
import PageHeader from '../../components/ui/PageHeader.vue'
import ProcurementQueueTab from '../../components/purchasing/plan/list/ProcurementQueueTab.vue'
import ProcurementPlansTab from '../../components/purchasing/plan/list/ProcurementPlansTab.vue'
import ConsolidatedPrModal from '../../components/purchasing/plan/list/ConsolidatedPrModal.vue'
import { useProcurementPlanList } from '../../composables/purchasing/useProcurementPlanList.js'
import { Layers, Plus, ClipboardList } from '@lucide/vue'

const {
    router,
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
    stats,
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
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <PageHeader 
            title="Rencana Pengadaan (Procurement Plans)" 
            description="Pilih Purchase Requisition (PR) approved untuk dibuatkan strategi pengadaan (Direct Purchase vs Tender RFQ) dan alokasi item."
            :breadcrumbs="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Rencana Pengadaan' }
            ]"
        >
            <template #actions>
                <button
                    v-if="activeMainTab === 'plans'"
                    type="button"
                    @click="activeMainTab = 'pending'"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-200 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                    <Plus class="w-4 h-4" />
                    <span>Pilih PR untuk Dibuat Rencana</span>
                </button>
                <div v-else class="text-xs text-slate-500 bg-blue-50/70 border border-blue-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                    <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                    <span>Pilih salah satu PR di bawah ini untuk membuat rencana</span>
                </div>
            </template>
        </PageHeader>

        <!-- Primary High-Level View Switcher Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-200">
            <button
                type="button"
                @click="activeMainTab = 'pending'"
                class="pb-3.5 px-3 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all cursor-pointer -mb-px"
                :class="activeMainTab === 'pending'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'"
            >
                <ClipboardList class="w-4 h-4" />
                <span>Purchase Siap Diplanning</span>
                <span 
                    class="px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-colors"
                    :class="activeMainTab === 'pending'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'"
                >
                    {{ groupedPurchaseRequisitions.length }}
                </span>
            </button>

            <button
                type="button"
                @click="activeMainTab = 'plans'"
                class="pb-3.5 px-3 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all cursor-pointer -mb-px"
                :class="activeMainTab === 'plans'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'"
            >
                <Layers class="w-4 h-4" />
                <span>Dokumen Rencana Pengadaan</span>
                <span 
                    class="px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-colors"
                    :class="activeMainTab === 'plans'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'"
                >
                    {{ stats.total }}
                </span>
            </button>
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
            :stats="stats"
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
            @activate="handleActivate"
            @cancel="handleCancel"
        />

        <!-- Modal Rincian PR Asal Terkonsolidasi -->
        <ConsolidatedPrModal
            v-model="isPrModalOpen"
            :plan="selectedPlanForPrModal"
            :pr-count="getMultiPrCount(selectedPlanForPrModal)"
            @open-detail="router.push({ name: 'user.purchasing.plans.detail', params: { id: $event.id } })"
        />
    </div>
</template>
