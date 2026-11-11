<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { getSupplierPortalPurchaseOrders } from '../../../services/supplierPortalServices.js'
import { showError } from '../../../utils/swal.js'
import { formatCurrency, formatDate } from '../../../composables/useFormatter.js'

import PageHeader from '../../../components/ui/PageHeader.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import StatusBadge from '../../../components/ui/StatusBadge.vue'

import {
    Home,
    ChevronRight,
    RefreshCw,
    Search,
    Calendar,
    ArrowRight
} from '@lucide/vue'

const router = useRouter()

const purchaseOrders = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedStatus = ref('')

const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0
})

const statusTabs = [
    { id: '', label: 'Semua Pesanan' },
    { id: 'issued', label: 'Perlu Dikonfirmasi' },
    { id: 'acknowledged', label: 'Sudah Dikonfirmasi' },
    { id: 'completed', label: 'Selesai' }
]

const tableColumns = [
    { key: 'no', label: 'No', width: '60px', align: 'center', class: 'text-center' },
    { key: 'po_number', label: 'Nomor PO & Referensi Tender', minWidth: '230px' },
    { key: 'po_date', label: 'Tanggal PO & Target Kirim', minWidth: '200px' },
    { key: 'items_count', label: 'Jumlah Barang', minWidth: '140px', align: 'center', class: 'text-center' },
    { key: 'total_amount', label: 'Total Nilai Pesanan', minWidth: '180px', align: 'right', class: 'text-right' },
    { key: 'status', label: 'Status Pesanan', minWidth: '170px', align: 'center', class: 'text-center' },
    { key: 'actions', label: 'Aksi', minWidth: '150px', align: 'center', class: 'text-center' }
]

const fetchOrders = async (search = searchQuery.value, page = 1) => {
    isLoading.value = true
    try {
        const filters = {
            per_page: pagination.value.per_page
        }
        if (selectedStatus.value) filters.status = selectedStatus.value

        const res = await getSupplierPortalPurchaseOrders(search, page, filters)
        purchaseOrders.value = res.data || []

        if (res.meta) {
            pagination.value = {
                current_page: res.meta.current_page || page,
                last_page: res.meta.last_page || 1,
                per_page: res.meta.per_page || 10,
                total: res.meta.total || 0
            }
        }
    } catch (err) {
        showError('Gagal Memuat PO', err.response?.data?.message || 'Tidak dapat memuat daftar Pesanan Pembelian.')
    } finally {
        isLoading.value = false
    }
}

watch(selectedStatus, () => {
    fetchOrders(searchQuery.value, 1)
})

const handleSearch = () => {
    fetchOrders(searchQuery.value, 1)
}

onMounted(() => {
    fetchOrders()
})
</script>

