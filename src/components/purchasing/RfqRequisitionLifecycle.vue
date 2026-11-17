<script setup>
import { ref, watch } from 'vue'
import BaseButton from '../ui/BaseButton.vue'
import RequisitionPurchaseOrders from './RequisitionPurchaseOrders.vue'
import { updatePurchaseRequisition, cancelPurchaseRequisition } from '../../services/purchaseRequisitionServices.js'
import { formatCurrency } from '../../composables/useFormatter.js'

const props = defineProps({ item: { type: Object, required: true } })
const emit = defineEmits(['updated', 'editing'])
const mode = ref(''), busy = ref(false), errors = ref([]), form = ref({}), reason = ref('')
const reset = () => {
    mode.value = ''; errors.value = []; reason.value = ''
    form.value = { purpose: props.item.purpose, required_date: props.item.required_date, notes: props.item.notes || '',
        items: (props.item.items || []).map(line => ({ id: line.id, name: line.item_name, unit: line.unit?.name || '',
            quantity: String(line.quantity), included: line.source_allocation_status !== 'withdrawn' })) }
}
watch(() => props.item, reset, { immediate: true })
watch(mode, value => emit('editing', Boolean(value)))
const save = async () => {
    if (busy.value) return
    errors.value = []; busy.value = true
    try {
        const response = mode.value === 'cancel'
            ? await cancelPurchaseRequisition(props.item.id, { reason: reason.value })
            : await updatePurchaseRequisition(props.item.id, { purpose: form.value.purpose,
                required_date: form.value.required_date, notes: form.value.notes,
                items: form.value.items.filter(line => line.included).map(line => ({ id: line.id, quantity: line.quantity })) })
        mode.value = ''
        emit('updated', response.data || response)
    } catch (error) {
        const data = error.response?.data
        errors.value = [...new Set([data?.message || 'Penyimpanan belum terkonfirmasi. Muat ulang detail sebelum mencoba lagi.',
            ...Object.values(data?.errors || {}).flat()])]
    } finally { busy.value = false }
}
</script>

<template>
    <section class="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5 space-y-4" aria-label="Pengajuan PR dari penawaran">
        <div class="flex flex-wrap items-start justify-between gap-4">
            <div><p class="text-xs font-semibold uppercase tracking-wide text-blue-700">Dasar penawaran supplier</p>
                <h3 class="mt-1 font-semibold text-slate-900">{{ ({ approved: 'PR telah disetujui', cancelled: 'PR dibatalkan', rejected: 'PR ditolak' })[item.status] || 'Pengajuan pembelian' }}</h3>
                <p class="mt-1 text-sm text-slate-600">{{ ['cancelled', 'rejected'].includes(item.status) ? 'Reservasi sudah dilepas. Riwayat pengajuan tetap tersimpan.' : item.status === 'approved' ? 'Lanjutkan dengan membuat draft PO dari penawaran di bawah. Tidak perlu membuat rencana pengadaan atau RFQ baru.' : 'Jumlah dicadangkan dari RFQ. Setelah PR disetujui, lanjutkan langsung ke PO dari detail ini.' }}</p>
            </div>
            <div v-if="!mode" class="flex flex-wrap gap-2">
                <BaseButton v-if="item.can_be_edited" variant="secondary" size="sm" @click="mode = 'edit'">Ubah pengajuan</BaseButton>
                <BaseButton v-if="item.can_be_cancelled" variant="secondary" size="sm" class="text-rose-700 border-rose-200" @click="mode = 'cancel'">Batalkan PR</BaseButton>
            </div>
        </div>
        <div class="flex flex-wrap justify-between gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm">
            <span class="text-slate-600">{{ item.approved_commercial_totals ? 'Nilai yang disetujui' : 'Total termasuk pajak & ongkir' }}</span>
            <strong class="text-slate-900 tabular-nums">{{ formatCurrency((item.approved_commercial_totals || item.commercial_totals)?.total_amount, item.currency) }}</strong>
        </div>
        <p v-if="item.source_workflow_block_reason" class="text-sm text-slate-600">{{ item.source_workflow_block_reason }}</p>
        <RequisitionPurchaseOrders v-if="!mode" :item="item" @updated="emit('updated', $event)" />
        <form v-if="mode" class="space-y-4 border-t border-blue-100 pt-4" @submit.prevent="save">
            <div v-if="errors.length" role="alert" class="rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><p v-for="error in errors" :key="error">{{ error }}</p></div>
            <fieldset :disabled="busy" class="space-y-4 min-w-0">
                <template v-if="mode === 'edit'">
                    <p class="text-sm text-slate-600">Harga dihitung ulang saat disimpan sesuai jumlah dan aturan supplier. Untuk mengganti barang atau supplier, batalkan PR lalu buat pengajuan baru.</p>
                    <label class="block text-sm font-medium text-slate-700">Keperluan<input v-model="form.purpose" required maxlength="255" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                    <label class="block text-sm font-medium text-slate-700">Tanggal kebutuhan<input v-model="form.required_date" type="date" required :min="item.request_date" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                    <div v-for="line in form.items" :key="line.id" class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                        <label class="flex flex-1 items-center gap-2 text-sm font-medium text-slate-800"><input v-model="line.included" type="checkbox" :aria-label="`Ajukan ${line.name}`" class="size-4 accent-blue-600" />{{ line.name }}</label>
                        <label v-if="line.included" class="flex items-center gap-2 text-sm text-slate-600"><span>Jumlah</span><input v-model="line.quantity" :aria-label="`Jumlah ${line.name}`" type="number" min="0.0001" step="0.0001" required class="w-28 rounded-lg border border-slate-300 px-3 py-2 tabular-nums" /><span>{{ line.unit }}</span></label>
                        <span v-else class="text-xs text-slate-500">Tidak diajukan · reservasi dilepas saat disimpan</span>
                    </div>
                    <label class="block text-sm font-medium text-slate-700">Catatan<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                    <p class="text-sm text-blue-800">{{ item.status === 'pending_approval' ? 'Menyimpan perubahan akan menghentikan workflow saat ini dan mengembalikan PR ke draft. Setelah diperiksa, pilih workflow dan ajukan ulang persetujuan.' : 'Simpan perubahan, periksa total terbaru, lalu ajukan persetujuan.' }}</p>
                </template>
                <template v-else>
                    <p class="text-sm text-slate-700">Pembatalan menghentikan pengajuan dan mengembalikan jumlah ke saldo RFQ. Riwayat PR tetap tersimpan.</p>
                    <label class="block text-sm font-medium text-slate-700">Alasan pembatalan<textarea v-model="reason" required maxlength="2000" rows="3" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" /></label>
                </template>
            </fieldset>
            <div class="flex flex-wrap justify-end gap-2">
                <BaseButton type="button" variant="secondary" size="sm" :disabled="busy" @click="reset">Kembali</BaseButton>
                <BaseButton type="submit" :variant="mode === 'cancel' ? 'danger' : 'primary'" size="sm" :disabled="busy || (mode === 'edit' && !form.items.some(line => line.included))">{{ busy ? 'Menyimpan…' : mode === 'cancel' ? 'Konfirmasi pembatalan' : 'Simpan perubahan' }}</BaseButton>
            </div>
        </form>
    </section>
</template>
