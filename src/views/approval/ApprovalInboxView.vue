<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '../../components/ui/BaseButton.vue'
import Pagination from '../../components/ui/Pagination.vue'
import ApprovalBadge from '../../components/approval/ApprovalBadge.vue'
import ApprovalReviewDrawer from '../../components/approval/ApprovalReviewDrawer.vue'
import {
    getPendingApprovals,
    getApprovalHistory,
    getDocumentTypes
} from '../../services/approvalServices'
import { useApprovalStore } from '../../stores/approvalStore'
import { formatCurrency } from '../../utils/stringUtils'
import { showError } from '../../utils/swal'
import {
    Home,
    CheckSquare,
    History,
    Clock,
    Eye,
    RefreshCw,
    Building2,
    Calendar,
    ChevronRight,
    Search,
    ShieldAlert,
    X,
    ArrowUpRight
} from '@lucide/vue'

const approvalStore = useApprovalStore()

// Tab state: 'pending' | 'history'
const activeTab = ref('pending')

// Search & Filter state
const searchQuery = ref('')
const selectedDocumentType = ref('')
const documentTypeOptions = ref([])

const filterDocTypeOptions = computed(() => [
    { value: '', label: 'Semua Jenis Dokumen' },
    ...documentTypeOptions.value.map(opt => ({
        value: opt.code || opt.id || opt.value,
        label: opt.name || opt.label || opt.code
    }))
])

// Data state
const isLoading = ref(false)
const items = ref([])
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

// Fetch document types for filter
const fetchDocumentTypes = async () => {
    try {
        const response = await getDocumentTypes(false)
        const raw = response.data || response || []
        if (Array.isArray(raw) && raw.length > 0 && raw[0].items) {
            documentTypeOptions.value = raw.flatMap(group => group.items || [])
        } else {
            documentTypeOptions.value = Array.isArray(raw) ? raw : []
        }
    } catch (err) {
        console.error('Failed to load document types:', err)
    }
}

