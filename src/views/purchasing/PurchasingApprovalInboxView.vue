<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import TableDocumentCell from '../../components/ui/TableDocumentCell.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import Pagination from '../../components/ui/Pagination.vue'
import ApprovalBadge from '../../components/approval/ApprovalBadge.vue'
import ApprovalReviewDrawer from '../../components/approval/ApprovalReviewDrawer.vue'
import {
    getPendingApprovals,
    getApprovalHistory,
    getPendingApprovalCount
} from '../../services/approvalServices.js'
import { formatCurrency } from '../../utils/stringUtils.js'
import { showError } from '../../utils/swal.js'
import {
    CheckSquare,
    History,
    Clock,
    Eye,
    RefreshCw,
    ShieldAlert,
    Download,
    Loader2
} from '@lucide/vue'
import { generatePurchaseRequisitionPdf } from '../../utils/pdf/purchaseRequisitionPdfGenerator.js'
import { useAuthStore } from '../../stores/auth.js'

const authStore = useAuthStore()
const downloadingTaskId = ref(null)

// Tab state: 'pending' | 'history'
const activeTab = ref('pending')

// Search & Filter state
const searchQuery = ref('')

const tableColumns = [
    { key: 'document', label: 'Pengajuan', width: '25%', minWidth: '230px' },
    { key: 'requester', label: 'Pemohon & divisi', width: '19%', minWidth: '180px' },
    { key: 'level', label: 'Tahap persetujuan', width: '18%', minWidth: '180px' },
    { key: 'amount', label: 'Estimasi', width: '15%', minWidth: '150px', align: 'right' },
    { key: 'status', label: 'Status & tindak lanjut', width: '23%', minWidth: '230px' },
    { key: 'actions', label: 'Aksi', width: '150px', align: 'right' },
]

// Data state
const isLoading = ref(false)
const items = ref([])
const pendingCount = ref(0)
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 10
})

// Review Dialog state
const isDrawerOpen = ref(false)
const selectedTask = ref(null)

// Polling timer
let pollInterval = null

// Fetch pending count specifically for purchasing
const fetchPurchasingPendingCount = async () => {
    try {
        const res = await getPendingApprovalCount({ document_type: 'purchase_requisition' })
        pendingCount.value = Number(res?.count ?? 0)
    } catch (_) {
        pendingCount.value = 0
    }
}

// Fetch tasks based on active tab and purchasing scope
const fetchTasks = async (page = 1) => {
    isLoading.value = true
    try {
        const params = {
            page,
            search: searchQuery.value,
            document_type: 'purchase_requisition'
        }

        let response
        if (activeTab.value === 'pending') {
            response = await getPendingApprovals(params)
        } else {
            response = await getApprovalHistory(params)
        }

        if (response.data && Array.isArray(response.data)) {
            items.value = response.data
            pagination.value = {
                current_page: response.meta?.current_page || response.current_page || 1,
                last_page: response.meta?.last_page || response.last_page || 1,
                from: response.meta?.from || response.from || (items.value.length > 0 ? 1 : 0),
                to: response.meta?.to || response.to || items.value.length,
                total: response.meta?.total ?? response.total ?? items.value.length,
                per_page: response.meta?.per_page || 10
            }
        } else if (Array.isArray(response)) {
            items.value = response
            pagination.value = {
                current_page: 1,
                last_page: 1,
                from: items.value.length > 0 ? 1 : 0,
                to: items.value.length,
                total: items.value.length,
                per_page: 10
            }
        } else {
            items.value = []
        }

        // Keep local purchasing count updated
        fetchPurchasingPendingCount()
    } catch (err) {
        console.error('Failed to load purchasing approval tasks:', err)
        items.value = []
        showError('Gagal!', 'Tidak dapat memuat daftar tugas persetujuan pengadaan.', err)
    } finally {
        isLoading.value = false
    }
}

const handlePageChange = (page) => {
    fetchTasks(page)
}

const handleTabChange = (tab) => {
    if (activeTab.value === tab) return
    activeTab.value = tab
    searchQuery.value = ''
    clearTimeout(debounceTimer)
    fetchTasks(1)
}

const openReviewDrawer = (task) => {
    selectedTask.value = task
    isDrawerOpen.value = true
}

