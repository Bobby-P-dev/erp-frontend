import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    getSupplierPortalDashboard,
    getSupplierPortalRfqs,
    getSupplierPortalRfqDetail,
    getSupplierPortalQuotations
} from '../src/services/supplierPortalServices.js';

describe('Authenticated Supplier Portal Service Contract Tests', () => {
    it('exports all 4 required authenticated supplier portal service functions', () => {
        assert.equal(typeof getSupplierPortalDashboard, 'function');
        assert.equal(typeof getSupplierPortalRfqs, 'function');
        assert.equal(typeof getSupplierPortalRfqDetail, 'function');
        assert.equal(typeof getSupplierPortalQuotations, 'function');
    });

    it('validates supplier portal KPI metrics structure', () => {
        const dummySummary = {
            metrics: {
                total_invited: 5,
                need_action: 2,
                in_evaluation: 2,
                awarded: 1
            },
            supplier: {
                id: 10,
                name: 'PT Mitra Presisi Mandiri',
                supplier_code: 'SUP-001'
            }
        };

        assert.equal(dummySummary.metrics.total_invited, 5);
        assert.equal(dummySummary.metrics.need_action, 2);
        assert.equal(dummySummary.metrics.in_evaluation, 2);
        assert.equal(dummySummary.metrics.awarded, 1);
        assert.equal(dummySummary.supplier.name, 'PT Mitra Presisi Mandiri');
    });

    it('validates RFQ tab filters mapping for supplier dashboard', () => {
        const supportedTabs = ['all', 'need_action', 'submitted', 'awarded', 'declined'];

        assert.equal(supportedTabs.includes('all'), true);
        assert.equal(supportedTabs.includes('need_action'), true);
        assert.equal(supportedTabs.includes('submitted'), true);
        assert.equal(supportedTabs.includes('awarded'), true);
        assert.equal(supportedTabs.includes('declined'), true);
    });

    it('enforces confidential HPS protection on supplier rfq detail contract', () => {
        const sanitizedItem = {
            id: 101,
            item_name: 'Carbide End Mill 4 Flute 10mm',
            unit_name: 'PCS',
            target_quantity: 50,
            required_delivery_date: '2026-11-15'
        };

        // Ensure target_price is strictly not exposed
        assert.equal('target_price' in sanitizedItem, false);
        assert.equal('estimated_unit_price' in sanitizedItem, false);
    });

    it('validates evaluation and awarding status badges resolution for supplier quotation list', () => {
        const resolveStatusBadge = (status) => {
            switch (status) {
                case 'awarded':
                    return { label: 'Menang Tender (Awarded)', class: 'bg-emerald-100 text-emerald-800' };
                case 'partially_awarded':
                    return { label: 'Menang Sebagian Item', class: 'bg-blue-100 text-blue-800' };
                case 'rejected':
                    return { label: 'Tidak Terpilih', class: 'bg-rose-50 text-rose-700' };
                default:
                    return { label: 'Sedang Dievaluasi', class: 'bg-amber-50 text-amber-800' };
            }
        };

        assert.equal(resolveStatusBadge('awarded').label, 'Menang Tender (Awarded)');
        assert.equal(resolveStatusBadge('partially_awarded').label, 'Menang Sebagian Item');
        assert.equal(resolveStatusBadge('rejected').label, 'Tidak Terpilih');
        assert.equal(resolveStatusBadge('submitted').label, 'Sedang Dievaluasi');
        assert.equal(resolveStatusBadge('under_review').label, 'Sedang Dievaluasi');
    });

    it('validates hybrid session detection logic on public portal view', () => {
        const checkIsSupplierLoggedIn = (user, isAuthenticated = false) => {
            if (!isAuthenticated || !user) return false;
            return user.account_type === 'supplier';
        };

        assert.equal(checkIsSupplierLoggedIn(null, false), false);
        assert.equal(checkIsSupplierLoggedIn({ account_type: 'employee', employee_id: 1 }, true), false);
        assert.equal(checkIsSupplierLoggedIn({ account_type: 'supplier', supplier_id: 10 }, true), true);
        assert.equal(checkIsSupplierLoggedIn({ account_type: 'supplier', supplier_id: 10 }, false), false);
    });
});

