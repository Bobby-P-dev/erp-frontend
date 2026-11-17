<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { CheckCircle2, FilePlus2, ArrowRight, RefreshCw } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAuthStore } from '@/stores/auth.js'
import { createRequisitionFromRfq, previewAwardPricing } from '@/services/rfqServices.js'
import { formatCurrency } from '@/composables/useFormatter.js'
import { pricingReasonText } from '@/utils/rfqComparison.js'
import { newRequisitionKey, quantityUnits, requisitionRows, selectionErrors, selectionMaximum, boundedRequisitionQuantity } from '@/utils/rfqRequisition.js'

const props = defineProps({ matrix: { type: Object, required: true }, unavailable: Boolean })
const emit = defineEmits(['refresh'])
const auth = useAuthStore()
const open = ref(false), step = ref(1), busy = ref(false), errors = ref([])
const selections = ref({}), previews = ref([]), created = ref(null), pending = ref(null)
const date = new Date()
const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const form = ref({ request_date: today, required_date: '', purpose: '', notes: '' })
const divisionId = computed(() => auth.profile?.division?.id || auth.profile?.division_id)
const metadata = computed(() => props.matrix.requisition_selection)
const rows = computed(() => requisitionRows(props.matrix, selections.value))
const currency = computed(() => previews.value[0]?.currency || rows.value[0]?.supplier.currency || 'IDR')
const total = computed(() => previews.value.reduce((sum, preview) => sum + Number(preview.total_amount), 0))
const qty = value => Number(value).toLocaleString('id-ID', { maximumFractionDigits: 4 })
const storageKey = computed(() => `rfq-pr-attempt:${auth.user?.id}:${props.matrix.rfq.id}`)
const maximum = (item, offer) => selectionMaximum(item, offer, selections.value, metadata.value)
// Vue tracks the `in` proxy trap; Object.hasOwn alone does not subscribe the render to a new key.
const selected = offer => offer.supplier_quotation_item_id in selections.value
const canSelect = (item, supplier, offer) => metadata.value?.quotations?.[supplier.quotation_id]?.eligible
    && (quantityUnits(maximum(item, offer)) ?? 0n) > 0n
const toggle = (item, offer, checked) => {
    if (checked) selections.value[offer.supplier_quotation_item_id] = maximum(item, offer).replace(/\.?0+$/, '')
    else delete selections.value[offer.supplier_quotation_item_id]
}
const updateQuantity = (item, offer, event, finalize = false) => {
    const id = offer.supplier_quotation_item_id
    const text = finalize ? event.target.value.replace(/\.$/, '') : event.target.value
    const value = boundedRequisitionQuantity(text, maximum(item, offer), selections.value[id])
    selections.value[id] = value
    // Restore the DOM too when the clamped value is unchanged in Vue's state.
    event.target.value = value
}
const linePrice = row => previews.value.flatMap(p => p.lines).find(line => line.supplier_quotation_item_id === row.offer.supplier_quotation_item_id)
const clearAttempt = () => {
    pending.value = null
    try { sessionStorage.removeItem(storageKey.value) } catch { /* In-memory retry remains available. */ }
}
// Preserve the exact request across a lost response or page reload. Never generate a new key on retry.
try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey.value) || 'null')
    if (saved?.idempotency_key && Array.isArray(saved.items)) {
        pending.value = saved
        open.value = true
        errors.value = ['Ada penyimpanan yang belum terkonfirmasi. Periksa hasil dengan mengirim ulang permintaan yang sama.']
    }
} catch { /* Storage may be unavailable. */ }

