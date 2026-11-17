// Real list components with isolated API fixtures. No live procurement data is changed.
import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const harness = `
import { createApp, h } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import PrList from '/src/views/purchasing/PurchaseRequisitionListView.vue';
import PoList from '/src/views/purchasing/PurchaseOrderListView.vue';
import Feedback from '/src/components/ui/GlobalAlertDialog.vue';
import api from '/src/services/api.js';
import '/src/style.css';
api.defaults.baseURL = location.origin;
const router = createRouter({ history: createMemoryHistory(), routes: [
 { path: '/', redirect: '/pr' },
 { path: '/pr', name: 'user.purchasing.requisitions', component: PrList },
 { path: '/po', name: 'user.purchasing.orders', component: PoList },
 ...['user.dashboard', 'user.purchasing', 'user.purchasing.rfq', 'user.purchasing.requisitions.create', 'user.purchasing.requisitions.edit'].map((name, i) => ({ path: '/destination' + i + '/:id?', name, component: { render: () => h('p', 'Destination') } })),
] });
const app = createApp({ render: () => h('main', { class: 'p-4' }, [h(RouterView), h(Feedback)]) });
app.use(createPinia()).use(router);
router.push(new URLSearchParams(location.search).has('po') ? '/po' : '/pr').then(() => app.mount('#app'));
`
const groups = [7, 8].map(id => ({ supplier_quotation_id: id, supplier_name: `Supplier ${id}`, can_create: true, orders: [] }))
const pr = (id, status, source = true) => ({ id, pr_number: `PR-${id}`, status, source: source ? { type: 'rfq_quotation' } : null,
    source_po_groups: groups, items: [], purpose: 'Material produksi', company_id: 1, company: { name: 'Perusahaan' },
    division: { name: 'Produksi' }, can_be_edited: false, can_be_submitted: false })
const po = (id, status) => ({ id, po_number: `PO-${id}`, status, supplier: { name: `Supplier ${id}` }, currency: 'IDR', total_amount: 10000 })
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'purchasing-direct-actions',
    resolveId: id => id === 'virtual:direct-actions' ? '\0direct-actions' : null,
    load: id => id === '\0direct-actions' ? harness : null,
    configureServer(vite) {
        vite.middlewares.use('/__direct-actions', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await vite.transformIndexHtml('/__direct-actions', '<meta name="viewport" content="width=device-width, initial-scale=1"><div id="app"></div><script type="module" src="/@id/virtual:direct-actions"></script>'))
        })
    },
}] })
let browser
try {
    await server.listen()
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE_PATH || '/usr/bin/google-chrome' })
    for (const width of [1440, 390]) {
        for (const isPo of [false, true]) {
            const page = await browser.newPage({ viewport: { width, height: 1000 } })
            const errors = [], mutations = [], details = []
            let fail = true, committed = false
            page.on('pageerror', err => errors.push(err.message))
            await page.route('**/api/**', async route => {
                const request = route.request(), url = new URL(request.url())
                if (request.method() === 'POST') {
                    mutations.push({ path: url.pathname, body: request.postData() ? request.postDataJSON() : null })
                    await new Promise(resolve => setTimeout(resolve, 150))
                    if (fail) return route.fulfill({ status: 422, json: { message: 'Sumber pembelian perlu diperiksa kembali.' } })
                    committed = true
                    return route.fulfill({ status: 200, json: { data: isPo ? po(1, 'issued') : [po(11, 'draft'), po(12, 'draft')] } })
                }
                if (/\/(purchase-orders|purchase-requisitions)\/\d+$/.test(url.pathname)) details.push(url.pathname)
                const data = isPo ? [po(1, committed ? 'issued' : 'draft'), po(2, 'approved'), po(3, 'issued'), po(4, 'pending_approval'), po(5, 'cancelled')]
                    : [Object.assign(pr(1, 'approved'), { source_po_groups: groups.map(group => ({ ...group, can_create: !committed })) }), pr(2, 'pending_approval'), pr(3, 'approved', false), pr(4, 'draft')]
                return route.fulfill({ json: { data, meta: { total: data.length, current_page: 1, last_page: 1, per_page: 10 } } })
            })
            await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__direct-actions${isPo ? '?po=1' : ''}`)
            const action = page.getByRole('button', { name: isPo ? 'Terbitkan PO PO-1' : 'Buat draft PO dari PR-1', exact: true, includeHidden: true })
            const confirm = page.getByRole('alertdialog').getByRole('button', { name: isPo ? 'Terbitkan PO' : 'Buat draft PO', exact: true })
            await action.waitFor()
            await page.screenshot({ path: `/tmp/purchasing-direct-${isPo ? 'po' : 'pr'}-${width}.png`, fullPage: true })
            assert.equal(await page.getByRole('button', { name: isPo ? /^Terbitkan PO PO-/ : /^Buat draft PO dari PR-/ }).count(), isPo ? 2 : 1)
            await action.click()
            if (!isPo) await page.getByRole('alertdialog').getByText(/buat 2 draft PO untuk Supplier 7, Supplier 8/).waitFor()
            await page.getByRole('alertdialog').getByRole('button', { name: 'Batal', exact: true }).click()
            assert.equal(mutations.length, 0)
            await action.click()
            assert.equal(await action.isDisabled(), true)
            await confirm.click()
            await page.getByRole('alertdialog').getByText('Sumber pembelian perlu diperiksa kembali.', { exact: true }).waitFor()
            await page.getByRole('alertdialog').getByRole('button', { name: 'Mengerti' }).click()
            fail = false
            await action.click()
            await confirm.click()
            await page.getByRole('alertdialog').getByRole('heading', { name: isPo ? 'PO diterbitkan' : 'Draft PO berhasil dibuat', exact: true }).waitFor()
            await page.getByRole('alertdialog').getByRole('button', { name: 'Mengerti' }).click()
            assert.equal(await action.count(), 0)
            assert.equal(mutations.length, 2)
            assert.equal(mutations[1].path, isPo ? '/api/v1/purchase-orders/1/issue' : '/api/v1/purchase-requisitions/1/purchase-orders')
            if (!isPo) assert.deepEqual(mutations[1].body, {})
            assert.deepEqual(details, [])
            assert.equal(await page.getByRole('dialog').count(), 0)
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
            assert.deepEqual(errors, [])
            console.log(`PASS ${width}px ${isPo ? 'PO' : 'PR'}: direct list action, status guards, cancel, 422 retry, refresh, no preview GET`)
            await page.close()
        }
    }
} finally {
    await browser?.close()
    await server.close()
}
