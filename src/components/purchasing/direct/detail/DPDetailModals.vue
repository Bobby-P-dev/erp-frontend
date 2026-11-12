<script setup>
import { formatCurrency } from '../../../../utils/stringUtils.js'
import { CreditCard, Truck, X } from '@lucide/vue'

defineProps({
    dp: { type: Object, required: true },
    showSubmitModal: { type: Boolean, default: false },
    showGoodsReceiptModal: { type: Boolean, default: false },
    submitForm: { type: Object, required: true },
    grForm: { type: Object, required: true },
})

const emit = defineEmits([
    'update:showSubmitModal',
    'update:showGoodsReceiptModal',
    'confirm-submit',
    'confirm-grn'
])
</script>

<template>
    <div>
        <!-- MODAL 1: Submit Payment Request Modal -->
        <div 
            v-if="showSubmitModal"
            role="dialog" aria-modal="true" aria-label="Ajukan pembayaran" data-dp-action
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
        >
            <div class="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[calc(100dvh-32px)] overflow-y-auto shadow-xl border border-gray-200">
                <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div class="flex items-center gap-2">
                        <CreditCard class="w-5 h-5 text-blue-600" />
                        <h3 class="font-bold text-gray-900 text-base">Ajukan Pembayaran ke Finance</h3>
                    </div>
                    <button @click="emit('update:showSubmitModal', false)" aria-label="Tutup dialog transaksi" class="rounded-lg p-2 text-gray-400 hover:bg-slate-100 hover:text-gray-600">
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <div class="space-y-3 text-xs">
                    <div>
                        <label class="block font-semibold text-gray-700 mb-1">Metode Pembayaran</label>
                        <select v-model="submitForm.payment_method" class="w-full rounded-xl border-gray-300 text-xs p-2.5">
                            <option value="bank_transfer">Transfer Bank (Bank Transfer)</option>
                            <option value="corporate_card">Kartu Kredit Perusahaan (Corporate Card)</option>
                            <option value="cash">Kas Tunai / Cash</option>
                            <option value="marketplace_va">Marketplace Virtual Account</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Nama Bank / Channel</label>
                            <input v-model="submitForm.bank_name" type="text" placeholder="misal: BCA / Mandiri" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Nomor Rekening / VA</label>
                            <input v-model="submitForm.bank_account_number" type="text" placeholder="1234567890" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                        </div>
                    </div>

                    <div>
                        <label class="block font-semibold text-gray-700 mb-1">Atas Nama Rekening</label>
                        <input v-model="submitForm.bank_account_holder" type="text" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                    </div>

                    <div>
                        <label class="block font-semibold text-gray-700 mb-1">Catatan Pembayaran (Untuk Kasir)</label>
                        <textarea v-model="submitForm.notes" rows="2" placeholder="Catatan instruksi pembayaran untuk kasir keuangan..." class="w-full rounded-xl border-gray-300 text-xs p-2.5"></textarea>
                    </div>

                    <div class="p-3 bg-blue-50 rounded-xl text-blue-800 text-xs">
                        Nominal yang akan diajukan: <strong class="font-mono font-bold">{{ formatCurrency(dp.grand_total, dp.currency) }}</strong>
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button @click="emit('update:showSubmitModal', false)" class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-slate-200 bg-white hover:bg-gray-100">
                        Batal
                    </button>
                    <button @click="emit('confirm-submit')" class="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        Ajukan ke Kasir Finance
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL 3: Goods Receipt Record Modal (Warehouse) -->
        <div 
            v-if="showGoodsReceiptModal"
            role="dialog" aria-modal="true" aria-label="Catat penerimaan barang" data-dp-action
            class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/60"
        >
            <div class="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[calc(100dvh-32px)] overflow-y-auto shadow-xl border border-gray-200 my-8">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div class="flex items-center gap-2">
                        <Truck class="w-5 h-5 text-blue-600" />
                        <h3 class="font-bold text-slate-900 text-base">Pencatatan Fisik Penerimaan Barang (GRN)</h3>
                    </div>
                    <button @click="emit('update:showGoodsReceiptModal', false)" aria-label="Tutup dialog transaksi" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X class="w-5 h-5" />
                    </button>
                </div>

                <div class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Nomor Surat Jalan <span class="text-rose-500">*</span></label>
                            <input v-model="grForm.delivery_note_number" type="text" placeholder="misal: SJ-09821" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Kurir / Ekspedisi</label>
                            <input v-model="grForm.shipping_carrier" type="text" placeholder="misal: JNE / Internal Pickup" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                        </div>
                        <div>
                            <label class="block font-semibold text-gray-700 mb-1">Tanggal Penerimaan</label>
                            <input v-model="grForm.receipt_date" type="date" class="w-full rounded-xl border-gray-300 text-xs p-2.5" />
                        </div>
                    </div>

                    <!-- Items Inspection Table -->
                    <div class="border border-gray-200 rounded-xl overflow-x-auto">
                        <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 font-bold text-gray-700 flex justify-between items-center text-xs">
                            <span>Verifikasi & Pemeriksaan Kuantitas Barang</span>
                            <span class="text-[11px] text-gray-500 font-normal">Centang item yang tiba hari ini</span>
                        </div>
                        <div class="p-3 space-y-3">
                            <div 
                                v-for="(item, idx) in grForm.items" 
                                :key="item.direct_purchase_item_id"
                                :class="[
                                    'p-3 rounded-lg border space-y-2 transition-colors',
                                    item.isSelected ? 'border-blue-200 bg-blue-50/20' : (item.is_fully_received ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 bg-gray-50/50')
                                ]"
                            >
                                <div class="flex justify-between items-center font-semibold text-gray-800">
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            v-model="item.isSelected" 
                                            :disabled="item.is_fully_received" 
                                            class="rounded text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-40"
                                        />
                                        <span :class="{'line-through text-gray-400': item.is_fully_received}">{{ idx + 1 }}. {{ item.item_description }}</span>
                                    </label>
                                    <div class="text-right text-[11px] font-mono">
                                        <span class="text-gray-500">Dipesan: {{ item.ordered_qty }}</span>
                                        <span class="text-gray-400 mx-1">|</span>
                                        <span class="text-emerald-700">Diterima: {{ item.already_accepted }}</span>
                                        <span class="text-gray-400 mx-1">|</span>
                                        <span class="text-blue-700 font-bold">Sisa: {{ item.remaining_receivable }}</span>
                                    </div>
                                </div>
                                <div v-if="item.isSelected" class="grid grid-cols-3 gap-2 pt-1">
                                    <div>
                                        <label class="block text-[11px] text-gray-500 mb-0.5">Qty Diterima Fisik</label>
                                        <input v-model.number="item.quantity_received" type="number" min="0" :max="item.remaining_receivable" step="any" class="w-full rounded-lg border-gray-300 text-xs p-1.5" />
                                    </div>
                                    <div>
                                        <label class="block text-[11px] text-emerald-700 font-semibold mb-0.5">Qty Diterima Baik</label>
                                        <input v-model.number="item.quantity_accepted" type="number" min="0" :max="item.quantity_received" step="any" class="w-full rounded-lg border-gray-300 text-xs p-1.5" />
                                    </div>
                                    <div>
                                        <label class="block text-[11px] text-rose-700 font-semibold mb-0.5">Qty Ditolak (Cacat)</label>
                                        <input v-model.number="item.quantity_rejected" type="number" min="0" step="any" class="w-full rounded-lg border-gray-300 text-xs p-1.5" />
                                    </div>
                                </div>
                                <div v-if="item.isSelected && item.quantity_rejected > 0">
                                    <label class="block text-[11px] text-rose-700 mb-0.5">Alasan Penolakan</label>
                                    <input v-model="item.rejection_reason" type="text" placeholder="Pecah / tidak sesuai spek..." class="w-full rounded-lg border-gray-300 text-xs p-1.5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block font-semibold text-gray-700 mb-1">Catatan Tambahan Penerimaan</label>
                        <textarea v-model="grForm.notes" rows="2" placeholder="Catatan kondisi fisik barang di gudang..." class="w-full rounded-xl border-gray-300 text-xs p-2.5"></textarea>
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button @click="emit('update:showGoodsReceiptModal', false)" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer">
                        Batal
                    </button>
                    <button @click="emit('confirm-grn')" class="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer">
                        Simpan Tanda Terima Barang
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
