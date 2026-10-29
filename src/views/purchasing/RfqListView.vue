<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { getRfqs, publishRfq, cancelRfq } from '../../services/rfqServices.js'
import { showSuccess, showError, showConfirm, showPrompt } from '../../utils/swal.js'
import { formatDate } from '../../composables/useFormatter.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import Pagination from '../../components/ui/Pagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

import {
    Home,
    ChevronRight,
    Scale,
    Plus,
    RefreshCw,
    Search,
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    Play,
    Ban,
    Building2,
    Layers,
    FileText,
    Users,
    ArrowUpRight,
    CheckCheck,
    AlertTriangle,
    BarChart3
} from '@lucide/vue'

const router = useRouter()

// State
const rfqs = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedStatus = ref('')
const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0
})

// Quick Stats computed from current page or meta
const stats = ref({
    total: 0,
    draft: 0,
    published: 0,
    evaluation: 0,
    completed: 0,
    cancelled: 0
})

// Table Columns (Standardized Corporate Layout)
const tableColumns = [
    { key: 'no', label: 'No', width: '60px', align: 'center', class: 'text-center' },
    { key: 'rfq_number', label: 'No. RFQ & Judul Tender', minWidth: '240px' },
    { key: 'procurement_plan', label: 'Rencana Pengadaan (PP)', minWidth: '220px' },
    { key: 'deadline', label: 'Batas Waktu (Deadline)', minWidth: '190px' },
    { key: 'progress', label: 'Progres Penawaran Masuk', minWidth: '190px', align: 'center', class: 'text-center' },
    { key: 'status', label: 'Status', minWidth: '150px', align: 'center', class: 'text-center' },
    { key: 'actions', label: 'Aksi', minWidth: '160px', align: 'center', class: 'text-center' }
]

// Status Filter Tabs
const statusTabs = [
    { id: '', label: 'Semua Status' },
    { id: 'draft', label: 'Draf', color: 'slate' },
    { id: 'published', label: 'Dipublikasikan', color: 'blue' },
    { id: 'evaluation', label: 'Evaluasi', color: 'amber' },
    { id: 'completed', label: 'Selesai', color: 'emerald' },
    { id: 'cancelled', label: 'Dibatalkan', color: 'rose' }
]

// Fetch RFQ List
const fetchRfqs = async (search = searchQuery.value, page = 1) => {
    try {
        isLoading.value = true
        const filters = {
            per_page: pagination.value.per_page
        }
        if (selectedStatus.value) filters.status = selectedStatus.value

        const response = await getRfqs(search, page, filters)
        rfqs.value = response.data || []

        if (response.meta) {
            pagination.value = {
                current_page: response.meta.current_page || page,
                last_page: response.meta.last_page || 1,
                per_page: response.meta.per_page || 10,
                total: response.meta.total || 0
            }
        } else if (response.pagination) {
            pagination.value = {
                current_page: response.pagination.current_page || page,
                last_page: response.pagination.last_page || 1,
                per_page: response.pagination.per_page || 10,
                total: response.pagination.total || 0
            }
        }

        // Compute summary counts from response or collection
        const list = rfqs.value
        stats.value = {
            total: pagination.value.total || list.length,
            draft: list.filter(r => (r.status?.value || r.status) === 'draft').length,
            published: list.filter(r => (r.status?.value || r.status) === 'published').length,
            evaluation: list.filter(r => (r.status?.value || r.status) === 'evaluation').length,
            completed: list.filter(r => (r.status?.value || r.status) === 'completed').length,
            cancelled: list.filter(r => (r.status?.value || r.status) === 'cancelled').length
        }
    } catch (error) {
        console.error('Failed to fetch RFQs:', error)
        showError('Gagal Memuat Tender RFQ', error.response?.data?.message || 'Terjadi kesalahan saat memuat daftar RFQ.')
    } finally {
        isLoading.value = false
    }
}

