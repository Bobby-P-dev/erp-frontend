<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { 
    getProcurementPlans, 
    getProcurementQueue,
    activateProcurementPlan, 
    cancelProcurementPlan 
} from '../../services/procurementPlanServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import Swal from 'sweetalert2'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import Pagination from '../../components/ui/Pagination.vue'

import {
    Home,
    ChevronRight,
    Layers,
    Plus,
    RefreshCw,
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

// Table Columns for Tab 1 (Pending PRs)
const queueTableColumns = [
    { key: 'select', label: '', class: 'w-10 text-center' },
    { key: 'no', label: 'No', class: 'w-12 text-center' },
    { key: 'pr_number', label: 'Dokumen PR & Target Kebutuhan', class: 'min-w-[220px]' },
    { key: 'requester', label: 'Pemohon & Unit Kerja', class: 'min-w-[190px]' },
    { key: 'items_summary', label: 'Item Pengadaan Disetujui', class: 'min-w-[250px]' },
    { key: 'total_remaining', label: 'Sisa Kuota', class: 'w-32 text-right' },
    { key: 'actions', label: 'Aksi', class: 'w-44 text-center' }
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

// Table Columns for Tab 2 (Plans)
const tableColumns = [
    { key: 'no', label: 'No', class: 'w-12 text-center' },
    { key: 'pp_number', label: 'No. Rencana & Tanggal', class: 'min-w-[200px]' },
    { key: 'pr_info', label: 'Dokumen PR Asal', class: 'min-w-[200px]' },
    { key: 'method', label: 'Metode Pengadaan', class: 'w-48 text-center' },
    { key: 'items_count', label: 'Alokasi Item', class: 'w-28 text-center' },
    { key: 'status', label: 'Status', class: 'w-36 text-center' },
    { key: 'creator', label: 'Dibuat Oleh', class: 'min-w-[150px]' },
    { key: 'actions', label: 'Aksi', class: 'w-36 text-center' }
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
    const { value: reason, isConfirmed } = await Swal.fire({
        title: 'Batalkan Rencana Pengadaan?',
        text: `Masukkan alasan pembatalan untuk rencana ${plan.pp_number}:`,
        input: 'textarea',
        inputPlaceholder: 'Tuliskan alasan pembatalan rencana ini...',
        showCancelButton: true,
        confirmButtonText: 'Ya, Batalkan Rencana',
        cancelButtonText: 'Tutup',
        confirmButtonColor: '#e11d48',
        inputValidator: (value) => {
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
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div class="max-w-md w-full">
                        <SearchInput 
                            v-model="queueSearch" 
                            placeholder="Cari No. PR, Divisi, atau Nama Barang..." 
                        />
                    </div>

                    <button 
                        @click="fetchQueue"
                        :disabled="isLoadingQueue"
                        class="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-slate-200 hover:border-blue-200 shrink-0 self-start sm:self-auto cursor-pointer"
                        title="Segarkan Antrean PR"
                    >
                        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoadingQueue }" />
                    </button>
                </div>

                <!-- Table of Pending PRs -->
                <BaseTable :columns="queueTableColumns">
                    <!-- Loading State -->
                    <tr v-if="isLoadingQueue">
                        <td colspan="7" class="py-16 text-center text-slate-500">
                            <div class="flex flex-col items-center justify-center gap-3">
                                <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span class="text-sm font-medium text-slate-600">Memuat daftar Purchase Requisition approved...</span>
                            </div>
                        </td>
                    </tr>

                    <!-- Empty State -->
                    <tr v-else-if="groupedPurchaseRequisitions.length === 0">
                        <td colspan="7" class="py-16 text-center text-slate-500">
                            <div class="flex flex-col items-center justify-center max-w-md mx-auto">
                                <div class="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-emerald-600 border border-emerald-100">
                                    <CheckCheck class="w-8 h-8" />
                                </div>
                                <h4 class="text-lg font-bold text-slate-900 mb-1">Semua PR Telah Dibuatkan Rencana</h4>
                                <p class="text-xs text-slate-500 leading-relaxed mb-5">
                                    Tidak ada Purchase Requisition (PR) approved yang membutuhkan rencana pengadaan saat ini. Seluruh alokasi kebutuhan sudah diproses.
                                </p>
                                <button
                                    type="button"
                                    @click="activeMainTab = 'plans'"
                                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-200 transition-all cursor-pointer"
                                >
                                    <Layers class="w-4 h-4" />
                                    <span>Lihat Dokumen Rencana Pengadaan</span>
                                </button>
                            </div>
                        </td>
                    </tr>

                    <!-- PR Rows -->
                    <template v-else v-for="(pr, index) in groupedPurchaseRequisitions" :key="pr.pr_id">
                        <tr class="hover:bg-slate-50/80 transition-colors" :class="{ 'bg-blue-50/40': isPrFullyChecked(pr) || isPrPartiallyChecked(pr) }">
                            <!-- Select PR -->
                            <td class="px-3 py-4 text-center">
                                <input 
                                    type="checkbox"
                                    :checked="isPrFullyChecked(pr)"
                                    :indeterminate.prop="isPrPartiallyChecked(pr)"
                                    @change="toggleSelectPr(pr)"
                                    class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                    title="Pilih seluruh item pada PR ini"
                                />
                            </td>

                            <!-- No -->
                            <td class="px-4 py-4 text-sm text-slate-500 text-center font-medium font-mono">
                                {{ index + 1 }}
                            </td>

                            <!-- PR Number & Date -->
                            <td class="px-6 py-4">
                                <div class="flex flex-col gap-1">
                                    <span class="font-bold text-blue-700 font-mono text-sm flex items-center gap-1.5">
                                        <FileText class="w-4 h-4 text-blue-600" />
                                        {{ pr.pr_number }}
                                    </span>
                                    <span class="text-xs text-slate-500 flex items-center gap-1">
                                        <Calendar class="w-3 h-3 text-slate-400" />
                                        Target: {{ formatDate(pr.required_date) }}
                                    </span>
                                </div>
                            </td>

                            <!-- Requester / Division -->
                            <td class="px-6 py-4">
                                <div class="flex flex-col gap-1">
                                    <div v-if="pr.requester?.name" class="flex items-center gap-1.5">
                                        <div class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                            <User class="w-3 h-3 text-blue-600" />
                                        </div>
                                        <span class="font-bold text-slate-800 text-xs truncate max-w-[170px]" :title="pr.requester.name">
                                            {{ pr.requester.name }}
                                        </span>
                                    </div>
                                    <div class="flex flex-col text-[11px] text-slate-500">
                                        <span class="font-medium text-slate-700">
                                            {{ pr.division?.name || 'Divisi Pemohon' }}
                                        </span>
                                        <span class="flex items-center gap-1 text-slate-400">
                                            <Building2 class="w-3 h-3" />
                                            {{ pr.company?.name || '-' }}
                                        </span>
                                    </div>
                                </div>
                            </td>

                            <!-- Items Summary -->
                            <td class="px-6 py-4">
                                <div class="space-y-1.5">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            <Package class="w-3 h-3" />
                                            {{ pr.items.length }} Item
                                        </span>
                                        <span 
                                            v-if="pr.has_custom_item" 
                                            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                        >
                                            Non-Katalog (Direct)
                                        </span>
                                    </div>
                                    <button 
                                        type="button" 
                                        @click="toggleExpandPr(pr.pr_id)"
                                        class="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                        <span>{{ expandedPrs[pr.pr_id] ? 'Sembunyikan Rincian Item' : 'Lihat Rincian Item' }}</span>
                                        <ChevronUp v-if="expandedPrs[pr.pr_id]" class="w-3 h-3" />
                                        <ChevronDown v-else class="w-3 h-3" />
                                    </button>
                                </div>
                            </td>

                            <!-- Total Remaining Quantity -->
                            <td class="px-6 py-4 text-right">
                                <span class="font-mono font-bold text-slate-900 text-sm">
                                    {{ pr.total_remaining_qty.toLocaleString('id-ID') }}
                                </span>
                                <span class="text-[11px] text-slate-500 block font-normal">Unit Terbuka</span>
                            </td>

                            <!-- Actions -->
                            <td class="px-6 py-4 text-center">
                                <button
                                    type="button"
                                    @click="handleCreatePlanForPr(pr)"
                                    class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-200 transition-all hover:-translate-y-0.5 cursor-pointer"
                                    title="Pilih PR ini dan buat rencana pengadaan"
                                >
                                    <Plus class="w-3.5 h-3.5" />
                                    <span>Buat Rencana</span>
                                </button>
                            </td>
                        </tr>

                        <!-- Accordion Sub-Table for Items -->
                        <tr v-if="expandedPrs[pr.pr_id]" class="bg-blue-50/20 border-b border-slate-200">
                            <td colspan="7" class="p-4 sm:p-5">
                                <div class="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Package class="w-3.5 h-3.5 text-blue-600" />
                                            <span>Daftar Item pada {{ pr.pr_number }}:</span>
                                        </span>
                                        <button
                                            type="button"
                                            @click="handleCreatePlanForPr(pr)"
                                            class="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <span>Lanjutkan Buat Rencana untuk PR Ini</span>
                                            <ArrowRight class="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div class="overflow-x-auto rounded-lg border border-slate-100">
                                        <table class="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                                                    <th class="py-2 px-3 text-center w-8">Pilih</th>
                                                    <th class="py-2 px-3">Item / Deskripsi</th>
                                                    <th class="py-2 px-3 text-center">Tipe</th>
                                                    <th class="py-2 px-3 text-right">Diminta</th>
                                                    <th class="py-2 px-3 text-right">Sisa Kuota</th>
                                                    <th class="py-2 px-3">Referensi URL / Catatan</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100">
                                                <tr 
                                                    v-for="item in pr.items" 
                                                    :key="item.purchase_requisition_item_id" 
                                                    class="hover:bg-slate-50/50 transition-colors"
                                                    :class="{ 'bg-blue-50/50': isItemChecked(item) }"
                                                >
                                                    <td class="py-2.5 px-3 text-center">
                                                        <input 
                                                            type="checkbox"
                                                            :checked="isItemChecked(item)"
                                                            @change="toggleSelectItem(item, pr)"
                                                            class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td class="py-2.5 px-3">
                                                        <span class="font-bold text-slate-800">{{ item.item_name }}</span>
                                                        <span v-if="item.item?.code" class="block text-[11px] font-mono text-slate-400">{{ item.item.code }}</span>
                                                    </td>
                                                    <td class="py-2.5 px-3 text-center">
                                                        <span v-if="item.is_custom_item" class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            Non-Katalog
                                                        </span>
                                                        <span v-else class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                                            Katalog
                                                        </span>
                                                    </td>
                                                    <td class="py-2.5 px-3 text-right font-mono font-semibold text-slate-600">
                                                        {{ item.requested_quantity }} {{ item.unit?.code || item.unit?.name || 'Unit' }}
                                                    </td>
                                                    <td class="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                                        {{ item.remaining_quantity }} {{ item.unit?.code || item.unit?.name || 'Unit' }}
                                                    </td>
                                                    <td class="py-2.5 px-3 text-slate-500">
                                                        <a 
                                                            v-if="item.reference_url" 
                                                            :href="item.reference_url" 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            class="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-xs"
                                                        >
                                                            <ExternalLink class="w-3 h-3 shrink-0" />
                                                            <span>{{ item.reference_url }}</span>
                                                        </a>
                                                        <span v-else-if="item.notes" class="italic">{{ item.notes }}</span>
                                                        <span v-else class="text-slate-400">-</span>
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

                <!-- Floating Bulk Selection Action Bar -->
                <div 
                    v-if="selectedItemList.length > 0"
                    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[92%] bg-slate-900/95 backdrop-blur-md text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
                >
                    <!-- Left Info -->
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
                                <span v-if="selectedCompany" class="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Building2 class="w-3 h-3 text-slate-400" />
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

                    <!-- Right Actions -->
                    <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            @click="handleCreateConsolidatedPlan"
                            class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                            title="Kelompokkan item ke dalam Rencana Pengadaan Konsolidasi"
                        >
                            <Layers class="w-3.5 h-3.5 text-blue-400" />
                            <span>Buat Rencana Konsolidasi</span>
                        </button>

                        <button
                            type="button"
                            @click="handleFastTrackBulkDirectPurchase"
                            class="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-900/40 transition-all hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5"
                            title="Beli seluruh item terpilih dalam 1 kali Direct Purchase & 1 kali pembayaran Finance"
                        >
                            <ShoppingCart class="w-3.5 h-3.5" />
                            <span>⚡ Beli Langsung Sekaligus (Bulk DP)</span>
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
                <div class="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <!-- Search & Method Dropdown -->
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                        <div class="flex-1">
                            <SearchInput 
                                v-model="searchQuery" 
                                placeholder="Cari No. Rencana (PP) atau Dokumen PR..." 
                            />
                        </div>

                        <!-- Method Filter -->
                        <select 
                            v-model="selectedMethod"
                            class="text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer shadow-xs transition-colors shrink-0"
                        >
                            <option v-for="opt in methodOptions" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>

                        <button 
                            @click="fetchPlans(searchQuery, 1)"
                            :disabled="isLoadingPlans"
                            class="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-slate-200 hover:border-blue-200 shrink-0 self-center cursor-pointer"
                            title="Segarkan Data"
                        >
                            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoadingPlans }" />
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
                        <td colspan="8" class="py-16 text-center text-slate-500">
                            <div class="flex flex-col items-center justify-center gap-3">
                                <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span class="text-sm font-medium text-slate-600">Memuat rencana pengadaan...</span>
                            </div>
                        </td>
                    </tr>

                    <!-- Empty State -->
                    <tr v-else-if="plans.length === 0">
                        <td colspan="8" class="py-16 text-center text-slate-500">
                            <div class="flex flex-col items-center justify-center max-w-md mx-auto">
                                <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 border border-blue-100">
                                    <Layers class="w-8 h-8" />
                                </div>
                                <h4 class="text-lg font-bold text-slate-900 mb-1">Belum Ada Rencana Pengadaan</h4>
                                <p class="text-xs text-slate-500 leading-relaxed mb-5">
                                    Pilih Purchase Requisition (PR) yang telah disetujui di tab "Purchase Siap Diplanning" untuk membuat rencana pengadaan.
                                </p>
                                <button
                                    type="button"
                                    @click="activeMainTab = 'pending'"
                                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-200 transition-all cursor-pointer"
                                >
                                    <Plus class="w-4 h-4 mr-1.5" />
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
                        class="hover:bg-slate-50/80 transition-colors"
                    >
                        <!-- No -->
                        <td class="px-6 py-4 text-sm text-slate-500 text-center font-medium font-mono">
                            {{ ((pagination.current_page - 1) * pagination.per_page) + index + 1 }}
                        </td>

                        <!-- PP Number & Date -->
                        <td class="px-6 py-4">
                            <div class="flex flex-col gap-1">
                                <RouterLink 
                                    :to="{ name: 'user.purchasing.plans.detail', params: { id: plan.id } }"
                                    class="font-bold text-blue-600 hover:text-blue-800 hover:underline text-sm font-mono flex items-center gap-1.5"
                                >
                                    <Layers class="w-3.5 h-3.5 text-blue-500" />
                                    {{ plan.pp_number || 'PP #' + plan.id }}
                                </RouterLink>
                                <span class="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar class="w-3 h-3 text-slate-400" />
                                    {{ formatDate(plan.created_at) }}
                                </span>
                            </div>
                        </td>

                        <!-- PR Info -->
                        <td class="px-6 py-4">
                            <div class="flex flex-col gap-1">
                                <span class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                    <FileText class="w-3.5 h-3.5 text-slate-400" />
                                    {{ plan.purchase_requisition?.pr_number || '-' }}
                                </span>
                                <span class="text-xs text-slate-500">
                                    {{ plan.purchase_requisition?.division?.name || plan.purchase_requisition?.company?.name || '-' }}
                                </span>
                            </div>
                        </td>

                        <!-- Sourcing Method Badge -->
                        <td class="px-6 py-4 text-center">
                            <span 
                                v-if="plan.procurement_method === 'direct_purchase'"
                                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                                <ShoppingCart class="w-3.5 h-3.5" />
                                Direct Purchase
                            </span>
                            <span 
                                v-else-if="plan.procurement_method === 'rfq'"
                                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"
                            >
                                <Scale class="w-3.5 h-3.5" />
                                Tender RFQ
                            </span>
                            <span v-else class="text-xs text-slate-400">-</span>
                        </td>

                        <!-- Items Count -->
                        <td class="px-6 py-4 text-center font-bold text-slate-700 text-sm font-mono">
                            {{ plan.items?.length || 0 }} Item
                        </td>

                        <!-- Status Badge -->
                        <td class="px-6 py-4 text-center">
                            <span 
                                v-if="plan.status === 'draft'"
                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200"
                            >
                                <Clock class="w-3 h-3 text-amber-600" /> Draft
                            </span>
                            <span 
                                v-else-if="plan.status === 'active'"
                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"
                            >
                                <CheckCircle2 class="w-3 h-3 text-blue-600" /> Aktif
                            </span>
                            <span 
                                v-else-if="plan.status === 'completed'"
                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                                <CheckCheck class="w-3 h-3 text-emerald-600" /> Selesai
                            </span>
                            <span 
                                v-else-if="plan.status === 'cancelled'"
                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            >
                                <XCircle class="w-3 h-3 text-rose-600" /> Dibatalkan
                            </span>
                            <span v-else class="text-xs text-slate-500 font-bold uppercase">{{ plan.status }}</span>
                        </td>

                        <!-- Creator -->
                        <td class="px-6 py-4">
                            <span class="text-xs font-semibold text-slate-700 block">
                                {{ plan.created_by_user?.name || plan.created_by_user?.employee?.name || 'Staff Purchasing' }}
                            </span>
                        </td>

                        <!-- Actions -->
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-1.5">
                                <!-- View Detail -->
                                <RouterLink 
                                    :to="{ name: 'user.purchasing.plans.detail', params: { id: plan.id } }"
                                    class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                    title="Lihat Rincian Rencana"
                                >
                                    <Eye class="w-4 h-4" />
                                </RouterLink>

                                <!-- Activate (Only if Draft) -->
                                <button 
                                    v-if="plan.status === 'draft'"
                                    @click="handleActivate(plan)"
                                    class="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                                    title="Aktifkan Rencana Ini"
                                >
                                    <Play class="w-4 h-4" />
                                </button>

                                <!-- Cancel (If Draft or Active) -->
                                <button 
                                    v-if="['draft', 'active'].includes(plan.status)"
                                    @click="handleCancel(plan)"
                                    class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
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
    </div>
</template>


