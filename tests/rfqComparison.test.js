import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse, compileScript } from '@vue/compiler-sfc'
import { ref, computed } from 'vue'
import * as comparison from '../src/utils/rfqComparison.js'
import * as formatter from '../src/composables/useFormatter.js'
import * as validity from '../src/utils/quotationValidity.js'

const { awardSubtotal, sumComparisonAmounts, isLowestUnitPrice, isLowestTotalCost, remainingAwardQuantity, defaultSplitOffer, totalCostExclusionText } = comparison

const offer = (overrides = {}) => ({
    quoted: true, supplier_quotation_item_id: 101, offered_quantity: 10,
    unit_price: 2, base_unit_price: 32000, base_subtotal: 320000,
    delta_target_price: -1000, is_lowest_unit_price: true,
    is_awarded: false, awarded_quantity: 0, purchase_order_id: null, ...overrides
})
const item = (vendor_offers = { 1: offer() }) => ({
    rfq_item_id: 10, item_name: 'Barang A', target_quantity: 10, target_price: 33000, vendor_offers
})

// Execute the real SFC setup with Vue reactivity; stub network, router and dialogs.
// Template syntax is checked by the production Vite build.
function page(items = [item()], options = {}) {
    const matrix = {
        comparison_currency: 'IDR', target_price_currency: 'IDR',
        rfq: { status: 'evaluation' }, items_matrix: items,
        suppliers: [{ quotation_id: 1, supplier_id: 1, supplier_name: 'USD supplier', currency: 'USD', validity_status: 'valid', can_award: true, can_create_purchase_order: true },
            { quotation_id: 2, supplier_id: 2, supplier_name: 'IDR supplier', currency: 'IDR', validity_status: 'unspecified', can_award: true, can_create_purchase_order: true }]
    }
    const requests = []
    const errors = []
    const poRequests = []
    const refreshes = []
    const deps = {
        vue: { ref, computed, onMounted: () => {} },
        'vue-router': { useRouter: () => ({}), useRoute: () => ({ params: { id: 7 } }) },
        '../../services/rfqServices.js': {
            getRfqComparisonMatrix: async () => {
                refreshes.push(true)
                if (options.refreshError) throw options.refreshError
                return { data: options.refreshMatrix || matrix }
            },
            awardRfq: async (...args) => { requests.push(args); if (options.awardError) throw options.awardError }
        },
        '../../services/purchaseOrderServices.js': { createPurchaseOrderFromRfq: async (...args) => {
            poRequests.push(args)
            if (options.poError) throw options.poError
            return { data: [{ id: 4 }] }
        } },
        '../../utils/swal.js': { showLoading: () => {}, showConfirm: async () => true, showSuccess: async () => {}, showError: error => errors.push(error) },
        '../../utils/quotationValidity.js': validity,
        '../../utils/rfqComparison.js': comparison,
        '../../composables/useFormatter.js': formatter
    }
    const source = readFileSync(new URL('../src/views/purchasing/RfqComparisonView.vue', import.meta.url), 'utf8')
    const { descriptor } = parse(source)
    const script = compileScript(descriptor, { id: 'rfq-test' }).content
        .replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (_, names, path) => `const {${names}} = deps[${JSON.stringify(path)}] || {}`)
        .replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, (_, name, path) => `const ${name} = deps[${JSON.stringify(path)}]?.default`)
        .replace('export default', 'return')
    const component = new Function('deps', script)(deps)
    const state = component.setup({}, { expose: () => {} })
    state.matrixData.value = matrix
    state.matrixData.value.suppliers.forEach(supplier => { supplier.review_version = 1 })
    return { state, requests, errors, poRequests, refreshes }
}

