<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getSupplierPortalRfqs } from '../../../services/supplierPortalServices.js'
import { formatDate } from '../../../composables/useFormatter.js'
import { showError } from '../../../utils/swal.js'

import {
    Search,
    RefreshCw,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    Trophy
} from '@lucide/vue'

const route = useRoute()
const loading = ref(true)
const rfqs = ref([])
const searchQuery = ref('')
const selectedTab = ref(route.query.tab || 'all')

const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0
})

const tabs = [
    { id: 'all', label: 'Semua Tender' },
    { id: 'need_action', label: 'Perlu Direspon Segera' },
    { id: 'submitted', label: 'Telah Diajukan' },
    { id: 'awarded', label: 'Menang Tender (Awarded)' },
    { id: 'declined', label: 'Ditolak/Dilewati' }
]

const fetchRfqs = async (page = 1) => {
    loading.value = true
    try {
        const res = await getSupplierPortalRfqs(searchQuery.value, page, {
            tab: selectedTab.value,
            per_page: pagination.value.per_page
        })
        rfqs.value = res.data || []
        if (res.meta) {
            pagination.value = res.meta
        }
    } catch (err) {
        showError('Gagal Memuat Tender RFQ', err.response?.data?.message || 'Terjadi kesalahan sistem.')
    } finally {
        loading.value = false
    }
}

watch(selectedTab, () => {
    pagination.value.current_page = 1
    fetchRfqs(1)
})

watch(() => route.query.tab, (newTab) => {
    if (newTab && newTab !== selectedTab.value) {
        selectedTab.value = newTab
    }
})

let searchTimeout = null
watch(searchQuery, () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        pagination.value.current_page = 1
        fetchRfqs(1)
    }, 400)
})

const getDeadlineInfo = (deadlineDateStr) => {
    if (!deadlineDateStr) return { label: '-', class: 'bg-slate-100 text-slate-600' }
    const deadline = new Date(deadlineDateStr)
    deadline.setHours(23, 59, 59, 999)
    const now = new Date()
    const diffMs = deadline - now

    if (diffMs <= 0) return { label: 'Batas Berakhir', class: 'bg-rose-50 text-rose-700 border-rose-200' }
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diffDays === 0) return { label: `Hari Ini (${diffHours} jam lagi)`, class: 'bg-amber-50 text-amber-800 border-amber-200 font-bold' }
    return { label: `Sisa ${diffDays} hari`, class: 'bg-blue-50 text-blue-700 border-blue-200' }
}

onMounted(() => {
    fetchRfqs(1)
})
</script>

