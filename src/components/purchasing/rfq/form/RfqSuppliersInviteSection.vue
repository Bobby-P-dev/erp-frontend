<script setup>
import SearchableMultiSelect from '../../../ui/SearchableMultiSelect.vue'
import { Trash2 } from '@lucide/vue'

defineProps({
    selectedSupplierIds: { type: Array, required: true },
    supplierOptions: { type: Array, required: true },
    selectedSuppliers: { type: Array, required: true },
    isLoadingSuppliers: { type: Boolean, default: false }
})

const emit = defineEmits(['update:selectedSupplierIds', 'remove-supplier'])
</script>

<template>
    <section class="rfq-form-section" aria-labelledby="rfq-suppliers-heading">
        <div class="rfq-section-heading">
            <div>
                <h2 id="rfq-suppliers-heading">4. Supplier undangan</h2>
                <p>Pilih supplier dan periksa emailnya. Undangan diproses setelah tender dipublikasikan.</p>
            </div>
            <span class="text-sm text-slate-500">{{ selectedSuppliers.length }} dipilih</span>
        </div>
        <div>
            <p id="rfq-supplier-label" class="rfq-field-label">
                Cari supplier <span class="text-rose-500">*</span>
            </p>
            <SearchableMultiSelect
                :model-value="selectedSupplierIds"
                @update:model-value="emit('update:selectedSupplierIds', $event)"
                :options="supplierOptions"
                placeholder="Cari nama atau kode supplier…"
                :loading="isLoadingSuppliers"
                aria-labelledby="rfq-supplier-label"
            />
        </div>
        <div v-if="selectedSuppliers.length" class="divide-y divide-slate-100">
            <div
                v-for="s in selectedSuppliers"
                :key="s.id"
                class="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
                <div class="grid min-w-0 flex-1 gap-2 text-sm sm:grid-cols-2 sm:gap-5">
                    <div class="min-w-0">
                        <p class="break-words font-medium text-slate-900">{{ s.name }}</p>
                        <p class="mt-1 text-xs text-slate-500">
                            {{ s.supplier_code || `SUP-${s.id}`
                            }}<template v-if="s.contact_person || s.contacts?.[0]?.name">
                                · {{ s.contact_person || s.contacts?.[0]?.name }}</template
                            >
                        </p>
                    </div>
                    <div class="min-w-0">
                        <p
                            class="break-all"
                            :class="s.email || s.contacts?.[0]?.email ? 'text-slate-700' : 'text-amber-700'"
                        >
                            {{
                                s.email ||
                                s.contacts?.[0]?.email ||
                                'Email belum tersedia — periksa data supplier'
                            }}
                        </p>
                        <p v-if="s.phone || s.contacts?.[0]?.phone" class="mt-1 text-xs text-slate-500">
                            {{ s.phone || s.contacts?.[0]?.phone }}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    :aria-label="`Hapus ${s.name} dari undangan`"
                    class="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    @click="emit('remove-supplier', s.id)"
                >
                    <Trash2 class="size-4" />
                </button>
            </div>
        </div>
        <p v-else class="text-sm text-slate-400">
            Belum ada supplier dipilih. Pilih minimal satu supplier untuk menyimpan tender.
        </p>
    </section>
</template>
