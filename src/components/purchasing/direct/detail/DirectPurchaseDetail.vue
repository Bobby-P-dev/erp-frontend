<script setup>
import { ref } from 'vue'
import DocumentWorkflowTracker from '../../../../components/approval/DocumentWorkflowTracker.vue'
import DPDetailHeaderAndStepper from './DPDetailHeaderAndStepper.vue'
import DPDetailInfoAndFinance from './DPDetailInfoAndFinance.vue'
import DPDetailItemsTable from './DPDetailItemsTable.vue'
import DPDetailModals from './DPDetailModals.vue'
import { useDirectPurchaseDetail } from '../../../../composables/purchasing/useDirectPurchaseDetail.js'

const props = defineProps({ purchaseId: { type: [String, Number], required: true } })
const emit = defineEmits(['changed'])
const activeTab = ref('summary')
const focusTab = (index) => {
    activeTab.value = tabs[(index + tabs.length) % tabs.length].key
    requestAnimationFrame(() => document.getElementById('dp-tab-' + activeTab.value)?.focus())
}
const tabs = [{ key: 'summary', label: 'Ringkasan' }, { key: 'payment', label: 'Pembayaran' }, { key: 'receipts', label: 'Penerimaan' }, { key: 'history', label: 'Persetujuan PR' }]
const {
    dp,
    isLoading,
    loadError,
    fetchDetail,
    showSubmitModal,
    showGoodsReceiptModal,
    submitForm,
    grForm,
    formatDate,
    openSubmitModal,
    confirmSubmitForPayment,
    openGoodsReceiptModal,
    confirmGoodsReceipt,
    handleCancel
} = useDirectPurchaseDetail(props.purchaseId, () => emit('changed'))
</script>

<template>
    <div class="dp-detail space-y-5 w-full min-w-0">
        <!-- Loading State -->
        <div v-if="isLoading" class="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-2xs">
            <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-sm font-medium text-slate-600">Memuat rincian Direct Purchase...</p>
        </div>

        <div v-else-if="loadError" role="alert" class="rounded-xl border border-rose-100 p-8 text-center">
            <h3 class="font-semibold text-slate-900">Detail belum dapat dimuat</h3>
            <p class="mt-2 text-sm text-slate-500">Dokumen tidak tersedia atau koneksi sedang bermasalah.</p>
            <button class="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm" @click="fetchDetail">Coba lagi</button>
        </div>
        <template v-else-if="dp">
            <DPDetailHeaderAndStepper
                :dp="dp"
                :format-date="formatDate"
                @open-submit="openSubmitModal"
                @open-grn="openGoodsReceiptModal"
                @cancel="handleCancel"
            />

            <div role="tablist" aria-label="Bagian detail pembelian" class="flex gap-1 overflow-x-auto border-b border-slate-200">
                <button v-for="(tab, index) in tabs" :id="`dp-tab-${tab.key}`" :key="tab.key" role="tab" :aria-selected="activeTab === tab.key" :tabindex="activeTab === tab.key ? 0 : -1" :aria-controls="`dp-panel-${tab.key}`" class="shrink-0 border-b-2 px-4 py-3 text-sm font-medium" :class="activeTab === tab.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'" @click="activeTab = tab.key" @keydown.right.prevent="focusTab(index + 1)" @keydown.left.prevent="focusTab(index - 1)" @keydown.home.prevent="focusTab(0)" @keydown.end.prevent="focusTab(tabs.length - 1)">{{ tab.label }}</button>
            </div>
            <section :id="`dp-panel-${activeTab}`" role="tabpanel" :aria-labelledby="`dp-tab-${activeTab}`" tabindex="0" class="min-w-0 space-y-5">
                <DPDetailInfoAndFinance v-if="activeTab !== 'history'" :section="activeTab === 'summary' ? 'seller' : activeTab" :dp="dp" :format-date="formatDate" />
                <DPDetailItemsTable v-if="activeTab === 'summary'" :dp="dp" />
                <DPDetailInfoAndFinance v-if="activeTab === 'summary'" section="costs" :dp="dp" :format-date="formatDate" />
                <p v-if="activeTab === 'payment' && !dp.payment_request" class="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Belum ada permohonan pembayaran untuk pembelian ini.</p>
                <DocumentWorkflowTracker v-if="activeTab === 'history' && dp.procurement_plan?.purchase_requisition_id" documentType="purchase_requisition" :documentId="dp.procurement_plan.purchase_requisition_id" title="Persetujuan PR terkait" auditTrailTitle="Riwayat persetujuan" />
                <p v-else-if="activeTab === 'history'" class="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Tidak ada referensi persetujuan PR pada dokumen ini.</p>
            </section>

            <DPDetailModals
                v-model:show-submit-modal="showSubmitModal"
                v-model:show-goods-receipt-modal="showGoodsReceiptModal"
                :dp="dp"
                :submit-form="submitForm"
                :gr-form="grForm"
                @confirm-submit="confirmSubmitForPayment"
                @confirm-grn="confirmGoodsReceipt"
            />
        </template>
    </div>
</template>
