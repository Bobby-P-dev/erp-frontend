<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { 
    getPurchaseRequisitions, 
    showPurchaseRequisition, 
    submitPurchaseRequisition 
} from '../../services/purchaseRequisitionServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { formatCurrency } from '../../utils/stringUtils.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import Pagination from '../../components/ui/Pagination.vue'
import DocumentWorkflowTracker from '../../components/approval/DocumentWorkflowTracker.vue'

import {
    Home,
    ChevronRight,
    ShoppingBag,
    FileText,
    Plus,
    RefreshCw,
    Calendar,
    Building2,
    Layers,
    Clock,
    CheckCircle2,
    FileEdit,
    Send,
    Eye,
    ExternalLink,
    X,
    Check,
    FastForward,
    DollarSign,
    Search,
    AlertCircle,
    ArrowUpRight,
    RotateCcw
} from '@lucide/vue'

const router = useRouter()

// Data State
const requisitions = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
let searchTimeout = null

const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 10
})

// Status Tabs Configuration
const statusTabs = [
    { id: '', label: 'Semua Pengajuan' },
    { id: 'draft', label: 'Draft' },
    { id: 'pending_approval', label: 'Menunggu Approval' },
    { id: 'approved', label: 'Disetujui' },
    { id: 'rejected,revision_requested', label: 'Ditolak / Revisi' }
]

// Table Columns (Personal Requisition View: removed redundant 'Pemohon' column)
const tableColumns = [
    { key: 'no', label: 'No', class: 'w-12 text-center' },
    { key: 'pr_number', label: 'Nomor PR', class: 'min-w-[150px]' },
    { key: 'dates', label: 'Tanggal & Kebutuhan', class: 'min-w-[170px]' },
    { key: 'org', label: 'Perusahaan & Divisi', class: 'min-w-[180px]' },
    { key: 'purpose', label: 'Keperluan & Estimasi Biaya', class: 'min-w-[240px]' },
    { key: 'status', label: 'Status & Alur Approval', class: 'min-w-[190px] text-center' },
    { key: 'actions', label: 'Aksi', class: 'w-28 text-center' }
]

// Fetch List
const fetchRequisitions = async (search = searchQuery.value, page = 1) => {
    try {
        isLoading.value = true
        const filter = {}
        if (statusFilter.value) {
            filter.status = statusFilter.value
        }

        const response = await getPurchaseRequisitions(search, page, pagination.value.per_page, filter)
        requisitions.value = response.data || []

        const resPagination = response.meta || response
        pagination.value = {
            current_page: resPagination.current_page || 1,
            last_page: resPagination.last_page || 1,
            from: resPagination.from || 0,
            to: resPagination.to || 0,
            total: resPagination.total || 0,
            per_page: resPagination.per_page || 10
        }
    } catch (error) {
        showError('Gagal Memuat Data', 'Terjadi kesalahan saat memuat daftar Purchase Requisition Anda.', error)
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    fetchRequisitions()
})

// Tab Switcher
const selectStatusTab = (tabId) => {
    if (statusFilter.value === tabId) return
    statusFilter.value = tabId
    fetchRequisitions(searchQuery.value, 1)
}

// Watch search with debounce
watch(searchQuery, (newVal) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchRequisitions(newVal, 1)
    }, 350)
})

const clearSearch = () => {
    searchQuery.value = ''
    fetchRequisitions('', 1)
}

const handlePageChange = (page) => {
    fetchRequisitions(searchQuery.value, page)
}

const handlePerPageChange = (event) => {
    pagination.value.per_page = Number(event.target.value) || 10
    fetchRequisitions(searchQuery.value, 1)
}

// Helpers
const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })
}

