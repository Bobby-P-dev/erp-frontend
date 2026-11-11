// Isolated browser checks of real Vue components with API fixtures, not staging UAT.
// PLAYWRIGHT_MODULE_PATH may point at an installed playwright package's index.mjs.
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const harness = `
import { createApp, h, ref } from 'vue'
import { createPinia } from 'pinia'
import Review from '/src/components/purchasing/rfq/detail/QuotationReviewSection.vue'
import Evaluation from '/src/components/purchasing/rfq/AwardEvaluationFields.vue'
import Feedback from '/src/components/ui/GlobalAlertDialog.vue'
import api from '/src/services/api.js'
import '/src/style.css'
api.defaults.baseURL = location.origin
const evaluation = ref({ technical_compliance: 'not_verified', selection_reason: '' })
createApp({ setup() { return () => h('main', { style: 'padding:20px' }, [
  h(Review, { quotations: [{ id: 91, quotation_number: 'SQ-SMOKE', supplier_name: 'Supplier Fixture', review_version: 1, review_status: 'pending_review' }] }),
  h('form', { id: 'evaluation', onSubmit: e => e.preventDefault() }, [h(Evaluation, {
    modelValue: evaluation.value, 'onUpdate:modelValue': value => evaluation.value = value,
  })]),
  h('pre', { id: 'evaluation-result' }, JSON.stringify(evaluation.value)), h(Feedback),
]) } }).use(createPinia()).mount('#app')
`
const server = await createServer({
    server: { host: '127.0.0.1', port: 0, strictPort: false, open: false },
    plugins: [{
        name: 'rfq-smoke-harness',
        resolveId: id => id === 'virtual:rfq-smoke' ? '\0virtual:rfq-smoke' : null,
        load: id => id === '\0virtual:rfq-smoke' ? harness : null,
        configureServer(vite) {
            vite.middlewares.use('/__rfq_smoke', async (req, res, next) => {
                if (req.url !== '/' && req.url !== '') return next()
                res.setHeader('Content-Type', 'text/html')
                res.end(await vite.transformIndexHtml('/__rfq_smoke', '<html><body><div id="app"></div><script type="module" src="/@id/virtual:rfq-smoke"></script></body></html>'))
            })
        },
    }],
})
let browser
try {
    await server.listen()
    browser = await chromium.launch({
        headless: true,
        ...(process.env.CHROME_EXECUTABLE_PATH ? { executablePath: process.env.CHROME_EXECUTABLE_PATH } : {}),
    })
    const port = server.httpServer.address().port
    for (const [name, mode, width, conflict] of [
        ['desktop direct review and revision', 'direct', 1440, false],
        ['desktop approval submission', 'approval', 1440, false],
        ['mobile direct review and revision', 'direct', 390, false],
        ['stale review conflict refresh', 'direct', 1440, true],
    ]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 } })
        const page = await context.newPage()
        page.setDefaultTimeout(12000)
        const errors = [], requests = [], unexpected = []
        page.on('pageerror', error => errors.push(error.message))
        let quote = {
            id: 91, quotation_number: 'SQ-SMOKE', supplier: { name: 'Supplier Fixture' },
            review_mode: mode, review_status: 'pending_review', review_version: 1,
            allowed_actions: [mode === 'direct' ? 'confirm_review' : 'submit_review'],
            revision_actions: ['request_revision', 'view_history'], currency: 'IDR',
            quotation_date: '2026-11-10', valid_until: '2026-11-24', tax_rate: 0,
            tax_amount: 0, shipping_cost: 100, total_amount: 100100,
            items: [{ id: 101, rfq_item_id: 10, item_description: 'Steel fixture', offered_quantity: 100, unit_price: 1000, subtotal: 100000 }],
        }
        await page.route('**/api/**', async route => {
            const request = route.request(), path = new URL(request.url()).pathname
            const method = request.method(), body = request.postDataJSON()
            requests.push({ method, path, body })
            let status = 200, data = quote
            if (method === 'GET' && path === '/api/v1/supplier-quotations/91') {
                data = quote
            } else if (method === 'POST' && path.endsWith('/confirm-review') && mode === 'direct') {
                assert.equal(body.expected_review_version, quote.review_version)
                if (conflict) {
                    quote = { ...quote, review_version: 2, allowed_actions: [] }
                    status = 409
                } else {
                    quote = { ...quote, review_status: 'approved', allowed_actions: [], is_review_approved: true }
                }
                data = quote
            } else if (method === 'POST' && path.endsWith('/submit-review') && mode === 'approval') {
                assert.equal(body.expected_review_version, 1)
                quote = { ...quote, review_status: 'pending_approval', allowed_actions: [], latest_approval_request_id: 51 }
                data = quote
            } else if (method === 'POST' && path.endsWith('/request-revision')) {
                assert.equal(body.reason, 'Internal negotiation')
                assert.equal(body.supplier_message, 'Please improve price')
                quote = { ...quote, review_status: 'revision_requested', revision_actions: ['submit_revision', 'view_history'], revision_request: { supplier_message: body.supplier_message } }
                data = quote
            } else if (method === 'POST' && path.endsWith('/revise')) {
                assert.equal(body.expected_review_version, 1)
                assert.equal(Number(body.items[0].unit_price), 900)
                quote = { ...quote, review_status: 'pending_review', review_version: 2, is_review_approved: false,
                    allowed_actions: ['confirm_review'], revision_actions: ['view_history'], items: body.items }
                data = quote
            } else {
                unexpected.push(`${method} ${path}`)
                status = 500
            }
            await route.fulfill({ status, json: { success: status === 200, data, ...(status === 409 ? { message: 'Quotation version changed. Reload before confirming review.' } : {}) } })
        })
        await page.goto(`http://127.0.0.1:${port}/__rfq_smoke`)
        await page.getByRole('button', { name: 'Periksa Penawaran' }).click()
        const action = mode === 'direct' ? 'Sahkan Quotation' : 'Ajukan Approval'
        await page.getByRole('button', { name: action, exact: true }).click()
        await page.getByRole('button', { name: 'Ya, Lanjutkan', exact: true }).click()
        if (conflict) {
            await page.getByRole('button', { name: 'Mengerti', exact: true }).click()
            await page.getByRole('alert').filter({ hasText: 'Quotation version changed' }).waitFor()
            assert.equal(await page.getByRole('button', { name: action, exact: true }).count(), 0)
            assert.ok(requests.filter(r => r.method === 'GET').length >= 2)
        } else {
            await page.getByRole('button', { name: 'Mengerti', exact: true }).click()
            if (mode === 'direct') {
                await page.getByRole('button', { name: 'Minta Revisi', exact: true }).click()
                await page.getByRole('alert').filter({ hasText: 'Alasan internal dan pesan supplier wajib diisi.' }).waitFor()
                assert.equal(requests.filter(r => r.path.endsWith('/request-revision')).length, 0)
                await page.getByLabel('Alasan internal / alasan perubahan').fill('Internal negotiation')
                await page.getByLabel('Pesan revisi untuk supplier').fill('Please improve price')
                await page.getByRole('button', { name: 'Minta Revisi', exact: true }).click()
                await page.getByRole('button', { name: 'Catat Revisi dari Supplier' }).click()
                await page.getByLabel('Alasan internal / alasan perubahan').fill('Revised supplier offer')
                await page.getByLabel('Harga satuan', { exact: true }).fill('900')
                await page.getByRole('button', { name: 'Simpan Versi Baru' }).click()
                await page.getByRole('button', { name: action, exact: true }).waitFor()
                assert.equal(quote.review_version, 2)
                assert.equal(quote.is_review_approved, false)
            } else {
                await page.getByRole('button', { name: 'Lihat Approval' }).waitFor()
                assert.equal(requests.filter(r => r.path.endsWith('/confirm-review')).length, 0)
            }
        }
        await page.getByRole('button', { name: 'Tutup', exact: true }).click()
        await page.getByLabel('Kesesuaian teknis').selectOption('compliant')
        await page.getByLabel('Alasan pemilihan (wajib)').fill('Verified delivery and specification')
        const evaluation = JSON.parse(await page.locator('#evaluation-result').textContent())
        assert.equal(evaluation.technical_compliance, 'compliant')
        assert.equal(evaluation.selection_reason, 'Verified delivery and specification')
        assert.deepEqual(unexpected, [])
        assert.deepEqual(errors, [])
        console.log(`PASS: ${name}`)
        await context.close()
    }
} finally {
    await browser?.close()
    await server.close()
}
