// Isolated component/composable fixtures; no requests reach the ERP database.
import { createServer } from 'vite'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')

const harness = `
import { createApp, h, onMounted } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Items from '/src/components/purchasing/rfq/portal/SupplierRfqItemsTable.vue';
import Costs from '/src/components/purchasing/rfq/portal/SupplierRfqCostSidebar.vue';
import Manual from '/src/components/purchasing/rfq/detail/RfqManualQuotationModal.vue';
import Dialog from '/src/components/ui/GlobalAlertDialog.vue';
import { useSupplierPortalRfqForm } from '/src/composables/purchasing/useSupplierPortalRfqForm.js';
import { useRfqDetail } from '/src/composables/purchasing/useRfqDetail.js';
import api from '/src/services/api.js'; import '/src/style.css';
api.defaults.baseURL = location.origin;
const manual = new URLSearchParams(location.search).has('manual');
const app = createApp({setup() {
 const state = manual ? useRfqDetail() : useSupplierPortalRfqForm();
 window.form = state;
 onMounted(async () => { if (manual) { await state.fetchRfqDetail(); state.openManualModal(2) } else await state.loadPortalData() });
 return () => h('main', {class:'p-4 sm:p-8 max-w-6xl mx-auto space-y-5'}, [
 manual ? h(Manual, {isOpen: state.isModalOpen.value, manualForm: state.manualForm.value,
 invitedSuppliers:[{supplier_id:2,supplier:{id:2,name:'Supplier A'}}], taxes:[],
 modalItemsSubtotal:state.modalItemsSubtotal.value, modalGrandTotal:state.modalGrandTotal.value,
 onSubmit:state.submitManualQuotation}) : h('form', {onSubmit:e=>{e.preventDefault();state.handleSubmit()}}, [
 h(Items,{items:state.quoteForm.value.items,token:'partial'}),
 h(Costs,{quoteForm:state.quoteForm.value,subtotalAmount:state.subtotalAmount.value,taxAmount:state.taxAmount.value,
 shippingAmount:state.shippingAmount.value,grandTotalAmount:state.grandTotalAmount.value}),
 h('button',{type:'submit',class:'border rounded-lg p-3 bg-blue-700 text-white'},'Kirim fixture')]), h(Dialog)]);
}});
const router = createRouter({history:createMemoryHistory(),routes:[{path:'/:token/:id',component:{render:()=>null}}]});
app.use(createPinia()); app.use(router); router.push('/partial/8').then(()=>app.mount('#app'));
`
const server = await createServer({ server: {host:'127.0.0.1',port:0}, plugins: [{name:'partial-quotation-fixture',
    resolveId: id => id === 'virtual:partial-quotation' ? '\0partial-quotation' : null,
    load: id => id === '\0partial-quotation' ? harness : null,
    configureServer(v) { v.middlewares.use('/__partial', async (req,res) => {
        res.setHeader('Content-Type','text/html')
        res.end(await v.transformIndexHtml('/__partial','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f8fafc"><div id="app"></div><script type="module" src="/@id/virtual:partial-quotation"></script></body></html>'))
    }) },
}] })
const rfq = { id:8, status:'published', source_type:'initial_need', can_receive_quotation:true,
    server_now:'2026-11-16T10:00:00+07:00', deadline_at:'2026-12-01T23:59:59+07:00',
    items:[{id:10,item_name:'Material katalog',target_quantity:'20.0000',unit_name:'KG',unit:{name:'KG'}},
        {id:11,item_name:'Barang custom',target_quantity:'5.0000',unit_name:'KG',unit:{name:'KG'}}], quotations:[], rfq_suppliers:[] }
let browser
try {
    await server.listen()
    browser = await chromium.launch({headless:true, ...(process.env.CHROME_EXECUTABLE_PATH ? {executablePath:process.env.CHROME_EXECUTABLE_PATH} : {})})
    for (const width of [1440,390]) for (const manual of [false,true]) {
        const page = await browser.newPage({viewport:{width,height:1000}})
        const errors = [], submissions = [], previews = []
        page.on('pageerror', error => errors.push(error.message))
        await page.route('**/api/**', async route => {
            const request = route.request(), path = new URL(request.url()).pathname
            if (path.endsWith('/pricing-preview')) { previews.push(request.postDataJSON()); return route.fulfill({json:{data:{eligible:true,quantity:'20',line_subtotal:'2000',effective_unit_price:'100',rounding_adjustment:'0'}}}) }
            if (request.method() === 'POST') {
                submissions.push(request.postData())
                return route.fulfill({status:201,json:{data:{id:1}}})
            }
            if (path.endsWith('/taxes') || path.includes('/taxes/')) return route.fulfill({json:{data:[]}})
            return route.fulfill({json:{data: manual ? rfq : {rfq,portal:{can_submit:true,can_revise:false}}}})
        })
        await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/__partial'+(manual?'?manual=1':''))
        const cards = page.locator('article').filter({has:page.getByRole('checkbox')})
        await cards.nth(1).waitFor()
        await page.evaluate(manual => {
            const draft = manual ? window.form.manualForm.value : window.form.quoteForm.value
            draft.vendor_quotation_reference = 'PARTIAL-001'
            draft.items[0].unit_price = '100'
        }, manual)
        const second = cards.nth(1)
        // Use keyboard interaction, preserving prices while collapsing optional rows.
        await second.getByRole('checkbox').focus()
        await page.keyboard.press('Space')
        await second.getByText('Tidak ditawarkan.',{exact:false}).waitFor()
        assert.equal(await second.locator('input:not([type=checkbox])').count(),0)
        assert.equal(await page.evaluate(manual => (manual ? window.form.modalItemsSubtotal : window.form.subtotalAmount).value, manual),2000)
        await second.getByRole('checkbox').check()
        await second.locator('input[inputmode=decimal]').last().fill('999')
        await second.getByRole('checkbox').uncheck()
        await second.getByRole('checkbox').check()
        assert.equal(await second.locator('input[inputmode=decimal]').last().inputValue(),'999')
        await second.getByRole('checkbox').uncheck()
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
        await page.screenshot({path:'/tmp/rfq-partial-'+(manual?'manual':'portal')+'-'+width+'.png',fullPage:true})
        // Submit using the real composable. Portal requires confirmation before the request.
        await page.evaluate(manual => { (manual ? window.form.submitManualQuotation : window.form.handleSubmit)() }, manual)
        if (!manual) await page.getByRole('button',{name:'Ya, Kirim Penawaran',exact:true}).click()
        await page.waitForFunction(() => !!document.querySelector('[role=alertdialog]'))
        assert.equal(submissions.length,1)
        const payload = manual ? JSON.parse(submissions[0]).items : JSON.parse(/name="items"\r\n\r\n([^\r]+)/.exec(submissions[0])[1])
        assert.deepEqual(payload.map(item=>item.rfq_item_id),[10])
        assert.equal(payload[0].unit_price,'100')
        assert.equal('is_offered' in payload[0],false)
        assert.deepEqual(errors,[])
        console.log(width+' '+(manual?'manual':'portal')+': PASS toggle, keyboard, retained input, subtotal, subset payload, responsive layout')
        await page.close()
    }
} finally { await browser?.close(); await server.close() }
