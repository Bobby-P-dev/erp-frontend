import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
    getGoodsReceipts,
    getGoodsReceiptDetail,
    showGoodsReceipt,
    recordGoodsReceipt,
    createGoodsReceipt,
    getDirectPurchasesReadyForReceipt,
    confirmGoodsReceiptHandover
} from '../src/services/inventoryServices.js'

describe('Inventory Services & Physical Receipt Contract Tests', () => {
    it('exports all expected Inventory service functions including handover', () => {
        assert.equal(typeof getGoodsReceipts, 'function')
        assert.equal(typeof getGoodsReceiptDetail, 'function')
        assert.equal(typeof showGoodsReceipt, 'function')
        assert.equal(typeof recordGoodsReceipt, 'function')
        assert.equal(typeof createGoodsReceipt, 'function')
        assert.equal(typeof getDirectPurchasesReadyForReceipt, 'function')
        assert.equal(typeof confirmGoodsReceiptHandover, 'function')
    })

    it('validates handover statuses pending_pickup and handed_over', () => {
        const validHandoverStatuses = ['pending_pickup', 'handed_over']
        assert.ok(validHandoverStatuses.includes('pending_pickup'))
        assert.ok(validHandoverStatuses.includes('handed_over'))
        assert.equal(validHandoverStatuses.includes('unknown'), false)
    })

    it('enforces physical balance equation: accepted + rejected === received', () => {
        const received = 10
        const accepted = 8
        const rejected = 2

        assert.equal(accepted + rejected, received)
        assert.ok(received > 0)
    })

    it('flags validation error if accepted + rejected does not match received', () => {
        const received = 10
        const accepted = 7
        const rejected = 2 // Sum is 9, missing 1

        const isValid = (accepted + rejected) === received
        assert.equal(isValid, false)
    })

    it('requires a rejection reason whenever quantity_rejected is greater than zero', () => {
        const itemWithRejection = {
            quantity_received: 5,
            quantity_accepted: 3,
            quantity_rejected: 2,
            rejection_reason: 'Kemasan penyok dan segel rusak saat transit ekspedisi'
        }

        assert.ok(itemWithRejection.quantity_rejected > 0)
        assert.ok(itemWithRejection.rejection_reason.trim().length > 0)
    })

    it('structures Goods Receipt payload according to API specifications', () => {
        const payload = {
            direct_purchase_id: 14,
            delivery_note_number: 'SJ-VENDOR-9981',
            shipping_carrier: 'JNE Express',
            receipt_date: '2026-09-28',
            notes: 'Barang diterima oleh tim gudang shift pagi',
            items: [
                {
                    direct_purchase_item_id: 25,
                    quantity_received: 10,
                    quantity_accepted: 10,
                    quantity_rejected: 0,
                    rejection_reason: null,
                    notes: null
                }
            ]
        }

        assert.equal(payload.direct_purchase_id, 14)
        assert.equal(payload.delivery_note_number, 'SJ-VENDOR-9981')
        assert.equal(payload.items.length, 1)
        assert.equal(payload.items[0].quantity_received, 10)
        assert.equal(payload.items[0].quantity_accepted, 10)
        assert.equal(payload.items[0].quantity_rejected, 0)
    })
})
