<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { getRfqComparisonMatrix, awardRfq } from '../../services/rfqServices.js'
import { createPurchaseOrderFromRfq } from '../../services/purchaseOrderServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { formatCurrency, formatDate } from '../../composables/useFormatter.js'
import { comparisonNumber, awardSubtotal, sumComparisonAmounts, isLowestUnitPrice, isLowestTotalCost, remainingAwardQuantity, defaultSplitOffer, totalCostExclusionText } from '../../utils/rfqComparison.js'
import { quotationValidityLabel, quotationValidityReason, canAwardQuotation, purchaseOrderValidityErrors } from '../../utils/quotationValidity.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import QuotationReviewSection from '../../components/purchasing/rfq/detail/QuotationReviewSection.vue'
import AwardEvaluationFields from '../../components/purchasing/rfq/AwardEvaluationFields.vue'
import RfqAwardHistory from '../../components/purchasing/rfq/RfqAwardHistory.vue'
import { quotationReviewLabel, quotationReviewReason } from '../../utils/quotationReview.js'

import {
    Home,
    ChevronRight,
    ArrowLeft,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    FileText,
    ArrowRight,
    Check,
    X
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

const rfqId = computed(() => route.params.id)

const loading = ref(false)
const matrixData = ref(null)
const matrixLoadError = ref(false)

// Awarding Modal State
const isAwardModalOpen = ref(false)
const awardingSubmitting = ref(false)
const awardMode = ref('split') // 'full' | 'split'

// Full awarding form
const selectedFullSupplierId = ref('')
const emptyEvaluation = () => ({ technical_compliance: 'not_verified', technical_notes: '', commercial_notes: '', warranty_terms: '', evidence_reference: '', selection_reason: '' })
const fullEvaluation = ref(emptyEvaluation())
const fullAwardVersion = ref(null)
const onFullVendorChange = () => {
    fullEvaluation.value = emptyEvaluation()
    fullAwardVersion.value = quotationFor(selectedFullSupplierId.value)?.review_version
}

// Split awarding form
// keyed by rfq_item_id: { quotation_id, quotation_item_id, awarded_quantity, unit_price, max_offered, notes }
const splitAwards = ref({})

// Fetch Matrix Data
const fetchMatrix = async (options = {}) => {
    loading.value = true
    try {
        const response = await getRfqComparisonMatrix(rfqId.value)
        matrixData.value = response.data || response
        matrixLoadError.value = false
    } catch (err) {
        matrixLoadError.value = true
        if (!options.silent) showError(err.response?.data?.message || 'Gagal memuat matriks komparasi penawaran RFQ')
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
const quotationFor = id => suppliers.value.find(supplier => String(supplier.quotation_id) === String(id))
const eligibleQuotation = id => !matrixLoadError.value && canAwardQuotation(quotationFor(id))
const poValidityErrors = computed(() => matrixLoadError.value
    ? ['Data validitas gagal dimuat. Muat ulang sebelum membuat PO.']
    : purchaseOrderValidityErrors(awardedSummaryList.value, suppliers.value))

const comparisonCurrency = computed(() => matrixData.value?.comparison_currency || 'IDR')
const formatBaseCurrency = value => formatCurrency(value, comparisonCurrency.value)
const awardedGoodsTotal = computed(() => sumComparisonAmounts(awardedSummaryList.value.map(item => item.subtotal)))

// Plain-language price difference vs HPS (Target Price) for non-technical users
const formatPriceDiffText = (_item, offer) => {
    const diff = comparisonNumber(offer?.delta_target_price)
    if (diff === null) return null
    if (diff === 0) {
        return { text: 'Sesuai harga perkiraan', type: 'neutral' }
    }
    if (diff < 0) {
        return {
            text: `Lebih hemat ${formatBaseCurrency(Math.abs(diff))} dari perkiraan`,
            type: 'saving'
        }
    }
    return {
        text: `Lebih mahal ${formatBaseCurrency(diff)} dari perkiraan`,
        type: 'higher'
    }
}

// Summary list of awarded items for easy reading at a glance
const awardedSummaryList = computed(() => {
    const list = []
    for (const item of itemsMatrix.value) {
        for (const sup of suppliers.value) {
            const offer = item.vendor_offers?.[sup.quotation_id]
            if (offer && offer.is_awarded) {
                const qty = Number(offer.awarded_quantity || 0)
                const price = comparisonNumber(offer.base_unit_price)
                list.push({
                    rfq_item_id: item.rfq_item_id,
                    item_name: item.item_name,
                    unit_name: item.unit_name || 'Unit',
                    supplier_id: sup.supplier_id,
                    supplier_name: sup.supplier_name,
                    quotation_id: sup.quotation_id,
                    awarded_quantity: qty,
                    unit_price: price,
                    subtotal: awardSubtotal(qty, price),
                    purchase_order_id: offer.purchase_order_id || null,
                    purchase_order_number: offer.purchase_order_number || null
                })
            }
        }
    }
    return list
})

const generatedPurchaseOrders = computed(() => {
    return rfq.value?.purchase_orders || []
})

const hasUnconvertedAwards = computed(() => {
    return awardedSummaryList.value.some(w => !w.purchase_order_id)
})

const generatingPo = ref(false)

const handleGeneratePurchaseOrders = async () => {
    if (generatingPo.value || loading.value) return
    if (poValidityErrors.value.length) {
        showError(poValidityErrors.value[0])
        return
    }
    const confirmed = await showConfirm(
        'Terbitkan Purchase Order (PO)?',
        'Sistem akan membuat dokumen Purchase Order resmi secara otomatis untuk vendor pemenang tender ini.'
    )
    if (!confirmed) return

    generatingPo.value = true
    showLoading('Menerbitkan Purchase Order...')
    try {
        const res = await createPurchaseOrderFromRfq(rfqId.value, {})
        const createdList = res.data || []
        await showSuccess(
            'Purchase Order Berhasil Dibuat!',
            `${createdList.length || 1} dokumen Purchase Order telah berhasil diterbitkan.`
        )
        await fetchMatrix()
    } catch (err) {
        if ([403, 409, 422].includes(err.response?.status)) await fetchMatrix({ silent: true })
        showError(err.response?.data?.message || 'Gagal menerbitkan Purchase Order dari hasil tender')
    } finally {
        generatingPo.value = false
    }
}

// Check if awarding can be performed
const canAward = computed(() => {
    if (!rfq.value) return false
    const status = rfq.value.status
    const isAllowedStatus = status === 'published' || status === 'evaluation'
    const hasQuotations = suppliers.value.some(supplier => eligibleQuotation(supplier.quotation_id))
    return !loading.value && !matrixLoadError.value && isAllowedStatus && hasQuotations && itemsMatrix.value.some(item => remainingAwardQuantity(item) > 0)
})

// Initialize Awarding Modal
const openAwardModal = () => {
    if (!suppliers.value || suppliers.value.length === 0) {
        showError('Belum ada penawaran vendor yang masuk untuk dievaluasi!')
        return
    }

    // Preselect first supplier for Full Awarding
    selectedFullSupplierId.value = suppliers.value.find(supplier => eligibleQuotation(supplier.quotation_id))?.quotation_id || ''
    fullEvaluation.value = emptyEvaluation()
    fullAwardVersion.value = quotationFor(selectedFullSupplierId.value)?.review_version

    // Initialize Split Awarding state for each RFQ Item
    const splits = {}
    itemsMatrix.value.forEach(item => {
        const remaining = remainingAwardQuantity(item)
        const [quoteId, offer] = remaining > 0 ? (defaultSplitOffer(item, eligibleQuotation) || []) : []
        const defaultQuotationId = quoteId ? Number(quoteId) : ''
        const defaultQuoteItemId = offer?.supplier_quotation_item_id || null
        const defaultUnitPrice = comparisonNumber(offer?.base_unit_price)
        const defaultMaxOffered = offer?.offered_quantity || 0
        const defaultQty = offer ? Math.min(remaining, offer.offered_quantity, offer.is_awarded ? offer.awarded_quantity : remaining) : 0

        splits[item.rfq_item_id] = {
            quotation_id: defaultQuotationId,
            quotation_item_id: defaultQuoteItemId,
            expected_review_version: quotationFor(defaultQuotationId)?.review_version,
            awarded_quantity: defaultQty,
            unit_price: defaultUnitPrice,
            max_offered: defaultMaxOffered,
            target_quantity: remaining,
            notes: '',
            evaluation: emptyEvaluation()
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
    split.evaluation = emptyEvaluation()
    split.expected_review_version = quotationFor(split.quotation_id)?.review_version

    if (!split.quotation_id) {
        split.quotation_item_id = null
        split.awarded_quantity = 0
        split.unit_price = null
        split.max_offered = 0
        return
    }

    const item = itemsMatrix.value.find(i => i.rfq_item_id === rfqItemId)
    if (!item) return

    const offer = item.vendor_offers?.[split.quotation_id]
    if (offer && offer.quoted && !offer.purchase_order_id && eligibleQuotation(split.quotation_id)) {
        split.quotation_item_id = offer.supplier_quotation_item_id
        split.unit_price = comparisonNumber(offer.base_unit_price)
        split.max_offered = offer.offered_quantity
        split.awarded_quantity = Math.min(remainingAwardQuantity(item), offer.offered_quantity)
    } else {
        split.quotation_item_id = null
        split.awarded_quantity = 0
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
        if (!eligibleQuotation(split.quotation_id)) {
            errors.push(quotationValidityReason(quotationFor(split.quotation_id)) || 'Quotation tidak tersedia untuk award baru.')
            continue
        }
        if (!Number.isFinite(qty) || qty <= 0) {
            errors.push(`Kuantitas pemenang untuk item '${item.item_name}' harus lebih dari 0.`)
        } else if (qty > remainingAwardQuantity(item)) {
            errors.push(`Kuantitas pemenang (${qty}) melebihi target kebutuhan (${remainingAwardQuantity(item)}) untuk '${item.item_name}'.`)
        } else if (qty > Number(split.max_offered)) {
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
    return sumComparisonAmounts(Object.values(splitAwards.value)
        .filter(split => split.quotation_id && Number(split.awarded_quantity) > 0)
        .map(split => awardSubtotal(split.awarded_quantity, split.unit_price)))
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
    if (awardingSubmitting.value || loading.value) return
    if (matrixLoadError.value) {
        showError('Data validitas gagal dimuat. Muat ulang sebelum menetapkan pemenang.')
        return
    }
    let awardsPayload = []

    if (awardMode.value === 'full') {
        if (!selectedFullSupplierId.value) {
            showError('Silakan pilih rekanan pemenang tender!')
            return
        }

        const quoteId = Number(selectedFullSupplierId.value)
        if (!eligibleQuotation(quoteId)) {
            showError(quotationValidityReason(quotationFor(quoteId)) || 'Quotation tidak tersedia untuk award baru.')
            return
        }
        for (const item of itemsMatrix.value) {
            const offer = item.vendor_offers?.[quoteId]
            if (offer && offer.quoted && !offer.purchase_order_id && offer.supplier_quotation_item_id && remainingAwardQuantity(item) > 0) {
                awardsPayload.push({
                    supplier_quotation_item_id: offer.supplier_quotation_item_id,
                    awarded_quantity: Math.min(remainingAwardQuantity(item), offer.offered_quantity),
                    expected_review_version: fullAwardVersion.value,
                    ...fullEvaluation.value
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
                    expected_review_version: split.expected_review_version,
                    ...split.evaluation
                })
            }
        }

        if (awardsPayload.length === 0) {
            showError('Setidaknya harus ada satu item barang yang dimenangkan!')
            return
        }
    }

    if (awardsPayload.some(award => !award.selection_reason?.trim())) {
        showError('Alasan pemilihan wajib diisi untuk setiap item yang dipilih.')
        return
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
        if ([403, 409, 422].includes(err.response?.status)) await fetchMatrix({ silent: true })
        showError(err.response?.data?.message || 'Gagal menetapkan pemenang tender')
    } finally {
        awardingSubmitting.value = false
    }
}
</script>

<template>
    <div class="space-y-5">
        <!-- Page Header & Action Bar -->
        <PageHeader
            :title="matrixData?.rfq ? `Perbandingan Harga Vendor — ${matrixData.rfq.rfq_number}` : 'Perbandingan Harga Vendor'"
            subtitle="Bandingkan harga penawaran dari setiap vendor dan pilih pemenang pengadaan"
        >
            <template #breadcrumbs>
                <div class="flex items-center gap-2 text-xs text-slate-600">
                    <RouterLink :to="{ name: 'user.dashboard' }" class="hover:text-blue-700">
                        <Home class="w-3.5 h-3.5" />
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span>Purchasing</span>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <RouterLink :to="{ name: 'user.purchasing.rfq' }" class="hover:text-blue-700">
                        Tender RFQ
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <RouterLink 
                        v-if="matrixData?.rfq"
                        :to="{ name: 'user.purchasing.rfq.detail', params: { id: matrixData.rfq.id } }" 
                        class="hover:text-blue-700"
                    >
                        {{ matrixData.rfq.rfq_number }}
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span class="text-slate-900 font-semibold">Perbandingan Harga</span>
                </div>
            </template>

            <template #actions>
                <div class="flex items-center gap-2.5">
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="router.push({ name: 'user.purchasing.rfq.detail', params: { id: rfqId } })"
                        class="text-slate-700"
                    >
                        <ArrowLeft class="w-4 h-4 mr-1.5" />
                        Kembali ke Detail RFQ
                    </BaseButton>

                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="fetchMatrix"
                        :disabled="loading"
                    >
                        <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': loading }" />
                        Muat Ulang
                    </BaseButton>

                    <!-- Awarding CTA Button -->
                    <BaseButton
                        v-if="canAward"
                        variant="primary"
                        size="sm"
                        @click="openAwardModal"
                        class="bg-blue-600 hover:bg-blue-700"
                    >
                        <Check class="w-4 h-4 mr-1.5" />
                        Pilih Vendor Pemenang
                    </BaseButton>

                    <div v-else-if="rfq?.is_awarded" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 class="w-4 h-4 text-emerald-700" />
                        Vendor Pemenang Sudah Dipilih
                    </div>
                </div>
            </template>
        </PageHeader>

        <QuotationReviewSection v-if="matrixData" :key="rfqId" :quotations="suppliers" :disabled="loading || matrixLoadError" :reload="fetchMatrix" />

        <!-- Loading State -->
        <div v-if="loading && !matrixData" class="p-12 text-center bg-white rounded-xl border border-slate-200">
            <RefreshCw class="w-7 h-7 mx-auto text-blue-600 animate-spin mb-3" />
            <p class="text-sm text-slate-700 font-medium">Memuat tabel perbandingan harga vendor...</p>
        </div>

        <template v-else-if="matrixData">
            <p v-if="matrixLoadError" role="alert" class="p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">Data terbaru gagal dimuat. Muat ulang sebelum menetapkan pemenang atau membuat PO.</p>
            <!-- Compact & Clear Document Info Bar -->
            <div class="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-6 text-sm">
                    <div>
                        <span class="text-xs text-slate-600 block">Status Tender</span>
                        <div class="mt-1 flex items-center gap-2">
                            <StatusBadge :status="rfq.status" />
                            <span v-if="rfq.is_awarded" class="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300">
                                Selesai Dipilih
                            </span>
                        </div>
                    </div>

                    <div class="h-8 w-px bg-slate-200 hidden sm:block"></div>

                    <div>
                        <span class="text-xs text-slate-600 block">Jumlah Barang</span>
                        <span class="text-base font-bold text-slate-900">{{ statistics.total_items || itemsMatrix.length }} Jenis Barang</span>
                    </div>

                    <div class="h-8 w-px bg-slate-200 hidden sm:block"></div>

                    <div>
                        <span class="text-xs text-slate-600 block">Vendor yang Mengajukan Harga</span>
                        <span class="text-base font-bold text-slate-900">
                            {{ statistics.total_quotations_received || suppliers.length }} dari {{ statistics.total_suppliers_invited || suppliers.length }} Vendor
                        </span>
                    </div>
                </div>

                <!-- Legend that is simple and clear -->
                <div class="flex flex-wrap items-center gap-4 text-xs text-slate-700 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
                    <span class="font-semibold text-slate-800">Keterangan:</span>
                    <span class="inline-flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span>
                        <span>Vendor Terpilih (Pemenang)</span>
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold text-[11px]">Termurah</span>
                        <span>Harga Paling Rendah</span>
                    </span>
                </div>
            </div>

            <!-- Plain-Language Winner Summary Box (Shown once awarded so senior users immediately understand who won what) -->
            <RfqAwardHistory :decisions="matrixData?.award_decisions || []" />
            <div v-if="awardedSummaryList.length > 0" class="bg-emerald-50/70 border border-emerald-300 rounded-xl p-5 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 class="text-sm font-bold text-emerald-950 flex items-center gap-2">
                            <CheckCircle2 class="w-4 h-4 text-emerald-700 shrink-0" />
                            Ringkasan Keputusan Pemenang Tender
                        </h3>
                        <p class="text-xs text-emerald-800 mt-0.5">
                            Nilai Barang Terpilih (sebelum pajak & ongkir): <strong>{{ formatBaseCurrency(awardedGoodsTotal) }}</strong>
                        </p>
                    </div>

                    <div class="flex items-center gap-2.5">
                        <BaseButton
                            v-if="hasUnconvertedAwards"
                            variant="primary"
                            size="sm"
                            :disabled="generatingPo || loading || poValidityErrors.length > 0"
                            @click="handleGeneratePurchaseOrders"
                            class="bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                            <FileText class="w-4 h-4 mr-1.5" />
                            Terbitkan Purchase Order (PO)
                        </BaseButton>
                        <RouterLink
                            v-else-if="generatedPurchaseOrders.length === 1"
                            :to="{ name: 'user.purchasing.orders.detail', params: { id: generatedPurchaseOrders[0].id } }"
                            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                            <FileText class="w-4 h-4" />
                            <span>Buka Dokumen PO ({{ generatedPurchaseOrders[0].po_number }})</span>
                            <ArrowRight class="w-3.5 h-3.5" />
                        </RouterLink>
                        <RouterLink
                            v-else-if="generatedPurchaseOrders.length > 1"
                            :to="{ name: 'user.purchasing.orders', query: { rfq_id: rfqId } }"
                            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                            <FileText class="w-4 h-4" />
                            <span>Lihat {{ generatedPurchaseOrders.length }} Dokumen PO</span>
                            <ArrowRight class="w-3.5 h-3.5" />
                        </RouterLink>
                    </div>
                </div>

                <div v-if="hasUnconvertedAwards && poValidityErrors.length" role="alert" class="text-xs text-rose-800 space-y-1">
                    <p>PO baru belum dapat dibuat. Seluruh quotation terpilih harus memenuhi masa berlaku.</p>
                    <p v-for="reason in poValidityErrors" :key="reason">{{ reason }}</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                        v-for="win in awardedSummaryList"
                        :key="`${win.rfq_item_id}-${win.supplier_name}`"
                        class="bg-white border border-emerald-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                    >
                        <div>
                            <div class="text-sm font-bold text-slate-900">
                                {{ win.item_name }}
                                <span class="font-normal text-slate-600">({{ Number(win.awarded_quantity).toLocaleString('id-ID') }} {{ win.unit_name }})</span>
                            </div>
                            <div class="text-xs text-slate-700 mt-0.5 flex flex-wrap items-center gap-2">
                                <span>Vendor Terpilih: <strong class="text-emerald-800">{{ win.supplier_name }}</strong></span>
                                <span>{{ quotationValidityLabel(quotationFor(win.quotation_id)) }}</span>
                                <span v-if="win.purchase_order_id" class="text-slate-600">Komitmen PO tetap berlaku.</span>
                                <RouterLink
                                    v-if="win.purchase_order_id"
                                    :to="{ name: 'user.purchasing.orders.detail', params: { id: win.purchase_order_id } }"
                                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-bold hover:bg-blue-100"
                                >
                                    {{ win.purchase_order_number || `PO #${win.purchase_order_id}` }}
                                    <ArrowRight class="w-3 h-3" />
                                </RouterLink>
                            </div>
                        </div>
                        <div class="text-right shrink-0">
                            <div class="text-xs text-slate-600">{{ formatBaseCurrency(win.unit_price) }} / {{ win.unit_name }}</div>
                            <div class="text-sm font-bold text-slate-900">{{ formatBaseCurrency(win.subtotal) }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State if no quotations -->
            <div v-if="suppliers.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <h3 class="text-base font-bold text-slate-800">Belum Ada Penawaran Masuk</h3>
                <p class="text-sm text-slate-600 mt-1 max-w-md mx-auto">
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

            <!-- Clean Side-by-Side Comparison Table -->
            <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Tabel Perbandingan Harga Antar Vendor</h3>
                        <p class="text-xs text-slate-600 mt-0.5">
                            Perbandingan dalam {{ comparisonCurrency }}. Harga satuan sebelum pajak/ongkir; ranking total mencakup pajak/ongkir hanya untuk seluruh item dan kuantitas tepat sesuai target RFQ.
                        </p>
                        <p v-if="matrixData.total_cost_comparison" class="text-xs text-slate-600 mt-1">
                            {{ matrixData.total_cost_comparison.eligible_quotations_count }} quotation memenuhi syarat ranking total.
                            Total minimum: {{ formatBaseCurrency(matrixData.total_cost_comparison.lowest_base_total_amount) }}.
                            Ranking ini tidak menentukan total kombinasi split award.
                        </p>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse min-w-[860px]">
                        <thead>
                            <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-800">
                                <th class="py-3.5 px-3 text-xs font-bold w-12 text-center sticky left-0 bg-slate-100 z-20">
                                    No
                                </th>
                                <th class="py-3.5 px-4 text-xs font-bold w-64 sticky left-12 bg-slate-100 z-20">
                                    Nama Barang & Kebutuhan
                                </th>
                                <th class="py-3.5 px-3 text-xs font-bold w-28 text-right sticky left-76 bg-slate-100 z-20">
                                    Jumlah Dicari
                                </th>
                                <th class="py-3.5 px-4 text-xs font-bold w-36 text-right sticky left-104 bg-slate-100 z-20 border-r-2 border-slate-300">
                                    Harga Perkiraan (HPS)
                                </th>

                                <!-- Dynamic Columns for Each Supplier Quotation -->
                                <th 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-3.5 px-4 text-xs min-w-[260px] max-w-[320px] border-r border-slate-200 align-top"
                                >
                                    <div class="flex items-start justify-between gap-2">
                                        <div>
                                            <div class="text-sm font-bold text-slate-900">{{ sup.supplier_name }}</div>
                                            <div class="text-xs text-slate-600 mt-0.5">
                                                No. Penawaran: {{ sup.vendor_quotation_reference || sup.quotation_number || '-' }}
                                            </div>
                                            <div class="text-xs mt-1" :class="eligibleQuotation(sup.quotation_id) ? 'text-slate-700' : 'text-rose-800'">{{ quotationValidityLabel(sup) }}</div>
                                            <p class="text-xs mt-1">{{ quotationReviewLabel(sup) }}</p>
                                            <p v-if="quotationReviewReason(sup)" class="text-xs font-normal text-amber-800 mt-1">{{ quotationReviewReason(sup) }}</p>
                                            <p v-if="quotationValidityReason(sup)" class="text-xs font-normal text-rose-800 mt-1">{{ quotationValidityReason(sup) }}</p>
                                        </div>
                                        <span 
                                            v-if="sup.evaluation_status === 'awarded'" 
                                            class="shrink-0 text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300"
                                        >
                                            Terpilih Semua
                                        </span>
                                        <span 
                                            v-else-if="sup.evaluation_status === 'partially_awarded'" 
                                            class="shrink-0 text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300"
                                        >
                                            Terpilih Sebagian
                                        </span>
                                    </div>
                                    <p class="text-xs font-normal text-slate-600 mt-2">
                                        Mata uang asli: {{ sup.currency }} · Kurs quotation: 1 {{ sup.currency }} = {{ sup.comparison_exchange_rate ?? '-' }} {{ comparisonCurrency }}
                                    </p>
                                    <p v-if="sup.comparison_error" class="text-xs font-normal text-amber-800 mt-1">
                                        Kurs tidak valid; nilai konversi tidak tersedia.
                                    </p>
                                    <div class="text-xs text-slate-700 mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 font-normal">
                                        <span>Pembayaran: <strong class="text-slate-900">{{ sup.payment_terms || '-' }}</strong></span>
                                        <span v-if="sup.lead_time_days !== null">Pengiriman: <strong class="text-slate-900">{{ sup.lead_time_days }} hari</strong></span>
                                    </div>
                                </th>
                            </tr>
                        </thead>

                        <!-- Item Matrix Rows -->
                        <tbody class="divide-y divide-slate-200 text-sm">
                            <tr 
                                v-for="(item, idx) in itemsMatrix" 
                                :key="item.rfq_item_id"
                                class="hover:bg-slate-50/60 transition-colors"
                            >
                                <!-- Sticky Left Cells -->
                                <td class="py-4 px-3 text-center text-slate-700 font-semibold sticky left-0 bg-white z-10 align-top">
                                    {{ idx + 1 }}
                                </td>
                                <td class="py-4 px-4 sticky left-12 bg-white z-10 align-top">
                                    <div class="font-bold text-slate-900 text-sm">{{ item.item_name }}</div>
                                    <div v-if="item.item_code" class="text-xs text-slate-600 font-mono mt-0.5">{{ item.item_code }}</div>
                                    <div v-if="item.item_specifications" class="text-xs text-slate-600 mt-1">
                                        Spesifikasi: {{ item.item_specifications }}
                                    </div>
                                </td>
                                <td class="py-4 px-3 text-right font-bold text-slate-900 sticky left-76 bg-white z-10 align-top">
                                    {{ Number(item.target_quantity).toLocaleString('id-ID') }} {{ item.unit_name || 'Unit' }}
                                </td>
                                <td class="py-4 px-4 text-right text-slate-800 sticky left-104 bg-white z-10 border-r-2 border-slate-300 align-top">
                                    <template v-if="item.target_price">
                                        <div class="font-semibold">{{ formatCurrency(item.target_price, matrixData.target_price_currency || comparisonCurrency) }}</div>
                                        <div class="text-xs text-slate-600 mt-0.5">per {{ item.unit_name || 'Unit' }}</div>
                                    </template>
                                    <span v-else class="text-xs text-slate-500">Tidak ditentukan</span>
                                </td>

                                <!-- Dynamic Offer Cells per Supplier -->
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-4 px-4 border-r border-slate-200 align-top"
                                    :class="item.vendor_offers?.[sup.quotation_id]?.is_awarded ? 'bg-emerald-50/60' : 'bg-white'"
                                >
                                    <template v-if="item.vendor_offers?.[sup.quotation_id]?.quoted">
                                        <div class="space-y-2">
                                            <!-- 1. Unit Price & Lowest Label -->
                                            <div class="flex items-baseline justify-between gap-2">
                                                <div>
                                                    <span class="font-bold text-slate-900 text-base">
                                                        {{ formatBaseCurrency(item.vendor_offers[sup.quotation_id].base_unit_price) }}
                                                    </span>
                                                    <span class="text-xs text-slate-600"> / {{ item.unit_name || 'Unit' }} (sebelum pajak/ongkir)</span>
                                                </div>

                                                <span 
                                                    v-if="isLowestUnitPrice(item.vendor_offers[sup.quotation_id])"
                                                    class="bg-slate-200 text-slate-900 font-bold px-2 py-0.5 rounded text-xs shrink-0"
                                                >
                                                    Satuan terendah
                                                </span>
                                            </div>

                                            <p class="text-xs text-slate-600">
                                                Harga asli: {{ formatCurrency(item.vendor_offers[sup.quotation_id].unit_price, sup.currency) }} / {{ item.unit_name || 'Unit' }}
                                            </p>

                                            <!-- 2. Item Subtotal (Quantity x Unit Price) so user doesn't have to calculate mentally -->
                                            <div class="text-xs text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 flex items-center justify-between">
                                                <span>Total ({{ Number(item.vendor_offers[sup.quotation_id].offered_quantity).toLocaleString('id-ID') }} {{ item.unit_name }}):</span>
                                                <strong class="font-bold text-slate-900">
                                                    {{ formatBaseCurrency(item.vendor_offers[sup.quotation_id].base_subtotal) }}
                                                </strong>
                                            </div>

                                            <!-- 3. Plain-language comparison vs HPS -->
                                            <div 
                                                v-if="formatPriceDiffText(item, item.vendor_offers[sup.quotation_id])"
                                                class="text-xs font-medium"
                                                :class="{
                                                    'text-emerald-800': formatPriceDiffText(item, item.vendor_offers[sup.quotation_id]).type === 'saving',
                                                    'text-rose-700': formatPriceDiffText(item, item.vendor_offers[sup.quotation_id]).type === 'higher',
                                                    'text-slate-600': formatPriceDiffText(item, item.vendor_offers[sup.quotation_id]).type === 'neutral'
                                                }"
                                            >
                                                {{ formatPriceDiffText(item, item.vendor_offers[sup.quotation_id]).text }}
                                            </div>

                                            <!-- 4. Lead time & Brand -->
                                            <p class="text-xs text-slate-600">Penawaran: {{ item.vendor_offers[sup.quotation_id].item_description || 'Belum tersedia' }}</p>
                                            <p class="text-xs text-slate-600">Catatan supplier: {{ item.vendor_offers[sup.quotation_id].notes || 'Belum tersedia' }}</p>
                                            <div class="text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                                                <span v-if="item.vendor_offers[sup.quotation_id].lead_time_days !== null">
                                                    Waktu kirim: <strong class="text-slate-800">{{ item.vendor_offers[sup.quotation_id].lead_time_days }} hari</strong>
                                                </span>
                                                <span v-if="item.vendor_offers[sup.quotation_id].brand">
                                                    Merk: <strong class="text-slate-800">{{ item.vendor_offers[sup.quotation_id].brand }}</strong>
                                                </span>
                                            </div>

                                            <!-- 5. Clear Selected / Winner Indicator (No Trophy Slop) -->
                                            <div 
                                                v-if="item.vendor_offers[sup.quotation_id].is_awarded"
                                                class="mt-2 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-between"
                                            >
                                                <span class="flex items-center gap-1.5">
                                                    <Check class="w-4 h-4 stroke-[2.5]" />
                                                    DIPILIH SEBAGAI PEMENANG
                                                </span>
                                                <span>{{ Number(item.vendor_offers[sup.quotation_id].awarded_quantity).toLocaleString('id-ID') }} {{ item.unit_name }}</span>
                                            </div>
                                        </div>
                                    </template>

                                    <!-- Not quoted -->
                                    <template v-else>
                                        <div class="py-6 text-center text-slate-500 text-xs">
                                            Vendor tidak mengajukan harga untuk barang ini
                                        </div>
                                    </template>
                                </td>
                            </tr>
                        </tbody>

                        <!-- Commercial Summary Footer -->
                        <tfoot class="bg-slate-50 border-t-2 border-slate-300 text-xs">
                            <tr class="border-b border-slate-200">
                                <td colspan="4" class="py-3 px-4 font-semibold text-slate-800 sticky left-0 bg-slate-50 z-10 border-r-2 border-slate-300">
                                    Total Harga Barang (Sebelum Pajak & Ongkir)
                                </td>
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-3 px-4 font-semibold text-slate-900 border-r border-slate-200 text-sm"
                                >
                                    {{ formatBaseCurrency(sup.base_subtotal) }}
                                </td>
                            </tr>

                            <tr class="border-b border-slate-200">
                                <td colspan="4" class="py-3 px-4 font-semibold text-slate-800 sticky left-0 bg-slate-50 z-10 border-r-2 border-slate-300">
                                    Pajak Pertambahan Nilai (PPN)
                                </td>
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-3 px-4 text-slate-800 border-r border-slate-200"
                                >
                                    {{ formatBaseCurrency(sup.base_tax_amount) }}
                                    <span v-if="sup.tax_rate > 0" class="text-xs text-slate-600">({{ sup.tax_rate }}%)</span>
                                </td>
                            </tr>

                            <tr class="border-b border-slate-200">
                                <td colspan="4" class="py-3 px-4 font-semibold text-slate-800 sticky left-0 bg-slate-50 z-10 border-r-2 border-slate-300">
                                    Biaya Pengiriman (Ongkos Kirim)
                                </td>
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-3 px-4 text-slate-800 border-r border-slate-200"
                                >
                                    {{ formatBaseCurrency(sup.base_shipping_cost) }}
                                </td>
                            </tr>

                            <tr class="border-b border-slate-300 bg-slate-100">
                                <td colspan="4" class="py-3.5 px-4 font-bold text-slate-900 sticky left-0 bg-slate-100 z-10 border-r-2 border-slate-300 text-sm">
                                    TOTAL AKHIR PENAWARAN (Termasuk Pajak & Ongkir)
                                </td>
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-3.5 px-4 font-bold text-base text-slate-900 border-r border-slate-200"
                                >
                                    {{ formatBaseCurrency(sup.base_total_amount) }}
                                    <div class="text-xs font-normal text-slate-600 mt-1">Total asli: {{ formatCurrency(sup.total_amount, sup.currency) }}</div>
                                    <div v-if="isLowestTotalCost(sup)" class="text-xs text-emerald-800 mt-1">Total terendah (cakupan setara)</div>
                                    <div v-if="totalCostExclusionText(sup)" class="text-xs font-normal text-amber-800 mt-1">Tidak diranking: {{ totalCostExclusionText(sup) }}</div>
                                </td>
                            </tr>

                            <tr>
                                <td colspan="4" class="py-3 px-4 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r-2 border-slate-300">
                                    Syarat Pembayaran & Batas Berlaku Penawaran
                                </td>
                                <td 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id"
                                    class="py-3 px-4 text-xs text-slate-700 border-r border-slate-200 space-y-0.5"
                                >
                                    <div>Pembayaran: <strong class="text-slate-900">{{ sup.payment_terms || '-' }}</strong></div>
                                    <div>Berlaku sampai: <strong class="text-slate-900">{{ sup.valid_until || '-' }}</strong></div>
                                    <div>{{ quotationValidityLabel(sup) }}<span v-if="sup.valid_until"> · Akhir hari WIB (Asia/Jakarta)</span></div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </template>

        <!-- Awarding Modal Dialog -->
        <div 
            v-if="isAwardModalOpen"
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
            @click.self="closeAwardModal"
        >
            <div class="bg-white rounded-xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden">
                <!-- Modal Header -->
                <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 class="text-base font-bold text-slate-900">
                            Pilih Vendor Pemenang Tender
                        </h3>
                        <p class="text-xs text-slate-600 mt-0.5">
                            Tentukan vendor yang dipilih untuk memasok barang pada pengadaan ini.
                        </p>
                    </div>
                    <button
                        type="button"
                        @click="closeAwardModal"
                        class="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 overflow-y-auto space-y-5 flex-1">
                    <!-- Mode Selector Tab/Pills in Plain Indonesian -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            type="button"
                            @click="awardMode = 'split'"
                            class="p-3.5 text-left rounded-xl border-2 transition-all cursor-pointer"
                            :class="awardMode === 'split' ? 'border-blue-600 bg-blue-50/50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
                        >
                            <div class="text-xs font-bold">Pilih Vendor Per Barang (Bisa Beda Vendor)</div>
                            <div class="text-xs text-slate-600 mt-0.5">Cocok jika Barang 1 dan Barang 2 ingin dibeli dari vendor yang berbeda.</div>
                        </button>

                        <button
                            type="button"
                            @click="awardMode = 'full'"
                            class="p-3.5 text-left rounded-xl border-2 transition-all cursor-pointer"
                            :class="awardMode === 'full' ? 'border-blue-600 bg-blue-50/50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
                        >
                            <div class="text-xs font-bold">Pilih Satu Vendor untuk Semua Barang</div>
                            <div class="text-xs text-slate-600 mt-0.5">Cocok jika seluruh barang dalam tender ini diborongkan ke 1 vendor saja.</div>
                        </button>
                    </div>

                    <!-- Mode A: Full Awarding -->
                    <div v-if="awardMode === 'full'" class="space-y-4">
                        <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                            <label class="block text-xs font-bold text-slate-800">
                                Pilih Nama Vendor Pemenang
                            </label>

                            <select
                                v-model="selectedFullSupplierId"
                                @change="onFullVendorChange"
                                class="w-full text-sm rounded-lg border-slate-300 py-2 px-3 focus:border-blue-600 focus:ring-blue-600 bg-white"
                            >
                                <option value="">-- Pilih quotation yang tersedia --</option>
                                <option 
                                    v-for="sup in suppliers" 
                                    :key="sup.quotation_id" 
                                    :value="sup.quotation_id"
                                    :disabled="!eligibleQuotation(sup.quotation_id)"
                                >
                                    {{ sup.supplier_name }} — {{ quotationValidityLabel(sup) }} — Total Akhir: {{ formatBaseCurrency(sup.base_total_amount) }} (Pembayaran: {{ sup.payment_terms || '-' }})
                                </option>
                            </select>

                            <p class="text-xs text-slate-600">Nilai di bawah adalah seluruh quotation. Award baru mengikuti sisa kebutuhan setelah PO terkunci; pajak dan ongkir PO hasil award dihitung pada pesanan.</p>
                            <p v-if="fullAwardSummary && !eligibleQuotation(fullAwardSummary.quotation_id)" role="alert" class="text-xs text-rose-800">{{ quotationValidityReason(fullAwardSummary) || 'Quotation tidak tersedia untuk award baru.' }}</p>
                            <p v-if="fullAwardSummary && totalCostExclusionText(fullAwardSummary)" class="text-xs text-amber-800">Tidak diranking: {{ totalCostExclusionText(fullAwardSummary) }}</p>

                            <div v-if="fullAwardSummary" class="mt-3 pt-3 border-t border-slate-200 grid grid-cols-3 gap-3 text-xs">
                                <div>
                                    <span class="text-slate-600 block">Total Harga Barang:</span>
                                    <span class="font-bold text-slate-900 text-sm">{{ formatBaseCurrency(fullAwardSummary.base_subtotal) }}</span>
                                </div>
                                <div>
                                    <span class="text-slate-600 block">Pajak & Ongkos Kirim:</span>
                                    <span class="font-bold text-slate-900 text-sm">{{ formatBaseCurrency(sumComparisonAmounts([fullAwardSummary.base_tax_amount, fullAwardSummary.base_shipping_cost])) }}</span>
                                </div>
                                <div>
                                    <span class="text-slate-600 block">Total Quotation (pajak & ongkir):</span>
                                    <span class="font-bold text-blue-700 text-sm">{{ formatBaseCurrency(fullAwardSummary.base_total_amount) }}</span>
                                </div>
                            </div>
                        </div>

                        <p class="text-xs text-slate-600">Evaluasi berikut berlaku untuk seluruh item supplier yang dipilih. Gunakan split award untuk evaluasi per item.</p>
                        <AwardEvaluationFields v-model="fullEvaluation" />
                    </div>

                    <!-- Mode B: Split Awarding -->
                    <div v-if="awardMode === 'split'" class="space-y-4">
                        <!-- Validation Error Alert -->
                        <div v-if="splitValidationErrors.length > 0" class="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                            <div class="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                                <AlertTriangle class="w-4 h-4 text-rose-600" />
                                Periksa Kembali Pilihan dan Jumlah Barang:
                            </div>
                            <ul class="text-xs text-rose-700 list-disc list-inside space-y-0.5">
                                <li v-for="(err, idx) in splitValidationErrors" :key="idx">{{ err }}</li>
                            </ul>
                        </div>

                        <!-- Items Split Allocation Table -->
                        <div class="border border-slate-200 rounded-xl overflow-hidden">
                            <table class="w-full text-left border-collapse text-xs">
                                <thead class="bg-slate-100 text-slate-800 border-b border-slate-200">
                                    <tr>
                                        <th class="py-3 px-3 font-bold">Nama Barang</th>
                                        <th class="py-3 px-3 font-bold text-center w-28">Kebutuhan</th>
                                        <th class="py-3 px-3 font-bold w-64">Pilih Vendor Pemenang</th>
                                        <th class="py-3 px-3 font-bold text-right w-32">Jumlah Diambil</th>
                                        <th class="py-3 px-3 font-bold text-right w-32">Harga Satuan</th>
                                        <th class="py-3 px-3 font-bold text-right w-36">Total Harga</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-200">
                                    <tr v-for="item in itemsMatrix" :key="item.rfq_item_id" class="hover:bg-slate-50">
                                        <td class="py-3 px-3">
                                            <div class="font-bold text-slate-900">{{ item.item_name }}</div>
                                            <div class="text-xs text-slate-600 font-mono">{{ item.item_code || '-' }}</div>
                                        </td>
                                        <td class="py-3 px-3 text-center font-semibold text-slate-800">
                                            {{ Number(item.target_quantity).toLocaleString('id-ID') }} {{ item.unit_name }}
                                            <div class="text-xs font-normal text-slate-600">Sisa setelah PO: {{ remainingAwardQuantity(item) }}</div>
                                        </td>
                                        <td class="py-3 px-3">
                                            <select
                                                v-if="splitAwards[item.rfq_item_id]"
                                                v-model="splitAwards[item.rfq_item_id].quotation_id"
                                                :disabled="remainingAwardQuantity(item) <= 0"
                                                @change="onSplitVendorChange(item.rfq_item_id)"
                                                class="w-full text-xs rounded-lg border-slate-300 py-1.5 px-2.5 focus:ring-blue-600 focus:border-blue-600 bg-white font-medium text-slate-900"
                                            >
                                                <option value="">{{ remainingAwardQuantity(item) <= 0 ? 'Sudah terikat PO' : '-- Belum Dipilih --' }}</option>
                                                <template v-for="sup in suppliers" :key="sup.quotation_id">
                                                    <option 
                                                        v-if="item.vendor_offers?.[sup.quotation_id]?.quoted && !item.vendor_offers[sup.quotation_id].purchase_order_id"
                                                        :value="sup.quotation_id"
                                                        :disabled="!eligibleQuotation(sup.quotation_id)"
                                                    >
                                                        {{ sup.supplier_name }} — {{ quotationValidityLabel(sup) }} ({{ formatBaseCurrency(item.vendor_offers[sup.quotation_id].base_unit_price) }} / {{ item.unit_name }})
                                                    </option>
                                                </template>
                                            </select>
                                        </td>
                                        <td class="py-3 px-3 text-right">
                                            <input 
                                                v-if="splitAwards[item.rfq_item_id]?.quotation_id"
                                                type="number"
                                                v-model.number="splitAwards[item.rfq_item_id].awarded_quantity"
                                                min="0.0001"
                                                :max="Math.min(remainingAwardQuantity(item), splitAwards[item.rfq_item_id].max_offered)"
                                                step="any"
                                                class="w-full text-right text-xs rounded-lg border-slate-300 py-1.5 px-2.5 focus:ring-blue-600 focus:border-blue-600 font-semibold text-slate-900"
                                            />
                                            <span v-else class="text-slate-500">-</span>
                                        </td>
                                        <td class="py-3 px-3 text-right font-medium text-slate-800">
                                            {{ splitAwards[item.rfq_item_id]?.quotation_id ? formatBaseCurrency(splitAwards[item.rfq_item_id].unit_price) : '-' }}
                                        </td>
                                        <td class="py-3 px-3 text-right font-bold text-slate-900">
                                            {{ splitAwards[item.rfq_item_id]?.quotation_id ? formatBaseCurrency(awardSubtotal(splitAwards[item.rfq_item_id].awarded_quantity, splitAwards[item.rfq_item_id].unit_price)) : '-' }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <template v-for="item in itemsMatrix" :key="`evaluation-${item.rfq_item_id}`">
                            <div v-if="splitAwards[item.rfq_item_id]?.quotation_id && Number(splitAwards[item.rfq_item_id].awarded_quantity) > 0" class="rounded-lg border border-slate-200 p-3 space-y-3">
                                <p class="text-sm font-semibold">Evaluasi {{ item.item_name }} — {{ quotationFor(splitAwards[item.rfq_item_id].quotation_id)?.supplier_name }}</p>
                                <AwardEvaluationFields v-model="splitAwards[item.rfq_item_id].evaluation" />
                            </div>
                        </template>

                        <p class="text-xs text-slate-600">Award yang sudah memiliki PO tetap terkunci. Pilihan baru dibatasi sisa kebutuhan; batalkan PO melalui proses yang sah untuk menggantinya. Nilai '-' berarti konversi belum tersedia, bukan nol.</p>
                        <p class="text-xs text-slate-600">Quotation kedaluwarsa tidak tersedia untuk award baru. Masa berlaku kosong berarti belum ditentukan dan tetap dapat dipilih. Harga termurah tidak menjamin quotation masih berlaku.</p>

                        <!-- Split Summary -->
                        <div class="bg-slate-100 px-4 py-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <span class="text-slate-800 font-medium">
                                Barang yang sudah dipilih vendornya: <strong class="text-slate-900">{{ splitAwardCount }} dari {{ itemsMatrix.length }} Barang</strong>
                            </span>
                            <span class="text-slate-800 font-medium">
                                Nilai Barang Pilihan Baru (sebelum pajak & ongkir): <strong class="text-slate-900 text-sm">{{ formatBaseCurrency(splitAwardTotalCost) }}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
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
                        :disabled="awardingSubmitting || loading || matrixLoadError || (awardMode === 'full' ? !eligibleQuotation(selectedFullSupplierId) : splitValidationErrors.length > 0 || splitAwardCount === 0)"
                        class="bg-blue-600 hover:bg-blue-700"
                    >
                        <RefreshCw v-if="awardingSubmitting" class="w-4 h-4 mr-1.5 animate-spin" />
                        <Check v-else class="w-4 h-4 mr-1.5" />
                        Simpan Keputusan Pemenang
                    </BaseButton>
                </div>
            </div>
        </div>
    </div>
</template>
