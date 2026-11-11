<script setup>
import PageHeader from '../../components/ui/PageHeader.vue'
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
    readyQueueCount,
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
    stats,
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
        <!-- Page Header (Consistent with ProcurementPlanListView) -->
        <PageHeader
            title="Tender Pengadaan (Request for Quotation / RFQ)"
            description="Pilih Rencana Pengadaan (PP) bertipe RFQ untuk dibuatkan paket lelang multi-vendor, pantau penawaran masuk, dan evaluasi pemenang."
            :breadcrumbs="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Tender RFQ' }
            ]"
        >
            <template #actions>
                <button
                    v-if="activeMainTab === 'rfqs'"
                    type="button"
                    @click="activeMainTab = 'queue'"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-200 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                    <Plus class="w-4 h-4" />
                    <span>Pilih Rencana untuk Ditenderkan</span>
                </button>
                <div v-else class="text-xs text-slate-500 bg-blue-50/70 border border-blue-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                    <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                    <span>Pilih salah satu Rencana Pengadaan di bawah ini untuk membuat paket RFQ</span>
                </div>
            </template>
        </PageHeader>

        <!-- Primary High-Level View Switcher Tabs (Identical to ProcurementPlanListView) -->
        <div class="flex items-center gap-2 border-b border-slate-200">
            <button
                type="button"
                @click="activeMainTab = 'queue'"
                class="pb-3.5 px-3 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all cursor-pointer -mb-px"
                :class="activeMainTab === 'queue'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'"
            >
                <ClipboardList class="w-4 h-4" />
                <span>Rencana Siap Ditenderkan</span>
                <span
                    class="px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-colors"
                    :class="activeMainTab === 'queue'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'"
                >
                    {{ readyQueueCount }}
                </span>
            </button>

            <button
                type="button"
                @click="activeMainTab = 'rfqs'"
                class="pb-3.5 px-3 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all cursor-pointer -mb-px"
                :class="activeMainTab === 'rfqs'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'"
            >
                <Scale class="w-4 h-4" />
                <span>Dokumen Tender RFQ</span>
                <span
                    class="px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-colors"
                    :class="activeMainTab === 'rfqs'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'"
                >
                    {{ stats.total }}
                </span>
            </button>
        </div>

        <!-- Tab 1: Rencana Siap Ditenderkan -->
        <RfqQueueTab
            v-if="activeMainTab === 'queue'"
            v-model:queue-search="queueSearch"
            v-model:only-with-quota="onlyWithQuota"
            :filtered-queue-plans="filteredQueuePlans"
            :ready-queue-count="readyQueueCount"
            :is-loading-queue="isLoadingQueue"
            :expanded-plans="expandedPlans"
            :queue-columns="queueColumns"
            :selected-plans-list="selectedPlansList"
            :selected-queue-company="selectedQueueCompany"
            :has-remaining-quota="hasRemainingQuota"
            :get-remaining-quota-count="getRemainingQuotaCount"
            :is-plan-selected="isPlanSelected"
            :format-date="formatDate"
            @fetch-queue="fetchQueuePlans"
            @switch-tab="activeMainTab = $event"
            @toggle-select-plan="toggleSelectPlan"
            @toggle-expand-plan="toggleExpandPlan"
            @execute-single="handleExecuteSingleRfq"
            @execute-combined="handleExecuteCombinedRfq"
            @clear-selection="clearQueueSelection"
        />

        <!-- Tab 2: Dokumen Tender RFQ -->
        <RfqDocumentsTab
            v-else
            v-model:search-query="searchQuery"
            :rfqs="rfqs"
            :is-loading="isLoading"
            :selected-status="selectedStatus"
            :pagination="pagination"
            :stats="stats"
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
