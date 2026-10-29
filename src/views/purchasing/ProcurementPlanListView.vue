<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { 
    getProcurementPlans, 
    getProcurementQueue,
    activateProcurementPlan, 
    cancelProcurementPlan 
} from '../../services/procurementPlanServices.js'
import { showLoading, showSuccess, showError, showConfirm, showPrompt } from '../../utils/swal.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import Pagination from '../../components/ui/Pagination.vue'
import BaseModal from '../../components/ui/BaseModal.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

import {
    Home,
    ChevronRight,
    Layers,
    Plus,
    RefreshCw,
    Search,
    Calendar,
    ShoppingCart,
    Scale,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Eye,
    Play,
    Ban,
    Filter,
    CheckCheck,
    Building2,
    ArrowUpRight,
    ClipboardList,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Package,
    ArrowRight,
    Store,
    Users,
    User
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

// Primary View Switcher ('pending' for PR Siap Diplanning, 'plans' for Dokumen Rencana)
const activeMainTab = ref(route.query.tab || 'pending')

// State for Tab 1: Purchase Requisitions Waiting for Plan (Queue)
const queueItems = ref([])
const isLoadingQueue = ref(false)
const queueSearch = ref('')
const expandedPrs = ref({})

// State for Tab 2: Existing Procurement Plans
const plans = ref([])
const isLoadingPlans = ref(false)
const searchQuery = ref('')
const selectedStatus = ref('')
const selectedMethod = ref('')
let searchTimeout = null

const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 10
})

// Grouped PRs for Tab 1
const groupedPurchaseRequisitions = computed(() => {
    const map = new Map()
    for (const item of queueItems.value) {
        if (!map.has(item.pr_id)) {
            map.set(item.pr_id, {
                pr_id: item.pr_id,
                pr_number: item.pr_number || `PR #${item.pr_id}`,
                company: item.company,
                division: item.division,
                requester: item.requester,
                purpose: item.purpose,
                request_date: item.request_date,
                required_date: item.required_date,
                items: [],
                total_requested_qty: 0,
                total_remaining_qty: 0,
                has_custom_item: false
            })
        }
        const pr = map.get(item.pr_id)
        pr.items.push(item)
        pr.total_requested_qty += Number(item.requested_quantity || 0)
        pr.total_remaining_qty += Number(item.remaining_quantity || 0)
        if (item.is_custom_item) {
            pr.has_custom_item = true
        }
    }

    let list = Array.from(map.values())
    if (queueSearch.value.trim()) {
        const q = queueSearch.value.toLowerCase().trim()
        list = list.filter(pr => 
            pr.pr_number?.toLowerCase().includes(q) ||
            pr.division?.name?.toLowerCase().includes(q) ||
            pr.company?.name?.toLowerCase().includes(q) ||
            pr.requester?.name?.toLowerCase().includes(q) ||
            pr.items.some(i => (i.item_name || i.item?.name || '').toLowerCase().includes(q))
        )
    }
    return list
})

// Metrics for Tab 2
const stats = computed(() => {
    const list = plans.value || []
    return {
        total: pagination.value.total || list.length,
        draft: list.filter(p => p.status === 'draft').length,
        active: list.filter(p => p.status === 'active').length,
        completed: list.filter(p => p.status === 'completed').length,
        cancelled: list.filter(p => p.status === 'cancelled').length,
        direct: list.filter(p => p.procurement_method === 'direct_purchase').length,
        rfq: list.filter(p => p.procurement_method === 'rfq').length
    }
})

// Segmented Status Filter Tabs for Tab 2
const statusTabs = [
    { id: '', label: 'Semua Status' },
    { id: 'draft', label: 'Draft', color: 'amber' },
    { id: 'active', label: 'Aktif Berjalan', color: 'blue' },
    { id: 'completed', label: 'Selesai', color: 'emerald' },
    { id: 'cancelled', label: 'Dibatalkan', color: 'rose' }
]

// Method options for filtering
const methodOptions = [
    { value: '', label: 'Semua Sourcing Method' },
    { value: 'direct_purchase', label: 'Direct Purchase (Beli Langsung)' },
    { value: 'rfq', label: 'Tender RFQ (Multi-Vendor)' }
]

// Table Columns for Tab 1 (Pending PRs) - Standardized with Multi-PR Bulk Selection
const queueTableColumns = [
    { key: 'select', label: '', width: '48px', align: 'center', class: 'text-center' },
    { key: 'no', label: 'No', width: '60px', align: 'center', class: 'text-center' },
    { key: 'pr_number', label: 'No. PR', minWidth: '180px' },
    { key: 'request_date', label: 'Tanggal & Target', minWidth: '180px' },
    { key: 'company_id', label: 'Perusahaan & Divisi', minWidth: '220px' },
    { key: 'purpose', label: 'Keperluan & Item', minWidth: '240px' },
    { key: 'status', label: 'Status & Kuota', minWidth: '180px', align: 'center', class: 'text-center' },
    { key: 'actions', label: 'Aksi', minWidth: '160px', align: 'center', class: 'text-center' }
]

// Bulk Selection State for Tab 1
const selectedItems = ref({})

const selectedItemList = computed(() => {
    return Object.values(selectedItems.value)
})

const selectedCompany = computed(() => {
    if (selectedItemList.value.length === 0) return null
    return selectedItemList.value[0]?.company || null
})

const selectedPrCount = computed(() => {
    const prIds = new Set(selectedItemList.value.map(i => i.pr_id))
    return prIds.size
})

const isItemChecked = (item) => {
    return !!selectedItems.value[item.purchase_requisition_item_id]
}

