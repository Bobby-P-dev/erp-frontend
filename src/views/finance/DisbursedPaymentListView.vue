<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Pagination from '../../components/ui/Pagination.vue'
import {
    getDisbursedPayments,
    getDisbursedPaymentDetail
} from '../../services/financeServices.js'
import { getAccountingAccounts } from '../../services/accountingAccountServices.js'
import { formatCurrency } from '../../utils/stringUtils.js'
import {
    CreditCard,
    Receipt,
    Search,
    X,
    Building2,
    Calendar,
    CheckCircle2,
    DollarSign,
    UserCheck,
    Eye,
    Landmark,
    FileText,
    ArrowDownRight,
    Paperclip,
    ExternalLink,
    FileCheck
} from '@lucide/vue'

// State
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

// Search & Filters
const searchQuery = ref('')
const selectedAccountId = ref('')
const selectedDate = ref('')
const accountingAccounts = ref([])

// Detail Modal
const showDetailModal = ref(false)
const selectedPayment = ref(null)

// KPI Calculations
const kpiMetrics = computed(() => {
    let totalTransactions = items.value.length
    let totalAmount = 0
    let totalFees = 0

    items.value.forEach(item => {
        totalAmount += parseFloat(item.amount_paid) || 0
        totalFees += parseFloat(item.bank_fee) || 0
    })

    const avgAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0

    return {
        totalTransactions,
        totalAmount,
        totalFees,
        avgAmount
    }
})

// Fetch Data
const fetchData = async (page = 1) => {
    isLoading.value = true
    try {
        const filters = {}
        if (selectedAccountId.value) filters.source_account_id = selectedAccountId.value
        if (selectedDate.value) filters.payment_date = selectedDate.value

        const response = await getDisbursedPayments(searchQuery.value, page, filters)
        const rawItems = response.data || response || []
        items.value = Array.isArray(rawItems) ? rawItems : []

        if (response.meta) {
            pagination.value = {
                current_page: response.meta.current_page || 1,
                last_page: response.meta.last_page || 1,
                from: response.meta.from || (items.value.length > 0 ? 1 : 0),
                to: response.meta.to || items.value.length,
                total: response.meta.total ?? items.value.length,
                per_page: response.meta.per_page || 10
            }
        } else {
            pagination.value = {
                current_page: page,
                last_page: 1,
                from: items.value.length > 0 ? 1 : 0,
                to: items.value.length,
                total: items.value.length,
                per_page: 10
            }
        }
    } catch (err) {
        console.error('Failed to load disbursed payments:', err)
        items.value = []
    } finally {
        isLoading.value = false
    }
}

// Fetch accounting accounts for filter dropdown
const fetchAccounts = async () => {
    try {
        const res = await getAccountingAccounts('', 1, { is_active: 1 })
        accountingAccounts.value = res.data?.data || res.data || []
    } catch (err) {
        console.error('Failed to load accounts for filter:', err)
    }
}

// Open Detail Modal
const openDetail = (item) => {
    selectedPayment.value = item
    showDetailModal.value = true
}

// Debounce search
let searchTimeout = null
watch(searchQuery, () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchData(1)
    }, 400)
})

watch([selectedAccountId, selectedDate], () => {
    fetchData(1)
})

onMounted(() => {
    fetchData()
    fetchAccounts()
})
</script>

