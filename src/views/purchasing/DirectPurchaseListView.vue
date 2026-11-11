<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import {
    getDirectPurchases,
    submitDirectPurchaseForPayment,
    cancelDirectPurchase
} from '../../services/directPurchaseServices.js'
import { getProcurementPlans } from '../../services/procurementPlanServices.js'
import { showLoading, showSuccess, showError, showConfirm, showPrompt } from '../../utils/swal.js'
import { formatCurrency } from '../../utils/stringUtils.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import Pagination from '../../components/ui/Pagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

import {
    ShoppingCart,
    RefreshCw,
    Calendar,
    Clock,
    CheckCircle2,
    Eye,
    Ban,
    Store,
    Building2,
    Layers,
    FileText,
    DollarSign,
    CreditCard,
    Pencil,
    Search,
    ArrowUpRight
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

// Primary Tab Navigation ('queue' for Rencana Siap Eksekusi, 'history' for Riwayat Transaksi)
const activeMainTab = ref(route.query.tab || 'queue')

// ==========================================
// STATE TAB 1: RENCANA SIAP EKSEKUSI (QUEUE)
// ==========================================
const queuePlans = ref([])
const isLoadingQueue = ref(false)
const queueSearch = ref('')
const onlyWithQuota = ref(true)

const queueColumns = [
    { key: 'no', label: 'No', width: '70px', align: 'center', class: 'text-center' },
    { key: 'pp_number', label: 'No. Rencana & Tanggal', minWidth: '200px' },
    { key: 'pr_info', label: 'Dokumen PR Asal', minWidth: '220px' },
    { key: 'company_division', label: 'Perusahaan & Divisi', minWidth: '220px' },
    { key: 'quota', label: 'Alokasi & Sisa Kuota', minWidth: '180px', align: 'center', class: 'text-center' },
    { key: 'status', label: 'Status', minWidth: '130px', align: 'center', class: 'text-center' },
    { key: 'actions', label: 'Aksi', minWidth: '160px', align: 'center', class: 'text-center' }
]

const fetchQueuePlans = async () => {
    try {
        isLoadingQueue.value = true
        const response = await getProcurementPlans({
            status: 'active',
            procurement_method: 'direct_purchase',
            per_page: 50
        }, 1, 50)
        queuePlans.value = response.data || []
    } catch (error) {
        showError('Gagal Memuat Antrean!', 'Terjadi kesalahan saat memuat daftar rencana pengadaan siap eksekusi.', error)
    } finally {
        isLoadingQueue.value = false
    }
}

const hasRemainingQuota = (plan) => {
    return plan.has_remaining_quota !== false
}

const getRemainingQuotaCount = (plan) => {
    if (plan.unallocated_items_count !== undefined && plan.unallocated_items_count !== null) {
        return plan.unallocated_items_count
    }
    return plan.items?.length || 0
}

const filteredQueuePlans = computed(() => {
    let list = queuePlans.value || []
    
    if (onlyWithQuota.value) {
        list = list.filter(p => hasRemainingQuota(p))
    }
    
    if (queueSearch.value.trim()) {
        const q = queueSearch.value.toLowerCase().trim()
        list = list.filter(p => {
            const ppNum = (p.pp_number || '').toLowerCase()
            const prNum = (p.purchase_requisition?.pr_number || '').toLowerCase()
            const comp = (p.company?.name || p.purchase_requisition?.company?.name || '').toLowerCase()
            const div = (p.purchase_requisition?.division?.name || '').toLowerCase()
            const req = (p.purchase_requisition?.requester?.name || '').toLowerCase()
            return ppNum.includes(q) || prNum.includes(q) || comp.includes(q) || div.includes(q) || req.includes(q)
        })
    }
    
    return list
})

const handleExecutePurchase = (plan) => {
    router.push({
        name: 'user.purchasing.direct.create',
        query: { plan_id: plan.id }
    })
}

// ==========================================
// STATE TAB 2: RIWAYAT TRANSAKSI DIRECT PURCHASE
// ==========================================
const directPurchases = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const channelFilter = ref('')
let searchTimeout = null

const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 10
})

