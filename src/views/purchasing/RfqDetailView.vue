<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useRfqDetail } from '@/composables/purchasing/useRfqDetail.js'
import { formatRfqTimestamp } from '@/utils/rfqTimestamp.js'

import PageHeader from '@/components/ui/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import RfqLifecycleStepper from '@/components/purchasing/rfq/detail/RfqLifecycleStepper.vue'
import RfqMetadataCards from '@/components/purchasing/rfq/detail/RfqMetadataCards.vue'
import RfqItemsSuppliersTabs from '@/components/purchasing/rfq/detail/RfqItemsSuppliersTabs.vue'
import RfqManualQuotationModal from '@/components/purchasing/rfq/detail/RfqManualQuotationModal.vue'
import QuotationReviewSection from '@/components/purchasing/rfq/detail/QuotationReviewSection.vue'

import {
    Home,
    ChevronRight,
    ArrowLeft,
    Scale,
    FileText,
    Play,
    Ban,
    RefreshCw,
    CheckCheck,
    AlertTriangle,
} from '@lucide/vue'

const {
    router,
    loading,
    rfq,
    activeTab,
    copiedToken,
    isModalOpen,
    modalSubmitting,
    taxes,
    uploadingFile,
    manualForm,
    steps,
    totalTargetHps,
    invitedSuppliers,
    quotationsList,
    purchaseOrdersList,
    hasUnconvertedAwardedItems,
    poValidityErrors,
    generatingPo,
    deadlineInfo,
    modalItemsSubtotal,
    selectedTaxRate,
    modalTaxAmount,
    modalGrandTotal,
    fetchRfqDetail,
    fetchTaxes,
    getStepState,
    handleGeneratePoFromDetail,
    copyMagicLink,
    handlePublish,
    handleStartEvaluation,
    handleCancel,
    openManualModal,
    closeModal,
    handleFileUpload,
    submitManualQuotation,
    extensionOpen,
    extensionSubmitting,
    extensionForm,
    deadlineExtensions,
    submitDeadlineExtension,
    sendingInvitation,
    handleSendInvitation,
} = useRfqDetail()

onMounted(() => {
    fetchRfqDetail()
    fetchTaxes()
})
</script>