const isPrFullyChecked = (pr) => {
    if (!pr.items || pr.items.length === 0) return false
    return pr.items.every(i => !!selectedItems.value[i.purchase_requisition_item_id])
}

const isPrPartiallyChecked = (pr) => {
    if (!pr.items || pr.items.length === 0) return false
    const checkedCount = pr.items.filter(i => !!selectedItems.value[i.purchase_requisition_item_id]).length
    return checkedCount > 0 && checkedCount < pr.items.length
}

const toggleSelectItem = (item, pr) => {
    const itemId = item.purchase_requisition_item_id
    if (selectedItems.value[itemId]) {
        const next = { ...selectedItems.value }
        delete next[itemId]
        selectedItems.value = next
        return
    }

    // Company scope validation: strictly single company
    if (selectedCompany.value && selectedCompany.value.id !== pr.company?.id) {
        showError(
            'Perusahaan Berbeda',
            `Seluruh item yang dipilih harus berasal dari Perusahaan yang sama (${selectedCompany.value.name || 'Perusahaan sebelumnya'}).`
        )
        return
    }

    selectedItems.value = {
        ...selectedItems.value,
        [itemId]: {
            ...item,
            pr_id: pr.pr_id,
            pr_number: pr.pr_number,
            company: pr.company,
            division: pr.division,
            requester: pr.requester,
            purpose: pr.purpose
        }
    }
}

const toggleSelectPr = (pr) => {
    if (isPrFullyChecked(pr)) {
        // Deselect all items of this PR
        const next = { ...selectedItems.value }
        pr.items.forEach(i => {
            delete next[i.purchase_requisition_item_id]
        })
        selectedItems.value = next
        return
    }

    // Check company scope
    if (selectedCompany.value && selectedCompany.value.id !== pr.company?.id) {
        showError(
            'Perusahaan Berbeda',
            `Seluruh item yang dipilih harus berasal dari Perusahaan yang sama (${selectedCompany.value.name || 'Perusahaan sebelumnya'}).`
        )
        return
    }

    // Select all items of this PR
    const next = { ...selectedItems.value }
    pr.items.forEach(i => {
        next[i.purchase_requisition_item_id] = {
            ...i,
            pr_id: pr.pr_id,
            pr_number: pr.pr_number,
            company: pr.company,
            division: pr.division,
            requester: pr.requester,
            purpose: pr.purpose
        }
    })
    selectedItems.value = next
}

const clearSelection = () => {
    selectedItems.value = {}
}

const handleCreateConsolidatedPlan = () => {
    if (selectedItemList.value.length === 0) return
    sessionStorage.setItem('bulk_procurement_items', JSON.stringify(selectedItemList.value))
    sessionStorage.setItem('bulk_procurement_company', JSON.stringify(selectedCompany.value))
    router.push({
        name: 'user.purchasing.plans.create',
        query: { bulk: '1' }
    })
}

const handleFastTrackBulkDirectPurchase = () => {
    if (selectedItemList.value.length === 0) return
    sessionStorage.setItem('bulk_direct_purchase_items', JSON.stringify(selectedItemList.value))
    sessionStorage.setItem('bulk_direct_purchase_company', JSON.stringify(selectedCompany.value))
    router.push({
        name: 'user.purchasing.direct.create',
        query: { bulk: '1' }
    })
}

// Table Columns for Tab 2 (Plans) - Standardized layout
const tableColumns = [
    { key: 'no', label: 'No', width: '70px', align: 'center', class: 'text-center' },
    { key: 'pp_number', label: 'No. Rencana & Tanggal', minWidth: '200px' },
    { key: 'pr_info', label: 'Dokumen PR Asal', minWidth: '220px' },
    { key: 'method', label: 'Metode Pengadaan', minWidth: '180px', align: 'center', class: 'text-center' },
    { key: 'items_count', label: 'Alokasi Item', minWidth: '130px', align: 'center', class: 'text-center' },
    { key: 'status', label: 'Status', minWidth: '140px', align: 'center', class: 'text-center' },
    { key: 'creator', label: 'Dibuat Oleh', minWidth: '160px' },
    { key: 'actions', label: 'Aksi', minWidth: '140px', align: 'center', class: 'text-center' }
]

// Fetch Pending PR Queue
const fetchQueue = async () => {
    try {
        isLoadingQueue.value = true
        const response = await getProcurementQueue({}, 1, 100)
        queueItems.value = response.data || []
    } catch (error) {
        showError('Gagal Memuat Antrean PR!', 'Terjadi kesalahan saat memuat data Purchase Requisition yang siap diplanning.', error)
    } finally {
        isLoadingQueue.value = false
    }
}

// Fetch Existing Plans
const fetchPlans = async (search = searchQuery.value, page = 1) => {
    try {
        isLoadingPlans.value = true
        const filters = {}
        if (search) filters.search = search
        if (selectedStatus.value) filters.status = selectedStatus.value
        if (selectedMethod.value) filters.procurement_method = selectedMethod.value

        const response = await getProcurementPlans(filters, page, pagination.value.per_page)
        plans.value = response.data || []

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
        showError('Gagal Memuat Rencana!', 'Terjadi kesalahan saat memuat daftar rencana pengadaan.', error)
    } finally {
        isLoadingPlans.value = false
    }
}

// Watchers
watch(searchQuery, (newVal) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchPlans(newVal, 1)
    }, 400)
})

watch([selectedStatus, selectedMethod], () => {
    fetchPlans(searchQuery.value, 1)
})

watch(activeMainTab, (newTab) => {
    router.replace({ query: { ...route.query, tab: newTab } })
})

