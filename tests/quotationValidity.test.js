import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, computed } from 'vue'
import * as validity from '../src/utils/quotationValidity.js'
import { rfqDeadlineInfo } from '../src/utils/rfqDeadline.js'

const openDeadline = { server_now: '2026-11-09T12:00:00+07:00', deadline_at: '2026-11-09T23:59:59.999+07:00', can_receive_quotation: true }

const valid = { quotation_id: 1, validity_status: 'valid', can_award: true, can_create_purchase_order: true }
const expired = { ...valid, validity_status: 'expired', is_expired: true, can_award: false, can_create_purchase_order: false, valid_until: '2026-11-09', quotation_number: 'SQ-001' }

function composable(name, services = {}) {
    const errors = []
    const requests = []
    const deps = {
        vue: { ref, computed, onMounted: () => {}, onUnmounted: () => {} },
        '@/composables/purchasing/useRfqDeadline.js': { useRfqDeadline: () => ({ getDeadlineInfo: rfqDeadlineInfo }) },
        'vue-router': { useRouter: () => ({}), useRoute: () => ({ params: { id: 7, token: 'token' } }) },
        '@/stores/auth.js': { useAuthStore: () => ({}) },
        '@/services/rfqServices.js': {
            showRfq: async () => ({ data: { ...openDeadline, id: 7, status: 'completed', items: [{ id: 10, target_quantity: 10 }], quotations: [{ id: 1, items: [{ is_awarded: true, purchase_order_id: null }] }] } }),
            getRfqComparisonMatrix: async () => ({ data: { suppliers: [valid] } }),
            recordSupplierQuotation: async payload => requests.push(payload),
            submitPublicPortalQuotation: async (...args) => requests.push(args),
            getPublicPortalRfq: async () => ({ data: { rfq: { ...openDeadline, items: [] }, portal: { can_submit: true, can_decline: true }, supplier: {} } }),
            ...services
        },
        '@/services/purchaseOrderServices.js': { createPurchaseOrderFromRfq: services.createPo || (async (...args) => { requests.push(args); return { data: [{ id: 9 }] } }) },
        '@/utils/swal.js': { showLoading: () => {}, showSuccess: async () => {}, showError: (...args) => errors.push(args), showConfirm: async () => true },
        '@/utils/quotationValidity.js': validity,
        '@/composables/useFormatter.js': { formatCurrency: String }
    }
    const source = readFileSync(new URL(`../src/composables/purchasing/${name}.js`, import.meta.url), 'utf8')
        .replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (_, names, path) => `const {${names}} = deps[${JSON.stringify(path)}] || {}`)
        .replace(`export function ${name}`, `function ${name}`)
    const state = new Function('deps', `${source}\nreturn ${name}()`)(deps)
    return { state, errors, requests }
}

describe('Supplier requested revision', () => {
    it('prefills previous offer and sends its version and revision reason', async () => {
        const previous = { review_version: 4, vendor_quotation_reference: 'SQ-VENDOR-4', quotation_date: '2026-11-09',
            currency: 'USD', exchange_rate: '16000', tax_rate: 0, shipping_cost: 5,
            items: [{ rfq_item_id: 10, offered_quantity: 2, unit_price: 12 }] }
        const { state, requests } = composable('useSupplierPortalRfqForm', {
            getPublicPortalRfq: async () => ({ data: { rfq: { ...openDeadline, items: [{ id: 10, target_quantity: 2 }] },
                portal: { can_submit: true, can_revise: true }, existing_quotation: previous } }),
        })
        await state.loadPortalData()
        assert.equal(state.quoteForm.value.items[0].unit_price, 12)
        state.quoteForm.value.revision_reason = 'Improved price'
        await state.handleSubmit()
        const payload = requests[0][1]
        assert.equal(payload.get('expected_review_version'), '4')
        assert.equal(payload.get('reason'), 'Improved price')
        assert.equal(payload.get('currency'), 'USD')
        assert.equal(payload.get('exchange_rate'), '16000')
    })
})

