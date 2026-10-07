<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import Pagination from '../../components/ui/Pagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import KpiCard from '../../components/ui/KpiCard.vue'
import TabNavigation from '../../components/ui/TabNavigation.vue'
import PaymentRequestDetailModal from '../../components/finance/PaymentRequestDetailModal.vue'
import PaymentDisbursementModal from '../../components/finance/PaymentDisbursementModal.vue'
import PaymentResubmitModal from '../../components/finance/PaymentResubmitModal.vue'

import { useDataTable } from '../../composables/useDataTable.js'
import { useFormatter } from '../../composables/useFormatter.js'
import { getPaymentRequests, getPaymentRequestDetail } from '../../services/financeServices.js'
import { searchAccountingAccounts } from '../../services/accountingAccountServices.js'
import {
    Landmark,
    CheckCircle2,
    Clock,
    FileText,
    Search,
    X,
    Eye,
    Receipt,
    RotateCcw,
    CreditCard,
    DollarSign
} from '@lucide/vue'

const { formatCurrency } = useFormatter()

// 1. Data Table Composable
const {
    items,
    isLoading,
    searchQuery,
    filters,
    pagination,
    counts,
    fetchData,
    handlePageChange,
    handlePerPageChange
} = useDataTable(
    (search, page, perPage, activeFilters) => {
        return getPaymentRequests(search, page, {
            ...activeFilters,
            per_page: perPage
        })
    },
    {
        initialFilters: {
            status: '',
            recipient_type: ''
        },
        initialPerPage: 10
    }
)

// 2. Accounts for Disbursement
const accountingAccounts = ref([])
const isLoadingAccounts = ref(false)

const fetchAccounts = async () => {
    isLoadingAccounts.value = true
    try {
        const res = await searchAccountingAccounts('', 1)
        const accs = res.data?.data || res.data || []
        const liquidAccounts = accs.filter(acc => {
            const nameLower = (acc.name || '').toLowerCase()
            return (nameLower.includes('kas') || nameLower.includes('bank')) && !nameLower.includes('utang') && !nameLower.includes('bunga')
        })
        accountingAccounts.value = liquidAccounts.length > 0 ? liquidAccounts : accs
    } catch (err) {
        console.error('Failed to load accounting accounts:', err)
        accountingAccounts.value = []
    } finally {
        isLoadingAccounts.value = false
    }
}

// 3. Modals State
const showDetailModal = ref(false)
const selectedPRQ = ref(null)
const isLoadingDetail = ref(false)

const showDisburseModal = ref(false)
const showResubmitModal = ref(false)

const openDetail = async (item) => {
    selectedPRQ.value = item
    showDetailModal.value = true
    isLoadingDetail.value = true
    try {
        const fullDetail = await getPaymentRequestDetail(item.id)
        selectedPRQ.value = fullDetail.data || fullDetail
    } catch (err) {
        console.warn('Failed to load full PRQ detail, using table row data:', err)
    } finally {
        isLoadingDetail.value = false
    }
}

const openDisburse = (item) => {
    selectedPRQ.value = item
    showDisburseModal.value = true
}

const openResubmit = (item) => {
    selectedPRQ.value = item
    showResubmitModal.value = true
}

// 4. Metrics & Tabs
const kpiMetrics = computed(() => {
    let pendingApproval = 0
    let readyToDisburse = 0
    let paidCount = 0
    let totalPaidAmount = 0

    items.value.forEach(item => {
        const st = item.status?.value || item.status
        const amt = parseFloat(item.amount) || 0
        if (st === 'pending_approval') pendingApproval++
        if (st === 'approved') readyToDisburse++
        if (st === 'paid') {
            paidCount++
            totalPaidAmount += amt
        }
    })

    return {
        pendingApproval: counts.value.pending_approval ?? pendingApproval,
        readyToDisburse: counts.value.approved ?? readyToDisburse,
        paidCount: counts.value.paid ?? paidCount,
        totalPaidAmount
    }
})

const statusTabs = computed(() => [
    { id: '', label: 'Semua', count: counts.value.all ?? pagination.value.total },
    { id: 'approved', label: 'Siap Dicairkan (Belum Bayar)', count: counts.value.approved ?? 0, color: 'emerald' },
    { id: 'paid', label: 'Telah Dibayar (Paid)', count: counts.value.paid ?? 0, color: 'blue' }
])

const getRecipientLabel = (type) => {
    switch (type) {
        case 'supplier': return 'Supplier Resmi'
        case 'marketplace_va': return 'Virtual Account'
        case 'employee_reimbursement': return 'Reimbursement Karyawan'
        default: return type || '-'
    }
}

