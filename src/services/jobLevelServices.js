import api from './api'

export const getJobLevels = async (search = '', page = 1) => {
    const response = await api.get(`/api/v1/job-level/get-all?search=${search}&page=${page}`)
    return response.data
}

export const searchJobLevels = async (search = '') => {
    const response = await api.get(`/api/v1/job-level/search?search=${search}`)
    return response.data
}

export const createJobLevel = async (data) => {
    const response = await api.post('/api/v1/job-level/store', data)
    return response.data
}

export const showJobLevel = async (id) => {
    const response = await api.get(`/api/v1/job-level/${id}/show`)
    return response.data
}

export const updateJobLevel = async (id, data) => {
    const response = await api.patch(`/api/v1/job-level/${id}/update`, data)
    return response.data
}

export const deleteJobLevel = async (id) => {
    const response = await api.delete(`/api/v1/job-level/${id}/delete`)
    return response.data
}