describe('Quotation validity server contract', () => {
    it('accepts valid and unspecified metadata and does not reinterpret dates on the browser', () => {
        assert.equal(validity.canAwardQuotation({ ...valid, valid_until: '2000-01-01' }), true)
        const unspecified = { ...valid, validity_status: 'unspecified', valid_until: null }
        assert.equal(validity.canAwardQuotation(unspecified), true)
        assert.equal(validity.canCreateQuotationPo(unspecified), true)
        assert.equal(validity.quotationValidityLabel(unspecified), 'Masa berlaku belum ditentukan')
        assert.equal(validity.quotationValidityReason(unspecified), null)
    })
    it('blocks missing metadata, explicit denials and expired quotations even if a date looks future', () => {
        for (const quotation of [undefined, {}, { valid_until: '2099-01-01' }, { ...valid, can_award: false }, { ...expired, valid_until: '2099-01-01' }]) {
            assert.equal(validity.canAwardQuotation(quotation), false)
        }
        assert.match(validity.quotationValidityReason(undefined), /Muat ulang/)
        assert.match(validity.quotationValidityReason(expired), /SQ-001.*2026-11-09.*WIB/)
    })
    it('checks only new PO candidates and deduplicates multiple items of the same quotation', () => {
        assert.deepEqual(validity.purchaseOrderValidityErrors([{ quotation_id: 1, purchase_order_id: 9 }], [expired]), [])
        assert.equal(validity.purchaseOrderValidityErrors([{ quotation_id: 1 }, { quotation_id: 1 }], [expired]).length, 1)
        assert.equal(validity.purchaseOrderValidityErrors([{ quotation_id: 2 }], [expired]).length, 1)
    })
    it('validates date order, allows equal dates and null, and exposes backend field errors', () => {
        assert.match(validity.quotationDateOrderError({ quotation_date: '2026-11-10', valid_until: '2026-11-09' }), /setelah/)
        assert.equal(validity.quotationDateOrderError({ quotation_date: '2026-11-10', valid_until: '2026-11-10' }), null)
        assert.equal(validity.quotationDateOrderError({ quotation_date: '2026-11-10', valid_until: '' }), null)
        assert.equal(validity.quotationApiError({ response: { data: { message: 'generic', errors: { valid_until: ['Date order invalid.'] } } } }, 'fallback'), 'Date order invalid.')
    })
})

describe('RFQ detail quotation validity', () => {
    it('loads server validity and generates PO for unspecified validity', async () => {
        const { state, requests } = composable('useRfqDetail', {
            getRfqComparisonMatrix: async () => ({ data: { suppliers: [{ ...valid, validity_status: 'unspecified' }] } })
        })
        await state.fetchRfqDetail()
        assert.equal(state.poValidityErrors.value.length, 0)
        await state.handleGeneratePoFromDetail()
        assert.deepEqual(requests[0], [7, {}])
        assert.equal(state.generatingPo.value, false)
    })
    it('blocks expired candidates or missing validity after a failed fetch', async () => {
        for (const getRfqComparisonMatrix of [async () => ({ data: { suppliers: [expired] } }), async () => { throw new Error('offline') }]) {
            const { state, requests, errors } = composable('useRfqDetail', { getRfqComparisonMatrix })
            await state.fetchRfqDetail()
            assert.ok(state.poValidityErrors.value.length)
            await state.handleGeneratePoFromDetail()
            assert.equal(requests.length, 0)
            assert.equal(errors.length, 1)
        }
    })
    it('refreshes after a rejected PO and exposes the exact backend message', async () => {
        let rejected = false
        const { state, errors } = composable('useRfqDetail', {
            getRfqComparisonMatrix: async () => ({ data: { suppliers: [rejected ? expired : valid] } }),
            createPo: async () => { rejected = true; throw { response: { status: 422, data: { message: 'Quotation SQ-001 expired.' } } } }
        })
        await state.fetchRfqDetail()
        await state.handleGeneratePoFromDetail()
        assert.match(state.poValidityErrors.value[0], /kedaluwarsa/)
        assert.equal(errors.at(-1)[0], 'Quotation SQ-001 expired.')
    })
    it('keeps manual validity empty instead of copying the RFQ deadline, and rejects invalid order', async () => {
        const { state, requests, errors } = composable('useRfqDetail')
        await state.fetchRfqDetail()
        state.rfq.value.deadline_date = '2026-12-01'
        state.openManualModal()
        assert.equal(state.manualForm.value.valid_until, '')
        state.manualForm.value.quotation_date = '2026-11-10'
        state.manualForm.value.valid_until = '2026-11-09'
        await state.submitManualQuotation()
        assert.match(errors.at(-1)[0], /setelah/)
        assert.equal(requests.length, 0)
        assert.equal(state.isModalOpen.value, true)
    })
})

