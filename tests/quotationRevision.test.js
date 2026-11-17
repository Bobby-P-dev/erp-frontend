import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, watch, reactive, nextTick } from 'vue'
import { parse, compileScript } from '@vue/compiler-sfc'
import * as pricing from '../src/utils/quotationPricing.js'

function panel(options = {}) {
    const calls = [], events = []
    const props = reactive({ quotation: {
        id: 8, review_version: 3, currency: 'IDR', shipping_cost: 0,
        revision_actions: ['request_revision', 'view_history'],
        items: [{ id: 4, rfq_item_id: 5, item_description: 'Bolt', offered_quantity: 2, unit_price: 100, is_awarded: true, purchase_order_id: 99 }],
    }, disabled: false })
    const deps = {
        vue: { ref, watch },
        '@/utils/quotationPricing.js': pricing,
        '@/services/rfqServices.js': {
            getSupplierQuotationHistory: async id => { calls.push(['history', id]); return { data: { versions: [{ review_version: 1 }] } } },
            requestSupplierQuotationRevision: async (...args) => { calls.push(['request', ...args]); if (options.failure) throw options.failure },
            reviseSupplierQuotation: async (...args) => { calls.push(['revise', ...args]); if (options.failure) throw options.failure },
        },
        '@/services/fileServices.js': { uploadFile: async () => { calls.push(['upload']); if (options.uploadFailure) throw options.uploadFailure; return { data: { id: 42 } } } },
    }
    const { descriptor } = parse(readFileSync(new URL('../src/components/purchasing/rfq/detail/QuotationRevisionPanel.vue', import.meta.url), 'utf8'))
    const source = compileScript(descriptor, { id: 'revision-panel-test' }).content
        .replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (_, names, path) => `const {${names}} = deps[${JSON.stringify(path)}] || {}`)
        .replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, (_, name, path) => `const ${name} = deps[${JSON.stringify(path)}]?.default`)
        .replace('export default', 'return')
    const component = new Function('deps', source)(deps)
    return { state: component.setup(props, { expose: () => {}, emit: (...args) => events.push(args) }), calls, events, props }
}

describe('Quotation controlled revision', () => {
    it('requires both private reason and supplier message then sends expected version', async () => {
        const { state, calls, events } = panel()
        await state.requestRevision()
        assert.equal(calls.length, 0)
        state.reason.value = 'Internal price check'
        state.supplierMessage.value = 'Please revise the offer'
        await state.requestRevision()
        assert.deepEqual(calls[0], ['request', 8, { expected_review_version: 3, reason: 'Internal price check', supplier_message: 'Please revise the offer' }])
        assert.ok(events.some(([event]) => event === 'changed'))
    })
    it('copies editable fields and strips commitment/status fields from revision payload', async () => {
        const { state, props, calls } = panel()
        props.quotation.revision_actions = ['submit_revision']
        state.startEdit()
        state.draft.value.items[0].unit_price = 85
        assert.equal(props.quotation.items[0].unit_price, 100)
        state.reason.value = 'Revised supplier offer'
        await state.saveRevision()
        const payload = calls[0][2]
        assert.equal(payload.expected_review_version, 3)
        assert.equal(payload.items[0].unit_price, '85')
        assert.equal('is_awarded' in payload.items[0], false)
        assert.equal('purchase_order_id' in payload.items[0], false)
        assert.equal('review_status' in payload, false)
    })
    it('reloads stale or unauthorized state without claiming success', async () => {
        for (const status of [403, 409, 422]) {
            const { state, events } = panel({ failure: { response: { status, data: { message: 'Reload required' } } } })
            state.reason.value = 'Reason'
            state.supplierMessage.value = 'Message'
            await state.requestRevision()
            assert.equal(state.error.value, 'Reload required')
            assert.ok(events.some(([event]) => event === 'changed'))
            assert.equal(state.busy.value, false)
        }
    })
    it('requests a new final total for the buyer quantity and preserves its mode in manual revision', async () => {
        const { state, props, calls } = panel()
        props.quotation.items[0] = { ...props.quotation.items[0], pricing_schema_version: 1, pricing_mode: 'reconfirm',
            offered_quantity: '50', entered_total: '500000.00', price_input_basis: 'total', price_basis_quantity: '50' }
        props.quotation.revision_request = { requested_quantities: [{ rfq_item_id: 5, quantity: '30.0000' }] }
        state.startEdit()
        assert.equal(state.draft.value.items[0].offered_quantity, '30.0000')
        assert.equal(state.draft.value.items[0].entered_total, '')
        assert.equal(props.quotation.items[0].entered_total, '500000.00')
        state.draft.value.items[0].entered_total = '360000'
        state.reason.value = 'Final supplier total'
        await state.saveRevision()
        assert.equal(calls[0][2].items[0].pricing_mode, 'reconfirm')
        assert.equal(calls[0][2].items[0].entered_total, '360000')
        assert.equal('unit_price' in calls[0][2].items[0], false)
    })
    it('loads immutable version history and resets it on quotation/version change', async () => {
        const { state, props, calls } = panel()
        await state.loadHistory()
        assert.deepEqual(calls[0], ['history', 8])
        assert.equal(state.history.value.versions[0].review_version, 1)
        props.quotation.review_version = 4
        await nextTick()
        assert.equal(state.history.value, null)
    })
    it('does not submit while disabled', async () => {
        const { state, props, calls } = panel()
        props.disabled = true
        await state.requestRevision()
        await state.loadHistory()
        assert.equal(calls.length, 0)
    })
    it('uses uploaded attachment reference and blocks revision if upload fails', async () => {
        const success = panel()
        success.state.startEdit()
        success.state.reason.value = 'Attached new signed offer'
        success.state.attachment.value = { name: 'offer.pdf' }
        await success.state.saveRevision()
        assert.equal(success.calls[0][0], 'upload')
        assert.equal(success.calls[1][2].quotation_file_id, 42)
        const failure = panel({ uploadFailure: { response: { status: 500, data: { message: 'Upload failed' } } } })
        failure.state.startEdit()
        failure.state.reason.value = 'New attachment'
        failure.state.attachment.value = { name: 'offer.pdf' }
        await failure.state.saveRevision()
        assert.equal(failure.calls.length, 1)
        assert.equal(failure.state.error.value, 'Upload failed')
    })
})
