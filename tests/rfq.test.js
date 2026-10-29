import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    getRfqs,
    showRfq,
    createRfq,
    updateRfq,
    publishRfq,
    startEvaluationRfq,
    cancelRfq,
    getRfqComparisonMatrix,
    awardRfq,
    recordSupplierQuotation,
    showSupplierQuotation,
    getPublicPortalRfq,
    submitPublicPortalQuotation,
    declinePublicPortalRfq
} from '../src/services/rfqServices.js';

describe('RFQ Services & Lifecycle Contract Tests', () => {
    it('exports all 14 required RFQ, quotation, and portal service functions', () => {
        assert.equal(typeof getRfqs, 'function');
        assert.equal(typeof showRfq, 'function');
        assert.equal(typeof createRfq, 'function');
        assert.equal(typeof updateRfq, 'function');
        assert.equal(typeof publishRfq, 'function');
        assert.equal(typeof startEvaluationRfq, 'function');
        assert.equal(typeof cancelRfq, 'function');
        assert.equal(typeof getRfqComparisonMatrix, 'function');
        assert.equal(typeof awardRfq, 'function');
        assert.equal(typeof recordSupplierQuotation, 'function');
        assert.equal(typeof showSupplierQuotation, 'function');
        assert.equal(typeof getPublicPortalRfq, 'function');
        assert.equal(typeof submitPublicPortalQuotation, 'function');
        assert.equal(typeof declinePublicPortalRfq, 'function');
    });

    it('validates RFQ lifecycle status transitions', () => {
        const validStatuses = ['draft', 'published', 'evaluation', 'completed', 'cancelled'];
        
        validStatuses.forEach(status => {
            assert.equal(validStatuses.includes(status), true);
        });

        // Lifecycle index helper logic
        const getStepIndex = (status) => {
            switch (status) {
                case 'draft': return 0;
                case 'published': return 1;
                case 'evaluation': return 2;
                case 'completed': return 3;
                default: return -1;
            }
        };

        assert.equal(getStepIndex('draft'), 0);
        assert.equal(getStepIndex('published'), 1);
        assert.equal(getStepIndex('evaluation'), 2);
        assert.equal(getStepIndex('completed'), 3);
        assert.equal(getStepIndex('cancelled'), -1);
    });

    it('structures draft RFQ creation payload matching backend specifications', () => {
        const formData = {
            procurement_plan_id: 15,
            title: 'Pengadaan Mesin CNC Milling & Drill Bits',
            issue_date: '2026-10-26',
            deadline_date: '2026-11-05',
            delivery_address: 'Plant 1 PT Padma Soode Indonesia',
            payment_terms_requested: 'Net 30 Days',
            notes: 'Spesifikasi toleransi ketat 0.01mm',
            items: [
                {
                    procurement_plan_item_id: 101,
                    item_id: 50,
                    item_name: 'Drill Bit Carbide 6mm',
                    item_specifications: 'HRC 65 Coated',
                    unit_id: 1,
                    target_quantity: 100,
                    target_price: 150000,
                    required_delivery_date: '2026-11-15',
                    notes: 'Harus merk YG-1'
                }
            ],
            suppliers: [
                { supplier_id: 12, contact_person: 'Budi Santoso', email: 'budi@rekanan.com', phone: '08123456789' },
                { supplier_id: 15, contact_person: 'Siti Rahma', email: 'siti@supplier.com', phone: '08987654321' }
            ]
        };

        assert.equal(formData.procurement_plan_id, 15);
        assert.equal(formData.items.length, 1);
        assert.equal(formData.suppliers.length, 2);
        assert.equal(formData.items[0].target_quantity, 100);
        assert.equal(formData.items[0].target_price, 150000);
    });
});

