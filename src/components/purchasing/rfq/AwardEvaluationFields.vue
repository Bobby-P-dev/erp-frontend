<script setup>
const model = defineModel({ type: Object, required: true })
</script>

<template>
    <div class="evaluation-fields space-y-6 text-sm">
        <label class="block space-y-2 font-medium text-slate-800">Apakah barang sesuai spesifikasi?
            <select v-model="model.technical_compliance" class="block w-full rounded-lg border-slate-300 text-sm">
                <option value="not_verified">Belum diverifikasi</option>
                <option value="compliant">Sesuai spesifikasi</option>
                <option value="deviation">Ada penyimpangan spesifikasi</option>
            </select>
        </label>
        <label class="block space-y-2 font-medium text-slate-800">Mengapa supplier ini dipilih? <span class="text-rose-700">Wajib</span>
            <textarea v-model="model.selection_reason" maxlength="2000" rows="3" required placeholder="Contoh: Spesifikasi sesuai, pengiriman memenuhi jadwal, dan harga paling menguntungkan." class="block w-full rounded-lg border-slate-300 text-sm"></textarea>
            <span class="block font-normal text-slate-500">Jika bukan harga terendah, jelaskan pertimbangan Anda.</span>
        </label>
        <details class="rounded-xl border border-slate-200">
            <summary class="cursor-pointer px-4 py-3 font-medium text-slate-700">Tambahkan catatan & bukti <span class="font-normal text-slate-500">(opsional)</span></summary>
            <div class="grid gap-5 p-4 md:grid-cols-2">
        <label class="space-y-2">Garansi yang diperiksa
            <input v-model="model.warranty_terms" maxlength="1000" placeholder="Kosong = belum tersedia" class="block w-full rounded-lg border-slate-300 text-xs" />
        </label>
        <label class="space-y-2">Catatan teknis
            <textarea v-model="model.technical_notes" maxlength="2000" rows="2" placeholder="Spesifikasi, merek, atau penyimpangan yang diperiksa" class="block w-full rounded-lg border-slate-300 text-xs"></textarea>
        </label>
        <label class="space-y-2">Catatan pembayaran & pengiriman
            <textarea v-model="model.commercial_notes" maxlength="2000" rows="2" placeholder="Pembayaran, pengiriman, pajak, dan ongkir" class="block w-full rounded-lg border-slate-300 text-xs"></textarea>
        </label>
        <label class="space-y-2">Referensi dokumen bukti
            <input v-model="model.evidence_reference" maxlength="1000" placeholder="Nomor dokumen / halaman lampiran quotation yang diperiksa" class="block w-full rounded-lg border-slate-300 text-xs" />
        </label>
            </div>
        </details>
    </div>
</template>

<style scoped>
.evaluation-fields input, .evaluation-fields select, .evaluation-fields textarea { margin-top: 8px; padding: 12px; border: 1px solid #cbd5e1; background: white; font-size: 14px; font-weight: 400; color: #0f172a; }
.evaluation-fields :focus-visible { outline: 2px solid #014baa; outline-offset: 2px; }
</style>