const getStatusBadge = (status) => {
    switch (status) {
        case 'draft':
            return {
                label: 'Draft',
                bg: 'bg-slate-100 text-slate-700 border-slate-200',
                dot: 'bg-slate-400'
            }
        case 'pending_approval':
            return {
                label: 'Menunggu Approval',
                bg: 'bg-amber-50 text-amber-800 border-amber-200',
                dot: 'bg-amber-500'
            }
        case 'approved':
            return {
                label: 'Disetujui',
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                dot: 'bg-emerald-600'
            }
        case 'revision_requested':
        case 'revision':
            return {
                label: 'Perlu Revisi',
                bg: 'bg-amber-50 text-amber-800 border-amber-200',
                dot: 'bg-amber-500'
            }
        case 'rejected':
            return {
                label: 'Ditolak',
                bg: 'bg-rose-50 text-rose-800 border-rose-200',
                dot: 'bg-rose-500'
            }
        case 'cancelled':
            return {
                label: 'Dibatalkan',
                bg: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                dot: 'bg-zinc-400'
            }
        default:
            return {
                label: status || '-',
                bg: 'bg-slate-50 text-slate-700 border-slate-200',
                dot: 'bg-slate-400'
            }
    }
}

const getLatestRevisionNote = (pr) => {
    if (!pr?.approval_request?.actions || !Array.isArray(pr.approval_request.actions)) return null
    const revAction = pr.approval_request.actions
        .filter(a => a.action === 'revision' || a.action === 'request_revision')
        .sort((a, b) => new Date(b.acted_at || 0) - new Date(a.acted_at || 0))[0]
    return revAction || null
}

const getActiveStepName = (pr) => {
    if (!pr?.approval_request?.levels || !Array.isArray(pr.approval_request.levels)) return ''
    const currentOrder = pr.approval_request.current_step_order || 1
    const currentLevel = pr.approval_request.levels.find(l => l.step_order === currentOrder)
    return currentLevel?.step_name || 'Menunggu Verifikasi'
}

// Detail Modal State
const showDetailModal = ref(false)
const selectedPR = ref(null)
const isLoadingDetail = ref(false)

const openDetail = async (pr) => {
    selectedPR.value = pr
    showDetailModal.value = true
    try {
        isLoadingDetail.value = true
        const response = await showPurchaseRequisition(pr.id)
        selectedPR.value = response.data || response
    } catch (error) {
        showError('Gagal Memuat Detail', 'Tidak dapat memuat rincian Purchase Requisition.', error)
    } finally {
        isLoadingDetail.value = false
    }
}

const closeDetail = () => {
    showDetailModal.value = false
    selectedPR.value = null
}

// Submit PR for Approval (First-time or Resubmit after revision)
const handleSubmitPR = async (pr) => {
    const isRevision = pr.status === 'revision_requested'
    const isConfirmed = await showConfirm(
        isRevision ? 'Ajukan Ulang Persetujuan?' : 'Ajukan Persetujuan?',
        isRevision 
            ? `Purchase Requisition ${pr.pr_number} akan diajukan kembali ke workflow persetujuan setelah perbaikan revisi. Lanjutkan?`
            : `Purchase Requisition ${pr.pr_number} akan diajukan ke workflow persetujuan berjenjang. Lanjutkan?`,
        isRevision ? 'Ya, Ajukan Ulang' : 'Ya, Ajukan Sekarang'
    )

    if (isConfirmed) {
        try {
            showLoading(
                isRevision ? 'Mengajukan ulang PR...' : 'Mengajukan PR...', 
                'Menghubungkan ke workflow approval.'
            )
            await submitPurchaseRequisition(pr.id)
            showSuccess(
                isRevision ? 'Berhasil Diajukan Ulang!' : 'Berhasil Diajukan!', 
                isRevision
                    ? `Purchase Requisition ${pr.pr_number} berhasil diajukan kembali dan sedang menunggu peninjauan ulang.`
                    : `Purchase Requisition ${pr.pr_number} berhasil diajukan dan sedang menunggu persetujuan.`
            )
            if (showDetailModal.value) {
                closeDetail()
            }
            await fetchRequisitions(searchQuery.value, pagination.value.current_page)
        } catch (error) {
            const msg = error?.response?.data?.message || 'Gagal mengajukan persetujuan Purchase Requisition.'
            showError('Gagal Mengajukan', msg, error)
        }
    }
}



