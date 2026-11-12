<script setup>
import { Clock, ShieldAlert } from '@lucide/vue'
import { formatCurrency } from '../../utils/stringUtils.js'

defineProps({
    document: { type: Object, required: true },
    currency: { type: String, default: 'IDR' },
    formatDate: { type: Function, required: true },
})
</script>

<template>
    <section class="review-summary" aria-label="Ringkasan pengajuan">
        <div class="summary-heading">
            <div class="min-w-0">
                <p class="summary-label">Keperluan pengajuan</p>
                <h2 class="summary-purpose">{{ document.purpose || document.document_title || 'Pengajuan dokumen' }}</h2>
            </div>
            <div class="summary-amount">
                <p class="summary-label">Nilai pengajuan</p>
                <p class="text-lg font-semibold text-slate-900 tabular-nums">{{ document.total_amount != null ? formatCurrency(document.total_amount, currency) : '—' }}</p>
            </div>
        </div>
        <dl class="summary-metadata">
            <div>
                <dt class="summary-label">Pemohon</dt>
                <dd class="summary-value">{{ document.requester?.name || document.requester_name || '—' }}</dd>
                <dd class="summary-secondary">{{ document.requester?.division?.name || (typeof document.requester?.division === 'string' ? document.requester.division : '') || document.division_name || '' }}</dd>
            </div>
            <div>
                <dt class="summary-label">Perusahaan & divisi</dt>
                <dd class="summary-value">{{ document.company?.name || document.company_name || '—' }}</dd>
                <dd class="summary-secondary">{{ document.division?.name || document.division_name || '—' }}</dd>
            </div>
            <div>
                <dt class="summary-label">Tanggal pengajuan</dt>
                <dd class="summary-value">{{ formatDate(document.request_date || document.submitted_at || document.created_at) }}</dd>
                <dd v-if="document.required_date" class="summary-secondary">Target: {{ formatDate(document.required_date) }}</dd>
            </div>
        </dl>
        <div v-if="document.is_overdue || document.sla_hours_left != null" class="mt-4 flex items-center gap-1.5 text-xs" :class="document.is_overdue || document.sla_hours_left < 0 ? 'text-rose-700' : 'text-slate-500'">
            <ShieldAlert v-if="document.is_overdue || document.sla_hours_left < 0" class="size-3.5" aria-hidden="true" />
            <Clock v-else class="size-3.5" aria-hidden="true" />
            {{ document.is_overdue || document.sla_hours_left < 0 ? 'Batas waktu persetujuan terlewat' : `${document.sla_hours_left} jam tersisa untuk ditinjau` }}
        </div>
        <details v-if="document.notes || document.requester?.nik || document.requester?.position || document.requester?.email" class="summary-details">
            <summary>Detail pemohon & catatan</summary>
            <dl class="mt-3 space-y-2 text-sm text-slate-600">
                <div v-if="document.requester?.nik"><dt class="summary-label">NIK</dt><dd>{{ document.requester.nik }}</dd></div>
                <div v-if="document.requester?.position"><dt class="summary-label">Jabatan</dt><dd>{{ document.requester.position?.name || document.requester.position }}</dd></div>
                <div v-if="document.requester?.email"><dt class="summary-label">Email</dt><dd>{{ document.requester.email }}</dd></div>
                <div v-if="document.notes"><dt class="summary-label">Catatan tambahan</dt><dd class="whitespace-pre-line">{{ document.notes }}</dd></div>
            </dl>
        </details>
    </section>
</template>

<style scoped>
.review-summary { padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
.summary-heading { display: flex; justify-content: space-between; gap: 24px; }
.summary-label { font-size: 12px; line-height: 1.6; color: #64748b; font-weight: 400; }
.summary-purpose { margin-top: 4px; font-size: 20px; font-weight: 600; line-height: 1.5; color: #0f172a; overflow-wrap: anywhere; }
.summary-amount { flex-shrink: 0; text-align: right; }
.summary-metadata { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-top: 24px; }
.summary-value { margin-top: 5px; font-size: 14px; line-height: 1.6; color: #334155; overflow-wrap: anywhere; }
.summary-secondary { margin-top: 3px; font-size: 12px; line-height: 1.6; color: #64748b; overflow-wrap: anywhere; }
.summary-details { margin-top: 16px; font-size: 12px; color: #64748b; overflow-wrap: anywhere; }
.summary-details summary { cursor: pointer; width: fit-content; }
.summary-details summary:focus-visible { outline: 2px solid #014baa; outline-offset: 4px; }
@media (max-width: 640px) {
    .summary-heading { flex-direction: column; gap: 16px; }
    .summary-amount { text-align: left; }
    .summary-metadata { grid-template-columns: 1fr; gap: 16px; margin-top: 20px; }
}
</style>