describe('RFQ comparison currency and ranking', () => {
    it('blocks unreviewed quotations and enables award only after server eligibility refresh', async () => {
        const { state, requests, errors } = page()
        state.matrixData.value.suppliers = state.matrixData.value.suppliers.map(supplier => ({ ...supplier,
            review_status: 'pending_review', review_mode: 'direct', is_review_approved: false, can_award: false,
        }))
        assert.equal(state.canAward.value, false)
        state.awardMode.value = 'full'
        state.selectedFullSupplierId.value = 1
        await state.submitAward()
        assert.equal(requests.length, 0)
        assert.match(errors[0], /Buyer berizin/)
        state.matrixData.value.suppliers[0] = { ...state.matrixData.value.suppliers[0],
            review_status: 'approved', is_review_approved: true, can_award: true }
        assert.equal(state.canAward.value, true)
    })
    it('sums normalized USD and IDR awards without mixing original currencies', () => {
        assert.equal(sumComparisonAmounts([awardSubtotal(3, 32000), awardSubtotal(2, 35000)]), 166000)
    })
    it('propagates unavailable conversion through subtotals and aggregates, preserving valid zero', () => {
        for (const missing of [null, undefined, '', NaN, Infinity]) {
            assert.equal(awardSubtotal(10, missing), null)
            assert.equal(sumComparisonAmounts([100, missing]), null)
        }
        assert.equal(awardSubtotal(10, 0), 0)
        assert.equal(sumComparisonAmounts([]), 0)
    })
    it('preserves backend ties and separates the unit winner from the total winner', () => {
        assert.equal(isLowestUnitPrice(offer()), true)
        assert.equal(isLowestUnitPrice(offer({ unit_price: 32000 })), true)
        assert.equal(isLowestUnitPrice(offer({ is_lowest_unit_price: false, is_lowest_price: true })), false)
        assert.equal(isLowestUnitPrice(offer({ base_unit_price: null })), false)
        assert.equal(isLowestTotalCost({ base_total_amount: 1150, is_total_cost_comparable: true, is_lowest_total_cost: false }), false)
        assert.equal(isLowestTotalCost({ base_total_amount: 1100, is_total_cost_comparable: true, is_lowest_total_cost: true }), true)
        assert.equal(isLowestTotalCost({ base_total_amount: 500, is_total_cost_comparable: false, is_lowest_total_cost: true }), false)
    })
    it('explains every backend exclusion code and unknown or missing comparison data', () => {
        for (const code of ['invalid_exchange_rate', 'no_rfq_items', 'missing_rfq_items', 'duplicate_rfq_items', 'quantity_mismatch', 'unexpected_rfq_items', 'future_code']) {
            assert.equal(typeof totalCostExclusionText({ total_cost_exclusion_reason: code }), 'string')
        }
        assert.equal(totalCostExclusionText({ is_total_cost_comparable: true }), null)
    })
    it('renders the base currency and uses backend HPS delta in the actual page', () => {
        const { state } = page()
        assert.equal(state.formatPriceDiffText(item(), offer()).text, `Lebih hemat ${formatter.formatCurrency(1000, 'IDR')} dari perkiraan`)
        assert.equal(state.formatPriceDiffText(item(), offer({ delta_target_price: null })), null)
        state.matrixData.value.comparison_currency = 'USD'
        assert.equal(state.formatBaseCurrency(12), formatter.formatCurrency(12, 'USD'))
    })
    it('uses converted amounts in awarded summaries and preserves unavailable totals', () => {
        const { state } = page([item({ 1: offer({ is_awarded: true, awarded_quantity: 3 }) })])
        assert.equal(state.awardedGoodsTotal.value, 96000)
        state.matrixData.value.items_matrix[0].vendor_offers[1].base_unit_price = null
        assert.equal(state.awardedGoodsTotal.value, null)
    })
})

