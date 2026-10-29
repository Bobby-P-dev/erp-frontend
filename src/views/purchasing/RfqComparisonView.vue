<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { getRfqComparisonMatrix, awardRfq } from '../../services/rfqServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { formatCurrency, formatDate } from '../../composables/useFormatter.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

import {
    Home,
    ChevronRight,
    ArrowLeft,
    Scale,
    Trophy,
    Award,
    RefreshCw,
    TrendingDown,
    TrendingUp,
    Clock,
    Zap,
    CheckCircle2,
    AlertTriangle,
    FileText,
    ExternalLink,
    Check,
    X,
    Building2,
    Package,
    Users,
    Info,
    Split,
    Layers
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

const rfqId = computed(() => route.params.id)

const loading = ref(false)
const matrixData = ref(null)

// Awarding Modal State
const isAwardModalOpen = ref(false)
const awardingSubmitting = ref(false)
const awardMode = ref('split') // 'full' | 'split'

// Full awarding form
const selectedFullSupplierId = ref('')
const fullAwardNotes = ref('')

// Split awarding form
// keyed by rfq_item_id: { quotation_id, quotation_item_id, awarded_quantity, unit_price, max_offered, notes }
const splitAwards = ref({})

// Fetch Matrix Data
const fetchMatrix = async () => {
    loading.value = true
    try {
        const response = await getRfqComparisonMatrix(rfqId.value)
        matrixData.value = response.data || response
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal memuat matriks komparasi penawaran RFQ')
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchMatrix()
})

const rfq = computed(() => matrixData.value?.rfq || null)
const statistics = computed(() => matrixData.value?.statistics || {})
const suppliers = computed(() => matrixData.value?.suppliers || [])
const itemsMatrix = computed(() => matrixData.value?.items_matrix || [])

// Check if awarding can be performed
const canAward = computed(() => {
    if (!rfq.value) return false
    const status = rfq.value.status
    const isAllowedStatus = status === 'published' || status === 'evaluation'
    const hasQuotations = suppliers.value.length > 0
    return isAllowedStatus && hasQuotations
})

// Initialize Awarding Modal
const openAwardModal = () => {
    if (!suppliers.value || suppliers.value.length === 0) {
        showError('Belum ada penawaran vendor yang masuk untuk dievaluasi!')
        return
    }

    // Preselect first supplier for Full Awarding
    selectedFullSupplierId.value = suppliers.value[0]?.quotation_id || ''
    fullAwardNotes.value = ''

    // Initialize Split Awarding state for each RFQ Item
    const splits = {}
    itemsMatrix.value.forEach(item => {
        // Find best quote (lowest price or already awarded)
        let defaultQuotationId = ''
        let defaultQuoteItemId = null
        let defaultUnitPrice = 0
        let defaultMaxOffered = 0
        let defaultQty = item.target_quantity

        // Prioritize vendor that quoted lowest price
        for (const [quoteIdStr, offer] of Object.entries(item.vendor_offers || {})) {
            if (offer.quoted) {
                if (!defaultQuotationId || offer.is_lowest_price || offer.is_awarded) {
                    defaultQuotationId = Number(quoteIdStr)
                    defaultQuoteItemId = offer.supplier_quotation_item_id
                    defaultUnitPrice = offer.unit_price
                    defaultMaxOffered = offer.offered_quantity
                    defaultQty = offer.is_awarded ? offer.awarded_quantity : Math.min(item.target_quantity, offer.offered_quantity)
                }
            }
        }

        splits[item.rfq_item_id] = {
            quotation_id: defaultQuotationId,
            quotation_item_id: defaultQuoteItemId,
            awarded_quantity: defaultQty,
            unit_price: defaultUnitPrice,
            max_offered: defaultMaxOffered,
            target_quantity: item.target_quantity,
            notes: ''
        }
    })

    splitAwards.value = splits
    isAwardModalOpen.value = true
}

const closeAwardModal = () => {
    isAwardModalOpen.value = false
}

// When vendor selection changes in Split Awarding mode
const onSplitVendorChange = (rfqItemId) => {
    const split = splitAwards.value[rfqItemId]
    if (!split) return

    if (!split.quotation_id) {
        split.quotation_item_id = null
        split.awarded_quantity = 0
        split.unit_price = 0
        split.max_offered = 0
        return
    }

    const item = itemsMatrix.value.find(i => i.rfq_item_id === rfqItemId)
    if (!item) return

    const offer = item.vendor_offers?.[split.quotation_id]
    if (offer && offer.quoted) {
        split.quotation_item_id = offer.supplier_quotation_item_id
        split.unit_price = offer.unit_price
        split.max_offered = offer.offered_quantity
        split.awarded_quantity = Math.min(item.target_quantity, offer.offered_quantity)
    }
}

// Validation for Split Awarding
const splitValidationErrors = computed(() => {
    const errors = []
    if (awardMode.value !== 'split') return errors

    for (const item of itemsMatrix.value) {
        const split = splitAwards.value[item.rfq_item_id]
        if (!split || !split.quotation_id) {
            continue
        }

        const qty = Number(split.awarded_quantity) || 0
        if (qty <= 0) {
            errors.push(`Kuantitas pemenang untuk item '${item.item_name}' harus lebih dari 0.`)
        } else if (qty > item.target_quantity) {
            errors.push(`Kuantitas pemenang (${qty}) melebihi target kebutuhan (${item.target_quantity}) untuk '${item.item_name}'.`)
        } else if (split.max_offered && qty > split.max_offered) {
            errors.push(`Kuantitas pemenang (${qty}) melebihi kuantitas yang ditawarkan vendor (${split.max_offered}) untuk '${item.item_name}'.`)
        }
    }
    return errors
})

// Summary metrics inside Awarding Modal
const fullAwardSummary = computed(() => {
    if (!selectedFullSupplierId.value) return null
    const sup = suppliers.value.find(s => s.quotation_id === Number(selectedFullSupplierId.value))
    return sup || null
})

const splitAwardTotalCost = computed(() => {
    let total = 0
    for (const rfqItemId in splitAwards.value) {
        const split = splitAwards.value[rfqItemId]
        if (split && split.quotation_id && split.awarded_quantity > 0) {
            total += Number(split.awarded_quantity) * Number(split.unit_price)
        }
    }
    return total
})

const splitAwardCount = computed(() => {
    let count = 0
    for (const rfqItemId in splitAwards.value) {
        const split = splitAwards.value[rfqItemId]
        if (split && split.quotation_id && Number(split.awarded_quantity) > 0) {
            count++
        }
    }
    return count
})

// Submit Awarding
const submitAward = async () => {
    let awardsPayload = []

    if (awardMode.value === 'full') {
        if (!selectedFullSupplierId.value) {
            showError('Silakan pilih rekanan pemenang tender!')
            return
        }

        const quoteId = Number(selectedFullSupplierId.value)
        for (const item of itemsMatrix.value) {
            const offer = item.vendor_offers?.[quoteId]
            if (offer && offer.quoted && offer.supplier_quotation_item_id) {
                awardsPayload.push({
                    supplier_quotation_item_id: offer.supplier_quotation_item_id,
                    awarded_quantity: Math.min(item.target_quantity, offer.offered_quantity),
                    notes: fullAwardNotes.value || 'Pemenang Tunggal (Full Awarding)'
                })
            }
        }

        if (awardsPayload.length === 0) {
            showError('Vendor terpilih tidak memiliki penawaran valid pada rincian item!')
            return
        }
    } else {
        // Split Mode
        if (splitValidationErrors.value.length > 0) {
            showError(splitValidationErrors.value[0])
            return
        }

        for (const item of itemsMatrix.value) {
            const split = splitAwards.value[item.rfq_item_id]
            if (split && split.quotation_id && split.quotation_item_id && Number(split.awarded_quantity) > 0) {
                awardsPayload.push({
                    supplier_quotation_item_id: split.quotation_item_id,
                    awarded_quantity: Number(split.awarded_quantity),
                    notes: split.notes || 'Penetapan Pembagian Item (Split Awarding)'
                })
            }
        }

        if (awardsPayload.length === 0) {
            showError('Setidaknya harus ada satu item barang yang dimenangkan!')
            return
        }
    }

    const confirmed = await showConfirm(
        'Konfirmasi Penetapan Pemenang Tender?',
        `Anda akan menetapkan ${awardsPayload.length} item pemenang dengan skema ${awardMode.value === 'full' ? 'Pemenang Tunggal' : 'Split Awarding'}. Proses ini akan memperbarui status penawaran vendor dan tender RFQ.`
    )
    if (!confirmed) return

    awardingSubmitting.value = true
    try {
        await awardRfq(rfqId.value, { awards: awardsPayload })
        await showSuccess('Pemenang tender RFQ berhasil ditetapkan!')
        closeAwardModal()
        fetchMatrix()
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal menetapkan pemenang tender')
    } finally {
        awardingSubmitting.value = false
    }
}
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header & Action Bar -->
        <PageHeader
            :title="matrixData?.rfq ? `Matriks Komparasi Penawaran — ${matrixData.rfq.rfq_number}` : 'Matriks Komparasi Tender RFQ'"
            subtitle="Komparasi penawaran harga sisi-ke-sisi, deviasi HPS, dan penetapan pemenang tender"
        >
            <template #breadcrumbs>
                <div class="flex items-center gap-2 text-xs text-slate-500">
                    <RouterLink :to="{ name: 'user.dashboard' }" class="hover:text-blue-600">
                        <Home class="w-3.5 h-3.5" />
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span>Purchasing</span>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <RouterLink :to="{ name: 'user.purchasing.rfq' }" class="hover:text-blue-600">
                        Tender RFQ
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <RouterLink 
                        v-if="matrixData?.rfq"
                        :to="{ name: 'user.purchasing.rfq.detail', params: { id: matrixData.rfq.id } }" 
                        class="hover:text-blue-600"
                    >
                        {{ matrixData.rfq.rfq_number }}
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span class="text-slate-800 font-medium">Matriks Komparasi</span>
                </div>
            </template>

            <template #actions>
                <div class="flex items-center gap-2.5">
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="router.push({ name: 'user.purchasing.rfq.detail', params: { id: rfqId } })"
                        class="text-slate-600"
                    >
                        <ArrowLeft class="w-4 h-4 mr-1.5" />
                        Detail RFQ
                    </BaseButton>

                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="fetchMatrix"
                        :disabled="loading"
                    >
                        <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': loading }" />
                        Segarkan
                    </BaseButton>

                    <!-- Awarding CTA Button -->
                    <BaseButton
                        v-if="canAward"
                        variant="primary"
                        size="sm"
                        @click="openAwardModal"
                        class="bg-blue-600 hover:bg-blue-700 shadow-sm"
                    >
                        <Trophy class="w-4 h-4 mr-1.5 text-amber-300" />
                        Tentukan Pemenang Tender (Awarding)
                    </BaseButton>

                    <div v-else-if="rfq?.is_awarded" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Award class="w-4 h-4 text-emerald-600" />
                        Pemenang Telah Ditetapkan
                    </div>
                </div>
            </template>
        </PageHeader>

        <!-- Loading State -->
        <div v-if="loading && !matrixData" class="p-12 text-center bg-white rounded-xl border border-slate-200">
            <RefreshCw class="w-8 h-8 mx-auto text-blue-600 animate-spin mb-3" />
            <p class="text-sm text-slate-500 font-medium">Mempersiapkan matriks komparasi penawaran vendor...</p>
        </div>

        <template v-else-if="matrixData">
            <!-- Top Metrics Bento Dock -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span class="text-xs text-slate-400 block font-medium">Status Tender</span>
                        <div class="mt-1 flex items-center gap-2">
                            <StatusBadge :status="rfq.status" />
                            <span v-if="rfq.is_awarded" class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Awarded
                            </span>
                        </div>
                    </div>
                    <Scale class="w-7 h-7 text-blue-500/30" />
                </div>

                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span class="text-xs text-slate-400 block font-medium">Total Rincian Item</span>
                        <div class="text-lg font-bold text-slate-800 mt-0.5 font-mono">
                            {{ statistics.total_items || itemsMatrix.length }} Item
                        </div>
                    </div>
                    <Package class="w-7 h-7 text-indigo-500/30" />
                </div>

                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span class="text-xs text-slate-400 block font-medium">Vendor Diundang</span>
                        <div class="text-lg font-bold text-slate-800 mt-0.5 font-mono">
                            {{ statistics.total_suppliers_invited || 0 }} Rekanan
                        </div>
                    </div>
                    <Users class="w-7 h-7 text-blue-500/30" />
                </div>

                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span class="text-xs text-slate-400 block font-medium">Penawaran Masuk</span>
                        <div class="text-lg font-bold text-emerald-700 mt-0.5 font-mono">
                            {{ statistics.total_quotations_received || suppliers.length }} Penawaran
                        </div>
                    </div>
                    <CheckCircle2 class="w-7 h-7 text-emerald-500/30" />
                </div>
            </div>

            <!-- Empty State if no quotations -->
            <div v-if="suppliers.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Scale class="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 class="text-base font-bold text-slate-800">Belum Ada Penawaran Masuk</h3>
                <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Vendor yang diundang belum mengirimkan surat penawaran harga. Anda dapat mencatat penawaran secara manual di halaman Detail RFQ.
                </p>
                <div class="mt-4">
                    <BaseButton
                        variant="primary"
                        size="sm"
                        @click="router.push({ name: 'user.purchasing.rfq.detail', params: { id: rfqId } })"
                    >
                        Buka Detail RFQ & Input Penawaran
                    </BaseButton>
                </div>
            </div>

            <!-- Matrix Comparison Table (ERPNext Horizontal Scrollable with Sticky Left Columns) -->
            <div v-else class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div class="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Matriks Komparasi Penawaran Sisi-ke-Sisi</span>
                        <span class="text-xs text-slate-500">
                            (Harga dalam IDR, membandingkan rincian item terhadap HPS dan penawaran rekanan)
                        </span>
                    </div>

                    <!-- Legend -->
                    <div class="flex items-center gap-4 text-[11px]">
                        <div class="flex items-center gap-1.5">
                            <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span class="text-slate-600 font-medium">Harga Terendah</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                            <span class="text-slate-600 font-medium">Terkirim Tercepat</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-3 h-3 rounded-full bg-amber-400"></span>
                            <span class="text-slate-600 font-medium">Pemenang Ditetapkan</span>
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse min-w-[900px]">
                        <!-- Column Grouping Header -->
                        <thead>
                            <tr class="bg-slate-100 border-b border-slate-200 text-slate-700">
                                <!-- Sticky Left Column Headers -->
                                <th class="py-3 px-3 text-xs font-semibold w-10 text-center sticky left-0 bg-slate-100 z-20 shadow-xs">
                                    No
                                </th>
                                <th class="py-3 px-3 text-xs font-semibold w-64 sticky left-10 bg-slate-100 z-20 shadow-xs">
                                    Deskripsi Barang / Spesifikasi
                                </th>
                                <th class="py-3 px-3 text-xs font-semibold w-16 text-center sticky left-74 bg-slate-100 z-20 shadow-xs">
                                    Satuan
                                </th>
                                <th class="py-3 px-3 text-xs font-semibold w-24 text-right sticky left-90 bg-slate-100 z-20 shadow-xs">
                                    Target Qty
                                </th>
                                <th class="py-3 px-3 text-xs font-semibold w-32 text-right sticky left-114 bg-slate-100 z-20 shadow-r border-r-2 border-slate-300">
                                    HPS Satuan
                                </th>

                                <!-- Dynamic Columns for Each Supplier Quotation -->
                                <th 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-3 px-4 text-xs font-semibold min-w-[240px] max-w-[280px] border-r border-slate-200"
                                >
                                    <div class="flex items-start justify-between gap-2">
                                        <div>
                                            <div class="font-bold text-slate-900 line-clamp-1">{{ sup.supplier_name }}</div>
                                            <div class="text-[11px] text-slate-500 font-mono mt-0.5">
                                                {{ sup.vendor_quotation_reference || sup.quotation_number }}
                                            </div>
                                        </div>
                                        <span 
                                            v-if="sup.evaluation_status === 'awarded'" 
                                            class="shrink-0 text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300"
                                        >
                                            Menang
                                        </span>
                                        <span 
                                            v-else-if="sup.evaluation_status === 'partially_awarded'" 
                                            class="shrink-0 text-[10px] uppercase font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-300"
                                        >
                                            Parsial
                                        </span>
                                    </div>
                                    <div class="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                                        <span>TOP: {{ sup.payment_terms || '-' }}</span>
                                        <span v-if="sup.lead_time_days !== null">LT: {{ sup.lead_time_days }} hr</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>

                        <!-- Item Matrix Rows -->
                        <tbody class="divide-y divide-slate-100 text-xs">
                            <tr 
                                v-for="(item, idx) in itemsMatrix" 
                                :key="item.rfq_item_id"
                                class="hover:bg-slate-50/70 transition-colors"
                            >
                                <!-- Sticky Left Cells -->
                                <td class="py-3 px-3 text-center text-slate-500 font-medium sticky left-0 bg-white z-10 shadow-xs">
                                    {{ idx + 1 }}
                                </td>
                                <td class="py-3 px-3 sticky left-10 bg-white z-10 shadow-xs">
                                    <div class="font-semibold text-slate-900">{{ item.item_name }}</div>
                                    <div class="text-[11px] text-slate-500 font-mono">{{ item.item_code || '-' }}</div>
                                    <div v-if="item.item_specifications" class="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                                        {{ item.item_specifications }}
                                    </div>
                                </td>
                                <td class="py-3 px-3 text-center text-slate-600 sticky left-74 bg-white z-10 shadow-xs">
                                    {{ item.unit_name || 'Unit' }}
                                </td>
                                <td class="py-3 px-3 text-right font-mono font-semibold text-slate-800 sticky left-90 bg-white z-10 shadow-xs">
                                    {{ Number(item.target_quantity).toLocaleString('id-ID') }}
                                </td>
                                <td class="py-3 px-3 text-right font-mono text-slate-700 sticky left-114 bg-white z-10 shadow-r border-r-2 border-slate-300">
                                    {{ item.target_price ? formatCurrency(item.target_price) : '-' }}
                                </td>

                                <!-- Dynamic Offer Cells per Supplier -->
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-3 px-4 border-r border-slate-200 align-top"
                                    :class="{
                                        'bg-emerald-50/30': item.vendor_offers?.[sup.quotation_id]?.is_awarded
                                    }"
                                >
                                    <template v-if="item.vendor_offers?.[sup.quotation_id]?.quoted">
                                        <div class="space-y-1.5">
                                            <!-- Price & Badges Row -->
                                            <div class="flex items-center justify-between gap-1">
                                                <span class="font-bold font-mono text-slate-900 text-sm">
                                                    {{ formatCurrency(item.vendor_offers[sup.quotation_id].unit_price) }}
                                                </span>

                                                <!-- Lowest Price Badge -->
                                                <span 
                                                    v-if="item.vendor_offers[sup.quotation_id].is_lowest_price"
                                                    class="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-1 shrink-0"
                                                    title="Harga penawaran terendah untuk item ini"
                                                >
                                                    <Zap class="w-3 h-3 fill-emerald-600" />
                                                    Terendah
                                                </span>
                                            </div>

                                            <!-- Deviation vs HPS -->
                                            <div 
                                                v-if="item.vendor_offers[sup.quotation_id].delta_percentage !== null"
                                                class="text-[11px] font-medium flex items-center gap-1"
                                                :class="item.vendor_offers[sup.quotation_id].is_below_target ? 'text-emerald-700' : 'text-rose-600'"
                                            >
                                                <TrendingDown v-if="item.vendor_offers[sup.quotation_id].is_below_target" class="w-3 h-3 shrink-0" />
                                                <TrendingUp v-else class="w-3 h-3 shrink-0" />
                                                <span>
                                                    {{ item.vendor_offers[sup.quotation_id].is_below_target ? '▼' : '▲' }}
                                                    {{ Math.abs(item.vendor_offers[sup.quotation_id].delta_percentage) }}% vs HPS
                                                </span>
                                            </div>

                                            <!-- Delivery Speed & Brand -->
                                            <div class="text-[11px] text-slate-500 flex items-center justify-between pt-0.5">
                                                <div class="flex items-center gap-1">
                                                    <Clock class="w-3 h-3 text-slate-400" />
                                                    <span>{{ item.vendor_offers[sup.quotation_id].lead_time_days !== null ? `${item.vendor_offers[sup.quotation_id].lead_time_days} hari` : '-' }}</span>
                                                </div>

                                                <span 
                                                    v-if="item.vendor_offers[sup.quotation_id].is_fastest_delivery"
                                                    class="bg-blue-100 text-blue-800 border border-blue-300 font-bold px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-0.5"
                                                    title="Waktu pengiriman tercepat"
                                                >
                                                    Tercepat
                                                </span>
                                            </div>

                                            <!-- Brand & Spec notes if any -->
                                            <div v-if="item.vendor_offers[sup.quotation_id].brand" class="text-[11px] text-slate-600 font-medium truncate">
                                                Merk: {{ item.vendor_offers[sup.quotation_id].brand }}
                                            </div>

                                            <!-- Awarded Tag if awarded -->
                                            <div 
                                                v-if="item.vendor_offers[sup.quotation_id].is_awarded"
                                                class="mt-1 p-1 bg-amber-50 border border-amber-200 rounded text-center text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1"
                                            >
                                                <Trophy class="w-3 h-3 text-amber-600" />
                                                Menang: {{ item.vendor_offers[sup.quotation_id].awarded_quantity }} {{ item.unit_name }}
                                            </div>
                                        </div>
                                    </template>

                                    <!-- Not quoted -->
                                    <template v-else>
                                        <div class="py-4 text-center text-slate-300 text-xs italic">
                                            Tidak mengajukan
                                        </div>
                                    </template>
                                </td>
                            </tr>
                        </tbody>

                        <!-- Sticky Commercial Summary Footer -->
                        <tfoot class="bg-slate-50 border-t-2 border-slate-300 text-xs">
                            <!-- Row 1: Subtotal Barang -->
                            <tr class="border-b border-slate-200">
                                <td colspan="5" class="py-2.5 px-4 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r-2 border-slate-300">
                                    Subtotal Penawaran Barang
                                </td>
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-2.5 px-4 font-mono font-medium text-slate-800 border-r border-slate-200"
                                >
                                    {{ formatCurrency(sup.subtotal) }}
                                </td>
                            </tr>

                            <!-- Row 2: Pajak / PPN -->
                            <tr class="border-b border-slate-200">
                                <td colspan="5" class="py-2.5 px-4 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r-2 border-slate-300">
                                    Pajak Pertambahan Nilai (PPN)
                                </td>
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-2.5 px-4 font-mono text-slate-600 border-r border-slate-200"
                                >
                                    {{ formatCurrency(sup.tax_amount) }}
                                    <span v-if="sup.tax_rate > 0" class="text-[10px] text-slate-400">({{ sup.tax_rate }}%)</span>
                                </td>
                            </tr>

                            <!-- Row 3: Biaya Pengiriman -->
                            <tr class="border-b border-slate-200">
                                <td colspan="5" class="py-2.5 px-4 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r-2 border-slate-300">
                                    Biaya Pengiriman (Ongkir)
                                </td>
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-2.5 px-4 font-mono text-slate-600 border-r border-slate-200"
                                >
                                    {{ formatCurrency(sup.shipping_cost) }}
                                </td>
                            </tr>

                            <!-- Row 4: Grand Total Komersial (Landed Cost) -->
                            <tr class="border-b-2 border-slate-300 bg-blue-50/40">
                                <td colspan="5" class="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-blue-50/90 z-10 border-r-2 border-slate-300 text-sm">
                                    Total Komersial (Landed Cost)
                                </td>
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-3 px-4 font-mono font-bold text-sm text-blue-700 border-r border-slate-200"
                                >
                                    {{ formatCurrency(sup.total_amount) }}
                                </td>
                            </tr>

                            <!-- Row 5: Term of Payment & Validity -->
                            <tr>
                                <td colspan="5" class="py-2.5 px-4 text-slate-500 sticky left-0 bg-slate-50 z-10 border-r-2 border-slate-300">
                                    Syarat Pembayaran & Masa Berlaku
                                </td>
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-2.5 px-4 text-[11px] text-slate-600 border-r border-slate-200"
                                >
                                    <div><span class="text-slate-400">TOP:</span> {{ sup.payment_terms || '-' }}</div>
                                    <div class="text-[10px] text-slate-500 mt-0.5"><span class="text-slate-400">Berlaku s/d:</span> {{ formatDate(sup.valid_until) || '-' }}</div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </template>

        <!-- Awarding Modal Dialog (Solid overlay, STRICTLY NO backdrop-blur) -->
        <div 
            v-if="isAwardModalOpen"
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
            @click.self="closeAwardModal"
        >
            <div class="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <!-- Modal Header -->
                <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Trophy class="w-5 h-5 text-amber-500" />
                            Penetapan Pemenang Tender (Awarding)
                        </h3>
                        <p class="text-xs text-slate-500 mt-0.5">
                            Pilih skema Pemenang Tunggal (Full Awarding) atau Pembagian Item (Split Awarding).
                        </p>
                    </div>
                    <button
                        type="button"
                        @click="closeAwardModal"
                        class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 overflow-y-auto space-y-6 flex-1">
                    <!-- Mode Selector Tab/Pills -->
                    <div class="flex items-center gap-3 p-1.5 bg-slate-100 rounded-xl max-w-md">
                        <button
                            type="button"
                            @click="awardMode = 'split'"
                            class="flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                            :class="awardMode === 'split' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                        >
                            <Split class="w-4 h-4" />
                            Split Awarding (Pembagian Item)
                        </button>

                        <button
                            type="button"
                            @click="awardMode = 'full'"
                            class="flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                            :class="awardMode === 'full' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                        >
                            <Trophy class="w-4 h-4" />
                            Full Awarding (Pemenang Tunggal)
                        </button>
                    </div>

                    <!-- Mode A: Full Awarding -->
                    <div v-if="awardMode === 'full'" class="space-y-4">
                        <div class="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                Pilih Vendor Pemenang Seluruh Item Tender
                            </label>

                            <select
                                v-model="selectedFullSupplierId"
                                class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500 bg-white"
                            >
                                <option 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id" 
                                    :value="sup.quotation_id"
                                >
                                    {{ sup.supplier_name }} — Total: {{ formatCurrency(sup.total_amount) }} (TOP: {{ sup.payment_terms || '-' }})
                                </option>
                            </select>

                            <div v-if="fullAwardSummary" class="mt-3 pt-3 border-t border-blue-200/60 grid grid-cols-3 gap-3 text-xs">
                                <div>
                                    <span class="text-slate-500 block">Subtotal Penawaran:</span>
                                    <span class="font-bold text-slate-800 font-mono">{{ formatCurrency(fullAwardSummary.subtotal) }}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block">Biaya Ongkir & Pajak:</span>
                                    <span class="font-bold text-slate-800 font-mono">{{ formatCurrency(fullAwardSummary.tax_amount + fullAwardSummary.shipping_cost) }}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block">Grand Total:</span>
                                    <span class="font-bold text-blue-700 font-mono">{{ formatCurrency(fullAwardSummary.total_amount) }}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">
                                Catatan Penetapan Pemenang
                            </label>
                            <textarea
                                v-model="fullAwardNotes"
                                rows="2"
                                placeholder="Contoh: Ditetapkan berdasarkan pertimbangan harga terendah dan ketersediaan stok tercepat."
                                class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                            ></textarea>
                        </div>
                    </div>

                    <!-- Mode B: Split Awarding -->
                    <div v-if="awardMode === 'split'" class="space-y-4">
                        <div class="text-xs text-slate-600">
                            Pilih vendor pemenang dan alokasi kuantitas untuk masing-masing item pengadaan.
                        </div>

                        <!-- Validation Error Alert -->
                        <div v-if="splitValidationErrors.length > 0" class="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                            <div class="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                                <AlertTriangle class="w-4 h-4 text-rose-600" />
                                Peringatan Validasi Alokasi Kuantitas:
                            </div>
                            <ul class="text-[11px] text-rose-700 list-disc list-inside space-y-0.5">
                                <li v-for="(err, idx) in splitValidationErrors" :key="idx">{{ err }}</li>
                            </ul>
                        </div>

                        <!-- Items Split Allocation Table -->
                        <div class="border border-slate-200 rounded-xl overflow-hidden">
                            <table class="w-full text-left border-collapse text-xs">
                                <thead class="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th class="py-2.5 px-3 font-semibold">Deskripsi Item</th>
                                        <th class="py-2.5 px-3 font-semibold text-center w-24">Target Qty</th>
                                        <th class="py-2.5 px-3 font-semibold w-56">Vendor Pemenang</th>
                                        <th class="py-2.5 px-3 font-semibold text-right w-32">Kuantitas Menang</th>
                                        <th class="py-2.5 px-3 font-semibold text-right w-32">Harga Satuan</th>
                                        <th class="py-2.5 px-3 font-semibold text-right w-36">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    <tr v-for="item in itemsMatrix" :key="item.rfq_item_id" class="hover:bg-slate-50">
                                        <td class="py-2.5 px-3">
                                            <div class="font-semibold text-slate-900">{{ item.item_name }}</div>
                                            <div class="text-[11px] text-slate-400 font-mono">{{ item.item_code || '-' }}</div>
                                        </td>
                                        <td class="py-2.5 px-3 text-center font-mono font-medium text-slate-700">
                                            {{ item.target_quantity }} {{ item.unit_name }}
                                        </td>
                                        <td class="py-2.5 px-3">
                                            <select
                                                v-if="splitAwards[item.rfq_item_id]"
                                                v-model="splitAwards[item.rfq_item_id].quotation_id"
                                                @change="onSplitVendorChange(item.rfq_item_id)"
                                                class="w-full text-xs rounded border-slate-300 py-1 px-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                <option value="">-- Tidak Dimenangkan --</option>
                                                <template v-for="sup in suppliers" :key="sup.quotation_id">
                                                    <option 
                                                        v-if="item.vendor_offers?.[sup.quotation_id]?.quoted" 
                                                        :value="sup.quotation_id"
                                                    >
                                                        {{ sup.supplier_name }} ({{ formatCurrency(item.vendor_offers[sup.quotation_id].unit_price) }})
                                                    </option>
                                                </template>
                                            </select>
                                        </td>
                                        <td class="py-2.5 px-3 text-right">
                                            <input 
                                                v-if="splitAwards[item.rfq_item_id]?.quotation_id"
                                                type="number"
                                                v-model.number="splitAwards[item.rfq_item_id].awarded_quantity"
                                                min="0.0001"
                                                :max="item.target_quantity"
                                                step="any"
                                                class="w-full text-right text-xs rounded border-slate-300 py-1 px-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                            />
                                            <span v-else class="text-slate-400">-</span>
                                        </td>
                                        <td class="py-2.5 px-3 text-right font-mono text-slate-700">
                                            {{ splitAwards[item.rfq_item_id]?.quotation_id ? formatCurrency(splitAwards[item.rfq_item_id].unit_price) : '-' }}
                                        </td>
                                        <td class="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                            {{ splitAwards[item.rfq_item_id]?.quotation_id ? formatCurrency((Number(splitAwards[item.rfq_item_id].awarded_quantity) || 0) * (Number(splitAwards[item.rfq_item_id].unit_price) || 0)) : '-' }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Split Summary -->
                        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <span class="text-slate-600 font-medium">
                                Total Item Dimenangkan: <strong class="text-slate-900 font-mono">{{ splitAwardCount }}</strong> dari {{ itemsMatrix.length }} Item
                            </span>
                            <span class="text-slate-600 font-medium">
                                Total Nilai Awarded: <strong class="text-blue-700 font-mono text-sm">{{ formatCurrency(splitAwardTotalCost) }}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/70">
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="closeAwardModal"
                        :disabled="awardingSubmitting"
                    >
                        Batal
                    </BaseButton>
                    <BaseButton
                        variant="primary"
                        size="sm"
                        @click="submitAward"
                        :disabled="awardingSubmitting || (awardMode === 'split' && splitValidationErrors.length > 0)"
                        class="bg-blue-600 hover:bg-blue-700"
                    >
                        <RefreshCw v-if="awardingSubmitting" class="w-4 h-4 mr-1.5 animate-spin" />
                        <Check v-else class="w-4 h-4 mr-1.5" />
                        Konfirmasi & Tetapkan Pemenang
                    </BaseButton>
                </div>
            </div>
        </div>
    </div>
</template>
