<script setup>
import { ref, onMounted, watch } from 'vue'
import { getSupplierPortalQuotations } from '../../../services/supplierPortalServices.js'
import { formatCurrency, formatDate } from '../../../composables/useFormatter.js'
import { showError } from '../../../utils/swal.js'

import {
    ReceiptText,
    RefreshCw,
    CheckCircle2,
    Clock,
    XCircle,
    FileText,
    ExternalLink,
    Trophy
} from '@lucide/vue'

const loading = ref(true)
const quotations = ref([])
const selectedTab = ref('all')

const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0
})

const tabs = [
    { id: 'all', label: 'Semua Penawaran' },
    { id: 'awarded', label: 'Menang Tender (Awarded)' },
    { id: 'partially_awarded', label: 'Menang Sebagian' },
    { id: 'rejected', label: 'Tidak Terpilih' },
    { id: 'submitted', label: 'Sedang Dievaluasi' }
]

const fetchQuotations = async (page = 1) => {
    loading.value = true
    try {
        const res = await getSupplierPortalQuotations(page, {
            evaluation_status: selectedTab.value === 'all' ? undefined : selectedTab.value,
            per_page: pagination.value.per_page
        })
        quotations.value = res.data || []
        if (res.meta) {
            pagination.value = res.meta
        }
    } catch (err) {
        showError('Gagal Memuat Riwayat', err.response?.data?.message || 'Terjadi kesalahan sistem.')
    } finally {
        loading.value = false
    }
}

watch(selectedTab, () => {
    pagination.value.current_page = 1
    fetchQuotations(1)
})

onMounted(() => {
    fetchQuotations(1)
})
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Riwayat Penawaran Harga (Quotations)
                </h1>
                <p class="text-xs text-slate-500 mt-1">
                    Arsip seluruh surat penawaran harga resmi yang telah diajukan oleh perusahaan Anda ke PT Padma Soode Indonesia.
                </p>
            </div>
            <button
                type="button"
                @click="fetchQuotations(pagination.current_page)"
                :disabled="loading"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer shrink-0"
            >
                <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
                <span>Segarkan</span>
            </button>
        </div>

        <!-- Filter Bar: Status Tabs -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="p-4 border-b border-slate-100 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    type="button"
                    @click="selectedTab = tab.id"
                    :class="[
                        'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer',
                        selectedTab === tab.id
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    ]"
                >
                    {{ tab.label }}
                </button>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                            <th class="py-3.5 px-5">No. Penawaran & Referensi</th>
                            <th class="py-3.5 px-4">Paket Tender RFQ</th>
                            <th class="py-3.5 px-4">Tanggal Penawaran</th>
                            <th class="py-3.5 px-4 text-right">Total Nilai (IDR)</th>
                            <th class="py-3.5 px-4 text-center">Status Hasil Tender</th>
                            <th class="py-3.5 px-5 text-right">Berkas Lampiran</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-if="loading">
                            <td colspan="6" class="py-12 text-center text-slate-400">
                                <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                                <span>Memuat riwayat penawaran...</span>
                            </td>
                        </tr>
                        <tr v-else-if="quotations.length === 0">
                            <td colspan="6" class="py-12 text-center text-slate-400">
                                Belum ada surat penawaran harga yang pernah diajukan.
                            </td>
                        </tr>
                        <tr
                            v-else
                            v-for="quote in quotations"
                            :key="quote.id"
                            class="hover:bg-slate-50/80 transition-colors"
                        >
                            <!-- Identitas Penawaran -->
                            <td class="py-4 px-5">
                                <div class="font-mono font-bold text-slate-900">{{ quote.quotation_number }}</div>
                                <div class="text-[11px] text-slate-500 font-medium mt-0.5">
                                    Ref: {{ quote.vendor_quotation_reference || '-' }}
                                </div>
                            </td>

                            <!-- Terkait RFQ -->
                            <td class="py-4 px-4">
                                <div class="font-mono font-semibold text-blue-700">{{ quote.rfq?.rfq_number }}</div>
                                <div class="text-[11px] text-slate-600 line-clamp-1 max-w-xs mt-0.5">{{ quote.rfq?.title }}</div>
                            </td>

                            <!-- Tanggal & Validitas -->
                            <td class="py-4 px-4 whitespace-nowrap">
                                <div class="text-slate-800 font-medium">{{ formatDate(quote.quotation_date) }}</div>
                                <div class="text-[10px] text-slate-400 mt-0.5">
                                    Berlaku s/d: {{ formatDate(quote.valid_until) || '-' }}
                                </div>
                            </td>

                            <!-- Total Nilai -->
                            <td class="py-4 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                                {{ formatCurrency(quote.total_amount || quote.grand_total) }}
                            </td>

                            <!-- Status Hasil Tender -->
                            <td class="py-4 px-4 text-center whitespace-nowrap">
                                <span
                                    v-if="quote.status === 'awarded'"
                                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                >
                                    <Trophy class="w-3.5 h-3.5 text-emerald-700" />
                                    Menang Tender (Awarded)
                                </span>
                                <span
                                    v-else-if="quote.status === 'partially_awarded'"
                                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300"
                                >
                                    <CheckCircle2 class="w-3.5 h-3.5 text-blue-700" />
                                    Menang Sebagian Item
                                </span>
                                <span
                                    v-else-if="quote.status === 'rejected'"
                                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
                                >
                                    <XCircle class="w-3.5 h-3.5 text-rose-600" />
                                    Tidak Terpilih
                                </span>
                                <span
                                    v-else
                                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                                >
                                    <Clock class="w-3.5 h-3.5 text-amber-600" />
                                    Sedang Dievaluasi
                                </span>
                            </td>

                            <!-- Lampiran Dokumen -->
                            <td class="py-4 px-5 text-right whitespace-nowrap">
                                <a
                                    v-if="quote.quotation_file?.url || quote.file_url"
                                    :href="quote.quotation_file?.url || quote.file_url"
                                    target="_blank"
                                    class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors"
                                    title="Lihat Berkas Resmi Penawaran"
                                >
                                    <FileText class="w-3.5 h-3.5" />
                                    <span>Unduh PDF</span>
                                    <ExternalLink class="w-3 h-3" />
                                </a>
                                <span v-else class="text-slate-400 italic text-[11px]">Tidak ada berkas</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination Bar -->
            <div v-if="pagination.last_page > 1" class="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Halaman {{ pagination.current_page }} dari {{ pagination.last_page }} (Total {{ pagination.total }} penawaran)</span>
                <div class="flex items-center gap-1">
                    <button
                        :disabled="pagination.current_page <= 1"
                        @click="fetchQuotations(pagination.current_page - 1)"
                        class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
                    >
                        Sebelumnya
                    </button>
                    <button
                        :disabled="pagination.current_page >= pagination.last_page"
                        @click="fetchQuotations(pagination.current_page + 1)"
                        class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
                    >
                        Selanjutnya
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
