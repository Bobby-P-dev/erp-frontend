import api from './api.js'

/**
 * ============================================================================
 * APPROVAL ENUMS & DOMAIN CONSTANTS
 * Sesuai dengan App\Enums\Approval\* pada Laravel Backend
 * ============================================================================
 */
export const ApproverScope = Object.freeze({
    DEPARTMENT_HEAD: 'department_head',
    ROLE_ONLY: 'role_only',
    ROLE_AND_DIVISION: 'role_and_division',
    JOB_LEVEL_AND_DIVISION: 'job_level_and_division',
    SPECIFIC_USER: 'specific_user',
    POSITION_AND_DIVISION: 'position_and_division',
})

export const ApprovalMode = Object.freeze({
    ANY: 'any',
    ALL: 'all',
})

export const ApprovalRequestStatus = Object.freeze({
    PENDING: 'pending',
    REVISION: 'revision',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
})

export const ApprovalLevelStatus = Object.freeze({
    PENDING: 'pending',
    REVISION: 'revision',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SKIPPED: 'skipped',
})

export const ApprovalActionType = Object.freeze({
    APPROVE: 'approve',
    REJECT: 'reject',
    REQUEST_REVISION: 'request_revision',
    RESUBMIT: 'resubmit',
})

/**
 * Normalisasi decision: backend enum menggunakan 'request_revision' bukan 'revision'.
 */
const normalizeDecision = (decision) => {
    if (!decision) return decision
    const normalized = String(decision).toLowerCase().trim()
    if (normalized === 'revision') return ApprovalActionType.REQUEST_REVISION
    return normalized
}

const normalizeParams = (arg1, arg2, arg3) => {
    if (typeof arg1 === 'object' && arg1 !== null) {
        return arg1
    }
    const params = { ...(arg3 || {}) }
    if (arg1 !== undefined && arg1 !== null && arg1 !== '') params.search = arg1
    if (arg2 !== undefined && arg2 !== null && arg2 !== '') params.page = arg2
    return params
}

const buildQuery = (params = {}) => {
    const q = new URLSearchParams()
    for (const key in params) {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
            q.append(key, params[key])
        }
    }
    const str = q.toString()
    return str ? `?${str}` : ''
}

/**
 * ============================================================================
 * IN-MEMORY MOCK STORE
 * Digunakan sebagai fallback cerdas saat backend controller belum di-expose (HTTP 404).
 * Data selaras dengan database/seeders/ApprovalWorkflowSeeder.php
 * ============================================================================
 */
let mockConfigurations = [
    {
        id: 1,
        company_id: null,
        company: null,
        document_type: 'purchase_requisition',
        code: 'APPR-PR-LOW',
        name: 'PR Standard Operational Approval',
        min_amount: '0.00',
        max_amount: '50000000.00',
        is_active: true,
        description: 'Alur persetujuan PR operasional di bawah 50 juta rupiah',
        levels: [
            {
                id: 1,
                approval_configuration_id: 1,
                step_order: 1,
                step_name: 'Persetujuan Kepala Divisi',
                approver_scope: 'department_head',
                approval_mode: 'any',
                role_id: null,
                job_level_id: null,
                specific_user_id: null,
                can_be_skipped: false,
                sla_hours: 24,
                condition_type: 'always',
                condition_value: null,
            },
            {
                id: 2,
                approval_configuration_id: 1,
                step_order: 2,
                step_name: 'Verifikasi Finance & Accounting',
                approver_scope: 'role_only',
                approval_mode: 'any',
                role_id: 1,
                job_level_id: null,
                specific_user_id: null,
                can_be_skipped: false,
                sla_hours: 48,
                condition_type: 'always',
                condition_value: null,
            },
        ],
    },
    {
        id: 2,
        company_id: 1,
        company: { id: 1, name: 'PT Padma Soode Indonesia', code: 'PSI' },
        document_type: 'purchase_requisition',
        code: 'APPR-PR-HI',
        name: 'PR High-Value Investment Approval',
        min_amount: '50000000.00',
        max_amount: null,
        is_active: true,
        description: 'Alur persetujuan PR bernilai di atas 50 juta rupiah dengan otorisasi Direktur',
        levels: [
            {
                id: 3,
                approval_configuration_id: 2,
                step_order: 1,
                step_name: 'Persetujuan Kepala Divisi',
                approver_scope: 'department_head',
                approval_mode: 'any',
                role_id: null,
                job_level_id: null,
                specific_user_id: null,
                can_be_skipped: false,
                sla_hours: 24,
                condition_type: 'always',
                condition_value: null,
            },
            {
                id: 4,
                approval_configuration_id: 2,
                step_order: 2,
                step_name: 'Verifikasi Finance Manager',
                approver_scope: 'role_and_division',
                approval_mode: 'any',
                role_id: 2,
                job_level_id: null,
                specific_user_id: null,
                can_be_skipped: false,
                sla_hours: 48,
                condition_type: 'always',
                condition_value: null,
            },
            {
                id: 5,
                approval_configuration_id: 2,
                step_order: 3,
                step_name: 'Persetujuan Direktur Utama',
                approver_scope: 'specific_user',
                approval_mode: 'any',
                role_id: null,
                job_level_id: null,
                specific_user_id: 1,
                can_be_skipped: false,
                sla_hours: 72,
                condition_type: 'amount_gte',
                condition_value: '50000000',
            },
        ],
    },
    {
        id: 3,
        company_id: null,
        company: null,
        document_type: 'purchase_order',
        code: 'APPR-PO-UNIV',
        name: 'PO Universal Approval Matrix',
        min_amount: null,
        max_amount: null,
        is_active: true,
        description: 'Alur persetujuan PO universal untuk seluruh nominal pengadaan',
        levels: [
            {
                id: 6,
                approval_configuration_id: 3,
                step_order: 1,
                step_name: 'Review Purchasing Manager',
                approver_scope: 'role_only',
                approval_mode: 'any',
                role_id: 3,
                job_level_id: null,
                specific_user_id: null,
                can_be_skipped: false,
                sla_hours: 24,
                condition_type: 'always',
                condition_value: null,
            },
        ],
    },
]

