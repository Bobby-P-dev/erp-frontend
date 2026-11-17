<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { compactQuantity, formatPricingMoney, pricingInput, pricingMode } from '@/utils/quotationPricing.js'

const props = defineProps({ item: { type: Object, required: true }, preview: { type: Function, required: true }, currency: { type: String, default: 'IDR' }, selectable: Boolean })
const mode = computed(() => pricingMode(props.item))
const quantity = ref('')
const showSimulation = ref(false)
const modeLabels = { legacy: 'Harga satuan', flat: 'Harga tetap per jumlah', tiered: 'Harga bertingkat', fixed_quantity: 'Harga borongan', reconfirm: 'Perlu konfirmasi jika jumlah berubah' }
watch(() => props.item, item => {
    for (const field of ['offered_quantity', 'minimum_quantity', 'price_basis_quantity']) {
        if (item[field] != null) item[field] = compactQuantity(item[field])
    }
    for (const tier of item.price_tiers || []) tier.min_quantity = compactQuantity(tier.min_quantity)
}, { immediate: true })
const result = ref(null)
const error = ref('')
const pending = ref(false)
let timer
let version = 0
const explanations = {
    reconfirm: 'Total ini hanya berlaku untuk jumlah yang Anda isi. Jika pembeli mengubah jumlah, Anda akan diminta mengirim harga final baru sebelum penetapan pemenang.',
    flat: 'Harga berlaku proporsional. Pembelian sebagian diperbolehkan mulai jumlah minimum.',
    tiered: 'Harga tingkat yang terpenuhi berlaku untuk seluruh jumlah pembelian, bukan hanya jumlah tambahannya.',
    fixed_quantity: 'Total hanya berlaku jika seluruh jumlah yang ditawarkan dibeli. Pembelian sebagian memerlukan revisi.',
}
function changeMode(event) {
    const item = props.item
    item._pricingMode = event.target.value
    item.price_input_basis ??= 'unit'
    item.entered_unit_price ??= String(item.unit_price ?? '')
    item.entered_total ??= ''
    item.minimum_quantity ??= '1'
    item.price_basis_quantity ??= String(item.offered_quantity)
    if (!item.price_tiers?.length) item.price_tiers = [{ min_quantity: '1', price_input_basis: 'unit', entered_unit_price: '' }]
    quantity.value = ''
    showSimulation.value = false
}
const request = computed(() => props.item.is_offered === false || mode.value === 'legacy' ? null : {
    rfq_item_id: props.item.rfq_item_id, item: pricingInput(props.item), quantity: String(quantity.value || props.item.offered_quantity),
})
watch(() => JSON.stringify(request.value), () => {
    clearTimeout(timer)
    const current = ++version
    result.value = null
    error.value = ''
    pending.value = !!request.value
    if (!request.value) return
    const payload = request.value
    const prices = mode.value === 'tiered' ? payload.item.price_tiers : [payload.item]
    if (!payload.item.offered_quantity.trim() || !prices.length || prices.some(price =>
        !String(price.price_input_basis === 'total' ? price.entered_total ?? '' : price.entered_unit_price ?? '').trim()
    )) {
        pending.value = false
        return
    }
    timer = setTimeout(async () => {
        try {
            const data = await props.preview(payload)
            if (current === version) result.value = data
        } catch (err) {
            if (current === version) error.value = Object.values(err.response?.data?.errors ?? {}).flat().join(' ') || err.response?.data?.message || 'Pratinjau gagal. Periksa input lalu coba lagi.'
        } finally {
            if (current === version) pending.value = false
        }
    }, 500)
}, { immediate: true })
onBeforeUnmount(() => { clearTimeout(timer); version++ })
const reasons = { requires_price_confirmation: 'Jumlah berbeda dari penawaran. Pembeli perlu meminta harga final baru kepada Anda.', below_minimum_quantity: 'Jumlah belum memenuhi minimum pembelian.', exceeds_offered_quantity: 'Jumlah melebihi ketersediaan yang ditawarkan.', requires_full_quantity: 'Borongan harus dibeli seluruhnya.' }
</script>

