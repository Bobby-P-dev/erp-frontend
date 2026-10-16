import api from '../api.js'
import { buildQuery, normalizeParams } from '../core/httpQuery.js'
import { mockConfigurations } from './approvalMocks.js'

/**
 * 1. DOCUMENT TYPE METADATA
 */
export const getApprovalDocumentTypes = async (grouped = true) => {
    try {
        const response = await api.get(`/api/v1/approval-configurations/document-types?grouped=${Boolean(grouped)}`)
        return response.data
    } catch (error) {
        console.warn('[ApprovalService] Backend document-types failed, using fallback options.')
        return {
            message: 'Approval document types retrieved successfully (Fallback)',
            data: [
                {
                    module: 'Purchasing',
                    items: [
                        { value: 'purchase_requisition', label: 'Purchase Requisition', module: 'Purchasing', has_amount: true },
                        { value: 'purchase_order', label: 'Purchase Order', module: 'Purchasing', has_amount: true },
                    ],
                },
            ],
        }
    }
}

export const getDocumentTypes = getApprovalDocumentTypes

/**
 * Metadata pendukung workflow approval
 */
export const getApprovalWorkflowMetadata = async (grouped = false) => {
    try {
        const response = await api.get(`/api/v1/approval-configurations/workflow-metadata?grouped=${Boolean(grouped)}`)
        return response.data
    } catch (error) {
        console.warn('[ApprovalService] Backend workflow-metadata failed, using fallback options.')
        return {
            message: 'Approval workflow metadata retrieved successfully (Fallback)',
            data: {
                document_types: [
                    { value: 'purchase_requisition', label: 'Purchase Requisition (Pengajuan Pembelian)', module: 'Purchasing', has_amount: true },
                    { value: 'purchase_order', label: 'Purchase Order (Pesanan Pembelian)', module: 'Purchasing', has_amount: true },
                ],
                approver_scopes: [
                    { value: 'role_only', label: 'Role Saja' },
                    { value: 'role_and_division', label: 'Role & Divisi' },
                    { value: 'job_level_and_division', label: 'Level Jabatan & Divisi' },
                    { value: 'department_head', label: 'Kepala Departemen / Divisi' },
                    { value: 'specific_user', label: 'User Tertentu (Spesifik)' },
                    { value: 'position_and_division', label: 'Posisi Jabatan & Divisi' },
                ],
                approval_modes: [
                    { value: 'any', label: 'Salah Satu Menyetujui (Any)' },
                    { value: 'all', label: 'Semua Wajib Menyetujui (All)' },
                ],
            },
        }
    }
}

export const getWorkflowMetadata = getApprovalWorkflowMetadata

/**
 * Opsi data master pendukung untuk dropdown konfigurasi approval
 */
export const getApprovalOptions = async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.company_id) params.append('company_id', filters.company_id)
    if (filters.division_id) params.append('division_id', filters.division_id)
    const queryString = params.toString() ? `?${params.toString()}` : ''

    try {
        const response = await api.get(`/api/v1/approval-configurations/options${queryString}`)
        return response.data
    } catch (error) {
        console.warn('[ApprovalService] Backend approval options failed, using fallback options.')
        return {
            message: 'Approval options retrieved successfully (Fallback)',
            data: {
                companies: [
                    { id: 1, value: 1, label: 'PT Padma Soode Indonesia', name: 'PT Padma Soode Indonesia', code: 'PSI' }
                ],
                roles: [
                    { id: 1, value: 1, label: 'Super Admin', name: 'Super Admin' },
                    { id: 2, value: 2, label: 'Finance Manager', name: 'Finance Manager' }
                ],
                positions: [
                    { id: 1, value: 1, label: 'PPIC Head', name: 'PPIC Head', code: 'POS-PPIC', division_ids: [1] },
                    { id: 2, value: 2, label: 'Purchasing Officer', name: 'Purchasing Officer', code: 'POS-PURCH', division_ids: [2] }
                ],
                divisions: [
                    { id: 1, value: 1, label: 'PPIC', name: 'PPIC', code: 'PPIC', company_id: 1 },
                    { id: 2, value: 2, label: 'Purchasing', name: 'Purchasing', code: 'PURCH', company_id: 1 }
                ],
                job_levels: [
                    { id: 1, value: 1, label: 'Kepala Bagian (KABAG)', name: 'Kepala Bagian', code: 'KABAG' },
                    { id: 2, value: 2, label: 'Manager', name: 'Manager', code: 'MGR' }
                ],
            },
        }
    }
}

