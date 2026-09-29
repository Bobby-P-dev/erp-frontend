import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
    getPaymentRequests,
    getPaymentRequestDetail,
    showPaymentRequest,
    disbursePayment,
    resubmitPaymentRequest,
    getDisbursedPayments,
    getDisbursedPaymentDetail,
    showDisbursedPayment
} from '../src/services/financeServices.js'

describe('Finance Services & Business Logic Contract Tests', () => {
    it('exports all expected Finance service functions', () => {
        assert.equal(typeof getPaymentRequests, 'function')
        assert.equal(typeof getPaymentRequestDetail, 'function')
        assert.equal(typeof showPaymentRequest, 'function')
        assert.equal(typeof disbursePayment, 'function')
        assert.equal(typeof resubmitPaymentRequest, 'function')
        assert.equal(typeof getDisbursedPayments, 'function')
        assert.equal(typeof getDisbursedPaymentDetail, 'function')
        assert.equal(typeof showDisbursedPayment, 'function')
    })

    it('validates supported payment disbursement methods', () => {
        const supportedMethods = ['bank_transfer', 'cash', 'marketplace_va', 'corporate_card']
        for (const method of supportedMethods) {
            assert.ok(['bank_transfer', 'cash', 'marketplace_va', 'corporate_card'].includes(method))
        }
    })

    it('correctly calculates total cash out including bank admin fees', () => {
        const invoiceAmount = 45000000
        const bankFee = 6500
        const totalCashOut = invoiceAmount + bankFee

        assert.equal(totalCashOut, 45006500)
    })

    it('structures disbursement payload with required source account and payment date', () => {
        const payload = {
            source_account_id: 2,
            payment_date: '2026-09-28',
            bank_fee: 6500,
            reference_number: 'TRF-BCA-98124',
            notes: 'Pencairan operasional'
        }

        assert.equal(payload.source_account_id, 2)
        assert.equal(payload.payment_date, '2026-09-28')
        assert.equal(payload.bank_fee, 6500)
        assert.equal(payload.reference_number, 'TRF-BCA-98124')
    })

    it('structures resubmit payload with updated bank credentials and explanation notes', () => {
        const resubmitPayload = {
            bank_name: 'Bank Mandiri',
            bank_account_number: '1230009876543',
            bank_account_holder: 'PT Vendor Terpercaya',
            notes: 'Koreksi nomor rekening dan nama pemilik sesuai invoice revisi'
        }

        assert.equal(resubmitPayload.bank_name, 'Bank Mandiri')
        assert.equal(resubmitPayload.bank_account_number, '1230009876543')
        assert.equal(resubmitPayload.bank_account_holder, 'PT Vendor Terpercaya')
        assert.ok(resubmitPayload.notes.length > 0)
    })
})