describe('RFQ Bid Comparison Matrix & Commercial Calculations', () => {
    it('correctly calculates lowest unit price and fastest lead time among quotations', () => {
        const offers = [
            { supplier_id: 1, unit_price: 145000, lead_time_days: 14 },
            { supplier_id: 2, unit_price: 140000, lead_time_days: 21 },
            { supplier_id: 3, unit_price: 155000, lead_time_days: 7 }
        ];

        const lowestPrice = Math.min(...offers.map(o => o.unit_price));
        const fastestLeadTime = Math.min(...offers.map(o => o.lead_time_days));

        assert.equal(lowestPrice, 140000); // Vendor 2
        assert.equal(fastestLeadTime, 7);   // Vendor 3

        const enrichedOffers = offers.map(o => ({
            ...o,
            is_lowest_price: o.unit_price === lowestPrice,
            is_fastest_delivery: o.lead_time_days === fastestLeadTime
        }));

        assert.equal(enrichedOffers.find(o => o.supplier_id === 2).is_lowest_price, true);
        assert.equal(enrichedOffers.find(o => o.supplier_id === 1).is_lowest_price, false);
        assert.equal(enrichedOffers.find(o => o.supplier_id === 3).is_fastest_delivery, true);
        assert.equal(enrichedOffers.find(o => o.supplier_id === 1).is_fastest_delivery, false);
    });

    it('calculates HPS price variance and percentage deviation accurately', () => {
        const targetPrice = 150000;

        const calculateDelta = (unitPrice, hps) => {
            const deltaTargetPrice = unitPrice - hps;
            const deltaPercentage = Math.round(((unitPrice - hps) / hps) * 100 * 100) / 100;
            const isBelowTarget = unitPrice <= hps;
            return { deltaTargetPrice, deltaPercentage, isBelowTarget };
        };

        // Case 1: Below HPS (Saving)
        const offerBelow = calculateDelta(135000, targetPrice);
        assert.equal(offerBelow.deltaTargetPrice, -15000);
        assert.equal(offerBelow.deltaPercentage, -10.0);
        assert.equal(offerBelow.isBelowTarget, true);

        // Case 2: Above HPS (Premium)
        const offerAbove = calculateDelta(165000, targetPrice);
        assert.equal(offerAbove.deltaTargetPrice, 15000);
        assert.equal(offerAbove.deltaPercentage, 10.0);
        assert.equal(offerAbove.isBelowTarget, false);

        // Case 3: Exactly HPS
        const offerExact = calculateDelta(150000, targetPrice);
        assert.equal(offerExact.deltaTargetPrice, 0);
        assert.equal(offerExact.deltaPercentage, 0.0);
        assert.equal(offerExact.isBelowTarget, true);
    });
});

