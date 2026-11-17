// Isolated fixtures: generates real PDFs without changing application data.
import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const harness = `
import { createApp, h, ref } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Detail from '/src/components/purchasing/PurchaseRequisitionDetailModal.vue';
import pdfMake from 'pdfmake/build/pdfmake.js';
import { generatePurchaseRequisitionPdf } from '/src/utils/pdf/purchaseRequisitionPdfGenerator.js';
import { generateGoodsHandoverPdf } from '/src/utils/pdf/goodsHandoverPdfGenerator.js';
import '/src/style.css';
const createPdf = pdfMake.createPdf.bind(pdfMake);
window.definitions = [];
pdfMake.createPdf = definition => { window.definitions.push(definition); return createPdf(definition); };
const item = ref({ id: 1, pr_number: 'PR-TEST', status: 'pending_approval', can_be_edited: true, can_be_deleted: true, items: [] });
window.approve = () => item.value = { ...item.value, status: 'approved', can_be_edited: false, can_be_deleted: false };
const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/edit/:id', name: 'user.purchasing.requisitions.edit', component: {} }] });
createApp({ setup() { const open = ref(false); return () => [
 h('button', { onClick: () => open.value = true }, 'Detail PR'),
 h(Detail, { modelValue: open.value, 'onUpdate:modelValue': value => open.value = value, item: item.value, allowDelete: true, onDeletePR: () => window.deleteRequested = true })
]; } }).use(createPinia()).use(router).mount('#app');
const canvas = document.createElement('canvas'); canvas.width = 180; canvas.height = 70;
const context = canvas.getContext('2d'); context.font = '24px cursive'; context.fillText('Signature', 5, 40);
const signature_url = canvas.toDataURL('image/png');
document.querySelector('#pr').onclick = () => generatePurchaseRequisitionPdf({
 id: 1, status: 'approved', pr_number: 'PR-TEST', request_date: '2026-11-16',
 procurement_route: 'direct_supplier', direct_supplier: { name: 'Repeat Supplier' },
 direct_purchase_terms: { reference: 'Previous PO', payment_terms: 'Net 30', delivery_address: 'Factory' },
 items: [{ item_name: 'Material A', quantity: 20, estimated_price: 1000, unit: { name: 'kg' } }]
}, { lifecycleData: { stages: [
 { key: 'pr_submission', actor: { name: 'Pemohon', signature_url } },
 { key: 'pr_approval', levels: [{ step_name: 'Manager', status: 'approved', actions: [
 { action: 'approve', signature_url, user: { name: 'Atasan' }, acted_at: '2026-11-16' }
 ] }] }
] } });
document.querySelector('#bast').onclick = () => generateGoodsHandoverPdf({
 id: 1, handover_number: 'BAST-TEST', recipient_name: 'Penerima',
 items: [{ item_name: 'Material A', quantity: 20, unit: { name: 'kg' } }]
});
const revoke = URL.revokeObjectURL.bind(URL);
window.revoked = [];
URL.revokeObjectURL = url => { window.revoked.push(url); revoke(url); };
`
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'pdf-preview-fixture',
    resolveId: id => id === 'virtual:pdf-test' ? '\0pdf-test' : null,
    load: id => id === '\0pdf-test' ? harness : null,
    configureServer(vite) {
        vite.middlewares.use('/__pdf-test', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await vite.transformIndexHtml('/__pdf-test', '<meta name="viewport" content="width=device-width, initial-scale=1"><button id="pr">PR PDF</button><button id="bast">BAST PDF</button><div id="app"></div><script type="module" src="/@id/virtual:pdf-test"></script>'))
        })
    },
}] })
let browser
try {
    await server.listen()
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] })
    for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true })
        const errors = [], downloads = []
        page.on('pageerror', error => errors.push(error.message))
        page.on('download', download => downloads.push(download))
        await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__pdf-test`)
        for (const [button, filename] of [['PR PDF', 'PR-TEST_Lembar_Persetujuan.pdf'], ['BAST PDF', 'BAST-TEST_BAST_Serah_Terima.pdf']]) {
            await page.getByRole('button', { name: button, exact: true }).click()
            const dialog = page.getByRole('dialog')
            await dialog.waitFor()
            assert.equal(downloads.length, button === 'PR PDF' ? 0 : 1)
            const url = await dialog.locator('iframe').getAttribute('src')
            const header = await page.evaluate(async url => (await (await fetch(url)).text()).slice(0, 5), url)
            assert.equal(header, '%PDF-')
            const signatureCounts = await page.evaluate(() => {
                let images = 0, qr = 0;
                const visit = value => { if (!value || typeof value !== 'object') return;
                    if (value.image) images++; if (value.qr) qr++;
                    Object.values(value).forEach(visit);
                };
                visit(window.definitions.at(-1)); return { images, qr };
            })
            assert.equal(signatureCounts.qr, 0)
            if (button === 'PR PDF') assert.equal(signatureCounts.images, 2)
            if (button === 'PR PDF') {
                const definition = await page.evaluate(() => JSON.stringify(window.definitions.at(-1)))
                for (const text of ['Repeat Supplier', 'Previous PO', 'Net 30', 'Factory']) assert.ok(definition.includes(text))
            }
            await page.waitForFunction(() => !document.querySelector('dialog button:last-child').disabled)
            const pending = page.waitForEvent('download')
            await dialog.getByRole('button', { name: 'Unduh PDF', exact: true }).click()
            const download = await pending
            assert.equal(download.suggestedFilename(), filename)
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
            await dialog.getByRole('button', { name: 'Tutup', exact: true }).click()
            assert.equal(await page.getByRole('dialog').count(), 0)
            assert.ok(await page.evaluate(url => window.revoked.includes(url), url))
        }
        await page.getByRole('button', { name: 'Detail PR', exact: true }).click()
        await page.getByRole('link', { name: 'Edit PR', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Hapus PR', exact: true }).click()
        assert.equal(await page.evaluate(() => window.deleteRequested), true)
        await page.evaluate(() => window.approve())
        await page.getByRole('button', { name: 'Preview PDF', exact: true }).waitFor()
        assert.equal(await page.getByRole('link', { name: 'Edit PR', exact: true }).count(), 0)
        assert.equal(await page.getByRole('button', { name: 'Hapus PR', exact: true }).count(), 0)
        assert.deepEqual(errors, [])
        console.log(`PASS ${width}px: real PR image-signature PDF and BAST preview before download, filenames, close and URL cleanup`)
        await page.close()
    }
} finally { await browser?.close(); await server.close() }
