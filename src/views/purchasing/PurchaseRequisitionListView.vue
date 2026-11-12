<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import TableDocumentCell from '../../components/ui/TableDocumentCell.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import Pagination from '../../components/ui/Pagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import PurchaseRequisitionDetailModal from '../../components/purchasing/PurchaseRequisitionDetailModal.vue'

import { useDataTable } from '../../composables/useDataTable.js'
import { useFormatter } from '../../composables/useFormatter.js'
import {
    getPurchaseRequisitions,
    showPurchaseRequisition,
    submitPurchaseRequisition
} from '../../services/purchaseRequisitionServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import {
    ShoppingBag,
    Plus,
    FileText,
    Send,
    Eye,
    FileEdit,
    RefreshCw,
    Download,
    Loader2
} from '@lucide/vue'
import { generatePurchaseRequisitionPdf } from '../../utils/pdf/purchaseRequisitionPdfGenerator.js'
import { useAuthStore } from '../../stores/auth.js'

const authStore = useAuthStore()
const downloadingPrId = ref(null)
const { formatDate, formatCurrency } = useFormatter()

// 1. Data Table Composable
const {
    items: requisitions,
    isLoading,
    searchQuery,
    filters,
    pagination,
    fetchData,
    handlePageChange,
    handlePerPageChange
} = useDataTable(
    (search, page, perPage, activeFilters) => {
        return getPurchaseRequisitions(search, page, perPage, activeFilters)
    },
    {
        initialFilters: {
            status: ''
        },
        initialPerPage: 10
    }
)

// 2. Modals State
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

const canDownloadPdf = (pr) => {
    if (!pr) return false
    const approvedStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed']
    return approvedStatuses.includes(pr.status)
}

const handleDownloadPdf = async (pr) => {
    if (!pr || downloadingPrId.value === pr.id) return
    downloadingPrId.value = pr.id
    try {
        await generatePurchaseRequisitionPdf(pr, {
            currentUser: authStore.user?.name || 'Petugas ERP'
        })
    } finally {
        downloadingPrId.value = null
    }
}


const handleSubmitPR = async (pr) => {
    const isRevision = pr.status === 'revision_requested'
    const confirmTitle = isRevision ? 'Ajukan Ulang PR?' : 'Ajukan PR untuk Persetujuan?'
    const confirmText = isRevision
        ? `Dokumen PR ${pr.pr_number} akan diajukan ulang ke alur persetujuan pimpinan setelah Anda perbaiki.`
        : `Dokumen PR ${pr.pr_number} akan diajukan ke alur persetujuan. Anda tidak dapat mengubah data setelah diajukan.`
    const confirmBtn = isRevision ? 'Ya, Ajukan Ulang' : 'Ya, Ajukan'

    const confirmed = await showConfirm(confirmTitle, confirmText, confirmBtn)
    if (confirmed) {
        try {
            showLoading('Mengajukan PR...')
            await submitPurchaseRequisition(pr.id)
            showSuccess('Berhasil!', `PR ${pr.pr_number} berhasil diajukan untuk persetujuan.`)
            fetchData(pagination.value.current_page)
            if (showDetailModal.value) {
                showDetailModal.value = false
            }
        } catch (error) {
            showError('Gagal!', 'Terjadi kesalahan saat mengajukan PR.', error)
        }
    }
}

// 3. Tab & Status Definitions
const statusTabs = [
    { id: '', label: 'Semua Status' },
    { id: 'draft', label: 'Draft' },
    { id: 'pending_approval', label: 'Menunggu Approval' },
    { id: 'approved', label: 'Disetujui' },
    { id: 'ready_for_pickup', label: 'Siap Diambil' },
    { id: 'completed', label: 'Selesai' },
    { id: 'revision_or_rejected', label: 'Revisi / Ditolak' }
]

