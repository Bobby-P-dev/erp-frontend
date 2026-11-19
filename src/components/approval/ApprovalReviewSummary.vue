<script setup>
import { computed } from 'vue'
import { Building2, Calendar, ChevronDown, Clock, ShieldAlert, Truck, User } from '@lucide/vue'
import { formatCurrency } from '../../utils/stringUtils.js'

const props = defineProps({
    document: { type: Object, required: true },
    currency: { type: String, default: 'IDR' },
    formatDate: { type: Function, required: true },
})

const documentDivisionName = computed(() =>
    props.document.division?.name || props.document.division_name || ''
)

const requesterSecondary = computed(() => {
    const position = props.document.requester?.position?.name || (typeof props.document.requester?.position === 'string' ? props.document.requester.position : '')
    const nik = props.document.requester?.nik
    if (position && nik) return `${position} · ${nik}`
    if (position) return position
    if (nik) return `NIK ${nik}`

    const requesterDiv = props.document.requester?.division?.name
        || (typeof props.document.requester?.division === 'string' ? props.document.requester.division : '')
    if (requesterDiv && requesterDiv !== documentDivisionName.value) return requesterDiv
    return ''
})

const hasExtraDetails = computed(() =>
    Boolean(
        props.document.notes
        || props.document.requester?.nik
        || props.document.requester?.position
        || props.document.requester?.email
    )
)

const isOverdue = computed(() =>
    Boolean(props.document.is_overdue || (props.document.sla_hours_left != null && props.document.sla_hours_left < 0))
)
</script>