<template>
    <div class="space-y-6">
        <PageHeader
            title="Pesanan Pembelian Resmi (Purchase Order)"
            subtitle="Daftar pesanan pembelian dari PT Padma Soode Indonesia untuk perusahaan Anda"
        >
            <template #breadcrumbs>
                <div class="flex items-center gap-2 text-xs text-slate-600">
                    <RouterLink :to="{ name: 'supplier.portal.dashboard' }" class="hover:text-blue-700">
                        <Home class="w-3.5 h-3.5" />
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span class="text-slate-900 font-semibold">Pesanan Pembelian (PO)</span>
                </div>
            </template>

            <template #actions>
                <BaseButton
                    variant="outline"
                    size="sm"
                    @click="fetchOrders(searchQuery, pagination.current_page)"
                    :disabled="isLoading"
                >
                    <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': isLoading }" />
                    Muat Ulang
                </BaseButton>
            </template>
        </PageHeader>

        <!-- Filter & Search -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                    v-for="tab in statusTabs"
                    :key="tab.id"
                    type="button"
                    @click="selectedStatus = tab.id"
                    class="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border"
                    :class="selectedStatus === tab.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'"
                >
                    {{ tab.label }}
                </button>
            </div>

            <form @submit.prevent="handleSearch" class="flex items-center gap-2 w-full md:w-80">
                <div class="relative flex-1">
                    <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Cari nomor PO atau tender..."
                        class="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
                <BaseButton type="submit" variant="outline" size="sm">
                    Cari
                </BaseButton>
            </form>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <BaseTable :columns="tableColumns">
                <tr v-if="isLoading">
                    <td colspan="7" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat daftar Pesanan Pembelian (PO)...
                        </div>
                    </td>
                </tr>

                <tr v-else-if="purchaseOrders.length === 0">
                    <td colspan="7" class="px-6 py-14 text-center text-xs text-slate-500">
                        Belum ada dokumen Pesanan Pembelian (PO) resmi yang diterbitkan untuk perusahaan Anda.
                    </td>
                </tr>

                <tr
                    v-else
                    v-for="(item, index) in purchaseOrders"
                    :key="item.id"
                    class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0"
                >
                    <td class="px-6 py-4 text-center">
                        <span class="text-xs font-mono font-semibold text-slate-600">
                            {{ (pagination.current_page - 1) * pagination.per_page + index + 1 }}
                        </span>
                    </td>

                    <td class="px-6 py-4">
                        <div>
                            <RouterLink
                                :to="{ name: 'supplier.portal.purchase-orders.detail', params: { id: item.id } }"
                                class="text-sm font-bold font-mono text-blue-700 hover:text-blue-900 hover:underline"
                            >
                                {{ item.po_number }}
                            </RouterLink>
                            <div v-if="item.rfq" class="text-xs text-slate-600 mt-0.5">
                                Tender: <span class="font-mono font-semibold">{{ item.rfq.rfq_number }}</span> — {{ item.rfq.title }}
                            </div>
                        </div>
                    </td>

                    <td class="px-6 py-4">
                        <div class="text-xs space-y-1">
                            <div class="flex items-center gap-1.5 text-slate-800 font-medium">
                                <Calendar class="w-3.5 h-3.5 text-slate-400" />
                                <span>Tgl PO: {{ formatDate(item.po_date) }}</span>
                            </div>
                            <div class="text-slate-600">
                                Target Kirim: <strong>{{ formatDate(item.expected_delivery_date) || '-' }}</strong>
                            </div>
                        </div>
                    </td>

                    <td class="px-6 py-4 text-center">
                        <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                            {{ item.items?.length || 0 }} Jenis Barang
                        </span>
                    </td>

                    <td class="px-6 py-4 text-right">
                        <div class="text-sm font-bold font-mono text-slate-900">
                            {{ formatCurrency(item.total_amount) }}
                        </div>
                        <div class="text-[11px] text-slate-500">
                            {{ item.payment_terms || 'Sesuai Kesepakatan' }}
                        </div>
                    </td>

                    <td class="px-6 py-4 text-center">
                        <StatusBadge
                            :status="item.status"
                            :label="item.status === 'issued' || item.status === 'approved' ? 'Perlu Konfirmasi Anda' : item.status_label"
                        />
                    </td>

                    <td class="px-6 py-4 text-center">
                        <div class="flex items-center justify-center">
                            <RouterLink
                                :to="{ name: 'supplier.portal.purchase-orders.detail', params: { id: item.id } }"
                                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                :class="item.status === 'issued' || item.status === 'approved'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200'"
                            >
                                <span>{{ item.status === 'issued' || item.status === 'approved' ? 'Konfirmasi PO' : 'Lihat Detail' }}</span>
                                <ArrowRight class="w-3.5 h-3.5" />
                            </RouterLink>
                        </div>
                    </td>
                </tr>
            </BaseTable>

            <div v-if="pagination.last_page > 1" class="px-6 py-4 border-t border-slate-200 bg-slate-50">
                <Pagination
                    :current-page="pagination.current_page"
                    :total-pages="pagination.last_page"
                    :total-items="pagination.total"
                    :per-page="pagination.per_page"
                    @page-change="(p) => fetchOrders(searchQuery, p)"
                />
            </div>
        </div>
    </div>
</template>
