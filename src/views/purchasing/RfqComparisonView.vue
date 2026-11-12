<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getRfqComparisonMatrix, awardRfq } from '../../services/rfqServices.js'
import { createPurchaseOrderFromRfq } from '../../services/purchaseOrderServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { formatCurrency } from '../../composables/useFormatter.js'
import { comparisonNumber, awardSubtotal, sumComparisonAmounts, remainingAwardQuantity, splitAwardMaximum, defaultSplitOffer, totalCostExclusionText } from '../../utils/rfqComparison.js'
import { quotationValidityLabel, quotationValidityReason, canAwardQuotation, purchaseOrderValidityErrors } from '../../utils/quotationValidity.js'

import BaseBreadcrumb from '../../components/ui/BaseBreadcrumb.vue'
import RfqPriceComparison from '../../components/purchasing/rfq/RfqPriceComparison.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import QuotationReviewSection from '../../components/purchasing/rfq/detail/QuotationReviewSection.vue'
import AwardEvaluationFields from '../../components/purchasing/rfq/AwardEvaluationFields.vue'
import RfqAwardHistory from '../../components/purchasing/rfq/RfqAwardHistory.vue'

import {
    ArrowLeft,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    FileText,
    ArrowRight,
    Check,
    X
} from '@lucide/vue'

const route = useRoute()

const rfqId = computed(() => route.params.id)

const activeSection = ref('prices')
const sections = [
    { id: 'prices', label: 'Perbandingan harga' },
    { id: 'review', label: 'Rincian & revisi' },
    { id: 'results', label: 'Hasil pemilihan' }
]

const loading = ref(false)
const matrixData = ref(null)
const matrixLoadError = ref(false)

// Awarding Modal State
const isAwardModalOpen = ref(false)
const awardingSubmitting = ref(false)
const awardMode = ref('split') // 'full' | 'split'
const awardStep = ref(1)
const awardStepLabels = ['Pilih supplier', 'Isi evaluasi', 'Periksa keputusan']
const awardStepError = ref('')
const trapAwardFocus = event => {
    const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary')].filter(element => element.getClientRects().length)
    const first = controls[0], last = controls.at(-1)
    if (!first) return
    if (event.shiftKey && (document.activeElement === first || document.activeElement.id === 'award-step-heading')) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
const changeAwardStep = step => {
    awardStep.value = step
    awardStepError.value = ''
    if (typeof document !== 'undefined') queueMicrotask(() => {
        document.getElementById('award-step-heading')?.focus()
        document.getElementById('award-modal-body')?.scrollTo(0, 0)
    })
}

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
// Each RFQ item holds all editable supplier allocations; PO commitments stay in the matrix.
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
    awardStep.value = 1
    awardStepError.value = ''
    if (!suppliers.value || suppliers.value.length === 0) {
        showError('Belum ada penawaran vendor yang masuk untuk dievaluasi!')
        return
    }

    // Preselect first supplier for Full Awarding
    selectedFullSupplierId.value = suppliers.value.find(supplier => eligibleQuotation(supplier.quotation_id))?.quotation_id || ''
    fullEvaluation.value = emptyEvaluation()
    fullAwardVersion.value = quotationFor(selectedFullSupplierId.value)?.review_version

    const splits = {}
    itemsMatrix.value.forEach(item => {
        const saved = Object.entries(item.vendor_offers || {})
            .filter(([, offer]) => offer.quoted && offer.is_awarded && !offer.purchase_order_id)
        const fallback = remainingAwardQuantity(item) > 0 ? defaultSplitOffer(item, eligibleQuotation) : null
        const offers = saved.length ? saved : fallback ? [fallback] : [['', null]]
        splits[item.rfq_item_id] = offers.map(([quoteId, offer]) => {
            const version = quotationFor(quoteId)?.review_version
            const decision = (matrixData.value.award_decisions || []).find(row =>
                row.supplier_quotation_item_id === offer?.supplier_quotation_item_id && row.review_version === version)
            return {
                quotation_id: quoteId ? Number(quoteId) : '',
                quotation_item_id: offer?.supplier_quotation_item_id || null,
                expected_review_version: version,
                awarded_quantity: offer?.is_awarded ? Number(offer.awarded_quantity) : Math.min(remainingAwardQuantity(item), Number(offer?.offered_quantity || 0)),
                unit_price: comparisonNumber(offer?.base_unit_price),
                max_offered: Number(offer?.offered_quantity || 0),
                evaluation: { ...emptyEvaluation(), ...(decision?.action === 'selected' ? decision.evaluation : {}) }
            }
        })
    })

    splitAwards.value = splits
    isAwardModalOpen.value = true
    changeAwardStep(1)
}

