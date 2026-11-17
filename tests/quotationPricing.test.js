import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compactQuantity, formatPricingMoney, hasPreviewPricing, legacyQuotationItem, pricingInput, pricingMode } from '../src/utils/quotationPricing.js'

test('pricing money groups digits and trims padding without losing decimal precision', () => {
    assert.equal(formatPricingMoney('550000.00'), 'Rp550.000')
    assert.equal(formatPricingMoney('27500.00000000'), 'Rp27.500')
    assert.equal(formatPricingMoney('27500.12500000'), 'Rp27.500,125')
    assert.equal(formatPricingMoney('9007199254740993.12345678'), 'Rp9.007.199.254.740.993,12345678')
    assert.equal(formatPricingMoney('-0.01000000'), '-Rp0,01')
    assert.equal(formatPricingMoney('100.5000', 'USD'), 'USD 100,5')
    assert.equal(formatPricingMoney('0.00'), 'Rp0')
    assert.equal(formatPricingMoney(null), '—')
})

test('quantity display removes padding without rounding fractional or large decimal values', () => {
    for (const [input, expected] of [['20.0000', '20'], ['20.5000', '20.5'], ['0.0001', '0.0001'], ['0.0000', '0'], ['99999999999999.1234', '99999999999999.1234'], ['', '']]) {
        assert.equal(compactQuantity(input), expected)
    }
})

test('legacy submit preserves decimal strings and accepts an explicit zero, not empty price', () => {
    const item = { rfq_item_id: 1, offered_quantity: '10.0001', unit_price: '90071992547409.99', lead_time_days: 0 }
    assert.equal(pricingMode({ ...item, pricing_schema_version: 0, pricing_mode: 'flat' }), 'legacy')
    assert.equal(legacyQuotationItem(item).unit_price, '90071992547409.99')
    assert.equal(legacyQuotationItem(item).offered_quantity, '10.0001')
    assert.equal(legacyQuotationItem(item).lead_time_days, 0)
    assert.equal(legacyQuotationItem({ ...item, unit_price: '0' }).unit_price, '0')
    for (const price of ['', null, undefined, '-1', '1.001', 'NaN']) assert.throws(() => legacyQuotationItem({ ...item, unit_price: price }))
    for (const quantity of ['', '0', '-1', '1.00001', '1e3', '1,5']) assert.throws(() => legacyQuotationItem({ ...item, offered_quantity: quantity }))
})

test('all preview modes are blocked from legacy submission including a reloaded v1 revision', () => {
    for (const mode of ['flat', 'tiered', 'fixed_quantity', 'reconfirm']) {
        for (const item of [{ _pricingMode: mode }, { pricing_schema_version: 1, pricing_mode: mode }]) {
            assert.equal(hasPreviewPricing([item]), true)
            assert.throws(() => legacyQuotationItem(item), /pratinjau/)
        }
    }
})

test('flat total keeps the original numerator and denominator without derived unit price', () => {
    const item = { _pricingMode: 'flat', offered_quantity: '3', minimum_quantity: '0.0001', price_input_basis: 'total', price_basis_quantity: '3', entered_total: '100.00', entered_unit_price: '33.33', unit_price: '33.33' }
    assert.deepEqual(pricingInput(item), { pricing_mode: 'flat', offered_quantity: '3', minimum_quantity: '0.0001', price_input_basis: 'total', price_basis_quantity: '3', entered_total: '100.00' })
    item.price_input_basis = 'unit'
    assert.equal(pricingInput(item).entered_unit_price, '33.33')
    assert.equal('entered_total' in pricingInput(item), false)
    assert.equal('price_basis_quantity' in pricingInput(item), false)
})

test('tiered total basis follows each minimum; stale top-level price sources are omitted', () => {
    const item = { _pricingMode: 'tiered', offered_quantity: '100', entered_total: '1', minimum_quantity: '1', price_tiers: [
        { min_quantity: '10', price_input_basis: 'unit', entered_unit_price: '50000.12345678', entered_total: '1' },
        { min_quantity: '50', price_input_basis: 'total', entered_total: '2250000.00', entered_unit_price: '1', price_basis_quantity: '10' },
    ] }
    assert.deepEqual(pricingInput(item), { pricing_mode: 'tiered', offered_quantity: '100', price_tiers: [
        { min_quantity: '10', price_input_basis: 'unit', entered_unit_price: '50000.12345678' },
        { min_quantity: '50', price_input_basis: 'total', entered_total: '2250000.00', price_basis_quantity: '50' },
    ] })
})

test('fixed quantity follows the changed offer quantity and excludes flat/tier fields', () => {
    assert.deepEqual(pricingInput({ _pricingMode: 'fixed_quantity', offered_quantity: '100', price_basis_quantity: '3', entered_total: '4000000.00', price_input_basis: 'unit', entered_unit_price: '1', minimum_quantity: '1', price_tiers: [] }), {
        pricing_mode: 'fixed_quantity', offered_quantity: '100', price_input_basis: 'total', entered_total: '4000000.00', price_basis_quantity: '100',
    })
})
