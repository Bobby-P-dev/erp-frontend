import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, computed, reactive } from 'vue'
import { parse, compileScript } from '@vue/compiler-sfc'
import * as review from '../src/utils/quotationReview.js'
import { quotationValidityReason, canAwardQuotation } from '../src/utils/quotationValidity.js'

const quote = (overrides = {}) => ({ id: 4, review_mode: 'direct', review_status: 'pending_review',
    review_version: 2, allowed_actions: ['confirm_review'], ...overrides })
const apiError = status => ({ response: { status, data: { message: `API rejected ${status}` } } })

function makeReview(options = {}) {
    const requests = [], errors = [], successes = [], refreshes = [], confirmations = []
    const deps = {
        vue: { ref }, '@/utils/quotationReview.js': review,
        '@/services/rfqServices.js': {
            showSupplierQuotation: async id => {
                if (options.loadError) throw options.loadError
                return { data: options.loaded || quote({ id }) }
            },
            confirmSupplierQuotationReview: async (...args) => {
                requests.push(['direct', ...args]); if (options.requestError) throw options.requestError
                return { data: quote({ review_status: 'approved', allowed_actions: [] }) }
            },
            submitSupplierQuotationReview: async (...args) => {
                requests.push(['approval', ...args]); if (options.requestError) throw options.requestError
                return { data: quote({ review_status: 'pending_approval', allowed_actions: [] }) }
            },
        },
        '@/utils/swal.js': { showConfirm: async () => { confirmations.push(true); return options.confirm !== false },
            showError: message => errors.push(message), showSuccess: async message => successes.push(message) },
    }
    const source = readFileSync(new URL('../src/composables/purchasing/useQuotationReview.js', import.meta.url), 'utf8')
        .replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (_, names, path) => `const {${names}} = deps[${JSON.stringify(path)}]`)
        .replace('export function', 'function')
    const state = new Function('deps', 'refresh', `${source}\nreturn useQuotationReview(refresh)`)(deps, async () => refreshes.push(true))
    return { state, requests, errors, successes, refreshes, confirmations }
}

function drawer(options = {}) {
    const events = [], decisions = [], successes = [], failures = []
    const props = reactive({ task: { id: 12, document_type: 'supplier_quotation' }, isOpen: true })
    const deps = {
        vue: { ref, computed, watch: () => {} },
        '../../stores/approvalStore.js': { useApprovalStore: () => ({ decrementCountOptimistic: () => {} }) },
        '../../stores/auth.js': { useAuthStore: () => ({ user: { id: 9 } }) },
        '../../services/rfqServices.js': {
            getQuotationApprovalTracker: async () => {
                if (options.trackerError) throw options.trackerError
                return { data: { request: { id: 12, current_step_order: 1, items: [{ id: 3, unit_price: '25', subtotal: '50' }] },
                    ...(options.noPermissionMetadata ? {} : { can_current_user_approve: true }) } }
            },
            decideQuotationApproval: async (...args) => { decisions.push(args); if (options.decisionError) throw options.decisionError },
        },
        '../../services/approvalServices.js': { getApprovalTracker: () => { throw Error('Quotation must not use mock fallback') } },
        '../../utils/swal.js': { showLoading: () => {}, showSuccess: (...args) => successes.push(args), showError: (...args) => failures.push(args) },
    }
    const { descriptor } = parse(readFileSync(new URL('../src/components/approval/ApprovalReviewDrawer.vue', import.meta.url), 'utf8'))
    const source = compileScript(descriptor, { id: 'review-drawer-test' }).content
        .replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (_, names, path) => `const {${names.replace(/\bas\b/g, ':')}} = deps[${JSON.stringify(path)}] || {}`)
        .replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, (_, name, path) => `const ${name} = deps[${JSON.stringify(path)}]?.default`)
        .replace('export default', 'return')
    const component = new Function('deps', source)(deps)
    return { state: component.setup(props, { expose: () => {}, emit: (...args) => events.push(args) }), props, events, decisions, successes, failures }
}

