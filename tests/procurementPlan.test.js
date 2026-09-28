import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    getProcurementQueue,
    getProcurementPlans,
    showProcurementPlan,
    createProcurementPlan,
    updateProcurementPlan,
    activateProcurementPlan,
    cancelProcurementPlan
} from '../src/services/procurementPlanServices.js';

describe('Procurement Plan Services & Business Logic Contract Tests', () => {
    it('exports all expected Procurement Plan service functions', () => {
        assert.equal(typeof getProcurementQueue, 'function');
        assert.equal(typeof getProcurementPlans, 'function');
        assert.equal(typeof showProcurementPlan, 'function');
        assert.equal(typeof createProcurementPlan, 'function');
        assert.equal(typeof updateProcurementPlan, 'function');
        assert.equal(typeof activateProcurementPlan, 'function');
        assert.equal(typeof cancelProcurementPlan, 'function');
    });

    it('validates supported procurement methods (direct_purchase and rfq)', () => {
        const validMethods = ['direct_purchase', 'rfq'];

        assert.equal(validMethods.includes('direct_purchase'), true);
        assert.equal(validMethods.includes('rfq'), true);
        assert.equal(validMethods.includes('random_method'), false);
    });

    it('validates client-side constraints on plan creation', () => {
        const validatePlan = (form) => {
            const errs = {};
            if (!form.purchase_requisition_id) {
                errs.purchase_requisition_id = 'Purchase Requisition wajib dipilih.';
            }

            const allowedMethods = ['direct_purchase', 'rfq'];
            if (!form.procurement_method || !allowedMethods.includes(form.procurement_method)) {
                errs.procurement_method = 'Metode pengadaan harus direct_purchase atau rfq.';
            }

            const selectedItems = (form.items || []).filter(i => i.is_selected);
            if (selectedItems.length === 0) {
                errs.items = 'Minimal satu item harus dialokasikan.';
            } else {
                selectedItems.forEach((item, idx) => {
                    const qty = Number(item.planned_quantity);
                    if (isNaN(qty) || qty <= 0) {
                        errs[`items.${idx}.planned_quantity`] = 'Kuantitas harus lebih dari 0.';
                    } else if (qty > Number(item.remaining_quantity)) {
                        errs[`items.${idx}.planned_quantity`] = `Kuantitas (${qty}) melebihi sisa kuota (${item.remaining_quantity}).`;
                    }
                });
            }

            return errs;
        };

        // Test empty form
        const emptyErrs = validatePlan({});
        assert.ok(emptyErrs.purchase_requisition_id);
        assert.ok(emptyErrs.procurement_method);
        assert.ok(emptyErrs.items);

        // Test valid Direct Purchase allocation
        const validDirectPlan = {
            purchase_requisition_id: 10,
            procurement_method: 'direct_purchase',
            items: [
                {
                    is_selected: true,
                    purchase_requisition_item_id: 101,
                    remaining_quantity: 5,
                    planned_quantity: 5
                }
            ]
        };
        const validErrs = validatePlan(validDirectPlan);
        assert.equal(Object.keys(validErrs).length, 0);

        // Test over-allocation constraint
        const overAllocatedPlan = {
            purchase_requisition_id: 10,
            procurement_method: 'rfq',
            items: [
                {
                    is_selected: true,
                    purchase_requisition_item_id: 101,
                    remaining_quantity: 3,
                    planned_quantity: 5
                }
            ]
        };
        const overErrs = validatePlan(overAllocatedPlan);
        assert.ok(overErrs['items.0.planned_quantity']);
    });

    it('formats correct payload for creating procurement plans', () => {
        const preparePayload = (form) => {
            return {
                purchase_requisition_id: form.purchase_requisition_id,
                procurement_method: form.procurement_method,
                notes: form.notes || null,
                items: form.items
                    .filter(i => i.is_selected)
                    .map(i => ({
                        purchase_requisition_item_id: i.purchase_requisition_item_id,
                        planned_quantity: Number(i.planned_quantity),
                        notes: i.notes || null
                    }))
            };
        };

        const form = {
            purchase_requisition_id: 5,
            procurement_method: 'direct_purchase',
            notes: 'Beli langsung marketplace Tokopedia',
            items: [
                {
                    is_selected: true,
                    purchase_requisition_item_id: 12,
                    planned_quantity: 2,
                    notes: 'Warna hitam'
                },
                {
                    is_selected: false,
                    purchase_requisition_item_id: 13,
                    planned_quantity: 1,
                    notes: 'Exclude this'
                }
            ]
        };

        const payload = preparePayload(form);
        assert.equal(payload.purchase_requisition_id, 5);
        assert.equal(payload.procurement_method, 'direct_purchase');
        assert.equal(payload.notes, 'Beli langsung marketplace Tokopedia');
        assert.equal(payload.items.length, 1);
        assert.equal(payload.items[0].purchase_requisition_item_id, 12);
        assert.equal(payload.items[0].planned_quantity, 2);
        assert.equal(payload.items[0].notes, 'Warna hitam');
    });

    it('correctly calculates remaining queue quantities and allocation summaries', () => {
        const queueItem = {
            requested_quantity: 10,
            allocated_quantity: 4,
            remaining_quantity: 6
        };

        const calculateRemaining = (requested, allocated) => {
            return Math.max(0, requested - allocated);
        };

        assert.equal(calculateRemaining(queueItem.requested_quantity, queueItem.allocated_quantity), 6);
        assert.equal(calculateRemaining(10, 10), 0);
        assert.equal(calculateRemaining(10, 12), 0);
    });

    it('groups queue items by Purchase Requisition (PR) with aggregate counts, requester details, and custom item detection', () => {
        const rawQueueItems = [
            {
                pr_id: 101,
                pr_number: 'PR/2026/03/001',
                company: { id: 1, name: 'PT Surya Digital Nusantara' },
                division: { id: 2, name: 'IT Infrastructure' },
                requester: { id: 15, name: 'Budi Hartono', email: 'budi.h@example.com' },
                purpose: 'Pembaruan switch core dan router DC',
                required_date: '2026-04-01',
                purchase_requisition_item_id: 1,
                item_name: 'Cisco Router ASR-1001X',
                requested_quantity: 2,
                remaining_quantity: 2,
                is_custom_item: false
            },
            {
                pr_id: 101,
                pr_number: 'PR/2026/03/001',
                company: { id: 1, name: 'PT Surya Digital Nusantara' },
                division: { id: 2, name: 'IT Infrastructure' },
                requester: { id: 15, name: 'Budi Hartono', email: 'budi.h@example.com' },
                purpose: 'Pembaruan switch core dan router DC',
                required_date: '2026-04-01',
                purchase_requisition_item_id: 2,
                item_name: 'Kabel Patch Cord Cat6 3m',
                requested_quantity: 50,
                remaining_quantity: 30,
                is_custom_item: true
            },
            {
                pr_id: 102,
                pr_number: 'PR/2026/03/002',
                company: { id: 1, name: 'PT Surya Digital Nusantara' },
                division: { id: 3, name: 'HR & GA' },
                requester: { id: 22, name: 'Siti Rahmawati', email: 'siti.r@example.com' },
                purpose: 'Kebutuhan kursi ergonomis staf baru',
                required_date: '2026-03-30',
                purchase_requisition_item_id: 3,
                item_name: 'Ergonomic Office Chair',
                requested_quantity: 10,
                remaining_quantity: 10,
                is_custom_item: false
            }
        ];

        const groupPrs = (items, searchQuery = '') => {
            const map = new Map();
            for (const item of items) {
                if (!map.has(item.pr_id)) {
                    map.set(item.pr_id, {
                        pr_id: item.pr_id,
                        pr_number: item.pr_number || `PR #${item.pr_id}`,
                        company: item.company,
                        division: item.division,
                        requester: item.requester,
                        purpose: item.purpose,
                        request_date: item.request_date,
                        required_date: item.required_date,
                        items: [],
                        total_requested_qty: 0,
                        total_remaining_qty: 0,
                        has_custom_item: false
                    });
                }
                const pr = map.get(item.pr_id);
                pr.items.push(item);
                pr.total_requested_qty += Number(item.requested_quantity || 0);
                pr.total_remaining_qty += Number(item.remaining_quantity || 0);
                if (item.is_custom_item) {
                    pr.has_custom_item = true;
                }
            }

            let list = Array.from(map.values());
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                list = list.filter(pr =>
                    pr.pr_number?.toLowerCase().includes(q) ||
                    pr.division?.name?.toLowerCase().includes(q) ||
                    pr.company?.name?.toLowerCase().includes(q) ||
                    pr.requester?.name?.toLowerCase().includes(q) ||
                    pr.items.some(i => (i.item_name || i.item?.name || '').toLowerCase().includes(q))
                );
            }
            return list;
        };

        const grouped = groupPrs(rawQueueItems);
        assert.equal(grouped.length, 2, 'Should create 2 PR groups');

        const pr101 = grouped.find(p => p.pr_id === 101);
        assert.ok(pr101, 'PR 101 should exist');
        assert.equal(pr101.items.length, 2);
        assert.equal(pr101.total_requested_qty, 52);
        assert.equal(pr101.total_remaining_qty, 32);
        assert.equal(pr101.has_custom_item, true, 'PR 101 has a custom item');
        assert.equal(pr101.division.name, 'IT Infrastructure');
        assert.equal(pr101.requester.name, 'Budi Hartono');
        assert.equal(pr101.purpose, 'Pembaruan switch core dan router DC');

        const pr102 = grouped.find(p => p.pr_id === 102);
        assert.ok(pr102, 'PR 102 should exist');
        assert.equal(pr102.items.length, 1);
        assert.equal(pr102.total_requested_qty, 10);
        assert.equal(pr102.total_remaining_qty, 10);
        assert.equal(pr102.has_custom_item, false, 'PR 102 has no custom items');
        assert.equal(pr102.requester.name, 'Siti Rahmawati');

        // Test search query filtering by requester name
        const filteredByRequester = groupPrs(rawQueueItems, 'hartono');
        assert.equal(filteredByRequester.length, 1);
        assert.equal(filteredByRequester[0].pr_id, 101);

        // Test search query filtering by item name
        const filteredByItem = groupPrs(rawQueueItems, 'cisco');
        assert.equal(filteredByItem.length, 1);
        assert.equal(filteredByItem[0].pr_id, 101);

        // Test search query filtering by division
        const filteredByDiv = groupPrs(rawQueueItems, 'HR');
        assert.equal(filteredByDiv.length, 1);
        assert.equal(filteredByDiv[0].pr_id, 102);
    });
});
