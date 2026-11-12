// Isolated API fixtures; never writes live RFQ data.
import {createServer} from 'vite'
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
import assert from 'node:assert/strict'
const harness=`import {createApp,h} from 'vue';import {createPinia} from 'pinia';import {createRouter,createMemoryHistory,RouterView} from 'vue-router';import Comparison from '/src/views/purchasing/RfqComparisonView.vue';import Dialog from '/src/components/ui/GlobalAlertDialog.vue';import api from '/src/services/api.js';import '/src/style.css';api.defaults.baseURL=location.origin;const router=createRouter({history:createMemoryHistory(),routes:[{path:'/',redirect:'/rfqs/8/comparison'},{path:'/rfqs/:id/comparison',name:'comparison',component:Comparison},...['user.dashboard','user.purchasing','user.purchasing.rfq','user.purchasing.rfq.detail','user.purchasing.orders','user.purchasing.orders.detail'].map((name,i)=>({path:'/destination/'+i+'/:id?',name,component:{render:()=>h('p','destination')}}))]});const app=createApp({render:()=>h('div',[h(RouterView),h(Dialog)])});app.use(createPinia());app.use(router);router.replace('/rfqs/8/comparison').then(()=>app.mount('#app'));`
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'comparison-preview',resolveId:id=>id==='virtual:comparison-preview'?'\0comparison-preview':null,load:id=>id==='\0comparison-preview'?harness:null,configureServer(v){v.middlewares.use('/__comparison',async(req,res)=>{res.setHeader('Content-Type','text/html');res.end(await v.transformIndexHtml('/__comparison','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f9fc"><main style="padding:24px"><div id="app"></div></main><script type="module" src="/@id/virtual:comparison-preview"></script></body></html>'))})}}]})
const supplier=(id)=>({quotation_id:id,supplier_id:id,quotation_number:'SQ-000'+id,supplier_name:id===1?'CV Baut Pratama Sentosa':'PT United Tractors Pandu Engineering',vendor_quotation_reference:'REF-'+id,currency:'IDR',comparison_exchange_rate:1,validity_status:'valid',valid_until:'2026-12-10',review_status:'approved',review_version:1,is_review_approved:true,review_mode:'direct',can_award:true,can_create_purchase_order:true,base_subtotal:id===1?1200000:444440,base_tax_amount:id===1?132000:48888,base_shipping_cost:0,base_total_amount:id===1?1332000:493328,total_amount:id===1?1332000:493328,tax_rate:11,payment_terms:'Tempo 30 hari',lead_time_days:7,is_total_cost_comparable:true,is_lowest_total_cost:id===2})
const offer=id=>({quoted:true,supplier_quotation_item_id:100+id,offered_quantity:50,base_unit_price:id===1?60000:22222,unit_price:id===1?60000:22222,base_subtotal:id===1?1200000:444440,delta_target_price:id===1?10000:-27778,is_lowest_unit_price:id===2,is_awarded:false,awarded_quantity:0,notes:'Sertifikat material disertakan',item_description:'Material Produksi',brand:'Material SNI',lead_time_days:7})
const base=()=>({rfq:{id:8,rfq_number:'RFQ-2026-000005',status:'evaluation',is_awarded:false,purchase_orders:[]},comparison_currency:'IDR',target_price_currency:'IDR',statistics:{total_items:1,total_quotations_received:2,total_suppliers_invited:2},suppliers:[supplier(1),supplier(2)],items_matrix:[{rfq_item_id:10,item_name:'Material Produksi',item_code:'MAT-001',item_specifications:'Material produksi sesuai spesifikasi teknis',target_quantity:50,target_price:50000,unit_name:'KG',vendor_offers:{1:offer(1),2:offer(2)}}],award_decisions:[]})
let browser
try {
 await server.listen()
 browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH ? {executablePath:process.env.CHROME_EXECUTABLE_PATH} : {})})
 const url='http://127.0.0.1:'+server.httpServer.address().port+'/__comparison'
 for (const width of [1440,1024,390]) {
  const page=await browser.newPage({viewport:{width,height:1000}})
  let data=base()
  const mutations=[], errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/api/**',async route=>{
   const req=route.request()
   if(req.method()!=='GET') {
    const payload=req.postDataJSON()
    mutations.push(payload)
    data.award_decisions=payload.awards.map((award,index)=>({...award,id:index+1,review_version:1,action:'selected',evaluation:award,snapshot:{}}))
    for(const offer of Object.values(data.items_matrix[0].vendor_offers)) {
     const award=payload.awards.find(row=>row.supplier_quotation_item_id===offer.supplier_quotation_item_id)
     offer.is_awarded=!!award
     offer.awarded_quantity=award?.awarded_quantity || 0
    }
    await route.fulfill({json:{data:[]}})
   } else await route.fulfill({json:{data}})
  })
  await page.goto(url)
  const open=page.getByRole('button',{name:'Evaluasi & pilih pemenang',exact:true})
  await open.click()
  const dialog=page.getByRole('dialog',{name:'Evaluasi & pilih pemenang',exact:true})
  await dialog.getByRole('combobox').selectOption('1')
  await dialog.getByRole('spinbutton').fill('40')
  await dialog.getByRole('button',{name:'Tambah supplier',exact:true}).click()
  const selects=dialog.getByRole('combobox')
  assert.equal(await selects.nth(1).locator('option[value="1"]').getAttribute('disabled'),'')
  await selects.nth(1).selectOption('2')
  const quantities=dialog.getByRole('spinbutton')
  assert.equal(await quantities.nth(1).inputValue(),'10')
  assert.equal(await quantities.nth(1).getAttribute('max'),'10')
  await quantities.nth(1).fill('11')
  assert.equal(await quantities.nth(1).inputValue(),'10')
  // Exercise the requested 10 + 40 split after checking the inverse limit.
  await quantities.nth(0).fill('10')
  await quantities.nth(1).fill('40')
  await page.screenshot({path:`/tmp/rfq-split-allocation-${width}.png`,fullPage:true})
  await dialog.getByRole('button',{name:'Lanjut ke evaluasi',exact:true}).click()
  const reasons=dialog.getByRole('textbox',{name:'Mengapa supplier ini dipilih?',exact:false})
  assert.equal(await reasons.count(),2)
  await reasons.nth(0).fill('Supplier A menyediakan 10 unit')
  await reasons.nth(1).fill('Supplier B menyediakan sisa 40 unit')
  await dialog.getByRole('button',{name:'Periksa keputusan',exact:true}).click()
  await dialog.getByText('10 KG',{exact:true}).waitFor()
  await dialog.getByText('40 KG',{exact:true}).waitFor()
  await dialog.getByRole('button',{name:'Tetapkan pemenang',exact:true}).click()
  await page.getByRole('button',{name:'Ya, Lanjutkan',exact:true}).click()
  await page.getByRole('button',{name:'Mengerti',exact:true}).click()
  await dialog.waitFor({state:'hidden'})
  assert.deepEqual(mutations[0].awards.map(row=>[row.supplier_quotation_item_id,row.awarded_quantity]),[[101,10],[102,40]])
  await open.click()
  assert.equal(await dialog.getByRole('spinbutton').count(),2)
  assert.equal(await dialog.getByRole('spinbutton').nth(0).inputValue(),'10')
  assert.equal(await dialog.getByRole('spinbutton').nth(1).inputValue(),'40')
  await dialog.getByRole('button',{name:'Lanjut ke evaluasi',exact:true}).click()
  assert.equal(await reasons.nth(0).inputValue(),'Supplier A menyediakan 10 unit')
  assert.equal(await reasons.nth(1).inputValue(),'Supplier B menyediakan sisa 40 unit')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.deepEqual(errors,[])
  console.log(`${width}: PASS split 10+40, max 10, duplicate disabled, two evaluations, preview, save payload and reopen`)
  await page.close()
 }
} finally { await browser?.close(); await server.close() }