<template>
    <div class="space-y-6">
        <!-- Page Title & Header -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Tender & Permintaan Penawaran (RFQ)
                </h1>
                <p class="text-xs text-slate-500 mt-1">
                    Daftar paket tender pengadaan PT Padma Soode Indonesia yang mengundang perusahaan Anda.
                </p>
            </div>
            <button
                type="button"
                @click="fetchRfqs(pagination.current_page)"
                :disabled="loading"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer shrink-0"
            >
                <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
                <span>Segarkan</span>
            </button>
        </div>

        <!-- Filter Bar: Status Tabs & Search -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <!-- Status Tabs -->
                <div class="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
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

                <!-- Search Input -->
                <div class="relative w-full md:w-72 shrink-0">
                    <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Cari nomor RFQ / judul..."
                        class="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    />
                </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                            <th class="py-3.5 px-5">No. RFQ & Judul Pengadaan</th>
                            <th class="py-3.5 px-4">Batas Akhir Penawaran</th>
                            <th class="py-3.5 px-4 text-center">Rincian Item</th>
                            <th class="py-3.5 px-4 text-center">Status Respon Anda</th>
                            <th class="py-3.5 px-5 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-if="loading">
                            <td colspan="5" class="py-12 text-center text-slate-400">
                                <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                                <span>Memuat data tender...</span>
                            </td>
                        </tr>
                        <tr v-else-if="rfqs.length === 0">
                            <td colspan="5" class="py-12 text-center text-slate-400">
                                Tidak ada tender yang sesuai dengan filter atau kata kunci Anda.
                            </td>
                        </tr>
                        <tr
                            v-else
                            v-for="inv in rfqs"
                            :key="inv.id"
                            class="hover:bg-slate-50/80 transition-colors"
                        >
                            <!-- Identitas RFQ -->
                            <td class="py-4 px-5">
                                <div class="font-mono font-bold text-slate-900 text-sm">{{ inv.rfq?.rfq_number }}</div>
                                <div class="text-xs text-slate-700 font-medium mt-0.5">{{ inv.rfq?.title }}</div>
                                <div class="text-[11px] text-slate-400 mt-1">
                                    Alamat Kirim: {{ inv.rfq?.delivery_address || 'Plant PT Padma Soode Indonesia' }}
                                </div>
                            </td>

                            <!-- Deadline -->
                            <td class="py-4 px-4 whitespace-nowrap">
                                <div class="font-semibold text-slate-800">{{ formatDate(inv.rfq?.deadline_date) }}</div>
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] border mt-1" :class="getDeadlineInfo(inv.rfq?.deadline_date).class">
                                    {{ getDeadlineInfo(inv.rfq?.deadline_date).label }}
                                </span>
                            </td>

                            <!-- Rincian Item -->
                            <td class="py-4 px-4 text-center whitespace-nowrap">
                                <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200">
                                    {{ inv.rfq?.items?.length || 0 }} Item Barang
                                </span>
                            </td>

                            <!-- Status Respon & Awarding -->
                            <td class="py-4 px-4 text-center whitespace-nowrap">
                                <span
                                    v-if="inv.rfq?.quotations?.[0]?.evaluation_status === 'awarded'"
                                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                >
                                    <Trophy class="w-3.5 h-3.5 text-emerald-700" />
                                    Menang Tender
                                </span>
                                <span
                                    v-else-if="inv.rfq?.quotations?.[0]?.evaluation_status === 'partially_awarded'"
                                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300"
                                >
                                    <CheckCircle2 class="w-3.5 h-3.5 text-blue-700" />
                                    Menang Sebagian
                                </span>
                                <span
                                    v-else-if="inv.quote_status === 'received'"
                                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                >
                                    <CheckCircle2 class="w-3.5 h-3.5" />
                                    Penawaran Terkirim
                                </span>
                                <span
                                    v-else-if="inv.quote_status === 'viewed'"
                                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                    <Clock class="w-3.5 h-3.5" />
                                    Telah Dilihat
                                </span>
                                <span
                                    v-else-if="inv.quote_status === 'declined'"
                                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                                >
                                    Menolak Partisipasi
                                </span>
                                <span
                                    v-else
                                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                >
                                    <AlertCircle class="w-3.5 h-3.5" />
                                    Perlu Direspon
                                </span>
                            </td>

                            <!-- Tombol Aksi -->
                            <td class="py-4 px-5 text-right whitespace-nowrap">
                                <a
                                    v-if="inv.portal_access_token"
                                    :href="`/portal/rfq/${inv.portal_access_token}`"
                                    target="_blank"
                                    class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs"
                                    :class="inv.quote_status === 'received' ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200' : 'bg-blue-600 hover:bg-blue-700 text-white'"
                                >
                                    <span>{{ inv.quote_status === 'received' ? 'Lihat Form Penawaran' : 'Isi Penawaran Tender' }}</span>
                                    <ArrowUpRight class="w-4 h-4" />
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination Bar -->
            <div v-if="pagination.last_page > 1" class="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Halaman {{ pagination.current_page }} dari {{ pagination.last_page }} (Total {{ pagination.total }} tender)</span>
                <div class="flex items-center gap-1">
                    <button
                        :disabled="pagination.current_page <= 1"
                        @click="fetchRfqs(pagination.current_page - 1)"
                        class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
                    >
                        Sebelumnya
                    </button>
                    <button
                        :disabled="pagination.current_page >= pagination.last_page"
                        @click="fetchRfqs(pagination.current_page + 1)"
                        class="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
                    >
                        Selanjutnya
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
