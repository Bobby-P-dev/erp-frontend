import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ref, computed } from 'vue'
import { rfqDeadlineInfo } from '../src/utils/rfqDeadline.js'

const snapshot = {
    server_now: '2026-11-09T23:59:59.999+07:00', deadline_at: '2026-11-09T23:59:59.999+07:00',
    can_receive_quotation: true, is_expired: false
}

describe('RFQ deadline server clock', () => {
    it('allows the last millisecond and closes when elapsed time crosses WIB midnight', () => {
        assert.equal(rfqDeadlineInfo(snapshot).canRespond, true)
        assert.equal(rfqDeadlineInfo(snapshot, 1).canRespond, false)
        assert.equal(rfqDeadlineInfo(snapshot, 1).isExpired, true)
    })
    it('uses offset timestamps independently of browser timezone or wall clock', () => {
        assert.equal(rfqDeadlineInfo({ ...snapshot, server_now: '2026-11-09T16:59:59.999Z' }).canRespond, true)
        assert.equal(rfqDeadlineInfo({ ...snapshot, server_now: '2026-11-09T17:00:00Z' }).canRespond, false)
    })
    it('blocks unknown metadata, preserves explicit server denials, and supports legacy empty deadlines', () => {
        assert.equal(rfqDeadlineInfo({ deadline_date: '2099-01-01' }).canRespond, false)
        assert.equal(rfqDeadlineInfo({ ...snapshot, deadline_at: 'invalid' }).canRespond, false)
        assert.equal(rfqDeadlineInfo({ ...snapshot, can_receive_quotation: false }).canRespond, false)
        assert.equal(rfqDeadlineInfo({ ...snapshot, deadline_at: null }).canRespond, true)
        assert.match(rfqDeadlineInfo(snapshot).label, /WIB/)
    })
    it('ticks a mounted countdown, resets on refreshed server snapshots and cleans up its timer', () => {
        let mount, unmount, tick, monotonic = 0, cleared = false
        const source = readFileSync(new URL('../src/composables/purchasing/useRfqDeadline.js', import.meta.url), 'utf8')
            .replace(/^import .*$/gm, '').replace('export function', 'function')
        const factory = new Function('ref', 'onMounted', 'onUnmounted', 'rfqDeadlineInfo', 'performance', 'setInterval', 'clearInterval', `${source}; return useRfqDeadline`)
        const clock = factory(ref, callback => { mount = callback }, callback => { unmount = callback }, rfqDeadlineInfo,
            { now: () => monotonic }, callback => { tick = callback; return 42 }, id => { cleared = id === 42 })()
        const state = computed(() => clock.getDeadlineInfo(snapshot))
        assert.equal(state.value.canRespond, true)
        mount()
        monotonic = 1
        tick()
        assert.equal(state.value.canRespond, false)
        assert.equal(clock.getDeadlineInfo({ ...snapshot, deadline_at: '2026-11-11T23:59:59.999+07:00' }).canRespond, true)
        unmount()
        assert.equal(cleared, true)
    })
})
