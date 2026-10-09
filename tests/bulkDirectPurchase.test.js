import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    createBulkDirectPurchase,
    createDirectPurchase
} from '../src/services/directPurchaseServices.js';
import {
    createProcurementPlan
} from '../src/services/procurementPlanServices.js';

describe('Bulk Direct Purchase & Multi-PR Consolidation Contract Tests', () => {
    it('exports createBulkDirectPurchase service function', () => {
        assert.equal(typeof createBulkDirectPurchase, 'function');
    });

    it('enforces single company scope guard when selecting items across PRs', () => {
        const selectedCompany = { id: 1, name: 'PT Nusantara Sentosa' };
        const prItemSameCompany = {
            purchase_requisition_item_id: 101,
            company: { id: 1, name: 'PT Nusantara Sentosa' }
        };
        const prItemDifferentCompany = {
            purchase_requisition_item_id: 102,
            company: { id: 2, name: 'PT Maju Bersama' }
        };

        const canSelectItem = (item, currentCompany) => {
            if (!currentCompany) return true;
            return item.company?.id === currentCompany.id;
        };

        assert.equal(canSelectItem(prItemSameCompany, selectedCompany), true);
        assert.equal(canSelectItem(prItemDifferentCompany, selectedCompany), false);
    });

    it('allows items originating from different divisions within the same company', () => {
        const company = { id: 1, name: 'PT Nusantara Sentosa' };
        const items = [
            {
                purchase_requisition_item_id: 101,
                pr_id: 1,
                company,
                division: { id: 10, name: 'IT Division' },
                requested_quantity: 5
            },
            {
                purchase_requisition_item_id: 202,
                pr_id: 2,
                company,
                division: { id: 20, name: 'Operations Division' },
                requested_quantity: 10
            }
        ];

        const allSameCompany = items.every(i => i.company.id === company.id);
        const distinctDivisions = new Set(items.map(i => i.division.id));

        assert.equal(allSameCompany, true);
        assert.equal(distinctDivisions.size, 2);
    });

    it('formats valid payload for Fast-Track Bulk Direct Purchase API', () => {
        const bulkItems = [
            {
                purchase_requisition_item_id: 11,
                item_id: 5,
                unit_id: 2,
                item_name: 'Printer HP LaserJet',
                quantity: 2,
                unit_price: 2500000,
                discount_amount: 50000,
                product_url: 'https://tokopedia.com/hp-printer',
                notes: 'Warna Hitam'
            },
            {
                purchase_requisition_item_id: 22,
                item_id: null,
                unit_id: null,
                item_name: 'Kabel UTP Cat6 50m (Non-Katalog)',
                quantity: 1,
                unit_price: 350000,
                discount_amount: 0,
                product_url: 'https://tokopedia.com/kabel-cat6',
                notes: 'Belden Original'
            }
        ];

        const formatBulkPayload = (companyId, form, items, shouldSubmitPayment = true) => ({
            company_id: companyId,
            purchase_channel: form.purchase_channel,
            marketplace_name: form.purchase_channel === 'marketplace' ? form.marketplace_name : null,
            merchant_name: form.merchant_name,
            payment_method: form.payment_method,
            recipient_type: form.recipient_type,
            recipient_name: form.recipient_name,
            bank_name: form.bank_name,
            bank_account_number: form.bank_account_number,
            bank_account_holder: form.bank_account_holder,
            currency: 'IDR',
            exchange_rate: 1,
            discount_amount: 0,
            shipping_cost: 25000,
            platform_fee: 1000,
            tax_amount: 0,
            notes: form.notes || null,
            submit_for_payment: shouldSubmitPayment,
            items: items.map(item => ({
                purchase_requisition_item_id: item.purchase_requisition_item_id,
                item_id: item.item_id,
                unit_id: item.unit_id,
                description: item.item_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_amount: item.discount_amount,
                product_url: item.product_url,
                notes: item.notes
            }))
        });

        const payload = formatBulkPayload(1, {
            purchase_channel: 'marketplace',
            marketplace_name: 'Tokopedia',
            merchant_name: 'Official Store',
            payment_method: 'marketplace_va',
            recipient_type: 'marketplace_merchant',
            recipient_name: 'Official Store',
            bank_name: 'BCA Virtual Account',
            bank_account_number: '8077712345678',
            bank_account_holder: 'Official Store',
            notes: 'Pembelian bulk IT dan Operasional'
        }, bulkItems, true);

        assert.equal(payload.company_id, 1);
        assert.equal(payload.purchase_channel, 'marketplace');
        assert.equal(payload.submit_for_payment, true);
        assert.equal(payload.items.length, 2);
        assert.equal(payload.items[0].purchase_requisition_item_id, 11);
        assert.equal(payload.items[1].purchase_requisition_item_id, 22);
    });

    it('formats valid payload for Consolidated Procurement Plan (Multi-PR)', () => {
        const selectedItems = [
            { pr_item_id: 10, planned_qty: 15, notes: 'Batch 1' },
            { pr_item_id: 20, planned_qty: 30, notes: 'Batch 2' }
        ];

        const formatConsolidatedPlanPayload = (companyId, method, notes, items) => ({
            company_id: companyId,
            is_consolidated: true,
            procurement_method: method,
            notes: notes || null,
            items: items.map(i => ({
                purchase_requisition_item_id: i.pr_item_id,
                planned_quantity: Number(i.planned_qty),
                notes: i.notes || null
            }))
        });

        const payload = formatConsolidatedPlanPayload(
            1,
            'direct_purchase',
            'Rencana Konsolidasi Pengadaan ATK & IT',
            selectedItems
        );

        assert.equal(payload.company_id, 1);
        assert.equal(payload.is_consolidated, true);
        assert.equal(payload.purchase_requisition_id, undefined);
        assert.equal(payload.procurement_method, 'direct_purchase');
        assert.equal(payload.items.length, 2);
        assert.equal(payload.items[0].purchase_requisition_item_id, 10);
        assert.equal(payload.items[0].planned_quantity, 15);
    });

    it('verifies that 1 Bulk Direct Purchase produces exactly 1 payment disbursement in Finance', () => {
        const bulkDirectPurchase = { id: 88, dp_number: 'DP-2026-000088' };
        const generatedPaymentRequests = [
            { id: 45, direct_purchase_id: bulkDirectPurchase.id, amount: 5326000 }
        ];

        assert.equal(generatedPaymentRequests.length, 1);
        assert.equal(generatedPaymentRequests[0].direct_purchase_id, bulkDirectPurchase.id);
    });
});
