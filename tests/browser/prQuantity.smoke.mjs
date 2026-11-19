import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const harness = `import { createApp, h, reactive } from 'vue';
import Row from '/src/components/purchasing/requisition/form/PRItemRow.vue';
import '/src/style.css';
const row = reactive({ entry_mode: 'custom', item_name: 'Material', quantity: 1, estimated_price: 1000 });
window.row = row;
createApp({ render: () => h('main', { style: 'padding:24px;min-height:1800px' }, [h(Row, {
 row, index: 0, totalItems: 1, itemOptions: [], unitOptions: [], accountingCategoryOptions: [], accountingSubcategoryOptions: [], accountingAccountOptions: [], getItemError: () => ''
}), h('button', { onClick: () => window.savedQuantity = Number(row.quantity) }, 'Simpan draft')]) }).mount('#app');`
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
 name: 'pr-quantity-fixture', resolveId: id => id === 'virtual:pr-quantity' ? '\0pr-quantity' : null,
 load: id => id === '\0pr-quantity' ? harness : null,
 configureServer(vite) { vite.middlewares.use('/__quantity', async (_req, res) => {
 res.setHeader('Content-Type', 'text/html');
 res.end(await vite.transformIndexHtml('/__quantity', '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script type="module" src="/@id/virtual:pr-quantity"></script>'));
 }) }
}] })
let browser
try {
 await server.listen();
 browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
 for (const width of [1440, 390]) {
 const page = await browser.newPage({ viewport: { width, height: 1000 } });
 const errors = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__quantity`);
 const quantity = page.locator('input[type="number"]').first();
 await quantity.fill('30'); await quantity.hover();
 await page.mouse.wheel(0, 100); await page.waitForTimeout(100);
 await quantity.hover(); await page.mouse.wheel(0, 100); await page.waitForTimeout(100);
 console.log(`Quantity after wheel at ${width}px:`, await quantity.inputValue());
 assert.equal(await quantity.inputValue(), '30');
 await page.getByRole('button', { name: 'Simpan draft', exact: true }).click();
 assert.equal(await page.evaluate(() => window.savedQuantity), 30);
 await quantity.fill('30.5'); await page.getByRole('button', { name: 'Simpan draft', exact: true }).click();
 assert.equal(await page.evaluate(() => window.savedQuantity), 30.5);
 assert.deepEqual(errors, []);
 console.log(`PASS ${width}px: quantity remains 30 after wheel, draft value and decimals preserved`);
 await page.close();
 }
} finally { await browser?.close(); await server.close(); }