const tableColumns = [
    { key: 'pr_number', label: 'Pengajuan', minWidth: '240px', width: '25%' },
    { key: 'request_date', label: 'Tanggal & target', minWidth: '150px', width: '14%' },
    { key: 'company_id', label: 'Perusahaan & divisi', minWidth: '210px', width: '20%' },
    { key: 'estimate', label: 'Estimasi', minWidth: '150px', width: '15%', align: 'right' },
    { key: 'status', label: 'Status', minWidth: '180px', width: '17%' },
    { key: 'actions', label: 'Aksi', minWidth: '180px', width: '210px', align: 'right' }
]

const getActiveStepName = (pr) => {
    if (!pr?.approval_request?.levels || !Array.isArray(pr.approval_request.levels)) return ''
    const currentOrder = pr.approval_request.current_step_order || 1
    const currentLevel = pr.approval_request.levels.find(l => l.step_order === currentOrder)
    return currentLevel?.step_name || 'Menunggu Verifikasi'
}
</script>

<template>
    <div class="pr-list flex min-w-0 flex-col gap-6">
        <!-- 1. BREADCRUMB -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' }, icon: ShoppingBag },
                { label: 'Purchase Requisitions' }
            ]" 
        />

        <!-- 2. PAGE HEADER -->
        <div class="flex flex-col justify-between gap-4 py-1 sm:flex-row sm:items-center">
            <div class="space-y-1">
                <div class="flex items-center gap-2.5">
                    <div class="p-3 bg-blue-50 text-[#014BAA] rounded-xl">
                        <FileText class="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                        <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">
                            Purchase Requisitions
                        </h1>
                        <p class="text-sm text-slate-500 mt-1">
                            Kelola kebutuhan tim dan pantau perkembangan pengajuan Anda.
                        </p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-2.5 shrink-0">
                <RouterLink
                    :to="{ name: 'user.purchasing.requisitions.create' }"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#014BAA] hover:bg-[#013C89] text-white font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                    <Plus class="w-4 h-4" />
                    <span>Buat PR Baru</span>
                </RouterLink>
            </div>
        </div>

        <!-- 3. UNIFIED DATA TABLE CONTAINER -->
        <div class="min-w-0 bg-white rounded-2xl border border-slate-200/80 flex flex-col overflow-hidden">
            <!-- STATUS TAB BAR -->
            <div class="border-b border-slate-100 px-5 pt-2">
                <div class="hidden flex-wrap gap-x-5 sm:flex" role="group" aria-label="Filter status pengajuan">
                    <button v-for="tab in statusTabs" :key="tab.id" type="button"
                        :aria-pressed="filters.status === tab.id"
                        @click="filters.status = tab.id"
                        class="status-filter border-b-2 py-3 text-sm transition-colors"
                        :class="filters.status === tab.id ? 'border-[#014BAA] font-medium text-[#014BAA]' : 'border-transparent text-slate-500 hover:text-slate-800'"
                    >{{ tab.label }}</button>
                </div>
                <label class="flex items-center gap-3 pb-3 pt-1 text-sm text-slate-600 sm:hidden">
                    Status
                    <select v-model="filters.status" class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm">
                        <option v-for="tab in statusTabs" :key="tab.id" :value="tab.id">{{ tab.label }}</option>
                    </select>
                </label>
            </div>

            <!-- SEARCH & TOOLBAR -->
            <div class="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="relative w-full sm:w-96">
                    <SearchInput
                        v-model="searchQuery"
                        label="Cari pengajuan"
                        placeholder="Cari nomor PR, keperluan, atau entitas..."
                        compact clearable
                    />
                </div>

                <div class="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span class="text-xs text-slate-500" aria-live="polite">{{ pagination.total }} pengajuan sesuai filter</span>
                    <div class="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>Tampilkan:</span>
                        <select
                            aria-label="Jumlah baris per halaman"
                            :value="pagination.per_page"
                            @change="handlePerPageChange"
                            class="py-1 px-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:border-blue-500"
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        @click="fetchData(pagination.current_page)"
                        class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="Segarkan Data"
                        aria-label="Segarkan data"
                        :disabled="isLoading"
                    >
                        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
                    </button>
                </div>
            </div>

            <!-- TABLE -->
            <p id="pr-table-hint" class="px-5 pt-3 text-xs text-slate-500 xl:hidden">Geser tabel untuk melihat seluruh kolom dan aksi.</p>
            <div class="pr-table min-w-0">
            <BaseTable :columns="tableColumns" min-width="1180px" layout="fixed" label="Daftar pengajuan pembelian" :busy="isLoading" aria-describedby="pr-table-hint">
                <tr v-if="isLoading">
                    <td colspan="6" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat daftar Purchase Requisition...
                        </div>
                    </td>
                </tr>

                <tr v-else-if="requisitions.length === 0">
                    <td colspan="6" class="px-6 py-14 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2.5">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                <FileText class="w-6 h-6 text-slate-400" />
                            </div>
                            <div class="text-sm font-semibold text-slate-700">
                                {{ searchQuery || filters.status ? 'Tidak ada pengajuan yang cocok dengan kriteria filter' : 'Belum Ada Pengajuan Purchase Requisition' }}
                            </div>
                            <p class="text-xs text-slate-400">
                                {{ searchQuery || filters.status ? 'Coba ubah kata kunci pencarian atau reset tab status.' : 'Anda belum membuat pengajuan pengadaan barang/jasa. Buat permohonan baru untuk memulai.' }}
                            </p>
                            <RouterLink 
                                v-if="!searchQuery && !filters.status" 
                                :to="{ name: 'user.purchasing.requisitions.create' }"
                                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs shadow-blue-200 mt-1"
                            >
                                <Plus class="w-4 h-4" />
                                <span>Buat PR Baru</span>
                            </RouterLink>
                        </div>
                    </td>
                </tr>

                <tr 
                    v-for="pr in requisitions"
                    :key="pr.id" 
                    class="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-b-0"
                >
                    <!-- PR Number -->
                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <TableDocumentCell :number="pr.pr_number" :description="pr.purpose || 'Keperluan belum diisi'" @open="openDetail(pr)" />
                    </td>

                    <!-- Dates -->
                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div class="text-sm text-slate-700">
                            <span>{{ formatDate(pr.request_date) }}</span>
                        </div>
                        <div class="text-xs text-slate-500 mt-1">
                            <span>Target: {{ formatDate(pr.required_date) }}</span>
                        </div>
                    </td>

                    <!-- Company & Division -->
                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div class="max-w-[260px] truncate text-sm text-slate-700" :title="pr.company?.name">
                            <span>{{ pr.company?.name || 'Perusahaan #' + pr.company_id }}</span>
                        </div>
                        <div class="max-w-[260px] truncate text-xs text-slate-500 mt-1" :title="pr.division?.name">
                            <span>{{ pr.division?.name || 'Divisi #' + pr.division_id }}</span>
                        </div>
                    </td>

                    <!-- Purpose & Estimated Total -->
                    <td class="px-6 py-4.5 text-right whitespace-nowrap">
                            <span 
                                v-if="pr.total_estimated_amount !== null && pr.total_estimated_amount !== undefined"
                                class="text-sm font-medium tabular-nums text-slate-800"
                                title="Estimasi Nilai Total"
                            >
                                {{ formatCurrency(pr.total_estimated_amount, pr.currency) }}
                            </span>
                            <span v-else class="text-sm text-slate-400">—</span>
                            <p class="mt-1 text-xs text-slate-500">{{ Array.isArray(pr.items) ? pr.items.length + ' item' : 'Jumlah item belum tersedia' }}</p>
                    </td>

                    <!-- Status & Approval Stage -->
                    <td class="px-6 py-4.5 whitespace-nowrap">
                        <div class="flex min-w-0 flex-col items-start justify-center">
                            <StatusBadge :status="pr.status" size="sm" :dot="false" />
                            
                            <!-- Detailed active approval step indicator -->
                            <span 
                                v-if="pr.status === 'pending_approval' && pr.approval_request" 
                                class="text-xs font-medium text-amber-800 mt-1.5 truncate max-w-full"
                                :title="'Tahap ' + (pr.approval_request.current_step_order || 1) + ': ' + getActiveStepName(pr)"
                            >
                                Tahap {{ pr.approval_request.current_step_order || 1 }}: {{ getActiveStepName(pr) }}
                            </span>
                            <span 
                                v-else-if="pr.status === 'revision_requested'" 
                                class="text-xs font-medium text-amber-800 mt-1.5 truncate max-w-full"
                                title="Menunggu perbaikan data oleh pemohon"
                            >
                                Perlu tindakan perbaikan
                            </span>
                        </div>
                    </td>

                    <!-- Actions -->
                    <td class="px-6 py-4.5 whitespace-nowrap text-center">
                        <div class="flex items-center justify-end gap-1">
                            <button
                                type="button"
                                @click="openDetail(pr)"
                                class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Lihat Rincian PR"
                                :aria-label="'Lihat rincian ' + pr.pr_number"
                            >
                                <Eye class="w-4.5 h-4.5" />
                            </button>

                            <!-- Unduh Lembar Persetujuan (PDF) Langsung di Tabel -->
                            <button
                                v-if="canDownloadPdf(pr)"
                                type="button"
                                :disabled="downloadingPrId === pr.id"
                                @click="handleDownloadPdf(pr)"
                                class="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Unduh Lembar Persetujuan (PDF)"
                                :aria-label="'Unduh PDF ' + pr.pr_number"
                            >
                                <Loader2 v-if="downloadingPrId === pr.id" class="w-4.5 h-4.5 animate-spin text-blue-600" />
                                <Download v-else class="w-4.5 h-4.5 text-slate-600 hover:text-blue-600" />
                            </button>

                            <RouterLink
                                v-if="pr.status === 'draft' || pr.status === 'revision_requested'"
                                :to="{ name: 'user.purchasing.requisitions.edit', params: { id: pr.id } }"
                                class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                :title="pr.status === 'revision_requested' ? 'Perbaiki & Edit PR' : 'Edit Draft PR'"
                                :aria-label="'Edit ' + pr.pr_number"
                            >
                                <FileEdit class="w-4.5 h-4.5" />
                            </RouterLink>

                            <button
                                v-if="pr.can_be_submitted || pr.status === 'draft' || pr.status === 'revision_requested'"
                                type="button"
                                @click="handleSubmitPR(pr)"
                                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#014BAA] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                :title="pr.status === 'revision_requested' ? 'Ajukan Ulang Persetujuan' : 'Ajukan Persetujuan Sekarang'"
                            >
                                <Send class="w-3.5 h-3.5" />
                                <span>{{ pr.status === 'revision_requested' ? 'Ajukan Ulang' : 'Ajukan' }}</span>
                            </button>
                        </div>
                    </td>
                </tr>
            </BaseTable>
            </div>

            <!-- PAGINATION -->
            <div class="border-t border-slate-200/80 bg-slate-50/40">
                <Pagination
                    :pagination="pagination"
                    @change-page="handlePageChange"
                />
            </div>
        </div>

        <!-- 4. DETAIL MODAL COMPONENT -->
        <PurchaseRequisitionDetailModal
            v-model="showDetailModal"
            :item="selectedPR"
            :is-loading="isLoadingDetail"
            @submit-p-r="handleSubmitPR"
        />
    </div>
</template>

<style scoped>
.pr-table :deep(td > p), .pr-table :deep(td > div:not(.flex)) { max-width: 100%; }
.pr-list button:focus-visible, .pr-list a:focus-visible, .pr-table:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
.pr-list button:disabled { cursor: wait; opacity: .6; }
@media (prefers-reduced-motion: reduce) { .pr-list :deep(*) { transition: none !important; } }
</style>