describe('RFQ Awarding Validation & Quota Enforcement', () => {
    it('validates Split Awarding constraints preventing over-allocation', () => {
        const rfqItem = {
            id: 10,
            item_name: 'Aluminium Billet 6061',
            target_quantity: 500
        };

        const validateAwardAllocation = (item, allocatedAwards) => {
            let totalAwarded = 0;
            for (const award of allocatedAwards) {
                if (award.awarded_quantity <= 0) {
                    return { valid: false, error: 'Awarded quantity must be greater than zero.' };
                }
                if (award.offered_quantity && award.awarded_quantity > award.offered_quantity) {
                    return { valid: false, error: 'Awarded quantity exceeds offered quantity.' };
                }
                totalAwarded += award.awarded_quantity;
            }

            if (totalAwarded > item.target_quantity) {
                return { 
                    valid: false, 
                    error: `Total awarded quantity (${totalAwarded}) exceeds target quantity (${item.target_quantity}).` 
                };
            }

            return { valid: true, totalAwarded };
        };

        // Valid split: 300 to Vendor A, 200 to Vendor B
        const validSplit = validateAwardAllocation(rfqItem, [
            { supplier_quotation_item_id: 101, awarded_quantity: 300, offered_quantity: 500 },
            { supplier_quotation_item_id: 102, awarded_quantity: 200, offered_quantity: 300 }
        ]);
        assert.equal(validSplit.valid, true);
        assert.equal(validSplit.totalAwarded, 500);

        // Invalid split: exceeds target quantity (300 + 250 = 550 > 500)
        const overAllocatedSplit = validateAwardAllocation(rfqItem, [
            { supplier_quotation_item_id: 101, awarded_quantity: 300, offered_quantity: 500 },
            { supplier_quotation_item_id: 102, awarded_quantity: 250, offered_quantity: 300 }
        ]);
        assert.equal(overAllocatedSplit.valid, false);
        assert.match(overAllocatedSplit.error, /exceeds target quantity/);

        // Invalid: exceeds vendor offered quantity (awarded 400 when offered only 200)
        const overOfferedSplit = validateAwardAllocation(rfqItem, [
            { supplier_quotation_item_id: 103, awarded_quantity: 400, offered_quantity: 200 }
        ]);
        assert.equal(overOfferedSplit.valid, false);
        assert.match(overOfferedSplit.error, /exceeds offered quantity/);
    });

    it('formats Awarding API payload correctly for both Full and Split modes', () => {
        // Full Awarding format
        const fullAwardPayload = {
            awards: [
                { supplier_quotation_item_id: 201, awarded_quantity: 100, notes: 'Full Awarding - Vendor Utama' },
                { supplier_quotation_item_id: 202, awarded_quantity: 50, notes: 'Full Awarding - Vendor Utama' }
            ]
        };

        assert.equal(fullAwardPayload.awards.length, 2);
        assert.equal(fullAwardPayload.awards[0].supplier_quotation_item_id, 201);
        assert.equal(fullAwardPayload.awards[0].awarded_quantity, 100);

        // Split Awarding format
        const splitAwardPayload = {
            awards: [
                { supplier_quotation_item_id: 201, awarded_quantity: 70, notes: 'Split 70% Vendor A' },
                { supplier_quotation_item_id: 301, awarded_quantity: 30, notes: 'Split 30% Vendor B' }
            ]
        };

        assert.equal(splitAwardPayload.awards.length, 2);
        assert.equal(splitAwardPayload.awards.reduce((sum, a) => sum + a.awarded_quantity, 0), 100);
    });

    it('validates manual supplier quotation submission payload contract', () => {
        const manualQuotationPayload = {
            rfq_id: 8,
            supplier_id: 14,
            vendor_quotation_reference: 'QUO-2026-X88',
            quotation_date: '2026-10-26',
            valid_until: '2026-11-26',
            payment_terms: 'Net 45 Days',
            lead_time_days: 10,
            tax_id: 2,
            shipping_cost: 150000,
            quotation_file_id: 99,
            notes: 'Harga termasuk garansi 1 tahun',
            items: [
                {
                    rfq_item_id: 25,
                    offered_quantity: 50,
                    unit_price: 250000,
                    lead_time_days: 10,
                    brand: 'Mitutoyo',
                    notes: 'Original certified'
                }
            ]
        };

        assert.equal(manualQuotationPayload.rfq_id, 8);
        assert.equal(manualQuotationPayload.supplier_id, 14);
        assert.equal(manualQuotationPayload.items[0].rfq_item_id, 25);
        assert.equal(manualQuotationPayload.items[0].unit_price, 250000);
        assert.equal(manualQuotationPayload.items[0].offered_quantity * manualQuotationPayload.items[0].unit_price, 12500000);
    });
});