const calculateTotalPR = (items) => {
    if (!items || !Array.isArray(items)) return 0
    return items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.estimated_price) || 0)), 0)
}
</script>

<template>
    <div class="flex flex-col gap-5">
        <!-- 1. BREADCRUMB -->
        <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <RouterLink 
                :to="{ name: 'user.dashboard' }" 
                class="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
                <Home class="w-3.5 h-3.5" />
                <span>Dashboard</span>
            </RouterLink>
            <ChevronRight class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <RouterLink 
                :to="{ name: 'user.purchasing' }" 
                class="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
                <ShoppingBag class="w-3.5 h-3.5" />
                <span>Purchasing</span>
            </RouterLink>
            <ChevronRight class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span class="text-slate-900 font-semibold" aria-current="page">Purchase Requisitions</span>
        </nav>

        <!-- 2. PAGE HEADER -->
        <div class="bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1">
                <div class="flex items-center gap-2.5">
                    <div class="p-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/60">
                        <FileText class="w-5 h-5 text-slate-800" />
                    </div>
                    <div>
                        <h1 class="text-lg font-bold text-slate-900 tracking-tight">
                            Purchase Requisitions
                        </h1>
                        <p class="text-xs text-slate-500 mt-0.5">
                            Daftar pengajuan kebutuhan barang dan jasa yang Anda buat. Pantau status review dan riwayat persetujuan.
                        </p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-2.5 shrink-0">
                <RouterLink
                    :to="{ name: 'user.purchasing.requisitions.create' }"
                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition-colors shadow-xs shadow-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                    <Plus class="w-4 h-4" />
                    <span>Buat PR Baru</span>
                </RouterLink>
            </div>
        </div>

        <!-- 3. UNIFIED DATA TABLE CONTAINER -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
            <!-- STATUS TAB BAR (Segmented Filter) -->
            <div class="border-b border-slate-200 bg-slate-50/70 px-4 pt-2.5 flex items-center justify-between gap-4 overflow-x-auto">
                <div class="flex items-center gap-1 -mb-px">
                    <button
                        v-for="tab in statusTabs"
                        :key="tab.id"
                        type="button"
                        @click="selectStatusTab(tab.id)"
                        :class="[
                            statusFilter === tab.id
                                ? 'border-slate-900 text-slate-900 bg-white font-semibold shadow-2xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium',
                            'px-3.5 py-2 text-xs rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap'
                        ]"
                    >
                        <span>{{ tab.label }}</span>
                        <span 
                            v-if="statusFilter === tab.id"
                            class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800"
                        >
                            {{ pagination.total }}
                        </span>
                    </button>
                </div>

                <div class="hidden sm:flex items-center gap-2 text-xs text-slate-500 pb-2">
                    <span>Total Pengajuan:</span>
                    <span class="font-mono font-bold text-slate-900">{{ pagination.total }}</span>
                </div>
            </div>

            <!-- TOOLBAR -->
            <div class="p-3.5 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div class="relative w-full sm:max-w-md">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                        v-model="searchQuery"
                        type="text" 
                        placeholder="Cari nomor PR, keperluan, atau nama barang..."
                        class="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"
                    >
                    <button 
                        v-if="searchQuery"
                        type="button"
                        @click="clearSearch"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X class="w-3.5 h-3.5" />
                    </button>
                </div>

                <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <div class="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>Tampilkan:</span>
                        <select
                            :value="pagination.per_page"
                            @change="handlePerPageChange"
                            class="py-1 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        >
                            <option :value="10">10 / hal</option>
                            <option :value="25">25 / hal</option>
                            <option :value="50">50 / hal</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        @click="fetchRequisitions(searchQuery, pagination.current_page)"
                        :disabled="isLoading"
                        class="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
                        title="Segarkan Data"
                    >
                        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
                    </button>
                </div>
            </div>

            <!-- TABLE -->
            <BaseTable :columns="tableColumns">
                <tr v-if="isLoading">
                    <td colspan="7" class="px-6 py-14 text-center text-xs text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat daftar Purchase Requisition...
                        </div>
                    </td>
                </tr>

                <tr v-else-if="requisitions.length === 0">
                    <td colspan="7" class="px-6 py-14 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2.5">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                <FileText class="w-6 h-6 text-slate-400" />
                            </div>
                            <div class="text-xs font-semibold text-slate-700">
                                {{ searchQuery || statusFilter ? 'Tidak ada pengajuan yang cocok dengan kriteria filter' : 'Belum Ada Pengajuan Purchase Requisition' }}
                            </div>
                            <p class="text-[11px] text-slate-400">
                                {{ searchQuery || statusFilter ? 'Coba ubah kata kunci pencarian atau reset tab status.' : 'Anda belum membuat pengajuan pengadaan barang/jasa. Buat permohonan baru untuk memulai.' }}
                            </p>
                            <RouterLink 
                                v-if="!searchQuery && !statusFilter" 
                                :to="{ name: 'user.purchasing.requisitions.create' }"
                                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs shadow-blue-200 mt-1"
                            >
                                <Plus class="w-3.5 h-3.5" />
                                <span>Buat PR Baru</span>
                            </RouterLink>
                        </div>
                    </td>
                </tr>

                <tr 
                    v-for="(pr, index) in requisitions" 
                    :key="pr.id" 
                    class="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-b-0"
                >
                    <!-- No -->
                    <td class="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-slate-400 text-center">
                        {{ ((pagination.current_page - 1) * pagination.per_page) + index + 1 }}
                    </td>

                    <!-- PR Number -->
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <button
                            type="button"
                            @click="openDetail(pr)"
                            class="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors group/btn text-left"
                            title="Klik untuk melihat rincian PR"
                        >
                            <span class="group-hover/btn:underline">{{ pr.pr_number }}</span>
                            <ArrowUpRight class="w-3 h-3 text-slate-400 group-hover/btn:text-indigo-600 opacity-0 group-hover/btn:opacity-100 transition-all shrink-0" />
                        </button>
                    </td>

                    <!-- Dates -->
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <div class="text-xs text-slate-800 font-medium flex items-center gap-1.5">
                            <Calendar class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{{ formatDate(pr.request_date) }}</span>
                        </div>
                        <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <Clock class="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Target: {{ formatDate(pr.required_date) }}</span>
                        </div>
                    </td>

                    <!-- Company & Division -->
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <div class="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <Building2 class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{{ pr.company?.name || 'Perusahaan #' + pr.company_id }}</span>
                        </div>
                        <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <Layers class="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{{ pr.division?.name || 'Divisi #' + pr.division_id }}</span>
                        </div>
                    </td>

                    <!-- Purpose & Estimated Total -->
                    <td class="px-4 py-3.5">
                        <div class="text-xs font-medium text-slate-900 max-w-sm truncate" :title="pr.purpose">
                            {{ pr.purpose }}
                        </div>
                        <div class="mt-1 flex items-center gap-2 flex-wrap text-xs">
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                                {{ pr.items ? pr.items.length : 0 }} Item
                            </span>
                            <span 
                                v-if="pr.total_estimated_amount && Number(pr.total_estimated_amount) > 0"
                                class="inline-flex items-center gap-0.5 text-xs font-mono font-bold text-slate-800"
                                title="Estimasi Nilai Total"
                            >
                                {{ formatCurrency(pr.total_estimated_amount) }}
                            </span>
                        </div>
                    </td>

                    <!-- Status & Approval Stage -->
                    <td class="px-4 py-3.5 whitespace-nowrap text-center">
                        <div class="inline-flex flex-col items-center">
                            <span 
                                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border"
                                :class="getStatusBadge(pr.status).bg"
                            >
                                <span class="w-1.5 h-1.5 rounded-full" :class="getStatusBadge(pr.status).dot"></span>
                                {{ getStatusBadge(pr.status).label }}
                            </span>
                            
                            <!-- Detailed active approval step indicator -->
                            <span 
                                v-if="pr.status === 'pending_approval' && pr.approval_request" 
                                class="text-[10px] text-amber-700 font-medium mt-1 truncate max-w-[170px]"
                                :title="'Tahap ' + (pr.approval_request.current_step_order || 1) + ': ' + getActiveStepName(pr)"
                            >
                                Tahap {{ pr.approval_request.current_step_order || 1 }}: {{ getActiveStepName(pr) }}
                            </span>
                            <span 
                                v-else-if="pr.status === 'revision_requested'" 
                                class="text-[10px] text-amber-700 font-medium mt-1 truncate max-w-[170px]"
                                title="Menunggu perbaikan data oleh pemohon"
                            >
                                Perlu tindakan perbaikan
                            </span>
                        </div>
                    </td>

                    <!-- Actions -->
                    <td class="px-4 py-3.5 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <button
                                type="button"
                                @click="openDetail(pr)"
                                class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                title="Lihat Rincian PR"
                            >
                                <Eye class="w-4 h-4" />
                            </button>

                            <RouterLink
                                v-if="pr.status === 'draft' || pr.status === 'revision_requested'"
                                :to="{ name: 'user.purchasing.requisitions.edit', params: { id: pr.id } }"
                                class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                                :title="pr.status === 'revision_requested' ? 'Perbaiki & Edit PR' : 'Edit Draft PR'"
                            >
                                <FileEdit class="w-4 h-4" />
                            </RouterLink>

                            <button
                                v-if="pr.can_be_submitted || pr.status === 'draft' || pr.status === 'revision_requested'"
                                type="button"
                                @click="handleSubmitPR(pr)"
                                class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
                                :title="pr.status === 'revision_requested' ? 'Ajukan Ulang Persetujuan' : 'Ajukan Persetujuan Sekarang'"
                            >
                                <Send class="w-3 h-3" />
                                <span>{{ pr.status === 'revision_requested' ? 'Ajukan Ulang' : 'Ajukan' }}</span>
                            </button>
                        </div>
                    </td>
                </tr>
            </BaseTable>

            <!-- PAGINATION -->
            <div class="border-t border-slate-200/80 bg-slate-50/40">
                <Pagination
                    :pagination="pagination"
                    @change-page="handlePageChange"
                    @page-change="handlePageChange"
                />
            </div>
        </div>

        <!-- 4. DETAIL MODAL (Human-Crafted Structured Dialog) -->
        <div 
            v-if="showDetailModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/50"
            @click.self="closeDetail"
        >
            <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl lg:max-w-5xl overflow-hidden my-6">
                <!-- Modal Header -->
                <div class="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                            <FileText class="w-5 h-5 text-slate-800" />
                        </div>
                        <div>
                            <div class="flex items-center gap-2.5">
                                <h3 class="text-sm font-bold text-slate-900 font-mono tracking-tight">
                                    {{ selectedPR?.pr_number }}
                                </h3>
                                <span 
                                    v-if="selectedPR?.status"
                                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border"
                                    :class="getStatusBadge(selectedPR.status).bg"
                                >
                                    <span class="w-1.5 h-1.5 rounded-full" :class="getStatusBadge(selectedPR.status).dot"></span>
                                    {{ getStatusBadge(selectedPR.status).label }}
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 mt-0.5">
                                Rincian lengkap dokumen pengajuan pengadaan barang & jasa
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        @click="closeDetail"
                        class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-5 max-h-[75vh] overflow-y-auto space-y-5">
                    <div v-if="isLoadingDetail" class="py-12 text-center">
                        <RefreshCw class="w-5 h-5 animate-spin text-slate-700 mx-auto mb-2" />
                        <span class="text-xs text-slate-500">Memuat rincian dokumen PR...</span>
                    </div>

                    <template v-else-if="selectedPR">
                        <!-- Revision Notice Banner if revision_requested -->
                        <div 
                            v-if="selectedPR.status === 'revision_requested'" 
                            class="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2"
                        >
                            <div class="flex items-center gap-2 text-amber-900 font-bold text-xs">
                                <RotateCcw class="w-4 h-4 text-amber-600" />
                                <span>Permintaan Revisi Dokumen dari Peninjau:</span>
                            </div>
                            <p class="text-xs text-amber-900 bg-white/80 p-3 rounded-lg border border-amber-200/70 font-medium leading-relaxed">
                                "{{ getLatestRevisionNote(selectedPR)?.notes || 'Mohon sesuaikan rincian barang dan perkiraan harga sesuai arahan pimpinan.' }}"
                            </p>
                            <div class="flex items-center justify-between text-[11px] text-amber-700">
                                <span>Peninjau: <strong>{{ getLatestRevisionNote(selectedPR)?.user_name || 'Approver' }}</strong></span>
                                <span v-if="getLatestRevisionNote(selectedPR)?.acted_at">{{ formatDate(getLatestRevisionNote(selectedPR).acted_at) }}</span>
                            </div>
                        </div>

                        <!-- Key Metadata Grid -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                            <div>
                                <span class="text-slate-400 font-medium block text-[11px]">Perusahaan:</span>
                                <span class="font-semibold text-slate-800 mt-0.5 block">{{ selectedPR.company?.name || '-' }}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 font-medium block text-[11px]">Divisi:</span>
                                <span class="font-semibold text-slate-800 mt-0.5 block">{{ selectedPR.division?.name || '-' }}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 font-medium block text-[11px]">Tanggal Pengajuan:</span>
                                <span class="font-semibold text-slate-800 mt-0.5 block">{{ formatDate(selectedPR.request_date) }}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 font-medium block text-[11px]">Target Kebutuhan:</span>
                                <span class="font-semibold text-slate-800 mt-0.5 block">{{ formatDate(selectedPR.required_date) }}</span>
                            </div>
                        </div>

                        <!-- Total Estimated Amount Card -->
                        <div class="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-xl shadow-xs">
                            <div class="space-y-0.5">
                                <span class="text-xs text-blue-100 font-medium">Total Estimasi Nilai Pengadaan</span>
                                <p class="text-[11px] text-blue-200/90">Total akumulasi perkiraan biaya dari seluruh item yang diajukan.</p>
                            </div>
                            <div class="text-base font-mono font-bold tracking-tight text-white">
                                {{ formatCurrency(selectedPR.total_estimated_amount || calculateTotalPR(selectedPR.items)) }}
                            </div>
                        </div>

                        <!-- Purpose & Notes -->
                        <div class="space-y-2.5">
                            <div class="bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                                <span class="text-xs font-bold text-slate-800 block mb-1">Keperluan Pengadaan:</span>
                                <p class="text-slate-700 leading-relaxed">
                                    {{ selectedPR.purpose }}
                                </p>
                            </div>

                            <div v-if="selectedPR.notes" class="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                                <span class="text-xs font-bold text-slate-600 block mb-1">Catatan Tambahan:</span>
                                <p class="text-slate-600">{{ selectedPR.notes }}</p>
                            </div>
                        </div>

                        <!-- Approval Workflow Progress Tracker & Audit Trail -->
                        <DocumentWorkflowTracker
                            documentType="purchase_requisition"
                            :documentId="selectedPR.id"
                            title="Progres Alur Persetujuan (Workflow)"
                            auditTrailTitle="Jejak Audit Persetujuan (Audit Trail)"
                        />

                        <!-- Items Table -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Daftar Barang / Jasa Diajukan ({{ selectedPR.items?.length || 0 }} Item)
                                </h4>
                            </div>

                            <div class="border border-slate-200 rounded-lg overflow-hidden">
                                <table class="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                            <th class="py-2 px-3 w-10 text-center">No</th>
                                            <th class="py-2 px-3">Item / Barang</th>
                                            <th class="py-2 px-3 text-right w-20">Qty</th>
                                            <th class="py-2 px-3 w-20">Satuan</th>
                                            <th class="py-2 px-3 text-right w-28">Est. Harga Satuan</th>
                                            <th class="py-2 px-3 text-right w-28">Subtotal</th>
                                            <th class="py-2 px-3">Catatan / Referensi</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100 bg-white">
                                        <tr v-for="(item, idx) in selectedPR.items" :key="item.id || idx" class="hover:bg-slate-50/50">
                                            <td class="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{{ idx + 1 }}</td>
                                            <td class="py-2 px-3">
                                                <div class="font-bold text-slate-900 flex items-center gap-2">
                                                    <span>{{ item.item?.name || item.item_name || 'Item #' + (item.item_id || '-') }}</span>
                                                    <span 
                                                        v-if="!item.item_id" 
                                                        class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                                    >
                                                        Non-Katalog
                                                    </span>
                                                </div>
                                                <div v-if="item.item?.code" class="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    {{ item.item.code }}
                                                </div>
                                            </td>
                                            <td class="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                                {{ item.quantity }}
                                            </td>
                                            <td class="py-2 px-3 text-slate-600">
                                                {{ item.unit?.code || item.unit?.name || '-' }}
                                            </td>
                                            <td class="py-2 px-3 text-right font-mono text-slate-700">
                                                {{ formatCurrency(item.estimated_price || 0) }}
                                            </td>
                                            <td class="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                                {{ formatCurrency((Number(item.quantity) || 0) * (Number(item.estimated_price) || 0)) }}
                                            </td>
                                            <td class="py-2 px-3">
                                                <div v-if="item.notes" class="text-slate-700">
                                                    {{ item.notes }}
                                                </div>
                                                <a 
                                                    v-if="item.reference_url" 
                                                    :href="item.reference_url" 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    class="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium mt-0.5"
                                                >
                                                    <ExternalLink class="w-3 h-3" />
                                                    <span>Link Referensi</span>
                                                </a>
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                                            <td colspan="5" class="py-2.5 px-3 text-right text-xs">
                                                Total Estimasi Biaya:
                                            </td>
                                            <td class="py-2.5 px-3 text-right text-xs font-mono font-bold text-slate-900">
                                                {{ formatCurrency(selectedPR.total_estimated_amount || calculateTotalPR(selectedPR.items)) }}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </template>
                </div>

                <!-- Modal Footer -->
                <div class="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                        type="button"
                        @click="closeDetail"
                        class="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors border border-slate-300 bg-white"
                    >
                        Tutup
                    </button>

                    <div v-if="selectedPR?.can_be_submitted || selectedPR?.status === 'draft' || selectedPR?.status === 'revision_requested'" class="flex items-center gap-2">
                        <RouterLink
                            v-if="selectedPR?.status === 'draft' || selectedPR?.status === 'revision_requested'"
                            :to="{ name: 'user.purchasing.requisitions.edit', params: { id: selectedPR.id } }"
                            class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <FileEdit class="w-3.5 h-3.5" />
                            <span>{{ selectedPR?.status === 'revision_requested' ? 'Perbaiki & Edit PR' : 'Edit Draft PR' }}</span>
                        </RouterLink>

                        <button
                            type="button"
                            @click="handleSubmitPR(selectedPR)"
                            class="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                        >
                            <Send class="w-3.5 h-3.5" />
                            <span>{{ selectedPR?.status === 'revision_requested' ? 'Ajukan Ulang Persetujuan' : 'Ajukan Persetujuan Sekarang' }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
