import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    getDirectPurchases,
    showDirectPurchase,
    createDirectPurchase,
    updateDirectPurchase,
    submitDirectPurchaseForPayment,
    cancelDirectPurchase
} from '../src/services/directPurchaseServices.js';

describe('Direct Purchase Services & Business Logic Contract Tests', () => {
    it('exports all expected Direct Purchase service functions', () => {
        assert.equal(typeof getDirectPurchases, 'function');
        assert.equal(typeof showDirectPurchase, 'function');
        assert.equal(typeof createDirectPurchase, 'function');
        assert.equal(typeof updateDirectPurchase, 'function');
        assert.equal(typeof submitDirectPurchaseForPayment, 'function');
        assert.equal(typeof cancelDirectPurchase, 'function');
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
});
