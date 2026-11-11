<script setup>
import { Building2, Clock, MapPin, CheckCircle2, XCircle, FileCheck } from '@lucide/vue'
import { formatDate } from '@/composables/useFormatter.js'

defineProps({
    portalData: {
        type: Object,
        required: true,
    },
    deadlineInfo: {
        type: Object,
        default: null,
    },
})
</script>

<template>
    <div class="bg-white rounded-2xl border border-[#E5EAF1] p-6 sm:p-7 shadow-xs space-y-6">
        <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-100">
            <div class="space-y-1.5 max-w-4xl">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-xs font-bold text-[#014BAA] bg-[#EAF2FF] border border-blue-200/80 px-2.5 py-0.5 rounded-md">
                        {{ portalData.rfq.rfq_number }}
                    </span>
                    <span class="text-xs font-medium text-slate-400">•</span>
                    <span class="text-xs font-medium text-slate-500">
                        Diterbitkan: {{ formatDate(portalData.rfq.issue_date) }}
                    </span>
                </div>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {{ portalData.rfq.title }}
                </h2>
                <p v-if="portalData.rfq.notes" class="text-xs text-slate-600 leading-relaxed pt-1">
                    {{ portalData.rfq.notes }}
                </p>
            </div>

            <!-- Status & Deadline Pill -->
            <div class="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2.5 shrink-0">
                <div 
                    v-if="deadlineInfo"
                    :class="['inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border font-medium', deadlineInfo.class]"
                >
                    <Clock class="w-3.5 h-3.5" />
                    <span>{{ deadlineInfo.label }}</span>
                </div>

                <div class="text-xs text-slate-500 text-left md:text-right">
                    Batas Akhir: <strong class="text-slate-800">{{ formatDate(portalData.rfq.deadline_date) }} (akhir hari WIB)</strong>
                </div>
            </div>
        </div>

        <!-- Meta Badges: Address, Terms, Supplier Profile -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-50/80 border border-[#E5EAF1] space-y-1.5">
                <div class="flex items-center gap-2 text-slate-500 font-medium">
                    <Building2 class="w-4 h-4 text-[#014BAA]" />
                    <span>Rekanan yang Diundang</span>
                </div>
                <div class="font-bold text-slate-900 text-sm">
                    {{ portalData.supplier.name }}
                </div>
                <div class="text-slate-500 text-[11px]">
                    Kontak: {{ portalData.supplier.contact_person || '-' }} ({{ portalData.supplier.email || '-' }})
                </div>
            </div>

            <div class="p-4 rounded-xl bg-slate-50/80 border border-[#E5EAF1] space-y-1.5">
                <div class="flex items-center gap-2 text-slate-500 font-medium">
                    <MapPin class="w-4 h-4 text-[#014BAA]" />
                    <span>Alamat Pengiriman Target</span>
                </div>
                <div class="font-bold text-slate-900">
                    {{ portalData.rfq.delivery_address || 'Pabrik Bekasi (FOB Destination)' }}
                </div>
                <div class="text-slate-500 text-[11px]">
                    Syarat Pembayaran: {{ portalData.rfq.payment_terms_requested || 'Net 30 Days' }}
                </div>
            </div>

            <div class="p-4 rounded-xl bg-slate-50/80 border border-[#E5EAF1] space-y-1.5 sm:col-span-2 lg:col-span-1">
                <div class="flex items-center gap-2 text-slate-500 font-medium">
                    <FileCheck class="w-4 h-4 text-[#014BAA]" />
                    <span>Status Respon Anda</span>
                </div>
                <div class="flex items-center gap-2">
                    <span 
                        v-if="portalData.portal.quote_status === 'received'"
                        class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs"
                    >
                        <CheckCircle2 class="w-3.5 h-3.5" />
                        Penawaran Terkirim
                    </span>
                    <span 
                        v-else-if="portalData.portal.quote_status === 'declined'"
                        class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-xs"
                    >
                        <XCircle class="w-3.5 h-3.5" />
                        Partisipasi Ditolak
                    </span>
                    <span 
                        v-else
                        class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-xs"
                    >
                        <Clock class="w-3.5 h-3.5" />
                        Menunggu Pengisian Penawaran
                    </span>
                </div>
                <div class="text-slate-500 text-[11px]">
                    Tautan dibuka: {{ formatDate(portalData.portal.viewed_at) }}
                </div>
            </div>
        </div>
    </div>
</template>