// Fetch tasks based on active tab
const fetchTasks = async (page = 1) => {
    isLoading.value = true
    try {
        const filter = {}
        if (selectedDocumentType.value) {
            filter.document_type = selectedDocumentType.value
        }

        const params = {
            page,
            search: searchQuery.value,
            ...filter
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

        // Keep global counter in sync
        approvalStore.fetchPendingCount()
    } catch (err) {
        console.error('Failed to load approval tasks:', err)
        items.value = []
        showError('Gagal!', 'Tidak dapat memuat daftar tugas persetujuan.', err)
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
    selectedDocumentType.value = ''
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
    approvalStore.fetchPendingCount()
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
    fetchDocumentTypes()
    fetchTasks(1)

    // Setup polling every 60s
    pollInterval = setInterval(() => {
        if (!isDrawerOpen.value) {
            approvalStore.fetchPendingCount()
        }
    }, 60000)
})

onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval)
    if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
    <div class="flex flex-col gap-5">
        <!-- 1. BREADCRUMB -->
        <BaseBreadcrumb :items="[{ label: 'Kotak Masuk Persetujuan' }]" />

        <!-- 2. PAGE HEADER -->
        <div class="bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1">
                <div class="flex items-center gap-2.5">
                    <div class="p-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/60">
                        <CheckSquare class="w-5 h-5 text-slate-800" />
                    </div>
                    <div>
                        <h1 class="text-lg font-bold text-slate-900 tracking-tight">
                            Kotak Masuk Persetujuan
                        </h1>
                        <p class="text-xs text-slate-500 mt-0.5">
                            Tinjau dan proses dokumen yang membutuhkan persetujuan berjenjang Anda.
                        </p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-2.5 shrink-0">
                <button
                    type="button"
                    @click="fetchTasks(pagination.current_page)"
                    :disabled="isLoading"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                    <RefreshCw class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': isLoading }" />
                    <span>Segarkan</span>
                </button>
            </div>
        </div>

        <!-- 3. UNIFIED DATA TABLE CONTAINER -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
            <!-- STATUS TAB BAR (Segmented Filter) -->
            <div class="border-b border-slate-200 bg-slate-50/70 px-4 pt-2.5 flex items-center justify-between gap-4 overflow-x-auto">
                <div class="flex items-center gap-1 -mb-px">
                    <button
                        type="button"
                        @click="handleTabChange('pending')"
                        :class="[
                            activeTab === 'pending'
                                ? 'border-slate-900 text-slate-900 bg-white font-semibold shadow-2xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium',
                            'px-3.5 py-2 text-xs rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap'
                        ]"
                    >
                        <CheckSquare class="w-3.5 h-3.5" />
                        <span>Menunggu Tindakan (Pending)</span>
                        <span
                            v-if="approvalStore.pendingCount > 0"
                            class="px-1.5 py-0.2 text-[10px] rounded font-mono font-bold bg-amber-100 text-amber-900"
                        >
                            {{ approvalStore.formattedBadge }}
                        </span>
                    </button>

                    <button
                        type="button"
                        @click="handleTabChange('history')"
                        :class="[
                            activeTab === 'history'
                                ? 'border-slate-900 text-slate-900 bg-white font-semibold shadow-2xs'
                                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-medium',
                            'px-3.5 py-2 text-xs rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap'
                        ]"
                    >
                        <History class="w-3.5 h-3.5" />
                        <span>Riwayat Persetujuan</span>
                    </button>
                </div>

                <div class="hidden sm:flex items-center gap-2 text-xs text-slate-500 pb-2">
                    <span>Total Tugas:</span>
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
                        placeholder="Cari no. dokumen, judul, atau pemohon..."
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
                        <span>Tipe:</span>
                        <select
                            v-model="selectedDocumentType"
                            class="py-1 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        >
                            <option 
                                v-for="opt in filterDocTypeOptions" 
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
                <div v-if="isLoading" class="p-14 text-center">
                    <div class="inline-flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                        Memuat daftar tugas approval...
                    </div>
                </div>

                <!-- Empty State -->
                <div
                    v-else-if="items.length === 0"
                    class="p-14 text-center space-y-2.5"
                >
                    <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80 w-12 h-12 flex items-center justify-center mx-auto text-slate-500">
                        <CheckSquare v-if="activeTab === 'pending'" class="w-6 h-6 text-slate-400" />
                        <History v-else class="w-6 h-6 text-slate-400" />
                    </div>
                    <div class="text-xs font-semibold text-slate-700">
                        {{ activeTab === 'pending' ? 'Tidak Ada Dokumen Menunggu Persetujuan' : 'Belum Ada Riwayat Persetujuan' }}
                    </div>
                    <p class="text-[11px] text-slate-400 max-w-sm mx-auto">
                        {{ activeTab === 'pending'
                            ? 'Semua dokumen telah diproses atau belum ada dokumen baru yang diarahkan ke wewenang Anda.'
                            : 'Aktivitas persetujuan atau penolakan dokumen yang Anda lakukan akan tersimpan di sini.'
                        }}
                    </p>
                </div>

                <!-- Tasks Table -->
                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                            <tr>
                                <th class="py-2.5 px-4 min-w-[190px]">Dokumen</th>
                                <th class="py-2.5 px-4 w-36">Jenis Dokumen</th>
                                <th class="py-2.5 px-4 min-w-[170px]">Pemohon & Divisi</th>
                                <th class="py-2.5 px-4 min-w-[170px]">Tahap Persetujuan</th>
                                <th class="py-2.5 px-4 min-w-[130px]">Nominal</th>
                                <th class="py-2.5 px-4 w-32 text-center">Status</th>
                                <th class="py-2.5 px-4 w-40" v-if="activeTab === 'pending'">SLA / Batas Waktu</th>
                                <th class="py-2.5 px-4 w-40" v-else>Keputusan Terakhir</th>
                                <th class="py-2.5 px-4 text-center w-24">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">
                            <tr
                                v-for="task in items"
                                :key="task.id"
                                class="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                @click="openReviewDrawer(task)"
                            >
                                <!-- Document Info -->
                                <td class="py-3.5 px-4">
                                    <button
                                        type="button"
                                        class="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-left"
                                        title="Klik untuk membuka rincian review"
                                    >
                                        <span class="group-hover:underline">{{ task.document_number }}</span>
                                        <ArrowUpRight class="w-3 h-3 text-slate-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                                    </button>
                                    <p class="text-xs text-slate-500 mt-0.5 max-w-xs truncate" :title="task.title || task.document_title">
                                        {{ task.title || task.document_title || '-' }}
                                    </p>
                                </td>

                                <!-- Document Type -->
                                <td class="py-3.5 px-4">
                                    <span class="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200/70 whitespace-nowrap">
                                        {{ task.document_type_label || task.document_type }}
                                    </span>
                                </td>

                                <!-- Requester -->
                                <td class="py-3.5 px-4">
                                    <p class="font-semibold text-slate-800 text-xs">{{ task.requester_name || task.requester?.name || '-' }}</p>
                                    <p class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                        <span>{{ task.division_name || task.requester?.division?.name || '-' }}</span>
                                    </p>
                                </td>

                                <!-- Current Level -->
                                <td class="py-3.5 px-4">
                                    <div class="flex items-center gap-1.5">
                                        <span class="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold flex items-center justify-center border border-slate-300">
                                            {{ task.current_step || task.current_level?.step_order || 1 }}
                                        </span>
                                        <span class="text-xs text-slate-800 font-medium">
                                            {{ task.current_level?.step_name || `Langkah ${task.current_step || 1}` }}
                                        </span>
                                    </div>
                                    <span class="text-[10px] text-slate-400 block mt-0.5">
                                        Mode: {{ task.current_level?.approval_mode === 'all' ? 'Semua (Konsensus)' : 'Tunggal (Any)' }}
                                    </span>
                                </td>

                                <!-- Amount -->
                                <td class="py-3.5 px-4 font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                                    {{ task.total_amount ? formatCurrency(task.total_amount) : '-' }}
                                </td>

                                <!-- Overall Status -->
                                <td class="py-3.5 px-4 text-center">
                                    <ApprovalBadge :status="task.status" size="sm" />
                                </td>

                                <!-- Tab 1 SLA / Tab 2 Decision -->
                                <td class="py-3.5 px-4" v-if="activeTab === 'pending'">
                                    <div v-if="getSlaStatus(task) === 'overdue'" class="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                        <ShieldAlert class="w-3 h-3 text-rose-600" />
                                        Terlewat (Overdue)
                                    </div>
                                    <div v-else-if="getSlaStatus(task) === 'warning'" class="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        <Clock class="w-3 h-3 text-amber-600" />
                                        Mendekati Batas
                                    </div>
                                    <div v-else class="text-xs text-slate-500">
                                        {{ task.sla_hours_left !== undefined ? `${task.sla_hours_left}j tersisa` : (task.due_date ? formatDate(task.due_date) : (task.created_at ? formatDate(task.created_at) : '-')) }}
                                    </div>
                                </td>

                                <td class="py-3.5 px-4 text-xs text-slate-600" v-else>
                                    <div v-if="task.last_action">
                                        <span class="font-semibold capitalize text-slate-800">{{ task.last_action.action_type?.replace('_', ' ') }}</span>
                                        <p class="text-[11px] text-slate-400 mt-0.5">{{ formatDate(task.last_action.created_at) }}</p>
                                    </div>
                                    <span v-else class="text-slate-400">-</span>
                                </td>

                                <!-- Actions -->
                                <td class="py-3.5 px-4 text-center whitespace-nowrap" @click.stop>
                                    <button
                                        type="button"
                                        @click="openReviewDrawer(task)"
                                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs"
                                        title="Tinjau Detail Dokumen"
                                    >
                                        <Eye class="w-3.5 h-3.5 text-slate-600" />
                                        <span>Tinjau</span>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="border-t border-slate-200/80 bg-slate-50/40" v-if="pagination.total > 0">
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
