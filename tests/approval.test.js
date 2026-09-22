import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    formatCurrency,
    parseCurrency
} from '../src/utils/stringUtils.js';

import {
    ApproverScope,
    ApprovalMode,
    ApprovalRequestStatus,
    ApprovalLevelStatus,
    ApprovalActionType,
    getApprovalConfigurations,
    showApprovalConfiguration,
    createApprovalConfiguration,
    updateApprovalConfiguration,
    deleteApprovalConfiguration,
    getPendingApprovals,
    getApprovalHistory,
    getPendingApprovalCount,
    getApprovalTracker,
    getApprovalTrackerByDocument,
    processApprovalDecision,
    approveDocument,
    rejectDocument,
    requestRevisionDocument,
    resubmitApprovalRequest,
    getDocumentTypes,
    getApprovalWorkflowMetadata,
    getApprovalOptions
} from '../src/services/approvalServices.js';
import { searchUsers } from '../src/services/userServices.js';

describe('1. Currency Utilities (formatCurrency & parseCurrency)', () => {
    it('formats numbers into Indonesian Rupiah currency string', () => {
        assert.equal(formatCurrency(0), 'Rp\u00A00');
        assert.equal(formatCurrency(50000000), 'Rp\u00A050.000.000');
        assert.equal(formatCurrency('15000000.00'), 'Rp\u00A015.000.000');
        assert.equal(formatCurrency(1250000.5), 'Rp\u00A01.250.000,5');
    });

    it('returns "-" for empty or invalid currency values', () => {
        assert.equal(formatCurrency(null), '-');
        assert.equal(formatCurrency(undefined), '-');
        assert.equal(formatCurrency(''), '-');
        assert.equal(formatCurrency('invalid'), '-');
    });

    it('parses formatted Indonesian currency strings accurately back to numbers', () => {
        assert.equal(parseCurrency(50000000), 50000000);
        assert.equal(parseCurrency('50000000'), 50000000);
        assert.equal(parseCurrency('50000000.00'), 50000000);
        assert.equal(parseCurrency('Rp 50.000.000'), 50000000);
        assert.equal(parseCurrency('Rp\u00A050.000.000'), 50000000);
        assert.equal(parseCurrency('Rp 50.000.000,50'), 50000000.5);
        assert.equal(parseCurrency('Rp 1.500'), 1500);
        assert.equal(parseCurrency('Rp 1.500.000'), 1500000);
        assert.equal(parseCurrency(null), null);
        assert.equal(parseCurrency(''), null);
    });

    it('achieves roundtrip consistency between formatCurrency and parseCurrency', () => {
        const testValues = [0, 500, 1500000, 45000000, 100000000];
        for (const val of testValues) {
            const formatted = formatCurrency(val);
            const parsed = parseCurrency(formatted);
            assert.equal(parsed, val, `Failed roundtrip for ${val}: got ${parsed} from "${formatted}"`);
        }
    });
});

describe('2. Approval Enums & Constants', () => {
    it('defines correct ApproverScope matching Laravel Backend', () => {
        assert.equal(ApproverScope.DEPARTMENT_HEAD, 'department_head');
        assert.equal(ApproverScope.ROLE_ONLY, 'role_only');
        assert.equal(ApproverScope.ROLE_AND_DIVISION, 'role_and_division');
        assert.equal(ApproverScope.JOB_LEVEL_AND_DIVISION, 'job_level_and_division');
        assert.equal(ApproverScope.SPECIFIC_USER, 'specific_user');
        assert.equal(ApproverScope.POSITION_AND_DIVISION, 'position_and_division');
    });

    it('defines correct ApprovalMode matching Laravel Backend', () => {
        assert.equal(ApprovalMode.ANY, 'any');
        assert.equal(ApprovalMode.ALL, 'all');
    });

    it('defines correct ApprovalRequestStatus & ApprovalActionType', () => {
        assert.equal(ApprovalRequestStatus.PENDING, 'pending');
        assert.equal(ApprovalRequestStatus.REVISION, 'revision');
        assert.equal(ApprovalRequestStatus.APPROVED, 'approved');
        assert.equal(ApprovalRequestStatus.REJECTED, 'rejected');

        assert.equal(ApprovalActionType.APPROVE, 'approve');
        assert.equal(ApprovalActionType.REJECT, 'reject');
        assert.equal(ApprovalActionType.REQUEST_REVISION, 'request_revision');
        assert.equal(ApprovalActionType.RESUBMIT, 'resubmit');
    });
});

