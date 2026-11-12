<script setup>
import { RouterLink } from 'vue-router'
import { ExternalLink } from '@lucide/vue'
import ReviewDisclosure from '@/components/ui/ReviewDisclosure.vue'
import { formatCurrency, formatDate } from '@/composables/useFormatter.js'
import { formatRfqTimestamp } from '@/utils/rfqTimestamp.js'

defineProps({
    rfq: {
        type: Object,
        required: true,
    },
    invitedSuppliersCount: {
        type: Number,
        default: 0,
    },
    quotationsCount: {
        type: Number,
        default: 0,
    },
    totalTargetHps: {
        type: Number,
        default: 0,
    },
})
</script>

<template>
    <section aria-label="Ringkasan tender" class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <dl class="grid gap-6 sm:grid-cols-3">
            <div><dt class="text-sm text-slate-500">Batas penawaran</dt><dd class="mt-2 text-base font-medium text-slate-900">{{ rfq.deadline_date ? formatDate(rfq.deadline_date) : 'Belum ditentukan' }}<span v-if="rfq.deadline_date" class="mt-1 block text-sm font-normal text-slate-500">Sampai akhir hari WIB</span></dd></div>
            <div><dt class="text-sm text-slate-500">Penawaran diterima</dt><dd class="mt-2 text-base font-medium text-slate-900">{{ quotationsCount }} <span class="font-normal text-slate-500">dari {{ invitedSuppliersCount }} supplier</span></dd></div>
            <div><dt class="text-sm text-slate-500">Estimasi kebutuhan (HPS)</dt><dd class="mt-2 text-base font-semibold tabular-nums text-slate-900">{{ formatCurrency(totalTargetHps) }}</dd></div>
        </dl>
        <div class="mt-6 border-t border-slate-100 pt-5 metadata-disclosure">
            <ReviewDisclosure title="Informasi & ketentuan tender" description="Dokumen sumber, pembayaran, pengiriman, dan pembuat dokumen">
                <dl class="grid gap-x-8 gap-y-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div><dt class="text-slate-500">Tanggal terbit</dt><dd class="mt-2 text-slate-800">{{ rfq.issue_date ? formatDate(rfq.issue_date) : 'Belum diterbitkan' }}</dd></div>
                    <div><dt class="text-slate-500">Pembayaran yang diminta</dt><dd class="mt-2 text-slate-800">{{ rfq.payment_terms_requested || 'Belum ditentukan' }}</dd></div>
                    <div><dt class="text-slate-500">Alamat pengiriman</dt><dd class="mt-2 whitespace-pre-line break-words text-slate-800">{{ rfq.delivery_address || 'Belum ditentukan' }}</dd></div>
                    <div v-if="rfq.procurement_plan"><dt class="text-slate-500">Rencana pengadaan <span v-if="rfq.is_multi_source || rfq.procurement_plan.is_consolidated">· Konsolidasi</span></dt><dd class="mt-2 space-y-2 text-slate-800">
                        <p v-if="rfq.source_pp_numbers?.length" class="break-words">{{ rfq.source_pp_numbers.join(', ') }}</p>
                        <RouterLink :to="{ name: 'user.purchasing.plans.detail', params: { id: rfq.procurement_plan_id } }" class="inline-flex items-center gap-2 text-blue-700 underline underline-offset-4">{{ rfq.procurement_plan.pp_number || rfq.procurement_plan.plan_number || `PP #${rfq.procurement_plan_id}` }}<ExternalLink class="size-4 shrink-0" /></RouterLink>
                    </dd></div>
                    <div v-if="rfq.source_pr_numbers?.length || rfq.procurement_plan?.pr_numbers?.length"><dt class="text-slate-500">PR sumber</dt><dd class="mt-2 break-words text-slate-800">{{ (rfq.source_pr_numbers?.length ? rfq.source_pr_numbers : rfq.procurement_plan.pr_numbers).join(', ') }}</dd></div>
                    <div><dt class="text-slate-500">Dibuat oleh</dt><dd class="mt-2 text-slate-800">{{ rfq.created_by_user?.name || (rfq.created_by ? `User #${rfq.created_by}` : 'Belum tersedia') }}<span v-if="rfq.created_at" class="mt-1 block text-slate-500">{{ formatRfqTimestamp(rfq.created_at) }}</span></dd></div>
                </dl>
            </ReviewDisclosure>
        </div>
    </section>
</template>

<style scoped>
.metadata-disclosure :deep(.review-disclosure) { border: 0; border-radius: 0; }
.metadata-disclosure :deep(summary) { padding: 0; }
.metadata-disclosure :deep(.disclosure-content) { padding: 24px 0 0; }
.metadata-disclosure :deep(.text-xs) { font-size: 14px; }
</style>