describe('Quotation review buyer workflow', () => {
    it('allows evaluation without a review action under PR-only policy and keeps revision blocks', () => {
        const candidate = quote({ review_mode: 'none', is_review_approved: false, validity_status: 'valid', can_award: true })
        assert.equal(review.quotationReviewLabel(candidate), 'Siap dievaluasi')
        assert.equal(review.quotationReviewAction(candidate), null)
        assert.equal(review.quotationReviewReason(candidate), null)
        assert.equal(quotationValidityReason(candidate), null)
        assert.equal(canAwardQuotation(candidate), true)
        const blocked = { ...candidate, can_award: false, review_status: 'revision_requested', review_block_reason: 'Selesaikan revisi terlebih dahulu.' }
        assert.equal(review.quotationReviewReason(blocked), 'Selesaikan revisi terlebih dahulu.')
        assert.equal(canAwardQuotation(blocked), false)
    })
    it('uses explicit server mode, permissions and a valid version', () => {
        assert.equal(review.quotationReviewAction(quote()), 'confirm_review')
        assert.equal(review.quotationReviewAction(quote({ review_mode: 'approval', allowed_actions: ['submit_review'] })), 'submit_review')
        for (const fields of [{ review_mode: undefined }, { allowed_actions: [] }, { review_version: undefined }, { review_version: 0 }, { review_mode: 'approval' }]) {
            assert.equal(review.quotationReviewAction(quote(fields)), null)
        }
    })
    it('explains each review state without treating approval as a tender award', () => {
        for (const status of ['legacy_unreviewed', 'pending_review', 'pending_approval', 'approved', 'revision_requested', 'rejected']) {
            assert.ok(review.quotationReviewLabel({ review_status: status }))
        }
        assert.equal(review.quotationReviewLabel({ review_status: 'approved' }), 'Disahkan internal')
        assert.match(quotationValidityReason({ ...quote(), validity_status: 'valid' }), /Buyer berizin/)
        assert.equal(canAwardQuotation({ ...quote(), validity_status: 'valid', can_award: false }), false)
    })
    it('loads details then confirms the exact version and prevents duplicate requests', async () => {
        const { state, requests, successes, confirmations, refreshes } = makeReview()
        await state.open(4)
        await Promise.all([state.submit(), state.submit()])
        assert.deepEqual(requests, [['direct', 4, 2]])
        assert.equal(confirmations.length, 1)
        assert.equal(successes.length, 1)
        assert.equal(refreshes.length, 1)
        assert.equal(state.selected.value.review_status, 'approved')
    })
    it('submits approval mode without using direct confirmation', async () => {
        const { state, requests } = makeReview({ loaded: quote({ review_mode: 'approval', allowed_actions: ['submit_review'] }) })
        await state.open(4); await state.submit()
        assert.deepEqual(requests, [['approval', 4, 2]])
        assert.equal(state.selected.value.review_status, 'pending_approval')
    })
    it('does not submit a cancelled confirmation or a forbidden action', async () => {
        for (const options of [{ confirm: false }, { loaded: quote({ allowed_actions: [] }) }]) {
            const { state, requests, successes } = makeReview(options)
            await state.open(4); await state.submit()
            assert.equal(requests.length, 0); assert.equal(successes.length, 0)
            assert.equal(state.submitting.value, false)
        }
    })
    it('reloads stale versions and permissions on 403, 409 and 422 without success', async () => {
        for (const status of [403, 409, 422]) {
            const options = { requestError: apiError(status) }
            const { state, errors, successes, refreshes } = makeReview(options)
            await state.open(4)
            options.loaded = quote({ review_version: 3, allowed_actions: [] })
            await state.submit()
            assert.equal(state.selected.value.review_version, 3)
            assert.equal(review.quotationReviewAction(state.selected.value), null)
            assert.deepEqual(errors, [`API rejected ${status}`])
            assert.equal(successes.length, 0); assert.equal(refreshes.length, 1)
            assert.equal(state.submitting.value, false)
        }
    })
    it('discards cached actions if refreshing details fails', async () => {
        const options = { requestError: apiError(409) }
        const { state } = makeReview(options)
        await state.open(4)
        options.loadError = apiError(403)
        await state.submit()
        assert.equal(state.selected.value, null)
        assert.equal(review.quotationReviewAction(state.selected.value), null)
    })
})

