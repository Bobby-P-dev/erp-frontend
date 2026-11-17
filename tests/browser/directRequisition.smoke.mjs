import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const harness = `import { createApp, h, ref } from 'vue';
import Route from '/src/components/purchasing/requisition/form/PRProcurementRouteSection.vue';
import Orders from '/src/components/purchasing/RequisitionPurchaseOrders.vue';
import api from '/src/services/api.js'; import '/src/style.css';
api.defaults.baseURL = location.origin;
createApp({ setup() {
 const form = ref({ company_id: 1, procurement_route: 'standard', direct_supplier_id: null, direct_supplier_name: '', direct_purchase_terms: {reference:'', payment_terms:'', delivery_address:''} });
 window.form = form;
 const item = ref({ id: 18, status: 'approved', procurement_route: 'direct_supplier', source_po_groups: [{ supplier_quotation_id: null, supplier_name: 'Repeat Supplier', line_count: 1, quotation_number: 'Previous PO', can_create: true, orders: [] }] });
 return () => h('main', { class: 'p-4 space-y-6' }, [h(Route, {form: form.value}), h(Orders, {item: item.value, onUpdated: value => item.value = value})]);
} }).mount('#app');`
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'direct-requisition-test',
    resolveId: id => id === 'virtual:direct-pr' ? '\0direct-pr' : null,
    load: id => id === '\0direct-pr' ? harness : null,
    configureServer(vite) {
        vite.middlewares.use('/__direct-pr', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await vite.transformIndexHtml('/__direct-pr', '<meta name="viewport" content="width=device-width, initial-scale=1"><div id="app"></div><script type="module" src="/@id/virtual:direct-pr"></script>'))
        })
    },
}] })
let browser
try {
    await server.listen()
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] })
    for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1100 } })
        const errors = [], mutations = [], searches = []
        page.on('pageerror', err => errors.push(err.message))
        await page.route('**/api/**', async route => {
            const req = route.request()
            if (req.url().includes('/suppliers')) {
                searches.push(new URL(req.url()))
                return route.fulfill({ json: { data: [{ id: 7, company_id: 1, name: 'Repeat Supplier', is_active: true }], meta: { current_page: 1, last_page: 1 } } })
            }
            if (req.method() === 'POST') {
                mutations.push(req.postDataJSON())
                return route.fulfill({ status: 201, json: { data: [{ id: 1, po_number: 'PO-001' }] } })
            }
            return route.fulfill({ json: { data: { id: 18, status: 'approved', procurement_route: 'direct_supplier', source_po_groups: [{ supplier_quotation_id: null, supplier_name: 'Repeat Supplier', line_count: 1, quotation_number: 'Previous PO', can_create: false, orders: [{ id: 1, po_number: 'PO-001', status_label: 'Draft' }] }] } } })
        })
        await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__direct-pr`)
        await page.getByRole('radio', { name: /Supplier sudah ditentukan/ }).check()
        await page.getByRole('combobox', { name: 'Pilih supplier tujuan' }).click()
        await page.getByRole('button', { name: 'Repeat Supplier', exact: true }).click()
        assert.equal(await page.evaluate(() => window.form.value.direct_supplier_id), 7)
        await page.getByLabel('Referensi harga / PO sebelumnya').fill('PO lama')
        await page.getByLabel('Ketentuan pembayaran').fill('Net 30')
        assert.equal(searches[0].searchParams.get('company_id'), '1')
        assert.equal(searches[0].searchParams.get('is_active'), 'true')
        await page.getByRole('button', { name: 'Buat draft PO', exact: true }).click()
        await page.getByRole('button', { name: 'Konfirmasi buat PO' }).click()
        await page.getByRole('link', { name: /PO-001/ }).waitFor()
        assert.deepEqual(mutations, [{ supplier_quotation_id: null }])
        assert.equal(await page.getByRole('button', { name: 'Buat draft PO', exact: true }).count(), 0)
        await page.screenshot({ path: `/tmp/direct-pr-${width}.png`, fullPage: true })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
        await page.getByRole('radio', { name: /Cari supplier/ }).check()
        assert.equal(await page.evaluate(() => window.form.value.direct_supplier_id), null)
        assert.equal(await page.evaluate(() => window.form.value.direct_purchase_terms.reference), '')
        assert.deepEqual(errors, [])
        await page.close()
    }
    console.log('PASS direct PR supplier picker, reset, PO creation and responsive layouts (1440/390)')
} finally { await browser?.close(); await server.close() }
