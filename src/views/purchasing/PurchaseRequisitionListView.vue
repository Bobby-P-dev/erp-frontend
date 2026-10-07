<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import Pagination from '../../components/ui/Pagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import TabNavigation from '../../components/ui/TabNavigation.vue'
import PurchaseRequisitionDetailModal from '../../components/purchasing/PurchaseRequisitionDetailModal.vue'
import PurchaseRequisitionConfirmReceiptModal from '../../components/purchasing/PurchaseRequisitionConfirmReceiptModal.vue'

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
    Search,
    FileText,
    Calendar,
    Clock,
    Building2,
    Layers,
    Send,
    Eye,
    FileEdit,
    CheckCircle2,
    RefreshCw,
    ArrowUpRight
} from '@lucide/vue'

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

const showConfirmReceiptModal = ref(false)
const confirmReceiptTarget = ref(null)

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

const openConfirmReceiptModal = (pr) => {
    confirmReceiptTarget.value = pr
    showConfirmReceiptModal.value = true
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
    { key: 'no', label: 'No', width: '50px', align: 'center' },
    { key: 'pr_number', label: 'No. PR', minWidth: '170px' },
    { key: 'request_date', label: 'Tanggal & Target', minWidth: '160px' },
    { key: 'company_id', label: 'Perusahaan & Divisi', minWidth: '180px' },
    { key: 'purpose', label: 'Keperluan & Estimasi', minWidth: '220px' },
    { key: 'status', label: 'Status & Approval', minWidth: '170px', align: 'center' },
    { key: 'actions', label: 'Aksi', minWidth: '140px', align: 'center' }
]

const getActiveStepName = (pr) => {
    if (!pr?.approval_request?.levels || !Array.isArray(pr.approval_request.levels)) return ''
    const currentOrder = pr.approval_request.current_step_order || 1
    const currentLevel = pr.approval_request.levels.find(l => l.step_order === currentOrder)
    return currentLevel?.step_name || 'Menunggu Verifikasi'
}
</script>

<template>
    <div class="flex flex-col gap-5">
        <!-- 1. BREADCRUMB -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' }, icon: ShoppingBag },
                { label: 'Purchase Requisitions' }
            ]" 
        />

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
            <!-- STATUS TAB BAR -->
            <div class="border-b border-slate-200 bg-slate-50/70 px-4 pt-2.5 flex items-center justify-between gap-4 overflow-x-auto">
                <TabNavigation
                    v-model="filters.status"
                    :tabs="statusTabs"
                    variant="underline"
                />

                <div class="hidden sm:flex items-center gap-2 text-xs text-slate-500 pb-2 shrink-0">
                    <span>Total Pengajuan:</span>
                    <span class="font-mono font-bold text-slate-900">{{ pagination.total }}</span>
                </div>
            </div>

            <!-- SEARCH & TOOLBAR -->
            <div class="p-4 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="relative w-full sm:w-96">
                    <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Cari nomor PR, keperluan, atau entitas..."
                        class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                </div>

                <div class="flex items-center gap-2.5 self-end sm:self-auto">
                    <div class="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>Tampilkan:</span>
                        <select
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
                                {{ searchQuery || filters.status ? 'Tidak ada pengajuan yang cocok dengan kriteria filter' : 'Belum Ada Pengajuan Purchase Requisition' }}
                            </div>
                            <p class="text-[11px] text-slate-400">
                                {{ searchQuery || filters.status ? 'Coba ubah kata kunci pencarian atau reset tab status.' : 'Anda belum membuat pengajuan pengadaan barang/jasa. Buat permohonan baru untuk memulai.' }}
                            </p>
                            <RouterLink 
                                v-if="!searchQuery && !filters.status" 
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
                            class="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors group/btn text-left cursor-pointer"
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
                            <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                            <Layers class="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                                {{ formatCurrency(pr.total_estimated_amount, pr.currency) }}
                            </span>
                        </div>
                    </td>

                    <!-- Status & Approval Stage -->
                    <td class="px-4 py-3.5 whitespace-nowrap text-center">
                        <div class="inline-flex flex-col items-center">
                            <StatusBadge :status="pr.status" size="sm" />
                            
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
                                class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
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
                                v-if="pr.status === 'ready_for_pickup'"
                                type="button"
                                @click="openConfirmReceiptModal(pr)"
                                class="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold transition-colors shadow-2xs cursor-pointer"
                                title="Konfirmasi bahwa barang telah diterima / diambil dari gudang"
                            >
                                <CheckCircle2 class="w-3.5 h-3.5" />
                                <span>Terima Barang</span>
                            </button>

                            <button
                                v-if="pr.can_be_submitted || pr.status === 'draft' || pr.status === 'revision_requested'"
                                type="button"
                                @click="handleSubmitPR(pr)"
                                class="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
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

        <!-- 4. DETAIL MODAL COMPONENT -->
        <PurchaseRequisitionDetailModal
            v-model="showDetailModal"
            :item="selectedPR"
            :is-loading="isLoadingDetail"
            @confirm-receipt="openConfirmReceiptModal"
            @submit-p-r="handleSubmitPR"
        />

        <!-- 5. CONFIRM RECEIPT MODAL COMPONENT -->
        <PurchaseRequisitionConfirmReceiptModal
            v-model="showConfirmReceiptModal"
            :target="confirmReceiptTarget"
            @saved="fetchData(pagination.current_page)"
        />
    </div>
</template>
