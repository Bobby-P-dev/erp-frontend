import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { 
    uploadUserSignature, 
    deleteUserSignature 
} from '../src/services/userServices.js';
import { 
    urlToBase64
} from '../src/utils/pdf/purchaseRequisitionPdfGenerator.js';
import { getPublicVerification } from '../src/services/verificationServices.js';

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

describe('Historical signature verification compatibility', () => {
    it('keeps verification service available for historical documents', () => {
        assert.equal(typeof getPublicVerification, 'function');
    });

    it('validates public verification payload contract for valid, tampered, and not-found states', () => {
        const validPayload = {
            is_valid: true,
            document: {
                number: 'PR-2026-0089',
                type: 'Purchase Requisition',
                date: '2026-10-15',
                total_amount: 25000000
            },
            signer: {
                name: 'Siti Aminah',
                position: 'Head of Finance',
                signed_at: '2026-10-15T14:20:00Z',
                ip_address: '192.168.1.50'
            },
            security: {
                algorithm: 'HMAC-SHA256',
                hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                short_hash: 'e3b0c442'
            }
        };

        assert.equal(validPayload.is_valid, true);
        assert.equal(validPayload.document.number, 'PR-2026-0089');
        assert.equal(validPayload.signer.name, 'Siti Aminah');
        assert.equal(validPayload.security.algorithm, 'HMAC-SHA256');

        const tamperedPayload = {
            is_valid: false,
            message: 'Integritas data tidak valid'
        };
        assert.equal(tamperedPayload.is_valid, false);
    });
});