const handleStatusTab = (statusId) => {
    if (selectedStatus.value === statusId) return
    selectedStatus.value = statusId
}

const handlePageChange = (page) => {
    fetchPlans(searchQuery.value, page)
}

const toggleExpandPr = (prId) => {
    expandedPrs.value[prId] = !expandedPrs.value[prId]
}

const handleCreatePlanForPr = (pr) => {
    router.push({
        name: 'user.purchasing.plans.create',
        query: { pr_id: pr.pr_id }
    })
}

const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }).format(date)
}

// State & Helpers for Source PRs
const isPrModalOpen = ref(false)
const selectedPlanForPrModal = ref(null)

const openPrModal = (plan) => {
    selectedPlanForPrModal.value = plan
    isPrModalOpen.value = true
}

const isMultiPrPlan = (plan) => {
    if (!plan) return false
    if (plan.is_consolidated) return true
    if (plan.source_prs && plan.source_prs.length > 1) return true
    if (plan.pr_numbers && plan.pr_numbers.length > 1) return true
    return false
}

const getSinglePrNumber = (plan) => {
    if (!plan) return '-'
    if (plan.source_prs && plan.source_prs.length > 0) {
        return plan.source_prs[0].pr_number || '-'
    }
    if (plan.purchase_requisition?.pr_number) {
        return plan.purchase_requisition.pr_number
    }
    if (plan.pr_numbers && plan.pr_numbers.length > 0) {
        return plan.pr_numbers[0]
    }
    return '-'
}

const getSinglePrSubtitle = (plan) => {
    if (!plan) return '-'
    if (plan.source_prs && plan.source_prs.length > 0) {
        return plan.source_prs[0].division_name || plan.source_prs[0].company_name || '-'
    }
    return plan.purchase_requisition?.division?.name || plan.purchase_requisition?.company?.name || '-'
}

const getMultiPrCount = (plan) => {
    if (!plan) return 0
    if (plan.source_prs && plan.source_prs.length > 0) {
        return plan.source_prs.length
    }
    if (plan.pr_numbers && plan.pr_numbers.length > 0) {
        return plan.pr_numbers.length
    }
    return 0
}

const getMultiPrSubtitle = (plan) => {
    if (!plan) return 'Multi-Dokumen'
    if (plan.source_prs && plan.source_prs.length > 0) {
        const divisions = [...new Set(plan.source_prs.map(p => p.division_name).filter(Boolean))]
        if (divisions.length === 1) {
            return `Divisi ${divisions[0]}`
        }
        if (divisions.length > 1) {
            return `${divisions.length} Divisi (${divisions.slice(0, 2).join(', ')}${divisions.length > 2 ? '...' : ''})`
        }
    }
    return `${getMultiPrCount(plan)} Dokumen PR`
}

// Actions
const handleActivate = async (plan) => {
    const confirmed = await showConfirm(
        'Aktifkan Rencana Pengadaan?',
        `Rencana ${plan.pp_number} akan diaktifkan dan kuota item akan dikunci. Status PR terkait akan berubah menjadi In Procurement.`,
        'Ya, Aktifkan',
        'Batal',
        '#2563eb'
    )
    if (!confirmed) return

    try {
        showLoading('Mengaktifkan rencana...')
        await activateProcurementPlan(plan.id)
        showSuccess('Berhasil!', `Rencana pengadaan ${plan.pp_number} berhasil diaktifkan.`)
        fetchPlans(searchQuery.value, pagination.value.current_page)
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal mengaktifkan rencana pengadaan.'
        showError('Gagal!', errorMsg, error)
    }
}

const handleCancel = async (plan) => {
    const { value: reason, isConfirmed } = await showPrompt({
        title: 'Batalkan Rencana Pengadaan?',
        text: `Masukkan alasan pembatalan untuk rencana ${plan.pp_number}:`,
        placeholder: 'Tuliskan alasan pembatalan rencana ini...',
        confirmText: 'Ya, Batalkan Rencana',
        cancelText: 'Tutup',
        isDestructive: true,
        validator: (value) => {
            if (!value) {
                return 'Alasan pembatalan wajib diisi!'
            }
        }
    })

    if (!isConfirmed) return

    try {
        showLoading('Membatalkan rencana...')
        await cancelProcurementPlan(plan.id, reason)
        showSuccess('Berhasil!', `Rencana pengadaan ${plan.pp_number} telah dibatalkan.`)
        fetchPlans(searchQuery.value, pagination.value.current_page)
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal membatalkan rencana pengadaan.'
        showError('Gagal!', errorMsg, error)
    }
}

