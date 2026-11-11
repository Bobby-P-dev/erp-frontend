<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getSupplierPortalRfqs } from '../../../services/supplierPortalServices.js'
import { formatDate } from '../../../composables/useFormatter.js'
import { showError } from '../../../utils/swal.js'
import BaseBreadcrumb from '../../../components/ui/BaseBreadcrumb.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import { useRfqDeadline } from '@/composables/purchasing/useRfqDeadline.js'

const { getDeadlineInfo } = useRfqDeadline()

import {
    Search,
    RefreshCw,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight
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
    { id: 'need_action', label: 'Perlu Direspon' },
    { id: 'submitted', label: 'Sudah Mengirim Harga' },
    { id: 'awarded', label: 'Terpilih (Pemenang)' },
    { id: 'declined', label: 'Ditolak / Dilewati' }
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

onMounted(() => {
    fetchRfqs(1)
})
</script>

<template>
    <div class="space-y-6">
        <BaseBreadcrumb />

        <!-- Page Title & Header -->
        <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Tender & Permintaan Penawaran (RFQ)
                </h1>
                <p class="text-xs sm:text-sm text-slate-500 mt-1">
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
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div class="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <!-- Status Tabs -->
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    <button
                        v-for="tab in tabs"
                        :key="tab.id"
                        type="button"
                        @click="selectedTab = tab.id"
                        :class="[
                            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer border',
                            selectedTab === tab.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] border mt-1" :class="getDeadlineInfo(inv.rfq).class">
                                    {{ getDeadlineInfo(inv.rfq).label }}
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
                                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300"
                                >
                                    <CheckCircle2 class="w-3.5 h-3.5 text-emerald-700" />
                                    Terpilih (Pemenang)
                                </span>
                                <span
                                    v-else-if="inv.rfq?.quotations?.[0]?.evaluation_status === 'partially_awarded'"
                                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                >
                                    <CheckCircle2 class="w-3.5 h-3.5 text-emerald-700" />
                                    Terpilih Sebagian
                                </span>
                                <span
                                    v-else-if="inv.quote_status === 'received'"
                                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                                >
                                    <CheckCircle2 class="w-3.5 h-3.5 text-slate-600" />
                                    Penawaran Terkirim
                                </span>
                                <span
                                    v-else-if="inv.quote_status === 'viewed'"
                                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                                >
                                    <Clock class="w-3.5 h-3.5 text-blue-700" />
                                    Sudah Dibuka
                                </span>
                                <span
                                    v-else-if="inv.quote_status === 'declined'"
                                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200"
                                >
                                    Menolak Ikut Tender
                                </span>
                                <span
                                    v-else
                                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300"
                                >
                                    <AlertCircle class="w-3.5 h-3.5 text-amber-700" />
                                    Perlu Direspon
                                </span>
                            </td>

                            <!-- Tombol Aksi (Buka di Tab yang Sama) -->
                            <td class="py-4 px-5 text-right whitespace-nowrap">
                                <RouterLink
                                    v-if="inv.portal_access_token"
                                    :to="`/portal/rfq/${inv.portal_access_token}`"
                                    class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
                                    :class="inv.quote_status === 'received' ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300' : 'bg-blue-600 hover:bg-blue-700 text-white'"
                                >
                                    <span>{{ inv.quote_status === 'received' ? 'Lihat Penawaran' : 'Isi Penawaran' }}</span>
                                    <ArrowRight class="w-4 h-4" />
                                </RouterLink>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination Bar -->
            <Pagination
                :pagination="pagination"
                @change-page="fetchRfqs"
            />
        </div>
    </div>
</template>
