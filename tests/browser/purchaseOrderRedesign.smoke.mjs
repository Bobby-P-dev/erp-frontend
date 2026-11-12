// Real Vue components with isolated API fixtures; never mutates live procurement data.
import assert from 'node:assert/strict'
import { createServer } from 'vite'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const harness = `
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import List from '/src/views/purchasing/PurchaseOrderListView.vue'
import Detail from '/src/views/purchasing/PurchaseOrderDetailView.vue'
import Feedback from '/src/components/ui/GlobalAlertDialog.vue'
import api from '/src/services/api.js'
import '/src/style.css'
api.defaults.baseURL = location.origin
const router = createRouter({ history: createMemoryHistory(), routes: [
 { path: '/', name: 'user.purchasing.orders', component: List },
 { path: '/orders/:id', name: 'user.purchasing.orders.detail', component: Detail },
 ...['user.dashboard', 'user.purchasing', 'user.purchasing.rfq', 'user.purchasing.rfq.detail'].map((name, i) => ({ path: '/destination' + i + '/:id?', name, component: { render: () => h('p', 'Destination') } })),
] })
const app = createApp({ render: () => h('main', { style: 'padding:24px' }, [h(RouterView), h(Feedback)]) })
app.use(createPinia()).use(router)
router.isReady().then(async () => {
 if (new URLSearchParams(location.search).has('direct')) await router.push('/orders/1')
 app.mount('#app')
})
`
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'po-redesign-smoke',
    resolveId: id => id === 'virtual:po-smoke' ? '\0po-smoke' : null,
    load: id => id === '\0po-smoke' ? harness : null,
    configureServer(vite) { vite.middlewares.use('/__po_smoke', async (req, res) => {
        res.setHeader('Content-Type', 'text/html')
        res.end(await vite.transformIndexHtml('/__po_smoke', '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/@id/virtual:po-smoke"></script></body></html>'))
    }) },
}] })
const fixture = status => ({ id: 1, po_number: 'PO-2026-000004', currency: 'USD', status, status_label: status === 'draft' ? 'Draf PO' : status,
    supplier: { name: 'PT Pemasok Peralatan Industri Indonesia', supplier_code: 'SUP-010' },
    po_date: '2026-11-11', expected_delivery_date: '2026-11-18', payment_terms: 'Tempo 60 hari', delivery_address: 'Kawasan Industri Bekasi Blok C-12',
    subtotal: 950, discount_amount: 50, tax_rate: 11, tax_amount: 99, shipping_cost: 20, total_amount: 1019,
    notes: 'Pastikan kemasan aman.', created_at: '2026-11-11T04:44:00Z',
    rfq: { id: 8, rfq_number: 'RFQ-2026-000006', title: 'Pengadaan bahan produksi' },
    supplier_quotation: { quotation_number: 'SQ-2026-000007' },
    items: [{ id: 1, item_name: 'Plat besi', quantity: 50, unit: { name: 'Meter' }, unit_price: 19, subtotal: 950, item_specifications: 'Plat besi sesuai kebutuhan produksi', brand: 'Fixture', source_pr_number: 'PR-2026-000035', lead_time_days: 7 }],
})
let browser
try {
    await server.listen()
    browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {}) })
    const base = `http://127.0.0.1:${server.httpServer.address().port}/__po_smoke`
    for (const width of [1440, 1024, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } })
        const errors = [], requests = [], mutations = []
        page.on('pageerror', error => errors.push(error.message))
        let po = fixture('draft'), failed = false
        await page.route('**/api/**', async route => {
            const request = route.request(), url = new URL(request.url())
            requests.push(url.pathname + url.search)
            if (request.method() === 'PATCH') { mutations.push(request.postDataJSON()); po = { ...po, ...request.postDataJSON() } }
            if (url.pathname.endsWith('/issue')) po = { ...po, status: 'issued', status_label: 'Diterbitkan', issued_at: '2026-11-11T06:00:00Z' }
            if (url.pathname.endsWith('/cancel')) { mutations.push(request.postDataJSON()); po = { ...po, status: 'cancelled', status_label: 'Dibatalkan' } }
            if (failed && /purchase-orders\/1$/.test(url.pathname)) return route.fulfill({ status: 500, json: { message: 'Fixture gagal memuat detail' } })
            const isList = url.pathname.endsWith('/purchase-orders')
            await route.fulfill({ status: 200, json: isList ? { data: [po], meta: { total: 12, current_page: Number(url.searchParams.get('page') || 1), last_page: 2, per_page: 10 } } : { data: po } })
        })
        await page.goto(base)
        await page.getByRole('button', { name: 'PO-2026-000004', exact: true }).waitFor()
        assert.equal(await page.locator('thead th').count(), 6)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        await page.screenshot({ path: `/tmp/po-list-${width}.png`, fullPage: true })
        await page.getByRole('button', { name: '2', exact: true }).click()
        await page.waitForFunction(() => document.body.innerText.includes('11 sampai'))
        assert(requests.some(url => url.includes('page=2')))
        await page.getByRole('combobox').selectOption('partially_received')
        await page.getByRole('button', { name: 'PO-2026-000004', exact: true }).waitFor()
        assert(requests.some(url => url.includes('status=partially_received') && url.includes('page=1')))
        const opener = page.getByRole('button', { name: 'PO-2026-000004', exact: true })
        await opener.click()
        const dialog = page.getByRole('dialog')
        await dialog.getByRole('heading', { name: 'Barang yang dipesan' }).waitFor()
        assert.equal(await page.locator('#app').evaluate(el => el.inert), true)
        assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden')
        assert((await dialog.innerText()).includes('US$'))
        await dialog.locator('summary:visible').click()
        await dialog.locator('details:visible').getByText('Plat besi sesuai kebutuhan produksi', { exact: true }).waitFor()
        await page.screenshot({ path: `/tmp/po-detail-${width}.png`, fullPage: true })
        assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth), false)
        await dialog.getByRole('button', { name: 'Pengiriman', exact: true }).click()
        await dialog.getByText('Kawasan Industri Bekasi Blok C-12', { exact: true }).waitFor()
        await dialog.getByRole('button', { name: 'Ubah ketentuan' }).click()
        await dialog.getByLabel('Syarat pembayaran', { exact: true }).fill('Tempo 30 hari')
        await dialog.getByRole('button', { name: 'Simpan perubahan' }).click()
        await page.getByRole('alertdialog').getByRole('button', { name: 'Mengerti' }).click()
        assert.equal(mutations[0].payment_terms, 'Tempo 30 hari')
        await dialog.getByRole('button', { name: 'Terbitkan PO', exact: true }).click()
        await page.getByRole('alertdialog').getByRole('button', { name: 'Ya, Lanjutkan' }).click()
        await page.getByRole('alertdialog').getByRole('button', { name: 'Mengerti' }).click()
        assert.equal(await dialog.getByRole('button', { name: 'Terbitkan PO', exact: true }).count(), 0)
        await dialog.getByRole('button', { name: 'Dokumen & proses' }).click()
        await dialog.getByRole('button', { name: 'Batalkan PO', exact: true }).click()
        await page.getByRole('alertdialog').getByLabel('Alasan / Keterangan:').fill('Kebutuhan dibatalkan')
        await page.getByRole('alertdialog').getByRole('button', { name: 'Batalkan PO' }).click()
        await page.getByRole('alertdialog').getByRole('button', { name: 'Mengerti' }).click()
        assert.equal(mutations.at(-1).reason, 'Kebutuhan dibatalkan')
        await dialog.getByRole('button', { name: 'Tutup', exact: true }).focus()
        await page.keyboard.press('Tab')
        assert.equal(await dialog.getByRole('button', { name: 'Tutup detail', exact: true }).evaluate(el => el === document.activeElement), true)
        await page.keyboard.press('Escape')
        assert.equal(await page.getByRole('dialog').count(), 0)
        assert.equal(await page.locator('#app').evaluate(el => el.inert), false)
        assert.equal(await opener.evaluate(el => el === document.activeElement), true)
        failed = true
        await opener.click()
        await dialog.getByText('Fixture gagal memuat detail', { exact: true }).waitFor()
        failed = false
        await dialog.getByRole('button', { name: 'Coba lagi' }).click()
        await dialog.getByRole('heading', { name: 'Barang yang dipesan' }).waitFor()
        await page.keyboard.press('Escape')
        po = fixture('acknowledged')
        await page.goto(base + '?direct=1')
        await page.getByRole('dialog').getByRole('heading', { name: 'Barang yang dipesan' }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Terbitkan PO', exact: true }).count(), 0)
        assert.deepEqual(errors, [])
        console.log(`PASS ${width}px: list, pagination, status, modal, currency, disclosures, edit, issue, cancel, focus, retry, direct URL`)
        await page.close()
    }
} finally { await browser?.close(); await server.close() }
