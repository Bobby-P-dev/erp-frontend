// Fixture-only browser checks: no database writes or invitation delivery.
import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const harness = `
import { createApp, h, ref } from 'vue';
import Section from '/src/components/purchasing/rfq/form/RfqSuppliersInviteSection.vue';
import { useRfqSupplierCandidates } from '/src/composables/purchasing/useRfqSupplierCandidates.js';
import api from '/src/services/api.js';
import formSource from '/src/views/purchasing/RfqCreateView.vue?raw';
import '/src/style.css';
// Apply the real parent form styles to this isolated section harness.
const style = document.createElement('style');
style.textContent = formSource.match(/<style scoped>([\\s\\S]*?)<\\/style>/)[1].replace(/:deep\\(([^)]+)\\)/g, '$1');
document.head.append(style);
api.defaults.baseURL = location.origin;
createApp({ setup() {
  const items = ref([{ item_id: 12, item_name: 'Aluminium', item_mode: 'catalog' }]);
  const state = useRfqSupplierCandidates(items);
  window.supplierState = state; window.rfqItems = items;
  return () => h('main', { class: 'rfq-create p-4' }, h(Section, { state }));
}}).mount('#app');
`
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'supplier-candidates-preview',
    resolveId: id => id === 'virtual:supplier-test' ? '\0supplier-test' : null,
    load: id => id === '\0supplier-test' ? harness : null,
    configureServer(vite) {
        vite.middlewares.use('/__supplier', async (req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await vite.transformIndexHtml('/__supplier', '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="app"></div><script type="module" src="/@id/virtual:supplier-test"></script></body></html>'))
        })
    },
}] })
let browser
try {
    await server.listen()
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE_PATH || '/usr/bin/google-chrome' })
    for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } })
        page.setDefaultTimeout(10000)
        let rejectList = false, rejectSelected = false, unavailable = false, slowSelected = false
        const requests = [], errors = []
        page.on('pageerror', error => errors.push(error.message))
        await page.route('**/api/v1/rfqs/supplier-candidates?**', async route => {
            const params = new URL(route.request().url()).searchParams
            const selected = params.getAll('supplier_ids[]').map(Number)
            const ids = params.getAll('item_ids[]').map(Number)
            const mode = params.get('mode'), search = params.get('search'), currentPage = Number(params.get('page'))
            requests.push({ selected, ids, mode, search, currentPage, method: route.request().method() })
            if (selected.length ? rejectSelected : rejectList) return route.fulfill({ status: 503, json: {} })
            if (selected.length && slowSelected && ids.includes(12)) await new Promise(resolve => setTimeout(resolve, 700))
            if (search === 'lama') await new Promise(resolve => setTimeout(resolve, 900))
            const row = (id, name, matches) => ({ id, name, supplier_code: 'SUP-' + id, matched_item_ids: matches, matched_item_count: matches.length })
            const x = row(7, 'Supplier X', ids.includes(12) ? [12] : [])
            const y = row(8, 'Supplier Y', ids.filter(id => [12, 13].includes(id)))
            const z = row(9, 'Supplier Z', ids.includes(13) ? [13] : [])
            let rows = selected.length ? [x, y, z, row(205, 'Supplier 205', []), ...selected.filter(id => id >= 1000).map(id => row(id, 'Batch ' + id, []))].filter(row => selected.includes(row.id) && !(unavailable && row.id === 7)) : [x, y, z]
            if (!selected.length) {
                if (mode === 'recommended') rows = rows.filter(row => row.matched_item_ids.length)
                if (search === 'lama') rows = [row(90, 'Supplier usang', [])]
                else if (search === 'baru') rows = [row(91, 'Supplier terbaru', [])]
                else if (search === 'tidakada') rows = []
                else if (search === 'SUP-205' || currentPage === 2) rows = [row(205, 'Supplier 205', [])]
                // Duplicate fixture proves defensive deduplication in the client.
                if (rows.some(row => row.id === 8)) rows.push(y)
            }
            return route.fulfill({ json: { data: rows, meta: { current_page: currentPage, last_page: !selected.length && mode === 'all' && !search ? 21 : 1, total: !selected.length && mode === 'all' && !search ? 205 : rows.length } } })
        })
        await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/__supplier')
        const openPicker = async () => {
            if (!await page.getByRole('dialog').count()) await page.getByRole('combobox', { name: 'Cari dan pilih supplier' }).click()
        }
        await openPicker()
        await page.getByRole('button', { name: 'Pilih Supplier X', exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Pilih Supplier Z', exact: true }).count(), 0)
        assert.equal(await page.getByRole('button', { name: 'Pilih Supplier Y', exact: true }).count(), 1)
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSupplierIds.value), [])
        await page.getByRole('searchbox', { name: 'Cari nama atau kode supplier' }).press('ArrowDown')
        assert.equal(await page.getByRole('button', { name: 'Pilih Supplier X', exact: true }).evaluate(el => el === document.activeElement), true)
        await page.keyboard.press('Escape')
        assert.equal(await page.getByRole('dialog').count(), 0)
        await openPicker()
        assert.equal(await page.getByRole('searchbox', { name: 'Cari nama atau kode supplier' }).evaluate(el => el === document.activeElement), true)
        await page.getByRole('button', { name: 'Pilih Supplier X', exact: true }).click()
        await page.waitForFunction(() => window.supplierState.selectionState.value === 'ready')
        await page.evaluate(() => window.rfqItems.value.push({ item_mode: 'catalog', item_id: 13, item_name: 'Baja' }))
        await page.getByRole('button', { name: 'Pilih Supplier Z', exact: true }).waitFor()
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSupplierIds.value), [])
        await page.getByText('Barang berubah. Pilihan supplier sebelumnya dikosongkan.', { exact: false }).waitFor()
        await page.getByRole('button', { name: 'Pilih Supplier X', exact: true }).click()
        await page.getByText('Sesuai: Aluminium, Baja', { exact: true }).waitFor()
        await page.screenshot({ path: '/tmp/rfq-phase4-mixed-' + width + '.png', fullPage: true })
        await page.keyboard.press('Escape')
        await page.getByLabel('Cari supplier lain', { exact: true }).check()
        await openPicker()
        const nav = page.getByRole('navigation', { name: 'Halaman kandidat supplier' })
        await nav.getByRole('button', { name: 'Berikutnya' }).click()
        await page.getByRole('button', { name: 'Pilih Supplier 205', exact: true }).click()
        await page.waitForFunction(() => window.supplierState.selectionState.value === 'ready')
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSupplierIds.value), [7, 205])
        const search = page.getByRole('searchbox', { name: 'Cari nama atau kode supplier' })
        await search.fill('SUP-205')
        await page.getByRole('button', { name: 'Sudah dipilih Supplier 205', exact: true }).waitFor()
        await search.fill('tidakada')
        await page.getByText('Supplier tidak ditemukan.', { exact: false }).waitFor()
        rejectList = true
        await search.fill('gagal')
        await page.getByRole('button', { name: 'Coba lagi', exact: true }).waitFor()
        rejectList = false
        await page.getByRole('button', { name: 'Coba lagi', exact: true }).click()
        await page.getByRole('button', { name: 'Pilih Supplier Y', exact: true }).waitFor()
        await search.fill('lama')
        await page.waitForTimeout(350)
        await search.fill('baru')
        await page.getByRole('button', { name: 'Pilih Supplier terbaru', exact: true }).waitFor()
        await page.waitForTimeout(700)
        assert.equal(await page.getByText('Supplier usang', { exact: true }).count(), 0)
        await search.fill('')
        await page.evaluate(() => window.rfqItems.value = [{ item_mode: 'catalog', item_id: 12, item_name: 'Aluminium' }])
        await page.getByRole('button', { name: 'Pilih Supplier X', exact: true }).waitFor()
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSupplierIds.value), [])
        assert.equal(await search.inputValue(), '')
        assert.equal(await page.evaluate(() => window.supplierState.mode.value), 'recommended')
        await page.getByRole('button', { name: 'Pilih Supplier X', exact: true }).click()
        await page.waitForFunction(() => window.supplierState.selectionState.value === 'ready')
        // Quantity/price edits and reselecting the same catalog item keep invitations.
        await page.evaluate(() => {
            window.rfqItems.value[0].target_quantity = '40';
            window.rfqItems.value[0].target_price = '5000';
            window.rfqItems.value[0].item_id = 12;
        })
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSupplierIds.value), [7])
        slowSelected = true
        await page.evaluate(() => { window.supplierState.refreshSelected() })
        await page.waitForTimeout(100)
        await page.evaluate(() => window.rfqItems.value = [{ item_mode: 'catalog', item_id: 13, item_name: 'Baja' }])
        await page.getByRole('button', { name: 'Pilih Supplier Z', exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Pilih Supplier X', exact: true }).count(), 0)
        await page.waitForTimeout(800)
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSupplierIds.value), [])
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSuppliers.value), [])
        await page.keyboard.press('Escape')
        await page.getByLabel('Cari supplier lain', { exact: true }).check()
        await openPicker()
        await page.getByRole('button', { name: 'Pilih Supplier X', exact: true }).click()
        await page.getByRole('navigation', { name: 'Halaman kandidat supplier' }).getByRole('button', { name: 'Berikutnya' }).click()
        await page.getByRole('button', { name: 'Pilih Supplier 205', exact: true }).click()
        await page.waitForFunction(() => window.supplierState.selectionState.value === 'ready')
        await page.keyboard.press('Escape')
        rejectSelected = true
        await page.evaluate(() => window.supplierState.refreshSelected())
        await page.getByRole('button', { name: 'Periksa lagi', exact: true }).waitFor()
        rejectSelected = false
        unavailable = true
        await page.getByRole('button', { name: 'Periksa lagi', exact: true }).click()
        await page.getByText('Supplier tidak tersedia atau tidak lagi aktif.', { exact: false }).waitFor()
        await page.getByRole('button', { name: 'Hapus Supplier X dari undangan', exact: true }).click()
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSupplierIds.value), [205])
        await page.evaluate(() => window.rfqItems.value = [{ item_mode: 'catalog', item_id: 99, item_name: 'Tanpa mapping' }])
        await page.keyboard.press('Escape')
        await page.getByLabel('Sesuai barang katalog', { exact: true }).check()
        await openPicker()
        await page.getByText('Belum ada supplier yang cocok', { exact: false }).waitFor()
        await page.getByRole('button', { name: 'Cari supplier lain', exact: true }).click()
        await page.getByRole('button', { name: 'Pilih Supplier Y', exact: true }).waitFor()
        await page.evaluate(() => window.rfqItems.value = [{ item_mode: 'custom', item_name: 'Custom' }])
        await page.getByText('Barang custom tidak dicocokkan otomatis', { exact: false }).waitFor()
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSupplierIds.value), [])
        await openPicker()
        await page.getByRole('button', { name: 'Pilih Supplier Y', exact: true }).waitFor()
        assert.equal(await page.getByLabel('Sesuai barang katalog', { exact: true }).count(), 0)
        await page.getByRole('button', { name: 'Pilih Supplier Y', exact: true }).click()
        await page.evaluate(() => window.rfqItems.value[0].item_name = 'Custom baru')
        await page.waitForFunction(() => window.supplierState.loading.value === false)
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSupplierIds.value), [])
        await page.getByRole('button', { name: 'Pilih Supplier Y', exact: true }).click()
        await page.evaluate(() => window.rfqItems.value = [])
        await page.waitForFunction(() => window.supplierState.loading.value === false)
        assert.deepEqual(await page.evaluate(() => window.supplierState.selectedSupplierIds.value), [])
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        await page.screenshot({ path: '/tmp/rfq-phase4-' + width + '.png', fullPage: true })
        const batchStart = requests.length
        await page.evaluate(() => window.supplierState.selectedSupplierIds.value = Array.from({ length: 101 }, (_, index) => 1000 + index))
        await page.waitForFunction(() => window.supplierState.selectionState.value === 'ready' && window.supplierState.selectedSuppliers.value.length === 101)
        const batches = requests.slice(batchStart).filter(request => request.selected.length)
        assert.deepEqual(batches.map(request => request.selected.length), [100, 1])
        assert.equal(new Set(batches.flatMap(request => request.selected)).size, 101)
        assert.equal(await page.evaluate(() => window.supplierState.selectedSuppliers.value.every(row => row.availability === 'active')), true)
        assert.ok(requests.every(request => request.method === 'GET'))
        assert.deepEqual(errors, [])
        console.log(width + ': PASS union/dedupe, explicit selection, >200 search/pagination, 101 selections batched 100+1, search/page retention, item-change reset, quantity preservation, stale selection guard, error/retry, stale response, unavailable/custom and layout')
        await page.close()
    }
} finally {
    await browser?.close()
    await server.close()
}