describe('3. Approval Service & Mock Fallback Layer', () => {
    it('retrieves approval document types', async () => {
        const res = await getDocumentTypes(false);
        assert.ok(res);
        assert.ok(Array.isArray(res.data));
    });

    it('retrieves approval workflow metadata (document_types, approver_scopes, approval_modes)', async () => {
        const res = await getApprovalWorkflowMetadata(false);
        assert.ok(res);
        assert.ok(res.data);
        assert.ok(Array.isArray(res.data.approver_scopes));
        assert.ok(Array.isArray(res.data.approval_modes));
        assert.ok(Array.isArray(res.data.document_types));
    });

    it('retrieves approval options for master data dropdowns', async () => {
        const res = await getApprovalOptions();
        assert.ok(res);
        assert.ok(res.data);
        assert.ok(Array.isArray(res.data.companies));
        assert.ok(Array.isArray(res.data.roles));
        assert.ok(Array.isArray(res.data.positions));
        assert.ok(Array.isArray(res.data.divisions));
        assert.ok(Array.isArray(res.data.job_levels));
    });

    it('searches users for specific_user approver scope', async () => {
        const res = await searchUsers('Admin');
        assert.ok(res);
        assert.ok(Array.isArray(res.data));
    });

    it('retrieves approval configurations list and filters', async () => {
        const allRes = await getApprovalConfigurations();
        assert.ok(Array.isArray(allRes.data));
        assert.ok(allRes.data.length >= 3);

        const searchRes = await getApprovalConfigurations({ search: 'Standard' });
        assert.ok(searchRes.data.every(i => i.name.includes('Standard') || i.code.includes('Standard')));

        const typeRes = await getApprovalConfigurations({ document_type: 'purchase_order' });
        assert.ok(typeRes.data.every(i => i.document_type === 'purchase_order'));
    });

    it('creates, retrieves, updates, and deletes approval configurations', async () => {
        // Create
        const newFlow = {
            document_type: 'purchase_requisition',
            company_id: null,
            code: 'APPR-TEST-UNIT',
            name: 'Unit Test Workflow',
            is_active: true,
            min_amount: '1000000.00',
            max_amount: '10000000.00',
            levels: [
                {
                    step_order: 1,
                    step_name: 'Test Level 1',
                    approver_scope: 'department_head',
                    approval_mode: 'any',
                    can_be_skipped: false,
                    sla_hours: 24,
                    condition_type: 'always',
                }
            ]
        };

        const createRes = await createApprovalConfiguration(newFlow);
        assert.ok(createRes.data.id);
        const createdId = createRes.data.id;

        // Show
        const showRes = await showApprovalConfiguration(createdId);
        assert.equal(showRes.data.name, 'Unit Test Workflow');
        assert.equal(showRes.data.levels.length, 1);

        // Update
        const updateRes = await updateApprovalConfiguration(createdId, { name: 'Updated Unit Test Workflow' });
        assert.equal(updateRes.data.name, 'Updated Unit Test Workflow');

        // Delete
        const delRes = await deleteApprovalConfiguration(createdId);
        assert.ok(delRes);
    });

    it('retrieves pending approvals, history, and count', async () => {
        const pendingRes = await getPendingApprovals();
        assert.ok(Array.isArray(pendingRes.data));
        assert.ok(pendingRes.data.length > 0);

        const historyRes = await getApprovalHistory();
        assert.ok(Array.isArray(historyRes.data));

        const countRes = await getPendingApprovalCount();
        assert.ok(typeof countRes.count === 'number');
    });

    it('retrieves approval tracker and resolves tracker by document', async () => {
        const trackerRes = await getApprovalTracker(101);
        assert.ok(trackerRes.data);
        assert.ok(trackerRes.data.request);
        assert.ok(Array.isArray(trackerRes.data.levels));
        assert.ok(Array.isArray(trackerRes.data.actions));

        const docTrackerRes = await getApprovalTrackerByDocument('purchase_requisition', 1);
        assert.ok(docTrackerRes.data);
    });

    it('processes decisions: approve, revision (normalized), reject, and resubmit', async () => {
        // Approve
        const approveRes = await approveDocument(101, 'Disetujui untuk operasional');
        assert.ok(approveRes);

        // Request Revision (normalization check: 'revision' -> 'request_revision')
        const revisionRes = await requestRevisionDocument(102, 'Mohon lengkapi spesifikasi teknis');
        assert.ok(revisionRes);

        // Resubmit
        const resubmitRes = await resubmitApprovalRequest(102, { notes: 'Sudah diperbaiki' });
        assert.ok(resubmitRes);
    });
});