const handleDrawerClose = () => {
    isDrawerOpen.value = false
    selectedTask.value = null
}

const handleActionSuccess = () => {
    fetchTasks(pagination.value.current_page)
    fetchPurchasingPendingCount()
}

const canDownloadPdf = (task) => {
    if (!task) return false
    const docType = task.document_type || task.approvable_type
    if (docType && docType !== 'purchase_requisition' && docType !== 'pr') return false
    const approvedStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed']
    return approvedStatuses.includes(task.status)
}

const handleDownloadPdf = async (task) => {
    const docId = task.approvable_id || task.id
    if (!docId || downloadingTaskId.value === task.id) return
    downloadingTaskId.value = task.id
    try {
        await generatePurchaseRequisitionPdf({
            id: docId,
            pr_number: task.document_number,
            status: task.status,
            company: task.company,
            requester: task.requester,
        }, {
            currentUser: authStore.user?.name || 'Petugas ERP'
        })
    } finally {
        downloadingTaskId.value = null
    }
}

// SLA status computation
const getSlaStatus = (item) => {
    if (item.is_overdue || (item.sla_hours_left != null && item.sla_hours_left < 0)) return 'overdue'
    if (item.sla_hours_left != null) {
        if (item.sla_hours_left < 4) return 'warning'
        return 'normal'
    }
    if (item.due_date) {
        const dueTime = new Date(item.due_date).getTime()
        const now = Date.now()
        const hoursLeft = (dueTime - now) / (1000 * 60 * 60)
        if (hoursLeft < 0) return 'overdue'
        if (hoursLeft < 4) return 'warning'
        return 'normal'
    }
    if (item.sla_hours) return 'normal'
    return null
}

const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Watch filters
let debounceTimer = null
watch(searchQuery, () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        fetchTasks(1)
    }, 350)
}, { flush: 'sync' })

onMounted(() => {
    fetchPurchasingPendingCount()
    fetchTasks(1)

    // Setup polling every 60s
    pollInterval = setInterval(() => {
        if (!isDrawerOpen.value) {
            fetchPurchasingPendingCount()
        }
    }, 60000)
})

onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval)
    if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
    <div class="approval-inbox min-w-0 w-full space-y-6">
        <!-- 1. BREADCRUMB -->
        <BaseBreadcrumb :items="[{ label: 'Purchasing', to: { name: 'user.purchasing' } }, { label: 'Persetujuan Pengadaan (Approvals)' }]" />

        <!-- 2. PAGE HEADER (Large Font & Full Width) -->
        <div class="py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1.5">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 shrink-0 rounded-xl bg-blue-50 text-[#014BAA] flex items-center justify-center">
                        <CheckSquare class="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2.5">
                            <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">
                                Persetujuan Pengadaan
                            </h1>
                        </div>
                        <p class="text-sm text-slate-500 mt-0.5">
                            Tinjau pengajuan tim dan pantau keputusan persetujuan Anda.
                        </p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
                <button
                    type="button"
                    @click="fetchTasks(pagination.current_page)"
                    :disabled="isLoading"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw class="w-4 h-4 text-slate-500" :class="{ 'animate-spin': isLoading }" />
                    <span>Segarkan Data</span>
                </button>
            </div>
        </div>

        <!-- 3. UNIFIED DATA TABLE CONTAINER -->
        <div class="min-w-0 w-full bg-white rounded-2xl border border-slate-200/80 flex flex-col overflow-hidden">
            <!-- STATUS TAB BAR (Segmented Filter) -->
            <div class="border-b border-slate-100 px-5 pt-2">
                <div class="flex flex-wrap items-center gap-x-5" role="group" aria-label="Filter daftar persetujuan">
                    <button
                        type="button"
                        @click="handleTabChange('pending')"
                        :aria-pressed="activeTab === 'pending'"
                        :class="[
                            activeTab === 'pending'
                                ? 'border-[#014BAA] text-[#014BAA] font-medium'
                                : 'border-transparent text-slate-500 hover:text-slate-800',
                            'py-3 text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer'
                        ]"
                    >
                        <span>Menunggu persetujuan</span>
                        <span
                            v-if="pendingCount > 0"
                            class="px-2 py-0.5 text-xs rounded-md font-medium bg-blue-50 text-[#014BAA] tabular-nums"
                        >
                            {{ pendingCount > 99 ? '99+' : pendingCount }}
                        </span>
                    </button>

                    <button
                        type="button"
                        @click="handleTabChange('history')"
                        :aria-pressed="activeTab === 'history'"
                        :class="[
                            activeTab === 'history'
                                ? 'border-[#014BAA] text-[#014BAA] font-medium'
                                : 'border-transparent text-slate-500 hover:text-slate-800',
                            'py-3 text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer'
                        ]"
                    >
                        <span>Riwayat saya</span>
                    </button>
                </div>

            </div>

            <!-- TOOLBAR -->
            <div class="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                <div class="relative w-full sm:max-w-md">
                    <SearchInput
                        v-model="searchQuery"
                        label="Cari pengajuan persetujuan"
                        placeholder="Cari nomor PR, judul pengadaan, atau pemohon..."
                        compact clearable
                    />
                </div>

                <p class="shrink-0 text-xs text-slate-500" aria-live="polite">{{ pagination.total }} pengajuan sesuai filter</p>
            </div>

            <!-- TABLE CONTENT -->
            <div>
                <!-- Loading State -->
                <div v-if="isLoading" class="px-5 py-14 text-center" role="status">
                    <div class="inline-flex items-center gap-2.5 text-sm text-slate-500 font-medium">
                        <RefreshCw class="w-5 h-5 animate-spin text-blue-600" />
                        <span>Memuat daftar tugas persetujuan pengadaan...</span>
                    </div>
                </div>

                <!-- Empty State -->
                <div
                    v-else-if="items.length === 0"
                    class="px-5 py-14 text-center space-y-3"
                    role="status"
                >
                    <div class="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 w-16 h-16 flex items-center justify-center mx-auto text-amber-600">
                        <CheckSquare v-if="activeTab === 'pending'" class="w-8 h-8" />
                        <History v-else class="w-8 h-8 text-blue-500" />
                    </div>
                    <div class="text-sm font-semibold text-slate-800">
                        {{ searchQuery ? 'Tidak ada pengajuan yang cocok' : (activeTab === 'pending' ? 'Tidak ada pengajuan yang menunggu' : 'Belum ada riwayat persetujuan') }}
                    </div>
                    <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                        {{ searchQuery ? 'Coba kata kunci lain atau hapus pencarian.' : activeTab === 'pending'
                            ? 'Semua Purchase Requisition yang memerlukan persetujuan Anda telah diproses atau belum ada pengajuan baru.'
                            : 'Catatan seluruh keputusan persetujuan yang telah Anda ambil akan otomatis tersimpan di sini.'
                        }}
                    </p>
                </div>

                <!-- Tasks Table -->
                <div v-else class="min-w-0">
                    <p id="approval-table-hint" class="px-5 py-3 text-xs text-slate-500 xl:hidden">Geser tabel untuk melihat seluruh kolom dan aksi.</p>
                    <BaseTable :columns="tableColumns" min-width="1180px" layout="fixed" label="Daftar persetujuan pengadaan" aria-describedby="approval-table-hint" :busy="isLoading">
                            <tr
                                v-for="task in items"
                                :key="task.id"
                                class="transition-colors group"
                            >
                                <!-- Document Info -->
                                <td class="py-4 px-5">
                                    <TableDocumentCell :number="task.document_number" :description="task.title || task.document_title || '-'" kind="Purchase Requisition" @open="openReviewDrawer(task)" />
                                </td>

                                <!-- Requester -->
                                <td class="py-4 px-5">
                                    <p class="font-medium text-slate-700 text-sm break-words">{{ task.requester_name || task.requester?.name || '-' }}</p>
                                    <p class="text-xs text-slate-500 mt-1 break-words">
                                        <span>{{ task.division_name || task.requester?.division?.name || '-' }}</span>
                                    </p>
                                </td>

                                <!-- Current Level -->
                                <td class="py-4 px-5">
                                    <div class="flex items-center gap-2">
                                        <span class="w-5 h-5 shrink-0 rounded-md bg-slate-100 text-slate-500 text-xs flex items-center justify-center">
                                            {{ task.current_step || task.current_level?.step_order || 1 }}
                                        </span>
                                        <span class="text-sm text-slate-700">
                                            {{ task.current_level?.step_name || `Tahap ${task.current_step || 1}` }}
                                        </span>
                                    </div>
                                    <span class="text-xs text-slate-500 block mt-1">
                                        Mode: {{ task.current_level?.approval_mode === 'all' ? 'Semua (Konsensus)' : 'Tunggal (Any)' }}
                                    </span>
                                </td>

                                <!-- Amount -->
                                <td class="py-4 px-5 text-right tabular-nums text-sm font-medium text-slate-800 whitespace-nowrap">
                                    {{ task.total_amount != null ? formatCurrency(task.total_amount, task.currency || 'IDR') : '-' }}
                                </td>

                                <!-- Overall Status -->
                                <td class="py-4 px-5">
                                    <ApprovalBadge :status="task.status" size="sm" appearance="subtle" />

                                <!-- Tab 1 SLA / Tab 2 Decision -->
                                <div class="mt-2" v-if="activeTab === 'pending'">
                                    <div v-if="getSlaStatus(task) === 'overdue'" class="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700">
                                        <ShieldAlert class="w-3.5 h-3.5 text-rose-600" />
                                        <span>Batas waktu terlewat</span>
                                    </div>
                                    <div v-else-if="getSlaStatus(task) === 'warning'" class="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                                        <Clock class="w-3.5 h-3.5 text-amber-600" />
                                        <span>Mendekati Batas</span>
                                    </div>
                                    <div v-else class="text-xs text-slate-500">
                                        {{ task.sla_hours_left != null ? `${task.sla_hours_left} jam tersisa` : (task.due_date ? `Batas: ${formatDate(task.due_date)}` : 'Batas waktu belum ditetapkan') }}
                                    </div>
                                </div>

                                <div class="mt-2 text-xs text-slate-500" v-else>
                                    <div v-if="task.last_action">
                                        <span class="capitalize">{{ task.last_action.action_type?.replaceAll('_', ' ') }}</span>
                                        <p class="text-xs text-slate-500 mt-0.5">{{ formatDate(task.last_action.created_at) }}</p>
                                    </div>
                                    <span v-else class="text-slate-400">-</span>
                                </div>
                                </td>

                                <!-- Actions -->
                                <td class="py-4 px-5 text-center whitespace-nowrap" @click.stop>
                                    <div class="flex items-center justify-end gap-1.5">
                                        <button
                                            type="button"
                                            @click="openReviewDrawer(task)"
                                            class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-50 hover:bg-blue-100 text-[#014BAA] transition-colors cursor-pointer"
                                            title="Buka rincian review dokumen"
                                        >
                                            <Eye class="w-3.5 h-3.5" />
                                            <span>Tinjau</span>
                                        </button>

                                        <!-- Unduh Lembar Persetujuan (PDF) Langsung di Tabel -->
                                        <button
                                            v-if="canDownloadPdf(task)"
                                            type="button"
                                            :disabled="downloadingTaskId === task.id"
                                            @click="handleDownloadPdf(task)"
                                            class="p-1.5 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                            title="Unduh Lembar Persetujuan (PDF)"
                                        >
                                            <Loader2 v-if="downloadingTaskId === task.id" class="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                            <Download v-else class="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                    </BaseTable>
                </div>

                <!-- Pagination -->
                <div v-if="pagination.total > 0 && !isLoading">
                    <Pagination
                        :pagination="pagination"
                        @change-page="handlePageChange"
                    />
                </div>
            </div>
        </div>

        <!-- Centered Review Dialog Modal -->
        <ApprovalReviewDrawer
            :isOpen="isDrawerOpen"
            :task="selectedTask"
            @close="handleDrawerClose"
            @acted="handleActionSuccess"
            @refresh-requested="handleActionSuccess"
        />
    </div>
</template>

<style scoped>
.approval-inbox button:focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
.approval-inbox button:disabled { opacity: .6; cursor: wait; }
@media (prefers-reduced-motion: reduce) {
    .approval-inbox :deep(*) { transition: none !important; }
}
</style>
