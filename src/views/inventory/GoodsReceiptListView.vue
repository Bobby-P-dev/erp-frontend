<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../../components/ui/BaseButton.vue'
import Pagination from '../../components/ui/Pagination.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import KpiCard from '../../components/ui/KpiCard.vue'
import TabNavigation from '../../components/ui/TabNavigation.vue'
import RecordGoodsReceiptModal from '../../components/inventory/RecordGoodsReceiptModal.vue'
import GoodsReceiptHandoverModal from '../../components/inventory/GoodsReceiptHandoverModal.vue'

import { useDataTable } from '../../composables/useDataTable.js'
import { useFormatter } from '../../composables/useFormatter.js'
import { getGoodsReceipts } from '../../services/inventoryServices.js'
import {
    Boxes,
    Package,
    Plus,
    Search,
    X,
    Calendar,
    Eye,
    Truck,
    CheckCircle2,
    XCircle,
    Clock,
    Check
} from '@lucide/vue'

const router = useRouter()
const { formatDate, formatDateTime } = useFormatter()

// 1. Data Table Composable
const {
    items,
    isLoading,
    searchQuery,
    filters,
    pagination,
    counts,
    fetchData,
    handlePageChange
} = useDataTable(
    (search, page, perPage, activeFilters) => {
        return getGoodsReceipts(search, page, {
            ...activeFilters,
            per_page: perPage
        })
    },
    {
        initialFilters: {
            status: '',
            receipt_date: '',
            handover_status: ''
        },
        initialPerPage: 10
    }
)

// 2. Modals State
const showHandoverModal = ref(false)
const handoverTarget = ref(null)
const showRecordModal = ref(false)

const openHandoverDialog = (item) => {
    handoverTarget.value = item
    showHandoverModal.value = true
}

const goToDetail = (id) => {
    router.push({ name: 'user.inventory.goods-receipts.detail', params: { id } })
}

// 3. Metrics & Tabs
const kpiMetrics = computed(() => {
    let totalReceipts = counts.value.total || pagination.value.total || items.value.length
    let pendingPickup = counts.value.pending_pickup || 0
    let handedOver = counts.value.handed_over || 0
    let totalUnitsAccepted = 0

    items.value.forEach(item => {
        const itemRows = item.items || []
        itemRows.forEach(row => {
            const acc = parseFloat(row.quantity_accepted) || 0
            totalUnitsAccepted += acc
        })
    })

    return {
        totalReceipts,
        pendingPickup,
        handedOver,
        totalUnitsAccepted
    }
})

const handoverTabs = computed(() => [
    { id: '', label: 'Semua Penerimaan', count: counts.value.total ?? pagination.value.total },
    { id: 'pending_pickup', label: 'Sampai di Gudang (Belum Diambil)', count: counts.value.pending_pickup ?? 0, icon: Clock, color: 'amber' },
    { id: 'handed_over', label: 'Sudah Diambil Pemohon', count: counts.value.handed_over ?? 0, icon: CheckCircle2, color: 'emerald' }
])

const getItemSummary = (item) => {
    let accepted = 0
    let rejected = 0
    ;(item.items || []).forEach(row => {
        accepted += parseFloat(row.quantity_accepted) || 0
        rejected += parseFloat(row.quantity_rejected) || 0
    })
    return { accepted, rejected }
}
</script>