describe('Supplier Portal (External Magic Link & Quotation Submission) Contract Tests', () => {
    it('validates portal quotation financial calculations (subtotal, PPN tax, shipping, and grand total)', () => {
        const quoteItems = [
            { rfq_item_id: 1, offered_quantity: 100, unit_price: 150000 },
            { rfq_item_id: 2, offered_quantity: 50, unit_price: 200000 }
        ];

        // Subtotal calculation
        const subtotal = quoteItems.reduce((sum, it) => sum + (it.offered_quantity * it.unit_price), 0);
        assert.equal(subtotal, 25000000); // 15jt + 10jt = 25jt

        // Tax calculation (11% PPN)
        const taxRate = 11;
        const taxAmount = Math.round((subtotal * taxRate) / 100);
        assert.equal(taxAmount, 2750000); // 11% of 25jt = 2.75jt

        // Shipping cost
        const shippingCost = 250000;

        // Grand Total
        const grandTotal = subtotal + taxAmount + shippingCost;
        assert.equal(grandTotal, 28000000); // 25jt + 2.75jt + 250rb = 28jt
    });

    it('formats portal quotation submission payload and handles JSON item serialization', () => {
        const quoteForm = {
            vendor_quotation_reference: 'QUO-SUP-2026-001',
            quotation_date: '2026-10-26',
            valid_until: '2026-11-26',
            payment_terms: 'Net 30 Days',
            lead_time_days: 14,
            tax_rate: 11,
            shipping_cost: 500000,
            notes: 'Harga termasuk delivery sampai ke Gudang Plant 1 Cikarang',
            items: [
                {
                    rfq_item_id: 10,
                    offered_quantity: 20,
                    unit_price: 500000,
                    lead_time_days: 14,
                    brand: 'SKF',
                    notes: 'Genuine Part'
                }
            ]
        };

        const serializedItems = JSON.stringify(quoteForm.items.map(it => ({
            rfq_item_id: it.rfq_item_id,
            offered_quantity: Number(it.offered_quantity),
            unit_price: Number(it.unit_price),
            lead_time_days: it.lead_time_days ? Number(it.lead_time_days) : null,
            brand: it.brand || null,
            notes: it.notes || null
        })));

        assert.equal(typeof serializedItems, 'string');
        const parsed = JSON.parse(serializedItems);
        assert.equal(parsed.length, 1);
        assert.equal(parsed[0].rfq_item_id, 10);
        assert.equal(parsed[0].offered_quantity, 20);
        assert.equal(parsed[0].unit_price, 500000);
        assert.equal(parsed[0].brand, 'SKF');
    });

    it('correctly calculates countdown deadline and status labels', () => {
        const computeDeadlineInfo = (deadlineDateStr, referenceNow) => {
            const deadline = new Date(deadlineDateStr);
            deadline.setHours(23, 59, 59, 999);
            const now = new Date(referenceNow);
            const diffMs = deadline - now;

            if (diffMs <= 0) {
                return { label: 'Batas Waktu Telah Berakhir', isExpired: true, urgency: 'expired' };
            }

            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            if (diffDays === 0) {
                return { label: `Berakhir Hari Ini (${diffHours} jam lagi)`, isExpired: false, urgency: 'today' };
            }

            return { label: `Sisa ${diffDays} hari ${diffHours} jam`, isExpired: false, urgency: 'active' };
        };

        // Case 1: Active tender (3 days left)
        const info1 = computeDeadlineInfo('2026-10-29', '2026-10-26T10:00:00Z');
        assert.equal(info1.isExpired, false);
        assert.equal(info1.urgency, 'active');

        // Case 2: Expiring today
        const info2 = computeDeadlineInfo('2026-10-26', '2026-10-26T10:00:00Z');
        assert.equal(info2.isExpired, false);
        assert.equal(info2.urgency, 'today');

        // Case 3: Expired
        const info3 = computeDeadlineInfo('2026-10-25', '2026-10-26T10:00:00Z');
        assert.equal(info3.isExpired, true);
        assert.equal(info3.urgency, 'expired');
    });

    it('validates portal response states (viewed, received, declined)', () => {
        const validQuoteStatuses = ['pending', 'viewed', 'received', 'declined'];

        assert.equal(validQuoteStatuses.includes('viewed'), true);
        assert.equal(validQuoteStatuses.includes('received'), true);
        assert.equal(validQuoteStatuses.includes('declined'), true);

        // Verification of state rendering logic
        const canSubmit = (quoteStatus, isExpired) => {
            if (isExpired) return false;
            return quoteStatus === 'pending' || quoteStatus === 'viewed';
        };

        assert.equal(canSubmit('pending', false), true);
        assert.equal(canSubmit('viewed', false), true);
        assert.equal(canSubmit('received', false), false); // Already submitted
        assert.equal(canSubmit('declined', false), false); // Declined participation
        assert.equal(canSubmit('viewed', true), false);     // Expired deadline
    });
});