// Deadline countdown helper
const getDeadlineInfo = (deadlineDate) => {
    if (!deadlineDate) return { text: 'Tidak ada deadline', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' }
    
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(deadlineDate)
    target.setHours(0, 0, 0, 0)

    const diffMs = target.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
        return {
            text: `Lewat ${Math.abs(diffDays)} hari`,
            isExpired: true,
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
        }
    }
    if (diffDays === 0) {
        return {
            text: 'Hari ini batas akhir',
            isWarning: true,
            badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
        }
    }
    return {
        text: `Sisa ${diffDays} hari`,
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
    }
}

// Actions
const handleSearch = () => {
    fetchRfqs(searchQuery.value, 1)
}

const handlePageChange = (page) => {
    fetchRfqs(searchQuery.value, page)
}

const handleStatusFilter = (statusId) => {
    selectedStatus.value = statusId
    fetchRfqs(searchQuery.value, 1)
}

// Publish RFQ Action
const handlePublish = async (rfq) => {
    const confirmed = await showConfirm(
        'Publikasikan Tender RFQ?',
        `Apakah Anda yakin ingin mempublikasikan RFQ ${rfq.rfq_number}? Portal vendor dan token akses penawaran akan diaktifkan secara otomatis.`,
        'Ya, Publikasikan'
    )
    if (!confirmed) return

    try {
        await publishRfq(rfq.id)
        showSuccess('Berhasil!', `Tender RFQ ${rfq.rfq_number} berhasil dipublikasikan.`)
        fetchRfqs(searchQuery.value, pagination.value.current_page)
    } catch (err) {
        console.error('Failed to publish RFQ:', err)
        showError('Gagal Publikasi', err.response?.data?.message || 'Terjadi kesalahan saat mempublikasikan RFQ.')
    }
}

// Cancel RFQ Action
const handleCancel = async (rfq) => {
    const res = await showPrompt({
        title: 'Batalkan Tender RFQ',
        text: `Masukkan alasan pembatalan untuk RFQ ${rfq.rfq_number}:`,
        placeholder: 'Contoh: Alokasi anggaran dialihkan atau kuota dibatalkan...',
        confirmText: 'Batalkan RFQ',
        isDestructive: true,
        validator: (val) => (!val || !val.trim() ? 'Alasan pembatalan wajib diisi.' : null)
    })

    if (!res.isConfirmed || !res.value) return

    try {
        await cancelRfq(rfq.id, res.value)
        showSuccess('Tender Dibatalkan', `Tender RFQ ${rfq.rfq_number} telah berhasil dibatalkan.`)
        fetchRfqs(searchQuery.value, pagination.value.current_page)
    } catch (err) {
        console.error('Failed to cancel RFQ:', err)
        showError('Gagal Membatalkan', err.response?.data?.message || 'Terjadi kesalahan saat membatalkan RFQ.')
    }
}

// Navigation helpers
const goToDetail = (id) => {
    router.push({ name: 'user.purchasing.rfq.detail', params: { id } })
}

const goToComparison = (id) => {
    router.push({ name: 'user.purchasing.rfq.comparison', params: { id } })
}

const goToCreate = () => {
    router.push({ name: 'user.purchasing.rfq.create' })
}

let searchTimer = null
watch(searchQuery, (val) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
        fetchRfqs(val, 1)
    }, 350)
})

