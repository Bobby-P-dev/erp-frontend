// Isolated component/API fixtures; no application transactions are created.
import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const harness = `
import { createApp, h, ref } from 'vue';
import Form from '/src/components/purchasing/PurchaseRequisitionSubmitModal.vue';
import api from '/src/services/api.js';
import '/src/style.css';
api.defaults.baseURL = location.origin;
createApp({ setup() {
 const open = ref(false);
 return () => [h('button', { onClick: () => open.value = true }, 'Ouvrir'), h(Form, {
 modelValue: open.value, 'onUpdate:modelValue': value => open.value = value,
 item: { id: 38, pr_number: 'PR-RFQ-038', company_id: 1 },
 onSubmitted: () => window.submitted = (window.submitted || 0) + 1,
 })];
} }).mount('#app');`
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'pr-submit-fixture',
    resolveId: id => id === 'virtual:pr-submit' ? '\0pr-submit' : null,
    load: id => id === '\0pr-submit' ? harness : null,
    configureServer(vite) {
        vite.middlewares.use('/__pr-submit', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await vite.transformIndexHtml('/__pr-submit', '<div id="app"></div><script type="module" src="/@id/virtual:pr-submit"></script>'))
        })
    },
}] })
let browser
try {
    await server.listen()
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE_PATH || '/usr/bin/google-chrome' })
    for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } })
        const errors = [], posts = [], pages = []
        let failLoad = true, failSubmit = true, empty = false
        page.on('pageerror', err => errors.push(err.message))
        await page.route('**/api/**', async route => {
            if (route.request().method() === 'POST') {
                posts.push(route.request().postDataJSON())
                return route.fulfill({ status: failSubmit ? 422 : 200, json: failSubmit ? { message: 'Workflow perlu diperiksa kembali.' } : { data: { id: 38 } } })
            }
            if (failLoad) return route.fulfill({ status: 404, json: { message: 'Workflow tidak dapat dimuat.' } })
            const url = new URL(route.request().url())
            const n = Number(url.searchParams.get('page'))
            pages.push(n)
            const config = (id, company_id, name) => ({ id, company_id, name, code: `WF-${id}`, is_active: true, levels: [{ step_order: 1, step_name: 'Persetujuan Kepala Divisi' }] })
            return route.fulfill({ json: { data: empty ? [] : n === 1 ? [config(1, 2, 'Perusahaan lain')] : [config(7, 1, 'Workflow Produksi'), config(8, null, 'Workflow Umum')], meta: { last_page: empty ? 1 : 2 } } })
        })
        await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__pr-submit`)
        await page.getByRole('button', { name: 'Ouvrir' }).click()
        await page.getByRole('alert').waitFor()
        assert.equal(await page.getByRole('button', { name: 'Ajukan PR', exact: true }).isDisabled(), true)
        assert.equal(await page.getByText('Workflow Produksi', { exact: true }).count(), 0)
        failLoad = false
        await page.getByRole('button', { name: 'Muat ulang workflow' }).click()
        await page.getByText('Pilih workflow persetujuan', { exact: true }).click()
        await page.getByText('Workflow Produksi', { exact: true }).click()
        assert.deepEqual(pages, [1, 2])
        await page.getByText('Persetujuan Kepala Divisi', { exact: true }).waitFor()
        assert.equal(await page.getByText('Perusahaan lain', { exact: true }).count(), 0)
        await page.getByRole('button', { name: 'Ajukan PR', exact: true }).click()
        await page.getByRole('alert').waitFor()
        assert.deepEqual(posts, [{ approval_configuration_id: 7 }])
        failSubmit = false
        await page.getByRole('button', { name: 'Ajukan PR', exact: true }).click()
        await page.waitForFunction(() => window.submitted === 1)
        assert.deepEqual(posts, [{ approval_configuration_id: 7 }, { approval_configuration_id: 7 }])
        await page.getByRole('button', { name: 'Ouvrir' }).click()
        await page.getByText('Pilih workflow persetujuan', { exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Ajukan PR', exact: true }).isDisabled(), true)
        await page.getByRole('button', { name: 'Batal', exact: true }).click()
        assert.equal(posts.length, 2)
        empty = true
        await page.getByRole('button', { name: 'Ouvrir' }).click()
        await page.getByText(/Belum ada workflow PR aktif/).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Ajukan PR', exact: true }).isDisabled(), true)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        assert.deepEqual(errors, [])
        console.log(`PASS ${width}px: explicit workflow, pagination/company filter, no mock on error, retry, reset, cancel, empty state`)
        await page.close()
    }
} finally {
    await browser?.close()
    await server.close()
}
