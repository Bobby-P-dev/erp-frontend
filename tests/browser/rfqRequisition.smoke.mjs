// Isolated API fixtures: no transactions are created in the application's database.
import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const harness = `
import { createApp, h, ref } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Form from '/src/components/purchasing/rfq/RfqRequisitionForm.vue';
import { useAuthStore } from '/src/stores/auth.js';
import api from '/src/services/api.js';
import '/src/style.css';
api.defaults.baseURL = location.origin;
if (new URLSearchParams(location.search).has('single')) { window.fixture.suppliers.pop(); delete window.fixture.items_matrix[0].vendor_offers[2]; window.fixture.requisition_selection.rfq_remaining[10] = '1.0000'; }
const app = createApp({ setup() {
 const matrix = ref(window.fixture);
 return () => h(Form, { matrix: matrix.value, onRefresh: () => { window.refreshCount = (window.refreshCount || 0) + 1 } });
} });
app.use(createPinia());
useAuthStore().setAuth({ id: 1, name: 'Buyer' }, { division: { id: 3, name: 'Produksi' } });
app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: '/', name: 'user.purchasing.requisitions', component: { render: () => h('div') } }] }));
app.mount('#app');
`
const fixture = {
    rfq: { id: 20, rfq_number: 'RFQ-020', source_type: 'initial_need', status: 'evaluation' },
    suppliers: [1, 2].map(id => ({ quotation_id: id, supplier_id: id, supplier_name: `Supplier ${id}`, quotation_number: `SQ-${id}`, currency: 'IDR', exchange_rate: 1, review_version: 2 })),
    items_matrix: [{ rfq_item_id: 10, item_name: 'Bahan produksi', unit_name: 'kg', vendor_offers: {
        1: { quoted: true, supplier_quotation_item_id: 101 }, 2: { quoted: true, supplier_quotation_item_id: 102 },
    } }],
    requisition_selection: { can_create: true, rfq_remaining: { 10: '50.0000' }, quotation_remaining: { 101: '50.0000', 102: '50.0000' }, quotations: { 1: { eligible: true }, 2: { eligible: true } } },
}
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'rfq-pr-fixture',
    resolveId: id => id === 'virtual:rfq-pr' ? '\0rfq-pr' : null,
    load: id => id === '\0rfq-pr' ? harness : null,
    configureServer(vite) {
        vite.middlewares.use('/__rfq-pr', async (req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await vite.transformIndexHtml('/__rfq-pr', `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f7f9fc;padding:16px"><div id="app"></div><script>window.fixture=${JSON.stringify(fixture)}</script><script type="module" src="/@id/virtual:rfq-pr"></script></body></html>`))
        })
    },
}] })
let browser
try {
    await server.listen()
    browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {}) })
    for (const [width, single] of [[1440, true], [390, true], [1440, false], [390, false]]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } })
        const errors = [], posts = []
        let rejectPrice = true, rejectSave = true
        page.on('pageerror', error => errors.push(error.message))
        await page.route('**/api/**', async route => {
            const payload = route.request().postDataJSON()
            if (route.request().url().endsWith('/pricing-preview')) {
                const id = Number(/quotations\/(\d+)/.exec(route.request().url())[1])
                const lines = payload.allocations.map(line => ({ ...line, eligible: !rejectPrice, reason: rejectPrice ? 'requires_price_confirmation' : null, line_subtotal: String(Number(line.quantity) * 100), quotation_version: 2 }))
                const subtotal = lines.reduce((sum, line) => sum + Number(line.line_subtotal), 0)
                return route.fulfill({ json: { data: { quotation_id: id, quotation_version: 2, currency: 'IDR', eligible: !rejectPrice, lines, subtotal: String(subtotal), tax_amount: '0.00', shipping_cost: '50.00', total_amount: String(subtotal + 50) } } })
            }
            posts.push(payload)
            if (rejectSave) return route.abort('failed')
            return route.fulfill({ status: 201, json: { data: { id: 50, pr_number: 'PR-050', commercial_totals: { currency: 'IDR', total_amount: '5100.00' }, items: payload.items.map(line => ({ id: line.supplier_quotation_item_id, ...line, item_name: 'Bahan produksi', supplier_id: line.supplier_quotation_item_id - 100, source_line_subtotal: String(Number(line.quantity) * 100), unit: { name: 'kg' } })) } } })
        })
        await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__rfq-pr${single ? '?single=1' : ''}`)
        await page.getByRole('button', { name: 'Buat PR dari penawaran' }).click()
        await page.getByRole('checkbox').nth(0).check()
        if (single) {
            const input = page.getByLabel('Jumlah dari Supplier 1')
            assert.equal(await input.inputValue(), '1')
            await input.fill('10')
            assert.equal(await input.inputValue(), '1')
            await input.fill('')
            await input.pressSequentially('10')
            assert.equal(await input.inputValue(), '1')
            await input.fill('1.0001')
            assert.equal(await input.inputValue(), '1')
            await input.fill('-1')
            assert.equal(await input.inputValue(), '1')
            await input.fill('0.')
            await input.pressSequentially('5')
            assert.equal(await input.inputValue(), '0.5')
            await input.fill('1.')
            await input.blur()
            assert.equal(await input.inputValue(), '1')
            assert.equal(await page.getByRole('alert').count(), 0)
            assert.deepEqual(errors, [])
            console.log(`PASS ${width}px: quota 1 clamps typed/pasted excess, rejects invalid input and supports decimals`)
            await page.close()
            continue
        }
        await page.getByLabel('Jumlah dari Supplier 1').fill('40')
        // Cache a first preview, then add another supplier: the computed payload must include the new key.
        rejectPrice = false
        await page.getByRole('button', { name: 'Periksa harga & lanjut' }).click()
        await page.getByRole('button', { name: 'Ubah pilihan' }).click()
        rejectPrice = true
        await page.getByRole('checkbox').nth(1).check()
        assert.equal(await page.getByLabel('Jumlah dari Supplier 2').inputValue(), '10')
        await page.getByLabel('Jumlah dari Supplier 2').fill('11')
        assert.equal(await page.getByLabel('Jumlah dari Supplier 2').inputValue(), '10')
        await page.getByLabel('Jumlah dari Supplier 1').fill('41')
        assert.equal(await page.getByLabel('Jumlah dari Supplier 1').inputValue(), '40')
        assert.equal(posts.length, 0)
        await page.getByLabel('Jumlah dari Supplier 2').fill('10')
        await page.getByRole('button', { name: 'Periksa harga & lanjut' }).click()
        await page.getByRole('alert').getByText(/revisi harga supplier/).first().waitFor()
        rejectPrice = false
        await page.getByRole('button', { name: 'Periksa harga & lanjut' }).click()
        await page.getByLabel('Tanggal kebutuhan').fill('2027-01-01')
        await page.getByLabel('Tujuan pengadaan').fill('Produksi Januari')
        assert.equal(await page.getByRole('region', { name: 'Ringkasan biaya PR' }).count(), 1)
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        await page.screenshot({ path: `/tmp/rfq-pr-phase3-${width}.png`, fullPage: true })
        await page.getByRole('button', { name: 'Simpan draft PR' }).click()
        await page.getByRole('button', { name: 'Periksa hasil / coba lagi' }).waitFor()
        await page.reload()
        rejectSave = false
        await page.getByRole('button', { name: 'Periksa hasil / coba lagi' }).click()
        await page.getByRole('heading', { name: 'Draft PR-050 berhasil disimpan' }).waitFor()
        assert.equal(posts.length, 2)
        assert.deepEqual(posts[0], posts[1])
        assert.deepEqual(posts[0].items.map(line => line.quantity), ['40', '10'])
        assert.equal(await page.evaluate(() => sessionStorage.length), 0)
        assert.deepEqual(errors, [])
        console.log(`PASS ${width}px: split bounds, backend pricing rejection, totals, lost-response retry across reload and draft result`)
        await page.close()
    }
} finally { await browser?.close(); await server.close() }
