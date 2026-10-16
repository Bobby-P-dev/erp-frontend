import api from '../api.js'
import { buildQuery, normalizeParams } from '../core/httpQuery.js'
import { ApprovalActionType, normalizeDecision } from './approvalConstants.js'
import { mockPendingRequests, mockHistoryRequests } from './approvalMocks.js'

/**
 * 3. APPROVAL INBOX (PENDING, HISTORY, COUNT)
 */
export const getPendingApprovals = async (arg1 = {}, arg2, arg3) => {
    const params = normalizeParams(arg1, arg2, arg3)
    try {
        const query = buildQuery(params)
        const response = await api.get(`/api/v1/approvals/pending${query}`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 401) {
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
        if (error?.response?.status === 404 || error?.response?.status === 401) {
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

export const getPendingApprovalCount = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams()
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value)
            }
        }
        const qs = queryParams.toString() ? `?${queryParams.toString()}` : ''
        const response = await api.get(`/api/v1/approvals/count${qs}`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 401) {
            return {
                message: 'Count retrieved (Mock Fallback)',
                count: mockPendingRequests.length,
            }
        }
        return { count: 0 }
    }
}

/**
 * 4. APPROVAL TRACKER (STEPPER & AUDIT TRAIL DATA)
 */
export const getApprovalTracker = async (requestId) => {
    try {
        const response = await api.get(`/api/v1/approvals/requests/${requestId}/tracker`)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 401) {
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
        if (error?.response?.status === 404 || error?.response?.status === 401) {
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

export const getApprovalLifecycle = async (requestId) => {
    try {
        const response = await api.get(`/api/v1/approvals/requests/${requestId}/lifecycle`)
        return response.data
    } catch (error) {
        console.warn('Failed to load approval request lifecycle:', error)
        return null
    }
}

/**
 * 5. APPROVAL DECISIONS & MUTATIONS
 */
export const processApprovalDecision = async (requestId, { decision, notes = '', expected_step_order = null, item_decisions = [] }) => {
    const normalizedDecision = normalizeDecision(decision)
    const payload = {
        decision: normalizedDecision,
        notes,
        expected_step_order,
    }

    if (Array.isArray(item_decisions) && item_decisions.length > 0) {
        payload.item_decisions = item_decisions
    }

    try {
        const response = await api.post(`/api/v1/approvals/requests/${requestId}/decision`, payload)
        return response.data
    } catch (error) {
        if (error?.response?.status === 404 || error?.response?.status === 401) {
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

export const approveDocument = (requestId, notes = '', expectedStepOrder = null, itemDecisions = []) => {
    return processApprovalDecision(requestId, {
        decision: ApprovalActionType.APPROVE,
        notes,
        expected_step_order: expectedStepOrder,
        item_decisions: itemDecisions,
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
        if (error?.response?.status === 404 || error?.response?.status === 401) {
            return {
                message: 'Document resubmitted successfully for approval (Mock Fallback)',
                data: { id: requestId, status: 'pending' },
            }
        }
        throw error
    }
}

export const resubmitApprovalRequest = resubmitDocument