let mockPendingRequests = [
    {
        id: 101,
        document_number: 'PR-2026-0001',
        document_title: 'Pengadaan Spare Part Mesin Bubut CNC Unit 04',
        document_type: 'purchase_requisition',
        approvable_type: 'App\\Models\\Purchasing\\PurchaseRequisition',
        approvable_id: 1,
        status: 'pending',
        current_step_order: 1,
        current_step_name: 'Persetujuan Kepala Divisi',
        total_steps: 2,
        total_amount: '15000000.00',
        submitted_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        sla_hours: 24,
        sla_hours_left: 20,
        is_overdue: false,
        requester: {
            id: 2,
            name: 'Andi Pratama',
            email: 'andi.it@padmasoode.co.id',
            division: 'Information Technology',
        },
        levels: [
            {
                id: 1,
                step_order: 1,
                step_name: 'Persetujuan Kepala Divisi',
                approver_scope: 'department_head',
                approval_mode: 'any',
                status: 'pending',
                can_be_skipped: false,
                required_approvers_count: 1,
                assignee_label: 'Head of IT',
            },
            {
                id: 2,
                step_order: 2,
                step_name: 'Verifikasi Finance & Accounting',
                approver_scope: 'role_only',
                approval_mode: 'any',
                status: 'pending',
                can_be_skipped: false,
                required_approvers_count: 1,
                assignee_label: 'Finance Staff',
            },
        ],
        actions: [
            {
                id: 1,
                action: 'resubmit',
                user_name: 'Andi Pratama',
                user_role: 'Requester',
                acted_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
                notes: 'Pengajuan dokumen Purchase Requisition untuk disetujui.',
            },
        ],
    },
    {
        id: 102,
        document_number: 'PR-2026-0005',
        document_title: 'Pembelian Material Alat Tulis Kantor & Kebutuhan Pantry Q3',
        document_type: 'purchase_requisition',
        approvable_type: 'App\\Models\\Purchasing\\PurchaseRequisition',
        approvable_id: 5,
        status: 'pending',
        current_step_order: 1,
        current_step_name: 'Persetujuan Kepala Divisi',
        total_steps: 2,
        total_amount: '3500000.00',
        submitted_at: new Date(Date.now() - 3600 * 1000 * 28).toISOString(),
        sla_hours: 24,
        sla_hours_left: -4,
        is_overdue: true,
        requester: {
            id: 3,
            name: 'Budi Santoso',
            email: 'budi.ga@padmasoode.co.id',
            division: 'General Affairs',
        },
        levels: [
            {
                id: 3,
                step_order: 1,
                step_name: 'Persetujuan Kepala Divisi',
                approver_scope: 'department_head',
                approval_mode: 'any',
                status: 'pending',
                can_be_skipped: false,
                required_approvers_count: 1,
                assignee_label: 'Head of GA',
            },
            {
                id: 4,
                step_order: 2,
                step_name: 'Verifikasi Finance',
                approver_scope: 'role_only',
                approval_mode: 'any',
                status: 'pending',
                can_be_skipped: false,
                required_approvers_count: 1,
                assignee_label: 'Finance Staff',
            },
        ],
        actions: [
            {
                id: 2,
                action: 'resubmit',
                user_name: 'Budi Santoso',
                user_role: 'Requester',
                acted_at: new Date(Date.now() - 3600 * 1000 * 28).toISOString(),
                notes: 'Pengajuan PR kebutuhan bulanan.',
            },
        ],
    },
]

