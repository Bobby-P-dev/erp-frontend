/**
 * Centralized query parameter builder for ERP HTTP service layer.
 */
export const buildQueryParams = (search = '', page = 1, perPage = null, filter = {}) => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    if (perPage) params.append('per_page', perPage)

    if (filter && typeof filter === 'object') {
        for (const key in filter) {
            const val = filter[key]
            if (val !== null && val !== undefined && val !== '') {
                params.append(key, val)
            }
        }
    }

    const str = params.toString()
    return str ? `?${str}` : ''
}

export const normalizeParams = (arg1, arg2, arg3) => {
    if (typeof arg1 === 'object' && arg1 !== null) {
        return arg1
    }
    const params = { ...(arg3 || {}) }
    if (arg1 !== undefined && arg1 !== null && arg1 !== '') params.search = arg1
    if (arg2 !== undefined && arg2 !== null && arg2 !== '') params.page = arg2
    return params
}

export const buildQuery = (params = {}) => {
    const q = new URLSearchParams()
    for (const key in params) {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            q.append(key, params[key])
        }
    }
    const str = q.toString()
    return str ? `?${str}` : ''
}
