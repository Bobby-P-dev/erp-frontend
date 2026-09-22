import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { erpModules, getActiveModules } from '../src/config/modules.js';
import { purchasingMenuItems, getAuthorizedPurchasingMenuItems } from '../src/config/purchasingMenu.js';

describe('1. ERP Module Registry (src/config/modules.js)', () => {
    it('contains purchasing and approvals as the currently active modules', () => {
        const activeModules = erpModules.filter(m => m.active);
        assert.equal(activeModules.length, 2);
        
        const purchasing = activeModules.find(m => m.id === 'purchasing');
        assert.ok(purchasing);
        assert.equal(purchasing.routeName, 'user.purchasing');
        assert.equal(purchasing.status, 'active');

        const approvals = activeModules.find(m => m.id === 'approvals');
        assert.ok(approvals);
        assert.equal(approvals.routeName, 'user.approvals.inbox');
        assert.equal(approvals.status, 'active');
    });

    it('defines extensible future modules with coming_soon / inactive status', () => {
        const inactiveModules = erpModules.filter(m => !m.active);
        assert.ok(inactiveModules.length >= 3);
        const moduleIds = inactiveModules.map(m => m.id);
        assert.ok(moduleIds.includes('inventory'));
        assert.ok(moduleIds.includes('finance'));
        assert.ok(moduleIds.includes('hr'));
        
        for (const mod of inactiveModules) {
            assert.equal(mod.status, 'coming_soon');
            assert.equal(mod.active, false);
        }
    });

    it('filters active modules correctly based on authStore permissions', () => {
        // Mock authStore with no special permissions
        const standardAuthStore = {
            hasPermission: () => false
        };
        const standardModules = getActiveModules(standardAuthStore);
        assert.equal(standardModules.length, 2);
        const standardIds = standardModules.map(m => m.id);
        assert.ok(standardIds.includes('purchasing'));
        assert.ok(standardIds.includes('approvals'));

        // Without authStore passed
        const defaultModules = getActiveModules(null);
        assert.equal(defaultModules.length, 2);
        const defaultIds = defaultModules.map(m => m.id);
        assert.ok(defaultIds.includes('purchasing'));
        assert.ok(defaultIds.includes('approvals'));
    });
});

describe('2. Purchasing Menu Registry (src/config/purchasingMenu.js)', () => {
    it('contains exactly 5 procurement lifecycle stages in sequence', () => {
        assert.equal(purchasingMenuItems.length, 5);
        
        assert.equal(purchasingMenuItems[0].id, 'pr');
        assert.equal(purchasingMenuItems[0].title, 'Purchase Requisition');
        assert.equal(purchasingMenuItems[0].status, 'active');
        assert.equal(purchasingMenuItems[0].permission, null);

        assert.equal(purchasingMenuItems[1].id, 'procurement-queue');
        assert.equal(purchasingMenuItems[1].title, 'Procurement Queue');
        assert.equal(purchasingMenuItems[1].permission, 'procurement.read');

        assert.equal(purchasingMenuItems[2].id, 'procurement-plans');
        assert.equal(purchasingMenuItems[2].title, 'Procurement Plans');
        assert.equal(purchasingMenuItems[2].permission, 'procurement-plan.read');

        assert.equal(purchasingMenuItems[3].id, 'direct-purchases');
        assert.equal(purchasingMenuItems[3].title, 'Direct Purchases');
        assert.equal(purchasingMenuItems[3].permission, 'direct-purchase.read');

        assert.equal(purchasingMenuItems[4].id, 'rfq');
        assert.equal(purchasingMenuItems[4].title, 'RFQ (Request for Quotation)');
        assert.equal(purchasingMenuItems[4].status, 'coming_soon');
        assert.equal(purchasingMenuItems[4].routeName, null);
    });

    it('correctly calculates authorization and restricted state for users', () => {
        // User with no purchasing-specific permissions (standard employee)
        const employeeAuthStore = {
            hasPermission: (perm) => false
        };

        const employeeItems = getAuthorizedPurchasingMenuItems(employeeAuthStore);
        assert.equal(employeeItems.length, 5);

        // PR is open to all employees
        const prItem = employeeItems.find(i => i.id === 'pr');
        assert.equal(prItem.isAuthorized, true);
        assert.equal(prItem.restricted, false);

        // Procurement Queue is restricted
        const queueItem = employeeItems.find(i => i.id === 'procurement-queue');
        assert.equal(queueItem.isAuthorized, false);
        assert.equal(queueItem.restricted, true);

        // Procurement Plans is restricted
        const planItem = employeeItems.find(i => i.id === 'procurement-plans');
        assert.equal(planItem.isAuthorized, false);
        assert.equal(planItem.restricted, true);

        // Direct Purchases is restricted
        const directItem = employeeItems.find(i => i.id === 'direct-purchases');
        assert.equal(directItem.isAuthorized, false);
        assert.equal(directItem.restricted, true);

        // RFQ remains coming_soon
        const rfqItem = employeeItems.find(i => i.id === 'rfq');
        assert.equal(rfqItem.status, 'coming_soon');
    });

    it('unlocks operations for authorized purchasing officer', () => {
        // Purchasing officer with full procurement permissions
        const purchasingOfficer = {
            hasPermission: (perm) => ['procurement.read', 'procurement-plan.read', 'direct-purchase.read'].includes(perm)
        };

        const officerItems = getAuthorizedPurchasingMenuItems(purchasingOfficer);
        for (const item of officerItems) {
            if (item.id !== 'rfq') {
                assert.equal(item.isAuthorized, true, `Item ${item.id} should be authorized`);
                assert.equal(item.restricted, false, `Item ${item.id} should not be restricted`);
            }
        }
    });
});

describe('3. Route Contract Verification', () => {
    it('verifies route names match between config and router expectation', () => {
        const expectedRoutes = [
            'user.purchasing.requisitions',
            'user.purchasing.queue',
            'user.purchasing.plans',
            'user.purchasing.direct'
        ];

        const configuredRoutes = purchasingMenuItems
            .filter(item => item.routeName)
            .map(item => item.routeName);

        assert.deepEqual(configuredRoutes, expectedRoutes);
    });
});
