<script setup>
import { ref } from 'vue'
import { UploadCloud, FileText, Trash2 } from '@lucide/vue'

defineProps({
    quoteForm: {
        type: Object,
        required: true,
    },
    selectedFile: {
        type: Object,
        default: null,
    },
    requestedPaymentTerms: {
        type: String,
        default: '',
    },
})

const emit = defineEmits(['file-select', 'remove-file'])
const fileInputRef = ref(null)

const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) emit('file-select', file)
}

const onRemoveFile = () => {
    if (fileInputRef.value) fileInputRef.value.value = ''
    emit('remove-file')
}
</script>

<template>
    <div class="space-y-6">
        <!-- Bagian 2: Informasi Surat & Dokumen Penawaran Resmi -->
        <div class="bg-white rounded-2xl border border-[#E5EAF1] p-5 sm:p-6 shadow-xs space-y-5">
            <div>
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#EAF2FF] text-[#014BAA] font-bold text-xs flex items-center justify-center">2</span>
                    <h4 class="text-sm sm:text-base font-bold text-slate-900">
                        Dokumen & Surat Penawaran Resmi
                    </h4>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                    Informasi nomor referensi penawaran harga dari perusahaan rekanan Anda.
                </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div class="space-y-1.5">
                    <label class="block font-semibold text-slate-800">
                        Nomor Surat Penawaran Resmi Rekanan *
                    </label>
                    <input 
                        v-model="quoteForm.vendor_quotation_reference"
                        type="text" 
                        placeholder="Contoh: QUO/BM/2026/X/089"
                        required
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-medium text-xs sm:text-sm transition-all"
                    />
                    <p class="text-[11px] text-slate-400">
                        Nomor surat resmi yang diterbitkan oleh bagian penjualan perusahaan Anda.
                    </p>
                </div>

                <div class="space-y-1.5">
                    <label class="block font-semibold text-slate-800">
                        Tanggal Surat Penawaran *
                    </label>
                    <input 
                        v-model="quoteForm.quotation_date"
                        type="date" 
                        required
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-medium text-xs sm:text-sm transition-all"
                    />
                    <p class="text-[11px] text-slate-400">
                        Tanggal penawaran harga ini diterbitkan.
                    </p>
                </div>
            </div>

            <div>
                <label for="portal-valid-until" class="block text-xs font-semibold text-slate-800 mb-1">Masa Berlaku Penawaran (Opsional)</label>
                <input id="portal-valid-until" v-model="quoteForm.valid_until" type="date" :min="quoteForm.quotation_date || undefined" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm" />
                <p class="text-xs text-slate-500 mt-1">Berlaku sampai akhir hari WIB. Kosongkan jika belum ditentukan.</p>
            </div>

            <!-- Upload Lampiran PDF -->
            <div class="pt-2 border-t border-slate-100 space-y-2">
                <div class="flex items-center justify-between">
                    <label class="block text-xs font-semibold text-slate-800">
                        Unggah Berkas Surat Penawaran Resmi (PDF / Scan)
                    </label>
                    <span class="text-[11px] font-medium text-slate-400">Disarankan</span>
                </div>

                <div 
                    v-if="!selectedFile"
                    @click="fileInputRef?.click()"
                    class="border-2 border-dashed border-slate-200 hover:border-[#014BAA] rounded-2xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 group"
                >
                    <input 
                        ref="fileInputRef"
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        @change="onFileChange"
                        class="hidden"
                    />
                    <UploadCloud class="w-7 h-7 text-[#014BAA] mx-auto mb-1.5 transition-transform group-hover:scale-110" />
                    <div class="text-xs font-bold text-slate-800">
                        Klik untuk memilih berkas surat penawaran Anda
                    </div>
                    <div class="text-[11px] text-slate-400 mt-0.5">
                        Format PDF, JPG, atau PNG (Maksimal 10MB)
                    </div>
                </div>

                <div 
                    v-else 
                    class="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-3 text-xs"
                >
                    <div class="flex items-center gap-3 overflow-hidden">
                        <FileText class="w-5 h-5 text-[#014BAA] shrink-0" />
                        <div class="overflow-hidden">
                            <div class="font-bold text-slate-900 truncate">
                                {{ selectedFile.name }}
                            </div>
                            <div class="text-[11px] text-slate-500">
                                {{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB • Terpilih
                            </div>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        @click="onRemoveFile"
                        class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Hapus berkas"
                    >
                        <Trash2 class="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Bagian 3: Syarat Komersial & Ketentuan Pengiriman -->
        <div class="bg-white rounded-2xl border border-[#E5EAF1] p-5 sm:p-6 shadow-xs space-y-5">
            <div>
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#EAF2FF] text-[#014BAA] font-bold text-xs flex items-center justify-center">3</span>
                    <h4 class="text-sm sm:text-base font-bold text-slate-900">
                        Syarat Komersial & Ketentuan Pengiriman
                    </h4>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                    Termin pembayaran, tarif PPN, ongkos kirim, masa berlaku harga, dan catatan penawaran.
                </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div class="space-y-1.5">
                    <label class="block font-semibold text-slate-800">
                        Masa Berlaku Penawaran Hingga
                    </label>
                    <input 
                        v-model="quoteForm.valid_until"
                        type="date" 
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-medium bg-white transition-all text-xs sm:text-sm"
                    />
                    <p class="text-[11px] text-slate-400">Batas akhir harga ini dijamin berlaku.</p>
                </div>

                <div class="space-y-1.5">
                    <label class="block font-semibold text-slate-800">
                        Syarat Pembayaran (Terms of Payment)
                    </label>
                    <input 
                        v-model="quoteForm.payment_terms"
                        type="text" 
                        placeholder="Contoh: Tempo 60 Hari / COD"
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-medium bg-white transition-all text-xs sm:text-sm"
                    />
                    <p class="text-[11px] text-slate-400">Permintaan pembeli: {{ requestedPaymentTerms || 'Sesuai Standar' }}</p>
                </div>

                <div class="space-y-1.5">
                    <label class="block font-semibold text-slate-800">
                        Pajak Pertambahan Nilai (PPN)
                    </label>
                    <select 
                        v-model.number="quoteForm.tax_rate"
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-medium bg-white transition-all cursor-pointer text-xs sm:text-sm"
                    >
                        <option :value="11">PPN 11% (Standar Nasional)</option>
                        <option :value="12">PPN 12%</option>
                        <option :value="0">Tanpa PPN (Bebas Pajak / 0%)</option>
                    </select>
                    <p class="text-[11px] text-slate-400">PPN otomatis dihitung pada ringkasan biaya penawaran.</p>
                </div>

                <div class="space-y-1.5">
                    <label class="block font-semibold text-slate-800">
                        Ongkos Kirim Tambahan (Rp)
                    </label>
                    <div class="relative">
                        <span class="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                        <input 
                            v-model.number="quoteForm.shipping_cost"
                            type="number" 
                            min="0" 
                            placeholder="0"
                            class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-mono font-medium bg-white transition-all text-xs sm:text-sm"
                        />
                    </div>
                    <p class="text-[11px] text-slate-400">Kosongkan (0) jika harga barang sudah termasuk ongkir (Franco Pabrik).</p>
                </div>

                <div class="sm:col-span-2 space-y-1.5">
                    <label class="block font-semibold text-slate-800">
                        Catatan Tambahan untuk Tim Pembeli
                    </label>
                    <textarea 
                        v-model="quoteForm.notes"
                        rows="3"
                        placeholder="Catatan mengenai spesifikasi alternatif, ketersediaan stok, garansi, atau instruksi pengiriman khusus..."
                        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none text-xs sm:text-sm bg-white transition-all"
                    ></textarea>
                </div>
            </div>
        </div>
    </div>
</template>
