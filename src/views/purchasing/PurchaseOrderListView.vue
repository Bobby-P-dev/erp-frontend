<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { getPurchaseOrders } from '../../services/purchaseOrderServices.js'
import { formatCurrency, formatDate } from '../../composables/useFormatter.js'

import SearchInput from '../../components/ui/SearchInput.vue'
import TableDocumentCell from '../../components/ui/TableDocumentCell.vue'
import PurchaseOrderDetailModal from '../../components/purchasing/order/PurchaseOrderDetailModal.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import BaseTable from '../../components/ui/BaseTable.vue'
import Pagination from '../../components/ui/Pagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

import {
    Home,
    ChevronRight,
    FileText,
    RefreshCw,
    Eye
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

const purchaseOrders = ref([])
const isLoading = ref(false)
const previewId = ref(null)
const loadError = ref('')
let requestVersion = 0
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
    { id: 'partially_received', label: 'Diterima Sebagian' },
    { id: 'revision_requested', label: 'Revisi (proses lama)' },
    { id: 'rejected', label: 'Ditolak (proses lama)' },
    { id: 'completed', label: 'Selesai' },
    { id: 'cancelled', label: 'Dibatalkan' }
]

const tableColumns = [
    { key: 'po_number', label: 'Purchase Order', minWidth: '200px' },
    { key: 'supplier', label: 'Pemasok', minWidth: '200px' },
    { key: 'delivery', label: 'Target kirim', minWidth: '140px' },
    { key: 'total_amount', label: 'Total pesanan', minWidth: '160px', align: 'right' },
    { key: 'status', label: 'Status', minWidth: '170px' },
    { key: 'actions', label: 'Detail', width: '85px', align: 'center' }
]

