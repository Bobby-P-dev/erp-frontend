<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { Building2, Route } from '@lucide/vue'
import AsyncSearchPicker from '@/components/ui/AsyncSearchPicker.vue'
import { getSuppliers } from '@/services/supplierServices.js'

const props = defineProps({ form: { type: Object, required: true }, errors: { type: Object, default: () => ({}) }, readonly: Boolean })
const query = ref(''), open = ref(false), rows = ref([]), loading = ref(false), error = ref(''), page = ref(1), lastPage = ref(1)
let timer, request = 0
async function search(nextPage = 1) {
    const token = ++request
    if (!props.form.company_id) { rows.value = []; return }
    loading.value = true; error.value = ''
    try {
        const response = await getSuppliers(query.value, nextPage, { company_id: props.form.company_id, is_active: true })
        if (token !== request) return
        rows.value = (response.data || []).filter(row => Number(row.company_id || row.company?.id) === Number(props.form.company_id) && row.is_active)
        page.value = response.meta?.current_page || nextPage
        lastPage.value = response.meta?.last_page || 1
    } catch { if (token === request) error.value = 'Supplier belum dapat dimuat. Silakan coba lagi.' }
    finally { if (token === request) loading.value = false }
}
watch(open, value => { if (value) search() })
watch(query, () => { clearTimeout(timer); timer = setTimeout(() => search(), 250) })
watch(() => props.form.company_id, (value, old) => {
    request++; rows.value = []; open.value = false
    if (old && value !== old) { props.form.direct_supplier_id = null; props.form.direct_supplier_name = ''; props.form.direct_purchase_terms = { payment_terms: '', delivery_address: '', reference: '' } }
})
watch(() => props.form.procurement_route, value => {
    if (value === 'standard') { props.form.direct_supplier_id = null; props.form.direct_supplier_name = ''; props.form.direct_purchase_terms = { payment_terms: '', delivery_address: '', reference: '' } }
})
function select(row) {
    if (Number(props.form.direct_supplier_id) !== Number(row.id)) props.form.direct_purchase_terms = { payment_terms: '', delivery_address: '', reference: '' }
    props.form.direct_supplier_id = row.id; props.form.direct_supplier_name = row.name
}
onBeforeUnmount(() => { clearTimeout(timer); request++ })
</script>

<template>
    <section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs" aria-label="Jalur pengadaan">
        <div class="flex items-start gap-3"><span class="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Route class="size-5" /></span>
            <div><h2 class="text-lg font-semibold text-slate-900">Bagaimana pembeliannya?</h2><p class="mt-1 text-sm text-slate-500">Tentukan jalur sesuai kesiapan supplier dan harga barang.</p></div></div>
        <fieldset v-if="!readonly" class="grid gap-3 sm:grid-cols-2">
            <legend class="sr-only">Pilih jalur pengadaan</legend>
            <label v-for="option in [{ value: 'standard', title: 'Cari supplier melalui pengadaan', text: 'PR disetujui → rencana pengadaan → proses pembelian.' }, { value: 'direct_supplier', title: 'Supplier sudah ditentukan / repeat order', text: 'PR disetujui → langsung buat PO untuk supplier pilihan.' }]" :key="option.value"
                class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors" :class="form.procurement_route === option.value ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-100' : 'border-slate-200 hover:border-blue-200'">
                <input v-model="form.procurement_route" type="radio" name="procurement-route" :value="option.value" class="mt-1 size-4 accent-blue-700" />
                <span><span class="block text-sm font-semibold text-slate-900">{{ option.title }}</span><span class="mt-1 block text-sm leading-relaxed text-slate-600">{{ option.text }}</span></span>
            </label>
        </fieldset>
        <div v-if="form.procurement_route === 'direct_supplier'" class="space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4 sm:p-5">
            <template v-if="!readonly">
                <div><p class="mb-2 text-sm font-medium text-slate-700">Supplier tujuan <span class="text-rose-600">*</span></p>
                    <AsyncSearchPicker id="pr-direct-supplier" v-model:open="open" v-model:query="query" trigger-label="Pilih supplier tujuan" search-label="Cari supplier tujuan" :value-label="form.direct_supplier_name" :rows="rows" :selected-ids="form.direct_supplier_id ? [form.direct_supplier_id] : []" :loading="loading" :error="error" :invalid="Boolean(errors.direct_supplier_id)" :page="page" :last-page="lastPage" @select="select" @page="search" @retry="search()"><template #icon><Building2 class="size-4" /></template></AsyncSearchPicker>
                    <p v-if="errors.direct_supplier_id" role="alert" class="mt-2 text-sm text-rose-600">{{ errors.direct_supplier_id }}</p></div>
                <div class="grid gap-4 sm:grid-cols-2">
                    <label class="text-sm font-medium text-slate-700">Referensi harga / PO sebelumnya<input v-model="form.direct_purchase_terms.reference" maxlength="255" placeholder="Contoh: PO-2026-018 / penawaran 12 November" class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal" /></label>
                    <label class="text-sm font-medium text-slate-700">Ketentuan pembayaran<input v-model="form.direct_purchase_terms.payment_terms" maxlength="255" placeholder="Contoh: 30 hari setelah invoice" class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal" /></label>
                    <label class="text-sm font-medium text-slate-700 sm:col-span-2">Alamat pengiriman<textarea v-model="form.direct_purchase_terms.delivery_address" maxlength="2000" rows="2" placeholder="Alamat penerimaan barang" class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal" /></label>
                </div>
            </template>
            <template v-else><p class="font-semibold text-slate-900">{{ form.direct_supplier_name }} · Langsung ke PO</p><dl class="grid gap-3 text-sm sm:grid-cols-2"><div><dt class="text-slate-500">Referensi harga</dt><dd>{{ form.direct_purchase_terms.reference || 'Belum diisi' }}</dd></div><div><dt class="text-slate-500">Pembayaran</dt><dd>{{ form.direct_purchase_terms.payment_terms || 'Belum diisi' }}</dd></div><div class="sm:col-span-2"><dt class="text-slate-500">Alamat pengiriman</dt><dd class="whitespace-pre-line">{{ form.direct_purchase_terms.delivery_address || 'Belum diisi' }}</dd></div></dl></template>
            <p class="text-sm leading-relaxed text-blue-800">Isi harga satuan yang sudah disepakati pada daftar barang. Supplier, jumlah, harga dan ketentuan ini menjadi dasar approval PR dan PO. Satu PR untuk satu supplier.</p>
        </div>
        <p v-else-if="readonly" class="text-sm text-slate-600">Jalur pengadaan standar melalui rencana pengadaan setelah PR disetujui.</p>
    </section>
</template>
