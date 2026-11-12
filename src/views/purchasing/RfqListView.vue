<script setup>
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import RfqQueueTab from '../../components/purchasing/rfq/list/RfqQueueTab.vue'
import RfqDocumentsTab from '../../components/purchasing/rfq/list/RfqDocumentsTab.vue'
import { useRfqList } from '../../composables/purchasing/useRfqList.js'
import { Scale, Plus, ClipboardList } from '@lucide/vue'

const {
    activeMainTab,
    isLoadingQueue,
    queueSearch,
    onlyWithQuota,
    expandedPlans,
    selectedPlansList,
    selectedQueueCompany,
    queueColumns,
    filteredQueuePlans,
    hasRemainingQuota,
    getRemainingQuotaCount,
    fetchQueuePlans,
    toggleExpandPlan,
    isPlanSelected,
    toggleSelectPlan,
    clearQueueSelection,
    handleExecuteSingleRfq,
    handleExecuteCombinedRfq,
    rfqs,
    isLoading,
    searchQuery,
    selectedStatus,
    pagination,
    queuePagination,
    tableColumns,
    statusTabs,
    fetchRfqs,
    getDeadlineInfo,
    handlePageChange,
    handleStatusFilter,
    handlePublish,
    handleCancel,
    goToDetail,
    goToComparison,
    formatDate
} = useRfqList()
</script>

<template>
    <div class="space-y-6 w-full">
        <BaseBreadcrumb :items="[{ label: 'Purchasing', to: { name: 'user.purchasing' } }, { label: 'Tender RFQ' }]" />
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Tender RFQ</h1>
                <p class="mt-1.5 text-sm text-slate-500">Kelola tender dan pantau penawaran supplier untuk kebutuhan pengadaan.</p>
            </div>
            <button v-if="activeMainTab === 'rfqs'" type="button" class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#014BAA] px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 cursor-pointer" @click="activeMainTab = 'queue'">
                <Plus class="size-4" />Buat tender RFQ
            </button>
        </div>

        <!-- Primary High-Level View Switcher Tabs (Identical to ProcurementPlanListView) -->
        <div class="flex items-center gap-2 overflow-x-auto border-b border-slate-200">
            <button
                type="button"
                :aria-pressed="activeMainTab === 'queue'"
                @click="activeMainTab = 'queue'"
                class="pb-3.5 px-3 text-sm font-medium whitespace-nowrap flex items-center gap-2.5 border-b-2 transition-all cursor-pointer -mb-px"
                :class="activeMainTab === 'queue'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'"
            >
                <ClipboardList class="w-4 h-4" />
                <span>Siap ditenderkan</span>
            </button>

            <button
                type="button"
                :aria-pressed="activeMainTab === 'rfqs'"
                @click="activeMainTab = 'rfqs'"
                class="pb-3.5 px-3 text-sm font-medium whitespace-nowrap flex items-center gap-2.5 border-b-2 transition-all cursor-pointer -mb-px"
                :class="activeMainTab === 'rfqs'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'"
            >
                <Scale class="w-4 h-4" />
                <span>Daftar tender</span>
            </button>
        </div>

        <!-- Tab 1: Siap ditenderkan -->
        <RfqQueueTab
            v-if="activeMainTab === 'queue'"
            v-model:queue-search="queueSearch"
            v-model:only-with-quota="onlyWithQuota"
            :filtered-queue-plans="filteredQueuePlans"
            :queue-pagination="queuePagination"
            :is-loading-queue="isLoadingQueue"
            :expanded-plans="expandedPlans"
            :queue-columns="queueColumns"
            :selected-plans-list="selectedPlansList"
            :selected-queue-company="selectedQueueCompany"
            :has-remaining-quota="hasRemainingQuota"
            :get-remaining-quota-count="getRemainingQuotaCount"
            :is-plan-selected="isPlanSelected"
            :format-date="formatDate"
            @fetch-queue="fetchQueuePlans()"
            @page-change="fetchQueuePlans($event)"
            @switch-tab="activeMainTab = $event"
            @toggle-select-plan="toggleSelectPlan"
            @toggle-expand-plan="toggleExpandPlan"
            @execute-single="handleExecuteSingleRfq"
            @execute-combined="handleExecuteCombinedRfq"
            @clear-selection="clearQueueSelection"
        />

        <!-- Tab 2: Daftar tender -->
        <RfqDocumentsTab
            v-else
            v-model:search-query="searchQuery"
            :rfqs="rfqs"
            :is-loading="isLoading"
            :selected-status="selectedStatus"
            :pagination="pagination"
            :table-columns="tableColumns"
            :status-tabs="statusTabs"
            :get-deadline-info="getDeadlineInfo"
            :format-date="formatDate"
            @status-filter="handleStatusFilter"
            @fetch-rfqs="fetchRfqs(searchQuery, 1)"
            @page-change="handlePageChange"
            @switch-tab="activeMainTab = $event"
            @go-detail="goToDetail"
            @go-comparison="goToComparison"
            @publish="handlePublish"
            @cancel="handleCancel"
        />
    </div>
</template>
