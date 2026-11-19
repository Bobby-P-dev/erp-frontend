import api from './api.js'

export const AUDIT_EVENT_BADGES = {
    created: {
        label: 'Dibuat',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotClass: 'bg-emerald-500',
    },
    updated: {
        label: 'Diubah',
        badgeClass: 'bg-blue-50 text-[#014BAA] border-blue-200/80',
        dotClass: 'bg-[#014BAA]',
    },
    deleted: {
        label: 'Dihapus',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dotClass: 'bg-rose-500',
    },
    restored: {
        label: 'Dipulihkan',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80',
        dotClass: 'bg-teal-500',
    },
    permissions_synced: {
        label: 'Izin Role Diperbarui',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dotClass: 'bg-amber-500',
    },
    roles_synced: {
        label: 'Role User Diperbarui',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dotClass: 'bg-amber-500',
    },
}

export const getAuditEventBadge = (event, fallbackLabel = null) => {
    const key = String(event || '').toLowerCase()
    if (AUDIT_EVENT_BADGES[key]) {
        return {
            ...AUDIT_EVENT_BADGES[key],
            label: fallbackLabel || AUDIT_EVENT_BADGES[key].label,
        }
    }

    return {
        label: fallbackLabel || (event ? String(event).replace(/_/g, ' ') : '-'),
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-500',
    }
}

const AUDIT_STATUS_LABELS = {
    draft: 'Draft',
    pending_approval: 'Menunggu Approval',
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    cancelled: 'Dibatalkan',
    canceled: 'Dibatalkan',
    revision_requested: 'Perlu Revisi',
    issued: 'Diterbitkan ke Vendor',
    published: 'Dipublikasikan',
    active: 'Aktif',
    completed: 'Selesai',
    ready_for_payment: 'Siap Dibayar',
    paid: 'Telah Dibayar',
}

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONEY_FIELD_RE = /(?:price|amount|subtotal|total|cost|fee|discount)/i

const tryParseJsonValue = (value) => {
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
        || (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
        try {
            return JSON.parse(trimmed)
        } catch {
            return value
        }
    }
    return value
}

export const formatAuditValue = (value, field = '') => {
    if (value === null || value === undefined || value === '') return '-'

    const parsed = tryParseJsonValue(value)

    if (typeof parsed === 'boolean') return parsed ? 'Ya' : 'Tidak'

    if (Array.isArray(parsed)) {
        return parsed.length
            ? parsed.map((item) => formatAuditValue(item, field)).join(', ')
            : '-'
    }

    if (typeof parsed === 'object') {
        const entries = Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined && v !== '')
        if (!entries.length) return '-'
        return entries
            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${formatAuditValue(v, k)}`)
            .join('\n')
    }

    const str = String(parsed).trim()
    if (!str) return '-'

    if (ISO_DATETIME_RE.test(str)) {
        const d = new Date(str)
        if (!Number.isNaN(d.getTime())) {
            return d.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })
        }
    }

    if (ISO_DATE_RE.test(str)) {
        const [y, m, d] = str.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)
        if (!Number.isNaN(dateObj.getTime())) {
            return dateObj.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            })
        }
    }

    if (field.endsWith('status') || field === 'status') {
        const mapped = AUDIT_STATUS_LABELS[str.toLowerCase()]
        if (mapped) return mapped
    }

    if (/^-?\d+(\.\d+)?$/.test(str)) {
        const num = Number(str)
        if (Number.isFinite(num)) {
            if (MONEY_FIELD_RE.test(field)) {
                return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num)
            }
            if (str.includes('.')) {
                return Number(num.toFixed(4)).toLocaleString('id-ID')
            }
        }
    }

    return str
}

export const buildAuditQueryString = (params = {}) => {
    const query = new URLSearchParams()
    for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
            query.append(key, String(val).trim())
        }
    }
    const qs = query.toString()
    return qs ? `?${qs}` : ''
}

export const PURCHASING_ACTIVITY_ENDPOINTS = {
    purchase_requisition: (id) => `/api/v1/purchase-requisitions/${id}/activity`,
    purchase_order: (id) => `/api/v1/purchase-orders/${id}/activity`,
    direct_purchase: (id) => `/api/v1/direct-purchases/${id}/activity`,
    rfq: (id) => `/api/v1/rfqs/${id}/activity`,
    procurement_plan: (id) => `/api/v1/procurement-plans/${id}/activity`,
}

export const getDocumentActivityHistory = async (documentType, documentId, params = {}) => {
    const endpointBuilder = PURCHASING_ACTIVITY_ENDPOINTS[documentType]
    if (!endpointBuilder) {
        throw new Error(`Tipe dokumen audit tidak dikenal: ${documentType}`)
    }
    if (!documentId) {
        return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } }
    }
    const qs = buildAuditQueryString(params)
    const response = await api.get(`${endpointBuilder(documentId)}${qs}`)
    return response.data
}

export const getActivityLogs = async (params = {}) => {
    const qs = buildAuditQueryString(params)
    const response = await api.get(`/api/v1/admin/activity-logs${qs}`)
    return response.data
}

export const getActivityLogFilters = async () => {
    const response = await api.get('/api/v1/admin/activity-logs/filters')
    return response.data
}

export const getActivityLogById = async (id) => {
    const response = await api.get(`/api/v1/admin/activity-logs/${id}`)
    return response.data
}
