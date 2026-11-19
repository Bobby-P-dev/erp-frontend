import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    PURCHASING_ACTIVITY_ENDPOINTS,
    buildAuditQueryString,
    formatAuditValue,
    getActivityLogById,
    getActivityLogFilters,
    getActivityLogs,
    getAuditEventBadge,
    getDocumentActivityHistory,
} from '../src/services/auditLogServices.js'

describe('Admin Audit Trail Service & Helpers', () => {
    it('exports all required activity log and purchasing scoped service functions', async () => {
        assert.equal(typeof getActivityLogs, 'function')
        assert.equal(typeof getActivityLogFilters, 'function')
        assert.equal(typeof getActivityLogById, 'function')
        assert.equal(typeof getDocumentActivityHistory, 'function')
        assert.equal(PURCHASING_ACTIVITY_ENDPOINTS.purchase_requisition(12), '/api/v1/purchase-requisitions/12/activity')
        assert.equal(PURCHASING_ACTIVITY_ENDPOINTS.purchase_order(7), '/api/v1/purchase-orders/7/activity')
        assert.equal(PURCHASING_ACTIVITY_ENDPOINTS.direct_purchase(9), '/api/v1/direct-purchases/9/activity')
        assert.equal(PURCHASING_ACTIVITY_ENDPOINTS.rfq(4), '/api/v1/rfqs/4/activity')
        assert.equal(PURCHASING_ACTIVITY_ENDPOINTS.procurement_plan(3), '/api/v1/procurement-plans/3/activity')

        await assert.rejects(
            () => getDocumentActivityHistory('unknown_type', 1),
            /tidak dikenal/
        )
    })

    it('builds query strings cleanly while skipping blank filters', () => {
        const qs = buildAuditQueryString({
            page: 2,
            search: ' PR-2026-0001 ',
            log_name: 'purchasing',
            event: '',
            causer_id: null,
        })
        assert.equal(qs, '?page=2&search=PR-2026-0001&log_name=purchasing')
        assert.equal(buildAuditQueryString({}), '')
    })

    it('resolves Indonesian event badges consistently', () => {
        const created = getAuditEventBadge('created')
        const deleted = getAuditEventBadge('deleted')
        const synced = getAuditEventBadge('permissions_synced')
        const rolesSynced = getAuditEventBadge('roles_synced')
        const custom = getAuditEventBadge('custom_action', 'Aksi Khusus')

        assert.equal(created.label, 'Dibuat')
        assert.match(created.badgeClass, /emerald/)
        assert.equal(deleted.label, 'Dihapus')
        assert.match(deleted.badgeClass, /rose/)
        assert.equal(synced.label, 'Izin Role Diperbarui')
        assert.equal(rolesSynced.label, 'Role User Diperbarui')
        assert.equal(custom.label, 'Aksi Khusus')
    })

    it('formats primitive, empty, array, object, status, and date audit values readably', () => {
        assert.equal(formatAuditValue(null), '-')
        assert.equal(formatAuditValue(''), '-')
        assert.equal(formatAuditValue(true), 'Ya')
        assert.equal(formatAuditValue(false), 'Tidak')
        assert.equal(formatAuditValue(['audit-log.read', 'pr.read']), 'audit-log.read, pr.read')
        assert.equal(formatAuditValue({ reference: 'INV-01', payment_terms: 'COD' }), 'reference: INV-01\npayment terms: COD')
        assert.equal(formatAuditValue('cancelled', 'status'), 'Dibatalkan')
        assert.equal(formatAuditValue('1500000.00', 'estimated_price'), '1.500.000')
        assert.match(formatAuditValue('2026-11-18T02:01:01.000000Z', 'signed_at'), /Nov 2026/)
    })
})