describe('RFQ award integration', () => {
    it('requires explicit selection reasons in full and split modes', async () => {
        const { state, requests, errors } = page()
        state.openAwardModal()
        await state.submitAward()
        assert.equal(requests.length, 0)
        assert.match(errors.at(-1), /Alasan pemilihan wajib/)
        state.awardMode.value = 'full'
        state.fullEvaluation.value.selection_reason = '   '
        await state.submitAward()
        assert.equal(requests.length, 0)
    })
    it('submits non-price evidence and clears it when the selected supplier changes', async () => {
        const { state, requests } = page([item({ 1: offer(), 2: offer({ supplier_quotation_item_id: 202 }) })])
        state.openAwardModal()
        Object.assign(state.splitAwards.value[10].evaluation, { selection_reason: 'Better verified delivery', technical_compliance: 'deviation', warranty_terms: '12 months', evidence_reference: 'Attachment p2' })
        state.matrixData.value.suppliers[0].review_version = 2
        await state.submitAward()
        assert.equal(requests[0][1].awards[0].expected_review_version, 1)
        assert.equal(requests[0][1].awards[0].warranty_terms, '12 months')
        assert.equal(requests[0][1].awards[0].technical_compliance, 'deviation')
        state.splitAwards.value[10].quotation_id = 2
        state.onSplitVendorChange(10)
        assert.equal(state.splitAwards.value[10].evaluation.selection_reason, '')
        assert.equal(state.splitAwards.value[10].evaluation.technical_compliance, 'not_verified')
    })
    it('preserves PO commitments with four decimal quantities and excludes locked default offers', () => {
        const row = item({ 1: offer({ purchase_order_id: 4, awarded_quantity: 4.0001 }), 2: offer({ is_lowest_unit_price: false }) })
        assert.equal(remainingAwardQuantity(row), 5.9999)
        assert.equal(defaultSplitOffer(row)[0], '2')
        assert.equal(defaultSplitOffer(item({ 1: offer({ purchase_order_id: 4 }) })), undefined)
    })
    it('prioritizes existing unlocked award over a later cheaper offer', () => {
        assert.equal(defaultSplitOffer(item({ 1: offer({ is_awarded: true }), 2: offer() }))[0], '1')
    })
    it('caps a new split at remaining need and submits IDs/quantity without converted prices', async () => {
        const { state, requests } = page([item({
            1: offer({ purchase_order_id: 4, is_awarded: true, awarded_quantity: 5 }),
            2: offer({ supplier_quotation_item_id: 202, base_unit_price: 35000 })
        })])
        state.openAwardModal()
        assert.equal(state.splitAwards.value[10].quotation_id, 2)
        assert.equal(state.splitAwards.value[10].awarded_quantity, 5)
        assert.equal(state.splitAwardTotalCost.value, 175000)
        state.splitAwards.value[10].awarded_quantity = 6
        assert.equal(state.splitValidationErrors.value.length, 1)
        state.splitAwards.value[10].awarded_quantity = 5
        state.splitAwards.value[10].evaluation.selection_reason = 'Delivery meets production schedule'
        await state.submitAward()
        assert.deepEqual(requests[0], [7, { awards: [{ supplier_quotation_item_id: 202, awarded_quantity: 5, expected_review_version: 1, ...state.emptyEvaluation(), selection_reason: 'Delivery meets production schedule' }] }])
    })
    it('updates converted split prices on vendor change and does not treat null as zero', () => {
        const { state } = page([item({ 1: offer(), 2: offer({ base_unit_price: null, supplier_quotation_item_id: 202 }) })])
        state.openAwardModal()
        state.splitAwards.value[10].quotation_id = 2
        state.onSplitVendorChange(10)
        assert.equal(state.splitAwards.value[10].unit_price, null)
        assert.equal(state.splitAwardTotalCost.value, null)
        assert.equal(state.formatBaseCurrency(state.splitAwardTotalCost.value), '-')
    })
    it('full award skips PO items and allocates only the remaining quantity', async () => {
        const { state, requests } = page([item({
            1: offer({ purchase_order_id: 4, awarded_quantity: 5 }),
            2: offer({ supplier_quotation_item_id: 202 })
        })])
        state.awardMode.value = 'full'
        state.selectedFullSupplierId.value = 2
        state.onFullVendorChange()
        state.fullEvaluation.value.selection_reason = 'Delivery meets production schedule'
        await state.submitAward()
        assert.equal(requests[0][1].awards[0].awarded_quantity, 5)
        assert.equal(requests[0][1].awards[0].supplier_quotation_item_id, 202)
    })
    it('disables awarding when PO commitments fill the requirement', () => {
        const { state } = page([item({ 1: offer({ purchase_order_id: 4, awarded_quantity: 10 }) })])
        assert.equal(state.canAward.value, false)
        state.openAwardModal()
        assert.equal(state.splitAwards.value[10].quotation_id, '')
    })
})

