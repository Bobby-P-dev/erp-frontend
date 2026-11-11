<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { getPurchaseOrders } from '../../services/purchaseOrderServices.js'
import { showError } from '../../utils/swal.js'
import { formatCurrency, formatDate } from '../../composables/useFormatter.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import Pagination from '../../components/ui/Pagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

import {
    Home,
    ChevronRight,
    FileText,
    RefreshCw,
    Search,
    Calendar,
    Building2,
    Eye
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

const purchaseOrders = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedStatus = ref('')
const rfqFilter = ref(route.query.rfq_id || '')

const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0
})

const statusTabs = [
    { id: '', label: 'Semua Status' },
    { id: 'draft', label: 'Draf PO' },
    { id: 'pending_approval', label: 'Menunggu Persetujuan' },
    { id: 'approved', label: 'Disetujui' },
    { id: 'issued', label: 'Diterbitkan ke Vendor' },
    { id: 'acknowledged', label: 'Dikonfirmasi Vendor' },
    { id: 'completed', label: 'Selesai' },
    { id: 'cancelled', label: 'Dibatalkan' }
]

const tableColumns = [
    { key: 'no', label: 'No', width: '60px', align: 'center', class: 'text-center' },
    { key: 'po_number', label: 'Nomor PO & Sumber Tender', minWidth: '230px' },
    { key: 'supplier', label: 'Vendor / Pemasok', minWidth: '220px' },
    { key: 'po_date', label: 'Tanggal PO & Target Kirim', minWidth: '190px' },
    { key: 'total_amount', label: 'Total Nilai PO', minWidth: '170px', align: 'right', class: 'text-right' },
    { key: 'status', label: 'Status PO', minWidth: '170px', align: 'center', class: 'text-center' },
    { key: 'actions', label: 'Aksi', minWidth: '130px', align: 'center', class: 'text-center' }
]

const fetchPurchaseOrders = async (search = searchQuery.value, page = 1) => {
    isLoading.value = true
    try {
        const filters = {
            per_page: pagination.value.per_page
        }
        if (selectedStatus.value) filters.status = selectedStatus.value
        if (rfqFilter.value) filters.rfq_id = rfqFilter.value

        const response = await getPurchaseOrders(search, page, filters)
        purchaseOrders.value = response.data || []

        if (response.meta) {
            pagination.value = {
                current_page: response.meta.current_page || page,
                last_page: response.meta.last_page || 1,
                per_page: response.meta.per_page || 10,
                total: response.meta.total || 0
            }
        }
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal memuat daftar Purchase Order')
    } finally {
        isLoading.value = false
    }
}

watch(selectedStatus, () => {
    fetchPurchaseOrders(searchQuery.value, 1)
})

const handleSearch = () => {
    fetchPurchaseOrders(searchQuery.value, 1)
}

const clearRfqFilter = () => {
    rfqFilter.value = ''
    router.replace({ name: 'user.purchasing.orders' })
    fetchPurchaseOrders(searchQuery.value, 1)
}

onMounted(() => {
    fetchPurchaseOrders()
})
</script>