const closeAwardModal = () => {
    if (awardingSubmitting.value) return
    isAwardModalOpen.value = false
}

// When vendor selection changes in Split Awarding mode
const onSplitVendorChange = (rfqItemId, index = 0) => {
    const split = splitAwards.value[rfqItemId]?.[index]
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
        split.awarded_quantity = splitMaximum(item, split)
    } else {
        split.quotation_item_id = null
        split.awarded_quantity = 0
    }
}

const splitMaximum = (item, split) => splitAwardMaximum(item, splitAwards.value[item.rfq_item_id] || [], split)
const supplierAlreadySelected = (item, split, quotationId) =>
    (splitAwards.value[item.rfq_item_id] || []).some(row => row !== split && String(row.quotation_id) === String(quotationId))
const addSplitSupplier = item => {
    splitAwards.value[item.rfq_item_id].push({ quotation_id: '', quotation_item_id: null,
        awarded_quantity: 0, unit_price: null, max_offered: 0, evaluation: emptyEvaluation() })
}
const removeSplitSupplier = (item, index) => splitAwards.value[item.rfq_item_id].splice(index, 1)
const capSplitQuantity = (item, split) => {
    const quantity = Number(split.awarded_quantity)
    if (Number.isFinite(quantity) && quantity > splitMaximum(item, split)) split.awarded_quantity = splitMaximum(item, split)
}

