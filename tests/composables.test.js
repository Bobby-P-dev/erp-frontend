import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    formatDate,
    formatDateTime,
    formatCurrency,
    convertCurrency,
    parseCurrency,
    formatNumber,
    useFormatter
} from '../src/composables/useFormatter.js'
import { useDataTable } from '../src/composables/useDataTable.js'

describe('useFormatter Composable & Locale Helpers', () => {
    it('provides standard formatDate formatting for Indonesian locale', () => {
        assert.equal(formatDate(null), '-')
        assert.equal(formatDate(undefined), '-')
        assert.equal(formatDate(''), '-')
        assert.equal(formatDate('invalid-date'), 'invalid-date')

        const formatted = formatDate('2026-09-30')
        assert.ok(formatted.includes('2026'))
        assert.ok(/30/.test(formatted))
    })

    it('provides formatDateTime with hours and minutes', () => {
        assert.equal(formatDateTime(null), '-')
        const formatted = formatDateTime('2026-09-30T14:30:00Z')
        assert.ok(formatted.includes('2026'))
    })

    it('formats currencies consistently in IDR and foreign currencies', () => {
        assert.equal(formatCurrency(null), '-')
        assert.equal(formatCurrency(undefined), '-')
        assert.equal(formatCurrency('abc'), '-')
        assert.ok(formatCurrency(0).includes('0'))
        assert.ok(/1\.500\.000|1500000/.test(formatCurrency(1500000)))
        const usdFormatted = formatCurrency(1250.5, 'USD')
        assert.ok(usdFormatted.includes('1.250,50') || usdFormatted.includes('1,250.50') || usdFormatted.includes('USD'))
    })

    it('converts currencies using exchange rates correctly', () => {
        // e.g. 100 USD at rate 16000 to IDR (rate 1) -> 1,600,000 IDR
        assert.equal(convertCurrency(100, 16000, 1), 1600000)
        // e.g. 1,600,000 IDR to USD (rate 16000) -> 100 USD
        assert.equal(convertCurrency(1600000, 1, 16000), 100)
        // invalid amount or rate returns 0
        assert.equal(convertCurrency('abc', 16000, 1), 0)
        assert.equal(convertCurrency(100, 16000, 0), 0)
    })

    it('parses formatted currency strings back to numeric values', () => {
        assert.equal(parseCurrency(null), null)
        assert.equal(parseCurrency(''), null)
        assert.equal(parseCurrency(125000), 125000)
        assert.equal(parseCurrency('Rp 1.500.000'), 1500000)
        assert.equal(parseCurrency('250,50'), 250.50)
        assert.equal(parseCurrency('1.250.000,75'), 1250000.75)
    })

    it('formats numbers with custom decimals', () => {
        assert.equal(formatNumber(null), '0')
        assert.ok(/1\.500|1500/.test(formatNumber(1500)))
        assert.ok(/1\.500,50|1500\.50/.test(formatNumber(1500.5, 2)))
    })

    it('exports all utilities via useFormatter()', () => {
        const formatter = useFormatter()
        assert.equal(typeof formatter.formatDate, 'function')
        assert.equal(typeof formatter.formatDateTime, 'function')
        assert.equal(typeof formatter.formatCurrency, 'function')
        assert.equal(typeof formatter.parseCurrency, 'function')
        assert.equal(typeof formatter.formatNumber, 'function')
    })
})

describe('useDataTable Composable Lifecycle & State Management', () => {
    it('initializes default reactive state correctly', () => {
        const dummyFetch = async () => ({ data: [], meta: { total: 0 } })
        const table = useDataTable(dummyFetch, {
            immediate: false,
            initialFilters: { status: 'draft' },
            initialPerPage: 25
        })

        assert.deepEqual(table.items.value, [])
        assert.equal(table.isLoading.value, false)
        assert.equal(table.searchQuery.value, '')
        assert.deepEqual(table.filters.value, { status: 'draft' })
        assert.equal(table.pagination.value.per_page, 25)
        assert.equal(table.pagination.value.current_page, 1)
    })

    it('fetches data and updates items, pagination, and counts', async () => {
        let calledWith = []
        const mockResponse = {
            data: [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' }
            ],
            meta: {
                current_page: 2,
                last_page: 5,
                from: 11,
                to: 12,
                total: 50,
                per_page: 10
            },
            counts: {
                all: 50,
                pending: 10,
                approved: 40
            }
        }

        const fetchFn = async (search, page, perPage, filters) => {
            calledWith = [search, page, perPage, filters]
            return mockResponse
        }
        const table = useDataTable(fetchFn, { immediate: false })

        const res = await table.fetchData(2)

        assert.deepEqual(calledWith, ['', 2, 10, {}])
        assert.equal(table.items.value.length, 2)
        assert.equal(table.pagination.value.current_page, 2)
        assert.equal(table.pagination.value.total, 50)
        assert.equal(table.counts.value.approved, 40)
        assert.equal(table.isLoading.value, false)
        assert.deepEqual(res, mockResponse)
    })

    it('handles pagination and per page changes', async () => {
        let calls = []
        const fetchFn = async (search, page, perPage, filters) => {
            calls.push({ search, page, perPage, filters })
            return { data: [], meta: { total: 0 } }
        }
        const table = useDataTable(fetchFn, { immediate: false })

        table.handlePageChange(3)
        assert.equal(calls[calls.length - 1].page, 3)

        table.handlePerPageChange(50)
        assert.equal(table.pagination.value.per_page, 50)
        assert.equal(calls[calls.length - 1].perPage, 50)
        assert.equal(calls[calls.length - 1].page, 1)
    })

    it('resets filters and clears search', async () => {
        const fetchFn = async () => ({ data: [], meta: { total: 0 } })
        const table = useDataTable(fetchFn, {
            immediate: false,
            initialFilters: { category: 'all' }
        })

        table.searchQuery.value = 'query keyword'
        table.filters.value.category = 'electronics'

        table.clearSearch()
        assert.equal(table.searchQuery.value, '')

        table.resetFilters({ category: 'books' })
        assert.equal(table.filters.value.category, 'books')
    })
})
