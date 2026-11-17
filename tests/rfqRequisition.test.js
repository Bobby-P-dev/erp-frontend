import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reactive, computed } from 'vue'
import { newRequisitionKey, quantityUnits, selectionMaximum, selectionErrors, requisitionRows, boundedRequisitionQuantity } from '../src/utils/rfqRequisition.js'

test('generates independent version 4 idempotency keys without requiring randomUUID', () => {
    assert.match(newRequisitionKey(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    assert.notEqual(newRequisitionKey(), newRequisitionKey())
})

const fixture = () => ({
    suppliers: [1, 2].map(id => ({ quotation_id: id, supplier_name: `Supplier ${id}`, currency: 'IDR', exchange_rate: 1, review_version: 1 })),
    items_matrix: [{ rfq_item_id: 10, item_name: 'Bahan', vendor_offers: {
        1: { quoted: true, supplier_quotation_item_id: 101 }, 2: { quoted: true, supplier_quotation_item_id: 102 },
    } }],
    requisition_selection: { can_create: true, rfq_remaining: { 10: '50.0000' },
        quotation_remaining: { 101: '50.0000', 102: '50.0000' }, quotations: { 1: { eligible: true }, 2: { eligible: true } } },
})
test('split 40/10 is allowed and second supplier cannot take 11', () => {
    const matrix = fixture(), item = matrix.items_matrix[0]
    assert.equal(selectionMaximum(item, item.vendor_offers[2], { 101: '40' }, matrix.requisition_selection), '10.0000')
    assert.deepEqual(selectionErrors(matrix, { 101: '40', 102: '10' }), [])
    assert.match(selectionErrors(matrix, { 101: '40', 102: '11' }).join(' '), /melebihi/)
    assert.equal(requisitionRows(matrix, { 102: '10', 101: '40' })[0].offer.supplier_quotation_item_id, 101)
})
test('quantity input clamps to RFQ, offer and split balances without rounding decimals', () => {
    const matrix = fixture(), item = matrix.items_matrix[0]
    matrix.requisition_selection.rfq_remaining[10] = '1.0000'
    assert.equal(boundedRequisitionQuantity('10', selectionMaximum(item, item.vendor_offers[1], {}, matrix.requisition_selection), '1'), '1')
    assert.equal(boundedRequisitionQuantity('1.0001', '1.0000', '1'), '1')
    assert.equal(boundedRequisitionQuantity('11', '10.0000', '10'), '10')
    assert.equal(boundedRequisitionQuantity('0.2001', '0.2000', '0.1'), '0.2')
    assert.equal(boundedRequisitionQuantity('6', '5.0000', '1'), '5')
    assert.equal(boundedRequisitionQuantity('1', '0.0000', '1'), '0')
    assert.equal(boundedRequisitionQuantity('99999999999999.9999', '99999999999999.9998', ''), '99999999999999.9998')
})
test('quantity input supports clearing and decimal typing while rejecting malformed input', () => {
    for (const value of ['', '0', '0.', '0.1', '0.1234']) assert.equal(boundedRequisitionQuantity(value, '1.0000', '1'), value)
    for (const value of ['-1', '1e2', '1,5', 'NaN', '0.12345', '999999999999999999999']) {
        assert.equal(boundedRequisitionQuantity(value, '1.0000', '1'), '1')
    }
})
test('a cached Vue selection updates when another supplier is added or removed', () => {
    const selections = reactive({ 101: '40' })
    const rows = computed(() => requisitionRows(fixture(), selections))
    assert.equal(rows.value.length, 1)
    selections[102] = '10'
    assert.equal(rows.value.length, 2)
    delete selections[101]
    assert.equal(rows.value.length, 1)
    assert.equal(rows.value[0].offer.supplier_quotation_item_id, 102)
})
test('uses exact four-decimal balances including large values', () => {
    const matrix = fixture(), item = matrix.items_matrix[0]
    matrix.requisition_selection.rfq_remaining[10] = '0.3000'
    assert.equal(selectionMaximum(item, item.vendor_offers[2], { 101: '0.1' }, matrix.requisition_selection), '0.2000')
    assert.equal(quantityUnits('99999999999999.9999'), 999999999999999999n)
    for (const value of ['', '-1', '1,5', '1e2', '0.00001', 'NaN']) assert.equal(quantityUnits(value), null)
})
test('existing reservations and quotation limits restrict selection', () => {
    const matrix = fixture(), item = matrix.items_matrix[0]
    matrix.requisition_selection.rfq_remaining[10] = '20.0000'
    matrix.requisition_selection.quotation_remaining[101] = '5.0000'
    assert.equal(selectionMaximum(item, item.vendor_offers[1], {}, matrix.requisition_selection), '5.0000')
    assert.ok(selectionErrors(matrix, { 101: '6' }).length)
    assert.ok(selectionErrors(matrix, { 102: '21' }).length)
})
test('blocks mixed currency/rates, unusable quotations, missing permissions and malformed quantities', () => {
    const matrix = fixture()
    matrix.suppliers[1].currency = 'USD'
    assert.match(selectionErrors(matrix, { 101: '10', 102: '10' }).join(' '), /Mata uang/)
    matrix.suppliers[1].currency = 'IDR'; matrix.suppliers[1].exchange_rate = 2
    assert.match(selectionErrors(matrix, { 101: '10', 102: '10' }).join(' '), /kurs/)
    matrix.requisition_selection.quotations[1] = { eligible: false, reason: 'Kedaluwarsa' }
    assert.match(selectionErrors(matrix, { 101: '10' }).join(' '), /Kedaluwarsa/)
    matrix.requisition_selection.can_create = false
    assert.match(selectionErrors(matrix, {}).join(' '), /akses/)
    assert.match(selectionErrors(fixture(), { 101: '0' }).join(' '), /positif/)
})