describe('RFQ quotation validity integration', () => {
    const expire = supplier => Object.assign(supplier, {
        validity_status: 'expired', is_expired: true, can_award: false, can_create_purchase_order: false,
        valid_until: '2026-11-09', quotation_number: 'SQ-001'
    })

    it('skips an expired cheapest or existing unlocked award without changing ranking', () => {
        const { state } = page([item({ 1: offer({ is_awarded: true }), 2: offer({ is_lowest_unit_price: false }) })])
        expire(state.matrixData.value.suppliers[0])
        state.openAwardModal()
        assert.equal(state.selectedFullSupplierId.value, 2)
        assert.equal(state.splitAwards.value[10].quotation_id, 2)
        assert.equal(isLowestUnitPrice(state.itemsMatrix.value[0].vendor_offers[1]), true)
    })

    it('blocks expired full and split submissions including a changed selection', async () => {
        const { state, requests, errors } = page()
        state.openAwardModal()
        expire(state.matrixData.value.suppliers[0])
        await state.submitAward()
        assert.match(errors.at(-1), /kedaluwarsa/)
        state.awardMode.value = 'full'
        await state.submitAward()
        assert.equal(requests.length, 0)
        state.onSplitVendorChange(10)
        assert.equal(state.splitAwards.value[10].quotation_item_id, null)
    })

    it('leaves all-expired selections empty and explains unavailable options', () => {
        const { state } = page()
        state.matrixData.value.suppliers.forEach(expire)
        state.openAwardModal()
        assert.equal(state.selectedFullSupplierId.value, '')
        assert.equal(state.splitAwards.value[10].quotation_id, '')
        assert.equal(state.splitAwardCount.value, 0)
        assert.match(validity.quotationValidityLabel(state.suppliers.value[0]), /Kedaluwarsa/)
    })

    it('blocks a mixed PO batch, while preserving existing PO commitments', async () => {
        const { state, poRequests } = page([item({
            1: offer({ is_awarded: true, awarded_quantity: 4 }),
            2: offer({ is_awarded: true, awarded_quantity: 6, supplier_quotation_item_id: 202 })
        })])
        expire(state.matrixData.value.suppliers[0])
        await state.handleGeneratePurchaseOrders()
        assert.equal(poRequests.length, 0)
        state.matrixData.value.items_matrix[0].vendor_offers[1].purchase_order_id = 9
        assert.equal(state.poValidityErrors.value.length, 0)
        assert.equal(state.awardedSummaryList.value.length, 2)
        assert.equal(state.awardedSummaryList.value[0].purchase_order_id, 9)
        await state.handleGeneratePurchaseOrders()
        assert.equal(poRequests.length, 1)
        state.matrixData.value.items_matrix[0].vendor_offers[1].purchase_order_id = null
        await state.handleGeneratePurchaseOrders()
        assert.equal(poRequests.length, 1)
        assert.ok(state.poValidityErrors.value.length)
    })

    it('refreshes after an award rejection and keeps the selection for correction', async () => {
        const error = { response: { status: 422, data: { message: 'Quotation SQ-001 expired on 2026-11-09 (Asia/Jakarta).' } } }
        const refreshed = { rfq: { status: 'evaluation' }, items_matrix: [item()], suppliers: [expire({ quotation_id: 1 })] }
        const { state, errors, refreshes, requests } = page([item()], { awardError: error, refreshMatrix: refreshed })
        state.openAwardModal()
        state.splitAwards.value[10].evaluation.selection_reason = 'Delivery meets production schedule'
        await state.submitAward()
        assert.equal(refreshes.length, 1)
        assert.equal(errors.at(-1), error.response.data.message)
        assert.equal(state.isAwardModalOpen.value, true)
        assert.equal(state.splitAwards.value[10].quotation_id, 1)
        assert.ok(state.splitValidationErrors.value.length)
        await state.submitAward()
        assert.equal(requests.length, 1)
    })

    it('refreshes PO rejection and blocks stale actions when refresh fails', async () => {
        const error = { response: { status: 422, data: { message: 'Quotation expired.' } } }
        const { state, errors, poRequests, refreshes } = page([item({ 1: offer({ is_awarded: true, awarded_quantity: 10 }) })], {
            poError: error, refreshError: new Error('offline')
        })
        await state.handleGeneratePurchaseOrders()
        assert.equal(refreshes.length, 1)
        assert.equal(errors.at(-1), 'Quotation expired.')
        assert.equal(state.matrixLoadError.value, true)
        assert.equal(state.canAward.value, false)
        await state.handleGeneratePurchaseOrders()
        assert.equal(poRequests.length, 1)
    })
})