const stats = computed(() => {
    const list = directPurchases.value || []
    const readyPlans = queuePlans.value.filter(p => hasRemainingQuota(p))
    return {
        readyToExecute: readyPlans.length,
        total: pagination.value.total || list.length,
        draft: list.filter(dp => dp.status === 'draft').length,
        readyForPayment: list.filter(dp => dp.status === 'ready_for_payment').length,
        completed: list.filter(dp => dp.status === 'completed').length,
        totalGrandAmount: list.reduce((sum, dp) => sum + ((Number(dp.grand_total) || 0) * (Number(dp.exchange_rate) || 1)), 0)
    }
})

// Table Columns for Tab 2 (Direct Purchase Transaction History) - Standardized layout
const tableColumns = [
    { key: 'no', label: 'No', width: '70px', align: 'center', class: 'text-center' },
    { key: 'dp_number', label: 'No. Pembelian & Tanggal', minWidth: '200px' },
    { key: 'plan', label: 'Rencana Pengadaan (PP / PR)', minWidth: '220px' },
    { key: 'channel', label: 'Saluran & Rekanan', minWidth: '220px' },
    { key: 'items', label: 'Item Dibeli', minWidth: '120px', align: 'center', class: 'text-center' },
    { key: 'grand_total', label: 'Total Biaya', minWidth: '180px', align: 'right', class: 'text-right' },
    { key: 'status', label: 'Status', minWidth: '140px', align: 'center', class: 'text-center' },
    { key: 'actions', label: 'Aksi', minWidth: '140px', align: 'center', class: 'text-center' }
]

// Fetch Executed Direct Purchases
const fetchDirectPurchases = async (search = '', page = 1) => {
    try {
        isLoading.value = true
        const filters = {
            per_page: pagination.value.per_page
        }
        if (statusFilter.value) filters.status = statusFilter.value
        if (channelFilter.value) filters.purchase_channel = channelFilter.value

        const response = await getDirectPurchases(search, page, filters)
        
        directPurchases.value = response.data || []
        
        if (response.meta) {
            pagination.value = {
                current_page: response.meta.current_page || 1,
                last_page: response.meta.last_page || 1,
                from: response.meta.from || 0,
                to: response.meta.to || 0,
                total: response.meta.total || 0,
                per_page: response.meta.per_page || 10
            }
        }
    } catch (error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan saat memuat daftar Direct Purchase.', error)
    } finally {
        isLoading.value = false
    }
}

// Watchers
watch(searchQuery, (newVal) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchDirectPurchases(newVal, 1)
    }, 400)
})

watch([statusFilter, channelFilter], () => {
    fetchDirectPurchases(searchQuery.value, 1)
})

watch(activeMainTab, (newTab) => {
    router.replace({ query: { ...route.query, tab: newTab } })
    if (newTab === 'queue' && queuePlans.value.length === 0) {
        fetchQueuePlans()
    } else if (newTab === 'history' && directPurchases.value.length === 0) {
        fetchDirectPurchases()
    }
})

const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.value.last_page) {
        fetchDirectPurchases(searchQuery.value, newPage)
    }
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

const getChannelInfo = (dp) => {
    switch (dp.purchase_channel) {
        case 'marketplace':
            return {
                label: dp.marketplace_name || 'Marketplace',
                merchant: dp.merchant_name || 'Toko Online',
                badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/90',
                icon: Store
            }
        case 'direct_supplier':
            return {
                label: 'Supplier Resmi',
                merchant: dp.supplier?.name || 'Rekanan Terdaftar',
                badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/90',
                icon: Building2
            }
        case 'retail_store':
            return {
                label: 'Toko Retail',
                merchant: dp.merchant_name || 'Toko Fisik',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
                icon: Store
            }
        default:
            return {
                label: dp.purchase_channel || 'Lainnya',
                merchant: dp.merchant_name || '-',
                badgeClass: 'bg-slate-50 text-slate-700 border-slate-200/90',
                icon: Store
            }
    }
}

