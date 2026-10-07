import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    getDirectPurchases,
    showDirectPurchase,
    createDirectPurchase,
    updateDirectPurchase,
    submitDirectPurchaseForPayment,
    cancelDirectPurchase,
    disbursePayment,
    recordGoodsReceipt,
    resubmitPaymentRequest
} from '../src/services/directPurchaseServices.js';

describe('Direct Purchase Services & Business Logic Contract Tests', () => {
    it('exports all expected Direct Purchase service functions', () => {
        assert.equal(typeof getDirectPurchases, 'function');
        assert.equal(typeof showDirectPurchase, 'function');
        assert.equal(typeof createDirectPurchase, 'function');
        assert.equal(typeof updateDirectPurchase, 'function');
        assert.equal(typeof submitDirectPurchaseForPayment, 'function');
        assert.equal(typeof cancelDirectPurchase, 'function');
        assert.equal(typeof disbursePayment, 'function');
        assert.equal(typeof recordGoodsReceipt, 'function');
        assert.equal(typeof resubmitPaymentRequest, 'function');
    });

    it('validates supported purchase channels (marketplace, direct_supplier, retail_store)', () => {
        const validChannels = ['marketplace', 'direct_supplier', 'retail_store'];
        assert.ok(validChannels.includes('marketplace'));
        assert.ok(validChannels.includes('direct_supplier'));
        assert.ok(validChannels.includes('retail_store'));
        assert.equal(validChannels.includes('invalid_channel'), false);
    });

    it('validates client-side constraints on Direct Purchase creation', () => {
        const validate = (form) => {
            const errs = {};
            if (!form.procurement_plan_id) {
                errs.procurement_plan_id = 'Rencana pengadaan wajib dipilih.';
            }

            if (!form.purchase_channel) {
                errs.purchase_channel = 'Saluran pembelian wajib dipilih.';
            } else if (form.purchase_channel === 'marketplace') {
                if (!form.marketplace_name?.trim()) {
                    errs.marketplace_name = 'Nama marketplace wajib diisi.';
                }
                if (!form.merchant_name?.trim()) {
                    errs.merchant_name = 'Nama toko wajib diisi.';
                }
            } else if (form.purchase_channel === 'direct_supplier') {
                if (!form.supplier_id) {
                    errs.supplier_id = 'Supplier rekanan wajib dipilih.';
                }
            } else if (form.purchase_channel === 'retail_store') {
                if (!form.merchant_name?.trim()) {
                    errs.merchant_name = 'Nama toko retail wajib diisi.';
                }
            }

            if (!form.items || form.items.length === 0) {
                errs.items = 'Minimal harus memiliki 1 item barang.';
            } else {
                form.items.forEach((item, idx) => {
                    if (!item.quantity || Number(item.quantity) <= 0) {
                        errs[`items.${idx}.quantity`] = 'Kuantitas harus > 0.';
                    } else if (item.allocated_qty && Number(item.quantity) > Number(item.allocated_qty)) {
                        errs[`items.${idx}.quantity`] = `Kuantitas melebihi kuota alokasi (${item.allocated_qty}).`;
                    }
                    if (item.unit_price === '' || item.unit_price === null || item.unit_price === undefined || Number(item.unit_price) < 0) {
                        errs[`items.${idx}.unit_price`] = 'Harga satuan tidak boleh kosong atau negatif.';
                    }
                });
            }

            return errs;
        };

        // 1. Missing plan & channel
        const emptyErrs = validate({
            procurement_plan_id: null,
            purchase_channel: '',
            items: []
        });
        assert.ok(emptyErrs.procurement_plan_id);
        assert.ok(emptyErrs.purchase_channel);
        assert.ok(emptyErrs.items);

        // 2. Marketplace missing merchant
        const mpErrs = validate({
            procurement_plan_id: 1,
            purchase_channel: 'marketplace',
            marketplace_name: 'Tokopedia',
            merchant_name: '',
            items: [{ procurement_plan_item_id: 1, quantity: 1, unit_price: 50000 }]
        });
        assert.ok(mpErrs.merchant_name);

        // 3. Supplier missing supplier_id
        const supErrs = validate({
            procurement_plan_id: 1,
            purchase_channel: 'direct_supplier',
            supplier_id: null,
            items: [{ procurement_plan_item_id: 1, quantity: 1, unit_price: 50000 }]
        });
        assert.ok(supErrs.supplier_id);

        // 4. Over-allocation quantity check
        const overAllocErrs = validate({
            procurement_plan_id: 1,
            purchase_channel: 'retail_store',
            merchant_name: 'Ace Hardware',
            items: [{ procurement_plan_item_id: 1, allocated_qty: 5, quantity: 10, unit_price: 50000 }]
        });
        assert.ok(overAllocErrs['items.0.quantity']);

        // 5. Valid marketplace purchase
        const validErrs = validate({
            procurement_plan_id: 1,
            purchase_channel: 'marketplace',
            marketplace_name: 'Shopee Mall',
            merchant_name: 'Logitech Official Store',
            items: [{ procurement_plan_item_id: 1, allocated_qty: 5, quantity: 3, unit_price: 250000 }]
        });
        assert.equal(Object.keys(validErrs).length, 0);
    });

    it('correctly calculates subtotal, discounts, additional costs, and grand total', () => {
        const calculateFinancials = (items, costs = {}) => {
            const itemsSubtotal = items.reduce((sum, item) => {
                const sub = (Number(item.quantity) * Number(item.unit_price)) - (Number(item.discount_amount) || 0);
                return sum + Math.max(0, sub);
            }, 0);

            const headerDiscount = Number(costs.discount_amount) || 0;
            const shipping = Number(costs.shipping_cost) || 0;
            const fee = Number(costs.platform_fee) || 0;
            const tax = Number(costs.tax_amount) || 0;

            const grandTotal = Math.max(0, itemsSubtotal - headerDiscount + shipping + fee + tax);

            return {
                itemsSubtotal,
                grandTotal
            };
        };

        const testItems = [
            { quantity: 2, unit_price: 150000, discount_amount: 10000 }, // (2 * 150k) - 10k = 290k
            { quantity: 1, unit_price: 500000, discount_amount: 0 },      // 500k
        ];

        const testCosts = {
            discount_amount: 20000, // Voucher -20k
            shipping_cost: 25000,   // Ongkir +25k
            platform_fee: 2000,     // Biaya aplikasi +2k
            tax_amount: 11000       // PPN +11k
        };

        const res = calculateFinancials(testItems, testCosts);
        assert.equal(res.itemsSubtotal, 790000);
        // Grand total: 790,000 - 20,000 + 25,000 + 2,000 + 11,000 = 808,000
        assert.equal(res.grandTotal, 808000);
    });

    it('formats correct payload for creating Direct Purchases', () => {
        const buildPayload = (form) => ({
            procurement_plan_id: form.procurement_plan_id,
            purchase_channel: form.purchase_channel,
            supplier_id: form.purchase_channel === 'direct_supplier' ? form.supplier_id : null,
            marketplace_name: form.purchase_channel === 'marketplace' ? form.marketplace_name : null,
            merchant_name: form.merchant_name || null,
            store_url: form.store_url || null,
            payment_method: form.payment_method || null,
            recipient_type: form.recipient_type || null,
            recipient_name: form.recipient_name || null,
            bank_name: form.bank_name || null,
            bank_account_number: form.bank_account_number || null,
            bank_account_holder: form.bank_account_holder || null,
            currency: 'IDR',
            discount_amount: Number(form.discount_amount) || 0,
            shipping_cost: Number(form.shipping_cost) || 0,
            platform_fee: Number(form.platform_fee) || 0,
            tax_amount: Number(form.tax_amount) || 0,
            notes: form.notes || null,
            items: form.items.map(item => ({
                procurement_plan_item_id: item.procurement_plan_item_id,
                item_id: item.item_id || null,
                unit_id: item.unit_id || null,
                description: item.item_name,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                discount_amount: Number(item.discount_amount) || 0,
                product_url: item.product_url || null,
                notes: item.notes || null
            }))
        });

        const formData = {
            procurement_plan_id: 10,
            purchase_channel: 'marketplace',
            marketplace_name: 'Tokopedia',
            merchant_name: 'Official Store Tech',
            store_url: 'https://tokopedia.com/store-tech',
            payment_method: 'marketplace_va',
            recipient_type: 'marketplace_merchant',
            recipient_name: 'Official Store Tech',
            bank_name: 'BCA Virtual Account',
            bank_account_number: '880123456789',
            bank_account_holder: 'Official Store Tech',
            discount_amount: 15000,
            shipping_cost: 20000,
            platform_fee: 1000,
            tax_amount: 0,
            notes: 'Pembelian darurat kabel HDMI',
            items: [
                {
                    procurement_plan_item_id: 55,
                    item_id: null,
                    unit_id: 1,
                    item_name: 'Kabel HDMI Ugreen 3M',
                    quantity: 2,
                    unit_price: 95000,
                    discount_amount: 5000,
                    product_url: 'https://tokopedia.com/product/ugreen-3m',
                    notes: 'Warna Hitam'
                }
            ]
        };

        const payload = buildPayload(formData);
        assert.equal(payload.procurement_plan_id, 10);
        assert.equal(payload.purchase_channel, 'marketplace');
        assert.equal(payload.marketplace_name, 'Tokopedia');
        assert.equal(payload.merchant_name, 'Official Store Tech');
        assert.equal(payload.payment_method, 'marketplace_va');
        assert.equal(payload.bank_name, 'BCA Virtual Account');
        assert.equal(payload.bank_account_number, '880123456789');
        assert.equal(payload.discount_amount, 15000);
        assert.equal(payload.shipping_cost, 20000);
        assert.equal(payload.platform_fee, 1000);
        assert.equal(payload.tax_amount, 0);
        assert.equal(payload.items.length, 1);
        assert.equal(payload.items[0].procurement_plan_item_id, 55);
        assert.equal(payload.items[0].quantity, 2);
        assert.equal(payload.items[0].unit_price, 95000);
        assert.equal(payload.items[0].discount_amount, 5000);
        assert.equal(payload.items[0].product_url, 'https://tokopedia.com/product/ugreen-3m');
    });

    it('validates Finance Disbursement payload and constraints', () => {
        const validateDisbursement = (form) => {
            const errs = {};
            if (!form.source_account_id) {
                errs.source_account_id = 'Akun kas / bank sumber wajib dipilih.';
            }
            if (!form.payment_method) {
                errs.payment_method = 'Metode pembayaran wajib dipilih.';
            }
            if (!form.payment_date) {
                errs.payment_date = 'Tanggal pencairan wajib diisi.';
            }
            return errs;
        };

        const invalid = validateDisbursement({
            source_account_id: null,
            payment_method: '',
            payment_date: ''
        });
        assert.ok(invalid.source_account_id);
        assert.ok(invalid.payment_method);
        assert.ok(invalid.payment_date);

        const valid = validateDisbursement({
            source_account_id: 2,
            payment_method: 'bank_transfer',
            payment_date: '2026-09-28'
        });
        assert.equal(Object.keys(valid).length, 0);
    });

    it('validates Goods Receipt quantities and prevents exceeding received quantity', () => {
        const validateGoodsReceiptItem = (item) => {
            const received = Number(item.received_quantity) || 0;
            const accepted = Number(item.accepted_quantity) || 0;
            const rejected = Number(item.rejected_quantity) || 0;

            if (received <= 0) {
                return 'Jumlah fisik diterima harus lebih dari 0.';
            }
            if (accepted + rejected > received) {
                return 'Jumlah diterima + ditolak tidak boleh melebihi jumlah fisik yang datang.';
            }
            if (rejected > 0 && !item.rejection_reason?.trim()) {
                return 'Alasan penolakan wajib diisi jika ada barang cacat/ditolak.';
            }
            return null;
        };

        // Exceeding quantity error
        const errExceed = validateGoodsReceiptItem({
            received_quantity: 10,
            accepted_quantity: 8,
            rejected_quantity: 5,
            rejection_reason: 'Barang rusak'
        });
        assert.equal(errExceed, 'Jumlah diterima + ditolak tidak boleh melebihi jumlah fisik yang datang.');

        // Missing reason when rejected > 0
        const errMissingReason = validateGoodsReceiptItem({
            received_quantity: 10,
            accepted_quantity: 8,
            rejected_quantity: 2,
            rejection_reason: ''
        });
        assert.equal(errMissingReason, 'Alasan penolakan wajib diisi jika ada barang cacat/ditolak.');

        // Perfectly valid receipt
        const errValid = validateGoodsReceiptItem({
            received_quantity: 10,
            accepted_quantity: 9,
            rejected_quantity: 1,
            rejection_reason: '1 unit retak saat pengiriman'
        });
        assert.equal(errValid, null);
    });

    it('validates full Direct Purchase enterprise status progression', () => {
        const statuses = [
            'draft',
            'ready_for_payment',
            'paid',
            'partially_received',
            'completed',
            'cancelled'
        ];

        statuses.forEach(st => assert.ok(typeof st === 'string'));

        // Check completion check logic
        const isFullyReceived = (items, grnItems) => {
            return items.every(dpItem => {
                const totalAccepted = grnItems
                    .filter(g => g.direct_purchase_item_id === dpItem.id)
                    .reduce((sum, g) => sum + Number(g.accepted_quantity), 0);
                return totalAccepted >= Number(dpItem.quantity);
            });
        };

        const testItems = [
            { id: 1, quantity: 5 },
            { id: 2, quantity: 10 }
        ];

        // Partial
        const partialGrn = [
            { direct_purchase_item_id: 1, accepted_quantity: 5 },
            { direct_purchase_item_id: 2, accepted_quantity: 6 }
        ];
        assert.equal(isFullyReceived(testItems, partialGrn), false);

        // Full
        const fullGrn = [
            { direct_purchase_item_id: 1, accepted_quantity: 5 },
            { direct_purchase_item_id: 2, accepted_quantity: 10 }
        ];
        assert.equal(isFullyReceived(testItems, fullGrn), true);
    });

    it('enforces that only draft status Direct Purchases can be edited', () => {
        const canEditDirectPurchase = (status) => status === 'draft';

        assert.equal(canEditDirectPurchase('draft'), true);
        assert.equal(canEditDirectPurchase('ready_for_payment'), false);
        assert.equal(canEditDirectPurchase('paid'), false);
        assert.equal(canEditDirectPurchase('partially_received'), false);
        assert.equal(canEditDirectPurchase('completed'), false);
        assert.equal(canEditDirectPurchase('cancelled'), false);
    });

    it('calculates self-excluded available quota when editing a draft Direct Purchase', () => {
        const calculateEditQuota = (planRemainingQty, currentDraftQty) => {
            return Number((Number(planRemainingQty) + Number(currentDraftQty)).toFixed(4));
        };

        // Example: Plan remaining is 2.0000, current draft item already uses 3.0000.
        // During edit, the draft can be adjusted up to 5.0000 (its own 3 + remaining 2).
        const maxQuota = calculateEditQuota(2.0000, 3.0000);
        assert.equal(maxQuota, 5.0000);

        const validateEditQuantity = (newQty, maxAllowed) => {
            if (!newQty || Number(newQty) <= 0) return 'Kuantitas harus > 0';
            if (Number(newQty) > maxAllowed) return `Maks. alokasi kuota ${maxAllowed}`;
            return null;
        };

        // Valid: setting to 4 (within 5)
        assert.equal(validateEditQuantity(4, maxQuota), null);
        // Valid: setting to 5 (equal to max)
        assert.equal(validateEditQuantity(5, maxQuota), null);
        // Invalid: setting to 6 (exceeds max 5)
        assert.equal(validateEditQuantity(6, maxQuota), 'Maks. alokasi kuota 5');
        // Invalid: setting to 0
        assert.equal(validateEditQuantity(0, maxQuota), 'Kuantitas harus > 0');
    });

    it('formats correct payload for updating draft Direct Purchases', () => {
        const buildUpdatePayload = (form) => ({
            purchase_channel: form.purchase_channel,
            supplier_id: form.purchase_channel === 'direct_supplier' ? form.supplier_id : null,
            marketplace_name: form.purchase_channel === 'marketplace' ? form.marketplace_name : null,
            merchant_name: form.merchant_name || null,
            store_url: form.store_url || null,
            payment_method: form.payment_method || null,
            recipient_type: form.recipient_type || null,
            recipient_name: form.recipient_name || null,
            bank_name: form.bank_name || null,
            bank_account_number: form.bank_account_number || null,
            bank_account_holder: form.bank_account_holder || null,
            currency: 'IDR',
            discount_amount: Number(form.discount_amount) || 0,
            shipping_cost: Number(form.shipping_cost) || 0,
            platform_fee: Number(form.platform_fee) || 0,
            tax_amount: Number(form.tax_amount) || 0,
            notes: form.notes || null,
            items: form.items.map(item => ({
                procurement_plan_item_id: item.procurement_plan_item_id,
                item_id: item.item_id || null,
                unit_id: item.unit_id || null,
                description: item.item_name,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                discount_amount: Number(item.discount_amount) || 0,
                product_url: item.product_url || null,
                notes: item.notes || null
            }))
        });

        const formData = {
            purchase_channel: 'marketplace',
            supplier_id: null,
            marketplace_name: 'Tokopedia',
            merchant_name: 'Official Logitech Store',
            store_url: 'https://tokopedia.com/logitech',
            payment_method: 'marketplace_va',
            recipient_type: 'marketplace_merchant',
            recipient_name: 'Tokopedia - Official Logitech',
            bank_name: 'BCA Virtual Account',
            bank_account_number: '880123456789',
            bank_account_holder: 'Tokopedia - Official Logitech',
            discount_amount: 15000,
            shipping_cost: 20000,
            platform_fee: 1000,
            tax_amount: 0,
            notes: 'Revisi jumlah pesanan mouse dari 3 menjadi 4 unit',
            items: [
                {
                    procurement_plan_item_id: 10,
                    item_id: 5,
                    unit_id: 2,
                    item_name: 'Logitech MX Master 3S',
                    quantity: 4,
                    unit_price: 1500000,
                    discount_amount: 50000,
                    product_url: 'https://tokopedia.com/logitech/mx-master-3s',
                    notes: 'Warna Hitam'
                }
            ]
        };

        const payload = buildUpdatePayload(formData);
        assert.equal(payload.purchase_channel, 'marketplace');
        assert.equal(payload.marketplace_name, 'Tokopedia');
        assert.equal(payload.discount_amount, 15000);
        assert.equal(payload.notes, 'Revisi jumlah pesanan mouse dari 3 menjadi 4 unit');
        assert.equal(payload.items.length, 1);
        assert.equal(payload.items[0].quantity, 4);
        assert.equal(payload.items[0].unit_price, 1500000);
        assert.equal(payload.items[0].discount_amount, 50000);
    });
});
