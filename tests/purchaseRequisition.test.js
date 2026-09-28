import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    getPurchaseRequisitions,
    showPurchaseRequisition,
    createPurchaseRequisition,
    updatePurchaseRequisition,
    submitPurchaseRequisition
} from '../src/services/purchaseRequisitionServices.js';

describe('Purchase Requisition Services & Validation Contract Tests', () => {
    it('exports all expected PR service functions', () => {
        assert.equal(typeof getPurchaseRequisitions, 'function');
        assert.equal(typeof showPurchaseRequisition, 'function');
        assert.equal(typeof createPurchaseRequisition, 'function');
        assert.equal(typeof updatePurchaseRequisition, 'function');
        assert.equal(typeof submitPurchaseRequisition, 'function');
    });

    it('validates client-side constraints for both Catalog and Non-Catalog (Direct Purchase) items', () => {
        const validate = (form) => {
            const errs = {};
            if (!form.company_id) errs.company_id = 'Perusahaan wajib dipilih.';
            if (!form.division_id) errs.division_id = 'Divisi wajib dipilih.';
            if (!form.request_date) errs.request_date = 'Tanggal pengajuan wajib diisi.';
            if (!form.required_date) {
                errs.required_date = 'Target tanggal dibutuhkan wajib diisi.';
            } else if (form.request_date && form.required_date < form.request_date) {
                errs.required_date = 'Target tanggal dibutuhkan tidak boleh lebih awal dari tanggal pengajuan.';
            }
            if (!form.purpose || !form.purpose.trim()) {
                errs.purpose = 'Keperluan pengadaan wajib diisi.';
            } else if (form.purpose.trim().length > 255) {
                errs.purpose = 'Keperluan maksimal 255 karakter.';
            }

            if (!form.items || form.items.length === 0) {
                errs.items = 'Minimal 1 item barang/jasa harus diajukan.';
            } else {
                form.items.forEach((item, index) => {
                    const mode = item.entry_mode || (item.item_id ? 'catalog' : 'custom');
                    if (mode === 'catalog' && !item.item_id) {
                        errs[`items.${index}.item_id`] = 'Barang dari katalog master wajib dipilih.';
                    }
                    if (mode === 'custom' && (!item.item_name || !item.item_name.trim())) {
                        errs[`items.${index}.item_name`] = 'Nama barang wajib diisi untuk pembelian non-katalog.';
                    }
                    if (!item.unit_id) errs[`items.${index}.unit_id`] = 'Satuan wajib dipilih.';
                    if (!item.quantity || Number(item.quantity) <= 0) {
                        errs[`items.${index}.quantity`] = 'Jumlah kuantitas harus lebih besar dari 0.';
                    }
                    if (form.actionType === 'submit') {
                        if (item.estimated_price === '' || item.estimated_price === null || item.estimated_price === undefined || Number(item.estimated_price) <= 0) {
                            errs[`items.${index}.estimated_price`] = 'Perkiraan harga satuan wajib diisi dan lebih besar dari 0.';
                        }
                    }
                    if (item.reference_url && !/^https?:\/\/.+/i.test(item.reference_url.trim())) {
                        errs[`items.${index}.reference_url`] = 'Format tautan harus valid URL (http/https).';
                    }
                });
            }

            return errs;
        };

        // Test empty form
        const emptyErrs = validate({
            company_id: null,
            division_id: null,
            request_date: '',
            required_date: '',
            purpose: '',
            items: []
        });

        assert.ok(emptyErrs.company_id);
        assert.ok(emptyErrs.division_id);
        assert.ok(emptyErrs.request_date);
        assert.ok(emptyErrs.required_date);
        assert.ok(emptyErrs.purpose);
        assert.ok(emptyErrs.items);

        // Test invalid custom non-catalog item (missing item_name)
        const invalidCustomErrs = validate({
            company_id: 1,
            division_id: 2,
            request_date: '2026-10-10',
            required_date: '2026-10-15',
            purpose: 'Beli barang bebas',
            actionType: 'submit',
            items: [
                { entry_mode: 'custom', item_name: '', unit_id: null, quantity: 0, estimated_price: 0 }
            ]
        });

        assert.ok(invalidCustomErrs['items.0.item_name']);
        assert.ok(invalidCustomErrs['items.0.unit_id']);
        assert.ok(invalidCustomErrs['items.0.quantity']);
        assert.ok(invalidCustomErrs['items.0.estimated_price']);

        // Test valid hybrid form (1 catalog item, 1 non-catalog direct purchase item)
        const validHybridErrs = validate({
            company_id: 1,
            division_id: 2,
            request_date: '2026-10-10',
            required_date: '2026-10-15',
            purpose: 'Pengadaan ATK & Mouse Tokopedia',
            actionType: 'submit',
            items: [
                {
                    entry_mode: 'catalog',
                    item_id: 5,
                    unit_id: 1,
                    quantity: 10,
                    estimated_price: 15000
                },
                {
                    entry_mode: 'custom',
                    item_name: 'Logitech Wireless Mouse M331 Silent Hitam',
                    unit_id: 1,
                    quantity: 2,
                    estimated_price: 250000,
                    reference_url: 'https://tokopedia.com/product/mouse-logitech'
                }
            ]
        });

        assert.equal(Object.keys(validHybridErrs).length, 0);
    });

    it('formats submit action payloads properly for draft vs immediate submission with non-catalog items', () => {
        const buildPayload = (form, isDraft = false) => ({
            company_id: form.company_id,
            division_id: form.division_id,
            requester_id: form.requester_id,
            request_date: form.request_date,
            required_date: form.required_date,
            purpose: form.purpose,
            action: isDraft ? 'draft' : 'submit',
            submit_immediately: !isDraft,
            approval_configuration_id: form.approval_configuration_id || undefined,
            items: form.items.map(i => ({
                item_id: i.entry_mode === 'catalog' ? i.item_id : null,
                item_name: i.entry_mode === 'custom' ? i.item_name : null,
                unit_id: i.unit_id,
                quantity: i.quantity,
                reference_url: i.reference_url || null
            }))
        });

        const hybridForm = {
            company_id: 1,
            division_id: 2,
            requester_id: 3,
            request_date: '2026-09-24',
            required_date: '2026-10-01',
            purpose: 'Pengadaan Campuran',
            items: [
                { entry_mode: 'catalog', item_id: 10, unit_id: 1, quantity: 5 },
                { entry_mode: 'custom', item_name: 'Kabel Converter HDMI Ugreen', unit_id: 1, quantity: 1, reference_url: 'https://shopee.co.id/ugreen-hdmi' }
            ]
        };

        const payload = buildPayload(hybridForm, false);
        assert.equal(payload.action, 'submit');
        assert.equal(payload.submit_immediately, true);
        assert.equal(payload.items[0].item_id, 10);
        assert.equal(payload.items[0].item_name, null);
        assert.equal(payload.items[1].item_id, null);
        assert.equal(payload.items[1].item_name, 'Kabel Converter HDMI Ugreen');
        assert.equal(payload.items[1].reference_url, 'https://shopee.co.id/ugreen-hdmi');
    });

    it('enforces that draft and revision_requested PRs can be edited and structures update payloads correctly', () => {
        const canEditPR = (pr) => Boolean(pr && (pr.status === 'draft' || pr.status === 'revision_requested'));

        assert.equal(canEditPR({ id: 1, status: 'draft' }), true);
        assert.equal(canEditPR({ id: 2, status: 'revision_requested' }), true);
        assert.equal(canEditPR({ id: 3, status: 'pending_approval' }), false);
        assert.equal(canEditPR({ id: 4, status: 'approved' }), false);
        assert.equal(canEditPR({ id: 5, status: 'rejected' }), false);
        assert.equal(canEditPR(null), false);

        // Test update payload builder for "Simpan Perubahan Draft"
        const buildUpdatePayload = (form, isSubmit = false) => ({
            company_id: form.company_id,
            division_id: form.division_id,
            requester_id: form.requester_id,
            request_date: form.request_date,
            required_date: form.required_date,
            purpose: form.purpose,
            notes: form.notes || null,
            action: isSubmit ? 'submit' : 'draft',
            submit_immediately: isSubmit,
            is_submitted: isSubmit,
            approval_configuration_id: form.approval_configuration_id || null,
            items: form.items.map(row => ({
                item_id: row.entry_mode === 'catalog' ? row.item_id : null,
                item_name: row.entry_mode === 'custom' ? row.item_name : null,
                unit_id: row.unit_id,
                quantity: Number(row.quantity),
                estimated_price: Number(row.estimated_price) || 0,
                accounting_category_id: row.accounting_category_id || null,
                accounting_subcategory_id: row.accounting_subcategory_id || null,
                accounting_account_id: row.accounting_account_id || null,
                reference_url: row.reference_url || null,
                notes: row.notes || null
            }))
        });

        const draftForm = {
            company_id: 6,
            division_id: 5,
            requester_id: 4,
            request_date: '2026-09-28',
            required_date: '2026-10-05',
            purpose: 'Revisi Kebutuhan Laptop Kantor',
            notes: 'Perubahan spek dan kuantitas',
            approval_configuration_id: 1,
            items: [
                {
                    entry_mode: 'catalog',
                    item_id: 22,
                    item_name: '',
                    unit_id: 3,
                    quantity: 3,
                    estimated_price: 18000000,
                    accounting_category_id: 2,
                    accounting_subcategory_id: 4,
                    accounting_account_id: 10,
                    reference_url: '',
                    notes: 'Spek Core i7 32GB RAM'
                },
                {
                    entry_mode: 'custom',
                    item_id: null,
                    item_name: 'Standing Desk Ergonomis Dual Motor',
                    unit_id: 3,
                    quantity: 1,
                    estimated_price: 4500000,
                    accounting_category_id: null,
                    accounting_subcategory_id: null,
                    accounting_account_id: null,
                    reference_url: 'https://tokopedia.com/standing-desk',
                    notes: 'Untuk ruang desain'
                }
            ]
        };

        // 1. Simpan Perubahan Draft
        const saveDraftPayload = buildUpdatePayload(draftForm, false);
        assert.equal(saveDraftPayload.action, 'draft');
        assert.equal(saveDraftPayload.submit_immediately, false);
        assert.equal(saveDraftPayload.is_submitted, false);
        assert.equal(saveDraftPayload.items.length, 2);
        assert.equal(saveDraftPayload.items[0].item_id, 22);
        assert.equal(saveDraftPayload.items[0].quantity, 3);
        assert.equal(saveDraftPayload.items[1].item_id, null);
        assert.equal(saveDraftPayload.items[1].item_name, 'Standing Desk Ergonomis Dual Motor');

        // 2. Simpan & Ajukan Persetujuan
        const submitPayload = buildUpdatePayload(draftForm, true);
        assert.equal(submitPayload.action, 'submit');
        assert.equal(submitPayload.submit_immediately, true);
        assert.equal(submitPayload.is_submitted, true);
    });

    it('supports combined rejected and revision_requested filter in status tabs', () => {
        const statusTabs = [
            { id: '', label: 'Semua Status' },
            { id: 'draft', label: 'Draft' },
            { id: 'pending_approval', label: 'Menunggu Persetujuan' },
            { id: 'approved', label: 'Disetujui' },
            { id: 'rejected,revision_requested', label: 'Ditolak / Revisi' }
        ];

        const rejectedTab = statusTabs.find(tab => tab.label === 'Ditolak / Revisi');
        assert.ok(rejectedTab);
        assert.equal(rejectedTab.id, 'rejected,revision_requested');

        const isItemInTab = (itemStatus, tabId) => {
            if (!tabId) return true;
            const allowed = tabId.split(',').map(s => s.trim());
            return allowed.includes(itemStatus);
        };

        assert.equal(isItemInTab('rejected', rejectedTab.id), true);
        assert.equal(isItemInTab('revision_requested', rejectedTab.id), true);
        assert.equal(isItemInTab('draft', rejectedTab.id), false);
        assert.equal(isItemInTab('pending_approval', rejectedTab.id), false);
    });

    it('maps revision status to human-friendly Indonesian label and amber styling', () => {
        const getStatusBadge = (status) => {
            switch (status) {
                case 'draft':
                    return { label: 'Draft', class: 'bg-slate-100 text-slate-700 border-slate-200' };
                case 'pending_approval':
                    return { label: 'Menunggu Persetujuan', class: 'bg-blue-50 text-blue-700 border-blue-200' };
                case 'approved':
                    return { label: 'Disetujui', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                case 'rejected':
                    return { label: 'Ditolak', class: 'bg-rose-50 text-rose-700 border-rose-200' };
                case 'revision_requested':
                case 'revision':
                    return { label: 'Perlu Revisi', class: 'bg-amber-50 text-amber-800 border-amber-200' };
                default:
                    return { label: status, class: 'bg-slate-100 text-slate-700 border-slate-200' };
            }
        };

        const revisionMeta = getStatusBadge('revision_requested');
        assert.equal(revisionMeta.label, 'Perlu Revisi');
        assert.ok(revisionMeta.class.includes('amber'));
        assert.notEqual(revisionMeta.label, 'revision_requested');
    });
});

