<script setup>
import { formatCurrency } from '../../../../utils/stringUtils.js'
import {
    Store,
    CreditCard,
    CheckCircle2,
    ExternalLink,
    Truck,
    Receipt,
    Package
} from '@lucide/vue'

defineProps({
    dp: { type: Object, required: true },
    formatDate: { type: Function, required: true }
})

const emit = defineEmits(['open-disburse', 'open-grn'])
</script>

<template>
    <div class="space-y-6">
        <!-- Two-Column Information Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Channel & Toko Information Card -->
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <div class="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <Store class="w-4 h-4 text-orange-600" />
                    <h3 class="text-sm font-bold text-gray-900">Saluran Pembelian & Tempat Transaksi</h3>
                </div>

                <div class="space-y-3 text-xs">
                    <template v-if="dp.purchase_channel === 'marketplace'">
                        <div class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Marketplace:</span>
                            <span class="font-bold text-gray-900">{{ dp.marketplace_name }}</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Nama Official Store / Penjual:</span>
                            <span class="font-semibold text-gray-800">{{ dp.merchant_name }}</span>
                        </div>
                        <div v-if="dp.store_url" class="pt-1">
                            <span class="text-slate-500 block mb-1">Tautan Toko Online:</span>
                            <a 
                                :href="dp.store_url" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                class="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-semibold"
                            >
                                <ExternalLink class="w-3.5 h-3.5" />
                                <span>Buka Halaman Toko Penjual</span>
                            </a>
                        </div>
                    </template>

                    <template v-else-if="dp.purchase_channel === 'direct_supplier'">
                        <div class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Nama Supplier:</span>
                            <span class="font-bold text-gray-900">{{ dp.supplier?.name || '-' }}</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Kode Supplier:</span>
                            <span class="font-mono text-gray-700">{{ dp.supplier?.supplier_code || dp.supplier?.code || '-' }}</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Email / Kontak:</span>
                            <span class="text-gray-700">{{ dp.supplier?.email || dp.supplier?.phone || '-' }}</span>
                        </div>
                    </template>

                    <template v-else-if="dp.purchase_channel === 'retail_store'">
                        <div class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Nama Toko Retail:</span>
                            <span class="font-bold text-gray-900">{{ dp.merchant_name }}</span>
                        </div>
                        <div v-if="dp.store_url" class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Lokasi / URL:</span>
                            <span class="text-gray-700">{{ dp.store_url }}</span>
                        </div>
                    </template>

                    <div v-if="dp.notes" class="pt-1">
                        <span class="text-gray-500 block mb-1">Catatan Transaksi:</span>
                        <p class="text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100 italic">
                            {{ dp.notes }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Plan & Financial Summary Card -->
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
                <div>
                    <div class="flex items-center gap-2 pb-3 border-b border-gray-100">
                        <Receipt class="w-4 h-4 text-emerald-600" />
                        <h3 class="text-sm font-bold text-gray-900">Rincian Dokumen & Finansial</h3>
                    </div>

                    <div class="space-y-2.5 text-xs mt-3">
                        <div class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Rencana Pengadaan:</span>
                            <span class="font-bold text-gray-900 font-mono">{{ dp.procurement_plan?.pp_number || '-' }}</span>
                        </div>

                        <div class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Subtotal Barang:</span>
                            <span class="font-bold font-mono text-gray-800">{{ formatCurrency(dp.subtotal, dp.currency) }}</span>
                        </div>

                        <div v-if="Number(dp.discount_amount) > 0" class="flex justify-between items-center py-1 border-b border-gray-50 text-emerald-700">
                            <span>Diskon Transaksi:</span>
                            <span class="font-bold font-mono">- {{ formatCurrency(dp.discount_amount, dp.currency) }}</span>
                        </div>

                        <div v-if="Number(dp.shipping_cost) > 0" class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Ongkos Kirim:</span>
                            <span class="font-bold font-mono text-gray-800">+ {{ formatCurrency(dp.shipping_cost, dp.currency) }}</span>
                        </div>

                        <div v-if="Number(dp.platform_fee) > 0" class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Biaya Platform:</span>
                            <span class="font-bold font-mono text-gray-800">+ {{ formatCurrency(dp.platform_fee, dp.currency) }}</span>
                        </div>

                        <div v-if="Number(dp.tax_amount) > 0 || dp.tax" class="flex justify-between items-center py-1 border-b border-gray-50">
                            <span class="text-gray-500">Pajak ({{ dp.tax ? `${dp.tax.name} ${dp.tax.rate}%` : 'Pajak Transaksi' }}):</span>
                            <span class="font-bold font-mono text-gray-800">+ {{ formatCurrency(dp.tax_amount, dp.currency) }}</span>
                        </div>
                    </div>
                </div>

                <div class="pt-4 border-t-2 border-gray-200 mt-3 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                            Grand Total Pembayaran:
                        </span>
                        <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900">
                            {{ dp.currency || 'IDR' }}
                        </span>
                    </div>
                    <span class="text-2xl font-black text-emerald-800 font-mono block mt-1">
                        {{ formatCurrency(dp.grand_total, dp.currency) }}
                    </span>

                    <!-- Foreign Currency Conversion Display -->
                    <div v-if="dp.currency && dp.currency !== 'IDR'" class="mt-3 pt-3 border-t border-emerald-200/80 text-xs">
                        <span class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                            Setara Pembukuan Keuangan (IDR):
                        </span>
                        <span class="text-lg font-black text-emerald-950 font-mono block mt-0.5">
                            {{ formatCurrency((Number(dp.grand_total) || 0) * (Number(dp.exchange_rate) || 1), 'IDR') }}
                        </span>
                        <span class="text-[10px] text-emerald-700 block mt-1">
                            Kurs Terkunci Transaksi: 1 {{ dp.currency }} = {{ formatCurrency(dp.exchange_rate || 1, 'IDR') }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Finance Payment Request & Approval Section -->
        <div v-if="dp.payment_request" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                <div class="flex items-center gap-2">
                    <CreditCard class="w-5 h-5 text-blue-600" />
                    <div>
                        <h3 class="text-sm font-bold text-gray-900">Permohonan Pembayaran (Payment Request)</h3>
                        <p class="text-xs text-gray-500 font-mono">{{ dp.payment_request.prq_number }}</p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <span 
                        class="px-2.5 py-1 rounded-full text-xs font-bold border"
                        :class="dp.payment_request.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (dp.payment_request.status === 'approved' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200')"
                    >
                        {{ dp.payment_request.status?.toUpperCase() }}
                    </span>

                    <button 
                        v-if="dp.payment_request.status === 'approved' && ['draft', 'ready_for_payment'].includes(dp.status)"
                        @click="emit('open-disburse')"
                        class="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        Cairkan Pembayaran
                    </button>
                </div>
            </div>

            <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div class="space-y-1">
                    <span class="text-gray-500 block">Metode Pembayaran:</span>
                    <span class="font-semibold text-gray-800 block capitalize">{{ dp.payment_request.payment_method?.replace('_', ' ') }}</span>
                    <span class="text-gray-500 block mt-2">Penerima Dana:</span>
                    <span class="font-bold text-gray-900 block">{{ dp.payment_request.recipient_name || '-' }}</span>
                </div>

                <div class="space-y-1">
                    <span class="text-gray-500 block">Rekening Tujuan:</span>
                    <span class="font-mono text-gray-900 block font-bold">{{ dp.payment_request.bank_name || '-' }} - {{ dp.payment_request.bank_account_number || '-' }}</span>
                    <span class="text-gray-500 block mt-2">Atas Nama Rekening:</span>
                    <span class="font-semibold text-gray-800 block">{{ dp.payment_request.bank_account_holder || '-' }}</span>
                </div>

                <div class="space-y-1">
                    <span class="text-gray-500 block">Nominal Permohonan:</span>
                    <span class="font-mono text-base font-black text-gray-900 block">{{ formatCurrency(dp.payment_request.amount, dp.payment_request.currency || dp.currency) }}</span>
                    <span class="text-gray-500 block mt-2">Diajukan Oleh:</span>
                    <span class="text-gray-700 block">{{ dp.payment_request.requester?.name || 'Staff' }}</span>
                </div>
            </div>

            <!-- Disbursement Details if already paid -->
            <div v-if="dp.payment_request.payment" class="mx-6 mb-6 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div class="flex items-center gap-2 mb-2 text-emerald-900 font-bold text-xs">
                    <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                    <span>Rincian Pembayaran Kas / Bank (Disbursed)</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                        <span class="text-gray-500 block">Nomor Bukti Bayar:</span>
                        <span class="font-mono font-bold text-gray-900">{{ dp.payment_request.payment.payment_number }}</span>
                    </div>
                    <div>
                        <span class="text-gray-500 block">Akun Sumber Dana:</span>
                        <span class="font-semibold text-gray-900">{{ dp.payment_request.payment.source_account?.name || 'Kas / Bank' }}</span>
                    </div>
                    <div>
                        <span class="text-gray-500 block">No. Referensi Bank:</span>
                        <span class="font-mono font-semibold text-gray-900">{{ dp.payment_request.payment.reference_number || '-' }}</span>
                    </div>
                    <div>
                        <span class="text-gray-500 block">Tanggal Pencairan:</span>
                        <span class="font-semibold text-gray-900">{{ formatDate(dp.payment_request.payment.payment_date) }}</span>
                    </div>
                </div>
            </div>

            <!-- Direct Disbursement Info Banner -->
            <div class="border-t border-gray-100 p-5 bg-blue-50/40 flex items-start gap-3">
                <CheckCircle2 class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                    <p class="text-xs font-bold text-slate-800">Pencairan Langsung (Tanpa Alur Approval Finance)</p>
                    <p class="text-[11px] text-slate-600 mt-0.5">
                        Permohonan pembayaran disetujui otomatis berdasarkan Purchase Requisition yang telah disahkan. Kasir keuangan dapat langsung melakukan pencairan dana ke rekening / Virtual Account tujuan.
                    </p>
                </div>
            </div>
        </div>

        <!-- Goods Receipts (GRN) Section -->
        <div v-if="dp.goods_receipts?.length > 0 || ['paid', 'partially_received', 'completed'].includes(dp.status)" class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div class="flex items-center gap-2">
                    <Truck class="w-5 h-5 text-blue-600" />
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Penerimaan Barang Fisik (Goods Receipts / GRN)</h3>
                        <p class="text-xs text-slate-500">Pemeriksaan fisik dan tanda terima barang gudang</p>
                    </div>
                </div>

                <button 
                    v-if="['paid', 'partially_received'].includes(dp.status)"
                    @click="emit('open-grn')"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                    <Package class="w-3.5 h-3.5" />
                    <span>Catat Penerimaan Barang</span>
                </button>
            </div>

            <div v-if="dp.goods_receipts?.length > 0" class="divide-y divide-slate-100">
                <div v-for="gr in dp.goods_receipts" :key="gr.id" class="p-5 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div class="flex items-center gap-2 font-mono font-bold text-slate-900">
                            <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{{ gr.grn_number }}</span>
                            <span 
                                :class="[
                                    'px-2 py-0.5 rounded text-[11px] font-sans font-bold border',
                                    gr.handover_status === 'handed_over' 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-amber-50 text-amber-800 border-amber-300'
                                ]"
                            >
                                {{ gr.handover_status_label || (gr.handover_status === 'handed_over' ? 'Sudah Diambil Pemohon' : 'Sampai di Gudang (Belum Diambil)') }}
                            </span>
                            <span class="text-gray-500 font-sans font-normal ml-1">Surat Jalan:</span>
                            <span class="text-gray-800">{{ gr.delivery_note_number || '-' }}</span>
                        </div>
                        <div class="text-gray-500">
                            Diterima tgl: <strong class="text-gray-800">{{ formatDate(gr.receipt_date) }}</strong>
                            <span v-if="gr.shipping_carrier" class="ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-sans">Kurir: {{ gr.shipping_carrier }}</span>
                        </div>
                    </div>

                    <!-- GR Items List -->
                    <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <table class="w-full text-xs text-left">
                            <thead>
                                <tr class="text-gray-500 border-b border-gray-200">
                                    <th class="py-1.5">Deskripsi Item</th>
                                    <th class="py-1.5 text-right">Diterima Fisik</th>
                                    <th class="py-1.5 text-right text-emerald-700">Diterima Baik</th>
                                    <th class="py-1.5 text-right text-rose-700">Ditolak (Cacat)</th>
                                    <th class="py-1.5 pl-3">Alasan Penolakan</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                <tr v-for="it in gr.items" :key="it.id">
                                    <td class="py-2 font-medium text-gray-900">{{ it.item_description }}</td>
                                    <td class="py-2 text-right font-mono">{{ Number(it.quantity_received) }}</td>
                                    <td class="py-2 text-right font-mono font-bold text-emerald-700">{{ Number(it.quantity_accepted) }}</td>
                                    <td class="py-2 text-right font-mono font-bold text-rose-700">{{ Number(it.quantity_rejected) }}</td>
                                    <td class="py-2 pl-3 text-gray-500 italic">{{ it.rejection_reason || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div v-else class="p-8 text-center text-xs text-gray-400">
                Belum ada bukti fisik penerimaan barang yang dicatat untuk transaksi ini.
            </div>
        </div>
    </div>
</template>
