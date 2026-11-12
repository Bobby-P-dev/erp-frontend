<script setup>
import { formatCurrency } from '../../../../utils/stringUtils.js'

defineProps({
    hasPlanSelected: { type: Boolean, default: false },
    planItems: { type: Array, required: true },
    activeItemsCount: { type: Number, default: 0 }
})

const emit = defineEmits(['select-all'])
</script>

<template>
    <section class="rfq-form-section" aria-labelledby="rfq-items-heading">
        <div class="rfq-section-heading">
            <div>
                <h2 id="rfq-items-heading">3. Barang yang ditenderkan</h2>
                <p>Pilih barang, sesuaikan jumlah, lalu periksa perkiraan harga satuannya.</p>
            </div>
            <button
                v-if="planItems.length"
                type="button"
                class="rfq-secondary-button"
                @click="emit('select-all')"
            >
                Pilih semua sesuai sisa kuota
            </button>
        </div>
        <p v-if="!hasPlanSelected" class="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Pilih rencana pengadaan terlebih dahulu untuk menampilkan barang.
        </p>
        <p
            v-else-if="!planItems.length"
            class="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500"
        >
            Belum ada barang yang dimuat dari rencana ini.
        </p>
        <template v-else>
            <p class="text-xs text-slate-500">
                {{ activeItemsCount }} dari {{ planItems.length }} barang dipilih. HPS adalah perkiraan harga
                satuan untuk evaluasi penawaran.
            </p>
            <div class="divide-y divide-slate-100">
                <div
                    v-for="it in planItems"
                    :key="it.procurement_plan_item_id"
                    class="rfq-item-row"
                    :class="{ 'bg-slate-50/60': !it.is_selected }"
                >
                    <div class="min-w-0">
                        <label class="flex items-start gap-3 cursor-pointer">
                            <input
                                v-model="it.is_selected"
                                type="checkbox"
                                :disabled="Number(it.remaining_quantity) <= 0"
                                :aria-label="`Pilih ${it.item_name}`"
                                class="mt-1 size-4 shrink-0 rounded border-slate-300 accent-blue-600"
                            />
                            <span class="min-w-0"
                                ><span class="block break-words text-sm font-medium text-slate-900">{{
                                    it.item_name
                                }}</span
                                ><span v-if="it.item_code" class="mt-1 block text-xs text-slate-400">{{
                                    it.item_code
                                }}</span
                                ><span class="mt-1 block break-words text-xs text-slate-500"
                                    >{{ it.source_pp_number
                                    }}<template v-if="it.source_pr_number">
                                        · {{ it.source_pr_number }}</template
                                    ></span
                                ></span
                            >
                        </label>
                        <details class="ml-7 mt-3 text-xs text-slate-500">
                            <summary class="cursor-pointer text-[#014BAA]">
                                Spesifikasi & catatan<template v-if="it.notes"> · terisi</template>
                            </summary>
                            <p v-if="it.item_specifications" class="mt-3 whitespace-pre-line break-words">
                                {{ it.item_specifications }}
                            </p>
                            <label
                                :for="`rfq-item-notes-${it.procurement_plan_item_id}`"
                                class="mt-3 block mb-1.5"
                                >Catatan barang (opsional)</label
                            >
                            <textarea
                                :id="`rfq-item-notes-${it.procurement_plan_item_id}`"
                                v-model="it.notes"
                                :disabled="!it.is_selected"
                                rows="2"
                                placeholder="Catatan untuk supplier"
                            />
                        </details>
                    </div>
                    <div>
                        <label :for="`rfq-qty-${it.procurement_plan_item_id}`" class="rfq-field-label"
                            >Jumlah <span class="text-slate-400">({{ it.unit_name }})</span></label
                        ><input
                            class="rfq-input"
                            :id="`rfq-qty-${it.procurement_plan_item_id}`"
                            v-model.number="it.target_quantity"
                            :disabled="!it.is_selected"
                            type="number"
                            min="0"
                            step="any"
                            :max="it.remaining_quantity"
                        />
                        <p class="mt-1.5 text-xs text-slate-500">
                            Sisa {{ Number(it.remaining_quantity).toLocaleString('id-ID') }}
                            {{ it.unit_name }}
                        </p>
                    </div>
                    <div>
                        <label :for="`rfq-hps-${it.procurement_plan_item_id}`" class="rfq-field-label"
                            >HPS satuan (Rp)</label
                        ><input
                            class="rfq-input"
                            :id="`rfq-hps-${it.procurement_plan_item_id}`"
                            v-model.number="it.target_price"
                            :disabled="!it.is_selected"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                        />
                    </div>
                    <div class="rfq-item-subtotal">
                        <p class="rfq-field-label">Subtotal HPS</p>
                        <p class="text-sm font-medium tabular-nums text-slate-900 break-words">
                            {{
                                it.is_selected
                                    ? formatCurrency(
                                          Number(it.target_quantity || 0) * Number(it.target_price || 0),
                                          'IDR'
                                      )
                                    : '—'
                            }}
                        </p>
                    </div>
                </div>
            </div>
        </template>
    </section>
</template>
