<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseSelect from '../../components/ui/BaseSelect.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
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
    AlertCircle,
    Eye,
    Filter,
    RefreshCw,
    Building2,
    Calendar,
    ChevronRight,
    Search,
    ShieldAlert
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
    total: 0
})

// Drawer review state
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
                total: response.meta?.total ?? response.total ?? items.value.length
            }
        } else if (Array.isArray(response)) {
            items.value = response
            pagination.value = {
                current_page: 1,
                last_page: 1,
                from: items.value.length > 0 ? 1 : 0,
                to: items.value.length,
                total: items.value.length
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
        day: 'numeric',
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
    }, 400)
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
    <div class="space-y-6">
        <!-- Breadcrumb Navigation -->
        <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-sm text-gray-500">
            <RouterLink 
                :to="{ name: 'user.dashboard' }" 
                class="hover:text-indigo-600 font-medium transition-colors flex items-center gap-1.5"
            >
                <Home class="w-4 h-4" />
                <span>Dashboard</span>
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400 shrink-0" />
            <span class="font-semibold text-gray-900" aria-current="page">Approvals</span>
        </nav>

        <!-- Page Header -->
        <PageHeader
            title="Kotak Masuk Persetujuan"
            description="Tinjau dan proses dokumen yang membutuhkan persetujuan Anda."
        >
            <template #actions>
                <BaseButton
                    variant="outline"
                    size="sm"
                    @click="fetchTasks(pagination.current_page)"
                    :disabled="isLoading"
                >
                    <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': isLoading }" />
                    Segarkan
                </BaseButton>
            </template>
        </PageHeader>

        <!-- Tabs Navigation -->
        <div class="border-b border-gray-200">
            <nav class="flex space-x-6" aria-label="Tabs">
                <button
                    type="button"
                    @click="handleTabChange('pending')"
                    :class="[
                        'pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors relative',
                        activeTab === 'pending'
                            ? 'border-indigo-600 text-indigo-600 font-semibold'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    ]"
                >
                    <CheckSquare class="w-4 h-4" />
                    Menunggu Tindakan (Pending)
                    <span
                        v-if="approvalStore.pendingCount > 0"
                        class="px-2 py-0.5 text-xs rounded-full font-bold bg-amber-100 text-amber-800 ml-1"
                    >
                        {{ approvalStore.formattedBadge }}
                    </span>
                </button>

                <button
                    type="button"
                    @click="handleTabChange('history')"
                    :class="[
                        'pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors',
                        activeTab === 'history'
                            ? 'border-indigo-600 text-indigo-600 font-semibold'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    ]"
                >
                    <History class="w-4 h-4" />
                    Riwayat Persetujuan
                </button>
            </nav>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div class="w-full sm:w-80">
                <SearchInput
                    v-model="searchQuery"
                    placeholder="Cari no. dokumen, judul, pemohon..."
                />
            </div>

            <div class="flex items-center gap-3 w-full sm:w-auto">
                <div class="w-full sm:w-60">
                    <BaseSelect
                        v-model="selectedDocumentType"
                        :options="filterDocTypeOptions"
                        size="sm"
                        placeholder="Semua Jenis Dokumen"
                    />
                </div>
            </div>
        </div>

        <!-- Task List Content -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <!-- Loading Indicator -->
            <div v-if="isLoading" class="p-12 text-center space-y-3">
                <div class="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p class="text-sm text-gray-500">Memuat daftar tugas approval...</p>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="items.length === 0"
                class="p-12 text-center space-y-4"
            >
                <div class="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-500">
                    <CheckSquare v-if="activeTab === 'pending'" class="w-7 h-7" />
                    <History v-else class="w-7 h-7 text-gray-400" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-gray-900">
                        {{ activeTab === 'pending' ? 'Tidak Ada Tugas Tertunda' : 'Belum Ada Riwayat' }}
                    </h3>
                    <p class="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                        {{ activeTab === 'pending'
                            ? 'Semua permintaan persetujuan telah Anda tangani atau belum ada dokumen baru yang memerlukan persetujuan Anda.'
                            : 'Anda belum pernah menyetujui, meminta revisi, atau menolak dokumen apa pun.'
                        }}
                    </p>
                </div>
            </div>

            <!-- Tasks Table -->
            <div v-else class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        <tr>
                            <th class="py-3.5 px-4">Dokumen</th>
                            <th class="py-3.5 px-4">Tipe Dokumen</th>
                            <th class="py-3.5 px-4">Pemohon & Divisi</th>
                            <th class="py-3.5 px-4">Tingkat Approval</th>
                            <th class="py-3.5 px-4">Nominal</th>
                            <th class="py-3.5 px-4">Status</th>
                            <th class="py-3.5 px-4" v-if="activeTab === 'pending'">SLA / Batas</th>
                            <th class="py-3.5 px-4" v-else>Keputusan Terakhir</th>
                            <th class="py-3.5 px-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr
                            v-for="task in items"
                            :key="task.id"
                            class="hover:bg-indigo-50/20 transition-colors group cursor-pointer"
                            @click="openReviewDrawer(task)"
                        >
                            <!-- Document Info -->
                            <td class="py-4 px-4">
                                <div class="flex items-center gap-2">
                                    <span class="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors font-mono text-xs">
                                        {{ task.document_number }}
                                    </span>
                                </div>
                                <p class="text-xs text-gray-500 mt-0.5 max-w-xs truncate" :title="task.title || task.document_title">
                                    {{ task.title || task.document_title || '-' }}
                                </p>
                            </td>

                            <!-- Document Type -->
                            <td class="py-4 px-4">
                                <span class="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                                    {{ task.document_type_label || task.document_type }}
                                </span>
                            </td>

                            <!-- Requester -->
                            <td class="py-4 px-4">
                                <p class="font-medium text-gray-900 text-xs">{{ task.requester_name || task.requester?.name || '-' }}</p>
                                <p class="text-[11px] text-gray-400 mt-0.5">{{ task.division_name || task.requester?.division?.name || '-' }}</p>
                            </td>

                            <!-- Current Level -->
                            <td class="py-4 px-4">
                                <div class="flex items-center gap-1.5">
                                    <span class="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center border border-indigo-200">
                                        {{ task.current_step || task.current_level?.step_order || 1 }}
                                    </span>
                                    <span class="text-xs text-gray-700 font-medium">
                                        {{ task.current_level?.step_name || `Langkah ${task.current_step || 1}` }}
                                    </span>
                                </div>
                                <span class="text-[10px] text-gray-400 block mt-0.5">
                                    Mode: {{ task.current_level?.approval_mode || 'ANY' }}
                                </span>
                            </td>

                            <!-- Amount -->
                            <td class="py-4 px-4 font-mono text-xs font-medium text-gray-800 whitespace-nowrap">
                                {{ task.total_amount ? formatCurrency(task.total_amount) : '-' }}
                            </td>

                            <!-- Overall Status -->
                            <td class="py-4 px-4">
                                <ApprovalBadge :status="task.status" size="sm" />
                            </td>

                            <!-- Tab 1 SLA / Tab 2 Decision -->
                            <td class="py-4 px-4" v-if="activeTab === 'pending'">
                                <div v-if="getSlaStatus(task) === 'overdue'" class="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                    <ShieldAlert class="w-3.5 h-3.5 text-red-600" />
                                    Terlewat (Overdue)
                                </div>
                                <div v-else-if="getSlaStatus(task) === 'warning'" class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    <Clock class="w-3.5 h-3.5 text-amber-600" />
                                    Mendekati Batas
                                </div>
                                <div v-else class="text-xs text-gray-500">
                                    {{ task.sla_hours_left !== undefined ? `${task.sla_hours_left}j tersisa` : (task.due_date ? formatDate(task.due_date) : (task.created_at ? formatDate(task.created_at) : '-')) }}
                                </div>
                            </td>

                            <td class="py-4 px-4 text-xs text-gray-600" v-else>
                                <div v-if="task.last_action">
                                    <span class="font-medium capitalize text-gray-900">{{ task.last_action.action_type?.replace('_', ' ') }}</span>
                                    <p class="text-[11px] text-gray-400 mt-0.5">{{ formatDate(task.last_action.created_at) }}</p>
                                </div>
                                <span v-else class="text-gray-400">-</span>
                            </td>

                            <!-- Actions -->
                            <td class="py-4 px-4 text-right whitespace-nowrap" @click.stop>
                                <BaseButton
                                    variant="outline"
                                    size="sm"
                                    @click="openReviewDrawer(task)"
                                    class="group-hover:border-indigo-300 group-hover:bg-indigo-50/50"
                                >
                                    <Eye class="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                    Tinjau
                                </BaseButton>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="p-4 border-t border-gray-100" v-if="pagination.total > 0">
                <Pagination
                    :pagination="pagination"
                    @change-page="handlePageChange"
                />
            </div>
        </div>

        <!-- Slide-over Review Drawer -->
        <ApprovalReviewDrawer
            :isOpen="isDrawerOpen"
            :task="selectedTask"
            @close="handleDrawerClose"
            @acted="handleActionSuccess"
        />
    </div>
</template>