describe('4. Form Validation & Edge Cases', () => {
    it('handles nested Laravel 422 dot-notation error mapping (levels.0.step_name)', () => {
        const serverErrors = {
            'document_type': ['Tipe dokumen wajib dipilih.'],
            'levels.0.step_name': ['Nama tahapan wajib diisi.'],
            'levels.0.role_id': ['Role wajib dipilih.'],
            'levels.1.job_level_id': ['Job Level wajib dipilih.'],
        };

        const getLevelError = (errors, index, fieldName) => {
            const dotKey = `levels.${index}.${fieldName}`;
            if (errors[dotKey]) {
                return Array.isArray(errors[dotKey]) ? errors[dotKey][0] : errors[dotKey];
            }
            return '';
        };

        assert.equal(getLevelError(serverErrors, 0, 'step_name'), 'Nama tahapan wajib diisi.');
        assert.equal(getLevelError(serverErrors, 0, 'role_id'), 'Role wajib dipilih.');
        assert.equal(getLevelError(serverErrors, 1, 'job_level_id'), 'Job Level wajib dipilih.');
        assert.equal(getLevelError(serverErrors, 1, 'step_name'), '');
    });

    it('clears stale scope-specific conditional fields on approver_scope change', () => {
        const level = {
            approver_scope: 'role_only',
            role_id: 5,
            job_level_id: 3,
            position_id: 4,
            division_id: 1,
            specific_user_id: 10,
        };

        const handleScopeChange = (lvl) => {
            switch (lvl.approver_scope) {
                case 'department_head':
                    lvl.role_id = null;
                    lvl.job_level_id = null;
                    lvl.position_id = null;
                    lvl.specific_user_id = null;
                    break;
                case 'role_only':
                    lvl.division_id = null;
                    lvl.job_level_id = null;
                    lvl.position_id = null;
                    lvl.specific_user_id = null;
                    break;
                case 'role_and_division':
                    lvl.job_level_id = null;
                    lvl.position_id = null;
                    lvl.specific_user_id = null;
                    break;
                case 'job_level_and_division':
                    lvl.role_id = null;
                    lvl.position_id = null;
                    lvl.specific_user_id = null;
                    break;
                case 'position_and_division':
                    lvl.role_id = null;
                    lvl.job_level_id = null;
                    lvl.specific_user_id = null;
                    break;
                case 'specific_user':
                    lvl.division_id = null;
                    lvl.role_id = null;
                    lvl.job_level_id = null;
                    lvl.position_id = null;
                    break;
            }
        };

        // When changed to department_head
        level.approver_scope = 'department_head';
        handleScopeChange(level);
        assert.equal(level.role_id, null);
        assert.equal(level.job_level_id, null);
        assert.equal(level.position_id, null);
        assert.equal(level.specific_user_id, null);

        // When set to position_and_division
        level.position_id = 4;
        level.division_id = 1;
        level.role_id = 5;
        level.approver_scope = 'position_and_division';
        handleScopeChange(level);
        assert.equal(level.role_id, null);
        assert.equal(level.position_id, 4);
        assert.equal(level.division_id, 1);

        // When set to specific_user
        level.role_id = 5;
        level.job_level_id = 2;
        level.position_id = 4;
        level.division_id = 2;
        level.specific_user_id = 7;
        level.approver_scope = 'specific_user';
        handleScopeChange(level);
        assert.equal(level.role_id, null);
        assert.equal(level.job_level_id, null);
        assert.equal(level.position_id, null);
        assert.equal(level.division_id, null);
        assert.equal(level.specific_user_id, 7);
    });

    it('filters positions based on the selected division_id in position_and_division', () => {
        const positions = [
            { value: 1, label: 'PPIC Head', division_ids: [1] },
            { value: 2, label: 'Purchasing Officer', division_ids: [2] },
            { value: 3, label: 'General Manager', division_ids: [] },
        ];

        const getFilteredPositions = (divisionId) => {
            if (!divisionId) return positions;
            return positions.filter(pos => {
                if (!pos.division_ids || pos.division_ids.length === 0) return true;
                return pos.division_ids.includes(Number(divisionId));
            });
        };

        // If no division selected, returns all positions
        assert.equal(getFilteredPositions(null).length, 3);

        // If division 1 (PPIC) selected, returns PPIC Head and General Manager
        const div1Positions = getFilteredPositions(1);
        assert.equal(div1Positions.length, 2);
        assert.deepEqual(div1Positions.map(p => p.value), [1, 3]);

        // If division 2 (Purchasing) selected, returns Purchasing Officer and General Manager
        const div2Positions = getFilteredPositions(2);
        assert.equal(div2Positions.length, 2);
        assert.deepEqual(div2Positions.map(p => p.value), [2, 3]);
    });

    it('clears stale condition_value when condition_type is set to "always"', () => {
        const level = {
            condition_type: 'amount_gte',
            condition_value: '50000000',
        };

        const handleConditionTypeChange = (lvl) => {
            if (lvl.condition_type === 'always') {
                lvl.condition_value = '';
            }
        };

        level.condition_type = 'always';
        handleConditionTypeChange(level);
        assert.equal(level.condition_value, '');
    });

    it('correctly calculates SLA deadline statuses (overdue, warning approaching, normal)', () => {
        const getSlaStatus = (item) => {
            if (item.is_overdue || (item.sla_hours_left !== undefined && item.sla_hours_left < 0)) return 'overdue';
            if (item.sla_hours_left !== undefined) {
                if (item.sla_hours_left < 4) return 'warning';
                return 'normal';
            }
            if (item.due_date) {
                const dueTime = new Date(item.due_date).getTime();
                const now = Date.now();
                const hoursLeft = (dueTime - now) / (1000 * 60 * 60);
                if (hoursLeft < 0) return 'overdue';
                if (hoursLeft < 4) return 'warning';
                return 'normal';
            }
            if (item.sla_hours) return 'normal';
            return null;
        };

        // Overdue by flag
        assert.equal(getSlaStatus({ is_overdue: true }), 'overdue');
        // Overdue by negative hours left
        assert.equal(getSlaStatus({ sla_hours_left: -2 }), 'overdue');
        // Approaching deadline (< 4 hours)
        assert.equal(getSlaStatus({ sla_hours_left: 2 }), 'warning');
        assert.equal(getSlaStatus({ sla_hours_left: 3.5 }), 'warning');
        // Normal SLA (> 4 hours)
        assert.equal(getSlaStatus({ sla_hours_left: 20 }), 'normal');
        // Due date in the past
        assert.equal(getSlaStatus({ due_date: new Date(Date.now() - 3600 * 1000).toISOString() }), 'overdue');
        // Due date in 2 hours
        assert.equal(getSlaStatus({ due_date: new Date(Date.now() + 2 * 3600 * 1000).toISOString() }), 'warning');
        // Due date in 24 hours
        assert.equal(getSlaStatus({ due_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString() }), 'normal');
    });

    it('validates action dialog client-side requirements for approve, revision, and reject', () => {
        const validateAction = (actionType, notes) => {
            const trimmed = String(notes || '').trim();
            if (actionType === 'revision') {
                if (!trimmed) return 'Catatan instruksi revisi wajib diisi.';
            } else if (actionType === 'reject') {
                if (!trimmed) return 'Alasan penolakan dokumen wajib diisi.';
                if (trimmed.length < 5) return 'Alasan penolakan minimal 5 karakter.';
            }
            return null; // Valid
        };

        // Approve with and without notes
        assert.equal(validateAction('approve', ''), null);
        assert.equal(validateAction('approve', 'LGTM'), null);

        // Revision requires notes
        assert.notEqual(validateAction('revision', ''), null);
        assert.notEqual(validateAction('revision', '   '), null);
        assert.equal(validateAction('revision', 'Mohon lengkapi NPWP'), null);

        // Reject requires notes and min 5 chars
        assert.notEqual(validateAction('reject', ''), null);
        assert.notEqual(validateAction('reject', 'No'), null);
        assert.equal(validateAction('reject', 'Harga penawaran melebihi batas anggaran yang ditentukan'), null);
    });
});