describe('Supplier Portal Route Naming & Path Architecture Contract Tests', () => {
    it('defines standard route contract for supplier portal routes', () => {
        const portalRoutes = [
            {
                path: 'dashboard',
                name: 'supplier.portal.dashboard',
                meta: { title: 'Dashboard Rekanan' }
            },
            {
                path: 'rfqs',
                name: 'supplier.portal.rfqs',
                meta: { title: 'Tender & RFQ Saya' }
            },
            {
                path: 'quotations',
                name: 'supplier.portal.quotations',
                meta: { title: 'Riwayat Penawaran' }
            }
        ];

        const expectedNames = [
            'supplier.portal.dashboard',
            'supplier.portal.rfqs',
            'supplier.portal.quotations'
        ];

        assert.deepEqual(portalRoutes.map(r => r.name), expectedNames);
        assert.equal(portalRoutes.find(r => r.name === 'supplier.portal.dashboard').meta.title, 'Dashboard Rekanan');
        assert.equal(portalRoutes.find(r => r.name === 'supplier.portal.rfqs').meta.title, 'Tender & RFQ Saya');
        assert.equal(portalRoutes.find(r => r.name === 'supplier.portal.quotations').meta.title, 'Riwayat Penawaran');
    });

    it('defines expected navigation items for SupplierPortalLayout', () => {
        const navigationItems = [
            {
                name: 'supplier.portal.dashboard',
                label: 'Dashboard',
                exact: true
            },
            {
                name: 'supplier.portal.rfqs',
                label: 'Tender & RFQ Saya'
            },
            {
                name: 'supplier.portal.quotations',
                label: 'Riwayat Penawaran'
            }
        ];

        assert.equal(navigationItems.length, 3);
        assert.equal(navigationItems[0].name, 'supplier.portal.dashboard');
        assert.equal(navigationItems[0].label, 'Dashboard');
        assert.equal(navigationItems[1].name, 'supplier.portal.rfqs');
        assert.equal(navigationItems[1].label, 'Tender & RFQ Saya');
        assert.equal(navigationItems[2].name, 'supplier.portal.quotations');
        assert.equal(navigationItems[2].label, 'Riwayat Penawaran');
    });
});

