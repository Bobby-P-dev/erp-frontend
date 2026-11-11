import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRfqTimestamp } from '../src/utils/rfqTimestamp.js'

test('RFQ UTC timestamps display as WIB regardless of host timezone', () => {
    const result = formatRfqTimestamp('2026-11-10T04:44:00.000Z')
    assert.match(result, /10 Nov 2026/)
    assert.match(result, /11[.:]44 WIB$/)
    assert.equal(result, formatRfqTimestamp('2026-11-10T11:44:00+07:00'))
    assert.equal(result, formatRfqTimestamp('2026-11-10 04:44:00'))
    assert.equal(result, formatRfqTimestamp('2026-11-10 04:44:00.000'))
})

test('RFQ timestamp conversion crosses the calendar day correctly', () => {
    const result = formatRfqTimestamp('2026-11-10T18:30:00Z')
    assert.match(result, /11 Nov 2026/)
    assert.match(result, /01[.:]30 WIB$/)
})

test('missing and invalid RFQ timestamps show a placeholder', () => {
    for (const value of [null, undefined, '', 'invalid']) {
        assert.equal(formatRfqTimestamp(value), '-')
    }
})