onMounted(() => {
    fetchRfqs()
})
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <PageHeader 
            title="Request for Quotation (RFQ)" 
            subtitle="Kelola tender pengadaan multi-vendor, pantau respons penawaran rekanan, dan bandingkan harga penawaran secara berdampingan."
        >
            <template #actions>
                <div class="flex items-center gap-2.5">
                    <button
                        type="button"
                        @click="fetchRfqs(searchQuery, pagination.current_page)"
                        :disabled="isLoading"
                        class="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200/90 transition-colors cursor-pointer"
                        title="Segarkan Data"
                    >
                        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                    </button>

                    <button
                        type="button"
                        @click="goToCreate"
                        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition-colors shadow-xs shadow-blue-500/20 cursor-pointer"
                    >
                        <Plus class="w-4 h-4" />
                        <span>Buat RFQ Baru</span>
                    </button>
                </div>
            </template>
        </PageHeader>

        <!-- Operational Workbench Header (Bento KPI Dock) -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-gradient-to-r from-blue-50/30 via-slate-50/20 to-white">
                <div class="space-y-2">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-200">
                            <Scale class="w-4 h-4" />
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900">Alur Pengadaan Tender RFQ (Multi-Vendor)</h3>
                            <p class="text-xs text-slate-500">Distribusi dokumen tender berdasarkan status penawaran dan evaluasi rekanan</p>
                        </div>
                    </div>

                    <!-- Live Metric Pills -->
                    <div class="flex items-center gap-2 pt-1 flex-wrap">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <FileText class="w-3.5 h-3.5 text-slate-500" />
                            <span>Total Tender: <strong class="text-slate-900 font-mono">{{ stats.total }}</strong></span>
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock class="w-3.5 h-3.5 text-blue-600" />
                            <span>Menunggu Penawaran: <strong class="font-mono">{{ stats.published }}</strong></span>
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <BarChart3 class="w-3.5 h-3.5 text-amber-600" />
                            <span>Dalam Evaluasi: <strong class="font-mono">{{ stats.evaluation }}</strong></span>
                        </span>

                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCheck class="w-3.5 h-3.5 text-emerald-600" />
                            <span>Selesai (Awarded): <strong class="font-mono">{{ stats.completed }}</strong></span>
                        </span>
                    </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                    <RouterLink
                        :to="{ name: 'user.purchasing.plans' }"
                        class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                        <Layers class="w-3.5 h-3.5 text-slate-500" />
                        <span>Lihat Procurement Plans</span>
                    </RouterLink>
                </div>
            </div>
        </div>

        <!-- Filter Bar & Table Section -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <!-- Filter Toolbar -->
            <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <!-- Status Tabs -->
                <div class="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    <button
                        v-for="tab in statusTabs"
                        :key="tab.id"
                        type="button"
                        @click="handleStatusFilter(tab.id)"
                        :class="[
                            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer',
                            selectedStatus === tab.id
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        ]"
                    >
                        {{ tab.label }}
                    </button>
                </div>

                <!-- Search Input -->
                <div class="relative w-full md:w-72">
                    <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Cari No. RFQ, judul, no. PP..."
                        class="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                    />
                </div>
            </div>

            <!-- RFQ Table -->
            <BaseTable :columns="tableColumns">
                <!-- Loading State -->
                <tr v-if="isLoading">
                    <td colspan="7" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat daftar Request for Quotation (RFQ)...
                        </div>
                    </td>
                </tr>

                <!-- Empty State -->
                <tr v-else-if="rfqs.length === 0">
                    <td colspan="7" class="px-6 py-14 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2.5">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                <Scale class="w-6 h-6 text-slate-400" />
                            </div>
                            <div class="text-sm font-semibold text-slate-700">
                                {{ searchQuery ? 'Tidak ada tender RFQ yang cocok dengan pencarian' : 'Belum Ada Tender RFQ' }}
                            </div>
                            <p class="text-xs text-slate-400">
                                {{ searchQuery ? 'Coba ubah kata kunci pencarian atau reset filter status Anda.' : 'Buat paket tender pengadaan baru dari antrean Procurement Plan yang siap ditenderkan.' }}
                            </p>
                            <button
                                v-if="!searchQuery"
                                type="button"
                                @click="goToCreate"
                                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-xs mt-1 cursor-pointer"
                            >
                                <Plus class="w-4 h-4" />
                                <span>Buat RFQ Pertama</span>
                            </button>
                        </div>
                    </td>
                </tr>

                <!-- Data Rows -->
                <tr
                    v-else
                    v-for="(rfq, index) in rfqs"
                    :key="rfq.id"
                    class="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-b-0"
                >
                    <!-- No -->
                    <td class="px-4 py-4.5 whitespace-nowrap text-sm font-mono font-semibold text-slate-500 text-center">
                        {{ (pagination.current_page - 1) * pagination.per_page + index + 1 }}
                    </td>

                    <!-- No. RFQ & Judul Tender -->
                    <td class="px-6 py-4.5">
                        <button
                            type="button"
                            @click="goToDetail(rfq.id)"
                            class="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors group/btn text-left cursor-pointer"
                            title="Klik untuk melihat rincian tender"
                        >
                            <span class="group-hover/btn:underline">{{ rfq.rfq_number }}</span>
                            <ArrowUpRight class="w-4 h-4 text-slate-400 group-hover/btn:text-blue-600 opacity-0 group-hover/btn:opacity-100 transition-all shrink-0" />
                        </button>
                        <div class="text-xs text-slate-600 font-medium mt-1 line-clamp-1 max-w-sm" :title="rfq.title">
                            {{ rfq.title }}
                        </div>
                    </td>

                    <!-- Procurement Plan Asal -->
                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div class="text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5">
                            <Layers class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{{ rfq.procurement_plan?.pp_number || `PP #${rfq.procurement_plan_id || '-'}` }}</span>
                        </div>
                        <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                            <Building2 class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span class="truncate max-w-[200px]">{{ rfq.company?.name || rfq.procurement_plan?.purchase_requisition?.company?.name || 'PT Padma Soode Indonesia' }}</span>
                        </div>
                    </td>

                    <!-- Batas Waktu & Countdown -->
                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div class="text-xs text-slate-800 font-semibold flex items-center gap-1.5">
                            <Calendar class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{{ formatDate(rfq.deadline_date) }}</span>
                        </div>
                        <div class="mt-1">
                            <span 
                                :class="[
                                    'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border',
                                    getDeadlineInfo(rfq.deadline_date).badgeClass
                                ]"
                            >
                                {{ getDeadlineInfo(rfq.deadline_date).text }}
                            </span>
                        </div>
                    </td>

                    <!-- Progres Penawaran Masuk -->
                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <div class="inline-flex flex-col items-center justify-center">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                <Users class="w-3.5 h-3.5 text-slate-500" />
                                <span>{{ rfq.quotations_count ?? rfq.quotations?.length ?? 0 }} / {{ rfq.suppliers_count ?? rfq.rfq_suppliers?.length ?? 0 }} Vendor</span>
                            </span>
                            <span class="text-[10px] text-slate-500 font-medium mt-1">
                                {{ rfq.items_count ?? rfq.items?.length ?? 0 }} Item Ditenderkan
                            </span>
                        </div>
                    </td>

                    <!-- Status -->
                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <div class="inline-flex items-center justify-center">
                            <StatusBadge :status="rfq.status" size="md" class="min-w-[120px]" />
                        </div>
                    </td>

                    <!-- Actions -->
                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <!-- Detail View -->
                            <button
                                type="button"
                                @click="goToDetail(rfq.id)"
                                class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                                title="Lihat Rincian Tender"
                            >
                                <Eye class="w-4 h-4" />
                            </button>

                            <!-- Comparison Matrix Button -->
                            <button
                                type="button"
                                @click="goToComparison(rfq.id)"
                                :class="[
                                    'p-2 rounded-lg transition-colors border cursor-pointer',
                                    (rfq.quotations_count > 0 || ['published', 'evaluation', 'completed'].includes(rfq.status?.value || rfq.status))
                                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                        : 'text-slate-400 bg-slate-50 border-slate-200 hover:text-slate-600'
                                ]"
                                title="Buka Matriks Komparasi Penawaran"
                            >
                                <Scale class="w-4 h-4" />
                            </button>

                            <!-- Publish (if draft) -->
                            <button
                                v-if="(rfq.status?.value || rfq.status) === 'draft'"
                                type="button"
                                @click="handlePublish(rfq)"
                                class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                                title="Publikasikan Tender Sekarang"
                            >
                                <Play class="w-4 h-4" />
                            </button>

                            <!-- Cancel (if draft, published, or evaluation) -->
                            <button
                                v-if="['draft', 'published', 'evaluation'].includes(rfq.status?.value || rfq.status)"
                                type="button"
                                @click="handleCancel(rfq)"
                                class="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                                title="Batalkan Tender RFQ"
                            >
                                <Ban class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            </BaseTable>

            <!-- Pagination -->
            <div class="p-4 border-t border-slate-100">
                <Pagination
                    :pagination="pagination"
                    @page-change="handlePageChange"
                />
            </div>
        </div>
    </div>
</template>
