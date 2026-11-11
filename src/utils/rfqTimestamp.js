import { formatDateTime } from '../composables/useFormatter.js'

// Deadline audit rows use SQL UTC strings; other API timestamps include an offset.
// Date-only business fields continue to use formatDate.
export const formatRfqTimestamp = (value) => {
    if (!value) return '-'
    const timestamp = typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)
        ? `${value.replace(' ', 'T')}Z`
        : value
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return '-'
    return `${formatDateTime(date.toISOString(), { timeZone: 'Asia/Jakarta' })} WIB`
}