describe('Quotation review API contract', () => {
    const services = api => {
        const source = readFileSync(new URL('../src/services/rfqServices.js', import.meta.url), 'utf8')
            .replace(/import api from ['"].*?['"]/, '')
            .replace(/export const /g, 'const ')
        return new Function('api', `${source}\nreturn { confirmSupplierQuotationReview, submitSupplierQuotationReview, getQuotationApprovalTracker, decideQuotationApproval }`)(api)
    }
    it('sends version and expected approval step without client-defined status or mode', async () => {
        const calls = []
        const api = services({ post: async (...args) => { calls.push(args); return { data: {} } }, get: async (...args) => { calls.push(args); return { data: {} } } })
        await api.confirmSupplierQuotationReview(4, 2)
        await api.submitSupplierQuotationReview(4, 2)
        await api.getQuotationApprovalTracker(12)
        await api.decideQuotationApproval(12, 'revision', 'Correct the offer', 1)
        assert.deepEqual(calls, [
            ['/api/v1/supplier-quotations/4/confirm-review', { expected_review_version: 2 }],
            ['/api/v1/supplier-quotations/4/submit-review', { expected_review_version: 2 }],
            ['/api/v1/approvals/requests/12/tracker'],
            ['/api/v1/approvals/requests/12/decision', { decision: 'request_revision', notes: 'Correct the offer', expected_step_order: 1 }],
        ])
    })
    it('propagates session, permission, missing request and conflict errors without mock success', async () => {
        for (const status of [401, 403, 404, 409, 422]) {
            const error = apiError(status)
            const api = services({ get: async () => { throw error }, post: async () => { throw error } })
            for (const run of [() => api.confirmSupplierQuotationReview(4, 2), () => api.submitSupplierQuotationReview(4, 2),
                () => api.getQuotationApprovalTracker(12), () => api.decideQuotationApproval(12, 'approve', '', 1)]) {
                await assert.rejects(run, value => value === error)
            }
        }
    })
})

describe('Quotation approval drawer', () => {
    it('requires authoritative tracker permission and preserves quotation prices', async () => {
        const { state, props } = drawer()
        assert.equal(state.canUserAct.value, false)
        await state.fetchTracker(12)
        assert.equal(state.canUserAct.value, true)
        assert.equal(state.effectiveItems.value[0].estimated_price, '25')
        assert.equal(state.effectiveItems.value[0].estimated_subtotal, '50')
        props.task = { id: 13, document_type: 'supplier_quotation' }
        assert.equal(state.canUserAct.value, false)
        const denied = drawer({ noPermissionMetadata: true })
        await denied.state.fetchTracker(12)
        assert.equal(denied.state.canUserAct.value, false)
    })
    it('records a real API decision with its expected step', async () => {
        const { state, decisions, events, successes } = drawer()
        await state.fetchTracker(12)
        await state.handleActionConfirm({ action: 'approve', notes: 'Reviewed', done: () => {}, fail: assert.fail })
        assert.deepEqual(decisions, [[12, 'approve', 'Reviewed', 1]])
        assert.equal(successes.length, 1)
        assert.ok(events.some(([event]) => event === 'action-success'))
    })
    it('never emits successful decisions for authorization, missing request or version conflicts', async () => {
        for (const status of [401, 403, 404, 409, 422]) {
            const { state, events, successes } = drawer({ decisionError: apiError(status) })
            await state.fetchTracker(12)
            const failures = []
            await state.handleActionConfirm({ action: 'reject', notes: 'Reason', done: assert.fail, fail: value => failures.push(value) })
            assert.equal(successes.length, 0)
            assert.equal(failures.length, 1)
            assert.ok(!events.some(([event]) => event === 'action-success'))
            assert.ok(events.some(([event]) => event === 'refresh-requested'))
        }
    })
})
