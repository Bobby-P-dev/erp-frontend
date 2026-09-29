import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Helper mirroring the BaseBreadcrumb normalization and resolution logic
const formatSegment = (seg) => {
    return seg
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
}

const ROUTE_BREADCRUMBS = {
    // User / Operational
    'user.dashboard': [],
    'user.approvals.inbox': [
        { label: 'Kotak Masuk Persetujuan' }
    ],
    'user.purchasing': [
        { label: 'Purchasing' }
    ],
    'user.purchasing.approvals': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Persetujuan Pengadaan (Approvals)' }
    ],
    'user.purchasing.requisitions': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Purchase Requisitions' }
    ],
    'user.purchasing.requisitions.create': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Purchase Requisitions', to: { name: 'user.purchasing.requisitions' } },
        { label: 'Buat PR Baru' }
    ],
    'user.purchasing.plans': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Rencana Pengadaan' }
    ],
    'user.purchasing.direct': [
        { label: 'Purchasing', to: { name: 'user.purchasing' } },
        { label: 'Direct Purchases' }
    ],
    'user.finance.payment-requests': [
        { label: 'Finance' },
        { label: 'Permohonan Pembayaran (Payment Requests)' }
    ],
    'user.finance.payments': [
        { label: 'Finance' },
        { label: 'Permohonan Pembayaran', to: { name: 'user.finance.payment-requests' } },
        { label: 'Riwayat Kas Keluar' }
    ],
    'user.inventory.goods-receipts': [
        { label: 'Inventory' },
        { label: 'Penerimaan Barang (Goods Receipts)' }
    ],

    // Admin Master Data - Core
    'admin.dashboard': [],
    'admin.master.company': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Perusahaan (Companies)' }
    ],
    'admin.master.division': [
        { label: 'Master Data' },
        { label: 'Core' },
        { label: 'Divisi (Divisions)' }
    ],
    'admin.master.supplier': [
        { label: 'Master Data' },
        { label: 'Purchasing' },
        { label: 'Suppliers' }
    ],
    'admin.master.user': [
        { label: 'Manajemen Pengguna (Users)' }
    ],
    'admin.settings.approval': [
        { label: 'Pengaturan' },
        { label: 'Alur Persetujuan (Approval Workflows)' }
    ],
}

const resolveBreadcrumbItems = ({ propsItems, routeName, routePath, routeMeta }) => {
    if (propsItems && Array.isArray(propsItems) && propsItems.length > 0) {
        return propsItems.map(item => typeof item === 'string' ? { label: item } : item)
    }

    if (routeMeta?.breadcrumb) {
        const metaBc = typeof routeMeta.breadcrumb === 'function' ? routeMeta.breadcrumb({ name: routeName, path: routePath }) : routeMeta.breadcrumb
        return metaBc.map(item => typeof item === 'string' ? { label: item } : item)
    }

    if (routeName && ROUTE_BREADCRUMBS[routeName]) {
        return ROUTE_BREADCRUMBS[routeName].map(item => typeof item === 'string' ? { label: item } : item)
    }

    if (routePath && routePath !== '/' && routePath !== '/dashboard' && routePath !== '/admin/dashboard') {
        const segments = routePath.split('/').filter(Boolean)
        return segments.map((seg, idx) => ({
            label: formatSegment(seg),
            to: idx === segments.length - 1 ? undefined : '/' + segments.slice(0, idx + 1).join('/')
        }))
    }

    return []
}

