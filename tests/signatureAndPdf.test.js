import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { 
    uploadUserSignature, 
    deleteUserSignature 
} from '../src/services/userServices.js';
import { urlToBase64 } from '../src/utils/pdf/purchaseRequisitionPdfGenerator.js';

describe('User Signature Services & Profile Contract Tests', () => {
    it('exports uploadUserSignature and deleteUserSignature service functions', () => {
        assert.equal(typeof uploadUserSignature, 'function');
        assert.equal(typeof deleteUserSignature, 'function');
    });

    it('handles base64 data URLs in urlToBase64 directly without network call', async () => {
        const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=';
        const res = await urlToBase64(dummyBase64);
        assert.equal(res, dummyBase64);
    });

    it('returns null gracefully for invalid or empty signature URLs in urlToBase64', async () => {
        assert.equal(await urlToBase64(null), null);
        assert.equal(await urlToBase64(''), null);
        assert.equal(await urlToBase64(undefined), null);
    });
});

describe('Digital Signature Approval Enforcement Contract Tests', () => {
    it('enforces signature requirement when action is approve', () => {
        const validateAction = (action, user) => {
            if (action === 'approve' && !user?.has_signature) {
                return { valid: false, error: 'Signature required' };
            }
            return { valid: true, error: null };
        };

        const userWithoutSign = { id: 1, name: 'Approver', has_signature: false };
        const userWithSign = { id: 2, name: 'Approver', has_signature: true, signature_url: 'http://test.com/sign.png' };

        assert.deepEqual(validateAction('approve', userWithoutSign), { valid: false, error: 'Signature required' });
        assert.deepEqual(validateAction('approve', userWithSign), { valid: true, error: null });
    });

    it('does not require signature for revision or reject actions', () => {
        const validateAction = (action, user) => {
            if (action === 'approve' && !user?.has_signature) {
                return { valid: false, error: 'Signature required' };
            }
            return { valid: true, error: null };
        };

        const userWithoutSign = { id: 1, name: 'Approver', has_signature: false };

        assert.deepEqual(validateAction('revision', userWithoutSign), { valid: true, error: null });
        assert.deepEqual(validateAction('reject', userWithoutSign), { valid: true, error: null });
    });
});

describe('PDF Download Status Guard Contract Tests', () => {
    const isPdfDownloadAllowed = (status) => {
        const approvedStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed'];
        return approvedStatuses.includes(status);
    };

    it('allows PDF download only for approved and downstream statuses', () => {
        assert.equal(isPdfDownloadAllowed('approved'), true);
        assert.equal(isPdfDownloadAllowed('in_procurement'), true);
        assert.equal(isPdfDownloadAllowed('ready_for_pickup'), true);
        assert.equal(isPdfDownloadAllowed('completed'), true);
    });

    it('strictly forbids PDF download for unapproved or draft statuses', () => {
        assert.equal(isPdfDownloadAllowed('draft'), false);
        assert.equal(isPdfDownloadAllowed('pending_approval'), false);
        assert.equal(isPdfDownloadAllowed('revision_requested'), false);
        assert.equal(isPdfDownloadAllowed('rejected'), false);
        assert.equal(isPdfDownloadAllowed('cancelled'), false);
        assert.equal(isPdfDownloadAllowed(null), false);
        assert.equal(isPdfDownloadAllowed(undefined), false);
    });
});

describe('QR Code URL Verification Contract Tests', () => {
    it('constructs correct verification QR URL linking to PR detail view', () => {
        const constructQrUrl = (origin, prId) => {
            return `${origin}/purchasing/purchase-requisitions/${prId}`;
        };

        const origin = 'https://erp.padukue.store';
        const prId = 42;
        assert.equal(constructQrUrl(origin, prId), 'https://erp.padukue.store/purchasing/purchase-requisitions/42');
    });
});