onMounted(() => {
    fetchAccounts()
})
</script>

<template>
    <div class="space-y-6">
        <!-- Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Finance', icon: Landmark },
                { label: 'Permohonan Pembayaran' }
            ]" 
        />

        <!-- 1. Header & Segmented Sub-Navigation -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <Landmark class="w-5 h-5" />
                    </span>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
                            Permohonan Pembayaran (Payment Requests)
                        </h1>
                        <p class="text-sm text-slate-500 mt-0.5">
                            Kelola verifikasi tagihan rekanan, nomor rekening/Virtual Account tujuan, dan pencairan dana kas/bank.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Segmented Sub-Navigation -->
            <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto">
                <RouterLink
                    :to="{ name: 'user.finance.payment-requests' }"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 bg-white text-blue-600 shadow-xs border border-slate-200/60"
                >
                    <Receipt class="w-3.5 h-3.5" />
                    Permohonan Pembayaran
                </RouterLink>
                <RouterLink
                    :to="{ name: 'user.finance.payments' }"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 text-slate-600 hover:text-slate-900"
                >
                    <CreditCard class="w-3.5 h-3.5" />
                    Riwayat Kas Keluar
                </RouterLink>
            </div>
        </div>

        <!-- 2. KPI Metrics Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
                title="Total Permohonan"
                :value="counts.all ?? pagination.total"
                unit="Tagihan"
                :icon="FileText"
                variant="blue"
            />
            <KpiCard
                title="Siap Dicairkan Kasir"
                :value="kpiMetrics.readyToDisburse"
                unit="Tagihan"
                :icon="CheckCircle2"
                variant="emerald"
            />
            <KpiCard
                title="Telah Dibayar (Bulan Ini)"
                :value="kpiMetrics.paidCount"
                unit="Transaksi"
                :icon="Receipt"
                variant="blue"
            />
            <KpiCard
                title="Nominal Cair (Bulan Ini)"
                :value="formatCurrency(kpiMetrics.totalPaidAmount)"
                :icon="DollarSign"
                variant="slate"
            />
        </div>

        <!-- 3. Filter Bar & Segmented Tabs -->
        <div class="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-4">
            <!-- Search & Dropdown Filters -->
            <div class="flex flex-col sm:flex-row gap-3">
                <div class="relative flex-1">
                    <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Cari No. PRQ, nama penerima, no. rekening, atau catatan..."
                        class="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    />
                    <button
                        v-if="searchQuery"
                        type="button"
                        @click="searchQuery = ''"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>

                <div class="sm:w-56">
                    <select
                        v-model="filters.recipient_type"
                        class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    >
                        <option value="">Semua Tipe Penerima</option>
                        <option value="supplier">Supplier Resmi</option>
                        <option value="marketplace_va">Virtual Account / Marketplace</option>
                        <option value="employee_reimbursement">Reimbursement Karyawan</option>
                    </select>
                </div>
            </div>

            <!-- Status Tabs -->
            <div class="pt-2 border-t border-slate-100">
                <TabNavigation
                    v-model="filters.status"
                    :tabs="statusTabs"
                    variant="pill"
                />
            </div>
        </div>

        <!-- 4. Data Table -->
        <div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold text-xs tracking-wider uppercase">
                            <th class="py-3 px-4 w-12 text-center">No</th>
                            <th class="py-3 px-4 min-w-[170px]">No. PRQ & Tanggal</th>
                            <th class="py-3 px-4 min-w-[150px]">Dokumen Asal</th>
                            <th class="py-3 px-4 min-w-[200px]">Penerima Dana</th>
                            <th class="py-3 px-4 min-w-[180px]">Rekening Tujuan</th>
                            <th class="py-3 px-4 text-right min-w-[130px]">Total Tagihan</th>
                            <th class="py-3 px-4 text-center min-w-[140px]">Status</th>
                            <th class="py-3 px-4 text-right min-w-[120px]">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-xs">
                        <tr v-if="isLoading" class="bg-white">
                            <td colspan="8" class="py-12 text-center text-slate-400">
                                <div class="flex flex-col items-center justify-center gap-2">
                                    <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Memuat data permohonan pembayaran...</span>
                                </div>
                            </td>
                        </tr>

                        <tr v-else-if="items.length === 0" class="bg-white">
                            <td colspan="8" class="py-12 text-center text-slate-400">
                                <Receipt class="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                <p class="text-sm font-medium text-slate-600">Tidak ada permohonan pembayaran yang ditemukan</p>
                                <p class="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter status Anda.</p>
                            </td>
                        </tr>

                        <tr
                            v-else
                            v-for="(item, index) in items"
                            :key="item.id"
                            class="hover:bg-slate-50/70 transition-colors"
                        >
                            <!-- No -->
                            <td class="py-3.5 px-4 text-center font-medium text-slate-400">
                                {{ ((pagination.current_page - 1) * pagination.per_page) + index + 1 }}
                            </td>

                            <!-- No PRQ & Tanggal -->
                            <td class="py-3.5 px-4">
                                <div class="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{{ item.prq_number }}</span>
                                </div>
                                <div class="text-[11px] text-slate-500 mt-0.5">
                                    {{ item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' }}
                                </div>
                            </td>

                            <!-- Dokumen Asal -->
                            <td class="py-3.5 px-4">
                                <div v-if="item.direct_purchase" class="space-y-0.5">
                                    <span class="font-mono font-semibold text-blue-600 block">
                                        {{ item.direct_purchase.dp_number }}
                                    </span>
                                    <span class="text-[10px] text-slate-400">Direct Purchase</span>
                                </div>
                                <span v-else class="text-slate-400 font-mono text-[11px]">-</span>
                            </td>

                            <!-- Penerima Dana -->
                            <td class="py-3.5 px-4">
                                <div class="font-medium text-slate-800">
                                    {{ item.recipient_name || '-' }}
                                </div>
                                <span class="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] border border-slate-200/60">
                                    {{ getRecipientLabel(item.recipient_type) }}
                                </span>
                            </td>

                            <!-- Rekening Tujuan -->
                            <td class="py-3.5 px-4">
                                <div class="text-slate-800 font-medium">
                                    {{ item.bank_name || '-' }}
                                </div>
                                <div class="font-mono text-[11px] text-slate-500">
                                    {{ item.bank_account_number || '-' }}
                                </div>
                                <div class="text-[10px] text-slate-400 truncate max-w-[160px]">
                                    a.n. {{ item.bank_account_holder || '-' }}
                                </div>
                            </td>

                            <!-- Total Tagihan -->
                            <td class="py-3.5 px-4 text-right">
                                <span class="font-mono font-bold text-slate-900 block">
                                    {{ formatCurrency(item.amount, item.currency) }}
                                </span>
                                <span v-if="item.currency && item.currency !== 'IDR' && item.exchange_rate" class="block text-[10px] text-blue-600 font-mono">
                                    ≈ {{ formatCurrency((Number(item.amount) || 0) * (Number(item.exchange_rate) || 1), 'IDR') }}
                                </span>
                            </td>

                            <!-- Status -->
                            <td class="py-3.5 px-4 text-center">
                                <StatusBadge :status="item.status" size="sm" />
                            </td>

                            <!-- Aksi -->
                            <td class="py-3.5 px-4 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                    <!-- Detail / Review -->
                                    <button
                                        type="button"
                                        @click="openDetail(item)"
                                        class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                        title="Lihat Detail & Workflow"
                                    >
                                        <Eye class="w-4 h-4" />
                                    </button>

                                    <!-- Cairkan Dana (Khusus status approved) -->
                                    <button
                                        v-if="(item.status?.value || item.status) === 'approved'"
                                        type="button"
                                        @click="openDisburse(item)"
                                        class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                        title="Cairkan Dana Kasir"
                                    >
                                        <CreditCard class="w-3.5 h-3.5" />
                                        Cairkan
                                    </button>

                                    <!-- Ajukan Ulang (Khusus status revision_requested) -->
                                    <button
                                        v-if="(item.status?.value || item.status) === 'revision_requested'"
                                        type="button"
                                        @click="openResubmit(item)"
                                        class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                        title="Perbaiki & Ajukan Ulang"
                                    >
                                        <RotateCcw class="w-3.5 h-3.5" />
                                        Ajukan Ulang
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="p-4 border-t border-slate-100 flex items-center justify-between">
                <Pagination
                    :pagination="pagination"
                    @page-change="handlePageChange"
                />
            </div>
        </div>

        <!-- 5. Detail Modal Component -->
        <PaymentRequestDetailModal
            v-model="showDetailModal"
            :item="selectedPRQ"
            :is-loading="isLoadingDetail"
            @disburse="openDisburse"
        />

        <!-- 6. Disburse Modal Component -->
        <PaymentDisbursementModal
            v-model="showDisburseModal"
            :item="selectedPRQ"
            :accounts="accountingAccounts"
            @saved="fetchData(pagination.current_page)"
        />

        <!-- 7. Resubmit Modal Component -->
        <PaymentResubmitModal
            v-model="showResubmitModal"
            :item="selectedPRQ"
            @saved="fetchData(pagination.current_page)"
        />
    </div>
</template>
