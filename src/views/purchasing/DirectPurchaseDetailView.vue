<script setup>
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import DocumentWorkflowTracker from '../../components/approval/DocumentWorkflowTracker.vue'
import DPDetailHeaderAndStepper from '../../components/purchasing/direct/detail/DPDetailHeaderAndStepper.vue'
import DPDetailInfoAndFinance from '../../components/purchasing/direct/detail/DPDetailInfoAndFinance.vue'
import DPDetailItemsTable from '../../components/purchasing/direct/detail/DPDetailItemsTable.vue'
import DPDetailModals from '../../components/purchasing/direct/detail/DPDetailModals.vue'
import { useDirectPurchaseDetail } from '../../composables/purchasing/useDirectPurchaseDetail.js'

const {
    dp,
    isLoading,
    bankAccounts,
    showSubmitModal,
    showDisburseModal,
    showGoodsReceiptModal,
    submitForm,
    disburseForm,
    grForm,
    tableColumns,
    formatDate,
    openSubmitModal,
    confirmSubmitForPayment,
    openDisburseModal,
    confirmDisburse,
    openGoodsReceiptModal,
    confirmGoodsReceipt,
    handleCancel
} = useDirectPurchaseDetail()
</script>

<template>
    <div class="space-y-6 w-full pb-16">
        <!-- Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Direct Purchases', to: { name: 'user.purchasing.direct' } },
                { label: dp?.dp_number || 'Detail Transaksi' }
            ]" 
        />

        <!-- Loading State -->
        <div v-if="isLoading" class="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-2xs">
            <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-sm font-medium text-slate-600">Memuat rincian Direct Purchase...</p>
        </div>

        <template v-else-if="dp">
            <DPDetailHeaderAndStepper
                :dp="dp"
                :format-date="formatDate"
                @open-submit="openSubmitModal"
                @open-disburse="openDisburseModal"
                @open-grn="openGoodsReceiptModal"
                @cancel="handleCancel"
            />

            <DPDetailInfoAndFinance
                :dp="dp"
                :format-date="formatDate"
                @open-disburse="openDisburseModal"
                @open-grn="openGoodsReceiptModal"
            />

            <!-- Associated PR Approval Workflow & History -->
            <DocumentWorkflowTracker
                v-if="dp.procurement_plan?.purchase_requisition_id"
                documentType="purchase_requisition"
                :documentId="dp.procurement_plan?.purchase_requisition_id"
                title="Progres Alur Persetujuan Dokumen PR Terkait (Workflow)"
                auditTrailTitle="Jejak Audit Persetujuan PR Terkait (Audit Trail)"
            />

            <DPDetailItemsTable
                :dp="dp"
                :table-columns="tableColumns"
            />

            <DPDetailModals
                v-model:show-submit-modal="showSubmitModal"
                v-model:show-disburse-modal="showDisburseModal"
                v-model:show-goods-receipt-modal="showGoodsReceiptModal"
                :dp="dp"
                :submit-form="submitForm"
                :disburse-form="disburseForm"
                :gr-form="grForm"
                :bank-accounts="bankAccounts"
                @confirm-submit="confirmSubmitForPayment"
                @confirm-disburse="confirmDisburse"
                @confirm-grn="confirmGoodsReceipt"
            />
        </template>
    </div>
</template>
