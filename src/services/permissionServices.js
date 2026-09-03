import api from './api'

export const getPermissions = async (search = '', page = 1, perPage = 10) => {
    const response = await api.get(`/api/v1/permission/get-all?search=${search}&page=${page}&per_page=${perPage}`)
    return response.data
}

export const searchPermissions = async (search = '') => {
    const response = await api.get(`/api/v1/permission/search?search=${search}`)
    return response.data
}

export const createPermission = async (data) => {
    const response = await api.post('/api/v1/permission/store', data)
    return response.data
}

export const showPermission = async (id) => {
    const response = await api.get(`/api/v1/permission/${id}/show`)
    return response.data
}

export const updatePermission = async (id, data) => {
    const response = await api.patch(`/api/v1/permission/${id}/update`, data)
    return response.data
}

export const deletePermission = async (id) => {
    const response = await api.delete(`/api/v1/permission/${id}/delete`)
    return response.data
}
