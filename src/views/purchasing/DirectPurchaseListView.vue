<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { 
    getDirectPurchases, 
    submitDirectPurchaseForPayment, 
    cancelDirectPurchase 
} from '../../services/directPurchaseServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { formatCurrency } from '../../utils/stringUtils.js'
import Swal from 'sweetalert2'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import Pagination from '../../components/ui/Pagination.vue'

import {
    Home,
    ChevronRight,
    ShoppingCart,
    Plus,
    RefreshCw,
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    Send,
    Ban,
    Store,
    Building2,
    Layers,
    FileText,
    DollarSign,
    CreditCard
} from '@lucide/vue'

const router = useRouter()

// Data State
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

// Metrics computation
const stats = computed(() => {
    const list = directPurchases.value || []
    return {
        total: pagination.value.total || list.length,
        draft: list.filter(dp => dp.status === 'draft').length,
        readyForPayment: list.filter(dp => dp.status === 'ready_for_payment').length,
        completed: list.filter(dp => dp.status === 'completed').length,
        totalGrandAmount: list.reduce((sum, dp) => sum + (Number(dp.grand_total) || 0), 0)
    }
})

// Table Columns
const tableColumns = [
    { key: 'no', label: 'No', class: 'w-14 text-center' },
    { key: 'dp_number', label: 'No. Pembelian & Tanggal', class: 'min-w-[200px]' },
    { key: 'plan', label: 'Rencana Pengadaan (PP / PR)', class: 'min-w-[200px]' },
    { key: 'channel', label: 'Saluran & Rekanan', class: 'min-w-[220px]' },
    { key: 'items', label: 'Item Dibeli', class: 'w-32 text-center' },
    { key: 'grand_total', label: 'Total Biaya (Rp)', class: 'w-44 text-right' },
    { key: 'status', label: 'Status', class: 'w-36 text-center' },
    { key: 'actions', label: 'Aksi', class: 'w-36 text-center' }
]

// Fetch Data
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

const getStatusBadge = (status) => {
    switch (status) {
        case 'draft':
            return {
                label: 'Draft',
                bg: 'bg-amber-50 text-amber-700 border-amber-200',
                dot: 'bg-amber-500'
            }
        case 'ready_for_payment':
            return {
                label: 'Siap Dibayar',
                bg: 'bg-blue-50 text-blue-700 border-blue-200',
                dot: 'bg-blue-500'
            }
        case 'completed':
            return {
                label: 'Selesai',
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                dot: 'bg-emerald-500'
            }
        case 'cancelled':
            return {
                label: 'Dibatalkan',
                bg: 'bg-rose-50 text-rose-700 border-rose-200',
                dot: 'bg-rose-500'
            }
        default:
            return {
                label: status || '-',
                bg: 'bg-gray-50 text-gray-600 border-gray-200',
                dot: 'bg-gray-400'
            }
    }
}

const getChannelInfo = (dp) => {
    switch (dp.purchase_channel) {
        case 'marketplace':
            return {
                label: dp.marketplace_name || 'Marketplace',
                merchant: dp.merchant_name || 'Toko Online',
                badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
                icon: Store
            }
        case 'direct_supplier':
            return {
                label: 'Supplier Resmi',
                merchant: dp.supplier?.name || 'Rekanan Terdaftar',
                badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                icon: Building2
            }
        case 'retail_store':
            return {
                label: 'Toko Retail',
                merchant: dp.merchant_name || 'Toko Fisik',
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                icon: Store
            }
        default:
            return {
                label: dp.purchase_channel || 'Lainnya',
                merchant: dp.merchant_name || '-',
                badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
                icon: Store
            }
    }
}

