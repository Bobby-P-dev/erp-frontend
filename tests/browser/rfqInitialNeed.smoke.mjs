// API fixtures only: this test never creates transactions on the application database.
import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')

const harness = `
import { createApp, h } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Create from '/src/views/purchasing/RfqCreateView.vue';
import Detail from '/src/views/purchasing/RfqDetailView.vue';
import Comparison from '/src/views/purchasing/RfqComparisonView.vue';
import List from '/src/views/purchasing/RfqListView.vue';
import Dialog from '/src/components/ui/GlobalAlertDialog.vue';
import api from '/src/services/api.js';
import '/src/style.css';
api.defaults.baseURL = location.origin;
const router = createRouter({ history: createMemoryHistory(), routes: [
  { path: '/create', name: 'user.purchasing.rfq.create', component: Create },
  { path: '/rfqs/:id', name: 'user.purchasing.rfq.detail', component: Detail },
  { path: '/rfqs/:id/comparison', name: 'user.purchasing.rfq.comparison', component: Comparison },
  { path: '/rfqs', name: 'user.purchasing.rfq', component: List },
  ...['user.dashboard', 'user.purchasing', 'user.purchasing.plans.detail', 'user.purchasing.orders', 'user.purchasing.orders.detail'].map((name, index) => ({ path: '/destination/' + index + '/:id?', name, component: { render: () => h('p', 'destination') } }))
] });
window.previewRouter = router;
const app = createApp({ render: () => h('div', [h(RouterView), h(Dialog)]) });
app.use(createPinia()); app.use(router);
router.replace(new URLSearchParams(location.search).get('route') || '/create').then(() => app.mount('#app'));
`
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'rfq-initial-need-preview',
    resolveId: id => id === 'virtual:rfq-initial-need' ? '\0rfq-initial-need' : null,
    load: id => id === '\0rfq-initial-need' ? harness : null,
    configureServer(vite) {
        vite.middlewares.use('/__initial', async (req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await vite.transformIndexHtml('/__initial', '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f7f9fc"><main style="padding:16px"><div id="app"></div></main><script type="module" src="/@id/virtual:rfq-initial-need"></script></body></html>'))
        })
    },
}] })