watch(selections, () => { previews.value = []; step.value = 1; errors.value = [] }, { deep: true })
watch(() => props.matrix, () => {
    if (!pending.value && !created.value) { previews.value = []; step.value = 1 }
})
const errorMessages = error => {
    const data = error.response?.data
    return [data?.message || 'Koneksi terputus. Coba lagi.', ...Object.entries(data?.errors || {}).flatMap(([field, messages]) => {
        const index = /^items\.(\d+)/.exec(field)?.[1]
        const row = index === undefined ? null : rows.value[Number(index)]
        return (Array.isArray(messages) ? messages : [messages]).map(message => row ? `${row.item.item_name} · ${row.supplier.supplier_name}: ${message}` : message)
    })]
}
const checkPrices = async () => {
    errors.value = selectionErrors(props.matrix, selections.value)
    if (errors.value.length || props.unavailable || busy.value) return
    busy.value = true
    try {
        const ids = [...new Set(rows.value.map(row => row.supplier.quotation_id))]
        const result = await Promise.all(ids.map(id => {
            const group = rows.value.filter(row => row.supplier.quotation_id === id)
            return previewAwardPricing(id, { expected_review_version: group[0].supplier.review_version,
                allocations: group.map(row => ({ supplier_quotation_item_id: row.offer.supplier_quotation_item_id, quantity: row.quantity })) })
        }))
        errors.value = result.flatMap(preview => preview.lines.filter(line => !line.eligible).map(line => {
            const row = rows.value.find(row => row.offer.supplier_quotation_item_id === line.supplier_quotation_item_id)
            return `${row?.item.item_name} · ${row?.supplier.supplier_name}: ${pricingReasonText(line.reason)}. Periksa syarat jumlah atau minta revisi harga supplier melalui Rincian & revisi.`
        }))
        if (!errors.value.length && result.every(preview => preview.eligible)) {
            previews.value = result
            step.value = 2
        }
    } catch (error) { errors.value = errorMessages(error) }
    finally { busy.value = false }
}
const save = async () => {
    if (busy.value || props.unavailable) return
    errors.value = []
    if (!pending.value) {
        errors.value = selectionErrors(props.matrix, selections.value)
        if (!divisionId.value) errors.value.push('Divisi profil pemohon belum tersedia. Lengkapi profil sebelum membuat PR.')
        if (!form.value.request_date || !form.value.required_date || form.value.required_date < form.value.request_date) errors.value.push('Tanggal kebutuhan harus sama atau setelah tanggal pengajuan.')
        if (!form.value.purpose.trim()) errors.value.push('Isi tujuan pengadaan.')
        if (step.value !== 2 || !previews.value.length) errors.value.push('Periksa harga penawaran terlebih dahulu.')
        if (errors.value.length) return
        pending.value = { ...form.value, purpose: form.value.purpose.trim(), division_id: Number(divisionId.value),
            idempotency_key: newRequisitionKey(), items: rows.value.map(row => ({
                supplier_quotation_item_id: row.offer.supplier_quotation_item_id,
                expected_review_version: row.supplier.review_version, quantity: row.quantity })) }
        try { sessionStorage.setItem(storageKey.value, JSON.stringify(pending.value)) } catch { /* Retry uses in-memory request. */ }
    }
    busy.value = true
    try {
        const response = await createRequisitionFromRfq(props.matrix.rfq.id, pending.value)
        created.value = response.data
        clearAttempt()
        emit('refresh')
    } catch (error) {
        errors.value = errorMessages(error)
        const status = error.response?.status
        if ([400, 403, 404, 409, 422].includes(status)) {
            clearAttempt()
            previews.value = []
            step.value = 1
            errors.value.push('Periksa pilihan dan muat ulang penawaran sebelum memeriksa harga kembali.')
        } else errors.value.push('Hasil penyimpanan belum pasti. Tombol Periksa hasil mengulang permintaan yang sama agar PR tidak dibuat dua kali.')
    } finally { busy.value = false }
}
</script>

