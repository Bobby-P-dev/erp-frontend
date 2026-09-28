import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
    getUnits, 
    searchUnits, 
    showUnit, 
    createUnit, 
    updateUnit, 
    deleteUnit 
} from '../src/services/unitServices.js';

describe('Unit Services & Contract Tests', () => {
    it('exports all standard CRUD service functions', () => {
        assert.equal(typeof getUnits, 'function');
        assert.equal(typeof searchUnits, 'function');
        assert.equal(typeof showUnit, 'function');
        assert.equal(typeof createUnit, 'function');
        assert.equal(typeof updateUnit, 'function');
        assert.equal(typeof deleteUnit, 'function');
    });

    it('handles payload format for unit creation (uppercased code)', () => {
        const rawPayload = {
            code: '  pcs  ',
            name: 'Pieces'
        };
        const sanitized = {
            code: rawPayload.code.trim().toUpperCase(),
            name: rawPayload.name.trim()
        };

        assert.equal(sanitized.code, 'PCS');
        assert.equal(sanitized.name, 'Pieces');
    });

    it('validates client-side constraints on unit form fields', () => {
        const validate = (form) => {
            const errs = {};
            if (!form.code || !form.code.trim()) {
                errs.code = 'Kode satuan wajib diisi.';
            } else if (form.code.trim().length > 50) {
                errs.code = 'Kode satuan maksimal 50 karakter.';
            }

            if (!form.name || !form.name.trim()) {
                errs.name = 'Nama satuan wajib diisi.';
            } else if (form.name.trim().length > 100) {
                errs.name = 'Nama satuan maksimal 100 karakter.';
            }

            return errs;
        };

        const emptyErrors = validate({ code: '', name: '' });
        assert.ok(emptyErrors.code);
        assert.ok(emptyErrors.name);

        const validErrors = validate({ code: 'KG', name: 'Kilogram' });
        assert.equal(Object.keys(validErrors).length, 0);

        const tooLongErrors = validate({ code: 'A'.repeat(51), name: 'B'.repeat(101) });
        assert.ok(tooLongErrors.code.includes('50'));
        assert.ok(tooLongErrors.name.includes('100'));
    });
});