<template>
    <div class="space-y-6">
        <!-- 1. Header & Quick Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                        <Boxes class="w-5 h-5" />
                    </span>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
                            Penerimaan Barang (Goods Receipts)
                        </h1>
                        <p class="text-sm text-slate-500 mt-0.5">
                            Pencatatan barang fisik yang tiba di gudang, verifikasi surat jalan, dan serah terima ke pemohon.
                        </p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-2.5">
                <BaseButton
                    variant="primary"
                    size="md"
                    @click="showRecordModal = true"
                    class="shadow-xs flex items-center gap-2"
                >
                    <Plus class="w-4 h-4" />
                    <span>Catat Penerimaan Barang Baru</span>
                </BaseButton>
            </div>
        </div>

        <!-- 2. KPI Metrics Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
                title="Total Penerimaan Barang"
                :value="kpiMetrics.totalReceipts"
                unit="Dokumen"
                :icon="Package"
                variant="blue"
            />
            <KpiCard
                title="Sampai di Gudang (Belum Diambil)"
                :value="kpiMetrics.pendingPickup"
                unit="Dokumen"
                :icon="Clock"
                variant="amber"
                :clickable="true"
                @click="filters.handover_status = 'pending_pickup'"
            />
            <KpiCard
                title="Sudah Diambil Pemohon"
                :value="kpiMetrics.handedOver"
                unit="Selesai"
                :icon="CheckCircle2"
                variant="emerald"
                :clickable="true"
                @click="filters.handover_status = 'handed_over'"
            />
            <KpiCard
                title="Total Fisik Unit Diterima"
                :value="kpiMetrics.totalUnitsAccepted"
                unit="Unit"
                :icon="Boxes"
                variant="slate"
            />
        </div>

        <!-- 3. Status Tabs & Filters -->
        <div class="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
            <div class="border-b border-slate-200 bg-slate-50/80 px-4 pt-3">
                <TabNavigation
                    v-model="filters.handover_status"
                    :tabs="handoverTabs"
                    variant="underline"
                />
            </div>

            <!-- Filter Controls -->
            <div class="p-4 flex flex-col sm:flex-row gap-3">
                <div class="relative flex-1">
                    <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Cari No. GRN, surat jalan vendor, kurir, pemohon, atau PR..."
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

                <div class="sm:w-48">
                    <select
                        v-model="filters.status"
                        class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    >
                        <option value="">Semua Kondisi Fisik</option>
                        <option value="completed">Diterima Lengkap</option>
                        <option value="partial">Diterima Sebagian</option>
                    </select>
                </div>

                <div class="sm:w-44">
                    <input
                        v-model="filters.receipt_date"
                        type="date"
                        class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    />
                </div>
            </div>

            <!-- 4. Data Table -->
            <div class="overflow-x-auto border-t border-slate-200/80">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                            <th class="py-3 px-4">No. GRN</th>
                            <th class="py-3 px-4">Tanggal Terima</th>
                            <th class="py-3 px-4">Surat Jalan / Kurir</th>
                            <th class="py-3 px-4">Dokumen Acuan</th>
                            <th class="py-3 px-4">Pemeriksaan Fisik</th>
                            <th class="py-3 px-4">Status Pengambilan Pemohon</th>
                            <th class="py-3 px-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-sm">
                        <tr v-if="isLoading" class="bg-white">
                            <td colspan="7" class="py-12 text-center text-slate-400">
                                <div class="inline-flex items-center gap-2 font-medium">
                                    <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    Memuat data penerimaan barang fisik...
                                </div>
                            </td>
                        </tr>

                        <tr v-else-if="items.length === 0" class="bg-white">
                            <td colspan="7" class="py-14 text-center">
                                <div class="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center border border-slate-200/60 mb-2">
                                    <Boxes class="w-6 h-6" />
                                </div>
                                <p class="text-base font-semibold text-slate-700">Belum ada data penerimaan barang</p>
                                <p class="text-xs text-slate-400 mt-1">Coba sesuaikan tab filter atau klik "Catat Penerimaan Barang Baru".</p>
                            </td>
                        </tr>

                        <tr
                            v-else
                            v-for="item in items"
                            :key="item.id"
                            class="hover:bg-slate-50/60 transition-colors"
                        >
                            <!-- No GRN -->
                            <td class="py-3.5 px-4 font-mono font-bold text-blue-600">
                                <button
                                    type="button"
                                    @click="goToDetail(item.id)"
                                    class="hover:underline text-left cursor-pointer text-sm"
                                >
                                    {{ item.grn_number }}
                                </button>
                                <div class="text-[11px] text-slate-400 font-sans mt-0.5">
                                    Petugas: {{ item.received_by_user?.name || '-' }}
                                </div>
                            </td>

                            <!-- Tanggal Terima -->
                            <td class="py-3.5 px-4 text-slate-700 font-medium">
                                {{ formatDate(item.receipt_date) }}
                            </td>

                            <!-- No Surat Jalan / Resi -->
                            <td class="py-3.5 px-4">
                                <div class="font-mono font-semibold text-slate-800">
                                    {{ item.delivery_note_number || '-' }}
                                </div>
                                <div v-if="item.shipping_carrier" class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Truck class="w-3.5 h-3.5 text-slate-400" />
                                    {{ item.shipping_carrier }}
                                </div>
                            </td>

                            <!-- Dokumen Acuan -->
                            <td class="py-3.5 px-4">
                                <div v-if="item.direct_purchase" class="font-mono font-bold text-slate-800">
                                    {{ item.direct_purchase.dp_number }}
                                </div>
                                <div v-if="item.purchase_requisition" class="text-xs font-mono text-blue-600 mt-0.5">
                                    PR: {{ item.purchase_requisition.pr_number }}
                                </div>
                                <div class="text-[11px] text-slate-500">
                                    Pemohon: {{ item.purchase_requisition?.requester?.name || item.direct_purchase?.supplier?.name || '-' }}
                                </div>
                            </td>

                            <!-- Pemeriksaan Fisik -->
                            <td class="py-3.5 px-4">
                                <div class="flex items-center gap-2">
                                    <span class="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                                        <CheckCircle2 class="w-3.5 h-3.5" />
                                        {{ getItemSummary(item).accepted }} Baik
                                    </span>
                                    <span
                                        v-if="getItemSummary(item).rejected > 0"
                                        class="inline-flex items-center gap-1 text-rose-700 font-semibold text-xs"
                                    >
                                        <XCircle class="w-3.5 h-3.5" />
                                        {{ getItemSummary(item).rejected }} Ditolak
                                    </span>
                                </div>
                            </td>

                            <!-- Status Penyerahan ke Pemohon (Handover) -->
                            <td class="py-3.5 px-4">
                                <div class="flex flex-col gap-1 items-start">
                                    <StatusBadge
                                        :status="item.handover_status === 'handed_over' ? 'handed_over' : 'pending_pickup'"
                                        size="sm"
                                    />

                                    <div v-if="item.handover_status === 'handed_over'" class="text-[11px] text-slate-500">
                                        <span>Diambil oleh: <strong>{{ item.received_by_requester_user?.name || 'Pemohon' }}</strong></span>
                                        <span v-if="item.handed_over_at" class="block text-slate-400">
                                            {{ formatDateTime(item.handed_over_at) }}
                                        </span>
                                    </div>
                                    <div v-else class="text-[11px] text-amber-700">
                                        <span>Menunggu pemohon: <strong>{{ item.purchase_requisition?.requester?.name || '-' }}</strong></span>
                                    </div>
                                </div>
                            </td>

                            <!-- Aksi -->
                            <td class="py-3.5 px-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <!-- Tombol Serahkan Barang (Jika belum diambil) -->
                                    <button
                                        v-if="item.handover_status !== 'handed_over'"
                                        type="button"
                                        @click="openHandoverDialog(item)"
                                        class="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                        title="Catat serah terima barang ke pemohon"
                                    >
                                        <Check class="w-3.5 h-3.5" />
                                        Serahkan Barang
                                    </button>

                                    <button
                                        type="button"
                                        @click="goToDetail(item.id)"
                                        class="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        <Eye class="w-3.5 h-3.5" />
                                        Detail
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

        <!-- 5. Modal Catat Penerimaan Baru -->
        <RecordGoodsReceiptModal
            v-model="showRecordModal"
            @saved="fetchData(1)"
        />

        <!-- 6. Modal Serah Terima Barang (Handover Modal) Component -->
        <GoodsReceiptHandoverModal
            v-model="showHandoverModal"
            :target="handoverTarget"
            @saved="fetchData(pagination.current_page)"
        />
    </div>
</template>
