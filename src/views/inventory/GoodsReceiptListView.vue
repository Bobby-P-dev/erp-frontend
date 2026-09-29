<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../../components/ui/BaseButton.vue'
import Pagination from '../../components/ui/Pagination.vue'
import RecordGoodsReceiptModal from '../../components/inventory/RecordGoodsReceiptModal.vue'
import { getGoodsReceipts, confirmGoodsReceiptHandover } from '../../services/inventoryServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
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
    AlertTriangle,
    XCircle,
    UserCheck,
    FileText,
    ArrowUpRight,
    Clock,
    User,
    SendHorizonal,
    Check
} from '@lucide/vue'

const router = useRouter()

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

// Search & Filter
const searchQuery = ref('')
const statusFilter = ref('')
const selectedDate = ref('')
const handoverFilter = ref('') // '', 'pending_pickup', 'handed_over'

// Counts from backend
const handoverCounts = ref({
    total: 0,
    pending_pickup: 0,
    handed_over: 0
})

// Handover Modal State (Warehouse staff action)
const showHandoverModal = ref(false)
const handoverTarget = ref(null)
const handoverNotes = ref('')
const isSubmittingHandover = ref(false)

// Record GR Modal
const showRecordModal = ref(false)

// KPI Metrics
const kpiMetrics = computed(() => {
    let totalReceipts = handoverCounts.value.total || pagination.value.total || items.value.length
    let pendingPickup = handoverCounts.value.pending_pickup || 0
    let handedOver = handoverCounts.value.handed_over || 0
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

// Fetch Data
const fetchData = async (page = 1) => {
    isLoading.value = true
    try {
        const filters = {}
        if (statusFilter.value) filters.status = statusFilter.value
        if (selectedDate.value) filters.receipt_date = selectedDate.value
        if (handoverFilter.value) filters.handover_status = handoverFilter.value

        const response = await getGoodsReceipts(searchQuery.value, page, filters)
        const rawItems = response.data || response || []
        items.value = Array.isArray(rawItems) ? rawItems : []

        if (response.counts) {
            handoverCounts.value = {
                total: response.counts.total ?? 0,
                pending_pickup: response.counts.pending_pickup ?? 0,
                handed_over: response.counts.handed_over ?? 0
            }
        }

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
        console.error('Failed to load goods receipts:', err)
        items.value = []
    } finally {
        isLoading.value = false
    }
}

// Navigate to Detail
const goToDetail = (id) => {
    router.push({ name: 'user.inventory.goods-receipts.detail', params: { id } })
}

// Open Handover Modal
const openHandoverDialog = (item) => {
    handoverTarget.value = item
    handoverNotes.value = ''
    showHandoverModal.value = true
}

// Submit Handover
const submitHandover = async () => {
    if (!handoverTarget.value) return
    const requesterName = handoverTarget.value.purchase_requisition?.requester?.name || 'pemohon'
    const isConfirmed = await showConfirm(
        'Serahkan Barang ke Pemohon?',
        `Konfirmasi bahwa barang dari penerimaan ${handoverTarget.value.grn_number} telah diserahkan dan diambil oleh ${requesterName}. Status PR terkait akan berubah menjadi Selesai (Completed).`,
        'Ya, Konfirmasi Penyerahan'
    )

    if (isConfirmed) {
        isSubmittingHandover.value = true
        try {
            showLoading('Memproses penyerahan barang...')
            await confirmGoodsReceiptHandover(handoverTarget.value.id, {
                notes: handoverNotes.value
            })
            showSuccess('Berhasil!', `Barang telah berhasil diserahkan ke ${requesterName} dan status PR diselesaikan.`)
            showHandoverModal.value = false
            handoverTarget.value = null
            fetchData(pagination.value.current_page)
        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal memproses penyerahan barang.'
            showError('Gagal!', msg, err)
        } finally {
            isSubmittingHandover.value = false
        }
    }
}

// Status helpers
const getStatusBadge = (status) => {
    const st = typeof status === 'object' && status !== null ? status.value : status
    switch (st) {
        case 'completed':
            return {
                label: 'Selesai',
                class: 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }
        case 'partial':
            return {
                label: 'Sebagian',
                class: 'bg-amber-50 text-amber-800 border-amber-200'
            }
        case 'rejected':
            return {
                label: 'Ditolak Total',
                class: 'bg-rose-50 text-rose-700 border-rose-200'
            }
        default:
            return {
                label: st || 'Tercatat',
                class: 'bg-blue-50 text-blue-700 border-blue-200'
            }
    }
}

// Handover Badge helper
const getHandoverBadge = (item) => {
    const status = item?.handover_status
    if (status === 'handed_over') {
        return {
            label: 'Sudah Diambil Pemohon',
            class: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            icon: CheckCircle2,
            isHandedOver: true
        }
    }
    return {
        label: 'Sampai di Gudang (Belum Diambil)',
        class: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold ring-1 ring-amber-400/20',
        icon: Clock,
        isHandedOver: false
    }
}


// Item summary helper
const getItemSummary = (item) => {
    const rows = item.items || []
    if (rows.length === 0) return { accepted: 0, rejected: 0, count: 0 }
    let accepted = 0
    let rejected = 0
    rows.forEach(r => {
        accepted += parseFloat(r.quantity_accepted) || 0
        rejected += parseFloat(r.quantity_rejected) || 0
    })
    return {
        accepted,
        rejected,
        count: rows.length
    }
}

// Watch filters
watch(searchQuery, () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchData(1)
    }, 400)
})