<template>
    <section class="overflow-hidden rounded-2xl border border-blue-200 bg-white" aria-label="PR dari penawaran">
        <div class="flex flex-wrap items-center justify-between gap-4 bg-blue-50/60 p-5 sm:p-6">
            <div class="flex items-start gap-3"><FilePlus2 class="mt-1 size-6 shrink-0 text-blue-700" /><div>
                <h2 class="font-semibold text-slate-900">Jadikan penawaran sebagai dasar PR</h2>
                <p class="mt-1 text-sm leading-relaxed text-slate-600">Pilih supplier dan jumlah, periksa biaya, lalu simpan draft untuk pengajuan PR.</p>
            </div></div>
            <BaseButton v-if="!open && !created" :disabled="unavailable || !metadata?.can_create" @click="open = true">Buat PR dari penawaran<ArrowRight class="size-4" /></BaseButton>
        </div>
        <div v-if="!open && !created" class="px-6 py-4 text-sm text-slate-600">{{ metadata?.can_create ? 'Satu barang boleh dibagi ke beberapa supplier. Jumlah baru dicadangkan setelah draft tersimpan.' : 'Pembuatan PR tersedia saat RFQ dalam evaluasi dan Anda memiliki akses membuat PR.' }}</div>

        <div v-if="created" class="space-y-5 p-5 sm:p-6" role="status">
            <div class="flex items-start gap-3"><CheckCircle2 class="size-6 shrink-0 text-emerald-600" /><div><h3 class="font-semibold text-slate-900">Draft {{ created.pr_number }} berhasil disimpan</h3><p class="mt-1 text-sm text-slate-600">Jumlah sudah dicadangkan. Dokumen ini belum menjadi pesanan ke supplier.</p></div></div>
            <div v-for="line in created.items" :key="line.id" class="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-3 text-sm"><span>{{ line.item_name }} · {{ matrix.suppliers.find(s => s.supplier_id === line.supplier_id)?.supplier_name || 'Supplier' }}</span><span class="font-medium tabular-nums">{{ qty(line.quantity) }} {{ line.unit?.name }} · {{ formatCurrency(line.source_line_subtotal, created.commercial_totals.currency) }}</span></div>
            <p class="text-lg font-semibold text-slate-900">Total PR {{ formatCurrency(created.commercial_totals.total_amount, created.commercial_totals.currency) }}</p>
            <p class="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Buka daftar PR untuk memeriksa detail, mengubah jumlah, dan mengajukan persetujuan. Pembelian dapat dilanjutkan setelah PR disetujui.</p>
            <RouterLink :to="{ name: 'user.purchasing.requisitions' }" class="inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Buka daftar PR</RouterLink>
            <BaseButton v-if="metadata?.can_create && Object.values(metadata.rfq_remaining).some(value => Number(value) > 0)" variant="secondary" type="button" class="sm:ml-3" :disabled="unavailable" @click="created = null; selections = {}; previews = []; errors = []; step = 1; open = true">Buat PR untuk sisa kebutuhan</BaseButton>
        </div>

        <form v-else-if="open" class="space-y-6 p-5 sm:p-6" @submit.prevent="save">
            <ol class="grid grid-cols-2 gap-4 text-sm"><li v-for="(label, index) in ['Pilih penawaran', 'Lengkapi & periksa PR']" :key="label" :aria-current="step === index + 1 ? 'step' : undefined" class="border-t-2 pt-3" :class="step >= index + 1 ? 'border-blue-600 text-blue-800' : 'border-slate-200 text-slate-500'">{{ index + 1 }}. {{ label }}</li></ol>
            <fieldset :disabled="busy || !!pending || unavailable" class="min-w-0 space-y-6">
                <div v-if="step === 1" class="space-y-5">
                    <article v-for="item in matrix.items_matrix" :key="item.rfq_item_id" class="overflow-hidden rounded-xl border border-slate-200">
                        <div class="flex flex-wrap justify-between gap-2 bg-slate-50 px-4 py-4"><h3 class="font-semibold text-slate-900">{{ item.item_name }}</h3><p class="text-sm text-slate-600">Sisa kebutuhan <strong class="text-slate-900">{{ qty(metadata?.rfq_remaining?.[item.rfq_item_id] || 0) }} {{ item.unit_name }}</strong></p></div>
                        <template v-for="supplier in matrix.suppliers" :key="supplier.quotation_id">
                            <div v-if="item.vendor_offers?.[supplier.quotation_id]?.quoted" class="space-y-3 border-t border-slate-100 p-4">
                                <label class="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" class="mt-1 size-4 accent-blue-700" :checked="selected(item.vendor_offers[supplier.quotation_id])" :disabled="!selected(item.vendor_offers[supplier.quotation_id]) && !canSelect(item, supplier, item.vendor_offers[supplier.quotation_id])" @change="toggle(item, item.vendor_offers[supplier.quotation_id], $event.target.checked)" /><span><strong class="block text-slate-900">{{ supplier.supplier_name }}</strong><span class="mt-1 block text-slate-500">{{ supplier.currency }} · {{ supplier.quotation_number }} · {{ metadata?.quotations?.[supplier.quotation_id]?.reason || 'Pilih untuk menggunakan penawaran ini' }}</span></span></label>
                                <label v-if="selected(item.vendor_offers[supplier.quotation_id])" class="block text-sm text-slate-700 sm:ml-7">Jumlah dari {{ supplier.supplier_name }}<input :value="selections[item.vendor_offers[supplier.quotation_id].supplier_quotation_item_id]" inputmode="decimal" type="text" class="pr-input mt-2 sm:max-w-xs" @input="updateQuantity(item, item.vendor_offers[supplier.quotation_id], $event)" @blur="updateQuantity(item, item.vendor_offers[supplier.quotation_id], $event, true)" /><span class="mt-2 block text-slate-500">Maksimal {{ qty(maximum(item, item.vendor_offers[supplier.quotation_id])) }} {{ item.unit_name }} setelah memperhitungkan supplier lain. Desimal menggunakan titik.</span></label>
                            </div>
                        </template>
                    </article>
                    <p v-if="!matrix.suppliers.length" class="text-sm text-slate-600">Belum ada penawaran supplier untuk dipilih.</p>
                </div>
                <div v-else class="space-y-6">
                    <p class="text-sm text-slate-600">Pemohon {{ auth.profile?.name || auth.user?.name }} · Divisi {{ auth.profile?.division?.name || divisionId || 'belum tersedia' }}</p>
                    <div class="grid gap-5 sm:grid-cols-2"><label class="text-sm font-medium text-slate-700">Tanggal pengajuan<input v-model="form.request_date" required type="date" class="pr-input mt-2" /></label><label class="text-sm font-medium text-slate-700">Tanggal kebutuhan<input v-model="form.required_date" required type="date" :min="form.request_date" class="pr-input mt-2" /></label></div>
                    <label class="block text-sm font-medium text-slate-700">Tujuan pengadaan<input v-model="form.purpose" required maxlength="255" type="text" class="pr-input mt-2" placeholder="Contoh: bahan produksi bulan ini" /></label>
                    <label class="block text-sm font-medium text-slate-700">Catatan <span class="font-normal text-slate-400">(opsional)</span><textarea v-model="form.notes" maxlength="10000" rows="3" class="pr-input mt-2" /></label>
                    <section class="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5" aria-label="Ringkasan biaya PR">
                        <h3 class="font-semibold text-slate-900">Ringkasan pilihan & biaya</h3>
                        <div v-for="row in rows" :key="row.offer.supplier_quotation_item_id" class="flex flex-wrap justify-between gap-2 border-b border-blue-100 pb-3 text-sm"><div><strong>{{ row.item.item_name }}</strong><p class="mt-1 text-slate-600">{{ row.supplier.supplier_name }} · {{ qty(row.quantity) }} {{ row.item.unit_name }}</p></div><span class="font-medium tabular-nums">{{ formatCurrency(linePrice(row)?.line_subtotal, currency) }}</span></div>
                        <div v-for="preview in previews" :key="preview.quotation_id" class="text-sm text-slate-600"><p class="font-medium text-slate-800">{{ matrix.suppliers.find(s => s.quotation_id === preview.quotation_id)?.supplier_name }}</p><p class="mt-1">Pajak {{ formatCurrency(preview.tax_amount, currency) }} · Ongkir {{ formatCurrency(preview.shipping_cost, currency) }}</p></div>
                        <div class="flex flex-wrap justify-between gap-2 border-t border-blue-200 pt-4 font-semibold text-slate-900"><span>Total draft PR</span><span class="tabular-nums">{{ formatCurrency(total, currency) }}</span></div>
                        <p class="text-sm leading-relaxed text-slate-600">Harga dihitung dari jumlah terpilih. Ongkir penuh dikenakan sekali untuk setiap penawaran supplier. Backend memeriksa ulang harga dan sisa jumlah saat menyimpan.</p>
                    </section>
                </div>
            </fieldset>
            <div v-if="errors.length" role="alert" class="space-y-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><p v-for="message in errors" :key="message">{{ message }}</p></div>
            <div class="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-5">
                <BaseButton variant="secondary" type="button" :disabled="busy || !!pending" @click="open = false">Batal</BaseButton>
                <div class="flex flex-wrap gap-3">
                    <BaseButton v-if="!pending" variant="secondary" type="button" :disabled="busy || unavailable" @click="emit('refresh'); step = 1; previews = []">Muat ulang penawaran</BaseButton>
                    <BaseButton v-if="step === 2 && !pending" variant="secondary" type="button" :disabled="busy" @click="step = 1; previews = []">Ubah pilihan</BaseButton>
                    <BaseButton v-if="step === 1 && !pending" type="button" :disabled="busy || unavailable || !metadata?.can_create" @click="checkPrices"><RefreshCw v-if="busy" class="size-4 animate-spin" />{{ busy ? 'Memeriksa harga…' : 'Periksa harga & lanjut' }}</BaseButton>
                    <BaseButton v-else type="submit" :disabled="busy || unavailable"><RefreshCw v-if="busy" class="size-4 animate-spin" />{{ busy ? 'Menyimpan…' : pending ? 'Periksa hasil / coba lagi' : 'Simpan draft PR' }}</BaseButton>
                </div>
            </div>
        </form>
    </section>
</template>

<style scoped>
.pr-input { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; background: white; font-size: 14px; color: #0f172a; font-weight: 400; }
.pr-input:focus-visible { outline: 2px solid #014baa; outline-offset: 2px; }
</style>