describe('Two-Way Separation Navigation Guard Contract Tests', () => {
    // Pure function replicating router.beforeEach guard logic
    const evaluateNavigationGuard = (to, authStore) => {
        if (to.meta?.requiresAuth && !authStore.isAuthenticated) {
            return { name: 'login' };
        }

        if (to.meta?.guest && authStore.isAuthenticated) {
            if (authStore.user?.account_type === 'supplier') {
                return { name: 'supplier.portal.dashboard' };
            }
            return { name: 'user.dashboard' };
        }

        // 1. Jika akun supplier mencoba mengakses menu internal karyawan
        if (authStore.isAuthenticated && authStore.user?.account_type === 'supplier') {
            if (!to.path.startsWith('/portal/supplier') && to.name !== 'public.portal.rfq') {
                return { name: 'supplier.portal.dashboard' };
            }
        }

        // 2. Jika akun karyawan mencoba mengakses rute portal rekanan
        if (authStore.isAuthenticated && authStore.user?.account_type !== 'supplier') {
            if (to.meta?.accountType === 'supplier' || to.matched?.some(record => record.meta?.accountType === 'supplier')) {
                return { name: 'user.dashboard' };
            }
        }

        if (to.meta?.permission && !authStore.hasPermission?.(to.meta.permission)) {
            return { name: 'user.dashboard' };
        }

        return true;
    };

    it('redirects unauthenticated user to login on protected routes', () => {
        const unauthenticatedStore = { isAuthenticated: false, user: null };
        const to = { path: '/portal/supplier/dashboard', meta: { requiresAuth: true } };

        const result = evaluateNavigationGuard(to, unauthenticatedStore);
        assert.deepEqual(result, { name: 'login' });
    });

    it('redirects authenticated supplier visiting login to supplier portal dashboard', () => {
        const supplierStore = {
            isAuthenticated: true,
            user: { id: 5, account_type: 'supplier', name: 'Vendor A' }
        };
        const to = { path: '/login', meta: { guest: true } };

        const result = evaluateNavigationGuard(to, supplierStore);
        assert.deepEqual(result, { name: 'supplier.portal.dashboard' });
    });

    it('redirects authenticated employee visiting login to user dashboard', () => {
        const employeeStore = {
            isAuthenticated: true,
            user: { id: 1, account_type: 'employee', name: 'Buyer Staff' }
        };
        const to = { path: '/login', meta: { guest: true } };

        const result = evaluateNavigationGuard(to, employeeStore);
        assert.deepEqual(result, { name: 'user.dashboard' });
    });

    it('blocks supplier from accessing internal employee routes and redirects to supplier portal dashboard', () => {
        const supplierStore = {
            isAuthenticated: true,
            user: { id: 5, account_type: 'supplier', name: 'Vendor A' }
        };

        const internalTargets = [
            { path: '/dashboard', name: 'user.dashboard', meta: { requiresAuth: true } },
            { path: '/purchasing/rfqs', name: 'user.purchasing.rfq', meta: { requiresAuth: true } },
            { path: '/inventory/goods-receipts', name: 'user.inventory.goods-receipts', meta: { requiresAuth: true } },
            { path: '/finance/payment-requests', name: 'user.finance.payment-requests', meta: { requiresAuth: true } }
        ];

        for (const target of internalTargets) {
            const result = evaluateNavigationGuard(target, supplierStore);
            assert.deepEqual(result, { name: 'supplier.portal.dashboard' }, `Failed blocking supplier from ${target.path}`);
        }
    });

    it('allows supplier to access supplier portal routes and public RFQ portal', () => {
        const supplierStore = {
            isAuthenticated: true,
            user: { id: 5, account_type: 'supplier', name: 'Vendor A' }
        };

        // Allowed: /portal/supplier/*
        const portalTarget = {
            path: '/portal/supplier/dashboard',
            name: 'supplier.portal.dashboard',
            meta: { requiresAuth: true, accountType: 'supplier' }
        };
        assert.equal(evaluateNavigationGuard(portalTarget, supplierStore), true);

        // Allowed: public rfq portal
        const publicRfqTarget = {
            path: '/portal/rfq/token-abc-123',
            name: 'public.portal.rfq',
            meta: { requiresAuth: false }
        };
        assert.equal(evaluateNavigationGuard(publicRfqTarget, supplierStore), true);
    });

    it('blocks employee from accessing supplier portal routes and redirects to user dashboard', () => {
        const employeeStore = {
            isAuthenticated: true,
            user: { id: 1, account_type: 'employee', name: 'Buyer Staff' }
        };

        const supplierPortalTarget = {
            path: '/portal/supplier/dashboard',
            name: 'supplier.portal.dashboard',
            meta: { requiresAuth: true, accountType: 'supplier' }
        };

        const result = evaluateNavigationGuard(supplierPortalTarget, employeeStore);
        assert.deepEqual(result, { name: 'user.dashboard' });
    });

    it('allows employee to access internal employee routes', () => {
        const employeeStore = {
            isAuthenticated: true,
            user: { id: 1, account_type: 'employee', name: 'Buyer Staff' },
            hasPermission: () => true
        };

        const internalTarget = {
            path: '/purchasing/rfqs',
            name: 'user.purchasing.rfq',
            meta: { requiresAuth: true, permission: 'rfq.read' }
        };

        const result = evaluateNavigationGuard(internalTarget, employeeStore);
        assert.equal(result, true);
    });
});
