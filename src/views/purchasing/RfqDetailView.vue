<script setup>
import { onMounted } from 'vue'
import { useRfqDetail } from '@/composables/purchasing/useRfqDetail.js'
import { formatRfqTimestamp } from '@/utils/rfqTimestamp.js'

import BaseBreadcrumb from '@/components/ui/BaseBreadcrumb.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ReviewDisclosure from '@/components/ui/ReviewDisclosure.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import RfqLifecycleStepper from '@/components/purchasing/rfq/detail/RfqLifecycleStepper.vue'
import RfqMetadataCards from '@/components/purchasing/rfq/detail/RfqMetadataCards.vue'
import RfqItemsSuppliersTabs from '@/components/purchasing/rfq/detail/RfqItemsSuppliersTabs.vue'
import RfqManualQuotationModal from '@/components/purchasing/rfq/detail/RfqManualQuotationModal.vue'
import QuotationReviewSection from '@/components/purchasing/rfq/detail/QuotationReviewSection.vue'

import {
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
    <div class="rfq-detail min-w-0 space-y-6">
        <BaseBreadcrumb :items="[
            { label: 'Purchasing', to: { name: 'user.purchasing' } },
            { label: 'Tender RFQ', to: { name: 'user.purchasing.rfq' } },
            { label: rfq?.rfq_number || 'Detail tender' },
        ]" />
        <header class="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
            <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-3">
                    <h1 class="text-2xl font-semibold tracking-tight text-slate-900">{{ rfq?.rfq_number || 'Detail tender RFQ' }}</h1>
                    <StatusBadge v-if="rfq" :status="rfq.status" />
                </div>
                <p v-if="rfq" class="mt-2 break-words text-base text-slate-600">{{ rfq.title }}</p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
                <BaseButton variant="secondary" size="sm" @click="router.push({ name: 'user.purchasing.rfq' })"><ArrowLeft class="size-4" />Kembali</BaseButton>
                <BaseButton variant="secondary" size="sm" :disabled="loading" @click="fetchRfqDetail"><RefreshCw class="size-4" :class="{ 'animate-spin': loading }" />Muat ulang</BaseButton>
                <template v-if="rfq">
                    <BaseButton v-if="rfq.status === 'draft'" size="sm" :disabled="loading" @click="handlePublish"><Play class="size-4" />Publikasikan tender</BaseButton>
                    <BaseButton v-if="['published', 'evaluation', 'completed'].includes(rfq.status)" :variant="rfq.status === 'evaluation' ? 'primary' : 'secondary'" size="sm" :disabled="loading" @click="router.push({ name: 'user.purchasing.rfq.comparison', params: { id: rfq.id } })"><Scale class="size-4" />{{ rfq.status === 'completed' ? 'Hasil perbandingan' : 'Bandingkan penawaran' }}</BaseButton>
                    <BaseButton v-if="rfq.status === 'published'" size="sm" :disabled="loading" @click="handleStartEvaluation"><CheckCheck class="size-4" />Mulai evaluasi</BaseButton>
                    <template v-if="rfq.status === 'completed'">
                        <BaseButton v-if="hasUnconvertedAwardedItems" size="sm" :disabled="loading || generatingPo || poValidityErrors.length > 0" @click="handleGeneratePoFromDetail"><FileText class="size-4" />{{ generatingPo ? 'Menerbitkan PO…' : 'Terbitkan PO' }}</BaseButton>
                        <BaseButton v-else-if="purchaseOrdersList.length === 1" size="sm" @click="router.push({ name: 'user.purchasing.orders.detail', params: { id: purchaseOrdersList[0].id } })"><FileText class="size-4" />Buka {{ purchaseOrdersList[0].po_number || 'PO' }}</BaseButton>
                        <BaseButton v-else-if="purchaseOrdersList.length > 1" size="sm" @click="router.push({ name: 'user.purchasing.orders', query: { rfq_id: rfq.id } })"><FileText class="size-4" />Lihat {{ purchaseOrdersList.length }} PO</BaseButton>
                    </template>
                </template>
            </div>
        </header>

        <!-- Loading State -->
        <div v-if="loading && !rfq" class="p-12 text-center bg-white rounded-xl border border-slate-200">
            <RefreshCw class="w-8 h-8 mx-auto text-blue-600 animate-spin mb-3" />
            <p class="text-sm text-slate-500 font-medium">Memuat rincian tender RFQ...</p>
        </div>

        <div v-else-if="!rfq" role="alert" class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Detail tender belum dapat dimuat. Gunakan tombol Muat ulang untuk mencoba kembali.</div>
        <template v-else-if="rfq">
            <div v-if="hasUnconvertedAwardedItems && poValidityErrors.length" role="alert" class="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                <p class="font-medium">Penawaran terpilih belum memenuhi syarat pembuatan PO.</p>
                <details class="mt-2">
                    <summary class="cursor-pointer underline underline-offset-4">Lihat alasan & tindak lanjut</summary>
                    <ul class="mt-3 list-disc space-y-2 pl-5"><li v-for="reason in poValidityErrors" :key="reason">{{ reason }}</li></ul>
                    <p class="mt-3">Periksa penawaran pada hasil perbandingan atau muat ulang data. PO yang sudah dibuat tetap tersimpan.</p>
                </details>
            </div>
            <p v-if="rfq.status === 'cancelled'" class="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertTriangle class="size-5 shrink-0" />Tender telah dibatalkan dan tidak menerima penawaran atau penetapan pemenang.</p>
            <p v-if="['published', 'evaluation'].includes(rfq.status)" class="text-sm" :class="deadlineInfo.canRespond ? 'text-slate-600' : 'text-amber-900'" :role="!deadlineInfo.canRespond ? 'alert' : undefined">{{ deadlineInfo.label }}<span v-if="!deadlineInfo.canRespond"> · {{ deadlineInfo.reason }}</span></p>

            <RfqMetadataCards
                :rfq="rfq"
                :invited-suppliers-count="invitedSuppliers.length"
                :quotations-count="quotationsList.length"
                :total-target-hps="totalTargetHps"
            />

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
            >
                <template #review>
                    <QuotationReviewSection :key="rfq.id" :quotations="quotationsList" :disabled="loading" :reload="fetchRfqDetail" />
                </template>
            </RfqItemsSuppliersTabs>

            <RfqLifecycleStepper :rfq="rfq" :steps="steps" :deadline-info="deadlineInfo" :get-step-state="getStepState" />

            <ReviewDisclosure v-if="['draft', 'published', 'evaluation'].includes(rfq.status)" title="Pengaturan tender" description="Perpanjangan batas penawaran dan pembatalan tender">
                <div v-if="['published', 'evaluation'].includes(rfq.status)" class="space-y-4 text-sm">
                    <p class="text-slate-600">Batas respons: {{ rfq.deadline_date || 'belum ditentukan' }}, sampai akhir hari WIB.</p>
                    <BaseButton variant="secondary" size="sm" :disabled="extensionSubmitting || loading" :aria-expanded="extensionOpen" @click="extensionOpen = !extensionOpen">{{ extensionOpen ? 'Tutup formulir perpanjangan' : 'Perpanjang deadline' }}</BaseButton>
                    <form v-if="extensionOpen" class="space-y-4 rounded-xl bg-slate-50 p-5" @submit.prevent="submitDeadlineExtension">
                        <label class="block text-slate-700">Deadline baru (akhir hari WIB)<input v-model="extensionForm.deadline_date" type="date" required :min="rfq.deadline_date || undefined" :disabled="extensionSubmitting" class="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 sm:max-w-sm" /></label>
                        <label class="block text-slate-700">Alasan perpanjangan<textarea v-model="extensionForm.reason" required maxlength="2000" rows="3" :disabled="extensionSubmitting" class="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3"></textarea></label>
                        <p class="text-slate-500">Tanggal baru harus setelah batas lama dan tidak sebelum hari ini WIB. Undangan tetap berlaku; respons yang sudah diterima atau ditolak tidak dibuka ulang.</p>
                        <div class="flex flex-wrap gap-2"><BaseButton type="button" variant="secondary" size="sm" :disabled="extensionSubmitting" @click="extensionOpen = false">Batal</BaseButton><BaseButton type="submit" size="sm" :disabled="extensionSubmitting">{{ extensionSubmitting ? 'Menyimpan…' : 'Simpan perpanjangan' }}</BaseButton></div>
                    </form>
                </div>
                <div class="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                    <p class="text-sm text-slate-600">Batalkan jika kebutuhan tender tidak dilanjutkan.</p>
                    <BaseButton variant="secondary" size="sm" class="border-rose-200 text-rose-700 hover:bg-rose-50" :disabled="loading || extensionSubmitting" @click="handleCancel"><Ban class="size-4" />Batalkan tender</BaseButton>
                </div>
            </ReviewDisclosure>
            <ReviewDisclosure v-if="deadlineExtensions.length" title="Riwayat perpanjangan" :description="`${deadlineExtensions.length} perubahan batas penawaran`">
                <ol class="space-y-4 text-sm text-slate-600"><li v-for="entry in deadlineExtensions" :key="entry.id" class="border-t border-slate-100 pt-4"><p class="font-medium text-slate-800">{{ entry.previous_deadline_date || 'Belum ditentukan' }} → {{ entry.deadline_date }} (WIB)</p><p class="mt-2 whitespace-pre-line">{{ entry.reason }}</p><p class="mt-2 text-slate-500">User #{{ entry.changed_by }} · {{ formatRfqTimestamp(entry.created_at) }}</p></li></ol>
            </ReviewDisclosure>
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

<style scoped>
.rfq-detail :deep(button) { font-weight: 500; }
.rfq-detail :deep(summary:focus-visible) { outline: 2px solid #014baa; outline-offset: 3px; }
</style>
