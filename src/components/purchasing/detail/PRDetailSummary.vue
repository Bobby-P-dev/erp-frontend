<script setup>
import { computed } from 'vue'
import {
    Calendar,
    Building2,
    Briefcase,
    Mail,
    Route
} from '@lucide/vue'
import { formatCurrency, formatDate } from '../../../composables/useFormatter.js'

const props = defineProps({
    item: {
        type: Object,
        required: true
    }
})

const requesterProfile = computed(() => {
    const r = props.item?.requester
    const emp = r?.employee
    const name = emp?.name || r?.name || 'Staff Pemohon'
    const words = name.trim().split(/\s+/)
    const initials = words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase()

    return {
        name,
        initials,
        nik: emp?.nik || null,
        email: emp?.email || r?.email || null,
        position: emp?.position?.name || null,
        jobLevel: emp?.job_level?.name || null,
        division: props.item?.division?.name || emp?.division?.name || null,
        company: props.item?.company?.name || emp?.company?.name || null,
    }
})

const totalCalculated = computed(() => {
    if (props.item?.total_estimated_amount && Number(props.item.total_estimated_amount) > 0) {
        return Number(props.item.total_estimated_amount)
    }
    const items = props.item?.items || []
    return items.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.estimated_price) || 0)), 0)
})

const isApproved = computed(() => {
    const approvedStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed']
    return approvedStatuses.includes(props.item?.status)
})

const totalLabel = computed(() => {
    if (isApproved.value) return 'Total Disetujui'
    if (props.item?.procurement_route === 'direct_supplier') return 'Total Harga Disepakati'
    return 'Total Estimasi Biaya'
})
</script>

<template>
    <div class="space-y-4">
        <!-- Highlight Bar Utama (Ringkas & Sekilas Langsung Terbaca) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <div>
                <span class="text-xs font-medium text-slate-500 block">{{ totalLabel }}</span>
                <p class="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 break-all">
                    {{ formatCurrency(totalCalculated, item.currency) }}
                </p>
                <span class="text-xs text-slate-500 mt-0.5 block">
                    {{ item.items?.length || 0 }} item barang / jasa
                </span>
            </div>

            <div class="sm:border-l sm:border-slate-200/80 sm:pl-4 space-y-2">
                <div>
                    <span class="text-xs font-medium text-slate-500 block">Target Kebutuhan</span>
                    <div class="inline-flex items-center gap-1.5 text-sm font-bold font-mono text-slate-900 mt-0.5">
                        <Calendar class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{{ formatDate(item.required_date) }}</span>
                    </div>
                </div>
                <div>
                    <span class="text-xs text-slate-500">Diajukan: </span>
                    <span class="text-xs font-semibold font-mono text-slate-700">{{ formatDate(item.request_date) }}</span>
                </div>
            </div>

            <div class="sm:border-l sm:border-slate-200/80 sm:pl-4">
                <span class="text-xs font-medium text-slate-500 block">Jalur Pengadaan</span>
                <div class="mt-1 flex items-start gap-1.5">
                    <Route class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-900 leading-snug">
                            {{ item.procurement_route === 'direct_supplier' ? 'Supplier Langsung (PO)' : 'Jalur Pengadaan Standar' }}
                        </p>
                        <p v-if="item.procurement_route === 'direct_supplier' && item.direct_supplier?.name" class="text-xs text-blue-700 font-medium mt-0.5 break-words">
                            {{ item.direct_supplier.name }}
                        </p>
                        <p v-else class="text-xs text-slate-500 mt-0.5">
                            Melalui rencana pengadaan
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Detail Pemohon & Tujuan Pengadaan -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80">
            <!-- Pemohon -->
            <div class="min-w-0 space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-semibold text-slate-500">Pemohon</span>
                    <span
                        v-if="requesterProfile.nik"
                        class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80 font-mono text-[11px] font-semibold"
                        title="Nomor Induk Karyawan"
                    >
                        NIK: {{ requesterProfile.nik }}
                    </span>
                </div>

                <div class="flex items-start gap-3.5">
                    <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-bold font-mono text-sm flex items-center justify-center shrink-0">
                        {{ requesterProfile.initials }}
                    </div>

                    <div class="space-y-1 min-w-0 flex-1">
                        <h4 class="text-sm font-bold text-slate-900 truncate" :title="requesterProfile.name">
                            {{ requesterProfile.name }}
                        </h4>

                        <p v-if="requesterProfile.position || requesterProfile.jobLevel" class="text-xs text-slate-600 font-medium flex flex-wrap items-center gap-1.5">
                            <Briefcase class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{{ requesterProfile.position || 'Staff' }}</span>
                            <span v-if="requesterProfile.jobLevel" class="text-slate-400">• {{ requesterProfile.jobLevel }}</span>
                        </p>

                        <p v-if="requesterProfile.division || requesterProfile.company" class="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                            <Building2 class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span class="font-medium text-slate-700">{{ requesterProfile.division || item.division?.name || '-' }}</span>
                            <span class="text-slate-400">•</span>
                            <span class="break-words">{{ requesterProfile.company || item.company?.name || '-' }}</span>
                        </p>

                        <p v-if="requesterProfile.email" class="text-xs text-slate-400 flex items-center gap-1.5">
                            <Mail class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span class="truncate">{{ requesterProfile.email }}</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- Keperluan & Catatan -->
            <div class="min-w-0 space-y-3 md:border-l md:border-slate-100 md:pl-5">
                <div>
                    <span class="text-xs font-semibold text-slate-500 block">Keperluan Pengadaan</span>
                    <p class="text-sm text-slate-900 font-medium leading-relaxed mt-1 break-words">
                        {{ item.purpose || '—' }}
                    </p>
                </div>

                <div v-if="item.notes" class="pt-2 border-t border-slate-100">
                    <span class="text-xs font-semibold text-slate-500 block">Catatan Tambahan</span>
                    <p class="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line break-words mt-1">
                        {{ item.notes }}
                    </p>
                </div>
            </div>

            <!-- Ketentuan Supplier Langsung (Ringkas, tanpa kotak bertumpuk) -->
            <div
                v-if="item.procurement_route === 'direct_supplier'"
                class="md:col-span-2 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm"
            >
                <div>
                    <span class="text-xs font-medium text-slate-500 block">Ketentuan Pembayaran</span>
                    <p class="font-medium text-slate-800 mt-0.5 break-words">
                        {{ item.direct_purchase_terms?.payment_terms || 'Belum diisi' }}
                    </p>
                </div>
                <div>
                    <span class="text-xs font-medium text-slate-500 block">Referensi Harga / PO</span>
                    <p class="font-medium text-slate-800 mt-0.5 break-words">
                        {{ item.direct_purchase_terms?.reference || 'Belum diisi' }}
                    </p>
                </div>
                <div>
                    <span class="text-xs font-medium text-slate-500 block">Alamat Pengiriman</span>
                    <p class="font-medium text-slate-800 mt-0.5 whitespace-pre-line break-words">
                        {{ item.direct_purchase_terms?.delivery_address || 'Belum diisi' }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
