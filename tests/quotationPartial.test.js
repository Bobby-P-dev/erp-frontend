import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, computed } from 'vue'
import * as pricing from '../src/utils/quotationPricing.js'

function form(name, existing = null) {
    const submissions = [], errors = []
    const rfq = { id: 8, items: [
        { id: 10, item_name: 'Material katalog', target_quantity: '20.0000', unit_name: 'KG' },
        { id: 11, item_name: 'Material custom', target_quantity: '5.0000', unit_name: 'KG' },
    ], quotations: [], rfq_suppliers: [] }
    const portal = { rfq, portal: { can_submit: true, can_revise: !!existing }, existing_quotation: existing }
    const deps = {
        vue: { ref, computed, onMounted: () => {}, onUnmounted: () => {} },
        'vue-router': { useRouter: () => ({}), useRoute: () => ({ params: { token: 'token', id: 8 } }) },
        '@/stores/auth.js': { useAuthStore: () => ({}) },
        '@/utils/quotationPricing.js': pricing,
        '@/utils/quotationValidity.js': { quotationDateOrderError: () => null },
        '@/composables/purchasing/useRfqDeadline.js': { useRfqDeadline: () => ({ getDeadlineInfo: () => ({ canRespond: true }) }) },
        '@/composables/useFormatter.js': { formatCurrency: String },
        '@/services/taxServices.js': { searchTaxes: async () => ({ data: [] }) },
        '@/services/rfqServices.js': {
            getPublicPortalRfq: async () => ({ data: portal }),
            submitPublicPortalQuotation: async (token, data) => submissions.push(JSON.parse(data.get('items'))),
            recordSupplierQuotation: async payload => submissions.push(payload.items),
            showRfq: async () => ({ data: rfq }),
        },
        '@/utils/swal.js': { showError: (...args) => errors.push(args.join(' ')), showConfirm: async () => true, showSuccess: async () => {} },
    }
    const source = readFileSync(new URL(`../src/composables/purchasing/${name}.js`, import.meta.url), 'utf8')
        .replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (_, names, path) => `const {${names}} = deps[${JSON.stringify(path)}] || {}`)
        .replace('export function', 'function')
    const state = new Function('deps', `${source}; return ${name}()`)(deps)
    return { state, submissions, errors, rfq }
}

for (const channel of ['portal', 'manual']) {
    test(`${channel} validates and sends only offered rows; deselection updates totals and retains entered prices`, async () => {
        const { state, submissions, errors, rfq } = form(channel === 'portal' ? 'useSupplierPortalRfqForm' : 'useRfqDetail')
        if (channel === 'portal') await state.loadPortalData()
        else { state.rfq.value = rfq; state.openManualModal(2) }
        const draft = channel === 'portal' ? state.quoteForm.value : state.manualForm.value
        const submit = channel === 'portal' ? state.handleSubmit : state.submitManualQuotation
        draft.vendor_quotation_reference = 'PARTIAL-001'
        draft.items[0].unit_price = '100'
        draft.items[1].is_offered = false // No price or valid quantity is needed on this row.
        draft.items[1].offered_quantity = ''
        assert.equal((state.subtotalAmount || state.modalItemsSubtotal).value, 2000)
        await submit()
        assert.equal(errors.length, 0)
        assert.equal(submissions.length, 1)
        assert.deepEqual(submissions[0].map(item => item.rfq_item_id), [10])
        assert.equal('is_offered' in submissions[0][0], false)
        assert.equal(submissions[0][0].unit_price, '100')
    })

    test(`${channel} prevents empty offers and does not treat an unpriced selected row as free`, async () => {
        const { state, submissions, errors, rfq } = form(channel === 'portal' ? 'useSupplierPortalRfqForm' : 'useRfqDetail')
        if (channel === 'portal') await state.loadPortalData()
        else { state.rfq.value = rfq; state.openManualModal(2) }
        const draft = channel === 'portal' ? state.quoteForm.value : state.manualForm.value
        const submit = channel === 'portal' ? state.handleSubmit : state.submitManualQuotation
        draft.vendor_quotation_reference = 'PARTIAL-002'
        draft.items.forEach(item => { item.is_offered = false })
        await submit()
        assert.match(errors.at(-1), /minimal satu barang/)
        draft.items[0].is_offered = true
        await submit()
        assert.match(errors.at(-1), /Harga satuan/)
        assert.equal(submissions.length, 0)
        draft.items[0].unit_price = '0'
        await submit()
        assert.equal(submissions[0][0].unit_price, '0') // Explicitly free is still supported.
    })
}

test('portal revision restores the exact subset and allows adding a previously omitted item', async () => {
    const { state, submissions } = form('useSupplierPortalRfqForm', { review_version: 2,
        items: [{ rfq_item_id: '11', offered_quantity: '5', unit_price: '100' }] })
    await state.loadPortalData()
    const draft = state.quoteForm.value
    assert.deepEqual(draft.items.map(item => item.is_offered), [false, true])
    draft.vendor_quotation_reference = 'REV-1'
    draft.revision_reason = 'Updated availability'
    draft.items[0].is_offered = true
    draft.items[0].unit_price = '200'
    await state.handleSubmit()
    assert.deepEqual(submissions[0].map(item => item.rfq_item_id), [10, '11'])
})

test('quantity confirmation preserves every prior offered row but leaves other RFQ items unselected', () => {
    const rows = pricing.hydrateQuotationSelection([{ rfq_item_id: 1 }, { rfq_item_id: 2 }, { rfq_item_id: 3 }], {
        items: [{ rfq_item_id: 1 }, { rfq_item_id: 2 }], requested_quantities: [{ rfq_item_id: 1, quantity: '30' }],
    })
    assert.deepEqual(rows.map(item => item.is_offered), [true, true, false])
    assert.deepEqual(rows.map(item => item._offerRequired), [true, true, false])
    assert.equal(rows[0].entered_total, '')
    rows[1].is_offered = false
    assert.throws(() => pricing.quotationItems(rows), /tetap ditawarkan/)
})

test('an omitted tiered line is excluded from pricing preview and serialization without losing its input', () => {
    const rows = [{ rfq_item_id: 1, offered_quantity: '2', unit_price: '100' },
        { rfq_item_id: 2, is_offered: false, _pricingMode: 'tiered', price_tiers: [] }]
    assert.equal(pricing.hasPreviewPricing(rows), false)
    assert.equal(pricing.quotationItems(rows).length, 1)
    rows[1].is_offered = true
    assert.equal(pricing.hasPreviewPricing(rows), true)
    rows[0].is_offered = false
    rows[0].is_offered = true
    assert.equal(pricing.quotationItems(rows)[0].unit_price, '100')
})
