import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const harness = `
import { createApp, h, ref } from 'vue';
import Lifecycle from '/src/components/purchasing/RfqRequisitionLifecycle.vue';
import api from '/src/services/api.js';
import '/src/style.css';
api.defaults.baseURL = location.origin;
createApp({ setup() { const item = ref(window.fixture); return () => h('main', { class: 'p-4' },
 h(Lifecycle, { item: item.value, onUpdated: value => { item.value = value; window.saved = value; } })); } }).mount('#app');
`
const fixture = { id: 18, pr_number: 'PR-018', status: 'draft', source: { type: 'rfq_quotation' },
    purpose: 'Bahan produksi', request_date: '2026-11-13', required_date: '2026-11-20', currency: 'IDR',
    can_be_edited: true, can_be_cancelled: true, commercial_totals: { total_amount: '3000.00' },
    items: [{ id: 1, item_name: 'Material A', quantity: 20, unit: { name: 'kg' }, source_allocation_status: 'reserved' },
        { id: 2, item_name: 'Material B', quantity: 10, unit: { name: 'kg' }, source_allocation_status: 'reserved' }] }
const server = await createServer({ configFile: './vite.config.js', server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'pr-lifecycle-harness', configureServer(vite) {
        vite.middlewares.use('/__pr-lifecycle', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml('/__pr-lifecycle', `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="app"></div><script>window.fixture=${JSON.stringify(fixture)}</script><script type="module" src="/@id/virtual:pr-lifecycle"></script></body></html>`))
        })
    },
    resolveId(id) { if (id === 'virtual:pr-lifecycle') return '\0pr-lifecycle' },
    load(id) { if (id === '\0pr-lifecycle') return harness },
}] })
await server.listen()
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox'] })
try {
    for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } })
        const errors = [], requests = []
        page.on('pageerror', e => errors.push(e.message))
        let reject = true
        await page.route('**/api/v1/purchase-requisitions/18**', async route => {
            const body = route.request().postDataJSON(); requests.push(body)
            if (route.request().url().endsWith('/cancel')) {
                await route.fulfill({ json: { data: { ...fixture, status: 'cancelled', can_be_edited: false, can_be_cancelled: false } } })
            } else if (reject) {
                reject = false
                await route.fulfill({ status: 422, json: { message: 'Sisa kebutuhan tidak cukup.' } })
            } else {
                await route.fulfill({ json: { data: { ...fixture, purpose: body.purpose, commercial_totals: { total_amount: '1500.00' },
                    items: [{ ...fixture.items[0], quantity: 15 }, { ...fixture.items[1], source_allocation_status: 'withdrawn' }] } } })
            }
        })
        await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__pr-lifecycle`)
        await page.getByRole('button', { name: 'Ubah pengajuan' }).click()
        assert.equal(await page.getByLabel('Jumlah Material A').inputValue(), '20')
        await page.screenshot({ path: `/tmp/rfq-pr-phase4-${width}.png`, fullPage: true })
        await page.getByLabel('Jumlah Material A').fill('15')
        await page.getByLabel('Ajukan Material B').uncheck()
        await page.getByRole('button', { name: 'Simpan perubahan' }).click()
        await page.getByRole('alert').getByText('Sisa kebutuhan tidak cukup.').waitFor()
        assert.equal(await page.getByLabel('Jumlah Material A').inputValue(), '15')
        await page.getByRole('button', { name: 'Simpan perubahan' }).click()
        await page.getByRole('button', { name: 'Ubah pengajuan' }).waitFor()
        assert.deepEqual(requests[0].items, [{ id: 1, quantity: 15 }])
        assert.equal(await page.evaluate(() => window.saved.commercial_totals.total_amount), '1500.00')
        await page.getByRole('button', { name: 'Ubah pengajuan' }).click()
        await page.getByLabel('Ajukan Material A').uncheck()
        assert.equal(await page.getByRole('button', { name: 'Simpan perubahan' }).isDisabled(), true)
        await page.getByRole('button', { name: 'Kembali', exact: true }).click()
        await page.getByRole('button', { name: 'Batalkan PR', exact: true }).click()
        await page.getByLabel('Alasan pembatalan').fill('Kebutuhan dibatalkan')
        await page.getByRole('button', { name: 'Konfirmasi pembatalan' }).click()
        await page.waitForFunction(() => window.saved?.status === 'cancelled')
        await page.getByText('Reservasi sudah dilepas. Riwayat pengajuan tetap tersimpan.').waitFor()
        assert.equal(await page.getByRole('button', { name: 'Ubah pengajuan' }).count(), 0)
        assert.deepEqual(requests.at(-1), { reason: 'Kebutuhan dibatalkan' })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
        assert.deepEqual(errors, [])
        console.log(`PASS ${width}px: revision, removal, validation, recalculated total and cancellation`)
        await page.close()
    }
} finally { await browser.close(); await server.close() }