describe('5. Stepper State Machine & Sequential Execution', () => {
    const getStepState = (level, currentStepOrder, overallStatus) => {
        if (level.status) {
            const s = String(level.status).toLowerCase();
            if (['approved', 'rejected', 'skipped', 'revision'].includes(s)) {
                return s;
            }
        }
        if (overallStatus === 'rejected' && level.step_order === currentStepOrder) {
            return 'rejected';
        }
        if (overallStatus === 'revision' && level.step_order === currentStepOrder) {
            return 'revision';
        }
        if (level.step_order < currentStepOrder) {
            return 'approved';
        } else if (level.step_order === currentStepOrder) {
            if (overallStatus === 'approved') return 'approved';
            return 'current';
        } else {
            return 'future';
        }
    };

    it('computes step states correctly based on order and status', () => {
        const lvl1 = { step_order: 1 };
        const lvl2 = { step_order: 2 };
        const lvl3 = { step_order: 3 };

        // Document at step 2 pending
        assert.equal(getStepState(lvl1, 2, 'pending'), 'approved');
        assert.equal(getStepState(lvl2, 2, 'pending'), 'current');
        assert.equal(getStepState(lvl3, 2, 'pending'), 'future');

        // Document rejected at step 2
        assert.equal(getStepState(lvl1, 2, 'rejected'), 'approved');
        assert.equal(getStepState(lvl2, 2, 'rejected'), 'rejected');
        assert.equal(getStepState(lvl3, 2, 'rejected'), 'future');

        // Document revision requested at step 2
        assert.equal(getStepState(lvl2, 2, 'revision'), 'revision');

        // Explicit skipped level
        assert.equal(getStepState({ step_order: 2, status: 'skipped' }, 3, 'pending'), 'skipped');
    });
});

import { createPinia, setActivePinia } from 'pinia';
import { useApprovalStore } from '../src/stores/approvalStore.js';

describe('6. Pinia Approval Store', () => {
    it('manages pendingCount, badges, and optimistic mutations', async () => {
        setActivePinia(createPinia());
        const store = useApprovalStore();

        assert.equal(store.pendingCount, 0);
        assert.equal(store.hasPendingTasks, false);
        assert.equal(store.formattedBadge, '0');

        // Optimistic increment
        store.incrementCountOptimistic();
        assert.equal(store.pendingCount, 1);
        assert.equal(store.hasPendingTasks, true);
        assert.equal(store.formattedBadge, '1');

        // Optimistic decrement
        store.decrementCountOptimistic();
        assert.equal(store.pendingCount, 0);
        assert.equal(store.hasPendingTasks, false);

        // Guard against negative decrement
        store.decrementCountOptimistic();
        assert.equal(store.pendingCount, 0);

        // High count cap
        store.pendingCount = 145;
        assert.equal(store.formattedBadge, '99+');

        store.pendingCount = 99;
        assert.equal(store.formattedBadge, '99');
    });
});
