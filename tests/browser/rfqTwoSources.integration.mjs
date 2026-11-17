// Real Vue pages -> HTTP -> Laravel -> disposable SQLite, without API interception.
// Run from erp-frontend; companion erp-backend must be installed alongside it.
import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createServer as createHttpServer } from 'node:net'
import { once } from 'node:events'
import { createServer } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const backend = resolve(process.env.ERP_BACKEND_PATH || '../erp-backend')
const temporary = await mkdtemp(resolve(tmpdir(), 'erp-rfq-sprint1-'))
const database = resolve(temporary, 'database.sqlite')
await writeFile(database, '')
const env = { ...process.env, APP_ENV: 'testing', APP_DEBUG: 'false',
    APP_CONFIG_CACHE: resolve(temporary, 'config.php'), DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '',
    CACHE_STORE: 'array', SESSION_DRIVER: 'array', QUEUE_CONNECTION: 'database', MAIL_MAILER: 'array',
    RFQ_QUOTATION_REVIEW_MODE: 'none', TELESCOPE_ENABLED: 'false', NIGHTWATCH_ENABLED: 'false', PULSE_ENABLED: 'false' }
let php, server, browser
try {
    execFileSync('php', ['artisan', 'migrate', '--force', '--no-interaction'], { cwd: backend, env, stdio: 'pipe' })
    const fixture = JSON.parse(execFileSync('php', ['tests/Support/seedRfqTwoSourceBrowser.php'], { cwd: backend, env, encoding: 'utf8' }))
    const portProbe = createHttpServer()
    portProbe.listen(0, '127.0.0.1')
    await once(portProbe, 'listening')
    const backendPort = portProbe.address().port
    await new Promise(resolve => portProbe.close(resolve))
    const backendUrl = `http://127.0.0.1:${backendPort}`
    php = spawn('php', ['-S', `127.0.0.1:${backendPort}`, '-t', 'public', 'public/index.php'], { cwd: backend, env, stdio: 'ignore' })
    const readyUntil = Date.now() + 15000
    while (true) {
        try { await fetch(`${backendUrl}/up`); break } catch (error) {
            if (Date.now() > readyUntil || php.exitCode !== null) throw new Error('Isolated Laravel server failed to start', { cause: error })
            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }
    const harness = `
import { createApp, h, ref } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Create from '/src/views/purchasing/RfqCreateView.vue';
import Detail from '/src/views/purchasing/RfqDetailView.vue';
import Comparison from '/src/views/purchasing/RfqComparisonView.vue';
import Portal from '/src/views/public/SupplierPortalRfqView.vue';
import Lifecycle from '/src/components/purchasing/RfqRequisitionLifecycle.vue';
import Dialog from '/src/components/ui/GlobalAlertDialog.vue';
import api from '/src/services/api.js';
import { useAuthStore } from '/src/stores/auth.js';
import '/src/style.css';
api.defaults.baseURL = location.origin;
if (location.pathname !== '/__integration_portal') api.defaults.headers.common.Authorization = 'Bearer ' + sessionStorage.getItem('integration-buyer-token');
const router = createRouter({ history: createMemoryHistory(), routes: [
  { path: '/requisitions/:id', component: { props: ['id'], setup(props) { const item = ref(null);
      api.get('/api/v1/purchase-requisitions/' + props.id).then(response => item.value = response.data.data);
      return () => item.value ? h(Lifecycle, { item: item.value, onUpdated: value => item.value = value }) : h('p', 'Memuat PR'); } }, props: true },
  { path: '/create', name: 'user.purchasing.rfq.create', component: Create },
  { path: '/rfqs/:id', name: 'user.purchasing.rfq.detail', component: Detail },
  { path: '/rfqs/:id/comparison', name: 'user.purchasing.rfq.comparison', component: Comparison },
  { path: '/portal/:token', name: 'public.portal.rfq', component: Portal },
  ...['user.dashboard', 'user.purchasing', 'user.purchasing.rfq', 'user.purchasing.requisitions', 'user.purchasing.plans.detail', 'user.purchasing.orders', 'user.purchasing.orders.detail', 'login'].map((name, index) => ({ path: '/destination/' + index + '/:id?', name, component: { render: () => h('p', 'destination') } }))
] });
window.integrationRouter = router;
const app = createApp({ render: () => h('div', [h(RouterView), h(Dialog)]) });
app.use(createPinia()); app.use(router);
useAuthStore().setAuth({ id: ${fixture.buyer_id}, name: 'Integration buyer' }, { division_id: ${fixture.division_id} });
router.replace(new URLSearchParams(location.search).get('route') || '/create').then(() => app.mount('#app'));
`
    server = await createServer({ cacheDir: resolve(temporary, 'vite-cache'), server: { host: '127.0.0.1', port: 0, open: false, watch: null,
        proxy: { '/api': { target: backendUrl, changeOrigin: true } } }, plugins: [{
        name: 'rfq-real-api-integration',
        resolveId: id => id === 'virtual:rfq-integration' ? '\0rfq-integration' : null,
        load: id => id === '\0rfq-integration' ? harness : null,
        configureServer(vite) {
            for (const path of ['/__integration', '/__integration_portal']) vite.middlewares.use(path, async (req, res) => {
                res.setHeader('Content-Type', 'text/html')
                res.end(await vite.transformIndexHtml(path, '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f7f9fc"><main style="padding:16px"><div id="app"></div></main><script type="module" src="/@id/virtual:rfq-integration"></script></body></html>'))
            })
        },
    }] })
    await server.listen()
    const frontendUrl = `http://127.0.0.1:${server.httpServer.address().port}`
    const api = async (method, path, payload, expected = 200, authenticated = true) => {
        const response = await fetch(`${backendUrl}/api/v1${path}`, { method,
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${authenticated === 'approver' ? fixture.approver_token : fixture.buyer_token}` } : {}) },
            ...(payload ? { body: JSON.stringify(payload) } : {}) })
        const result = await response.json()
        assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`)
        return result.data ?? result
    }
    browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {}) })
    for (const [source, width, mode] of [['initial_need', 1440, 'custom'], ['initial_need', 1440, 'catalog'], ['initial_need', 390, 'mixed'], ['procurement_plan', 390, 'plan']]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 } })
        await context.addInitScript(token => sessionStorage.setItem('integration-buyer-token', token), fixture.buyer_token)
        const buyer = await context.newPage()
        buyer.setDefaultTimeout(15000)
        const errors = []
        buyer.on('pageerror', error => errors.push(error.message))
        const route = source === 'initial_need' ? '/create' : `/create?plan_id=${fixture.plan_id}`
        await buyer.goto(`${frontendUrl}/__integration?route=${encodeURIComponent(route)}`)
        await buyer.getByRole('heading', { name: 'Buat paket tender' }).waitFor()
        if (source === 'initial_need') {
            await buyer.getByLabel('Judul tender').fill('Kebutuhan awal integration')
            if (mode === 'custom') {
                await buyer.getByLabel('Nama barang', { exact: false }).fill('Aluminium mandiri')
                await buyer.locator('[aria-labelledby="need-unit-0"]').click()
                await buyer.getByText('Kilogram (KG)', { exact: true }).click()
            } else {
                await buyer.locator('article').first().getByLabel('Dari katalog', { exact: true }).check()
                await buyer.getByRole('button', { name: 'Aluminium katalog integration' }).click()
            }
            await buyer.getByLabel('Jumlah', { exact: false }).fill('20.5')
            if (mode === 'mixed') {
                await buyer.getByRole('button', { name: 'Tambah barang', exact: true }).click()
                await buyer.getByLabel('Nama barang', { exact: false }).fill('Custom tidak ditawarkan')
                await buyer.locator('[aria-labelledby="need-unit-1"]').click()
                await buyer.getByText('Kilogram (KG)', { exact: true }).click()
            }
        } else await buyer.getByText('Material dari PP', { exact: true }).first().waitFor()
        await buyer.getByLabel('Batas akhir penawaran').fill(fixture.deadline)
        await buyer.getByRole('button', { name: 'Pilih Supplier integration', exact: true }).click()
        const created = buyer.waitForResponse(response => response.url().endsWith('/api/v1/rfqs') && response.request().method() === 'POST')
        await buyer.getByRole('button', { name: 'Simpan & publikasikan' }).click()
        const createResponse = await created
        assert.equal(createResponse.status(), 201, await createResponse.text())
        const draft = (await createResponse.json()).data
        await buyer.getByRole('heading', { name: draft.rfq_number, exact: true }).waitFor()
        const rfq = await api('GET', `/rfqs/${draft.id}`)
        // Relations have no API ordering contract; compare by stable row identity.
        rfq.items.sort((left, right) => left.id - right.id)
        assert.equal(rfq.source_type, source)
        assert.equal(rfq.status, 'published')
        assert.equal(Number(rfq.items[0].target_quantity), source === 'initial_need' ? 20.5 : 50)
        assert.equal(rfq.items[0].procurement_plan_item_id == null, source === 'initial_need')
        assert.equal(rfq.items[0].item_id == null, mode === 'custom' || mode === 'plan')
        if (mode === 'catalog' || mode === 'mixed') assert.equal(rfq.items[0].item_id, fixture.item_id)
        assert.equal(rfq.items.length, mode === 'mixed' ? 2 : 1)
        if (mode === 'mixed') assert.equal(rfq.items[1].item_id, null)
        const invitation = rfq.rfq_suppliers[0]
        const portalToken = invitation.portal_access_token || new URL(invitation.portal_url).pathname.split('/').at(-1)
        const portalPath = `/public/portal/rfq/${portalToken}`
        const publicData = await api('GET', portalPath, null, 200, false)
        publicData.rfq.items.sort((left, right) => left.id - right.id)
        const expectedName = mode === 'plan' ? 'Material dari PP' : mode === 'custom' ? 'Aluminium mandiri' : 'Aluminium katalog integration'
        assert.equal(publicData.rfq.items[0].item_name, expectedName)
        assert.equal('target_price' in publicData.rfq.items[0], false)
        assert.equal('rfq_suppliers' in publicData.rfq, false)
        assert.equal('supplier_candidates' in publicData.rfq, false)
        assert.equal('quotations' in publicData.rfq, false)
        const supplier = await context.newPage()
        supplier.setDefaultTimeout(15000)
        supplier.on('pageerror', error => errors.push(error.message))
        await supplier.goto(`${frontendUrl}/__integration_portal?route=${encodeURIComponent(`/portal/${portalToken}`)}`)
        await supplier.getByLabel('Nomor surat penawaran', { exact: false }).fill(`SQ-INTEGRATION-${source}`)
        await supplier.getByLabel('Masa Berlaku Penawaran', { exact: false }).fill(fixture.valid_until)
        if (mode === 'mixed') {
            const cards = supplier.locator('article').filter({ has: supplier.getByRole('checkbox') })
            await cards.filter({ hasText: 'Custom tidak ditawarkan' }).getByRole('checkbox').uncheck()
        }
        await supplier.getByLabel(/^Harga per 1/).fill('10000')
        const submitted = supplier.waitForResponse(response => response.url().endsWith(`${portalPath}/quote`) && response.request().method() === 'POST')
        await supplier.getByRole('button', { name: 'Kirim Surat Penawaran' }).click()
        await supplier.getByRole('button', { name: 'Ya, Kirim Penawaran', exact: true }).click()
        const quoteResponse = await submitted
        assert.equal(quoteResponse.status(), 201, await quoteResponse.text())
        const receipt = await api('GET', portalPath, null, 200, false)
        assert.equal(receipt.portal.can_submit, false)
        assert.equal(receipt.existing_quotation.items.length, 1)
        assert.equal(receipt.existing_quotation.items[0].item_description, publicData.rfq.items[0].item_name)
        const comparison = await api('GET', `/rfqs/${rfq.id}/comparison`)
        comparison.items_matrix.sort((left, right) => left.rfq_item_id - right.rfq_item_id)
        assert.equal(comparison.rfq.source_type, source)
        assert.equal(comparison.suppliers.length, 1)
        await buyer.evaluate(id => window.integrationRouter.push(`/rfqs/${id}/comparison`), rfq.id)
        await buyer.getByRole('heading', { name: 'Perbandingan penawaran', exact: true }).waitFor()
        const offer = Object.values(comparison.items_matrix[0].vendor_offers).find(offer => offer.quoted)
        assert.ok(offer?.supplier_quotation_item_id)
        if (mode === 'mixed') assert.ok(Object.values(comparison.items_matrix[1].vendor_offers).every(offer => !offer.quoted))
        const awards = { awards: [{ supplier_quotation_item_id: offer.supplier_quotation_item_id,
            awarded_quantity: String(publicData.rfq.items[0].target_quantity), expected_review_version: 1,
            technical_compliance: 'compliant', selection_reason: 'Spesifikasi dan pengiriman sesuai' }] }
        if (source === 'initial_need') {
            assert.equal(await buyer.getByRole('button', { name: 'Evaluasi & pilih pemenang' }).count(), 0)
            const rejectedAward = await api('POST', `/rfqs/${rfq.id}/award`, awards, 422)
            const rejectedPo = await api('POST', `/purchase-orders/from-rfq/${rfq.id}`, {}, 422)
            assert.equal(rejectedAward.message, rfq.purchase_blocked_reason)
            assert.equal(rejectedPo.message, rfq.purchase_blocked_reason)
            await buyer.getByRole('button', { name: 'Buat PR dari penawaran' }).click()
            const prForm = buyer.getByRole('region', { name: 'PR dari penawaran' })
            await prForm.locator('article').filter({ has: buyer.getByRole('heading', { name: expectedName, exact: true }) }).getByRole('checkbox').check()
            await prForm.locator('input[inputmode="decimal"]').fill('10.5')
            await prForm.getByRole('button', { name: 'Periksa harga & lanjut' }).click()
            await prForm.getByLabel('Tanggal kebutuhan').fill(fixture.valid_until)
            await prForm.getByLabel('Tujuan pengadaan').fill('PR dari penawaran integration')
            const conversion = buyer.waitForResponse(response => response.url().endsWith(`/rfqs/${rfq.id}/purchase-requisitions`) && response.request().method() === 'POST')
            await prForm.getByRole('button', { name: 'Simpan draft PR' }).click()
            const conversionResponse = await conversion
            assert.equal(conversionResponse.status(), 201, await conversionResponse.text())
            const pr = (await conversionResponse.json()).data
            await prForm.getByRole('heading', { name: `Draft ${pr.pr_number} berhasil disimpan` }).waitFor()
            assert.equal(pr.source.type, 'rfq_quotation')
            assert.equal(pr.status, 'draft')
            assert.equal(pr.items.length, 1)
            assert.equal(pr.items[0].item_id, mode === 'custom' ? null : fixture.item_id)
            assert.equal(pr.commercial_totals.items_subtotal, '105000.00')
            assert.equal(pr.commercial_totals.tax_amount, '11550.00')
            assert.equal(pr.commercial_totals.total_amount, '116550.00')
            assert.equal(pr.can_be_submitted, true)
            const refreshed = await api('GET', `/rfqs/${rfq.id}/comparison`)
            assert.equal(refreshed.requisition_selection.rfq_remaining[rfq.items[0].id], '10.0000')
            const revised = await api('PUT', `/purchase-requisitions/${pr.id}`, {
                items: [{ id: pr.items[0].id, quantity: '5.5' }], purpose: 'Kebutuhan direvisi',
            })
            assert.equal(revised.items[0].id, pr.items[0].id)
            assert.equal(revised.commercial_totals.total_amount, '61050.00')
            assert.equal((await api('GET', `/rfqs/${rfq.id}/comparison`)).requisition_selection.rfq_remaining[rfq.items[0].id], '15.0000')
            const submitted = await api('POST', `/purchase-requisitions/${pr.id}/submit`, {})
            await api('POST', `/approvals/requests/${submitted.approval_request.id}/decision`, { decision: 'approve' }, 200, 'approver')
            await buyer.evaluate(id => window.integrationRouter.push(`/requisitions/${id}`), pr.id)
            await buyer.getByRole('button', { name: 'Buat draft PO' }).click()
            const createdPo = buyer.waitForResponse(response => response.url().endsWith(`/purchase-requisitions/${pr.id}/purchase-orders`) && response.request().method() === 'POST')
            await buyer.getByRole('button', { name: 'Konfirmasi buat PO' }).click()
            const poResponse = await createdPo
            assert.equal(poResponse.status(), 201, await poResponse.text())
            const po = (await poResponse.json()).data[0]
            assert.equal(Number(po.total_amount), 61050)
            assert.equal(Number(po.items[0].quantity), 5.5)
            assert.equal(po.items[0].item_id, mode === 'custom' ? null : fixture.item_id)
            assert.equal(po.procurement_plan, null)
            await buyer.getByRole('link', { name: new RegExp(po.po_number) }).waitFor()
            const issued = await api('POST', `/purchase-orders/${po.id}/issue`, {})
            assert.equal(issued.status, 'issued')
            await api('POST', `/purchase-orders/${po.id}/cancel`, { reason: 'Kebutuhan berubah' })
            assert.equal((await api('GET', `/purchase-requisitions/${pr.id}`)).source_po_groups[0].can_create, true)
            const cancelled = await api('POST', `/purchase-requisitions/${pr.id}/cancel`, { reason: 'Kebutuhan berubah' })
            assert.equal(cancelled.status, 'cancelled')
            assert.equal(cancelled.can_be_submitted, false)
            assert.equal((await api('GET', `/rfqs/${rfq.id}/comparison`)).requisition_selection.rfq_remaining[rfq.items[0].id], '20.5000')
        } else {
            await api('POST', `/rfqs/${rfq.id}/award`, awards)
            const orders = await api('POST', `/purchase-orders/from-rfq/${rfq.id}`, {}, 201)
            assert.equal(orders.length, 1)
            assert.equal(Number(orders[0].subtotal), 500000)
        }
        assert.deepEqual(errors, [])
        console.log(`PASS ${source}/${mode} ${width}px: create/publish UI -> real API -> supplier UI quote -> comparison -> ${source === 'initial_need' ? 'draft PR, identity, revision, approval, PO from UI, issue/cancel and balance restored; legacy award/PO rejected' : 'award/PO created from approved PR'}`)
        await context.close()
    }
} catch (error) {
    // Do not print request URLs, headers or fixture tokens from the server log.
    console.error('RFQ integration failed:', error.message)
    throw error
} finally {
    await browser?.close()
    await server?.close()
    if (php && php.exitCode === null) {
        const closed = once(php, 'exit')
        php.kill('SIGTERM')
        await closed
    }
    await rm(temporary, { recursive: true, force: true })
}