<template>
    <div class="space-y-6">
        <PageHeader
            title="Pesanan Pembelian (Purchase Order)"
            subtitle="Kelola dokumen pesanan pembelian resmi kepada vendor pemenang tender"
        >
            <template #breadcrumbs>
                <div class="flex items-center gap-2 text-xs text-slate-600">
                    <RouterLink :to="{ name: 'user.dashboard' }" class="hover:text-blue-700">
                        <Home class="w-3.5 h-3.5" />
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <RouterLink :to="{ name: 'user.purchasing' }" class="hover:text-blue-700">
                        Purchasing
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span class="text-slate-900 font-semibold">Purchase Order (PO)</span>
                </div>
            </template>

            <template #actions>
                <div class="flex items-center gap-2.5">
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="fetchPurchaseOrders(searchQuery, pagination.current_page)"
                        :disabled="isLoading"
                    >
                        <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': isLoading }" />
                        Muat Ulang
                    </BaseButton>
                    <BaseButton
                        variant="primary"
                        size="sm"
                        @click="router.push({ name: 'user.purchasing.rfq' })"
                        class="bg-blue-600 hover:bg-blue-700"
                    >
                        <FileText class="w-4 h-4 mr-1.5" />
                        Lihat Tender RFQ
                    </BaseButton>
                </div>
            </template>
        </PageHeader>

        <!-- Filter & Search Bar -->
        <div class="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <!-- Status Tabs -->
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                        v-for="tab in statusTabs"
                        :key="tab.id"
                        type="button"
                        @click="selectedStatus = tab.id"
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border"
                        :class="selectedStatus === tab.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'"
                    >
                        {{ tab.label }}
                    </button>
                </div>

                <!-- Search Input -->
                <form @submit.prevent="handleSearch" class="flex items-center gap-2 w-full md:w-80">
                    <div class="relative flex-1">
                        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Cari nomor PO, vendor, atau RFQ..."
                            class="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                    <BaseButton type="submit" variant="outline" size="sm">
                        Cari
                    </BaseButton>
                </form>
            </div>

            <div v-if="rfqFilter" class="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2 text-xs text-blue-900">
                <span>Menampilkan Purchase Order yang berasal dari Tender RFQ #{{ rfqFilter }}</span>
                <button type="button" @click="clearRfqFilter" class="font-bold underline hover:text-blue-700 cursor-pointer">
                    Tampilkan Semua PO
                </button>
            </div>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <BaseTable :columns="tableColumns">
                <tr v-if="isLoading">
                    <td colspan="7" class="px-6 py-14 text-center text-sm text-slate-500">
                        <div class="inline-flex items-center gap-2 font-medium">
                            <RefreshCw class="w-4 h-4 animate-spin text-slate-700" />
                            Memuat daftar Purchase Order (PO)...
                        </div>
                    </td>
                </tr>

                <tr v-else-if="purchaseOrders.length === 0">
                    <td colspan="7" class="px-6 py-14 text-center">
                        <div class="flex flex-col items-center justify-center max-w-md mx-auto text-slate-500 space-y-2">
                            <div class="p-3 bg-slate-100 rounded-xl border border-slate-200">
                                <FileText class="w-6 h-6 text-slate-400" />
                            </div>
                            <div class="text-sm font-bold text-slate-800">
                                Belum Ada Dokumen Purchase Order (PO)
                            </div>
                            <p class="text-xs text-slate-500">
                                PO dapat diterbitkan secara otomatis dari halaman Perbandingan Harga atau Detail Tender RFQ yang sudah ditetapkan pemenangnya.
                            </p>
                        </div>
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
                                :to="{ name: 'user.purchasing.orders.detail', params: { id: item.id } }"
                                class="text-sm font-bold font-mono text-blue-700 hover:text-blue-900 hover:underline"
                            >
                                {{ item.po_number }}
                            </RouterLink>
                            <div class="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-600">
                                <span v-if="item.rfq" class="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px]">
                                    {{ item.rfq.rfq_number }}
                                </span>
                                <span v-if="item.supplier_quotation" class="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px]">
                                    {{ item.supplier_quotation.quotation_number }}
                                </span>
                            </div>
                        </div>
                    </td>

                    <td class="px-6 py-4">
                        <div class="flex items-start gap-2">
                            <Building2 class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                                <div class="text-sm font-bold text-slate-900">
                                    {{ item.supplier?.name || `Vendor #${item.supplier_id}` }}
                                </div>
                                <div class="text-xs text-slate-500 font-mono">
                                    {{ item.supplier?.supplier_code || '-' }}
                                </div>
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

                    <td class="px-6 py-4 text-right">
                        <div class="text-sm font-bold font-mono text-slate-900">
                            {{ formatCurrency(item.total_amount) }}
                        </div>
                        <div class="text-[11px] text-slate-500">
                            {{ item.items?.length || 0 }} jenis barang • {{ item.payment_terms || 'Standar' }}
                        </div>
                    </td>

                    <td class="px-6 py-4 text-center">
                        <StatusBadge :status="item.status" :label="item.status_label" />
                    </td>

                    <td class="px-6 py-4 text-center">
                        <div class="flex items-center justify-center">
                            <RouterLink
                                :to="{ name: 'user.purchasing.orders.detail', params: { id: item.id } }"
                                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            >
                                <Eye class="w-3.5 h-3.5" />
                                <span>Lihat Detail</span>
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
                    @page-change="(p) => fetchPurchaseOrders(searchQuery, p)"
                />
            </div>
        </div>
    </div>
</template>
