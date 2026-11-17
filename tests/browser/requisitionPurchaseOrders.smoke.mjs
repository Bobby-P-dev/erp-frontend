import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const fixture = { id: 18, status: 'approved', currency: 'IDR', source_po_groups: [
    { supplier_quotation_id: 7, supplier_name: 'Supplier Bahan Produksi', quotation_number: 'SQ-007', line_count: 2, can_create: true, orders: [] },
    { supplier_quotation_id: 8, supplier_name: 'Supplier Kedua', quotation_number: 'SQ-008', line_count: 1, can_create: false,
        orders: [{ id: 22, po_number: 'PO-022', status_label: 'Draf' }] },
] }
const harness = `import { createApp, h, ref } from 'vue';
import Orders from '/src/components/purchasing/RequisitionPurchaseOrders.vue';
import api from '/src/services/api.js'; import '/src/style.css';
api.defaults.baseURL = location.origin;
createApp({ setup() { const item = ref(window.fixture); return () => h('main', { class: 'p-4' },
h(Orders, { item: item.value, onUpdated: value => item.value = value })); } }).mount('#app');`
const server = await createServer({ configFile: './vite.config.js', server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'requisition-orders-test', configureServer(vite) {
        vite.middlewares.use('/__requisition-orders', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml('/__requisition-orders', `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="app"></div><script>window.fixture=${JSON.stringify(fixture)}</script><script type="module" src="/@id/virtual:requisition-orders"></script></body></html>`))
        })
    }, resolveId(id) { if (id === 'virtual:requisition-orders') return '\0requisition-orders' },
    load(id) { if (id === '\0requisition-orders') return harness },
}] })
await server.listen()
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox'] })
try {
    for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } })
        const errors = [], requests = []
        page.on('pageerror', error => errors.push(error.message))
        let rejected = false
        await page.route('**/api/v1/purchase-requisitions/18**', async route => {
            if (route.request().method() === 'GET') {
                return route.fulfill({ json: { data: { ...fixture, source_po_groups: fixture.source_po_groups.map((group, i) => i ? group : { ...group, can_create: false,
                    orders: [{ id: 23, po_number: 'PO-023', status_label: 'Draf' }] }) } } })
            }
            requests.push(route.request().postDataJSON())
            if (!rejected) { rejected = true; return route.fulfill({ status: 422, json: { message: 'Penawaran kedaluwarsa. Periksa sumber PR.' } }) }
            await route.fulfill({ status: 201, json: { data: [{ id: 23, po_number: 'PO-023' }] } })
        })
        await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__requisition-orders`)
        await page.getByRole('button', { name: 'Buat draft PO' }).click()
        await page.getByRole('button', { name: 'Batal', exact: true }).click()
        assert.equal(requests.length, 0)
        await page.getByRole('button', { name: 'Buat draft PO' }).click()
        await page.getByRole('button', { name: 'Konfirmasi buat PO' }).click()
        await page.getByRole('alert').getByText('Penawaran kedaluwarsa. Periksa sumber PR.').waitFor()
        await page.getByRole('button', { name: 'Konfirmasi buat PO' }).click()
        await page.getByRole('status').getByText(/Draft PO berhasil dibuat/).waitFor()
        await page.getByRole('link', { name: /PO-023/ }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Buat draft PO' }).count(), 0)
        assert.deepEqual(requests, [{ supplier_quotation_id: 7 }, { supplier_quotation_id: 7 }])
        assert.equal(await page.getByRole('link', { name: /PO-023/ }).getAttribute('href'), '/purchasing/purchase-orders/23')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
        assert.deepEqual(errors, [])
        await page.screenshot({ path: `/tmp/requisition-po-phase5-${width}.png`, fullPage: true })
        console.log(`PASS ${width}px: confirmation, cancellation, 422 retry, refresh, PO links, duplicate button hidden`)
        await page.close()
    }
} finally { await browser.close(); await server.close() }
