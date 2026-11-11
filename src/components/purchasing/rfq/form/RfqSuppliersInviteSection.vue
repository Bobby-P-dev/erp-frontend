<script setup>
import SearchableMultiSelect from '../../../ui/SearchableMultiSelect.vue'
import { Trash2, Users } from '@lucide/vue'

defineProps({
    selectedSupplierIds: { type: Array, required: true },
    supplierOptions: { type: Array, required: true },
    selectedSuppliers: { type: Array, required: true },
    isLoadingSuppliers: { type: Boolean, default: false }
})

const emit = defineEmits(['update:selectedSupplierIds', 'remove-supplier'])
</script>

<template>
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-sm">
                    4
                </div>
                <div>
                    <h3 class="text-base font-bold text-slate-900">Undang Supplier / Rekanan Tender</h3>
                    <p class="text-xs text-slate-500">Pilih vendor yang akan diberikan akses tautan portal mandiri (Magic Link) untuk memasukkan penawaran harga.</p>
                </div>
            </div>

            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Users class="w-3.5 h-3.5" />
                <span>{{ selectedSuppliers.length }} Vendor Diundang</span>
            </span>
        </div>

        <div class="space-y-4">
            <div class="bg-slate-50/70 p-4.5 rounded-xl border border-slate-200/80">
                <label class="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Cari & Pilih Vendor Aktif Terdaftar <span class="text-rose-500">*</span>
                </label>
                <SearchableMultiSelect
                    :model-value="selectedSupplierIds"
                    @update:model-value="emit('update:selectedSupplierIds', $event)"
                    :options="supplierOptions"
                    placeholder="Ketik nama perusahaan vendor atau kode supplier untuk mengundang..."
                    :loading="isLoadingSuppliers"
                />
            </div>

            <!-- Selected Suppliers Table -->
            <div v-if="selectedSuppliers.length > 0" class="border border-slate-200/80 rounded-xl overflow-hidden">
                <table class="w-full text-xs text-left">
                    <thead>
                        <tr class="bg-slate-50/80 text-slate-700 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider">
                            <th class="py-3 px-4">Nama Perusahaan Vendor</th>
                            <th class="py-3 px-4">Kode Vendor</th>
                            <th class="py-3 px-4">Kontak / PIC</th>
                            <th class="py-3 px-4">Email</th>
                            <th class="py-3 px-4">Telepon</th>
                            <th class="py-3 px-4 w-20 text-center">Hapus</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr
                            v-for="s in selectedSuppliers"
                            :key="s.id"
                            class="hover:bg-slate-50/60 transition-colors"
                        >
                            <td class="py-3 px-4 font-bold text-slate-900">
                                {{ s.name }}
                            </td>
                            <td class="py-3 px-4 font-mono font-semibold text-blue-700">
                                {{ s.supplier_code || `SUP-${s.id}` }}
                            </td>
                            <td class="py-3 px-4 text-slate-700 font-medium">
                                {{ s.contact_person || s.contacts?.[0]?.name || '-' }}
                            </td>
                            <td class="py-3 px-4 font-mono text-slate-600">
                                {{ s.email || s.contacts?.[0]?.email || '-' }}
                            </td>
                            <td class="py-3 px-4 font-mono text-slate-600">
                                {{ s.phone || s.contacts?.[0]?.phone || '-' }}
                            </td>
                            <td class="py-3 px-4 text-center">
                                <button
                                    type="button"
                                    @click="emit('remove-supplier', s.id)"
                                    class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus dari daftar undangan"
                                >
                                    <Trash2 class="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