watch([statusFilter, selectedDate, handoverFilter], () => {
    fetchData(1)
})

onMounted(() => {
    fetchData()
})
</script>

<template>
    <div class="space-y-6">
        <!-- Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Inventory', icon: Boxes },
                { label: 'Penerimaan Barang (Goods Receipts)' }
            ]" 
        />

        <!-- 1. Header & Primary Action -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                        <Boxes class="w-6 h-6" />
                    </span>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
                            Penerimaan Barang Fisik (Goods Receipts / GRN)
                        </h1>
                        <p class="text-sm text-slate-600 mt-0.5">
                            Pemeriksaan surat jalan vendor, penerimaan fisik barang masuk gudang, dan pemantauan penyerahan barang ke pemohon.
                        </p>
                    </div>
                </div>
            </div>

            <button
                type="button"
                @click="showRecordModal = true"
                class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
                <Plus class="w-4 h-4" />
                Catat Penerimaan Barang Baru
            </button>
        </div>

        <!-- 2. KPI Metrics Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-2xs flex items-center gap-4">
                <div class="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                    <Package class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-semibold text-slate-500">Total Penerimaan Gudang</p>
                    <p class="text-2xl font-bold text-slate-900 mt-0.5">{{ kpiMetrics.totalReceipts }} <span class="text-xs font-normal text-slate-400">Surat Jalan</span></p>
                </div>
            </div>

            <!-- Belum Diambil Pemohon KPI -->
            <div 
                @click="handoverFilter = 'pending_pickup'"
                class="bg-amber-50/50 border border-amber-200 rounded-xl p-4.5 shadow-2xs flex items-center gap-4 cursor-pointer hover:bg-amber-50 transition-colors"
                :class="{ 'ring-2 ring-amber-500': handoverFilter === 'pending_pickup' }"
            >
                <div class="w-12 h-12 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
                    <Clock class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-bold text-amber-800">Sampai di Gudang (Belum Diambil)</p>
                    <p class="text-2xl font-bold text-amber-900 mt-0.5">{{ kpiMetrics.pendingPickup }} <span class="text-xs font-normal text-amber-700">Menunggu</span></p>
                </div>
            </div>

            <!-- Sudah Diambil Pemohon KPI -->
            <div 
                @click="handoverFilter = 'handed_over'"
                class="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4.5 shadow-2xs flex items-center gap-4 cursor-pointer hover:bg-emerald-50 transition-colors"
                :class="{ 'ring-2 ring-emerald-500': handoverFilter === 'handed_over' }"
            >
                <div class="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                    <CheckCircle2 class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-bold text-emerald-800">Sudah Diambil Pemohon</p>
                    <p class="text-2xl font-bold text-emerald-900 mt-0.5">{{ kpiMetrics.handedOver }} <span class="text-xs font-normal text-emerald-700">Selesai</span></p>
                </div>
            </div>

            <div class="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-2xs flex items-center gap-4">
                <div class="w-12 h-12 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
                    <Boxes class="w-6 h-6" />
                </div>
                <div>
                    <p class="text-xs font-semibold text-slate-500">Total Fisik Unit Diterima</p>
                    <p class="text-2xl font-bold font-mono text-slate-900 mt-0.5">{{ kpiMetrics.totalUnitsAccepted }} <span class="text-xs font-normal text-slate-400">Unit</span></p>
                </div>
            </div>
        </div>

        <!-- 3. Status Tabs (Handover Status Segmented Bar) -->
        <div class="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
            <div class="border-b border-slate-200 bg-slate-50/80 px-4 pt-3 flex items-center gap-2 overflow-x-auto">
                <button
                    type="button"
                    @click="handoverFilter = ''"
                    :class="[
                        handoverFilter === ''
                            ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-2xs'
                            : 'border-transparent text-slate-600 hover:text-slate-900 font-medium',
                        'px-4 py-2.5 text-xs sm:text-sm rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer'
                    ]"
                >
                    <span>Semua Penerimaan</span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
                        {{ handoverCounts.total }}
                    </span>
                </button>

                <button
                    type="button"
                    @click="handoverFilter = 'pending_pickup'"
                    :class="[
                        handoverFilter === 'pending_pickup'
                            ? 'border-amber-600 text-amber-800 bg-white font-bold shadow-2xs'
                            : 'border-transparent text-slate-600 hover:text-amber-800 font-medium',
                        'px-4 py-2.5 text-xs sm:text-sm rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer'
                    ]"
                >
                    <Clock class="w-4 h-4 text-amber-600" />
                    <span>Sampai di Gudang (Belum Diambil)</span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800">
                        {{ handoverCounts.pending_pickup }}
                    </span>
                </button>

                <button
                    type="button"
                    @click="handoverFilter = 'handed_over'"
                    :class="[
                        handoverFilter === 'handed_over'
                            ? 'border-emerald-600 text-emerald-800 bg-white font-bold shadow-2xs'
                            : 'border-transparent text-slate-600 hover:text-emerald-800 font-medium',
                        'px-4 py-2.5 text-xs sm:text-sm rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer'
                    ]"
                >
                    <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                    <span>Sudah Diambil Pemohon</span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                        {{ handoverCounts.handed_over }}
                    </span>
                </button>
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
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X class="w-4 h-4" />
                    </button>
                </div>

                <div class="sm:w-48">
                    <select
                        v-model="statusFilter"
                        class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    >
                        <option value="">Semua Kondisi Fisik</option>
                        <option value="completed">Diterima Lengkap</option>
                        <option value="partial">Diterima Sebagian</option>
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
                                {{ item.receipt_date ? new Date(item.receipt_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' }}
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
                                    <span
                                        :class="[
                                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border',
                                            getHandoverBadge(item).class
                                        ]"
                                    >
                                        <component :is="getHandoverBadge(item).icon" class="w-3.5 h-3.5" />
                                        {{ getHandoverBadge(item).label }}
                                    </span>

                                    <div v-if="item.handover_status === 'handed_over'" class="text-[11px] text-slate-500">
                                        <span>Diambil oleh: <strong>{{ item.received_by_requester_user?.name || 'Pemohon' }}</strong></span>
                                        <span v-if="item.handed_over_at" class="block text-slate-400">
                                            {{ new Date(item.handed_over_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
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
                    @page-change="fetchData"
                />
            </div>
        </div>

        <!-- 5. Modal Catat Penerimaan Baru -->
        <RecordGoodsReceiptModal
            v-model="showRecordModal"
            @saved="fetchData(1)"
        />

        <!-- 6. Modal Serah Terima Barang (Handover Modal) -->
        <div 
            v-if="showHandoverModal" 
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
            @click.self="showHandoverModal = false"
        >
            <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <CheckCircle2 class="w-5 h-5" />
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-slate-900">Serah Terima Barang ke Pemohon</h3>
                            <p class="text-xs text-slate-500">Konfirmasi pengambilan barang fisik oleh pemohon PR</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        @click="showHandoverModal = false"
                        class="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <div class="p-6 space-y-4">
                    <!-- Info Ringkas -->
                    <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-500 font-medium">Nomor Penerimaan:</span>
                            <span class="font-mono font-bold text-blue-600">{{ handoverTarget?.grn_number }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-500 font-medium">Surat Jalan Vendor:</span>
                            <span class="font-mono font-semibold text-slate-800">{{ handoverTarget?.delivery_note_number || '-' }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-500 font-medium">Nomor PR Acuan:</span>
                            <span class="font-mono font-semibold text-slate-800">{{ handoverTarget?.purchase_requisition?.pr_number || '-' }}</span>
                        </div>
                        <div class="flex items-center justify-between pt-1 border-t border-slate-200/80">
                            <span class="text-slate-700 font-bold">Nama Pemohon:</span>
                            <span class="font-bold text-slate-900">{{ handoverTarget?.purchase_requisition?.requester?.name || 'Pemohon Terkait' }}</span>
                        </div>
                    </div>

                    <!-- Catatan Serah Terima -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">
                            Catatan Serah Terima / Pengambilan
                        </label>
                        <textarea
                            v-model="handoverNotes"
                            rows="3"
                            placeholder="Contoh: Barang telah diambil langsung di loket gudang dalam kondisi baik dan lengkap."
                            class="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                        ></textarea>
                    </div>

                    <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                        <Package class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>Dengan mengonfirmasi, status serah terima barang menjadi <strong>Sudah Diambil</strong> dan status Purchase Requisition (PR) pemohon akan diselesaikan secara otomatis.</span>
                    </div>
                </div>

                <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        @click="showHandoverModal = false"
                        class="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg border border-slate-200 bg-white cursor-pointer"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        @click="submitHandover"
                        :disabled="isSubmittingHandover"
                        class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                        <Check class="w-4 h-4" />
                        <span>{{ isSubmittingHandover ? 'Memproses...' : 'Konfirmasi Penyerahan' }}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

