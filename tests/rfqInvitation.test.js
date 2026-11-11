import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref } from 'vue'
import { invitationLabel, invitationError, canSendInvitation } from '../src/utils/rfqInvitation.js'

describe('RFQ invitation delivery', () => {
    it('allows only unsent, failed or unverified historical invitations while the tender is open', () => {
        for (const status of ['not_sent', 'failed', 'legacy_unknown']) {
            assert.equal(canSendInvitation({ invitation_status: status }, true), true)
            assert.equal(canSendInvitation({ invitation_status: status }, false), false)
        }
        for (const status of ['queued', 'sending', 'sent', 'unknown', undefined]) {
            assert.equal(canSendInvitation({ invitation_status: status }, true), false)
        }
    })

    it('distinguishes provider acceptance, legacy history and uncertain outcomes', () => {
        assert.match(invitationLabel('sent'), /layanan email/)
        assert.match(invitationLabel('legacy_unknown'), /belum terverifikasi/)
        assert.match(invitationLabel('unknown'), /perlu pemeriksaan/)
        assert.match(invitationError('mail_not_configured'), /belum dikonfigurasi/)
        assert.match(invitationError('delivery_uncertain'), /sebelum mengirim ulang/)
    })

    const handler = (overrides = {}) => {
        const source = readFileSync(new URL('../src/composables/purchasing/useRfqDetail.js', import.meta.url), 'utf8')
        const body = source.slice(source.indexOf('    const handleSendInvitation ='), source.indexOf('    const validitySuppliers ='))
        const calls = []
        const deps = {
            sendingInvitation: ref(null), rfqId: ref(42),
            sendRfqInvitation: async (...args) => { calls.push(args) },
            fetchRfqDetail: async () => { calls.push('refresh') },
            showSuccess: async () => {}, showError: () => {},
            showConfirm: async () => true, showPrompt: async () => 'corrected@example.com',
            ...overrides,
        }
        return { ...deps, calls, run: new Function(...Object.keys(deps), `${body}; return handleSendInvitation`)(...Object.values(deps)) }
    }

    it('submits corrected recipient, refreshes server status and releases the loading state', async () => {
        const state = handler()
        await state.run({ id: 9, invitation_status: 'failed', invitation_attempts: [{ error_code: 'invalid_recipient' }] })
        assert.deepEqual(state.calls, [[42, 9, { email: 'corrected@example.com' }], 'refresh'])
        assert.equal(state.sendingInvitation.value, null)
    })

    it('cancels historical resend and rejects concurrent clicks without API calls', async () => {
        const state = handler({ showConfirm: async () => false })
        await state.run({ id: 9, invitation_status: 'legacy_unknown' })
        assert.deepEqual(state.calls, [])
        assert.equal(state.sendingInvitation.value, null)
        state.sendingInvitation.value = 8
        await state.run({ id: 9 })
        assert.deepEqual(state.calls, [])
    })

    it('refreshes state and displays backend rejection when another request already queued it', async () => {
        let error
        const state = handler({
            sendRfqInvitation: async () => { throw { response: { status: 422, data: { message: 'Already queued' } } } },
            showError: value => { error = value },
        })
        await state.run({ id: 9, email: 'supplier@example.com', invitation_status: 'failed' })
        assert.deepEqual(state.calls, ['refresh'])
        assert.equal(error, 'Already queued')
        assert.equal(state.sendingInvitation.value, null)
    })
})
