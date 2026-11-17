import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { supplierQuotationProgress, supplierReceiptItems } from '../src/utils/supplierQuotationReceipt.js'
import { compactQuantity } from '../src/utils/quotationPricing.js'

describe('Supplier quotation receipt', () => {
    it('restores legacy item names and units using RFQ identity and preserves supplier description', () => {
        const [item] = supplierReceiptItems({ items: [{ rfq_item_id: '2', item_description: ' ', offered_quantity: '50.0000' }] },
            [{ id: 2, item_name: 'Material produksi', unit_code: 'KG', item_specifications: 'Grade A' }])
        assert.equal(item.item_name, 'Material produksi')
        assert.equal(item.unit_name, 'KG')
        assert.equal(item.item_specifications, 'Grade A')
        assert.equal(compactQuantity(item.offered_quantity), '50')
        const [custom] = supplierReceiptItems({ items: [{ item_name: 'Baja', item_description: 'Alternatif supplier' }] })
        assert.equal(custom.item_name, 'Baja')
        assert.equal(custom.item_description, 'Alternatif supplier')
    })
    it('distinguishes evaluation, allocation and official purchase orders', () => {
        assert.equal(supplierQuotationProgress({ evaluation_status: 'submitted' }).label, 'Menunggu hasil evaluasi')
        for (const status of ['awarded', 'partially_awarded']) {
            const progress = supplierQuotationProgress({ evaluation_status: status })
            assert.match(progress.message, /Tunggu PO resmi/)
            assert.match(progress.message, /belum merupakan pesanan/)
        }
        assert.equal(supplierQuotationProgress({ evaluation_status: 'rejected' }).label, 'Penawaran tidak terpilih')
        assert.match(supplierQuotationProgress({ purchase_orders: [{ status: 'issued' }] }).message, /mengonfirmasi/)
        assert.doesNotMatch(supplierQuotationProgress({ purchase_orders: [{ status: 'completed' }] }).message, /mengonfirmasi/)
        assert.equal(supplierQuotationProgress({ review_status: 'rejected' }).label, 'Penawaran belum dapat dilanjutkan')
    })
})
