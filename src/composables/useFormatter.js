/**
 * Centrally managed formatting composable for ERP Frontend.
 * Provides unified, accessible, locale-aware date, time, currency, and number formatting.
 */

export const formatDate = (dateStr, options = {}) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr

    const defaultOptions = {
        day: '2-digit',
        month: options.month || 'short',
        year: 'numeric'
    }

    return d.toLocaleDateString('id-ID', { ...defaultOptions, ...options })
}

export const formatDateTime = (dateStr, options = {}) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr

    const defaultOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }

    return d.toLocaleDateString('id-ID', { ...defaultOptions, ...options })
}

export const formatCurrency = (amount, currency = 'IDR', options = {}) => {
    if (amount === null || amount === undefined || amount === '') {
        return '-'
    }
    const numeric = Number(amount)
    if (isNaN(numeric)) {
        return '-'
    }

    const cur = String(currency || 'IDR').toUpperCase()
    const defaultDecimals = ['IDR', 'JPY', 'KRW', 'VND'].includes(cur) ? 0 : 2

    try {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: cur,
            minimumFractionDigits: options.minimumFractionDigits ?? defaultDecimals,
            maximumFractionDigits: options.maximumFractionDigits ?? (options.minimumFractionDigits ?? defaultDecimals),
            ...options
        }).format(numeric)
    } catch {
        return `${cur} ${numeric.toLocaleString('id-ID', {
            minimumFractionDigits: options.minimumFractionDigits ?? defaultDecimals,
            maximumFractionDigits: options.maximumFractionDigits ?? defaultDecimals
        })}`
    }
}

export const convertCurrency = (amount, fromRate = 1, toRate = 1) => {
    const numeric = Number(amount)
    if (isNaN(numeric)) return 0
    const fRate = Number(fromRate)
    const tRate = Number(toRate)
    if (isNaN(fRate) || isNaN(tRate) || tRate <= 0) return 0
    return (numeric * fRate) / tRate
}

export const parseCurrency = (str) => {
    if (typeof str === 'number') return str
    if (!str) return null
    let s = String(str).trim()
    if (/^-?\d+(\.\d+)?$/.test(s)) {
        const n = parseFloat(s)
        return isNaN(n) ? null : n
    }
    s = s.replace(/[^0-9.,-]/g, '')
    if (!s) return null
    if (s.includes('.') && s.includes(',')) {
        s = s.replace(/\./g, '').replace(',', '.')
    } else if (s.includes('.')) {
        const parts = s.split('.')
        if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
            s = s.replace(/\./g, '')
        }
    } else if (s.includes(',')) {
        s = s.replace(',', '.')
    }
    const num = parseFloat(s)
    return isNaN(num) ? null : num
}

export const formatNumber = (num, decimals = 0) => {
    if (num === null || num === undefined || num === '') return '0'
    const n = Number(num)
    if (isNaN(n)) return '0'
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(n)
}

export function useFormatter() {
    return {
        formatDate,
        formatDateTime,
        formatCurrency,
        convertCurrency,
        parseCurrency,
        formatNumber
    }
}
