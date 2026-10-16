/**
 * APPROVAL ENUMS & DOMAIN CONSTANTS
 * Sesuai dengan App\Enums\Approval\* pada Laravel Backend
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

export const normalizeDecision = (decision) => {
    if (!decision) return decision
    const normalized = String(decision).toLowerCase().trim()
    if (normalized === 'revision') return ApprovalActionType.REQUEST_REVISION
    return normalized
}