const plan = { id: 28, pp_number: 'PP-028', company_id: 1, company: { name: 'Perusahaan Fixture' }, purchase_requisition: { pr_number: 'PR-038', purpose: 'Material produksi', company_id: 1 }, items: [{ id: 99, item_name: 'Material dari PP', unit_id: 3, unit: { id: 3, name: 'Kilogram', code: 'KG' }, remaining_quantity: 50, planned_quantity: 50 }] }
const rfq = () => ({ id: 10, rfq_number: 'RFQ-AWAL-010', title: 'Material produksi', source_type: 'initial_need', source_type_label: 'Kebutuhan awal', requires_pr_link: true, status: 'evaluation', deadline_date: '2026-12-10', items: [{ id: 1, item_name: 'Aluminium lembaran', target_quantity: '20.5', unit: { id: 3, name: 'Kilogram', code: 'KG' } }], rfq_suppliers: [], quotations: [], purchase_orders: [] })
let browser
try {
    await server.listen()
    browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {}) })
    const url = 'http://127.0.0.1:' + server.httpServer.address().port + '/__initial'
    for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } })
        page.setDefaultTimeout(10000)
        const errors = [], posts = []
        let rejectCreate = false, rejectCatalog = false, supplierUnavailable = false
        page.on('pageerror', error => errors.push(error.message))
        await page.route('**/api/**', async route => {
            const request = route.request(), path = new URL(request.url()).pathname
            if (path.endsWith('/rfqs/supplier-candidates')) {
                const params = new URL(request.url()).searchParams
                if (supplierUnavailable && params.has('supplier_ids[]')) return route.fulfill({ json: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } } })
                return route.fulfill({ json: { data: [{ id: 7, name: 'Supplier Fixture', supplier_code: 'SUP-7', matched_item_ids: params.getAll('item_ids[]').map(Number), matched_item_count: params.getAll('item_ids[]').length }], meta: { current_page: 1, last_page: 1, total: 1 } } })
            }
            if (path.endsWith('/rfqs/catalog-items')) {
                if (rejectCatalog) return route.fulfill({ status: 503, json: { message: 'Unavailable fixture' } })
                const params = new URL(request.url()).searchParams
                const second = params.get('page') === '2'
                const search = params.get('search') || ''
                const name = search === 'baru' ? 'Barang terbaru' : search === 'lama' ? 'Barang lama' : second ? 'Baja katalog' : 'Aluminium katalog'
                if (search === 'lama') await new Promise(resolve => setTimeout(resolve, 700))
                return route.fulfill({ json: { data: search === 'tidakada' ? [] : [{ id: second ? 13 : 12, name, code: 'MAT-012', unit_id: 3, unit: { id: 3, name: 'Kilogram', code: 'KG' } }], meta: { current_page: second ? 2 : 1, last_page: search ? 1 : 2 } } })
            }
            if (request.method() === 'POST') {
                posts.push({ path, payload: request.postDataJSON() })
                if (path.endsWith('/publish')) return route.fulfill({ json: { data: rfq() } })
                if (rejectCreate) return route.fulfill({ status: 422, json: { message: 'Periksa barang', errors: { 'items.0.item_name': ['Nama barang perlu diperjelas.'] } } })
                return route.fulfill({ json: { data: rfq() } })
            }
            let data = []
            if (path.endsWith('/unit/search')) data = [{ id: 3, name: 'Kilogram', code: 'KG' }]
            else if (path.endsWith('/suppliers')) data = [{ id: 7, name: 'Supplier Fixture', email: 'supplier@example.test' }]
            else if (path.endsWith('/procurement-plans')) data = [plan]
            else if (path.endsWith('/procurement-plans/28')) data = plan
            else if (path.endsWith('/comparison')) data = { rfq: rfq(), suppliers: [], statistics: {}, items_matrix: [], award_decisions: [] }
            else if (path.endsWith('/rfqs/10')) data = rfq()
            else if (path.endsWith('/rfqs')) data = [rfq()]
            return route.fulfill({ json: { data, meta: { current_page: 1, last_page: 1, per_page: 10, total: Array.isArray(data) ? data.length : 1 } } })
        })
        await page.goto(url)
        await page.getByRole('heading', { name: 'Buat paket tender' }).waitFor()
        assert.equal(await page.locator('input[name="rfq-source"][value="initial_need"]').isChecked(), true)
        await page.getByRole('button', { name: 'Simpan draf', exact: true }).click()
        await page.getByText('Nama barang wajib diisi.', { exact: true }).last().waitFor()
        assert.equal(posts.length, 0)
        assert.equal(await page.locator('#rfq-validation-errors').evaluate(element => document.activeElement === element), true)
        await page.getByLabel('Judul tender').fill('Material produksi')
        await page.getByLabel('Batas akhir penawaran').fill('2026-12-10')
        const article = page.locator('article').first()
        await article.getByLabel('Dari katalog', { exact: true }).check()
        await article.getByRole('combobox').click()
        const catalogDialog = page.getByRole('dialog', { name: 'Cari barang katalog', exact: true })
        await catalogDialog.getByRole('button', { name: 'Aluminium katalog' }).waitFor()
        await catalogDialog.getByRole('button', { name: 'Berikutnya' }).click()
        await catalogDialog.getByRole('button', { name: 'Baja katalog' }).click()
        await article.getByRole('combobox').click()
        const catalogSearch = page.getByRole('searchbox', { name: 'Cari barang katalog', exact: true })
        await catalogSearch.fill('tidakada')
        await catalogDialog.getByText('Barang tidak ditemukan.', { exact: false }).waitFor()
        rejectCatalog = true
        await catalogSearch.fill('error')
        await catalogDialog.getByRole('button', { name: 'Coba lagi', exact: true }).waitFor()
        rejectCatalog = false
        await catalogDialog.getByRole('button', { name: 'Coba lagi', exact: true }).click()
        await catalogDialog.getByRole('button', { name: 'Aluminium katalog' }).waitFor()
        await catalogSearch.fill('lama')
        await page.waitForTimeout(350)
        await catalogSearch.fill('baru')
        await catalogDialog.getByRole('button', { name: 'Barang terbaru' }).waitFor()
        await page.waitForTimeout(500)
        assert.equal(await catalogDialog.getByRole('button', { name: 'Barang lama' }).count(), 0)
        await catalogDialog.getByRole('button', { name: 'Barang terbaru' }).click()
        await article.getByLabel('Barang custom', { exact: true }).check()
        assert.equal(await page.getByLabel('Nama barang', { exact: false }).inputValue(), '')
        await page.getByLabel('Nama barang', { exact: false }).fill('Aluminium lembaran')
        await page.getByLabel('Jumlah', { exact: false }).fill('20.5')
        const unit = page.locator('[aria-labelledby="need-unit-0"]')
        await unit.click()
        await page.getByText('Kilogram (KG)', { exact: true }).click()
        await page.getByRole('button', { name: 'Simpan & publikasikan' }).click()
        await page.getByText('Pilih minimal satu supplier sebelum publikasi.', { exact: true }).waitFor()
        assert.equal(posts.length, 0)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        await page.screenshot({ path: `/tmp/rfq-initial-need-${width}.png`, fullPage: true })
        rejectCreate = true
        await page.getByRole('button', { name: 'Simpan draf', exact: true }).click()
        await page.getByText('Nama barang perlu diperjelas.', { exact: true }).last().waitFor()
        await page.getByRole('button', { name: 'Mengerti', exact: true }).click()
        rejectCreate = false
        await page.getByRole('button', { name: 'Simpan draf', exact: true }).click()
        await page.getByRole('heading', { name: 'RFQ-AWAL-010', exact: true }).waitFor()
        const saved = posts.filter(post => post.path === '/api/v1/rfqs').at(-1).payload
        assert.equal(saved.source_type, 'initial_need')
        assert.equal(saved.items[0].target_quantity, '20.5')
        assert.equal(saved.items[0].unit_id, 3)
        assert.equal('procurement_plan_id' in saved, false)
        assert.equal('procurement_plan_item_id' in saved.items[0], false)
        await page.getByText('Permintaan harga sebelum PR', { exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Terbitkan PO', exact: true }).count(), 0)
        await page.getByRole('button', { name: 'Bandingkan penawaran' }).click()
        await page.getByRole('heading', { name: 'Perbandingan penawaran', exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Evaluasi & pilih pemenang' }).count(), 0)
        await page.evaluate(() => window.previewRouter.push('/create'))
        await page.getByLabel('Judul tender').fill('RFQ campuran')
        await page.getByLabel('Batas akhir penawaran').fill('2026-12-10')
        await page.locator('article').first().getByLabel('Dari katalog', { exact: true }).check()
        await page.locator('article').first().getByRole('combobox').click()
        await page.getByRole('button', { name: 'Aluminium katalog' }).click()
        await page.getByRole('button', { name: 'Tambah barang', exact: true }).click()
        await page.getByLabel('Nama barang', { exact: false }).fill('Barang khusus')
        await page.locator('[aria-labelledby="need-unit-1"]').click()
        await page.getByText('Kilogram (KG)', { exact: true }).last().click()
        await page.getByRole('button', { name: 'Tambah barang', exact: true }).click()
        await page.getByRole('button', { name: 'Hapus barang 3', exact: true }).click()
        assert.equal(await page.locator('article').count(), 2)
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal overflow')
        await page.screenshot({ path: `/tmp/rfq-catalog-phase3-${width}.png`, fullPage: true })
        supplierUnavailable = true
        await page.getByRole('combobox', { name: 'Cari dan pilih supplier' }).click()
        await page.getByRole('button', { name: 'Pilih Supplier Fixture', exact: true }).click()
        await page.getByRole('button', { name: 'Selesai', exact: true }).click()
        await page.getByText('Supplier tidak tersedia atau tidak lagi aktif.', { exact: false }).waitFor()
        const beforeUnavailableSubmit = posts.length
        await page.getByRole('button', { name: 'Simpan draf', exact: true }).click()
        await page.getByText('Hapus supplier yang tidak lagi tersedia', { exact: false }).waitFor()
        assert.equal(posts.length, beforeUnavailableSubmit)
        await page.getByRole('button', { name: 'Hapus Supplier Fixture dari undangan', exact: true }).click()
        supplierUnavailable = false
        await page.getByRole('combobox', { name: 'Cari dan pilih supplier' }).click()
        await page.getByRole('button', { name: 'Pilih Supplier Fixture', exact: true }).click()
        await page.getByRole('button', { name: 'Selesai', exact: true }).click()
        await page.getByRole('button', { name: 'Hapus Supplier Fixture dari undangan', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Simpan draf', exact: true }).click()
        await page.getByRole('heading', { name: 'RFQ-AWAL-010', exact: true }).waitFor()
        const mixed = posts.filter(post => post.path === '/api/v1/rfqs').at(-1).payload
        assert.equal(mixed.items[0].item_id, 12)
        assert.equal(mixed.items[0].unit_id, 3)
        assert.equal(mixed.items[0].target_price, null)
        assert.equal(mixed.items[1].item_id, null)
        assert.equal(mixed.items[1].item_name, 'Barang khusus')
        assert.equal(mixed.suppliers[0].supplier_id, 7)
        await page.evaluate(() => window.previewRouter.push('/create?plan_id=28'))
        await page.getByText('Material dari PP', { exact: true }).first().waitFor()
        assert.equal(await page.locator('input[name="rfq-source"][value="procurement_plan"]').isChecked(), true)
        await page.getByLabel('Batas akhir penawaran').fill('2026-12-10')
        await page.getByRole('button', { name: 'Simpan draf', exact: true }).click()
        await page.getByRole('heading', { name: 'RFQ-AWAL-010', exact: true }).waitFor()
        const savedPlan = posts.filter(post => post.path === '/api/v1/rfqs').at(-1).payload
        assert.equal(savedPlan.source_type, 'procurement_plan')
        assert.equal(savedPlan.procurement_plan_id, 28)
        assert.equal(savedPlan.items[0].procurement_plan_item_id, 99)
        await page.evaluate(() => window.previewRouter.push('/create?plan_id=28'))
        await page.getByText('Material dari PP', { exact: true }).first().waitFor()
        await page.getByLabel('Kebutuhan awal', { exact: false }).check()
        assert.equal(await page.getByLabel('Judul tender').inputValue(), '')
        assert.equal(await page.getByLabel('Nama barang', { exact: false }).inputValue(), '')
        assert.equal(await page.getByText('Material dari PP', { exact: true }).count(), 0)
        await page.getByLabel('Dari rencana pengadaan', { exact: false }).check()
        assert.equal(await page.getByText('Material dari PP', { exact: true }).count(), 0)
        await page.evaluate(() => window.previewRouter.push('/rfqs?tab=rfqs'))
        await page.getByRole('heading', { name: 'Tender RFQ', exact: true }).waitFor()
        await page.getByText('Kebutuhan awal', { exact: true }).waitFor()
        await page.getByRole('link', { name: 'Buat tender RFQ' }).click()
        await page.getByRole('heading', { name: 'Buat paket tender' }).waitFor()
        assert.deepEqual(errors, [])
        console.log(`${width}: PASS catalog/custom/mixed payloads, pagination, empty/error, stale response, mode reset, add/remove, initial/plan validation and responsive layout`)
        await page.close()
    }
} finally {
    await browser?.close()
    await server.close()
}
