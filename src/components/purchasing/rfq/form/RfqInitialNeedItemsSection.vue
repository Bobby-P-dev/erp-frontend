<script setup>
import { Plus, Trash2, Package } from '@lucide/vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import ReviewDisclosure from '@/components/ui/ReviewDisclosure.vue'
import RfqCatalogItemPicker from './RfqCatalogItemPicker.vue'
import { initialNeedItemMode, changeInitialNeedItemMode, applyRfqCatalogItem } from '@/utils/rfqSource.js'
defineProps({
    items: { type: Array, required: true },
    units: { type: Array, required: true },
    loadingUnits: Boolean,
    unitsError: { type: String, default: '' },
    errors: { type: Object, default: () => ({}) },
})
defineEmits(['add', 'remove', 'search-units'])
</script>

<template>
    <section class="rfq-form-section" aria-labelledby="rfq-initial-items-heading">
        <div class="rfq-section-heading">
            <div><h2 id="rfq-initial-items-heading">3. Barang yang diminta</h2><p>Pilih dari katalog atau tulis barang custom. Keduanya dapat digabung dalam satu tender.</p></div>
            <button type="button" class="rfq-secondary-button" @click="$emit('add')"><Plus class="size-4" />Tambah barang</button>
        </div>
        <p v-if="unitsError" role="alert" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{{ unitsError }} <button type="button" class="underline" @click="$emit('search-units', '')">Coba lagi</button></p>
        <p v-if="!items.length" class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Belum ada barang. Pilih Tambah barang untuk mulai.</p>
        <article v-for="(item, index) in items" :key="item.row_key" class="rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
            <div class="mb-5 flex items-center justify-between gap-3">
                <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-800"><Package class="size-4 text-blue-700" />Barang {{ index + 1 }}</h3>
                <button type="button" class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-700 hover:bg-rose-50" :aria-label="`Hapus barang ${index + 1}`" @click="$emit('remove', index)"><Trash2 class="size-4" />Hapus</button>
            </div>
            <fieldset class="mb-5">
                <legend class="rfq-field-label">Sumber barang</legend>
                <div class="flex flex-wrap gap-2">
                    <label v-for="mode in [{ value: 'catalog', label: 'Dari katalog' }, { value: 'custom', label: 'Barang custom' }]" :key="mode.value" class="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors" :class="initialNeedItemMode(item) === mode.value ? 'border-blue-500 bg-blue-50 font-medium text-blue-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'">
                        <input type="radio" :name="`need-mode-${item.row_key ?? index}`" :value="mode.value" :checked="initialNeedItemMode(item) === mode.value" class="size-4 accent-blue-700" @change="changeInitialNeedItemMode(item, mode.value)" />{{ mode.label }}
                    </label>
                </div>
                <p class="mt-2 text-xs leading-relaxed text-slate-500">{{ initialNeedItemMode(item) === 'catalog' ? 'Nama dan satuan mengikuti master. Harga penawaran tetap diisi supplier.' : 'Untuk kebutuhan di luar katalog. Barang ini tidak otomatis ditambahkan ke master.' }}</p>
            </fieldset>
            <RfqCatalogItemPicker v-if="initialNeedItemMode(item) === 'catalog'" class="mb-5" :item="item" :input-id="`need-catalog-${item.row_key ?? index}`" :error="errors[`items.${index}.item_id`]?.[0]" @select="applyRfqCatalogItem(item, $event)" />
            <div class="grid gap-5 sm:grid-cols-2">
                <div v-if="initialNeedItemMode(item) === 'custom'" class="sm:col-span-2">
                    <label :for="`need-name-${index}`" class="rfq-field-label">Nama barang <span class="text-rose-500">*</span></label>
                    <input :id="`need-name-${index}`" v-model="item.item_name" class="rfq-input" maxlength="255" placeholder="Contoh: Aluminium lembaran 2 mm" :aria-invalid="!!errors[`items.${index}.item_name`]" />
                    <p v-if="errors[`items.${index}.item_name`]" class="mt-2 text-sm text-rose-700">{{ errors[`items.${index}.item_name`][0] }}</p>
                </div>
                <div>
                    <label :for="`need-qty-${index}`" class="rfq-field-label">Jumlah <span class="text-rose-500">*</span></label>
                    <input :id="`need-qty-${index}`" v-model="item.target_quantity" class="rfq-input" inputmode="decimal" placeholder="Contoh: 20 atau 20.5" :aria-invalid="!!errors[`items.${index}.target_quantity`]" />
                    <p v-if="errors[`items.${index}.target_quantity`]" class="mt-2 text-sm text-rose-700">{{ errors[`items.${index}.target_quantity`][0] }}</p>
                </div>
                <div>
                    <p :id="`need-unit-${index}`" class="rfq-field-label">Satuan <span class="text-rose-500">*</span></p>
                    <template v-if="initialNeedItemMode(item) === 'catalog'">
                        <p :aria-labelledby="`need-unit-${index}`" class="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">{{ item.unit_label || item.unit?.code || item.unit?.name || units.find(unit => Number(unit.value) === Number(item.unit_id))?.label || (item.unit_id ? `Satuan #${item.unit_id}` : 'Terisi setelah memilih barang') }}</p>
                        <p v-if="errors[`items.${index}.unit_id`]" class="mt-2 text-sm text-rose-700">{{ errors[`items.${index}.unit_id`][0] }}</p>
                    </template>
                    <SearchableSelect v-else v-model="item.unit_id" :options="units" :loading="loadingUnits" placeholder="Pilih satuan" search-placeholder="Cari kg, meter, pcs…" :aria-labelledby="`need-unit-${index}`" :error="errors[`items.${index}.unit_id`]?.[0]" @search="$emit('search-units', $event)" />
                </div>
            </div>
            <div class="mt-5">
                <ReviewDisclosure title="Spesifikasi & kebutuhan tambahan" :description="[item.item_specifications && 'Spesifikasi diisi', item.target_price && 'Estimasi diisi', item.required_delivery_date && 'Target pengiriman diisi', item.notes && 'Catatan diisi'].filter(Boolean).join(' · ') || 'Opsional · spesifikasi, estimasi harga dan pengiriman'" :open="!!errors[`items.${index}.target_price`]">
                    <div class="grid gap-5 sm:grid-cols-2">
                <div class="sm:col-span-2">
                    <label :for="`need-spec-${index}`" class="rfq-field-label">Spesifikasi <span class="font-normal text-slate-400">· opsional</span></label>
                    <textarea :id="`need-spec-${index}`" v-model="item.item_specifications" rows="2" placeholder="Ukuran, bahan, merek atau standar kualitas yang dibutuhkan" />
                </div>

                        <div><label :for="`need-price-${index}`" class="rfq-field-label">Estimasi harga per satuan (Rp)</label><input :id="`need-price-${index}`" v-model="item.target_price" class="rfq-input" inputmode="decimal" placeholder="Kosongkan jika belum tahu" :aria-invalid="!!errors[`items.${index}.target_price`]" /><p v-if="errors[`items.${index}.target_price`]" class="mt-2 text-sm text-rose-700">{{ errors[`items.${index}.target_price`][0] }}</p></div>
                        <div><label :for="`need-date-${index}`" class="rfq-field-label">Target barang diterima</label><input :id="`need-date-${index}`" v-model="item.required_delivery_date" class="rfq-input" type="date" /></div>
                        <div class="sm:col-span-2"><label :for="`need-note-${index}`" class="rfq-field-label">Catatan untuk supplier</label><textarea :id="`need-note-${index}`" v-model="item.notes" rows="2" /></div>
                    </div>
                </ReviewDisclosure>
            </div>
        </article>
    </section>
</template>