describe('Supplier portal quotation dates', () => {
    it('rejects invalid date order before confirmation or submission and keeps the form', async () => {
        const { state, errors, requests } = composable('useSupplierPortalRfqForm')
        await state.loadPortalData()
        state.quoteForm.value.quotation_date = '2026-11-10'
        state.quoteForm.value.valid_until = '2026-11-09'
        await state.handleSubmit()
        assert.match(errors.at(-1)[1], /setelah/)
        assert.equal(requests.length, 0)
        assert.equal(state.quoteForm.value.valid_until, '2026-11-09')
    })
})

describe('RFQ deadline integration', () => {
    it('blocks manual quotation and opening its form when deadline has passed or metadata is absent', async () => {
        for (const rfq of [{ ...openDeadline, is_expired: true }, {}]) {
            const { state, requests } = composable('useRfqDetail')
            state.rfq.value = { ...rfq, items: [{ id: 10 }] }
            state.openManualModal()
            assert.equal(state.isModalOpen.value, false)
            await state.submitManualQuotation()
            assert.equal(requests.length, 0)
        }
    })
    it('preserves manual extension input after rejection and refreshes the current deadline', async () => {
        let fetched = 0
        const { state, errors } = composable('useRfqDetail', {
            extendRfqDeadline: async () => { throw { response: { status: 422, data: { message: 'Deadline telah berubah' } } } },
            showRfq: async () => { fetched++; return { data: { ...openDeadline, deadline_date: '2026-11-12' } } }
        })
        state.extensionOpen.value = true
        state.extensionForm.value = { deadline_date: '2026-11-11', reason: 'Konfirmasi supplier' }
        await state.submitDeadlineExtension()
        assert.equal(fetched, 1)
        assert.equal(state.extensionOpen.value, true)
        assert.equal(state.extensionForm.value.reason, 'Konfirmasi supplier')
        assert.equal(state.rfq.value.deadline_date, '2026-11-12')
        assert.equal(errors.at(-1)[0], 'Deadline telah berubah')
    })
    it('refreshes portal metadata without replacing edited prices or attachments', async () => {
        let closed = false
        const { state, requests } = composable('useSupplierPortalRfqForm', {
            getPublicPortalRfq: async () => ({ data: {
                rfq: { ...openDeadline, is_expired: closed, items: [{ id: 10, target_quantity: 2 }] },
                portal: { can_submit: !closed, can_decline: !closed }
            } })
        })
        await state.loadPortalData()
        state.quoteForm.value.items[0].unit_price = 99
        state.selectedFile.value = { name: 'offer.pdf' }
        closed = true
        await state.loadPortalData(true)
        assert.equal(state.quoteForm.value.items[0].unit_price, 99)
        assert.equal(state.selectedFile.value.name, 'offer.pdf')
        assert.equal(state.canRespond.value, false)
        await state.handleSubmit()
        await state.handleDecline()
        assert.equal(requests.length, 0)
    })
})