<template>
    <section class="review-summary" aria-label="Ringkasan pengajuan">
        <!-- Header: Keperluan & Nilai Pengajuan -->
        <div class="summary-heading">
            <div class="min-w-0 flex-1">
                <p class="summary-label">Keperluan pengajuan</p>
                <h2 class="summary-purpose">{{ document.purpose || document.document_title || 'Pengajuan dokumen' }}</h2>
                <div v-if="document.is_overdue || document.sla_hours_left != null" class="mt-2">
                    <span
                        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                        :class="isOverdue
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-amber-200 bg-amber-50/80 text-amber-800'"
                    >
                        <ShieldAlert v-if="isOverdue" class="size-3.5 shrink-0" aria-hidden="true" />
                        <Clock v-else class="size-3.5 shrink-0" aria-hidden="true" />
                        {{ isOverdue ? 'Batas waktu persetujuan terlewat' : `${document.sla_hours_left} jam tersisa untuk ditinjau` }}
                    </span>
                </div>
            </div>

            <div class="summary-amount">
                <p class="summary-label">Nilai pengajuan</p>
                <p class="mt-0.5 text-xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {{ document.total_amount != null ? formatCurrency(document.total_amount, currency) : '—' }}
                </p>
            </div>
        </div>

        <!-- Metadata Strip (3 Kolom Terpadu) -->
        <dl class="summary-metadata">
            <div class="summary-meta-cell">
                <dt class="summary-label flex items-center gap-1.5">
                    <User class="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span>Pemohon</span>
                </dt>
                <dd class="summary-value">{{ document.requester?.name || document.requester_name || '—' }}</dd>
                <dd v-if="requesterSecondary" class="summary-secondary">{{ requesterSecondary }}</dd>
            </div>

            <div class="summary-meta-cell">
                <dt class="summary-label flex items-center gap-1.5">
                    <Building2 class="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span>Perusahaan & divisi</span>
                </dt>
                <dd class="summary-value">{{ document.company?.name || document.company_name || '—' }}</dd>
                <dd class="summary-secondary">{{ documentDivisionName || '—' }}</dd>
            </div>

            <div class="summary-meta-cell">
                <dt class="summary-label flex items-center gap-1.5">
                    <Calendar class="size-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span>Tanggal pengajuan</span>
                </dt>
                <dd class="summary-value">{{ formatDate(document.request_date || document.submitted_at || document.created_at) }}</dd>
                <dd v-if="document.required_date" class="summary-secondary">Target: {{ formatDate(document.required_date) }}</dd>
            </div>
        </dl>

        <!-- Direct Supplier Box (Kompak 3 Kolom) -->
        <article
            v-if="document.procurement_route === 'direct_supplier'"
            class="mt-3.5 rounded-xl border border-blue-200/80 bg-blue-50/50 px-4 py-3.5"
        >
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-100/90 text-[#014BAA]">
                        <Truck class="size-3.5" aria-hidden="true" />
                    </span>
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-900 truncate">
                            Supplier tujuan · {{ document.direct_supplier?.name || '—' }}
                        </p>
                    </div>
                </div>
                <span class="inline-flex items-center rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#014BAA]">
                    Langsung ke PO setelah disetujui
                </span>
            </div>

            <dl class="mt-3 grid grid-cols-1 gap-3 border-t border-blue-200/60 pt-3 text-sm sm:grid-cols-3">
                <div class="min-w-0">
                    <dt class="summary-label">Referensi harga</dt>
                    <dd class="summary-value">{{ document.direct_purchase_terms?.reference || '—' }}</dd>
                </div>
                <div class="min-w-0">
                    <dt class="summary-label">Pembayaran</dt>
                    <dd class="summary-value">{{ document.direct_purchase_terms?.payment_terms || '—' }}</dd>
                </div>
                <div class="min-w-0">
                    <dt class="summary-label">Alamat pengiriman</dt>
                    <dd class="summary-value whitespace-pre-line">{{ document.direct_purchase_terms?.delivery_address || '—' }}</dd>
                </div>
            </dl>
        </article>

        <!-- Detail Pemohon & Catatan (Collapsible Pill) -->
        <details v-if="hasExtraDetails" class="summary-details mt-3.5">
            <summary>
                <span class="inline-flex items-center gap-1.5">
                    <span>Detail pemohon & catatan</span>
                    <span v-if="document.notes" class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Ada catatan</span>
                </span>
                <ChevronDown class="details-chevron size-3.5 shrink-0 text-slate-400 transition-transform" aria-hidden="true" />
            </summary>
            <dl class="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 text-sm text-slate-700 sm:grid-cols-3">
                <div v-if="document.requester?.nik">
                    <dt class="summary-label">NIK</dt>
                    <dd class="summary-value">{{ document.requester.nik }}</dd>
                </div>
                <div v-if="document.requester?.position">
                    <dt class="summary-label">Jabatan</dt>
                    <dd class="summary-value">{{ document.requester.position?.name || document.requester.position }}</dd>
                </div>
                <div v-if="document.requester?.email">
                    <dt class="summary-label">Email</dt>
                    <dd class="summary-value">{{ document.requester.email }}</dd>
                </div>
                <div v-if="document.notes" class="sm:col-span-3">
                    <dt class="summary-label">Catatan tambahan</dt>
                    <dd class="summary-value whitespace-pre-line">{{ document.notes }}</dd>
                </div>
            </dl>
        </details>
    </section>
</template>

<style scoped>
.review-summary {
    container-type: inline-size;
    padding-bottom: 18px;
    border-bottom: 1px solid #e2e8f0;
}
.summary-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
}
.summary-label {
    font-size: 11px;
    line-height: 1.5;
    color: #64748b;
    font-weight: 500;
}
.summary-purpose {
    margin-top: 2px;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.35;
    color: #0f172a;
    overflow-wrap: anywhere;
}
.summary-amount {
    flex-shrink: 0;
    text-align: right;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 10px 16px;
}
.summary-metadata {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
    overflow: hidden;
}
.summary-meta-cell {
    padding: 11px 14px;
    min-width: 0;
}
.summary-meta-cell + .summary-meta-cell {
    border-left: 1px solid #e2e8f0;
}
.summary-value {
    margin-top: 3px;
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.45;
    color: #1e293b;
    overflow-wrap: anywhere;
}
.summary-secondary {
    margin-top: 2px;
    font-size: 12px;
    line-height: 1.45;
    color: #64748b;
    overflow-wrap: anywhere;
}
.summary-details {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
    padding: 9px 12px;
    font-size: 12px;
    color: #475569;
    overflow-wrap: anywhere;
}
.summary-details summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    list-style: none;
    font-weight: 500;
    color: #475569;
}
.summary-details summary::-webkit-details-marker {
    display: none;
}
.summary-details summary:focus-visible {
    outline: 2px solid #014baa;
    outline-offset: 4px;
    border-radius: 6px;
}
.summary-details[open] > summary .details-chevron {
    transform: rotate(180deg);
}

@container (max-width: 600px) {
    .summary-heading {
        flex-direction: column;
        gap: 12px;
    }
    .summary-amount {
        width: 100%;
        text-align: left;
    }
    .summary-metadata {
        grid-template-columns: 1fr;
    }
    .summary-meta-cell + .summary-meta-cell {
        border-left: 0;
        border-top: 1px solid #e2e8f0;
    }
}
@media (prefers-reduced-motion: reduce) {
    .details-chevron {
        transition: none;
    }
}
</style>
