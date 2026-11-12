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
  const page=await browser.newPage({viewport:{width,height:1100}})
  const data=base(),errors=[]
  Object.assign(data.suppliers[0], {payment_terms:'Tempo 60 hari sesuai kontrak pengadaan dan penerimaan barang di gudang',base_total_amount:5383500,base_subtotal:4850000,base_tax_amount:533500,total_amount:5383500})
  Object.assign(data.suppliers[1], {payment_terms:null,lead_time_days:0,valid_until:null,base_total_amount:5272500,base_subtotal:4750000,base_tax_amount:522500,total_amount:5272500})
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/api/**',route=>route.fulfill({json:{data}}))
  await page.goto(url)
  const section=page.locator('details.supplier-cost-section')
  await section.locator(':scope > summary').click()
  const cards=section.locator('article.supplier-cost-card')
  assert.equal(await cards.count(),2)
  await cards.nth(1).getByText('Total terendah · cakupan setara',{exact:true}).waitFor()
  const first=cards.first().locator('details'), second=cards.nth(1).locator('details')
  await first.locator('summary').click()
  assert.equal(await first.getAttribute('open'),'')
  assert.equal(await second.getAttribute('open'),null)
  await first.getByRole('heading',{name:'Komponen biaya',exact:true}).waitFor()
  assert.match(await first.getByRole('region',{name:'Breakdown biaya'}).textContent(),/4.850.000/)
  assert.match(await first.textContent(),/Rp\s*0/)
  await second.locator('summary').focus()
  await page.keyboard.press('Enter')
  await second.getByText('0 hari',{exact:true}).waitFor()
  assert.equal(await second.getByText('Belum tersedia',{exact:true}).count(),2)
  assert.match(await second.textContent(),/1 IDR = 1 IDR/)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await section.scrollIntoViewIfNeeded()
  await page.screenshot({path:`/tmp/rfq-supplier-costs-${width}.png`,fullPage:true})
  await second.locator('summary').focus()
  await page.keyboard.press('Space')
  assert.equal(await second.getAttribute('open'),null)
  assert.equal(await first.getAttribute('open'),'')
  await section.getByText('Cara membaca perbandingan',{exact:true}).click()
  await section.getByText('Harga satuan belum termasuk pajak dan ongkir.',{exact:false}).waitFor()
  // Exercise unavailable conversion and blocked award without hiding the reasons.
  await page.route('**/api/**',route=>{
   Object.assign(data.suppliers[0],{base_total_amount:null,base_subtotal:null,base_tax_amount:null,base_shipping_cost:null,comparison_exchange_rate:null,comparison_error:true,is_total_cost_comparable:false,total_cost_exclusion_reason:'invalid_exchange_rate',can_award:false,validity_status:'expired',is_expired:true})
   return route.fulfill({json:{data}})
  })
  await page.getByRole('button',{name:'Muat ulang',exact:true}).click()
  await cards.first().getByText('Belum dapat dipilih untuk award baru.',{exact:true}).waitFor()
  if(await first.getAttribute('open')===null) await first.locator('summary').click()
  await first.getByText('Kurs tidak valid; nilai konversi tidak tersedia.',{exact:true}).waitFor()
  assert.match(await first.textContent(),/1 IDR = — IDR/)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  assert.deepEqual(errors,[])
  console.log(`${width}: PASS independent cost cards, keyboard toggles, lowest total, breakdown, zero/missing values, exchange rate warnings, reading help and responsive layout`)
  await page.close()
 }
} finally {await browser?.close();await server.close()}
