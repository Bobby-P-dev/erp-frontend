import api from './api'

export const getRoles = async (search = '', page = 1) => {
    const response = await api.get(`/api/v1/role/get-all?search=${search}&page=${page}`)
    return response.data
}

export const searchRoles = async (search = '') => {
    const response = await api.get(`/api/v1/role/search?search=${search}`)
    return response.data
}

export const createRole = async (data) => {
    const response = await api.post('/api/v1/role/store', data)
    return response.data
}

export const showRole = async (id) => {
    const response = await api.get(`/api/v1/role/${id}/show`)
    return response.data
}

export const updateRole = async (id, data) => {
    const response = await api.patch(`/api/v1/role/${id}/update`, data)
    return response.data
}

export const deleteRole = async (id) => {
    const response = await api.delete(`/api/v1/role/${id}/delete`)
    return response.data
}

export const syncRolePermissions = async (id, permissions) => {
    const response = await api.post(`/api/v1/role/${id}/sync-permissions`, { permissions })
    return response.data
}