/**
 * 2. APPROVAL CONFIGURATION CRUD
 */
export const getApprovalConfigurations = async (arg1 = {}, arg2, arg3) => {
    const params = normalizeParams(arg1, arg2, arg3)
    try {
        const query = buildQuery(params)
        const response = await api.get(`/api/v1/approval-configurations${query}`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 401) {
            console.warn('[ApprovalService] Route /api/v1/approval-configurations unavailable or unauthorized. Using fallback mock.')
            let list = [...mockConfigurations]
            if (params.search) {
                const s = params.search.toLowerCase()
                list = list.filter(item => item.name.toLowerCase().includes(s) || item.code.toLowerCase().includes(s))
            }
            if (params.document_type) {
                list = list.filter(item => item.document_type === params.document_type)
            }
            if (params.is_active !== undefined && params.is_active !== '') {
                const active = params.is_active === '1' || params.is_active === true || params.is_active === 'true'
                list = list.filter(item => item.is_active === active)
            }
            return {
                message: 'Approval configurations retrieved successfully (Mock Fallback)',
                data: list,
                meta: {
                    current_page: 1,
                    last_page: 1,
                    from: 1,
                    to: list.length,
                    total: list.length,
                    per_page: 15,
                },
            }
        }
        throw error
    }
}

export const showApprovalConfiguration = async (id) => {
    try {
        const response = await api.get(`/api/v1/approval-configurations/${id}`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 401) {
            const found = mockConfigurations.find(c => c.id === Number(id))
            if (found) {
                return {
                    message: 'Approval configuration retrieved successfully (Mock Fallback)',
                    data: JSON.parse(JSON.stringify(found)),
                }
            }
        }
        throw error
    }
}

export const createApprovalConfiguration = async (data) => {
    try {
        const response = await api.post('/api/v1/approval-configurations', data)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 401) {
            const newConfig = {
                id: Date.now(),
                ...data,
                company: data.company_id ? { id: data.company_id, name: 'Company #' + data.company_id } : null,
                levels: (data.levels || []).map((lvl, idx) => ({
                    id: Date.now() + idx,
                    approval_configuration_id: Date.now(),
                    ...lvl,
                })),
            }
            mockConfigurations.unshift(newConfig)
            return {
                message: 'Approval configuration created successfully (Mock Fallback)',
                data: newConfig,
            }
        }
        throw error
    }
}

export const updateApprovalConfiguration = async (id, data) => {
    try {
        const response = await api.patch(`/api/v1/approval-configurations/${id}`, data)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 401) {
            const idx = mockConfigurations.findIndex(c => c.id === Number(id))
            if (idx !== -1) {
                mockConfigurations[idx] = {
                    ...mockConfigurations[idx],
                    ...data,
                    levels: (data.levels || []).map((lvl, i) => ({
                        id: lvl.id || (Date.now() + i),
                        approval_configuration_id: Number(id),
                        ...lvl,
                    })),
                }
                return {
                    message: 'Approval configuration updated successfully (Mock Fallback)',
                    data: mockConfigurations[idx],
                }
            }
        }
        throw error
    }
}

export const deleteApprovalConfiguration = async (id) => {
    try {
        const response = await api.delete(`/api/v1/approval-configurations/${id}`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 401) {
            const idx = mockConfigurations.findIndex(c => c.id === Number(id))
            if (idx !== -1) {
                mockConfigurations.splice(idx, 1)
            }
            return {
                message: 'Approval configuration deleted successfully (Mock Fallback)',
            }
        }
        throw error
    }
}