describe('BaseBreadcrumb Architecture & Route Resolution Contract Tests', () => {
    it('normalizes string items into structured object items', () => {
        const items = resolveBreadcrumbItems({ propsItems: ['Purchasing', 'PR-001'] })
        assert.equal(items.length, 2)
        assert.deepEqual(items[0], { label: 'Purchasing' })
        assert.deepEqual(items[1], { label: 'PR-001' })
    })

    it('preserves rich object items with route targets and icon components', () => {
        const dummyIcon = { name: 'DummyIcon' }
        const input = [
            { label: 'Purchasing', to: { name: 'user.purchasing' }, icon: dummyIcon },
            { label: 'Purchase Requisitions' }
        ]
        const items = resolveBreadcrumbItems({ propsItems: input })
        assert.equal(items.length, 2)
        assert.equal(items[0].label, 'Purchasing')
        assert.deepEqual(items[0].to, { name: 'user.purchasing' })
        assert.equal(items[0].icon, dummyIcon)
        assert.equal(items[1].label, 'Purchase Requisitions')
        assert.equal(items[1].to, undefined)
    })

    it('auto-resolves operational user routes accurately from registry', () => {
        const financeBc = resolveBreadcrumbItems({ routeName: 'user.finance.payment-requests' })
        assert.equal(financeBc.length, 2)
        assert.equal(financeBc[0].label, 'Finance')
        assert.equal(financeBc[1].label, 'Permohonan Pembayaran (Payment Requests)')

        const inventoryBc = resolveBreadcrumbItems({ routeName: 'user.inventory.goods-receipts' })
        assert.equal(inventoryBc.length, 2)
        assert.equal(inventoryBc[0].label, 'Inventory')
        assert.equal(inventoryBc[1].label, 'Penerimaan Barang (Goods Receipts)')

        const prBc = resolveBreadcrumbItems({ routeName: 'user.purchasing.requisitions.create' })
        assert.equal(prBc.length, 3)
        assert.equal(prBc[2].label, 'Buat PR Baru')

        const purchasingApprovalsBc = resolveBreadcrumbItems({ routeName: 'user.purchasing.approvals' })
        assert.equal(purchasingApprovalsBc.length, 2)
        assert.equal(purchasingApprovalsBc[0].label, 'Purchasing')
        assert.equal(purchasingApprovalsBc[1].label, 'Persetujuan Pengadaan (Approvals)')
    })

    it('auto-resolves admin master data routes with multi-level hierarchy', () => {
        const companyBc = resolveBreadcrumbItems({ routeName: 'admin.master.company' })
        assert.equal(companyBc.length, 3)
        assert.equal(companyBc[0].label, 'Master Data')
        assert.equal(companyBc[1].label, 'Core')
        assert.equal(companyBc[2].label, 'Perusahaan (Companies)')

        const supplierBc = resolveBreadcrumbItems({ routeName: 'admin.master.supplier' })
        assert.equal(supplierBc.length, 3)
        assert.equal(supplierBc[0].label, 'Master Data')
        assert.equal(supplierBc[1].label, 'Purchasing')
        assert.equal(supplierBc[2].label, 'Suppliers')
    })

    it('falls back to title-cased path segments when route name is unmapped', () => {
        const unmappedBc = resolveBreadcrumbItems({ routePath: '/custom-module/reports/annual-summary' })
        assert.equal(unmappedBc.length, 3)
        assert.equal(unmappedBc[0].label, 'Custom Module')
        assert.equal(unmappedBc[0].to, '/custom-module')
        assert.equal(unmappedBc[1].label, 'Reports')
        assert.equal(unmappedBc[1].to, '/custom-module/reports')
        assert.equal(unmappedBc[2].label, 'Annual Summary')
        assert.equal(unmappedBc[2].to, undefined) // active page has no 'to'
    })

    it('correctly identifies whether to prepend Home/Dashboard', () => {
        const shouldDisplayHome = (items, showHome = true) => {
            if (!showHome) return false
            const first = items[0]
            if (first && (first.label?.toLowerCase() === 'dashboard' || first.label?.toLowerCase() === 'beranda')) {
                return false
            }
            return true
        }

        // Standard operational breadcrumbs should display Home
        assert.equal(shouldDisplayHome([{ label: 'Purchasing' }]), true)
        
        // If first item is already Dashboard/Beranda, skip redundant Home
        assert.equal(shouldDisplayHome([{ label: 'Dashboard' }, { label: 'Approvals' }]), false)
        assert.equal(shouldDisplayHome([{ label: 'Beranda' }, { label: 'Purchasing' }]), false)

        // When showHome is explicitly disabled
        assert.equal(shouldDisplayHome([{ label: 'Purchasing' }], false), false)
    })
})
