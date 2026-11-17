<script setup>
import { FileText, X, UploadCloud, CheckCircle2, RefreshCw, Check } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import RfqQuotationItemEditor from '@/components/purchasing/rfq/RfqQuotationItemEditor.vue'
import { previewQuotationPricing } from '@/services/rfqServices.js'
import { hasPreviewPricing, offeredQuotationItems } from '@/utils/quotationPricing.js'
import { formatCurrency } from '@/composables/useFormatter.js'

defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
    manualForm: {
        type: Object,
        required: true,
    },
    invitedSuppliers: {
        type: Array,
        required: true,
    },
    taxes: {
        type: Array,
        required: true,
    },
    uploadingFile: {
        type: Boolean,
        default: false,
    },
    modalSubmitting: {
        type: Boolean,
        default: false,
    },
    modalItemsSubtotal: {
        type: Number,
        default: 0,
    },
    selectedTaxRate: {
        type: Number,
        default: 0,
    },
    modalTaxAmount: {
        type: Number,
        default: 0,
    },
    modalGrandTotal: {
        type: Number,
        default: 0,
    },
})

defineEmits(['close', 'file-upload', 'submit'])
</script>

<template>
    <div 
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
        @click.self="$emit('close')"
    >
        <div class="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div>
                    <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                        <FileText class="w-5 h-5 text-blue-600" />
                        Input Penawaran Harga Vendor (Manual)
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">
                        Catat penawaran harga vendor yang diterima via email/dokumen fisik ke dalam sistem RFQ.
                    </p>
                </div>
                <button
                    type="button"
                    @click="$emit('close')"
                    class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Modal Body Form -->
            <div class="p-6 overflow-y-auto space-y-6 flex-1">
                <!-- Section 1: Informasi Vendor & Penawaran -->
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                        1. Header Penawaran Vendor
                    </span>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">
                                Pilih Vendor / Rekanan <span class="text-rose-500">*</span>
                            </label>
                            <select 
                                v-model="manualForm.supplier_id"
                                class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500 bg-white"
                                required
                            >
                                <option value="" disabled>-- Pilih Vendor Terdaftar --</option>
                                <option 
                                    v-for="sup in invitedSuppliers" 
                                    :key="sup.supplier_id" 
                                    :value="sup.supplier_id"
                                >
                                    {{ sup.supplier?.name || `Vendor #${sup.supplier_id}` }} ({{ sup.supplier?.supplier_code || '-' }})
                                </option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">
                                No. Surat Penawaran Vendor <span class="text-rose-500">*</span>
                            </label>
                            <input 
                                type="text"
                                v-model="manualForm.vendor_quotation_reference"
                                placeholder="Contoh: QUO-PSI-2026-089"
                                class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">
                                Tanggal Surat Penawaran
                            </label>
                            <input 
                                type="date"
                                v-model="manualForm.quotation_date"
                                class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">
                                Masa Berlaku Penawaran
                            </label>
                            <input 
                                type="date"
                                v-model="manualForm.valid_until"
                                :min="manualForm.quotation_date || undefined"
                                class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                            />
                            <p class="text-xs text-slate-500 mt-1">Berlaku sampai akhir hari WIB. Kosongkan jika belum ditentukan oleh vendor.</p>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">
                                Syarat Pembayaran (TOP)
                            </label>
                            <input 
                                type="text"
                                v-model="manualForm.payment_terms"
                                placeholder="Contoh: Net 30 Days / COD"
                                class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">
                                Lead Time Pengiriman (Hari)
                            </label>
                            <input 
                                type="number"
                                v-model.number="manualForm.lead_time_days"
                                min="0"
                                placeholder="Contoh: 14"
                                class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">
                                Pajak / PPN
                            </label>
                            <select 
                                v-model="manualForm.tax_id"
                                class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500 bg-white"
                            >
                                <option value="">Tanpa Pajak (0%)</option>
                                <option v-for="tax in taxes" :key="tax.id" :value="tax.id">
                                    {{ tax.name }} ({{ tax.rate }}%)
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">
                                Biaya Pengiriman (Ongkir IDR)
                            </label>
                            <input 
                                type="number"
                                v-model.number="manualForm.shipping_cost"
                                min="0"
                                placeholder="0"
                                class="w-full text-xs rounded-lg border-slate-300 shadow-xs focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div class="md:col-span-2">
                            <label class="block text-xs font-semibold text-slate-700 mb-1">
                                Unggah Berkas PDF Penawaran Vendor
                            </label>
                            <div class="flex items-center gap-3">
                                <label class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs">
                                    <UploadCloud class="w-4 h-4 text-blue-600" />
                                    <span>{{ uploadingFile ? 'Mengunggah...' : 'Pilih Berkas PDF' }}</span>
                                    <input 
                                        type="file" 
                                        accept="application/pdf"
                                        @change="$emit('file-upload', $event)" 
                                        class="hidden" 
                                        :disabled="uploadingFile"
                                    />
                                </label>
                                <span v-if="manualForm.quotation_file_name" class="text-xs text-emerald-700 font-medium flex items-center gap-1">
                                    <CheckCircle2 class="w-3.5 h-3.5" />
                                    {{ manualForm.quotation_file_name }}
                                </span>
                                <span v-else class="text-xs text-slate-400">Format: .pdf (Maks 10MB)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 2: Items Table -->
                <div class="space-y-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                        2. Rincian Harga Item yang Ditawarkan
                    </span>

                    <p class="text-sm text-slate-500">Aktifkan hanya barang yang ditawarkan supplier. Barang lainnya tidak disimpan sebagai penawaran dan tidak masuk total harga.</p>
                    <p class="text-sm font-medium text-blue-800">{{ offeredQuotationItems(manualForm.items).length }} dari {{ manualForm.items.length }} barang ditawarkan</p>
                    <RfqQuotationItemEditor v-for="item in manualForm.items" :key="item.rfq_item_id" :item="item" :preview="previewQuotationPricing" selectable />
                </div>

                <!-- Section 3: Commercial Summary -->
                <p v-if="hasPreviewPricing(manualForm.items)" class="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Harga dihitung server dari jumlah dan ketentuan tiap barang. Pajak dan ongkir ditambahkan saat penawaran disimpan.</p>
                <div v-else class="bg-blue-50/60 p-4 rounded-xl border border-blue-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="text-xs text-blue-800">
                        <span class="font-bold block">Kalkulasi Nilai Penawaran:</span>
                        Pastikan rincian harga dan nominal sudah sesuai dengan fisik surat penawaran vendor.
                    </div>
                    <div class="w-full md:w-64 space-y-1.5 text-xs text-slate-700">
                        <div class="flex justify-between">
                            <span>Subtotal Barang:</span>
                            <span class="font-mono font-medium">{{ formatCurrency(modalItemsSubtotal) }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>PPN ({{ selectedTaxRate }}%):</span>
                            <span class="font-mono font-medium">{{ formatCurrency(modalTaxAmount) }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Biaya Pengiriman:</span>
                            <span class="font-mono font-medium">{{ formatCurrency(manualForm.shipping_cost || 0) }}</span>
                        </div>
                        <div class="flex justify-between pt-1.5 border-t border-blue-200 text-slate-900 font-bold text-sm">
                            <span>Grand Total:</span>
                            <span class="font-mono text-blue-700">{{ formatCurrency(modalGrandTotal) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/70">
                <BaseButton
                    variant="outline"
                    size="sm"
                    @click="$emit('close')"
                    :disabled="modalSubmitting"
                >
                    Batal
                </BaseButton>
                <BaseButton
                    variant="primary"
                    size="sm"
                    @click="$emit('submit')"
                    :disabled="modalSubmitting || uploadingFile"
                    class="bg-blue-600 hover:bg-blue-700"
                >
                    <RefreshCw v-if="modalSubmitting" class="w-4 h-4 mr-1.5 animate-spin" />
                    <Check v-else class="w-4 h-4 mr-1.5" />
                    Simpan Penawaran Vendor
                </BaseButton>
            </div>
        </div>
    </div>
</template>
