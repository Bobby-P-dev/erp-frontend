<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
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
    Building2,
    Calendar,
    Search,
    ShieldAlert,
    X,
    ArrowUpRight,
    ShoppingBag,
    Filter
} from '@lucide/vue'

// Tab state: 'pending' | 'history'
const activeTab = ref('pending')

// Search & Filter state
const searchQuery = ref('')
const selectedDocumentType = ref('purchase_requisition')

// Filter options scoped to Purchasing domain
const purchasingDocTypes = [
    { value: 'purchase_requisition', label: 'Purchase Requisition (PR)' }
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
            document_type: selectedDocumentType.value || 'purchase_requisition'
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

// SLA status computation
const getSlaStatus = (item) => {
    if (item.is_overdue || (item.sla_hours_left !== undefined && item.sla_hours_left < 0)) return 'overdue'
    if (item.sla_hours_left !== undefined) {
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

const clearSearch = () => {
    searchQuery.value = ''
    fetchTasks(1)
}

// Watch filters
let debounceTimer = null
watch(searchQuery, () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        fetchTasks(1)
    }, 350)
})

watch(selectedDocumentType, () => {
    fetchTasks(1)
})

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
    <div class="w-full space-y-6">
        <!-- 1. BREADCRUMB -->
        <BaseBreadcrumb :items="[{ label: 'Purchasing', to: { name: 'user.purchasing' } }, { label: 'Persetujuan Pengadaan (Approvals)' }]" />

        <!-- 2. PAGE HEADER (Large Font & Full Width) -->
        <div class="bg-white px-6 py-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1.5">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-200">
                        <CheckSquare class="w-6 h-6" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2.5">
                            <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                Persetujuan Pengadaan
                            </h1>
                            <span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                Purchasing Approvals
                            </span>
                        </div>
                        <p class="text-sm text-slate-500 mt-0.5">
                            Tinjau dan proses permohonan pembelian (Purchase Requisition) yang membutuhkan otorisasi wewenang Anda.
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
        <div class="w-full bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
            <!-- STATUS TAB BAR (Segmented Filter) -->
            <div class="border-b border-slate-200 bg-slate-50/80 px-5 pt-3 flex items-center justify-between gap-4 overflow-x-auto">
                <div class="flex items-center gap-2 -mb-px">
                    <button
                        type="button"
                        @click="handleTabChange('pending')"
                        :class="[
                            activeTab === 'pending'
                                ? 'border-amber-600 text-amber-900 bg-white font-bold shadow-2xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium',
                            'px-4 py-2.5 text-sm rounded-t-xl border-b-2 transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer'
                        ]"
                    >
                        <CheckSquare class="w-4 h-4 text-amber-600" />
                        <span>Menunggu Persetujuan (Pending)</span>
                        <span
                            v-if="pendingCount > 0"
                            class="px-2 py-0.5 text-xs rounded-full font-mono font-bold bg-amber-500 text-white shadow-2xs"
                        >
                            {{ pendingCount > 99 ? '99+' : pendingCount }}
                        </span>
                    </button>

                    <button
                        type="button"
                        @click="handleTabChange('history')"
                        :class="[
                            activeTab === 'history'
                                ? 'border-blue-600 text-blue-900 bg-white font-bold shadow-2xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium',
                            'px-4 py-2.5 text-sm rounded-t-xl border-b-2 transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer'
                        ]"
                    >
                        <History class="w-4 h-4 text-blue-600" />
                        <span>Riwayat Persetujuan Saya</span>
                    </button>
                </div>

                <div class="hidden sm:flex items-center gap-2 text-sm text-slate-500 pb-2.5">
                    <span>Total Dokumen:</span>
                    <span class="font-mono font-bold text-slate-900 text-base">{{ pagination.total }}</span>
                </div>
            </div>

            <!-- TOOLBAR -->
            <div class="p-4 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div class="relative w-full sm:max-w-md">
                    <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                        v-model="searchQuery"
                        type="text" 
                        placeholder="Cari nomor PR, judul pengadaan, atau pemohon..."
                        class="w-full pl-10 pr-9 py-2 text-sm bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                    <button 
                        v-if="searchQuery"
                        type="button"
                        @click="clearSearch"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div class="flex items-center gap-2 text-sm text-slate-600">
                        <Filter class="w-4 h-4 text-slate-400" />
                        <span>Kategori:</span>
                        <select
                            v-model="selectedDocumentType"
                            class="py-1.5 px-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option 
                                v-for="opt in purchasingDocTypes" 
                                :key="opt.value" 
                                :value="opt.value"
                            >
                                {{ opt.label }}
                            </option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- TABLE CONTENT -->
            <div>
                <!-- Loading State -->
                <div v-if="isLoading" class="p-16 text-center">
                    <div class="inline-flex items-center gap-2.5 text-sm text-slate-500 font-medium">
                        <RefreshCw class="w-5 h-5 animate-spin text-blue-600" />
                        <span>Memuat daftar tugas persetujuan pengadaan...</span>
                    </div>
                </div>

                <!-- Empty State -->
                <div
                    v-else-if="items.length === 0"
                    class="p-16 text-center space-y-3"
                >
                    <div class="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 w-16 h-16 flex items-center justify-center mx-auto text-amber-600">
                        <CheckSquare v-if="activeTab === 'pending'" class="w-8 h-8" />
                        <History v-else class="w-8 h-8 text-blue-500" />
                    </div>
                    <div class="text-base font-bold text-slate-800">
                        {{ activeTab === 'pending' ? 'Tidak Ada Pengajuan yang Menunggu Persetujuan' : 'Belum Ada Riwayat Persetujuan Pengadaan' }}
                    </div>
                    <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                        {{ activeTab === 'pending'
                            ? 'Semua Purchase Requisition yang memerlukan persetujuan Anda telah diproses atau belum ada pengajuan baru.'
                            : 'Catatan seluruh keputusan persetujuan yang telah Anda ambil akan otomatis tersimpan di sini.'
                        }}
                    </p>
                </div>

                <!-- Tasks Table -->
                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-sm border-collapse">
                        <thead class="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs">
                            <tr>
                                <th class="py-3 px-5 min-w-[210px]">Dokumen PR</th>
                                <th class="py-3 px-5 w-40">Jenis Dokumen</th>
                                <th class="py-3 px-5 min-w-[180px]">Pemohon & Divisi</th>
                                <th class="py-3 px-5 min-w-[180px]">Tahap Persetujuan</th>
                                <th class="py-3 px-5 min-w-[150px]">Estimasi Nilai</th>
                                <th class="py-3 px-5 w-36 text-center">Status</th>
                                <th class="py-3 px-5 w-44" v-if="activeTab === 'pending'">SLA / Batas Waktu</th>
                                <th class="py-3 px-5 w-44" v-else>Keputusan Terakhir</th>
                                <th class="py-3 px-5 text-center w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">
                            <tr
                                v-for="task in items"
                                :key="task.id"
                                class="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                                @click="openReviewDrawer(task)"
                            >
                                <!-- Document Info -->
                                <td class="py-4 px-5">
                                    <button
                                        type="button"
                                        class="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-left"
                                        title="Klik untuk membuka review dokumen"
                                    >
                                        <span class="group-hover:underline">{{ task.document_number }}</span>
                                        <ArrowUpRight class="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                                    </button>
                                    <p class="text-xs text-slate-500 mt-1 max-w-xs truncate" :title="task.title || task.document_title">
                                        {{ task.title || task.document_title || '-' }}
                                    </p>
                                </td>

                                <!-- Document Type -->
                                <td class="py-4 px-5">
                                    <span class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap">
                                        {{ task.document_type_label || 'Purchase Requisition' }}
                                    </span>
                                </td>

                                <!-- Requester -->
                                <td class="py-4 px-5">
                                    <p class="font-bold text-slate-800 text-sm">{{ task.requester_name || task.requester?.name || '-' }}</p>
                                    <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                        <Building2 class="w-3.5 h-3.5 text-slate-400" />
                                        <span>{{ task.division_name || task.requester?.division?.name || '-' }}</span>
                                    </p>
                                </td>

                                <!-- Current Level -->
                                <td class="py-4 px-5">
                                    <div class="flex items-center gap-2">
                                        <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center border border-slate-300">
                                            {{ task.current_step || task.current_level?.step_order || 1 }}
                                        </span>
                                        <span class="text-sm text-slate-800 font-semibold">
                                            {{ task.current_level?.step_name || `Tahap ${task.current_step || 1}` }}
                                        </span>
                                    </div>
                                    <span class="text-xs text-slate-500 block mt-1">
                                        Mode: {{ task.current_level?.approval_mode === 'all' ? 'Semua (Konsensus)' : 'Tunggal (Any)' }}
                                    </span>
                                </td>

                                <!-- Amount -->
                                <td class="py-4 px-5 font-mono text-sm font-bold text-slate-900 whitespace-nowrap">
                                    {{ task.total_amount ? formatCurrency(task.total_amount) : '-' }}
                                </td>

                                <!-- Overall Status -->
                                <td class="py-4 px-5 text-center">
                                    <ApprovalBadge :status="task.status" size="md" />
                                </td>

                                <!-- Tab 1 SLA / Tab 2 Decision -->
                                <td class="py-4 px-5" v-if="activeTab === 'pending'">
                                    <div v-if="getSlaStatus(task) === 'overdue'" class="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                                        <ShieldAlert class="w-3.5 h-3.5 text-rose-600" />
                                        <span>Terlewat (Overdue)</span>
                                    </div>
                                    <div v-else-if="getSlaStatus(task) === 'warning'" class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                        <Clock class="w-3.5 h-3.5 text-amber-600" />
                                        <span>Mendekati Batas</span>
                                    </div>
                                    <div v-else class="text-xs sm:text-sm text-slate-600">
                                        {{ task.sla_hours_left !== undefined ? `${task.sla_hours_left} jam tersisa` : (task.due_date ? formatDate(task.due_date) : (task.created_at ? formatDate(task.created_at) : '-')) }}
                                    </div>
                                </td>

                                <td class="py-4 px-5 text-xs text-slate-600" v-else>
                                    <div v-if="task.last_action">
                                        <span class="font-bold capitalize text-slate-800 text-sm">{{ task.last_action.action_type?.replace('_', ' ') }}</span>
                                        <p class="text-xs text-slate-500 mt-0.5">{{ formatDate(task.last_action.created_at) }}</p>
                                    </div>
                                    <span v-else class="text-slate-400">-</span>
                                </td>

                                <!-- Actions -->
                                <td class="py-4 px-5 text-center whitespace-nowrap" @click.stop>
                                    <button
                                        type="button"
                                        @click="openReviewDrawer(task)"
                                        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-600 text-blue-700 hover:text-white transition-all shadow-2xs cursor-pointer"
                                        title="Buka rincian review dokumen"
                                    >
                                        <Eye class="w-3.5 h-3.5" />
                                        <span>Tinjau</span>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="border-t border-slate-200/80 bg-slate-50/50 p-3" v-if="pagination.total > 0">
                    <Pagination
                        :pagination="pagination"
                        @change-page="handlePageChange"
                        @page-change="handlePageChange"
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
        />
    </div>
</template>