onMounted(async () => {
    await Promise.all([
        fetchQueue(),
        fetchPlans()
    ])

    // If query tab not explicitly provided, choose best tab
    if (!route.query.tab) {
        if (groupedPurchaseRequisitions.value.length > 0) {
            activeMainTab.value = 'pending'
        } else {
            activeMainTab.value = 'plans'
        }
    }
})
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <PageHeader 
            title="Rencana Pengadaan (Procurement Plans)" 
            description="Pilih Purchase Requisition (PR) approved untuk dibuatkan strategi pengadaan (Direct Purchase vs Tender RFQ) dan alokasi item."
            :breadcrumbs="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Rencana Pengadaan' }
            ]"
        >
            <template #actions>
                <button
                    v-if="activeMainTab === 'plans'"
                    type="button"
                    @click="activeMainTab = 'pending'"
                    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-200 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                    <Plus class="w-4 h-4" />
                    <span>Pilih PR untuk Dibuat Rencana</span>
                </button>
                <div v-else class="text-xs text-slate-500 bg-blue-50/70 border border-blue-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                    <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                    <span>Pilih salah satu PR di bawah ini untuk membuat rencana</span>
                </div>
            </template>
        </PageHeader>

        <!-- Primary High-Level View Switcher Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-200">
            <button
                type="button"
                @click="activeMainTab = 'pending'"
                class="pb-3.5 px-3 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all cursor-pointer -mb-px"
                :class="activeMainTab === 'pending'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'"
            >
                <ClipboardList class="w-4 h-4" />
                <span>Purchase Siap Diplanning</span>
                <span 
                    class="px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-colors"
                    :class="activeMainTab === 'pending'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'"
                >
                    {{ groupedPurchaseRequisitions.length }}
                </span>
            </button>

            <button
                type="button"
                @click="activeMainTab = 'plans'"
                class="pb-3.5 px-3 text-sm font-bold flex items-center gap-2.5 border-b-2 transition-all cursor-pointer -mb-px"
                :class="activeMainTab === 'plans'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'"
            >
                <Layers class="w-4 h-4" />
                <span>Dokumen Rencana Pengadaan</span>
                <span 
                    class="px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-colors"
                    :class="activeMainTab === 'plans'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'"
                >
                    {{ stats.total }}
                </span>
            </button>
        </div>

        <!-- ================= TAB 1: PURCHASE SIAP DIPLANNING ================= -->
        <div v-if="activeMainTab === 'pending'" class="space-y-6">
            <!-- Context Banner -->
            <div class="bg-gradient-to-r from-blue-50/70 via-slate-50/40 to-white border border-blue-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-start gap-4">
                    <div class="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-200 mt-0.5">
                        <ClipboardList class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Daftar Purchase Requisition Disetujui (Approved)</h3>
                        <p class="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-2xl">
                            Berikut adalah daftar dokumen PR yang telah disetujui dan menunggu penentuan strategi pengadaan. Klik tombol <strong>"Buat Rencana"</strong> pada baris PR yang ingin Anda proses.
                        </p>
                    </div>
                </div>

                <div class="shrink-0 flex items-center gap-2 self-start md:self-auto">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-blue-700 border border-blue-200 shadow-2xs">
                        <CheckCircle2 class="w-3.5 h-3.5 text-blue-600" />
                        <span>{{ groupedPurchaseRequisitions.length }} Dokumen PR Menunggu</span>
                    </span>
                </div>
            </div>

            <!-- Toolbar & Search -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100">
                    <div class="relative flex-1 max-w-md w-full">
                        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            v-model="queueSearch"
                            type="text"
                            placeholder="Cari nomor PR, divisi, pemohon, atau entitas..."
                            class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div class="flex items-center gap-2.5 self-end sm:self-auto">
                        <button 
                            type="button"
                            @click="fetchQueue"
                            :disabled="isLoadingQueue"
                            class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            title="Segarkan Antrean PR"
                        >
                            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingQueue }" />
                        </button>
                    </div>
                </div>

                <!-- Table of Pending PRs -->
                <BaseTable :columns="queueTableColumns">
                    <!-- Loading State -->
                    <tr v-if="isLoadingQueue">
                        <td colspan="8" class="px-6 py-14 text-center text-sm text-slate-500">
                            <div class="inline-flex items-center gap-2 font-medium">
                                <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                                Memuat daftar Purchase Requisition approved...
                            </div>
                        </td>
                    </tr>

                    <!-- Empty State -->
                    <tr v-else-if="groupedPurchaseRequisitions.length === 0">
                        <td colspan="8" class="px-6 py-14 text-center">
                            <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2.5">
                                <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                    <FileText class="w-6 h-6 text-slate-400" />
                                </div>
                                <div class="text-sm font-semibold text-slate-700">
                                    {{ queueSearch ? 'Tidak ada PR antrean yang cocok dengan pencarian' : 'Semua PR Telah Dibuatkan Rencana' }}
                                </div>
                                <p class="text-xs text-slate-400">
                                    {{ queueSearch ? 'Coba ubah kata kunci pencarian Anda.' : 'Seluruh Purchase Requisition (PR) approved sudah dialokasikan ke dalam rencana pengadaan.' }}
                                </p>
                                <button
                                    v-if="!queueSearch"
                                    type="button"
                                    @click="activeMainTab = 'plans'"
                                    class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs shadow-blue-200 mt-1 cursor-pointer"
                                >
                                    <Layers class="w-4 h-4" />
                                    <span>Lihat Dokumen Rencana Pengadaan</span>
                                </button>
                            </div>
                        </td>
                    </tr>

                    <!-- Data Rows -->
                    <template 
                        v-else 
                        v-for="(pr, index) in groupedPurchaseRequisitions" 
                        :key="pr.pr_id"
                    >
                        <tr 
                            :class="[
                                (isPrFullyChecked(pr) || isPrPartiallyChecked(pr)) ? 'bg-blue-50/40' : 'hover:bg-slate-50/80',
                                'transition-colors group border-b border-slate-100 last:border-b-0'
                            ]"
                        >
                            <!-- Select Checkbox -->
                            <td class="px-4 py-4.5 whitespace-nowrap text-center">
                                <input 
                                    type="checkbox"
                                    :checked="isPrFullyChecked(pr)"
                                    :indeterminate.prop="isPrPartiallyChecked(pr)"
                                    @change="toggleSelectPr(pr)"
                                    class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                    title="Pilih seluruh item pada PR ini untuk rencana konsolidasi"
                                />
                            </td>

                            <!-- No -->
                            <td class="px-4 py-4.5 whitespace-nowrap text-sm font-mono font-semibold text-slate-500 text-center">
                                {{ index + 1 }}
                            </td>

                            <!-- PR Number -->
                            <td class="px-6 py-4.5 whitespace-nowrap">
                                <button
                                    type="button"
                                    @click="handleCreatePlanForPr(pr)"
                                    class="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors group/btn text-left cursor-pointer"
                                    title="Klik untuk membuat rencana pengadaan"
                                >
                                    <span class="group-hover/btn:underline">{{ pr.pr_number }}</span>
                                    <ArrowUpRight class="w-4 h-4 text-slate-400 group-hover/btn:text-blue-600 opacity-0 group-hover/btn:opacity-100 transition-all shrink-0" />
                                </button>
                            </td>

                            <!-- Dates: Tanggal & Target (Max 2 lines) -->
                            <td class="px-6 py-4.5 whitespace-nowrap">
                                <div class="text-sm text-slate-800 font-semibold flex items-center gap-2">
                                    <Calendar class="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>{{ formatDate(pr.request_date) }}</span>
                                </div>
                                <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                                    <Clock class="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>Target: {{ formatDate(pr.required_date) }}</span>
                                </div>
                            </td>

                            <!-- Company & Division (Max 2 lines) -->
                            <td class="px-6 py-4.5 whitespace-nowrap">
                                <div class="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Building2 class="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>{{ pr.company?.name || 'Perusahaan #' + (pr.company_id || '-') }}</span>
                                </div>
                                <div class="text-xs font-medium text-slate-600 mt-1 flex items-center gap-2">
                                    <Layers class="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>{{ pr.division?.name || 'Divisi Pemohon' }}</span>
                                </div>
                            </td>

                            <!-- Purpose & Items Summary (Max 2 lines) -->
                            <td class="px-6 py-4.5">
                                <div class="text-sm font-medium text-slate-900 max-w-sm truncate" :title="pr.purpose">
                                    {{ pr.purpose || '-' }}
                                </div>
                                <div class="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                        {{ pr.items ? pr.items.length : 0 }} Item
                                    </span>
                                    <span 
                                        v-if="pr.has_custom_item" 
                                        class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                    >
                                        Non-Katalog
                                    </span>
                                    <button 
                                        type="button" 
                                        @click="toggleExpandPr(pr.pr_id)"
                                        class="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                        <span>{{ expandedPrs[pr.pr_id] ? 'Tutup Rincian' : 'Rincian Item' }}</span>
                                        <ChevronUp v-if="expandedPrs[pr.pr_id]" class="w-3 h-3" />
                                        <ChevronDown v-else class="w-3 h-3" />
                                    </button>
                                </div>
                            </td>

                            <!-- Status & Kuota (Max 2 lines) -->
                            <td class="px-6 py-4.5 whitespace-nowrap text-center">
                                <div class="inline-flex flex-col items-center justify-center">
                                    <StatusBadge status="approved" size="md" class="min-w-[125px]" />
                                    <span 
                                        class="text-xs font-semibold text-slate-600 mt-1 font-mono"
                                        title="Total sisa kuota yang belum dialokasikan"
                                    >
                                        {{ pr.total_remaining_qty.toLocaleString('id-ID') }} Unit Terbuka
                                    </span>
                                </div>
                            </td>

                            <!-- Actions -->
                            <td class="px-6 py-4.5 whitespace-nowrap text-center">
                                <div class="flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        @click="handleCreatePlanForPr(pr)"
                                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                                        title="Pilih PR ini dan buat rencana pengadaan"
                                    >
                                        <Plus class="w-3.5 h-3.5" />
                                        <span>Buat Rencana</span>
                                    </button>
                                </div>
                            </td>
                        </tr>

                        <!-- Expanded Item Details -->
                        <tr v-if="expandedPrs[pr.pr_id]" class="bg-slate-50/60 border-b border-slate-200/60">
                            <td colspan="8" class="p-4 sm:p-5">
                                <div class="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <Package class="w-4 h-4 text-slate-500" />
                                            <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                Daftar Item PR {{ pr.pr_number }}
                                            </span>
                                            <span class="text-xs text-slate-500 font-medium">({{ pr.items?.length || 0 }} item)</span>
                                        </div>
                                        <button
                                            type="button"
                                            @click="toggleSelectPr(pr)"
                                            class="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                                        >
                                            {{ isPrFullyChecked(pr) ? 'Batalkan Semua Item' : 'Pilih Semua Item PR Ini' }}
                                        </button>
                                    </div>
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-xs text-left">
                                            <thead>
                                                <tr class="border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                                                    <th class="py-2.5 px-3 w-10 text-center">Pilih</th>
                                                    <th class="py-2.5 px-3">Item / Deskripsi</th>
                                                    <th class="py-2.5 px-3 text-center">Qty Diminta</th>
                                                    <th class="py-2.5 px-3 text-center">Sisa Kuota</th>
                                                    <th class="py-2.5 px-3 text-right">Est. Harga Satuan</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100">
                                                <tr 
                                                    v-for="item in pr.items" 
                                                    :key="item.purchase_requisition_item_id"
                                                    :class="{ 'bg-blue-50/30': isItemChecked(item) }"
                                                    class="hover:bg-slate-50 transition-colors"
                                                >
                                                    <td class="py-2.5 px-3 text-center">
                                                        <input 
                                                            type="checkbox"
                                                            :checked="isItemChecked(item)"
                                                            @change="toggleSelectItem(item, pr)"
                                                            class="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td class="py-2.5 px-3">
                                                        <div class="font-semibold text-slate-900">
                                                            {{ item.item_name || item.item?.name || 'Item Non-Katalog' }}
                                                        </div>
                                                        <div v-if="item.item?.code" class="text-[11px] font-mono text-slate-500">
                                                            {{ item.item.code }}
                                                        </div>
                                                    </td>
                                                    <td class="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                                                        {{ Number(item.requested_quantity || 0).toLocaleString('id-ID') }} {{ item.unit?.symbol || item.unit?.code || item.unit_name || 'Unit' }}
                                                    </td>
                                                    <td class="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                                                        {{ Number(item.remaining_quantity || 0).toLocaleString('id-ID') }} {{ item.unit?.symbol || item.unit?.code || item.unit_name || 'Unit' }}
                                                    </td>
                                                    <td class="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                                                        {{ item.estimated_unit_price ? 'Rp ' + Number(item.estimated_unit_price).toLocaleString('id-ID') : '-' }}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </template>
                </BaseTable>

                <!-- Floating Bulk Selection Bar -->
                <div 
                    v-if="selectedItemList.length > 0"
                    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[92%] bg-slate-900 text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
                >
                    <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shadow-blue-500">
                                {{ selectedItemList.length }}
                            </div>
                            <div class="flex flex-col">
                                <span class="text-xs font-bold text-white flex items-center gap-1.5">
                                    <span>{{ selectedItemList.length }} Item Terpilih</span>
                                    <span class="text-slate-400 font-normal">({{ selectedPrCount }} Dokumen PR)</span>
                                </span>
                                <span v-if="selectedCompany" class="text-[11px] text-slate-300 flex items-center gap-1">
                                    <Building2 class="w-3.5 h-3.5 text-blue-400" />
                                    <span>{{ selectedCompany.name }}</span>
                                </span>
                            </div>
                        </div>
                        <button 
                            type="button"
                            @click="clearSelection"
                            class="text-xs text-slate-400 hover:text-white underline cursor-pointer ml-2"
                        >
                            Batal
                        </button>
                    </div>

                    <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                        <button
                            type="button"
                            @click="handleCreateConsolidatedPlan"
                            class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all cursor-pointer flex items-center gap-1.5"
                            title="Kelompokkan item dari beberapa PR ke dalam 1 Rencana Pengadaan Konsolidasi"
                        >
                            <Layers class="w-3.5 h-3.5 text-blue-400" />
                            <span>Buat Rencana Konsolidasi</span>
                        </button>

                        <button
                            type="button"
                            @click="handleFastTrackBulkDirectPurchase"
                            class="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-900/40 transition-all cursor-pointer flex items-center gap-1.5"
                            title="Beli seluruh item terpilih dalam 1 kali Direct Purchase & 1 kali pembayaran Finance"
                        >
                            <ShoppingCart class="w-3.5 h-3.5" />
                            <span>Beli Langsung Sekaligus (Bulk DP)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================= TAB 2: DOKUMEN RENCANA PENGADAAN ================= -->
        <div v-else class="space-y-6">
            <!-- Operational Workbench Header (Anti-Slop Bento Dock) -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-gradient-to-r from-blue-50/30 via-slate-50/20 to-white">
                    <!-- Left: Pipeline Stage Breakdown -->
                    <div class="space-y-2">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-200">
                                <Layers class="w-4 h-4" />
                            </div>
                            <div>
                                <h3 class="text-sm font-bold text-slate-900">Alur Eksekusi Rencana Sourcing</h3>
                                <p class="text-xs text-slate-500">Distribusi dokumen rencana pengadaan berdasarkan status kesiapan operasi</p>
                            </div>
                        </div>

                        <!-- Live Metric Pills -->
                        <div class="flex items-center gap-2 pt-1 flex-wrap">
                            <!-- Total -->
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <Layers class="w-3.5 h-3.5 text-slate-500" />
                                <span>Total Rencana: <strong class="text-slate-900 font-mono">{{ stats.total }}</strong></span>
                            </span>

                            <!-- Draft (Perlu Aktivasi) -->
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock class="w-3.5 h-3.5 text-amber-600" />
                                <span>Draft: <strong class="font-mono">{{ stats.draft }}</strong></span>
                                <span v-if="stats.draft > 0" class="text-[10px] bg-amber-200/60 px-1.5 py-0.2 rounded font-semibold text-amber-900">Perlu Aktivasi</span>
                            </span>

                            <!-- Active (Siap Realisasi) -->
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <CheckCircle2 class="w-3.5 h-3.5 text-blue-600" />
                                <span>Aktif Berjalan: <strong class="font-mono">{{ stats.active }}</strong></span>
                            </span>

                            <!-- Selesai -->
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCheck class="w-3.5 h-3.5 text-emerald-600" />
                                <span>Selesai: <strong class="font-mono">{{ stats.completed }}</strong></span>
                            </span>
                        </div>
                    </div>

                    <!-- Right: Sourcing Method Split Card -->
                    <div class="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200/80 lg:pl-6">
                        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                                <ShoppingCart class="w-5 h-5" />
                            </div>
                            <div>
                                <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Direct Purchase</span>
                                <div class="flex items-baseline gap-1.5">
                                    <span class="text-lg font-bold text-emerald-700 font-mono">{{ stats.direct }}</span>
                                    <span class="text-[11px] text-slate-500 font-medium">Paket</span>
                                </div>
                            </div>
                        </div>

                        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                                <Scale class="w-5 h-5" />
                            </div>
                            <div>
                                <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Tender RFQ</span>
                                <div class="flex items-baseline gap-1.5">
                                    <span class="text-lg font-bold text-blue-700 font-mono">{{ stats.rfq }}</span>
                                    <span class="text-[11px] text-slate-500 font-medium">Paket</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Table & Filter Card -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <!-- Filter Toolbar -->
                <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <!-- Search & Method Dropdown -->
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                        <div class="relative flex-1 w-full">
                            <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input 
                                v-model="searchQuery" 
                                type="text"
                                placeholder="Cari No. Rencana (PP) atau Dokumen PR..." 
                                class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <!-- Method Filter -->
                        <select 
                            v-model="selectedMethod"
                            class="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs transition-colors shrink-0"
                        >
                            <option v-for="opt in methodOptions" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>

                        <button 
                            type="button"
                            @click="fetchPlans(searchQuery, 1)"
                            :disabled="isLoadingPlans"
                            class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0 self-center sm:self-auto"
                            title="Segarkan Data"
                        >
                            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingPlans }" />
                        </button>
                    </div>

                    <!-- Segmented Status Tabs -->
                    <div class="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 overflow-x-auto self-start lg:self-auto shrink-0">
                        <button
                            v-for="tab in statusTabs"
                            :key="tab.id"
                            type="button"
                            @click="handleStatusTab(tab.id)"
                            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer"
                            :class="selectedStatus === tab.id 
                                ? 'bg-blue-600 text-white font-bold shadow-xs shadow-blue-200' 
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
                        >
                            {{ tab.label }}
                        </button>
                    </div>
                </div>

                <!-- Table -->
                <BaseTable :columns="tableColumns">
                    <!-- Loading State -->
                    <tr v-if="isLoadingPlans">
                        <td colspan="8" class="px-6 py-14 text-center text-sm text-slate-500">
                            <div class="inline-flex items-center gap-2 font-medium">
                                <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                                Memuat rencana pengadaan...
                            </div>
                        </td>
                    </tr>

                    <!-- Empty State -->
                    <tr v-else-if="plans.length === 0">
                        <td colspan="8" class="px-6 py-14 text-center text-slate-500">
                            <div class="flex flex-col items-center justify-center max-w-md mx-auto space-y-2.5">
                                <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                    <Layers class="w-6 h-6 text-slate-400" />
                                </div>
                                <h4 class="text-sm font-bold text-slate-900 mb-1">Belum Ada Rencana Pengadaan</h4>
                                <p class="text-xs text-slate-500 leading-relaxed mb-4">
                                    Pilih Purchase Requisition (PR) yang telah disetujui di tab "Purchase Siap Diplanning" untuk membuat rencana pengadaan.
                                </p>
                                <button
                                    type="button"
                                    @click="activeMainTab = 'pending'"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer"
                                >
                                    <Plus class="w-3.5 h-3.5" />
                                    <span>Pilih PR untuk Dibuat Rencana</span>
                                </button>
                            </div>
                        </td>
                    </tr>

                    <!-- Data Rows -->
                    <tr 
                        v-else 
                        v-for="(plan, index) in plans" 
                        :key="plan.id"
                        class="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-b-0"
                    >
                        <!-- No -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-sm font-mono font-semibold text-slate-500 text-center">
                            {{ ((pagination.current_page - 1) * pagination.per_page) + index + 1 }}
                        </td>

                        <!-- No. Rencana & Tanggal -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <RouterLink 
                                :to="{ name: 'user.purchasing.plans.detail', params: { id: plan.id } }"
                                class="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors group/link text-left"
                                title="Lihat detail rencana pengadaan"
                            >
                                <span class="group-hover/link:underline">{{ plan.pp_number || 'PP #' + plan.id }}</span>
                                <ArrowUpRight class="w-4 h-4 text-slate-400 group-hover/link:text-blue-600 opacity-0 group-hover/link:opacity-100 transition-all shrink-0" />
                            </RouterLink>
                            <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                                <Calendar class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ formatDate(plan.created_at) }}</span>
                            </div>
                        </td>

                        <!-- Dokumen PR Asal (Max 2 lines) -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <!-- Multi-PR Consolidated Plan -->
                            <div v-if="isMultiPrPlan(plan)">
                                <button
                                    type="button"
                                    @click.stop="openPrModal(plan)"
                                    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors cursor-pointer group/modal"
                                    title="Klik untuk melihat rincian dokumen PR asal"
                                >
                                    <Layers class="w-3.5 h-3.5 text-indigo-500 group-hover/modal:scale-110 transition-transform" />
                                    <span>{{ getMultiPrCount(plan) }} PR Terkonsolidasi</span>
                                </button>
                                <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5 truncate max-w-[200px]" :title="getMultiPrSubtitle(plan)">
                                    <FileText class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span class="truncate">{{ getMultiPrSubtitle(plan) }}</span>
                                </div>
                            </div>

                            <!-- Single PR Plan -->
                            <div v-else>
                                <div class="text-sm font-mono font-bold text-slate-900 flex items-center gap-2">
                                    <FileText class="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>{{ getSinglePrNumber(plan) }}</span>
                                </div>
                                <div class="text-xs text-slate-500 font-medium mt-1 truncate max-w-[200px]" :title="getSinglePrSubtitle(plan)">
                                    <span>{{ getSinglePrSubtitle(plan) }}</span>
                                </div>
                            </div>
                        </td>

                        <!-- Metode Pengadaan -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <span 
                                v-if="plan.procurement_method === 'direct_purchase'"
                                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                                <ShoppingCart class="w-3.5 h-3.5" />
                                Direct Purchase
                            </span>
                            <span 
                                v-else-if="plan.procurement_method === 'rfq'"
                                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                            >
                                <Scale class="w-3.5 h-3.5" />
                                Tender RFQ
                            </span>
                            <span v-else class="text-xs text-slate-400">-</span>
                        </td>

                        <!-- Alokasi Item -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                {{ plan.items?.length || 0 }} Item
                            </span>
                        </td>

                        <!-- Status -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="inline-flex items-center justify-center">
                                <StatusBadge :status="plan.status" size="md" class="min-w-[110px]" />
                            </div>
                        </td>

                        <!-- Dibuat Oleh (Max 2 lines) -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <div class="text-sm font-semibold text-slate-900">
                                {{ plan.created_by_user?.name || plan.created_by_user?.employee?.name || 'Staff Purchasing' }}
                            </div>
                            <div class="text-xs text-slate-500 font-medium mt-0.5">
                                {{ plan.created_by_user?.employee?.division?.name || 'Purchasing Dept' }}
                            </div>
                        </td>

                        <!-- Aksi -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="flex items-center justify-center gap-1.5">
                                <!-- View Detail -->
                                <RouterLink 
                                    :to="{ name: 'user.purchasing.plans.detail', params: { id: plan.id } }"
                                    class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                    title="Lihat Rincian Rencana"
                                >
                                    <Eye class="w-4 h-4" />
                                </RouterLink>

                                <!-- Activate (Only if Draft) -->
                                <button 
                                    v-if="plan.status === 'draft'"
                                    @click="handleActivate(plan)"
                                    class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                                    title="Aktifkan Rencana Ini"
                                >
                                    <Play class="w-4 h-4" />
                                </button>

                                <!-- Cancel (If Draft or Active) -->
                                <button 
                                    v-if="['draft', 'active'].includes(plan.status)"
                                    @click="handleCancel(plan)"
                                    class="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                                    title="Batalkan Rencana"
                                >
                                    <Ban class="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </BaseTable>

                <!-- Pagination -->
                <div class="p-5 border-t border-slate-100 flex items-center justify-between">
                    <Pagination 
                        :pagination="pagination" 
                        @page-change="handlePageChange" 
                    />
                </div>
            </div>
        </div>

        <!-- Modal Rincian PR Asal Terkonsolidasi -->
        <BaseModal
            v-model="isPrModalOpen"
            :title="`Dokumen PR Asal (${getMultiPrCount(selectedPlanForPrModal)} Dokumen)`"
            :subtitle="`Rencana Pengadaan: ${selectedPlanForPrModal?.pp_number || '-'}`"
            :icon="Layers"
            size="lg"
            :show-backdrop="true"
            @close="isPrModalOpen = false"
        >
            <div v-if="selectedPlanForPrModal" class="space-y-4">
                <!-- Summary Banner -->
                <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                        <span class="text-slate-500">Metode Pengadaan:</span>
                        <span class="font-bold text-slate-800 ml-1.5 uppercase font-mono">{{ selectedPlanForPrModal.procurement_method }}</span>
                    </div>
                    <div>
                        <span class="text-slate-500">Total Item Rencana:</span>
                        <span class="font-bold text-blue-600 ml-1.5">{{ selectedPlanForPrModal.items?.length || selectedPlanForPrModal.items_count || 0 }} Item</span>
                    </div>
                </div>

                <!-- List of PRs -->
                <div class="space-y-3">
                    <div 
                        v-for="(pr, pIdx) in (selectedPlanForPrModal.source_prs || [])" 
                        :key="pr.id || pIdx"
                        class="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all space-y-2.5"
                    >
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="font-mono font-bold text-blue-700 text-sm flex items-center gap-1.5">
                                    <FileText class="w-4 h-4 text-blue-500" />
                                    {{ pr.pr_number }}
                                </span>
                                <span v-if="pr.items_count" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {{ pr.items_count }} Item Dialokasikan
                                </span>
                            </div>
                            <span v-if="pr.division_name" class="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {{ pr.division_name }}
                            </span>
                        </div>

                        <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 text-slate-600">
                            <div>
                                <span class="text-slate-400">Pemohon:</span>
                                <span class="font-medium text-slate-800 ml-1">{{ pr.requester_name || '-' }}</span>
                            </div>
                            <div>
                                <span class="text-slate-400">Perusahaan:</span>
                                <span class="font-medium text-slate-800 ml-1">{{ pr.company_name || '-' }}</span>
                            </div>
                        </div>

                        <div v-if="pr.purpose" class="text-xs text-slate-500 bg-slate-50/80 p-2 rounded-lg italic">
                            "{{ pr.purpose }}"
                        </div>
                    </div>

                    <!-- Fallback if source_prs is empty but pr_numbers has values -->
                    <div 
                        v-if="(!selectedPlanForPrModal.source_prs || selectedPlanForPrModal.source_prs.length === 0) && selectedPlanForPrModal.pr_numbers?.length > 0"
                        class="space-y-2"
                    >
                        <div 
                            v-for="prNo in selectedPlanForPrModal.pr_numbers" 
                            :key="prNo"
                            class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                            <span class="font-mono font-bold text-blue-600 flex items-center gap-1.5">
                                <FileText class="w-3.5 h-3.5 text-blue-500" />
                                {{ prNo }}
                            </span>
                            <span class="text-slate-500">Dokumen PR Terkait</span>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <BaseButton
                    variant="outline"
                    size="sm"
                    @click="isPrModalOpen = false"
                >
                    Tutup
                </BaseButton>
                <BaseButton
                    v-if="selectedPlanForPrModal"
                    variant="primary"
                    size="sm"
                    @click="router.push({ name: 'user.purchasing.plans.detail', params: { id: selectedPlanForPrModal.id } })"
                >
                    Buka Detail Rencana
                </BaseButton>
            </template>
        </BaseModal>
    </div>
</template>


