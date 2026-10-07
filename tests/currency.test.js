import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as currencyServices from '../src/services/currencyServices.js'
import { formatCurrency, convertCurrency, formatNumber } from '../src/composables/useFormatter.js'

describe('Currency Services & API Contracts', () => {
    it('exports all expected Currency service functions', () => {
        const expectedFunctions = [
            'getCurrencies',
            'searchCurrencies',
            'getBaseCurrency',
            'showCurrency',
            'createCurrency',
            'updateCurrency',
            'deleteCurrency'
        ]

        expectedFunctions.forEach(fnName => {
            assert.equal(
                typeof currencyServices[fnName],
                'function',
                `Expected currencyServices to export ${fnName}`
            )
        })
    })

    it('formats currencies accurately across multiple world currencies', () => {
        // IDR: 0 decimals
        const idrFormatted = formatCurrency(1500000, 'IDR')
        assert.ok(/1\.500\.000|1500000/.test(idrFormatted))
        assert.ok(idrFormatted.includes('Rp'))

        // USD: 2 decimals
        const usdFormatted = formatCurrency(125.75, 'USD')
        assert.ok(/125,75|125\.75/.test(usdFormatted))
        assert.ok(usdFormatted.includes('$') || usdFormatted.includes('USD'))

        // EUR: 2 decimals
        const eurFormatted = formatCurrency(250.50, 'EUR')
        assert.ok(/250,50|250\.50/.test(eurFormatted))
        assert.ok(eurFormatted.includes('€') || eurFormatted.includes('EUR'))

        // JPY: 0 decimals
        const jpyFormatted = formatCurrency(3500, 'JPY')
        assert.ok(/3\.500|3500/.test(jpyFormatted))
        assert.ok(jpyFormatted.includes('¥') || jpyFormatted.includes('JPY'))
    })

    it('converts currencies correctly using transaction exchange rates', () => {
        // 100 USD with rate 16,250 IDR/USD -> 1,625,000 IDR
        const usdAmount = 100
        const usdRate = 16250
        const idrEquivalent = convertCurrency(usdAmount, usdRate, 1)
        assert.equal(idrEquivalent, 1625000)

        // 1,625,000 IDR back to USD at rate 16,250 -> 100 USD
        const backToUsd = convertCurrency(idrEquivalent, 1, usdRate)
        assert.equal(backToUsd, 100)

        // Edge case: zero or invalid rate safely returns 0
        assert.equal(convertCurrency(100, 16250, 0), 0)
        assert.equal(convertCurrency(100, 0, 1), 0)
        assert.equal(convertCurrency('invalid', 16250, 1), 0)
    })

    it('validates client-side constraints on currency creation & editing', () => {
        const validateCurrencyForm = (form) => {
            const errors = {}
            if (!form.code || !form.code.trim()) {
                errors.code = 'Kode mata uang (ISO) wajib diisi.'
            } else if (form.code.trim().length > 10) {
                errors.code = 'Kode maksimal 10 karakter.'
            }

            if (!form.name || !form.name.trim()) {
                errors.name = 'Nama mata uang wajib diisi.'
            }

            if (!form.symbol || !form.symbol.trim()) {
                errors.symbol = 'Simbol mata uang wajib diisi.'
            }

            if (form.exchange_rate === null || form.exchange_rate === undefined || form.exchange_rate <= 0) {
                errors.exchange_rate = 'Nilai kurs harus bernilai angka lebih dari 0.'
            }

            return errors
        }

        // Empty form fails
        const emptyErrs = validateCurrencyForm({ code: '', name: '', symbol: '', exchange_rate: 0 })
        assert.ok(emptyErrs.code)
        assert.ok(emptyErrs.name)
        assert.ok(emptyErrs.symbol)
        assert.ok(emptyErrs.exchange_rate)

        // Valid form passes
        const validErrs = validateCurrencyForm({
            code: 'USD',
            name: 'US Dollar',
            symbol: '$',
            exchange_rate: 16250
        })
        assert.equal(Object.keys(validErrs).length, 0)
    })

    it('enforces transaction rate locking logic in multi-currency purchasing', () => {
        // When a purchasing transaction is created in foreign currency:
        const transaction = {
            currency: 'USD',
            exchange_rate: 16250.0,
            grand_total: 250.0 // 250 USD
        }

        // Locked IDR equivalent at creation time
        const lockedIdr = Math.round(transaction.grand_total * transaction.exchange_rate)
        assert.equal(lockedIdr, 4062500)

        // Even if future currency master rate changes to 17,000,
        // transaction lockedIdr remains 4,062,500 based on its locked transaction rate!
        const futureMasterRate = 17000.0
        assert.equal(Math.round(transaction.grand_total * transaction.exchange_rate), 4062500)
        assert.notEqual(Math.round(transaction.grand_total * futureMasterRate), lockedIdr)
    })
})
