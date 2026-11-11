<script setup>
import { RouterLink } from 'vue-router'
import { ExternalLink, User, Calendar, CreditCard, MapPin, Package } from '@lucide/vue'
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
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- Card 1: Identification & Plan -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identitas Tender</span>
                    <span class="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {{ rfq.rfq_number }}
                    </span>
                </div>
                <div class="mt-4 space-y-3">
                    <div>
                        <span class="text-xs text-slate-400 block">Judul Pengadaan</span>
                        <span class="text-sm font-semibold text-slate-800">{{ rfq.title }}</span>
                    </div>
                    <div v-if="rfq.created_at">
                        <span class="text-xs text-slate-400 block">Dibuat pada</span>
                        <span class="text-sm text-slate-800">{{ formatRfqTimestamp(rfq.created_at) }}</span>
                    </div>
                    <div v-if="rfq.procurement_plan">
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs text-slate-400">Rencana Pengadaan (PP)</span>
                            <span
                                v-if="rfq.is_multi_source || rfq.procurement_plan?.is_consolidated"
                                class="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold"
                            >
                                Konsolidasi
                            </span>
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <template v-if="rfq.source_pp_numbers && rfq.source_pp_numbers.length > 0">
                                <span
                                    v-for="ppNum in rfq.source_pp_numbers"
                                    :key="ppNum"
                                    class="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                                >
                                    {{ ppNum }}
                                </span>
                            </template>
                            <span v-else class="text-xs font-mono font-medium text-slate-700">
                                {{ rfq.procurement_plan.pp_number || rfq.procurement_plan.plan_number || `PP #${rfq.procurement_plan_id}` }}
                            </span>
                            <RouterLink 
                                :to="{ name: 'user.purchasing.plans.detail', params: { id: rfq.procurement_plan_id } }"
                                class="text-blue-600 hover:text-blue-800"
                                title="Buka Dokumen Rencana Pengadaan Utama"
                            >
                                <ExternalLink class="w-3.5 h-3.5" />
                            </RouterLink>
                        </div>
                        <div
                            v-if="(rfq.source_pr_numbers && rfq.source_pr_numbers.length > 0) || (rfq.procurement_plan.pr_numbers && rfq.procurement_plan.pr_numbers.length > 0)"
                            class="mt-1.5 flex flex-wrap items-center gap-1"
                        >
                            <span class="text-[11px] text-slate-400">Sumber PR:</span>
                            <span
                                v-for="prNum in (rfq.source_pr_numbers?.length ? rfq.source_pr_numbers : rfq.procurement_plan.pr_numbers)"
                                :key="prNum"
                                class="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"
                            >
                                {{ prNum }}
                            </span>
                        </div>
                    </div>
                    <div>
                        <span class="text-xs text-slate-400 block">Dibuat Oleh</span>
                        <span class="text-xs font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                            <User class="w-3.5 h-3.5 text-slate-400" />
                            {{ rfq.created_by_user?.name || `User #${rfq.created_by}` }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Card 2: Timeline & Terms -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jadwal & Komersial</span>
                    <Calendar class="w-4 h-4 text-slate-400" />
                </div>
                <div class="mt-4 space-y-3">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <span class="text-xs text-slate-400 block">Tanggal Terbit</span>
                            <span class="text-xs font-medium text-slate-700 mt-0.5 block">
                                {{ formatDate(rfq.issue_date) }}
                            </span>
                        </div>
                        <div>
                            <span class="text-xs text-slate-400 block">Batas Penawaran</span>
                            <span class="text-xs font-semibold text-slate-800 mt-0.5 block">
                                {{ formatDate(rfq.deadline_date) }}
                            </span>
                        </div>
                    </div>
                    <div>
                        <span class="text-xs text-slate-400 block">Syarat Pembayaran Diminta</span>
                        <span class="text-xs font-medium text-slate-700 mt-0.5 flex items-center gap-1.5">
                            <CreditCard class="w-3.5 h-3.5 text-slate-400" />
                            {{ rfq.payment_terms_requested || 'Sesuai Standar Perusahaan' }}
                        </span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-400 block">Alamat Pengiriman Target</span>
                        <span class="text-xs text-slate-600 mt-0.5 flex items-start gap-1.5">
                            <MapPin class="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <span class="line-clamp-2">{{ rfq.delivery_address || 'Gudang Pusat PT Padma Soode Indonesia' }}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Card 3: Metrics & Stats -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Statistik Pengadaan</span>
                    <Package class="w-4 h-4 text-slate-400" />
                </div>
                <div class="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span class="text-xl font-bold text-slate-800">{{ rfq.items?.length || 0 }}</span>
                        <span class="text-[11px] text-slate-500 block mt-1">Item Barang</span>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span class="text-xl font-bold text-blue-600">{{ invitedSuppliersCount }}</span>
                        <span class="text-[11px] text-slate-500 block mt-1">Vendor Diundang</span>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span class="text-xl font-bold text-emerald-600">{{ quotationsCount }}</span>
                        <span class="text-[11px] text-slate-500 block mt-1">Penawaran Masuk</span>
                    </div>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-xs text-slate-500 font-medium">Estimasi HPS Total:</span>
                    <span class="text-sm font-bold text-slate-900 font-mono">
                        {{ formatCurrency(totalTargetHps) }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