let mockHistoryRequests = [
    {
        id: 99,
        document_number: 'PR-2026-0002',
        document_title: 'Sewa Server Cloud & Lisensi Software Desain CAD',
        document_type: 'purchase_requisition',
        status: 'approved',
        total_amount: '42000000.00',
        my_action: 'approve',
        my_action_label: 'Approved',
        acted_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
        notes: 'Disetujui sesuai rencana anggaran departemen.',
        requester: {
            id: 2,
            name: 'Andi Pratama',
            division: 'Information Technology',
        },
    },
]

/**
 * ============================================================================
 * 1. DOCUMENT TYPE METADATA (Backend endpoint sudah ada di routes/api.php)
 * ============================================================================
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
 * Dapatkan metadata pendukung workflow approval:
 * - document_types
 * - approver_scopes
 * - approval_modes
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
 * Dapatkan opsi data master pendukung untuk dropdown konfigurasi approval:
 * - companies
 * - roles
 * - positions
 * - divisions
 * - job_levels
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
 * ============================================================================
 * 2. APPROVAL CONFIGURATION CRUD
 * ============================================================================
 */
export const getApprovalConfigurations = async (arg1 = {}, arg2, arg3) => {
    const params = normalizeParams(arg1, arg2, arg3)
    try {
        const query = buildQuery(params)
        const response = await api.get(`/api/v1/approval-configurations${query}`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404) {
            console.warn('[ApprovalService] Route /api/v1/approval-configurations not found. Using fallback mock.')
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
        if (error?.response?.status === 404) {
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
        if (error?.response?.status === 404) {
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
        if (error?.response?.status === 404) {
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
        if (error?.response?.status === 404) {
            mockConfigurations = mockConfigurations.filter(c => c.id !== Number(id))
            return {
                message: 'Approval configuration deleted successfully (Mock Fallback)',
            }
        }
        throw error
    }
}

/**
 * ============================================================================
 * 3. APPROVAL INBOX (PENDING, HISTORY, COUNT)
 * ============================================================================
 */
export const getPendingApprovals = async (arg1 = {}, arg2, arg3) => {
    const params = normalizeParams(arg1, arg2, arg3)
    try {
        const query = buildQuery(params)
        const response = await api.get(`/api/v1/approvals/pending${query}`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404) {
            let list = [...mockPendingRequests]
            if (params.search) {
                const s = params.search.toLowerCase()
                list = list.filter(item =>
                    item.document_number.toLowerCase().includes(s) ||
                    item.document_title.toLowerCase().includes(s) ||
                    item.requester.name.toLowerCase().includes(s)
                )
            }
            if (params.document_type) {
                list = list.filter(item => item.document_type === params.document_type)
            }
            return {
                message: 'Pending approvals retrieved successfully (Mock Fallback)',
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

export const getApprovalHistory = async (arg1 = {}, arg2, arg3) => {
    const params = normalizeParams(arg1, arg2, arg3)
    try {
        const query = buildQuery(params)
        const response = await api.get(`/api/v1/approvals/history${query}`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404) {
            let list = [...mockHistoryRequests]
            if (params.search) {
                const s = params.search.toLowerCase()
                list = list.filter(item =>
                    item.document_number.toLowerCase().includes(s) ||
                    item.document_title.toLowerCase().includes(s)
                )
            }
            return {
                message: 'Approval history retrieved successfully (Mock Fallback)',
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

export const getPendingApprovalCount = async () => {
    try {
        const response = await api.get('/api/v1/approvals/count')
        return response.data
    } catch (error) {
        if (error?.response?.status === 404) {
            return {
                message: 'Count retrieved (Mock Fallback)',
                count: mockPendingRequests.length,
            }
        }
        return { count: 0 }
    }
}

/**
 * ============================================================================
 * 4. APPROVAL TRACKER (STEPPER & AUDIT TRAIL DATA)
 * ============================================================================
 */
export const getApprovalTracker = async (requestId) => {
    try {
        const response = await api.get(`/api/v1/approvals/requests/${requestId}/tracker`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404) {
            const found = mockPendingRequests.find(r => r.id === Number(requestId)) || mockPendingRequests[0]
            return {
                message: 'Approval tracker retrieved successfully (Mock Fallback)',
                data: {
                    request: found,
                    levels: found?.levels || [],
                    actions: found?.actions || [],
                    can_current_user_approve: true,
                    can_current_user_resubmit: false,
                },
            }
        }
        throw error
    }
}

export const getApprovalTrackerByDocument = async (documentType, documentId) => {
    try {
        const response = await api.get(`/api/v1/approvals/requests/by-document/${documentType}/${documentId}`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404) {
            const found = mockPendingRequests.find(r => r.approvable_id === Number(documentId)) || mockPendingRequests[0]
            return {
                message: 'Approval tracker by document retrieved (Mock Fallback)',
                data: {
                    request: found,
                    levels: found?.levels || [],
                    actions: found?.actions || [],
                    can_current_user_approve: true,
                    can_current_user_resubmit: false,
                },
            }
        }
        throw error
    }
}

/**
 * ============================================================================
 * 5. APPROVAL DECISIONS & MUTATIONS
 * ============================================================================
 */
export const processApprovalDecision = async (requestId, { decision, notes = '', expected_step_order = null }) => {
    const normalizedDecision = normalizeDecision(decision)
    const payload = {
        decision: normalizedDecision,
        notes,
        expected_step_order,
    }

    try {
        const response = await api.post(`/api/v1/approvals/requests/${requestId}/decision`, payload)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404) {
            // Update in mock store
            const targetIdx = mockPendingRequests.findIndex(r => r.id === Number(requestId))
            if (targetIdx !== -1) {
                const removed = mockPendingRequests.splice(targetIdx, 1)[0]
                mockHistoryRequests.unshift({
                    id: removed.id,
                    document_number: removed.document_number,
                    document_title: removed.document_title,
                    document_type: removed.document_type,
                    status: normalizedDecision === 'approve' ? 'approved' : (normalizedDecision === 'reject' ? 'rejected' : 'revision_requested'),
                    total_amount: removed.total_amount,
                    my_action: normalizedDecision,
                    my_action_label: normalizedDecision === 'approve' ? 'Approved' : (normalizedDecision === 'reject' ? 'Rejected' : 'Revision Requested'),
                    acted_at: new Date().toISOString(),
                    notes: notes || 'Processed via ERP Web',
                    requester: removed.requester,
                })
            }
            return {
                message: `Approval decision [${normalizedDecision}] processed successfully (Mock Fallback)`,
                data: { id: requestId, status: normalizedDecision },
            }
        }
        throw error
    }
}

export const approveDocument = (requestId, notes = '', expectedStepOrder = null) => {
    return processApprovalDecision(requestId, {
        decision: ApprovalActionType.APPROVE,
        notes,
        expected_step_order: expectedStepOrder,
    })
}

export const rejectDocument = (requestId, notes, expectedStepOrder = null) => {
    return processApprovalDecision(requestId, {
        decision: ApprovalActionType.REJECT,
        notes,
        expected_step_order: expectedStepOrder,
    })
}

export const requestRevisionDocument = (requestId, notes, expectedStepOrder = null) => {
    return processApprovalDecision(requestId, {
        decision: ApprovalActionType.REQUEST_REVISION,
        notes,
        expected_step_order: expectedStepOrder,
    })
}

export const resubmitDocument = async (requestId, payload = {}) => {
    try {
        const response = await api.post(`/api/v1/approvals/requests/${requestId}/resubmit`, payload)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404) {
            return {
                message: 'Document resubmitted successfully for approval (Mock Fallback)',
                data: { id: requestId, status: 'pending' },
            }
        }
        throw error
    }
}

export const resubmitApprovalRequest = resubmitDocument
