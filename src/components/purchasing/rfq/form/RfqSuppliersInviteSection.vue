<script setup>
import { reactive, ref } from 'vue'
import { Users, Trash2 } from '@lucide/vue'
import AsyncSearchPicker from '@/components/ui/AsyncSearchPicker.vue'
const props = defineProps({ state: { type: Object, required: true } })
const s = reactive(props.state)
const pickerOpen = ref(false)
const matchNames = row => s.catalogItems.filter(item => row.matched_item_ids?.map(Number).includes(item.id)).map(item => item.name)
</script>

<template>
    <section class="rfq-form-section" aria-labelledby="rfq-suppliers-heading">
        <div class="rfq-section-heading">
            <div><h2 id="rfq-suppliers-heading">4. Supplier undangan</h2><p>Pilih supplier yang akan diundang (undangan baru terkirim setelah tender dipublikasikan).</p></div>
            <span class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-700 border border-blue-200"><Users class="size-4" />{{ s.selectedSuppliers.length }} dipilih</span>
        </div>
        <p v-if="s.selectionNotice" role="status" class="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-800">{{ s.selectionNotice }}</p>
        <fieldset v-if="s.catalogItems.length">
            <legend class="rfq-field-label">Cari supplier berdasarkan</legend>
            <div class="flex flex-wrap gap-2">
                <label v-for="option in [{ value: 'recommended', label: 'Sesuai barang katalog' }, { value: 'all', label: 'Cari supplier lain' }]" :key="option.value" class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors" :class="s.mode === option.value ? 'border-blue-500 bg-blue-50 font-medium text-blue-800' : 'border-slate-200 hover:bg-slate-50'">
                    <input v-model="s.requestedMode" type="radio" name="rfq-supplier-mode" :value="option.value" class="size-4 accent-blue-700" />{{ option.label }}
                </label>
            </div>
        </fieldset>
        <p class="text-xs sm:text-sm text-slate-500">{{ !s.catalogItems.length ? 'Cari supplier aktif di perusahaan Anda.' : s.hasCustom ? 'Rekomendasi mengikuti barang katalog; gunakan Cari supplier lain untuk barang custom.' : 'Kecocokan mengacu pada katalog supplier; supplier lain tetap bisa dipilih.' }}</p>
        <div>
            <label for="rfq-supplier-picker" class="rfq-field-label">Tambahkan supplier</label>
            <AsyncSearchPicker id="rfq-supplier-picker" v-model:open="pickerOpen" v-model:query="s.query" multiple
                trigger-label="Cari dan pilih supplier" search-label="Cari nama atau kode supplier" placeholder="Ketik nama atau kode supplier"
                :rows="s.candidates" :selected-ids="s.selectedSupplierIds" :loading="s.loading" :error="s.error"
                :page="s.page" :last-page="s.lastPage" page-label="Halaman kandidat supplier"
                :empty-text="s.mode === 'recommended' ? 'Belum ada supplier yang cocok dengan barang katalog ini.' : 'Supplier tidak ditemukan. Coba nama atau kode lain.'"
                @select="s.select" @page="s.load" @retry="s.load(1)">
                <template #icon><Users class="size-4" /></template>
                <template #option="{ row }">
                    <span class="block break-words text-sm font-semibold text-slate-900">{{ row.name }}</span>
                    <span class="mt-1 block text-xs text-slate-500">{{ row.supplier_code || 'SUP-' + row.id }}</span>
                    <span v-if="matchNames(row).length" class="mt-1 block break-words text-xs text-blue-700">Sesuai: {{ matchNames(row).join(', ') }}</span>
                </template>
                <template #empty><button v-if="s.mode === 'recommended'" type="button" class="rfq-secondary-button" @click="s.requestedMode = 'all'; s.query = ''">Cari supplier lain</button></template>
            </AsyncSearchPicker>
        </div>
        <div v-if="s.selectedSuppliers.length" class="space-y-3">
            <h3 class="text-sm font-semibold text-slate-900">Supplier yang akan diundang</h3>
            <p v-if="s.selectionState === 'error'" role="alert" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Kecocokan pilihan belum dapat diperiksa ulang. Pilihan tetap tersimpan. <button type="button" class="ml-2 underline" @click="s.refreshSelected()">Periksa lagi</button></p>
            <div v-for="row in s.selectedSuppliers" :key="row.id" class="flex items-start justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div class="min-w-0"><p class="break-words text-sm font-semibold text-slate-900">{{ row.name }}</p><p class="mt-1 text-xs text-slate-500">{{ row.supplier_code || 'SUP-' + row.id }}</p>
                    <p v-if="s.selectionState === 'loading'" role="status" class="mt-2 text-sm text-slate-500">Memeriksa kecocokan terbaru…</p>
                    <p v-else-if="s.selectionState === 'error'" class="mt-2 text-sm text-amber-800">Status kecocokan belum terverifikasi</p>
                    <p v-else-if="row.availability === 'unavailable'" class="mt-2 text-sm text-rose-700">Supplier tidak tersedia atau tidak lagi aktif. Hapus dan pilih supplier lain sebelum menyimpan.</p>
                    <p v-else-if="matchNames(row).length" class="mt-2 break-words text-sm text-blue-700">Sesuai: {{ matchNames(row).join(', ') }}</p>
                    <p v-else class="mt-2 text-sm text-amber-800">{{ s.catalogItems.length ? 'Tidak cocok katalog saat ini. Tetap dipilih; periksa apakah supplier ini masih ingin diundang.' : 'Dipilih untuk kebutuhan ini. Konfirmasi kemampuan supplier melalui penawaran.' }}</p>
                </div>
                <button type="button" class="rounded-lg p-2 text-rose-700 transition-colors hover:bg-rose-50" :aria-label="'Hapus ' + row.name + ' dari undangan'" @click="s.remove(row.id)"><Trash2 class="size-4" /></button>
            </div>
        </div>
        <p v-else class="text-xs sm:text-sm text-slate-500">Belum ada supplier dipilih. Publikasi tender memerlukan minimal 1 supplier.</p>
        <p class="text-xs text-slate-500">Kontak undangan diambil dari master data. Mengubah daftar barang akan mereset pilihan supplier.</p>
    </section>
</template>
