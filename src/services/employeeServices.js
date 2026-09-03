import api from './api'

export const getEmployees = async (search = '', page = 1, filter = {}) => {
    // Build query params
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (page) params.append('page', page)
    
    // Append filters
    for (const key in filter) {
        if (filter[key] !== null && filter[key] !== '') {
            params.append(`filter[${key}]`, filter[key])
        }
    }

    const response = await api.get(`/api/v1/employee/get-all?${params.toString()}`)
    return response.data
}

export const createEmployee = async (data) => {
    const response = await api.post('/api/v1/employee/store', data)
    return response.data
}

export const showEmployee = async (id) => {
    const response = await api.get(`/api/v1/employee/${id}/show`)
    return response.data
}

export const getEmployeeProfile = async () => {
    const response = await api.get('/api/v1/employee/profile')
    return response.data
}

export const updateEmployee = async (id, data) => {
    const response = await api.patch(`/api/v1/employee/${id}/update`, data)
    return response.data
}

export const deleteEmployee = async (id) => {
    const response = await api.delete(`/api/v1/employee/${id}/delete`)
    return response.data
}

export const getEmployeeDivisions = async (companyId, search = '') => {
    const response = await api.get(`/api/v1/employee/division?company_id=${companyId}&search=${search}`)
    return response.data
}

export const getEmployeePositions = async (divisionId, search = '') => {
    const response = await api.get(`/api/v1/employee/position/${divisionId}?search=${search}`)
    return response.data
}

export const searchEmployees = async (search = '') => {
    const response = await api.get(`/api/v1/employee/search?search=${search}`)
    return response.data
}