// Action Handlers
const handleSubmitForPayment = async (dp) => {
    const confirmed = await showConfirm(
        'Ajukan Pembayaran?',
        `Direct Purchase ${dp.dp_number} senilai ${formatCurrency(dp.grand_total)} akan diajukan ke bagian keuangan untuk proses pembayaran.`,
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
    const { value: reason, isConfirmed } = await Swal.fire({
        title: 'Batalkan Pembelian Langsung?',
        text: `Masukkan alasan pembatalan untuk ${dp.dp_number}:`,
        input: 'textarea',
        inputPlaceholder: 'Tuliskan alasan pembatalan pembelian ini...',
        showCancelButton: true,
        confirmButtonText: 'Ya, Batalkan Pembelian',
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
    fetchDirectPurchases()
})
</script>

<template>
    <div class="space-y-6">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <RouterLink to="/" class="hover:text-indigo-600 transition-colors flex items-center gap-1">
                <Home class="w-4 h-4" />
                <span>Beranda</span>
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400" />
            <RouterLink to="/purchasing" class="hover:text-indigo-600 transition-colors">
                Purchasing
            </RouterLink>
            <ChevronRight class="w-4 h-4 text-gray-400" />
            <span class="text-gray-900 font-semibold">Direct Purchases</span>
        </nav>

        <!-- Page Header -->
        <PageHeader 
            title="Direct Purchases (Pembelian Langsung)" 
            description="Realisasi transaksi pengadaan barang langsung melalui Marketplace online, Toko Retail, atau Supplier resmi tanpa tender."
        >
            <template #actions>
                <div class="flex items-center gap-3">
                    <RouterLink :to="{ name: 'user.purchasing.plans' }">
                        <BaseButton variant="secondary">
                            <Layers class="w-4 h-4" />
                            <span>Lihat Rencana Pengadaan</span>
                        </BaseButton>
                    </RouterLink>
                    <RouterLink :to="{ name: 'user.purchasing.direct.create' }">
                        <BaseButton variant="primary">
                            <Plus class="w-4 h-4" />
                            <span>Buat Pembelian Baru</span>
                        </BaseButton>
                    </RouterLink>
                </div>
            </template>
        </PageHeader>

        <!-- KPI Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <ShoppingCart class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Transaksi</p>
                    <div class="flex items-baseline gap-2 mt-1">
                        <h4 class="text-2xl font-bold text-gray-900">{{ stats.total }}</h4>
                        <span class="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">Transaksi DP</span>
                    </div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Draft Pembelian</p>
                    <div class="flex items-baseline gap-2 mt-1">
                        <h4 class="text-2xl font-bold text-gray-900">{{ stats.draft }}</h4>
                        <span class="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">Belum Diajukan</span>
                    </div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CreditCard class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Siap Dibayar</p>
                    <div class="flex items-baseline gap-2 mt-1">
                        <h4 class="text-2xl font-bold text-gray-900">{{ stats.readyForPayment }}</h4>
                        <span class="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">Keuangan</span>
                    </div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <DollarSign class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Realisasi</p>
                    <div class="flex items-baseline gap-2 mt-1">
                        <h4 class="text-lg font-bold text-emerald-700 truncate" :title="formatCurrency(stats.totalGrandAmount)">
                            {{ formatCurrency(stats.totalGrandAmount) }}
                        </h4>
                    </div>
                </div>
            </div>
        </div>

        <!-- Table & Filter Card -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <!-- Filter Bar -->
            <div class="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="w-full md:w-96">
                    <SearchInput 
                        v-model="searchQuery" 
                        placeholder="Cari No. DP, nama toko, catatan..." 
                    />
                </div>
                <div class="flex items-center gap-3 flex-wrap">
                    <!-- Channel Filter -->
                    <select 
                        v-model="channelFilter" 
                        class="text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    >
                        <option value="">Semua Saluran</option>
                        <option value="marketplace">Marketplace Online</option>
                        <option value="direct_supplier">Supplier Resmi</option>
                        <option value="retail_store">Toko Retail</option>
                    </select>

                    <!-- Status Filter -->
                    <select 
                        v-model="statusFilter" 
                        class="text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    >
                        <option value="">Semua Status</option>
                        <option value="draft">Draft</option>
                        <option value="ready_for_payment">Siap Dibayar</option>
                        <option value="completed">Selesai</option>
                        <option value="cancelled">Dibatalkan</option>
                    </select>

                    <!-- Refresh Button -->
                    <button 
                        @click="fetchDirectPurchases(searchQuery, pagination.current_page)"
                        class="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-500 hover:text-gray-700 transition-colors"
                        title="Segarkan Data"
                    >
                        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                    </button>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns" :loading="isLoading">
                <!-- Empty State -->
                <tr v-if="!isLoading && directPurchases.length === 0">
                    <td colspan="8" class="text-center py-12 text-gray-500">
                        <ShoppingCart class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p class="text-sm font-semibold text-gray-700">Belum Ada Transaksi Direct Purchase</p>
                        <p class="text-xs text-gray-500 mt-1">Gunakan tombol "Buat Pembelian Baru" untuk mengeksekusi rencana pengadaan Direct Purchase.</p>
                        <RouterLink :to="{ name: 'user.purchasing.direct.create' }" class="inline-block mt-4">
                            <BaseButton variant="primary">
                                <Plus class="w-4 h-4 mr-1" />
                                <span>Buat Direct Purchase</span>
                            </BaseButton>
                        </RouterLink>
                    </td>
                </tr>

                <!-- Data Rows -->
                <tr 
                    v-for="(dp, index) in directPurchases" 
                    :key="dp.id"
                    class="hover:bg-gray-50/70 transition-colors"
                >
                    <!-- No -->
                    <td class="px-6 py-4 text-sm text-gray-500 text-center font-medium">
                        {{ (pagination.current_page - 1) * pagination.per_page + index + 1 }}
                    </td>

                    <!-- DP Number & Date -->
                    <td class="px-6 py-4">
                        <div class="flex flex-col gap-1">
                            <RouterLink 
                                :to="{ name: 'user.purchasing.direct.detail', params: { id: dp.id } }"
                                class="font-mono font-bold text-indigo-600 hover:text-indigo-800 text-sm hover:underline"
                            >
                                {{ dp.dp_number }}
                            </RouterLink>
                            <span class="text-xs text-gray-400 flex items-center gap-1">
                                <Calendar class="w-3 h-3 text-gray-400" />
                                {{ formatDate(dp.created_at) }}
                            </span>
                        </div>
                    </td>

                    <!-- Plan & PR Info -->
                    <td class="px-6 py-4">
                        <div class="flex flex-col gap-1">
                            <span class="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                <Layers class="w-3.5 h-3.5 text-indigo-500" />
                                {{ dp.procurement_plan?.pp_number || 'Plan #' + dp.procurement_plan_id }}
                            </span>
                            <span class="text-xs text-gray-500 flex items-center gap-1">
                                <FileText class="w-3 h-3 text-gray-400" />
                                {{ dp.procurement_plan?.purchase_requisition?.pr_number || '-' }}
                            </span>
                        </div>
                    </td>

                    <!-- Channel & Merchant Info -->
                    <td class="px-6 py-4">
                        <div class="space-y-1">
                            <span 
                                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                                :class="getChannelInfo(dp).badgeClass"
                            >
                                <component :is="getChannelInfo(dp).icon" class="w-3 h-3" />
                                {{ getChannelInfo(dp).label }}
                            </span>
                            <p class="text-xs font-bold text-gray-800 truncate max-w-[200px]" :title="getChannelInfo(dp).merchant">
                                {{ getChannelInfo(dp).merchant }}
                            </p>
                        </div>
                    </td>

                    <!-- Items Count -->
                    <td class="px-6 py-4 text-center font-bold text-gray-700 text-sm">
                        {{ dp.items?.length || 0 }} Item
                    </td>

                    <!-- Grand Total -->
                    <td class="px-6 py-4 text-right">
                        <span class="text-sm font-black text-gray-900 font-mono">
                            {{ formatCurrency(dp.grand_total) }}
                        </span>
                    </td>

                    <!-- Status Badge -->
                    <td class="px-6 py-4 text-center">
                        <span 
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                            :class="getStatusBadge(dp.status).bg"
                        >
                            <span class="w-1.5 h-1.5 rounded-full" :class="getStatusBadge(dp.status).dot"></span>
                            {{ getStatusBadge(dp.status).label }}
                        </span>
                    </td>

                    <!-- Actions -->
                    <td class="px-6 py-4 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <!-- View Detail -->
                            <RouterLink 
                                :to="{ name: 'user.purchasing.direct.detail', params: { id: dp.id } }"
                                class="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Lihat Detail Transaksi"
                            >
                                <Eye class="w-4 h-4" />
                            </RouterLink>

                            <!-- Submit for Payment (If Draft) -->
                            <button 
                                v-if="dp.status === 'draft'"
                                @click="handleSubmitForPayment(dp)"
                                class="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ajukan Pembayaran"
                            >
                                <CreditCard class="w-4 h-4" />
                            </button>

                            <!-- Cancel (If Draft or Ready for Payment) -->
                            <button 
                                v-if="['draft', 'ready_for_payment'].includes(dp.status)"
                                @click="handleCancel(dp)"
                                class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Batalkan Transaksi"
                            >
                                <Ban class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            </BaseTable>

            <!-- Pagination -->
            <div class="p-5 border-t border-gray-100 flex items-center justify-between">
                <Pagination 
                    :pagination="pagination" 
                    @page-change="handlePageChange" 
                />
            </div>
        </div>
    </div>
</template>