const fetchPurchaseOrders = async (search = searchQuery.value, page = 1) => {
    const version = ++requestVersion
    isLoading.value = true
    loadError.value = ''
    try {
        const filters = {
            per_page: pagination.value.per_page
        }
        if (selectedStatus.value) filters.status = selectedStatus.value
        if (rfqFilter.value) filters.rfq_id = rfqFilter.value

        const response = await getPurchaseOrders(search, page, filters)
        if (version !== requestVersion) return
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
        if (version === requestVersion) loadError.value = err.response?.data?.message || 'Gagal memuat daftar Purchase Order'
    } finally {
        if (version === requestVersion) isLoading.value = false
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
    <div class="min-w-0 space-y-6">
        <nav class="flex items-center gap-2 text-xs text-slate-500" aria-label="Breadcrumb">
            <RouterLink :to="{ name: 'user.dashboard' }" aria-label="Dashboard"><Home class="size-3.5" /></RouterLink><ChevronRight class="size-3.5 text-slate-300" />
            <RouterLink :to="{ name: 'user.purchasing' }">Purchasing</RouterLink><ChevronRight class="size-3.5 text-slate-300" /><span class="font-medium text-slate-700">Purchase Order</span>
        </nav>
        <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><p class="mb-2 text-xs font-medium uppercase tracking-widest text-slate-400">Purchasing</p><h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Pesanan pembelian</h1><p class="mt-2 text-sm text-slate-500">Pantau pesanan, penerbitan PO, dan konfirmasi pemasok.</p></div>
            <div class="flex flex-wrap gap-2">
                <BaseButton variant="secondary" size="sm" :disabled="isLoading" @click="fetchPurchaseOrders(searchQuery, pagination.current_page)"><RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />Muat ulang</BaseButton>
                <BaseButton variant="secondary" size="sm" @click="router.push({ name: 'user.purchasing.rfq' })"><FileText class="size-4" />Tender RFQ</BaseButton>
            </div>
        </div>
        <section class="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Daftar pesanan pembelian">
            <div class="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 class="text-base font-semibold text-slate-900">Daftar Purchase Order <span class="ml-2 text-sm font-normal text-slate-400">{{ pagination.total }} dokumen</span></h2><p class="mt-1 text-sm text-slate-500">Buka nomor PO untuk melihat barang dan ketentuan pesanan.</p>
            </div>
            <div class="space-y-3 border-b border-slate-100 p-5 sm:px-6">
                <form class="flex flex-col gap-3 sm:flex-row sm:items-center" @submit.prevent="handleSearch">
                    <div class="w-full sm:max-w-md"><SearchInput v-model="searchQuery" compact clearable label="Cari Purchase Order" placeholder="Cari nomor PO, pemasok, atau RFQ…" /></div>
                    <label class="flex items-center gap-3 text-sm text-slate-500"><span class="shrink-0">Status</span><select v-model="selectedStatus" class="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 sm:w-56"><option v-for="tab in statusTabs" :key="tab.id" :value="tab.id">{{ tab.label }}</option></select></label>
                    <BaseButton type="submit" variant="secondary" size="sm">Cari</BaseButton>
                </form>
                <div v-if="rfqFilter" class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800"><span>Disaring dari RFQ #{{ rfqFilter }}</span><button type="button" class="font-medium hover:underline" @click="clearRfqFilter">Tampilkan semua PO</button></div>
            </div>
            <BaseTable :columns="tableColumns" min-width="980px" label="Daftar Purchase Order" :busy="isLoading">
                <tr v-if="isLoading && !previewId"><td colspan="6" class="py-16! text-center text-slate-500"><span role="status">Memuat pesanan pembelian…</span></td></tr>
                <tr v-else-if="loadError"><td colspan="6" class="text-center"><p role="alert" class="text-rose-700">{{ loadError }}</p><BaseButton variant="secondary" size="sm" class="mt-3" @click="fetchPurchaseOrders(searchQuery, pagination.current_page)">Coba lagi</BaseButton></td></tr>
                <tr v-else-if="!purchaseOrders.length"><td colspan="6" class="py-16! text-center"><FileText class="mx-auto mb-3 size-8 text-slate-300" /><p class="font-medium text-slate-800">{{ searchQuery || selectedStatus || rfqFilter ? 'Tidak ada PO yang cocok' : 'Belum ada Purchase Order' }}</p><p class="mt-2 text-sm text-slate-500">{{ searchQuery || selectedStatus || rfqFilter ? 'Coba kata kunci atau status lainnya.' : 'Buat PO dari tender yang sudah ditetapkan pemenangnya.' }}</p></td></tr>
                <template v-else>
                    <tr v-for="item in purchaseOrders" :key="item.id">
                        <td><TableDocumentCell :number="item.po_number" :description="formatDate(item.po_date)" @open="previewId = item.id" /></td>
                        <td><p class="font-medium text-slate-800">{{ item.supplier?.name || `Pemasok #${item.supplier_id}` }}</p><p v-if="item.supplier?.supplier_code" class="mt-1 text-xs text-slate-400">{{ item.supplier.supplier_code }}</p></td>
                        <td class="text-slate-600 whitespace-nowrap">{{ formatDate(item.expected_delivery_date) }}</td>
                        <td class="text-right font-medium tabular-nums text-slate-900 whitespace-nowrap">{{ formatCurrency(item.total_amount, item.currency) }}</td>
                        <td><StatusBadge :status="item.status" :label="item.status_label" /></td>
                        <td class="text-center"><button type="button" :aria-label="`Lihat detail ${item.po_number}`" class="inline-flex rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-[#014baa]" @click="previewId = item.id"><Eye class="size-4" /></button></td>
                    </tr>
                </template>
            </BaseTable>
            <Pagination v-if="!isLoading && !loadError && pagination.total" :pagination="pagination" @change-page="page => fetchPurchaseOrders(searchQuery, page)" />
        </section>
        <PurchaseOrderDetailModal v-if="previewId" :order-id="previewId" @close="previewId = null" @changed="fetchPurchaseOrders(searchQuery, pagination.current_page)" />
    </div>
</template>