<template>
    <div class="space-y-6">
        <PageHeader 
            :title="rfq ? `${rfq.rfq_number} — ${rfq.title}` : 'Detail Tender RFQ'" 
            subtitle="Pusat kendali tender, undangan vendor, dan pencatatan penawaran harga"
        >
            <template #breadcrumbs>
                <div class="flex items-center gap-2 text-xs text-slate-500">
                    <RouterLink :to="{ name: 'user.dashboard' }" class="hover:text-blue-600">
                        <Home class="w-3.5 h-3.5" />
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span>Purchasing</span>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <RouterLink :to="{ name: 'user.purchasing.rfq' }" class="hover:text-blue-600">
                        Tender RFQ
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span class="text-slate-800 font-medium">{{ rfq?.rfq_number || 'Detail' }}</span>
                </div>
            </template>

            <template #actions>
                <div class="flex items-center gap-2.5">
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="router.push({ name: 'user.purchasing.rfq' })"
                        class="text-slate-600"
                    >
                        <ArrowLeft class="w-4 h-4 mr-1.5" />
                        Kembali
                    </BaseButton>

                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="fetchRfqDetail"
                        :disabled="loading"
                    >
                        <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': loading }" />
                        Segarkan
                    </BaseButton>

                    <template v-if="rfq">
                        <template v-if="rfq.status === 'draft'">
                            <BaseButton
                                variant="destructive"
                                size="sm"
                                @click="handleCancel"
                            >
                                <Ban class="w-4 h-4 mr-1.5" />
                                Batalkan Tender
                            </BaseButton>
                            <BaseButton
                                variant="primary"
                                size="sm"
                                @click="handlePublish"
                                class="bg-blue-600 hover:bg-blue-700"
                            >
                                <Play class="w-4 h-4 mr-1.5" />
                                Publikasikan Tender
                            </BaseButton>
                        </template>

                        <template v-else-if="rfq.status === 'published'">
                            <BaseButton
                                variant="destructive"
                                size="sm"
                                @click="handleCancel"
                            >
                                <Ban class="w-4 h-4 mr-1.5" />
                                Batalkan Tender
                            </BaseButton>
                            <BaseButton
                                variant="outline"
                                size="sm"
                                @click="router.push({ name: 'user.purchasing.rfq.comparison', params: { id: rfq.id } })"
                                class="border-blue-600 text-blue-700 hover:bg-blue-50"
                            >
                                <Scale class="w-4 h-4 mr-1.5" />
                                Matriks Komparasi
                            </BaseButton>
                            <BaseButton
                                variant="primary"
                                size="sm"
                                @click="handleStartEvaluation"
                                class="bg-blue-600 hover:bg-blue-700"
                            >
                                <CheckCheck class="w-4 h-4 mr-1.5" />
                                Mulai Evaluasi Penawaran
                            </BaseButton>
                        </template>

                        <template v-else-if="rfq.status === 'evaluation'">
                            <BaseButton
                                variant="destructive"
                                size="sm"
                                @click="handleCancel"
                            >
                                <Ban class="w-4 h-4 mr-1.5" />
                                Batalkan Tender
                            </BaseButton>
                            <BaseButton
                                variant="primary"
                                size="sm"
                                @click="router.push({ name: 'user.purchasing.rfq.comparison', params: { id: rfq.id } })"
                                class="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <Scale class="w-4 h-4 mr-1.5" />
                                Buka Matriks Komparasi
                            </BaseButton>
                        </template>

                        <template v-else-if="rfq.status === 'completed'">
                            <BaseButton
                                variant="outline"
                                size="sm"
                                @click="router.push({ name: 'user.purchasing.rfq.comparison', params: { id: rfq.id } })"
                                class="border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                <Scale class="w-4 h-4 mr-1.5" />
                                Hasil Perbandingan Harga
                            </BaseButton>
                            <BaseButton
                                v-if="hasUnconvertedAwardedItems"
                                variant="primary"
                                size="sm"
                                @click="handleGeneratePoFromDetail"
                                :disabled="loading || generatingPo || poValidityErrors.length > 0"
                                class="bg-emerald-700 hover:bg-emerald-800 text-white"
                            >
                                <FileText class="w-4 h-4 mr-1.5" />
                                Terbitkan Purchase Order (PO)
                            </BaseButton>
                            <BaseButton
                                v-else-if="purchaseOrdersList.length === 1"
                                variant="primary"
                                size="sm"
                                @click="router.push({ name: 'user.purchasing.orders.detail', params: { id: purchaseOrdersList[0].id } })"
                                class="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <FileText class="w-4 h-4 mr-1.5" />
                                Buka PO ({{ purchaseOrdersList[0].po_number }})
                            </BaseButton>
                            <BaseButton
                                v-else-if="purchaseOrdersList.length > 1"
                                variant="primary"
                                size="sm"
                                @click="router.push({ name: 'user.purchasing.orders', query: { rfq_id: rfq.id } })"
                                class="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <FileText class="w-4 h-4 mr-1.5" />
                                Lihat {{ purchaseOrdersList.length }} Dokumen PO
                            </BaseButton>
                        </template>
                    </template>
                </div>
            </template>
        </PageHeader>

        <!-- Loading State -->
        <div v-if="loading && !rfq" class="p-12 text-center bg-white rounded-xl border border-slate-200">
            <RefreshCw class="w-8 h-8 mx-auto text-blue-600 animate-spin mb-3" />
            <p class="text-sm text-slate-500 font-medium">Memuat rincian tender RFQ...</p>
        </div>

        <template v-else-if="rfq">
            <section v-if="['published', 'evaluation'].includes(rfq.status)" class="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <p class="text-sm text-slate-700">Batas respons: {{ rfq.deadline_date || 'belum ditentukan' }}, sampai akhir hari WIB. {{ deadlineInfo.label }}</p>
                <p v-if="!deadlineInfo.canRespond" role="alert" class="text-sm text-amber-800">{{ deadlineInfo.reason }}</p>
                <BaseButton variant="outline" size="sm" :disabled="extensionSubmitting" @click="extensionOpen = !extensionOpen">Perpanjang deadline</BaseButton>
                <form v-if="extensionOpen" class="space-y-3" @submit.prevent="submitDeadlineExtension">
                    <label class="block text-sm">Deadline baru (akhir hari WIB)
                        <input v-model="extensionForm.deadline_date" type="date" required :min="rfq.deadline_date || undefined" :disabled="extensionSubmitting" class="block border border-slate-300 rounded-lg p-2 mt-1" />
                    </label>
                    <label class="block text-sm">Alasan perpanjangan
                        <textarea v-model="extensionForm.reason" required maxlength="2000" :disabled="extensionSubmitting" class="block w-full border border-slate-300 rounded-lg p-2 mt-1"></textarea>
                    </label>
                    <p class="text-xs text-slate-500">Tanggal baru harus setelah deadline lama dan tidak sebelum hari ini WIB. Token undangan tetap; respons yang sudah diterima atau ditolak tidak dibuka ulang.</p>
                    <BaseButton type="submit" :disabled="extensionSubmitting">{{ extensionSubmitting ? 'Menyimpan...' : 'Simpan perpanjangan' }}</BaseButton>
                </form>
            </section>
            <details v-if="deadlineExtensions.length" class="p-4 rounded-xl border border-slate-200 bg-white text-sm">
                <summary class="cursor-pointer font-semibold">Riwayat perpanjangan deadline</summary>
                <p v-for="entry in deadlineExtensions" :key="entry.id" class="mt-2">{{ entry.previous_deadline_date || 'Belum ditentukan' }} → {{ entry.deadline_date }} (WIB): {{ entry.reason }} — User #{{ entry.changed_by }}, {{ formatRfqTimestamp(entry.created_at) }}</p>
            </details>
            <div v-if="hasUnconvertedAwardedItems && poValidityErrors.length" role="alert" class="p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900 space-y-1">
                <p>PO baru belum dapat dibuat. Periksa masa berlaku quotation pada Matriks Komparasi atau segarkan data.</p>
                <p v-for="reason in poValidityErrors" :key="reason">{{ reason }}</p>
                <p>PO yang sudah dibuat tetap menjadi komitmen tersimpan.</p>
            </div>
            <!-- Cancelled Notice Banner -->
            <div 
                v-if="rfq.status === 'cancelled'"
                class="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3"
            >
                <AlertTriangle class="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                <div>
                    <h3 class="text-sm font-semibold text-rose-800">Tender Ini Telah Dibatalkan</h3>
                    <p class="text-xs text-rose-700 mt-0.5">
                        Tender RFQ ini telah dibatalkan dan tidak lagi menerima penawaran atau proses awarding.
                    </p>
                </div>
            </div>

            <RfqLifecycleStepper
                :rfq="rfq"
                :steps="steps"
                :deadline-info="deadlineInfo"
                :get-step-state="getStepState"
            />

            <RfqMetadataCards
                :rfq="rfq"
                :invited-suppliers-count="invitedSuppliers.length"
                :quotations-count="quotationsList.length"
                :total-target-hps="totalTargetHps"
            />

            <QuotationReviewSection :key="rfq.id" :quotations="quotationsList" :disabled="loading" :reload="fetchRfqDetail" />

            <RfqItemsSuppliersTabs
                :sending-invitation="sendingInvitation"
                @send-invitation="handleSendInvitation"
                @refresh-invitations="fetchRfqDetail"
                :can-receive-quotation="deadlineInfo.canRespond"
                :rfq="rfq"
                v-model:activeTab="activeTab"
                :invited-suppliers="invitedSuppliers"
                :total-target-hps="totalTargetHps"
                :copied-token="copiedToken"
                @open-manual-modal="openManualModal"
                @copy-magic-link="copyMagicLink"
            />
        </template>

        <RfqManualQuotationModal
            :is-open="isModalOpen"
            :manual-form="manualForm"
            :invited-suppliers="invitedSuppliers"
            :taxes="taxes"
            :uploading-file="uploadingFile"
            :modal-submitting="modalSubmitting"
            :modal-items-subtotal="modalItemsSubtotal"
            :selected-tax-rate="selectedTaxRate"
            :modal-tax-amount="modalTaxAmount"
            :modal-grand-total="modalGrandTotal"
            @close="closeModal"
            @file-upload="handleFileUpload"
            @submit="submitManualQuotation"
        />
    </div>
</template>
