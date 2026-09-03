import api from './api'

export const getPermissionCategories = async (search = '', page = 1) => {
    const response = await api.get(`/api/v1/permission-category/get-all?search=${search}&page=${page}`)
    return response.data
}

export const searchPermissionCategories = async (search = '') => {
    const response = await api.get(`/api/v1/permission-category/search?search=${search}`)
    return response.data
}

export const createPermissionCategory = async (data) => {
    const response = await api.post('/api/v1/permission-category/store', data)
    return response.data
}

export const showPermissionCategory = async (id) => {
    const response = await api.get(`/api/v1/permission-category/${id}/show`)
    return response.data
}

export const updatePermissionCategory = async (id, data) => {
    const response = await api.patch(`/api/v1/permission-category/${id}/update`, data)
    return response.data
}

export const deletePermissionCategory = async (id) => {
    const response = await api.delete(`/api/v1/permission-category/${id}/delete`)
    return response.data
}