<template>
    <div class="space-y-6">
        <!-- Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Finance', to: { name: 'user.finance.payment-requests' }, icon: CreditCard },
                { label: 'Riwayat Kas Keluar' }
            ]" 
        />

        <!-- 1. Header & Segmented Sub-Navigation -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <CreditCard class="w-5 h-5" />
                    </span>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
                            Riwayat Kas Keluar (Disbursed Payments)
                        </h1>
                        <p class="text-sm text-slate-500 mt-0.5">
                            Audit trail dan rekapitulasi realisasi pencairan dana kas/bank oleh kasir keuangan.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Segmented Sub-Navigation -->
            <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto">
                <RouterLink
                    :to="{ name: 'user.finance.payment-requests' }"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 text-slate-600 hover:text-slate-900"
                >
                    <Receipt class="w-3.5 h-3.5" />
                    Permohonan Pembayaran
                </RouterLink>
                <RouterLink
                    :to="{ name: 'user.finance.payments' }"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 bg-white text-blue-600 shadow-xs border border-slate-200/60"
                >
                    <CreditCard class="w-3.5 h-3.5" />
                    Riwayat Kas Keluar
                </RouterLink>
            </div>
        </div>

        <!-- 2. KPI Metrics Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-2xs flex items-center gap-4">
                <div class="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                    <Receipt class="w-5 h-5" />
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500">Total Transaksi Selesai</p>
                    <p class="text-xl font-bold text-slate-900 mt-0.5">{{ kpiMetrics.totalTransactions }} <span class="text-xs font-normal text-slate-400">Pencairan</span></p>
                </div>
            </div>

            <div class="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-2xs flex items-center gap-4">
                <div class="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                    <DollarSign class="w-5 h-5" />
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500">Total Kas Keluar</p>
                    <p class="text-lg font-bold font-mono text-emerald-600 mt-0.5">{{ formatCurrency(kpiMetrics.totalAmount) }}</p>
                </div>
            </div>

            <div class="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-2xs flex items-center gap-4">
                <div class="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                    <ArrowDownRight class="w-5 h-5" />
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500">Total Biaya Admin Bank</p>
                    <p class="text-lg font-bold font-mono text-slate-900 mt-0.5">{{ formatCurrency(kpiMetrics.totalFees) }}</p>
                </div>
            </div>

            <div class="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-2xs flex items-center gap-4">
                <div class="w-11 h-11 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
                    <CreditCard class="w-5 h-5" />
                </div>
                <div>
                    <p class="text-xs font-medium text-slate-500">Rata-rata Nominal</p>
                    <p class="text-lg font-bold font-mono text-slate-900 mt-0.5">{{ formatCurrency(kpiMetrics.avgAmount) }}</p>
                </div>
            </div>
        </div>

        <!-- 3. Filter Bar -->
        <div class="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3">
            <div class="relative flex-1">
                <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Cari No. Pembayaran, No. PRQ, referensi bank, atau catatan..."
                    class="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
                <button
                    v-if="searchQuery"
                    type="button"
                    @click="searchQuery = ''"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    <X class="w-4 h-4" />
                </button>
            </div>

            <div class="sm:w-60">
                <select
                    v-model="selectedAccountId"
                    class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                >
                    <option value="">Semua Akun Kas/Bank</option>
                    <option
                        v-for="acc in accountingAccounts"
                        :key="acc.id"
                        :value="acc.id"
                    >
                        {{ acc.account_code ? `[${acc.account_code}] ` : '' }}{{ acc.name }}
                    </option>
                </select>
            </div>

            <div class="sm:w-44">
                <input
                    v-model="selectedDate"
                    type="date"
                    class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
            </div>
        </div>

        <!-- 4. Data Table -->
        <div class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <th class="py-3 px-4">No. Pembayaran</th>
                            <th class="py-3 px-4">Tanggal Bayar</th>
                            <th class="py-3 px-4">No. PRQ Acuan</th>
                            <th class="py-3 px-4">Akun Sumber Kas/Bank</th>
                            <th class="py-3 px-4">Penerima Dana</th>
                            <th class="py-3 px-4 text-right">Nominal Bayar</th>
                            <th class="py-3 px-4 text-right">Biaya Admin</th>
                            <th class="py-3 px-4">Kasir Eksekutor</th>
                            <th class="py-3 px-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-xs">
                        <tr v-if="isLoading" class="bg-white">
                            <td colspan="9" class="py-12 text-center text-slate-400">
                                <div class="inline-flex items-center gap-2">
                                    <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    Memuat riwayat pencairan kas keluar...
                                </div>
                            </td>
                        </tr>

                        <tr v-else-if="items.length === 0" class="bg-white">
                            <td colspan="9" class="py-12 text-center">
                                <div class="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center border border-slate-200/60 mb-2">
                                    <CreditCard class="w-6 h-6" />
                                </div>
                                <p class="text-sm font-semibold text-slate-700">Belum ada riwayat pembayaran yang dicairkan</p>
                                <p class="text-xs text-slate-400 mt-0.5">Semua transaksi yang dieksekusi kasir akan tercatat secara permanen di sini.</p>
                            </td>
                        </tr>

                        <tr
                            v-for="item in items"
                            :key="item.id"
                            class="hover:bg-slate-50/60 transition-colors"
                        >
                            <!-- No. Pembayaran -->
                            <td class="py-3.5 px-4 font-mono font-semibold text-emerald-600">
                                <button
                                    type="button"
                                    @click="openDetail(item)"
                                    class="hover:underline text-left"
                                >
                                    {{ item.payment_number }}
                                </button>
                                <div class="flex items-center gap-1.5 mt-0.5">
                                    <span v-if="item.reference_number" class="text-[10px] font-mono text-slate-400">
                                        Ref: {{ item.reference_number }}
                                    </span>
                                    <span v-if="item.proof_file" class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold" title="Bukti transfer kasir terlampir">
                                        <Paperclip class="w-2.5 h-2.5" />
                                        Slip
                                    </span>
                                </div>
                            </td>

                            <!-- Tanggal Bayar -->
                            <td class="py-3.5 px-4 text-slate-700">
                                {{ item.payment_date ? new Date(item.payment_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' }}
                            </td>

                            <!-- No. PRQ Acuan -->
                            <td class="py-3.5 px-4 font-mono text-blue-600 font-medium">
                                {{ item.payment_request?.prq_number || '-' }}
                            </td>

                            <!-- Akun Sumber Kas/Bank -->
                            <td class="py-3.5 px-4">
                                <div class="font-medium text-slate-800">
                                    {{ item.source_account?.name || '-' }}
                                </div>
                                <div v-if="item.source_account?.account_code" class="text-[10px] font-mono text-slate-400">
                                    Code: {{ item.source_account.account_code }}
                                </div>
                            </td>

                            <!-- Penerima Dana -->
                            <td class="py-3.5 px-4">
                                <div class="font-medium text-slate-800">
                                    {{ item.payment_request?.recipient_name || '-' }}
                                </div>
                                <div class="text-[10px] text-slate-400">
                                    {{ item.payment_request?.bank_name }} - {{ item.payment_request?.bank_account_number }}
                                </div>
                            </td>

                            <!-- Nominal Bayar -->
                            <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                                {{ formatCurrency(item.amount_paid) }}
                            </td>

                            <!-- Biaya Admin -->
                            <td class="py-3.5 px-4 text-right font-mono text-slate-500">
                                {{ formatCurrency(item.bank_fee) }}
                            </td>

                            <!-- Kasir Eksekutor -->
                            <td class="py-3.5 px-4 text-slate-700">
                                <span class="inline-flex items-center gap-1 font-medium">
                                    <UserCheck class="w-3.5 h-3.5 text-slate-400" />
                                    {{ item.paid_by_user?.name || item.paid_by_user?.username || '-' }}
                                </span>
                            </td>

                            <!-- Aksi -->
                            <td class="py-3.5 px-4 text-right">
                                <button
                                    type="button"
                                    @click="openDetail(item)"
                                    class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Lihat Detail Bukti Mutasi"
                                >
                                    <Eye class="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="p-4 border-t border-slate-100 flex items-center justify-between">
                <Pagination
                    :pagination="pagination"
                    @page-change="fetchData"
                />
            </div>
        </div>

        <!-- 5. Detail Modal (Solid Overlay Without backdrop-blur) -->
        <div
            v-if="showDetailModal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
        >
            <div class="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-200">
                <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/60">
                    <div class="flex items-center gap-2.5">
                        <span class="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                            <CreditCard class="w-5 h-5" />
                        </span>
                        <div>
                            <h3 class="text-base font-bold text-slate-900">
                                Detail Bukti Realisasi Kas Keluar
                            </h3>
                            <p class="text-xs font-mono text-slate-500">
                                {{ selectedPayment?.payment_number }}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        @click="showDetailModal = false"
                        class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <div class="p-6 space-y-4 text-xs">
                    <!-- Grand Total Summary Box -->
                    <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                        <div class="flex justify-between items-center text-slate-500">
                            <span>Nominal Tagihan Dicairkan:</span>
                            <span class="font-mono font-semibold text-slate-800">{{ formatCurrency(selectedPayment?.amount_paid) }}</span>
                        </div>
                        <div class="flex justify-between items-center text-slate-500">
                            <span>Biaya Administrasi Bank:</span>
                            <span class="font-mono font-semibold text-slate-800">{{ formatCurrency(selectedPayment?.bank_fee) }}</span>
                        </div>
                        <div class="flex justify-between items-center pt-2 border-t border-slate-200">
                            <span class="font-bold text-slate-900">Total Pengeluaran Kas/Bank:</span>
                            <span class="font-mono text-base font-bold text-emerald-700">
                                {{ formatCurrency((parseFloat(selectedPayment?.amount_paid) || 0) + (parseFloat(selectedPayment?.bank_fee) || 0)) }}
                            </span>
                        </div>
                    </div>

                    <!-- Detail Rekening & Transaksi -->
                    <div class="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4">
                        <div>
                            <p class="text-slate-400">Akun Sumber Dana:</p>
                            <p class="font-semibold text-slate-900 mt-0.5">{{ selectedPayment?.source_account?.name || '-' }}</p>
                            <p class="text-[10px] font-mono text-slate-400">Code: {{ selectedPayment?.source_account?.account_code || '-' }}</p>
                        </div>

                        <div>
                            <p class="text-slate-400">Tanggal Realisasi Kasir:</p>
                            <p class="font-medium text-slate-900 mt-0.5">
                                {{ selectedPayment?.payment_date ? new Date(selectedPayment.payment_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' }}
                            </p>
                        </div>

                        <div>
                            <p class="text-slate-400">Penerima Dana:</p>
                            <p class="font-semibold text-slate-900 mt-0.5">{{ selectedPayment?.payment_request?.recipient_name || '-' }}</p>
                            <p class="text-[10px] font-mono text-slate-500">
                                {{ selectedPayment?.payment_request?.bank_name }} - {{ selectedPayment?.payment_request?.bank_account_number }}
                            </p>
                        </div>

                        <div>
                            <p class="text-slate-400">No. Referensi / Mutasi Bank:</p>
                            <p class="font-mono font-bold text-slate-900 mt-0.5">{{ selectedPayment?.reference_number || '-' }}</p>
                        </div>

                        <div class="col-span-2 pt-2 border-t border-slate-100">
                            <p class="text-slate-400">Petugas Kasir:</p>
                            <p class="font-medium text-slate-800 mt-0.5">
                                {{ selectedPayment?.paid_by_user?.name || '-' }} ({{ selectedPayment?.paid_by_user?.email || '-' }})
                            </p>
                        </div>

                        <div v-if="selectedPayment?.notes" class="col-span-2">
                            <p class="text-slate-400">Catatan Kasir:</p>
                            <p class="text-slate-700 italic mt-0.5">{{ selectedPayment.notes }}</p>
                        </div>
                    </div>

                    <!-- Bukti Transfer / Slip File Preview -->
                    <div v-if="selectedPayment?.proof_file" class="border border-emerald-200 rounded-xl p-4 bg-emerald-50/50 space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Paperclip class="w-3.5 h-3.5 text-emerald-600" />
                                Lampiran Bukti Mutasi / Slip Transfer Kasir
                            </span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Terlampir
                            </span>
                        </div>
                        <div class="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-lg">
                            <div class="flex items-center gap-2.5 overflow-hidden">
                                <div class="w-8 h-8 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                    <FileCheck class="w-4 h-4" />
                                </div>
                                <div class="truncate">
                                    <p class="font-semibold text-slate-800 truncate text-xs">{{ selectedPayment.proof_file.original_name }}</p>
                                    <p class="text-[10px] text-slate-400 font-mono">{{ Math.round((selectedPayment.proof_file.file_size || 0) / 1024) }} KB</p>
                                </div>
                            </div>
                            <a
                                :href="selectedPayment.proof_file.file_url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1 shrink-0"
                            >
                                <ExternalLink class="w-3 h-3" />
                                Buka File
                            </a>
                        </div>
                    </div>
                </div>

                <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
                    <button
                        type="button"
                        @click="showDetailModal = false"
                        class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