// Validation for Split Awarding
const splitValidationErrors = computed(() => {
    const errors = []
    if (awardMode.value !== 'split') return errors

    for (const item of itemsMatrix.value) {
        for (const split of splitAwards.value[item.rfq_item_id] || []) {
            if (!split.quotation_id) {
                continue
            }

            const qty = Number(split.awarded_quantity) || 0
            if (supplierAlreadySelected(item, split, split.quotation_id)) errors.push(`Supplier untuk '${item.item_name}' tidak boleh dipilih dua kali.`)
            if (!eligibleQuotation(split.quotation_id)) {
                errors.push(quotationValidityReason(quotationFor(split.quotation_id)) || 'Quotation tidak tersedia untuk award baru.')
                continue
            }
            if (!Number.isFinite(qty) || qty <= 0) {
                errors.push(`Kuantitas pemenang untuk item '${item.item_name}' harus lebih dari 0.`)
            } else if (qty > splitMaximum(item, split)) {
                errors.push(`Kuantitas pemenang (${qty}) melebihi sisa alokasi (${splitMaximum(item, split)}) untuk '${item.item_name}'.`)
            } else if (qty > Number(split.max_offered)) {
                errors.push(`Kuantitas pemenang (${qty}) melebihi kuantitas yang ditawarkan vendor (${split.max_offered}) untuk '${item.item_name}'.`)
            }
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
    return sumComparisonAmounts(Object.values(splitAwards.value).flat()
        .filter(split => split.quotation_id && Number(split.awarded_quantity) > 0)
        .map(split => awardSubtotal(split.awarded_quantity, split.unit_price)))
})

const splitAwardCount = computed(() => Object.values(splitAwards.value).flat()
    .filter(split => split.quotation_id && Number(split.awarded_quantity) > 0).length)

// Preview and evaluation use one identity per supplier allocation.
const decisionRows = computed(() => itemsMatrix.value.flatMap(item => {
    const allocations = awardMode.value === 'full' ? [null] : splitAwards.value[item.rfq_item_id] || []
    return allocations.flatMap(split => {
        const quoteId = awardMode.value === 'full' ? selectedFullSupplierId.value : split?.quotation_id
        const offer = item.vendor_offers?.[quoteId]
        const quantity = awardMode.value === 'full'
            ? Math.min(remainingAwardQuantity(item), Number(offer?.offered_quantity || 0))
            : Number(split?.awarded_quantity || 0)
        if (!quoteId || !offer?.quoted || offer.purchase_order_id || !offer.supplier_quotation_item_id || remainingAwardQuantity(item) <= 0 || quantity <= 0) return []
        return [{ key: `${item.rfq_item_id}:${quoteId}`, item, split, supplier: quotationFor(quoteId), quantity,
            subtotal: awardSubtotal(quantity, offer.base_unit_price),
            evaluation: awardMode.value === 'full' ? fullEvaluation.value : split.evaluation }]
    })
}))
const decisionTotal = computed(() => sumComparisonAmounts(decisionRows.value.map(row => row.subtotal)))
const selectionReady = computed(() => !loading.value && !matrixLoadError.value && decisionRows.value.length > 0 &&
    (awardMode.value === 'full' ? eligibleQuotation(selectedFullSupplierId.value) : splitValidationErrors.value.length === 0))
const evaluationReady = computed(() => decisionRows.value.length > 0 && decisionRows.value.every(row => row.evaluation.selection_reason?.trim()))
const nextAwardStep = () => {
    if (!selectionReady.value) { awardStepError.value = 'Pilih supplier dan jumlah yang valid untuk sedikitnya satu barang.'; return }
    if (awardStep.value === 2 && !evaluationReady.value) {
        awardStepError.value = 'Isi alasan pemilihan untuk setiap barang yang dipilih.'
        return
    }
    changeAwardStep(awardStep.value + 1)
}

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
            for (const split of splitAwards.value[item.rfq_item_id] || []) {
                if (split.quotation_id && split.quotation_item_id && Number(split.awarded_quantity) > 0) {
                    awardsPayload.push({
                        supplier_quotation_item_id: split.quotation_item_id,
                        awarded_quantity: Number(split.awarded_quantity),
                        expected_review_version: split.expected_review_version,
                        ...split.evaluation
                    })
                }
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
        `Simpan keputusan untuk ${awardsPayload.length} alokasi dengan ${awardMode.value === 'full' ? 'satu supplier' : 'supplier per barang'}? Keputusan ini belum membuat Purchase Order.`
    )
    if (!confirmed) return

    awardingSubmitting.value = true
    try {
        await awardRfq(rfqId.value, { awards: awardsPayload })
        await showSuccess('Pemenang tender RFQ berhasil ditetapkan!')
        isAwardModalOpen.value = false
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
    <div class="rfq-comparison w-full min-w-0 space-y-6">
        <BaseBreadcrumb
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Tender RFQ', to: { name: 'user.purchasing.rfq' } },
                {
                    label: rfq?.rfq_number || 'Detail RFQ',
                    to: { name: 'user.purchasing.rfq.detail', params: { id: rfqId } }
                },
                { label: 'Perbandingan' }
            ]"
        />
        <header class="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
                <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Perbandingan penawaran</h1>
                <p class="mt-2 text-sm text-slate-600">
                    {{ rfq?.rfq_number
                    }}<template v-if="rfq">
                        · {{ statistics.total_items ?? itemsMatrix.length }} barang ·
                        {{ statistics.total_quotations_received ?? suppliers.length }} dari
                        {{ statistics.total_suppliers_invited ?? suppliers.length }} supplier mengajukan
                        penawaran</template
                    >
                </p>
                <div v-if="rfq" class="mt-3 flex flex-wrap items-center gap-3">
                    <StatusBadge :status="rfq.status" /><span
                        v-if="rfq.is_awarded"
                        class="text-sm text-emerald-800"
                        >Pemenang sudah dipilih</span
                    >
                </div>
            </div>
            <div class="flex flex-wrap gap-3">
                <RouterLink
                    :to="{ name: 'user.purchasing.rfq.detail', params: { id: rfqId } }"
                    class="comparison-secondary"
                    ><ArrowLeft class="size-4" />Detail RFQ</RouterLink
                >
                <button type="button" class="comparison-secondary" :disabled="loading" @click="fetchMatrix()">
                    <RefreshCw class="size-4" :class="{ 'animate-spin': loading }" />Muat ulang
                </button>
                <BaseButton v-if="canAward" variant="primary" class="bg-[#014BAA] hover:bg-blue-800" @click="openAwardModal"
                    >Evaluasi & pilih pemenang</BaseButton
                >
            </div>
        </header>
        <div v-if="loading && !matrixData" role="status" class="comparison-panel text-center text-slate-600">
            <RefreshCw class="mx-auto mb-3 size-6 animate-spin" />Memuat perbandingan penawaran…
        </div>
        <div v-else-if="!matrixData && matrixLoadError" role="alert" class="comparison-panel text-slate-700">
            Perbandingan belum dapat dimuat. Gunakan tombol Muat ulang untuk mencoba kembali.
        </div>
        <template v-if="matrixData">
            <p v-if="matrixLoadError" role="alert" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                Data terbaru gagal dimuat. Muat ulang sebelum menetapkan pemenang atau membuat PO.
            </p>
            <div
                v-if="awardedSummaryList.length && activeSection !== 'results'"
                class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm"
            >
                <p class="text-slate-700">
                    {{
                        hasUnconvertedAwards && poValidityErrors.length
                            ? 'Penawaran terpilih belum memenuhi syarat pembuatan PO.'
                            : 'Hasil pemilihan supplier sudah tersedia.'
                    }}
                </p>
                <button
                    type="button"
                    class="font-medium text-[#014BAA] cursor-pointer"
                    @click="activeSection = 'results'"
                >
                    Lihat hasil pemilihan →
                </button>
            </div>
            <nav
                aria-label="Bagian perbandingan tender"
                class="comparison-navigation flex flex-wrap gap-2 border-b border-slate-200 pb-3"
            >
                <button
                    v-for="section in sections"
                    :key="section.id"
                    type="button"
                    :aria-pressed="activeSection === section.id"
                    :class="
                        activeSection === section.id
                            ? 'bg-[#014BAA] text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                    "
                    class="rounded-xl px-4 py-3 text-sm font-medium cursor-pointer"
                    @click="activeSection = section.id"
                >
                    {{ section.label }}
                </button>
            </nav>
            <section v-show="activeSection === 'prices'" aria-label="Perbandingan harga">
                <div v-if="!suppliers.length" class="comparison-panel py-12 text-center">
                    <h2 class="text-lg font-semibold text-slate-900">Belum ada penawaran masuk</h2>
                    <p class="mt-2 text-sm text-slate-600">
                        Supplier belum mengirimkan penawaran. Anda dapat mencatat penawaran dari halaman
                        detail RFQ.
                    </p>
                </div>
                <RfqPriceComparison
                    v-else
                    :suppliers="suppliers"
                        :price-difference="formatPriceDiffText"
                    :items="itemsMatrix"
                    :currency="comparisonCurrency"
                    :target-currency="matrixData.target_price_currency || comparisonCurrency"
                />
            </section>
            <section v-show="activeSection === 'review'" aria-label="Pemeriksaan penawaran" class="space-y-5">
                <div>
                    <h2 class="text-lg font-semibold text-slate-900">Pelajari rincian penawaran</h2>
                    <p class="mt-2 text-sm text-slate-600">
                        Approval cukup pada PR. Lihat rincian atau minta revisi bila diperlukan, lalu lanjutkan ke evaluasi & pemilihan pemenang tanpa approval tambahan.
                    </p>
                </div>
                <QuotationReviewSection
                    :key="rfqId"
                    :quotations="suppliers"
                    :disabled="loading || matrixLoadError"
                    :reload="fetchMatrix"
                />
                <p v-if="!suppliers.length" class="comparison-panel text-sm text-slate-600">
                    Belum ada penawaran untuk diperiksa.
                </p>
                <div v-if="suppliers.length" class="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-blue-50/60 p-5">
                    <div><p class="text-sm font-medium text-slate-900">Berikutnya: evaluasi & pilih pemenang</p><p class="mt-1 text-sm text-slate-600">Pilih supplier, isi penilaian, lalu periksa keputusan sebelum menyimpan.</p></div>
                    <BaseButton v-if="canAward" size="sm" @click="openAwardModal">Lanjut ke evaluasi<ArrowRight class="size-4" /></BaseButton>
                    <p v-else class="text-sm text-slate-600">Pemilihan tersedia saat status tender, sisa kebutuhan, dan penawaran memenuhi syarat.</p>
                </div>
            </section>
            <section v-show="activeSection === 'results'" aria-label="Hasil pemilihan" class="space-y-5">
                <div v-if="awardedSummaryList.length > 0" class="comparison-panel space-y-5">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 class="text-sm font-bold text-emerald-950 flex items-center gap-2">
                                <CheckCircle2 class="w-4 h-4 text-emerald-700 shrink-0" />
                                Ringkasan Keputusan Pemenang Tender
                            </h3>
                            <p class="text-xs text-emerald-800 mt-0.5">
                                Nilai Barang Terpilih (sebelum pajak & ongkir):
                                <strong>{{ formatBaseCurrency(awardedGoodsTotal) }}</strong>
                            </p>
                        </div>

                        <div class="flex items-center gap-2.5">
                            <BaseButton
                                v-if="hasUnconvertedAwards"
                                variant="primary"
                                size="sm"
                                :disabled="generatingPo || loading || poValidityErrors.length > 0"
                                @click="handleGeneratePurchaseOrders"
                                class="bg-[#014BAA] hover:bg-blue-800 text-white"
                            >
                                <FileText class="w-4 h-4 mr-1.5" />
                                Terbitkan Purchase Order (PO)
                            </BaseButton>
                            <RouterLink
                                v-else-if="generatedPurchaseOrders.length === 1"
                                :to="{
                                    name: 'user.purchasing.orders.detail',
                                    params: { id: generatedPurchaseOrders[0].id }
                                }"
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

                    <div
                        v-if="hasUnconvertedAwards && poValidityErrors.length"
                        role="alert"
                        class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 space-y-2"
                    >
                        <p>PO belum dapat dibuat. Periksa syarat penawaran terpilih di bawah.</p>
                        <p v-for="reason in poValidityErrors" :key="reason">{{ reason }}</p>
                    </div>
                    <div class="divide-y divide-slate-100">
                        <div
                            v-for="win in awardedSummaryList"
                            :key="`${win.rfq_item_id}-${win.supplier_name}`"
                            class="border-t border-slate-100 py-4 flex flex-wrap items-start justify-between gap-4"
                        >
                            <div>
                                <div class="text-sm font-bold text-slate-900">
                                    {{ win.item_name }}
                                    <span class="font-normal text-slate-600"
                                        >({{ Number(win.awarded_quantity).toLocaleString('id-ID') }}
                                        {{ win.unit_name }})</span
                                    >
                                </div>
                                <div class="text-xs text-slate-700 mt-0.5 flex flex-wrap items-center gap-2">
                                    <span
                                        >Vendor Terpilih:
                                        <strong class="text-emerald-800">{{
                                            win.supplier_name
                                        }}</strong></span
                                    >
                                    <span>{{ quotationValidityLabel(quotationFor(win.quotation_id)) }}</span>
                                    <span v-if="win.purchase_order_id" class="text-slate-600"
                                        >Komitmen PO tetap berlaku.</span
                                    >
                                    <RouterLink
                                        v-if="win.purchase_order_id"
                                        :to="{
                                            name: 'user.purchasing.orders.detail',
                                            params: { id: win.purchase_order_id }
                                        }"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-bold hover:bg-blue-100"
                                    >
                                        {{ win.purchase_order_number || `PO #${win.purchase_order_id}` }}
                                        <ArrowRight class="w-3 h-3" />
                                    </RouterLink>
                                </div>
                            </div>
                            <div class="text-right shrink-0">
                                <div class="text-xs text-slate-600">
                                    {{ formatBaseCurrency(win.unit_price) }} / {{ win.unit_name }}
                                </div>
                                <div class="text-sm font-bold text-slate-900">
                                    {{ formatBaseCurrency(win.subtotal) }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="!awardedSummaryList.length" class="comparison-panel">
                    <h2 class="text-lg font-semibold text-slate-900">Pemenang belum dipilih</h2>
                    <p class="mt-2 text-sm text-slate-600">
                        Bandingkan harga dan periksa penawaran terlebih dahulu. Tombol Evaluasi & pilih pemenang tersedia
                        saat syarat tender dan penawaran terpenuhi.
                    </p>
                </div>
                <details class="comparison-panel">
                    <summary class="cursor-pointer text-base font-medium text-slate-900">
                        Dasar pemilihan & riwayat keputusan
                        <span class="ml-2 text-sm font-normal text-slate-500"
                            >{{ matrixData.award_decisions?.length || 0 }} catatan</span
                        >
                    </summary>
                    <div class="mt-5"><RfqAwardHistory :decisions="matrixData.award_decisions || []" /></div>
                </details>
            </section>
        </template>

        <!-- Guided decision: selection, evaluation, then a read-only review. -->
        <div v-if="isAwardModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6" @click.self="closeAwardModal" @keydown.esc.stop="closeAwardModal">
            <div role="dialog" aria-modal="true" aria-labelledby="award-dialog-title" aria-describedby="award-dialog-description" @keydown.tab="trapAwardFocus" class="award-dialog flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <header class="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
                    <div><h2 id="award-dialog-title" class="text-lg font-semibold text-slate-900">Evaluasi & pilih pemenang</h2><p id="award-dialog-description" class="mt-1 text-sm text-slate-500">{{ rfq.rfq_number }} · Keputusan disimpan setelah Anda memeriksa hasilnya.</p></div>
                    <button type="button" aria-label="Tutup pemilihan pemenang" :disabled="awardingSubmitting" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" @click="closeAwardModal"><X class="size-5" /></button>
                </header>
                <div id="award-modal-body" class="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
                    <ol aria-label="Langkah pemilihan pemenang" class="mb-7 grid grid-cols-3 gap-3">
                        <li v-for="(label, index) in awardStepLabels" :key="label" :aria-current="awardStep === index + 1 ? 'step' : undefined" class="border-t-2 pt-3 text-sm" :class="awardStep >= index + 1 ? 'border-blue-600 text-blue-800' : 'border-slate-200 text-slate-500'"><span class="mb-1 block text-xs">Langkah {{ index + 1 }}</span><span class="font-medium">{{ label }}</span></li>
                    </ol>
                    <h3 id="award-step-heading" tabindex="-1" class="text-lg font-semibold text-slate-900">{{ awardStep === 1 ? 'Siapa yang akan memasok barang?' : awardStep === 2 ? 'Apa dasar pemilihan Anda?' : 'Pastikan keputusan sudah benar' }}</h3>
                    <p class="mb-6 mt-2 text-sm text-slate-500">{{ awardStep === 1 ? 'Pilihan awal adalah saran. Periksa supplier dan jumlah sebelum melanjutkan.' : awardStep === 2 ? 'Periksa kesesuaian spesifikasi dan tulis alasan pemilihan. Catatan lainnya opsional.' : 'Periksa barang, supplier, jumlah, dan alasan. Keputusan ini belum membuat PO.' }}</p>
                    <div v-if="awardStep === 1" class="space-y-6">
                        <fieldset class="space-y-3">
                            <legend class="mb-3 text-sm font-medium text-slate-800">Cara memilih supplier</legend>
                            <div class="grid gap-3 sm:grid-cols-2">
                                <label v-for="mode in [{id:'split',title:'Supplier per barang',description:'Bagi jumlah setiap barang ke satu atau beberapa supplier.'},{id:'full',title:'Satu supplier',description:'Pilih satu supplier untuk barang yang ditawarkannya.'}]" :key="mode.id" class="flex cursor-pointer items-start gap-3 rounded-xl border p-4" :class="awardMode === mode.id ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200'">
                                    <input v-model="awardMode" type="radio" name="award-mode" :value="mode.id" class="mt-1 size-4 shrink-0" /><span><span class="block text-sm font-medium text-slate-900">{{ mode.title }}</span><span class="mt-1 block text-sm text-slate-500">{{ mode.description }}</span></span>
                                </label>
                            </div>
                        </fieldset>
                        <template v-if="awardMode === 'full'">
                            <label class="block text-sm font-medium text-slate-800">Supplier yang dipilih
                                <select v-model="selectedFullSupplierId" class="award-input mt-2" @change="onFullVendorChange"><option value="">Pilih supplier</option><option v-for="sup in suppliers" :key="sup.quotation_id" :value="sup.quotation_id" :disabled="!eligibleQuotation(sup.quotation_id)">{{ sup.supplier_name }} · {{ quotationValidityLabel(sup) }}</option></select>
                            </label>
                            <div v-if="fullAwardSummary" class="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><p>Total seluruh penawaran supplier: <strong class="text-slate-900">{{ formatBaseCurrency(fullAwardSummary.base_total_amount) }}</strong> (termasuk pajak & ongkir).</p><p class="mt-2">Keputusan hanya mencakup barang yang ditawarkan dan sisa kebutuhan yang belum terikat PO. Periksa cakupannya pada langkah terakhir.</p><p v-if="totalCostExclusionText(fullAwardSummary)" class="mt-2 text-amber-800">Total tidak diranking: {{ totalCostExclusionText(fullAwardSummary) }}</p></div>
                        </template>
                        <template v-else>
                            <article v-for="item in itemsMatrix" :key="item.rfq_item_id" class="rounded-xl border border-slate-200 p-5">
                                <div class="mb-5 flex flex-wrap items-start justify-between gap-2"><div><h4 class="text-base font-medium text-slate-900">{{ item.item_name }}</h4><p v-if="item.item_code" class="mt-1 text-sm text-slate-500">{{ item.item_code }}</p></div><p class="text-sm text-slate-500">Kebutuhan belum terikat PO: <strong class="text-slate-800">{{ remainingAwardQuantity(item) }} {{ item.unit_name }}</strong></p></div>
                                <p v-if="remainingAwardQuantity(item) <= 0" class="text-sm text-slate-500">Kebutuhan sudah terikat PO. Barang ini tidak dipilih kembali.</p>
                                <template v-else>
                                    <div v-for="(split, index) in splitAwards[item.rfq_item_id]" :key="index" class="mb-4 rounded-xl bg-slate-50 p-4">
                                        <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                                            <label class="min-w-0 text-sm font-medium text-slate-800">Supplier {{ index + 1 }}
                                                <select v-model="split.quotation_id" class="award-input mt-2" @change="onSplitVendorChange(item.rfq_item_id, index)"><option value="">Pilih supplier</option><template v-for="sup in suppliers" :key="sup.quotation_id"><option v-if="item.vendor_offers?.[sup.quotation_id]?.quoted && !item.vendor_offers[sup.quotation_id].purchase_order_id" :value="sup.quotation_id" :disabled="!eligibleQuotation(sup.quotation_id) || supplierAlreadySelected(item, split, sup.quotation_id)">{{ sup.supplier_name }} · {{ formatBaseCurrency(item.vendor_offers[sup.quotation_id].base_unit_price) }} / {{ item.unit_name }}</option></template></select>
                                            </label>
                                            <label v-if="split.quotation_id" class="text-sm font-medium text-slate-800">Jumlah ({{ item.unit_name }})
                                                <input v-model.number="split.awarded_quantity" type="number" min="0.0001" :max="splitMaximum(item, split)" step="0.0001" class="award-input mt-2" @input="capSplitQuantity(item, split)" /><span class="mt-2 block text-sm font-normal text-slate-500">Maks. {{ splitMaximum(item, split) }} {{ item.unit_name }}</span>
                                            </label>
                                        </div>
                                        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><span v-if="split.quotation_id" class="text-slate-600">Nilai barang <strong>{{ formatBaseCurrency(awardSubtotal(split.awarded_quantity, split.unit_price)) }}</strong></span><BaseButton variant="secondary" size="sm" @click="removeSplitSupplier(item, index)">Hapus supplier</BaseButton></div>
                                    </div>
                                    <BaseButton variant="secondary" size="sm" @click="addSplitSupplier(item)">Tambah supplier</BaseButton>
                                    <p class="mt-3 text-sm text-slate-500">Bagi jumlah kebutuhan ke beberapa supplier. Batas setiap supplier mengikuti alokasi supplier lainnya. Alokasi tersimpan yang belum terikat PO ditampilkan untuk diperbarui bersama.</p>
                                </template>
                            </article>
                        </template>
                        <ul v-if="splitValidationErrors.length" role="alert" class="space-y-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><li v-for="error in splitValidationErrors" :key="error">{{ error }}</li></ul>
                        <details class="text-sm text-slate-500"><summary class="cursor-pointer text-slate-700">Ketentuan pilihan & jumlah</summary><p class="mt-3">Penawaran harus memenuhi syarat pemeriksaan dan masa berlaku. Jumlah dibatasi sisa kebutuhan serta jumlah yang ditawarkan. Pilihan yang sudah terikat PO tetap terkunci. Tanda “—” berarti nilai belum tersedia, bukan nol.</p></details>
                    </div>
                    <div v-else-if="awardStep === 2" class="space-y-6">
                        <section v-if="awardMode === 'full'" class="rounded-xl border border-slate-200 p-5"><h4 class="mb-2 text-base font-medium text-slate-900">{{ fullAwardSummary?.supplier_name }}</h4><p class="mb-6 text-sm text-slate-500">Evaluasi ini berlaku untuk {{ decisionRows.length }} barang yang dipilih dari supplier ini.</p><AwardEvaluationFields v-model="fullEvaluation" /></section>
                        <section v-for="row in awardMode === 'split' ? decisionRows : []" :key="row.key" class="rounded-xl border border-slate-200 p-5"><h4 class="text-base font-medium text-slate-900">{{ row.item.item_name }}</h4><p class="mb-6 mt-2 text-sm text-slate-500">{{ row.supplier?.supplier_name }} · {{ row.quantity }} {{ row.item.unit_name }}</p><AwardEvaluationFields v-model="row.split.evaluation" /></section>
                    </div>
                    <div v-else class="space-y-5">
                        <article v-for="row in decisionRows" :key="row.key" class="rounded-xl border border-slate-200 p-5"><h4 class="text-base font-medium text-slate-900">{{ row.item.item_name }}</h4><p class="mt-2 text-sm text-slate-600">{{ row.supplier?.supplier_name }}</p><dl class="my-5 grid grid-cols-2 gap-4 text-sm"><div><dt class="text-slate-500">Jumlah</dt><dd class="mt-1 font-medium">{{ row.quantity }} {{ row.item.unit_name }}</dd></div><div><dt class="text-slate-500">Nilai barang</dt><dd class="mt-1 font-medium">{{ formatBaseCurrency(row.subtotal) }}</dd></div><div class="col-span-2"><dt class="text-slate-500">Kesesuaian spesifikasi</dt><dd class="mt-1">{{ {not_verified:'Belum diverifikasi',compliant:'Sesuai spesifikasi',deviation:'Ada penyimpangan spesifikasi'}[row.evaluation.technical_compliance] }}</dd></div></dl><p class="text-sm text-slate-500">Alasan pemilihan</p><p class="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">{{ row.evaluation.selection_reason }}</p><details v-if="row.evaluation.technical_notes || row.evaluation.commercial_notes || row.evaluation.warranty_terms || row.evaluation.evidence_reference" class="mt-4 text-sm"><summary class="cursor-pointer text-blue-700">Catatan & bukti</summary><dl class="mt-3 space-y-3"><template v-for="field in [{key:'technical_notes',label:'Catatan teknis'},{key:'commercial_notes',label:'Pembayaran & pengiriman'},{key:'warranty_terms',label:'Garansi'},{key:'evidence_reference',label:'Bukti'}]" :key="field.key"><div v-if="row.evaluation[field.key]"><dt class="text-slate-500">{{ field.label }}</dt><dd class="mt-1 whitespace-pre-wrap break-words">{{ row.evaluation[field.key] }}</dd></div></template></dl></details></article>
                        <div class="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-5 text-sm"><span>{{ decisionRows.length }} alokasi supplier dipilih</span><span>Total nilai barang <strong>{{ formatBaseCurrency(decisionTotal) }}</strong></span><p class="w-full text-slate-500">Sebelum pajak & ongkir. Barang yang tidak tercantum tidak termasuk keputusan ini.</p></div>
                    </div>
                    <p v-if="awardStepError" role="alert" class="mt-5 rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{{ awardStepError }}</p>
                </div>
                <footer class="award-footer grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:px-7">
                    <BaseButton variant="secondary" size="sm" :disabled="awardingSubmitting" @click="closeAwardModal">Batal</BaseButton>
                    <div class="contents sm:flex sm:flex-wrap sm:gap-2"><BaseButton v-if="awardStep > 1" variant="secondary" size="sm" :disabled="awardingSubmitting" @click="changeAwardStep(awardStep - 1)">Sebelumnya</BaseButton><BaseButton v-if="awardStep < 3" class="award-primary" size="sm" :disabled="loading || matrixLoadError || (awardStep === 1 && !selectionReady)" @click="nextAwardStep">{{ awardStep === 1 ? 'Lanjut ke evaluasi' : 'Periksa keputusan' }}<ArrowRight class="size-4" /></BaseButton><BaseButton v-else class="award-primary" size="sm" :disabled="awardingSubmitting || !selectionReady || !evaluationReady" @click="submitAward"><RefreshCw v-if="awardingSubmitting" class="size-4 animate-spin" /><Check v-else class="size-4" />{{ awardingSubmitting ? 'Menyimpan…' : 'Tetapkan pemenang' }}</BaseButton></div>
                </footer>
            </div>
        </div>
    </div>
</template>

<style scoped>
.award-input { display: block; width: 100%; min-width: 0; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; background: white; font-size: 14px; color: #0f172a; font-weight: 400; }
.award-dialog :focus-visible { outline: 2px solid #014baa; outline-offset: 3px; }
@media (max-width: 639px) { .award-footer :deep(.award-primary) { grid-column: 1 / -1; } }
.rfq-comparison {
    color: #334155;
}
.rfq-comparison :deep(.comparison-panel) {
    min-width: 0;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 24px;
    background: white;
}
.comparison-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 10px 16px;
    background: white;
    font-size: 14px;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
}
.comparison-secondary:hover {
    background: #f8fafc;
}
.comparison-secondary:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
.rfq-comparison :deep(.text-xs),
.rfq-comparison :deep(.text-\[11px\]) {
    font-size: 14px;
    line-height: 1.65;
}
.rfq-comparison :deep(summary),
.rfq-comparison :deep(button),
.rfq-comparison :deep(a) {
    outline-offset: 3px;
}
.rfq-comparison :deep(:focus-visible) {
    outline: 2px solid #014baa;
}
@media (max-width: 639px) {
    .rfq-comparison :deep(.comparison-panel) {
        padding: 20px 16px;
    }
    .comparison-navigation {
        display: grid;
        grid-template-columns: 1fr;
    }
    .comparison-navigation button {
        text-align: left;
    }
}
</style>
