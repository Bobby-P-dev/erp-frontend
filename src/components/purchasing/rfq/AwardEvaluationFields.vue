<script setup>
const model = defineModel({ type: Object, required: true })
</script>

<template>
    <div class="grid gap-3 text-xs md:grid-cols-2">
        <label class="space-y-1">Kesesuaian teknis
            <select v-model="model.technical_compliance" class="block w-full rounded-lg border-slate-300 text-xs">
                <option value="not_verified">Belum diverifikasi</option>
                <option value="compliant">Sesuai spesifikasi</option>
                <option value="deviation">Ada penyimpangan spesifikasi</option>
            </select>
        </label>
        <label class="space-y-1">Garansi yang diverifikasi (opsional)
            <input v-model="model.warranty_terms" maxlength="1000" placeholder="Kosong = belum tersedia" class="block w-full rounded-lg border-slate-300 text-xs" />
        </label>
        <label class="space-y-1">Catatan teknis (opsional)
            <textarea v-model="model.technical_notes" maxlength="2000" rows="2" placeholder="Spesifikasi, merek, atau penyimpangan yang diperiksa" class="block w-full rounded-lg border-slate-300 text-xs"></textarea>
        </label>
        <label class="space-y-1">Catatan komersial (opsional)
            <textarea v-model="model.commercial_notes" maxlength="2000" rows="2" placeholder="Pembayaran, pengiriman, pajak, dan ongkir" class="block w-full rounded-lg border-slate-300 text-xs"></textarea>
        </label>
        <label class="space-y-1 md:col-span-2">Referensi bukti (opsional)
            <input v-model="model.evidence_reference" maxlength="1000" placeholder="Nomor dokumen / halaman lampiran quotation yang diperiksa" class="block w-full rounded-lg border-slate-300 text-xs" />
        </label>
        <label class="space-y-1 md:col-span-2">Alasan pemilihan (wajib)
            <textarea v-model="model.selection_reason" maxlength="2000" rows="2" required placeholder="Jelaskan dasar pemilihan, termasuk pertimbangan jika bukan penawaran termurah." class="block w-full rounded-lg border-slate-300 text-xs"></textarea>
        </label>
    </div>
</template>