<template>
    <article class="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5 shadow-xs">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 flex-1"><h4 class="text-base font-semibold text-slate-900">{{ item.item_name }}</h4><p class="text-sm text-slate-600 mt-1">Kebutuhan pembeli <strong class="text-slate-900">{{ compactQuantity(item.target_quantity) }} {{ item.unit_name }}</strong></p></div>
            <label v-if="selectable" class="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 cursor-pointer">
                <input type="checkbox" :checked="item.is_offered !== false" :disabled="item._offerRequired" @change="item.is_offered = $event.target.checked" :aria-label="`Tawarkan ${item.item_name}`" class="h-4 w-4 accent-blue-700" />
                Tawarkan barang ini
            </label>
            <span v-else class="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{{ modeLabels[mode] }}</span>
        </div>
        <p v-if="item.is_offered === false" class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Tidak ditawarkan. Barang ini tidak disertakan dalam penawaran dan total harga. Aktifkan kembali jika tersedia.</p>
        <template v-else>
        <p v-if="selectable && item._offerRequired" class="text-xs text-amber-800">Baris penawaran sebelumnya wajib dipertahankan selama konfirmasi harga.</p>
        <p v-if="item.requested_quantity" role="status" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Pembeli meminta harga final untuk <strong>{{ compactQuantity(item.requested_quantity) }} {{ item.unit_name }}</strong>. Isi total yang Anda sepakati untuk jumlah ini; harga sebelumnya tidak dihitung proporsional.</p>
        <details class="disclosure rounded-xl border border-slate-200 bg-slate-50/60">
            <summary class="px-4 py-3 text-sm font-medium text-slate-600">Spesifikasi & merk <span class="font-normal">{{ item.brand ? `· ${item.brand}` : '· opsional' }}</span></summary>
            <div class="px-4 pb-4 space-y-3">
                <p class="text-sm text-slate-600 whitespace-pre-wrap">{{ item.item_specifications || 'Tidak ada spesifikasi tambahan dari pembeli.' }}</p>
                <label class="block text-sm text-slate-600">Merk / tipe (opsional)<input v-model="item.brand" type="text" class="field" placeholder="Nama merk atau tipe" /></label>
            </div>
        </details>
        <div class="grid gap-4 sm:grid-cols-2">
            <label class="text-sm text-slate-600">Jumlah ditawarkan ({{ item.unit_name }})<input v-model="item.offered_quantity" :readonly="!!item.requested_quantity" @blur="item.offered_quantity = compactQuantity(item.offered_quantity)" type="text" inputmode="decimal" class="field" /></label>
            <label class="text-sm text-slate-600">Waktu kirim (hari)<input v-model="item.lead_time_days" type="number" min="0" step="1" class="field" /></label>
        </div>
        <label class="block text-sm text-slate-600">Ketentuan harga
            <span class="block mt-1 text-xs font-normal text-slate-500">Pilih sesuai cara perusahaan Anda menawarkan harga.</span>
            <select :value="mode" :disabled="!!item.requested_quantity" @change="changeMode" class="field">
                <option value="legacy" :disabled="Number(item.pricing_schema_version) === 1">Harga satuan</option>
                <option value="reconfirm">Konfirmasi harga jika jumlah berubah</option><option value="flat">Harga tetap — boleh dibeli sebagian</option><option value="tiered">Harga bertingkat — lebih banyak, harga berbeda</option><option value="fixed_quantity">Borongan — harus dibeli seluruhnya</option>
            </select>
        </label>
        <label v-if="mode === 'legacy'" class="block text-sm text-slate-600">Harga per 1 {{ item.unit_name }} ({{ currency }})<input v-model="item.unit_price" type="text" inputmode="decimal" class="field" placeholder="Masukkan harga satuan" /><span v-if="item.unit_price != null && String(item.unit_price).trim() !== '' && Number(item.unit_price) === 0" class="text-emerald-700">Harga nol berarti gratis.</span></label>
        <template v-else>
            <div class="rounded-lg bg-blue-50 p-3 text-sm text-blue-900"><p>{{ explanations[mode] }}</p></div>
            <div v-if="mode === 'tiered'" class="space-y-3">
                <div v-for="(tier, index) in item.price_tiers" :key="index" class="rounded-lg border border-slate-200 bg-slate-50 p-3 grid gap-3 sm:grid-cols-3">
                    <label class="text-sm">Mulai jumlah ({{ item.unit_name }})<input v-model="tier.min_quantity" @blur="tier.min_quantity = compactQuantity(tier.min_quantity)" type="text" inputmode="decimal" class="field" /></label>
                    <label class="text-sm">Harga yang ingin Anda isi<select v-model="tier.price_input_basis" class="field"><option value="unit">Harga satuan</option><option value="total">Total pada jumlah minimum</option></select></label>
                    <label class="text-sm">{{ tier.price_input_basis === 'total' ? `Total untuk ${compactQuantity(tier.min_quantity)} ${item.unit_name}` : `Harga per 1 ${item.unit_name}` }} ({{ currency }})<input v-if="tier.price_input_basis === 'total'" v-model="tier.entered_total" type="text" inputmode="decimal" class="field" /><input v-else v-model="tier.entered_unit_price" type="text" inputmode="decimal" class="field" /></label>
                    <button type="button" @click="item.price_tiers.splice(index, 1)" :disabled="item.price_tiers.length === 1" class="text-sm text-rose-700 justify-self-start disabled:opacity-40">Hapus tingkat {{ index + 1 }}</button>
                </div>
                <button type="button" :disabled="item.price_tiers.length >= 100" @click="item.price_tiers.push({ min_quantity: '', price_input_basis: 'unit', entered_unit_price: '' })" class="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700">+ Tambah tingkat harga</button>
            </div>
            <div v-else class="grid gap-4 sm:grid-cols-2">
                <template v-if="mode === 'flat'">
                    <label class="text-sm">Harga yang ingin Anda isi<select v-model="item.price_input_basis" class="field"><option value="unit">Harga satuan</option><option value="total">Total harga untuk jumlah tertentu</option></select></label>
                    <label v-if="item.price_input_basis === 'total'" class="text-sm">Total tersebut untuk berapa {{ item.unit_name }}?<input v-model="item.price_basis_quantity" @blur="item.price_basis_quantity = compactQuantity(item.price_basis_quantity)" type="text" inputmode="decimal" class="field" /></label>
                </template>
                <label class="text-sm" :class="{ 'sm:col-span-2': ['fixed_quantity', 'reconfirm'].includes(mode) || item.price_input_basis === 'total' }">{{ mode === 'reconfirm' ? `Harga final untuk ${compactQuantity(item.offered_quantity)} ${item.unit_name}` : mode === 'fixed_quantity' ? `Total untuk seluruh ${compactQuantity(item.offered_quantity)} ${item.unit_name}` : item.price_input_basis === 'total' ? `Total untuk ${compactQuantity(item.price_basis_quantity)} ${item.unit_name}` : `Harga per 1 ${item.unit_name}` }} ({{ currency }})<input v-if="['fixed_quantity', 'reconfirm'].includes(mode) || item.price_input_basis === 'total'" v-model="item.entered_total" type="text" inputmode="decimal" class="field" /><input v-else v-model="item.entered_unit_price" type="text" inputmode="decimal" class="field" /></label>
            </div>
            <details v-if="mode === 'flat'" class="disclosure rounded-xl border border-slate-200" :open="item.minimum_quantity !== '1'">
                <summary class="px-4 py-3 text-sm font-medium text-slate-700">Minimum pembelian <span class="font-normal text-slate-500">· {{ compactQuantity(item.minimum_quantity) }} {{ item.unit_name }}</span></summary>
                <div class="px-4 pb-4"><label class="block text-sm text-slate-600">Minimum pembelian ({{ item.unit_name }})<input v-model="item.minimum_quantity" @blur="item.minimum_quantity = compactQuantity(item.minimum_quantity)" type="text" inputmode="decimal" class="field" /><span class="mt-2 block text-xs text-slate-500">Jumlah paling sedikit yang boleh dibeli. Gunakan titik untuk pecahan, misalnya 0.5.</span></label></div>
            </details>
            <div class="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3" aria-live="polite">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm font-semibold text-blue-900">Perkiraan harga barang</p>
                    <button type="button" :aria-expanded="showSimulation" @click="showSimulation = !showSimulation; quantity = ''" class="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">{{ showSimulation ? 'Tutup simulasi' : 'Coba jumlah lain' }}</button>
                </div>
                <label v-if="showSimulation" class="block text-sm font-medium">Coba jumlah pembelian ({{ item.unit_name }})<input v-model="quantity" type="text" inputmode="decimal" :placeholder="compactQuantity(item.offered_quantity)" class="field" /><span class="mt-1 block text-xs font-normal text-slate-500">Simulasi saja, tidak mengubah jumlah yang Anda tawarkan.</span></label>
                <p v-if="pending" class="text-sm text-slate-500">Menghitung pratinjau…</p>
                <p v-else-if="error" role="alert" class="text-sm text-rose-700">{{ error }}</p>
                <p v-else-if="!result" class="text-sm text-slate-500">Lengkapi jumlah dan harga untuk melihat pratinjau.</p>
                <template v-else-if="result">
                    <p v-if="!result.eligible" class="text-sm text-amber-800">{{ reasons[result.reason] || result.reason }}</p>
                    <template v-else><p class="text-base font-semibold text-blue-900">Total barang: {{ formatPricingMoney(result.line_subtotal, currency) }}</p><p class="text-xs text-slate-600">Untuk {{ compactQuantity(result.quantity) }} {{ item.unit_name }} · Ekuivalen {{ formatPricingMoney(result.effective_unit_price, currency) }} / {{ item.unit_name }}<span v-if="result.selected_min_quantity"> · Tingkat mulai {{ compactQuantity(result.selected_min_quantity) }}</span></p><p v-if="Number(result.rounding_adjustment) !== 0" class="text-xs text-slate-500">Penyesuaian pembulatan: {{ formatPricingMoney(result.rounding_adjustment, currency) }}</p><p v-if="Number(result.line_subtotal) === 0" class="text-sm text-emerald-700">Gratis pada jumlah ini.</p></template>
                </template>
            </div>
        </template>
        <p class="text-xs text-slate-500">Harga dalam {{ currency }}, sebelum pajak dan ongkos kirim. Gunakan titik untuk pecahan, tanpa pemisah ribuan.</p>
        </template>
    </article>
</template>

<style scoped>
.field { display: block; width: 100%; margin-top: .375rem; border: 1px solid #cbd5e1; border-radius: .5rem; padding: .625rem .75rem; background: white; color: #0f172a; font-size: .875rem; }
.disclosure > summary { cursor: pointer; }
.disclosure > summary:hover { color: #1d4ed8; background: #eff6ff; border-radius: .75rem; }
.disclosure > summary:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
.field:focus { outline: 2px solid #bfdbfe; border-color: #2563eb; }
</style>
