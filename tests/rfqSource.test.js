import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildRfqDraftPayload, validateRfqDraft, newInitialNeedItem, rfqPurchaseBlockReason, rfqSourceLabel, initialNeedItemMode, changeInitialNeedItemMode, applyRfqCatalogItem } from '../src/utils/rfqSource.js'

const form = source_type => ({ source_type, procurement_plan_id: 28, title: ' Material produksi ', deadline_date: '2026-12-10' })
const item = () => ({ ...newInitialNeedItem(), item_name: ' Aluminium ', unit_id: 3, target_quantity: '20.5', procurement_plan_item_id: 99, remaining_quantity: 50 })

describe('RFQ two-source contract', () => {
    const catalog = { id: 12, code: 'AL-01', name: 'Aluminium', unit_id: 3, unit: { name: 'Kilogram', code: 'KG' }, price: 999 }
    it('uses catalog identity/unit without copying master prices or overwriting user requirements', () => {
        const row = { ...item(), item_specifications: 'Tebal 2 mm', target_price: '1500' }
        applyRfqCatalogItem(row, catalog)
        assert.equal(row.item_id, 12)
        assert.equal(row.item_name, 'Aluminium')
        assert.equal(row.unit_id, 3)
        assert.equal(row.unit_label, 'KG')
        assert.equal(row.target_quantity, '20.5')
        assert.equal(row.item_specifications, 'Tebal 2 mm')
        assert.equal(row.target_price, '1500')
    })
    it('clears catalog references when switching modes but retains requested quantities', () => {
        const row = item()
        applyRfqCatalogItem(row, catalog)
        changeInitialNeedItemMode(row, 'custom')
        assert.equal(row.item_id, null)
        assert.equal(row.item_name, '')
        assert.equal(row.unit_id, '')
        assert.equal(row.unit_label, '')
        assert.equal(row.target_quantity, '20.5')
        row.item_name = 'Barang khusus'
        changeInitialNeedItemMode(row, 'custom')
        assert.equal(row.item_name, 'Barang khusus')
        changeInitialNeedItemMode(row, 'catalog')
        assert.ok(validateRfqDraft(form('initial_need'), [row], [])['items.0.item_id'])
    })
    it('preserves old draft snapshots and catalog/custom identities through payload round trips', () => {
        const old = { item_id: 12, item_name: 'Nama snapshot lama', unit_id: 3, target_quantity: '20', target_price: null }
        assert.equal(initialNeedItemMode(old), 'catalog')
        assert.equal(initialNeedItemMode({ item_name: 'Custom lama' }), 'custom')
        const payload = buildRfqDraftPayload(form('initial_need'), [old, item()], [])
        assert.equal(payload.items[0].item_id, 12)
        assert.equal(payload.items[0].item_name, 'Nama snapshot lama')
        assert.equal(payload.items[1].item_id, null)
        assert.equal('item_mode' in payload.items[0], false)
        assert.deepEqual(validateRfqDraft(form('initial_need'), payload.items, []), {})
        assert.equal(initialNeedItemMode(payload.items[0]), 'catalog')
        assert.equal(initialNeedItemMode(payload.items[1]), 'custom')
    })
    it('omits a stale catalog identity on explicitly custom rows', () => {
        const payload = buildRfqDraftPayload(form('initial_need'), [{ ...item(), item_id: 12 }], [])
        assert.equal(payload.items[0].item_id, null)
    })
    it('omits all plan references from initial-need payload even with stale plan state', () => {
        const payload = buildRfqDraftPayload(form('initial_need'), [item()], [], [29])
        assert.equal(payload.source_type, 'initial_need')
        assert.equal('procurement_plan_id' in payload, false)
        assert.equal('additional_procurement_plan_ids' in payload, false)
        assert.equal('procurement_plan_item_id' in payload.items[0], false)
        assert.equal(payload.title, 'Material produksi')
        assert.equal(payload.items[0].item_name, 'Aluminium')
        assert.equal(payload.items[0].target_price, null)
    })
    it('preserves primary/additional plan references on the plan path', () => {
        const payload = buildRfqDraftPayload(form('procurement_plan'), [item()], [{ id: 7, email: 'supplier@example.test' }], ['29'])
        assert.equal(payload.procurement_plan_id, 28)
        assert.deepEqual(payload.additional_procurement_plan_ids, [29])
        assert.equal(payload.items[0].procurement_plan_item_id, 99)
        assert.equal(payload.suppliers[0].supplier_id, 7)
    })
    it('retains decimal precision and an explicitly supplied zero estimate', () => {
        const payload = buildRfqDraftPayload(form('initial_need'), [{ ...item(), target_quantity: '99999999999999.1234', target_price: '0' }], [])
        assert.equal(payload.items[0].target_quantity, '99999999999999.1234')
        assert.equal(payload.items[0].target_price, '0')
    })
    it('requires identity, unit and positive quantity for initial needs', () => {
        const errors = validateRfqDraft(form('initial_need'), [newInitialNeedItem()], [])
        assert.ok(errors['items.0.item_name'])
        assert.ok(errors['items.0.unit_id'])
        for (const quantity of ['0', '-1', '1e3', '1,5', '0.00001', '100000000000000']) {
            assert.ok(validateRfqDraft(form('initial_need'), [{ ...item(), target_quantity: quantity }], [])['items.0.target_quantity'], quantity)
        }
    })
    it('checks plan quota only for plan-based RFQs', () => {
        const row = { ...item(), remaining_quantity: 10 }
        assert.ok(validateRfqDraft(form('procurement_plan'), [row], [])['items.0.target_quantity'])
        assert.deepEqual(validateRfqDraft(form('initial_need'), [row], []), {})
    })
    it('allows drafts without suppliers but requires suppliers for publication', () => {
        assert.deepEqual(validateRfqDraft(form('initial_need'), [item()], []), {})
        assert.ok(validateRfqDraft(form('initial_need'), [item()], [], true).suppliers)
    })
    it('requires at least one item and validates optional estimates', () => {
        assert.ok(validateRfqDraft(form('initial_need'), [], []).items)
        for (const price of ['-1', '1.001', '1e5']) assert.ok(validateRfqDraft(form('initial_need'), [{ ...item(), target_price: price }], [])['items.0.target_price'])
        assert.deepEqual(validateRfqDraft(form('initial_need'), [{ ...item(), target_price: '0' }], []), {})
    })
    it('blocks initial-need purchasing even if supplemental metadata is missing', () => {
        assert.ok(rfqPurchaseBlockReason({ source_type: 'initial_need' }))
        assert.equal(rfqPurchaseBlockReason({ source_type: 'initial_need', purchase_blocked_reason: 'PR belum disetujui' }), 'PR belum disetujui')
        assert.equal(rfqPurchaseBlockReason({ source_type: 'procurement_plan' }), null)
        assert.equal(rfqPurchaseBlockReason({ procurement_plan_id: 28 }), null)
        assert.equal(rfqSourceLabel({ source_type: 'initial_need' }), 'Kebutuhan awal')
    })
})