// Action Handlers
const handleSubmitForPayment = async (dp) => {
    const confirmed = await showConfirm(
        'Ajukan Pembayaran?',
        `Direct Purchase ${dp.dp_number} senilai ${formatCurrency(dp.grand_total, dp.currency)} akan diajukan ke bagian keuangan untuk proses pembayaran.`,
        'Ya, Ajukan Pembayaran',
        'Batal',
        '#2563eb'
    )
    if (!confirmed) return

    try {
        showLoading('Mengajukan pembayaran...')
        await submitDirectPurchaseForPayment(dp.id)
        showSuccess('Berhasil!', `Direct Purchase ${dp.dp_number} berhasil diajukan untuk pembayaran.`)
        fetchDirectPurchases(searchQuery.value, pagination.value.current_page)
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal mengajukan pembayaran.'
        showError('Gagal!', errorMsg, error)
    }
}

const handleCancel = async (dp) => {
    const { value: reason, isConfirmed } = await showPrompt({
        title: 'Batalkan Pembelian Langsung?',
        text: `Masukkan alasan pembatalan untuk ${dp.dp_number}:`,
        placeholder: 'Tuliskan alasan pembatalan pembelian ini...',
        confirmText: 'Ya, Batalkan Pembelian',
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
        showLoading('Membatalkan pembelian...')
        await cancelDirectPurchase(dp.id, reason)
        showSuccess('Berhasil!', `Direct Purchase ${dp.dp_number} telah dibatalkan.`)
        fetchDirectPurchases(searchQuery.value, pagination.value.current_page)
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Gagal membatalkan transaksi.'
        showError('Gagal!', errorMsg, error)
    }
}

onMounted(() => {
    fetchQueuePlans()
    fetchDirectPurchases()
})
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <PageHeader 
            title="Direct Purchases (Pembelian Langsung)" 
            description="Realisasi transaksi pengadaan barang langsung melalui Marketplace online, Toko Retail, atau Supplier resmi tanpa tender."
            :breadcrumbs="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Direct Purchases' }
            ]"
        >
            <template #actions>
                <RouterLink :to="{ name: 'user.purchasing.plans' }">
                    <BaseButton variant="secondary">
                        <Layers class="w-4 h-4" />
                        <span>Lihat Rencana Pengadaan</span>
                    </BaseButton>
                </RouterLink>
            </template>
        </PageHeader>

        <!-- KPI Metrics (Harmonized PR Style) -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <ShoppingCart class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Siap Dieksekusi</p>
                    <div class="flex items-baseline gap-2 mt-1">
                        <h4 class="text-2xl font-bold font-mono text-slate-900">{{ stats.readyToExecute }}</h4>
                        <span class="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Rencana Aktif</span>
                    </div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                    <FileText class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transaksi</p>
                    <div class="flex items-baseline gap-2 mt-1">
                        <h4 class="text-2xl font-bold font-mono text-slate-900">{{ stats.total }}</h4>
                        <span class="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-full">Transaksi DP</span>
                    </div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                    <Clock class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Draft Pembelian</p>
                    <div class="flex items-baseline gap-2 mt-1">
                        <h4 class="text-2xl font-bold font-mono text-slate-900">{{ stats.draft }}</h4>
                        <span class="text-xs text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">Belum Diajukan</span>
                    </div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <DollarSign class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Realisasi</p>
                    <div class="flex items-baseline gap-2 mt-1">
                        <h4 class="text-lg font-bold font-mono text-emerald-700 truncate" :title="formatCurrency(stats.totalGrandAmount)">
                            {{ formatCurrency(stats.totalGrandAmount) }}
                        </h4>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Tab Switcher -->
        <div class="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 w-fit">
            <button
                type="button"
                @click="activeMainTab = 'queue'"
                class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="activeMainTab === 'queue'
                    ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
            >
                <ShoppingCart class="w-4 h-4" />
                <span>Rencana Siap Eksekusi</span>
                <span 
                    class="px-1.5 py-0.2 rounded-md text-[10px] font-black"
                    :class="activeMainTab === 'queue' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'"
                >
                    {{ queuePlans.filter(p => hasRemainingQuota(p)).length }}
                </span>
            </button>

            <button
                type="button"
                @click="activeMainTab = 'history'"
                class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="activeMainTab === 'history'
                    ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
            >
                <FileText class="w-4 h-4" />
                <span>Riwayat Transaksi Direct Purchase</span>
                <span 
                    v-if="pagination.total > 0"
                    class="px-1.5 py-0.2 rounded-md text-[10px] font-black"
                    :class="activeMainTab === 'history' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'"
                >
                    {{ pagination.total }}
                </span>
            </button>
        </div>

        <!-- ================= TAB 1: RENCANA SIAP EKSEKUSI ================= -->
        <div v-if="activeMainTab === 'queue'" class="space-y-6">
            <!-- Operational Workbench Header -->
            <div class="p-5 bg-gradient-to-r from-blue-50/50 via-slate-50/30 to-white rounded-2xl border border-blue-100/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-start gap-3.5">
                    <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-200">
                        <ShoppingCart class="w-5 h-5" />
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="text-sm font-bold text-slate-900">Antrean Rencana Siap Eksekusi (Direct Purchase)</h3>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                                Realisasi Belanja
                            </span>
                        </div>
                        <p class="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-2xl">
                            Daftar dokumen rencana pengadaan (PP) direct purchase berstatus <strong>Aktif</strong> yang memiliki kuota barang belum dibeli. Klik tombol <strong>"Eksekusi Pembelian"</strong> pada baris rencana untuk langsung membuka formulir transaksi dengan data item terisi otomatis.
                        </p>
                    </div>
                </div>

                <div class="shrink-0 flex items-center gap-2 self-start md:self-auto">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-blue-700 border border-blue-200 shadow-2xs">
                        <CheckCircle2 class="w-3.5 h-3.5 text-blue-600" />
                        <span>{{ queuePlans.filter(p => hasRemainingQuota(p)).length }} Dokumen Siap Beli</span>
                    </span>
                </div>
            </div>

            <!-- Toolbar & Search -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100">
                    <div class="relative flex-1 max-w-md w-full">
                        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            v-model="queueSearch"
                            type="text"
                            placeholder="Cari nomor PP, nomor PR, divisi, atau perusahaan..."
                            class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div class="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                        <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                v-model="onlyWithQuota" 
                                class="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 h-4 w-4 cursor-pointer"
                            />
                            <span>Hanya Kuota Tersedia</span>
                        </label>

                        <button 
                            type="button"
                            @click="fetchQueuePlans"
                            :disabled="isLoadingQueue"
                            class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                            title="Segarkan Antrean"
                        >
                            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingQueue }" />
                        </button>
                    </div>
                </div>

                <!-- Table of Queue Plans -->
                <BaseTable :columns="queueColumns">
                    <!-- Loading State -->
                    <tr v-if="isLoadingQueue">
                        <td colspan="7" class="px-6 py-14 text-center text-sm text-slate-500">
                            <div class="inline-flex items-center gap-2 font-medium">
                                <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                                Memuat rencana pengadaan siap eksekusi...
                            </div>
                        </td>
                    </tr>

                    <!-- Empty State -->
                    <tr v-else-if="filteredQueuePlans.length === 0">
                        <td colspan="7" class="px-6 py-14 text-center">
                            <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2.5">
                                <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                    <ShoppingCart class="w-6 h-6 text-slate-400" />
                                </div>
                                <div class="text-sm font-semibold text-slate-700">
                                    {{ queueSearch ? 'Tidak ada rencana yang cocok dengan pencarian' : 'Tidak Ada Rencana Pengadaan Siap Eksekusi' }}
                                </div>
                                <p class="text-xs text-slate-500 text-center leading-relaxed">
                                    {{ queueSearch ? 'Coba ubah kata kunci pencarian Anda.' : 'Seluruh rencana pengadaan Direct Purchase telah selesai dieksekusi atau belum ada rencana berstatus Aktif.' }}
                                </p>
                                <RouterLink 
                                    :to="{ name: 'user.purchasing.plans' }"
                                    class="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors mt-2"
                                >
                                    <Layers class="w-3.5 h-3.5" />
                                    <span>Lihat Rencana Pengadaan</span>
                                </RouterLink>
                            </div>
                        </td>
                    </tr>

                    <!-- Data Rows -->
                    <tr 
                        v-else 
                        v-for="(plan, index) in filteredQueuePlans" 
                        :key="plan.id"
                        class="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-b-0"
                    >
                        <!-- No -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-sm font-mono font-semibold text-slate-500 text-center">
                            {{ index + 1 }}
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
                            <div v-if="plan.is_consolidated || (plan.source_prs_count && plan.source_prs_count > 1)">
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                    <Layers class="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{{ plan.source_prs_count || plan.pr_numbers?.length || 2 }} PR Terkonsolidasi</span>
                                </span>
                                <div class="text-xs text-slate-500 font-medium mt-1 truncate max-w-[200px]">
                                    {{ plan.pr_numbers?.join(', ') || 'Multi-PR' }}
                                </div>
                            </div>
                            <div v-else>
                                <div class="text-sm font-mono font-bold text-slate-900 flex items-center gap-2">
                                    <FileText class="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>{{ plan.purchase_requisition?.pr_number || plan.pr_numbers?.[0] || '-' }}</span>
                                </div>
                                <div class="text-xs text-slate-500 font-medium mt-1 truncate max-w-[200px]" :title="plan.purchase_requisition?.purpose">
                                    <span>{{ plan.purchase_requisition?.purpose || 'Pembelian Langsung' }}</span>
                                </div>
                            </div>
                        </td>

                        <!-- Perusahaan & Divisi (Max 2 lines) -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <div class="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Building2 class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ plan.company?.name || plan.purchase_requisition?.company?.name || 'Perusahaan' }}</span>
                            </div>
                            <div class="text-xs font-medium text-slate-600 mt-1 flex items-center gap-2">
                                <Layers class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ plan.purchase_requisition?.division?.name || 'Divisi Pemohon' }}</span>
                            </div>
                        </td>

                        <!-- Alokasi Item & Sisa Kuota (Max 2 lines, center) -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="inline-flex flex-col items-center justify-center">
                                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                    {{ plan.items?.length || 0 }} Item Alokasi
                                </span>
                                <span 
                                    class="text-xs font-bold mt-1 font-mono"
                                    :class="hasRemainingQuota(plan) ? 'text-emerald-700' : 'text-slate-400'"
                                >
                                    {{ hasRemainingQuota(plan) ? `Sisa Kuota: ${getRemainingQuotaCount(plan)} Item` : 'Kuota Habis' }}
                                </span>
                            </div>
                        </td>

                        <!-- Status -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="inline-flex items-center justify-center">
                                <StatusBadge :status="plan.status" size="md" class="min-w-[110px]" />
                            </div>
                        </td>

                        <!-- Aksi -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button
                                    v-if="hasRemainingQuota(plan)"
                                    type="button"
                                    @click="handleExecutePurchase(plan)"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                                    title="Buat transaksi Direct Purchase untuk rencana ini"
                                >
                                    <ShoppingCart class="w-3.5 h-3.5" />
                                    <span>Eksekusi Pembelian</span>
                                </button>
                                <span 
                                    v-else
                                    class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-400 border border-slate-200"
                                >
                                    Selesai Dibeli
                                </span>
                            </div>
                        </td>
                    </tr>
                </BaseTable>
            </div>
        </div>

        <!-- ================= TAB 2: RIWAYAT TRANSAKSI DIRECT PURCHASE ================= -->
        <div v-else class="space-y-6">
            <!-- Table & Filter Card -->
            <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <!-- Filter Bar -->
                <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div class="relative flex-1 max-w-md w-full">
                        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input 
                            v-model="searchQuery" 
                            type="text"
                            placeholder="Cari nomor DP, nama toko, catatan..." 
                            class="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div class="flex items-center gap-3 flex-wrap self-end md:self-auto">
                        <!-- Channel Filter -->
                        <select 
                            v-model="channelFilter" 
                            class="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs transition-colors shrink-0"
                        >
                            <option value="">Semua Saluran</option>
                            <option value="marketplace">Marketplace Online</option>
                            <option value="direct_supplier">Supplier Resmi</option>
                            <option value="retail_store">Toko Retail</option>
                        </select>

                        <!-- Status Filter -->
                        <select 
                            v-model="statusFilter" 
                            class="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs transition-colors shrink-0"
                        >
                            <option value="">Semua Status</option>
                            <option value="draft">Draft</option>
                            <option value="ready_for_payment">Siap Dibayar</option>
                            <option value="paid">Telah Dibayar</option>
                            <option value="partially_received">Diterima Sebagian</option>
                            <option value="completed">Selesai</option>
                            <option value="cancelled">Dibatalkan</option>
                        </select>

                        <!-- Refresh Button -->
                        <button 
                            type="button"
                            @click="fetchDirectPurchases(searchQuery, pagination.current_page)"
                            :disabled="isLoading"
                            class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
                            title="Segarkan Data"
                        >
                            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
                        </button>
                    </div>
                </div>

                <!-- Table -->
                <BaseTable :columns="tableColumns">
                    <!-- Loading State -->
                    <tr v-if="isLoading">
                        <td colspan="8" class="px-6 py-14 text-center text-sm text-slate-500">
                            <div class="inline-flex items-center gap-2 font-medium">
                                <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                                Memuat daftar transaksi Direct Purchase...
                            </div>
                        </td>
                    </tr>

                    <!-- Empty State -->
                    <tr v-else-if="directPurchases.length === 0">
                        <td colspan="8" class="px-6 py-14 text-center text-slate-500">
                            <div class="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2.5">
                                <div class="p-3 bg-slate-100 rounded-xl border border-slate-200/80">
                                    <ShoppingCart class="w-6 h-6 text-slate-400" />
                                </div>
                                <h4 class="text-sm font-bold text-slate-900 mb-1">Belum Ada Transaksi Direct Purchase</h4>
                                <p class="text-xs text-slate-500 leading-relaxed mb-3 text-center">
                                    Pilih rencana pengadaan pada tab "Rencana Siap Eksekusi" untuk mulai membuat transaksi pembelian.
                                </p>
                                <button
                                    type="button"
                                    @click="activeMainTab = 'queue'"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer"
                                >
                                    <ShoppingCart class="w-3.5 h-3.5" />
                                    <span>Buka Antrean Rencana</span>
                                </button>
                            </div>
                        </td>
                    </tr>

                    <!-- Data Rows -->
                    <tr 
                        v-else 
                        v-for="(dp, index) in directPurchases" 
                        :key="dp.id"
                        class="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-b-0"
                    >
                        <!-- 1. No -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-sm font-mono font-semibold text-slate-500 text-center">
                            {{ (pagination.current_page - 1) * pagination.per_page + index + 1 }}
                        </td>

                        <!-- 2. No. Pembelian & Tanggal (Max 2 lines) -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <RouterLink 
                                :to="{ name: 'user.purchasing.direct.detail', params: { id: dp.id } }"
                                class="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors group/link text-left"
                                title="Lihat rincian transaksi pembelian"
                            >
                                <span class="group-hover/link:underline">{{ dp.dp_number }}</span>
                                <ArrowUpRight class="w-4 h-4 text-slate-400 group-hover/link:text-blue-600 opacity-0 group-hover/link:opacity-100 transition-all shrink-0" />
                            </RouterLink>
                            <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                                <Calendar class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ formatDate(dp.created_at) }}</span>
                            </div>
                        </td>

                        <!-- 3. Rencana Pengadaan (PP / PR) (Max 2 lines) -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <div class="text-sm font-mono font-bold text-slate-900 flex items-center gap-2">
                                <Layers class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ dp.procurement_plan?.pp_number || 'Plan #' + dp.procurement_plan_id }}</span>
                            </div>
                            <div class="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                                <FileText class="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{{ dp.procurement_plan?.purchase_requisition?.pr_number || 'PR Asal' }}</span>
                            </div>
                        </td>

                        <!-- 4. Saluran & Rekanan (Max 2 lines) -->
                        <td class="px-6 py-4.5 whitespace-nowrap">
                            <div class="flex items-center gap-1.5">
                                <span 
                                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border"
                                    :class="getChannelInfo(dp).badgeClass"
                                >
                                    <component :is="getChannelInfo(dp).icon" class="w-3 h-3" />
                                    {{ getChannelInfo(dp).label }}
                                </span>
                            </div>
                            <div class="text-xs font-semibold text-slate-800 mt-1 truncate max-w-[200px]" :title="getChannelInfo(dp).merchant">
                                {{ getChannelInfo(dp).merchant }}
                            </div>
                        </td>

                        <!-- 5. Item Dibeli (Center) -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                                {{ dp.items?.length || 0 }} Item
                            </span>
                        </td>

                        <!-- 6. Total Biaya (Rp) (Right) -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-right">
                            <div class="text-sm font-bold text-slate-900 font-mono">
                                {{ formatCurrency(dp.grand_total, dp.currency) }}
                            </div>
                            <div v-if="dp.currency && dp.currency !== 'IDR'" class="text-[11px] text-blue-600 font-mono mt-0.5">
                                ≈ {{ formatCurrency((Number(dp.grand_total) || 0) * (Number(dp.exchange_rate) || 1), 'IDR') }}
                            </div>
                        </td>

                        <!-- 7. Status (Center) -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="inline-flex items-center justify-center">
                                <StatusBadge :status="dp.status" size="md" class="min-w-[125px]" />
                            </div>
                        </td>

                        <!-- 8. Aksi (Center) -->
                        <td class="px-6 py-4.5 whitespace-nowrap text-center">
                            <div class="flex items-center justify-center gap-1.5">
                                <!-- View Detail -->
                                <RouterLink 
                                    :to="{ name: 'user.purchasing.direct.detail', params: { id: dp.id } }"
                                    class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                    title="Lihat Detail Transaksi"
                                >
                                    <Eye class="w-4 h-4" />
                                </RouterLink>

                                <!-- Edit (If Draft) -->
                                <RouterLink 
                                    v-if="dp.status === 'draft'"
                                    :to="{ name: 'user.purchasing.direct.edit', params: { id: dp.id } }"
                                    class="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                                    title="Edit Transaksi Draft"
                                >
                                    <Pencil class="w-4 h-4" />
                                </RouterLink>

                                <!-- Submit for Payment (If Draft) -->
                                <button 
                                    v-if="dp.status === 'draft'"
                                    @click="handleSubmitForPayment(dp)"
                                    class="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                                    title="Ajukan Pembayaran"
                                >
                                    <CreditCard class="w-4 h-4" />
                                </button>

                                <!-- Cancel (If Draft or Ready for Payment) -->
                                <button 
                                    v-if="['draft', 'ready_for_payment'].includes(dp.status)"
                                    @click="handleCancel(dp)"
                                    class="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                                    title="Batalkan Transaksi"
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
