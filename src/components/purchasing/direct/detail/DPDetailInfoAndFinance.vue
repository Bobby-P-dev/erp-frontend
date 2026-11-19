<script setup>
import { computed } from 'vue'
import { formatCurrency } from '../../../../utils/stringUtils.js'
import {
    Store,
    CreditCard,
    CheckCircle2,
    ExternalLink,
    Truck,
} from '@lucide/vue'

const props = defineProps({
    section: { type: String, default: 'seller' },
    dp: { type: Object, required: true },
    formatDate: { type: Function, required: true }
})

const storeLink = computed(() => {
    try {
        const url = new URL(props.dp.store_url)
        return ['http:', 'https:'].includes(url.protocol) ? url.href : null
    } catch { return null }
})
</script>

<template>
    <div class="space-y-6">
        <section v-if="section === 'seller'" class="seller-summary">
            <div class="flex min-w-0 items-start gap-3">
                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Store class="size-5" /></span>
                <div class="min-w-0">
                    <p class="text-xs font-medium text-slate-500">Penjual</p>
                    <h3 class="mt-1 break-words text-base font-semibold text-slate-900">{{ dp.purchase_channel === 'direct_supplier' ? (dp.supplier?.name || 'Supplier belum tersedia') : (dp.merchant_name || 'Penjual belum tersedia') }}</h3>
                    <p class="mt-1 text-sm text-slate-500">{{ dp.purchase_channel === 'marketplace' ? (dp.marketplace_name || 'Marketplace') : dp.purchase_channel === 'direct_supplier' ? 'Supplier rekanan' : 'Toko retail' }}<span v-if="dp.supplier?.code || dp.supplier?.supplier_code"> · {{ dp.supplier.supplier_code || dp.supplier.code }}</span></p>
                    <p v-if="dp.purchase_channel === 'direct_supplier' && (dp.supplier?.email || dp.supplier?.phone)" class="mt-1 break-all text-sm text-slate-500">{{ dp.supplier.email || dp.supplier.phone }}</p>
                    <a v-if="storeLink" :href="storeLink" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
                        <ExternalLink class="size-3.5" /> Buka toko penjual <span class="text-xs font-normal text-slate-500">(tab baru)</span>
                    </a>
                    <p v-else-if="dp.store_url" class="mt-2 break-words text-sm text-slate-500">Lokasi toko: {{ dp.store_url }}</p>
                </div>
            </div>
            <div class="min-w-0 border-t border-slate-100 pt-4 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
                <p class="text-xs font-medium text-slate-500">Rencana pengadaan asal</p>
                <p class="mt-1 break-words text-sm font-medium text-slate-800">{{ dp.procurement_plan?.pp_number || '—' }}</p>
            </div>
            <div v-if="dp.notes" class="col-span-full border-t border-slate-100 pt-4 text-sm">
                <p class="text-xs font-medium text-slate-500">Catatan pembelian</p>
                <p class="mt-1 whitespace-pre-line break-words text-slate-700">{{ dp.notes }}</p>
            </div>
        </section>

        <section v-if="section === 'costs'" aria-label="Rincian biaya pembelian" class="cost-summary">
            <div class="min-w-0">
                <h3 class="mb-4 text-sm font-semibold text-slate-800">Rincian biaya</h3>
                <dl class="space-y-3 text-sm">
                    <div class="cost-row"><dt>Subtotal barang</dt><dd>{{ formatCurrency(dp.subtotal, dp.currency) }}</dd></div>
                    <div v-if="Number(dp.discount_amount) > 0" class="cost-row"><dt>Diskon pembelian</dt><dd class="text-emerald-700">− {{ formatCurrency(dp.discount_amount, dp.currency) }}</dd></div>
                    <div v-if="Number(dp.shipping_cost) > 0" class="cost-row"><dt>Ongkos kirim</dt><dd>{{ formatCurrency(dp.shipping_cost, dp.currency) }}</dd></div>
                    <div v-if="Number(dp.platform_fee) > 0" class="cost-row"><dt>Biaya platform</dt><dd>{{ formatCurrency(dp.platform_fee, dp.currency) }}</dd></div>
                    <div v-if="Number(dp.tax_amount) > 0 || dp.tax" class="cost-row"><dt>{{ dp.tax ? `${dp.tax.name} (${dp.tax.rate}%)` : 'Pajak' }}</dt><dd>{{ formatCurrency(dp.tax_amount, dp.currency) }}</dd></div>
                </dl>
            </div>
            <div class="min-w-0 border-t border-slate-200/70 pt-5 sm:border-t-0 sm:border-l sm:pl-7 sm:pt-0">
                <p class="text-sm text-slate-500">Total pembelian <span class="ml-1 text-xs">{{ dp.currency || 'IDR' }}</span></p>
                <p class="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{{ formatCurrency(dp.grand_total, dp.currency) }}</p>
                <div v-if="dp.currency && dp.currency !== 'IDR'" class="mt-3 text-xs text-slate-500">
                    <p>Setara {{ formatCurrency((Number(dp.grand_total) || 0) * (Number(dp.exchange_rate) || 1), 'IDR') }}</p>
                    <p class="mt-1">Kurs: 1 {{ dp.currency }} = {{ formatCurrency(dp.exchange_rate || 1, 'IDR') }}</p>
                </div>
            </div>
        </section>

        <!-- Finance Payment Request & Approval Section -->
        <div v-if="section === 'payment' && dp.payment_request" class="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            <div class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                <div class="flex items-center gap-2.5">
                    <CreditCard class="w-5 h-5 text-blue-600" />
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Pembayaran</h3>
                        <p class="text-xs sm:text-sm text-slate-500 font-mono">{{ dp.payment_request.prq_number }}</p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <span 
                        class="px-2.5 py-1 rounded-full text-xs font-bold border"
                        :class="dp.payment_request.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (dp.payment_request.status === 'approved' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200')"
                    >
                        {{ dp.payment_request.status?.toUpperCase() }}
                    </span>
                </div>
            </div>

            <div class="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                <div class="space-y-1">
                    <span class="text-xs text-slate-500 block">Metode Pembayaran</span>
                    <span class="font-semibold text-slate-800 block capitalize">{{ dp.payment_request.payment_method?.replace('_', ' ') }}</span>
                    <span class="text-xs text-slate-500 block pt-2">Penerima Dana</span>
                    <span class="font-bold text-slate-900 block">{{ dp.payment_request.recipient_name || '-' }}</span>
                </div>

                <div class="space-y-1">
                    <span class="text-xs text-slate-500 block">Rekening Tujuan</span>
                    <span class="font-mono text-slate-900 block font-bold">{{ dp.payment_request.bank_name || '-' }} - {{ dp.payment_request.bank_account_number || '-' }}</span>
                    <span class="text-xs text-slate-500 block pt-2">Atas Nama Rekening</span>
                    <span class="font-semibold text-slate-800 block">{{ dp.payment_request.bank_account_holder || '-' }}</span>
                </div>

                <div class="space-y-1">
                    <span class="text-xs text-slate-500 block">Nominal Permohonan</span>
                    <span class="font-mono text-base font-bold text-slate-900 block">{{ formatCurrency(dp.payment_request.amount, dp.payment_request.currency || dp.currency) }}</span>
                    <span class="text-xs text-slate-500 block pt-2">Diajukan Oleh</span>
                    <span class="text-slate-700 block">{{ dp.payment_request.requester?.name || 'Staff' }}</span>
                </div>
            </div>

            <!-- Disbursement Details if already paid -->
            <div v-if="dp.payment_request.payment" class="p-5 bg-emerald-50/50 space-y-3">
                <div class="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                    <span>Rincian Pembayaran Kas / Bank (Disbursed)</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span class="text-xs text-slate-500 block">Nomor Bukti Bayar</span>
                        <span class="font-mono font-bold text-slate-900">{{ dp.payment_request.payment.payment_number }}</span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Akun Sumber Dana</span>
                        <span class="font-semibold text-slate-900">{{ dp.payment_request.payment.source_account?.name || 'Kas / Bank' }}</span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">No. Referensi Bank</span>
                        <span class="font-mono font-semibold text-slate-900">{{ dp.payment_request.payment.reference_number || '-' }}</span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Tanggal Pencairan</span>
                        <span class="font-semibold text-slate-900">{{ formatDate(dp.payment_request.payment.payment_date) }}</span>
                    </div>
                </div>
            </div>

            <!-- Direct Disbursement Info Banner -->
            <div class="p-4 sm:p-5 bg-blue-50/40 flex items-start gap-3">
                <CheckCircle2 class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                    <p class="text-xs sm:text-sm font-semibold text-slate-800">Pembayaran ditangani tim Finance</p>
                    <p class="text-xs text-slate-600 mt-0.5">
                        Proses pencairan dilakukan melalui modul Finance; status dan bukti pembayaran diperbarui otomatis di sini.
                    </p>
                </div>
            </div>
        </div>

        <!-- Goods Receipts (GRN) Section -->
        <div v-if="section === 'receipts'" class="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div class="flex items-center gap-2.5">
                    <Truck class="w-5 h-5 text-blue-600" />
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Penerimaan barang</h3>
                        <p class="text-xs text-slate-500">Pemeriksaan fisik dan tanda terima barang gudang</p>
                    </div>
                </div>
            </div>

            <div v-if="dp.goods_receipts?.length > 0" class="divide-y divide-slate-100">
                <div v-for="gr in dp.goods_receipts" :key="gr.id" class="p-5 space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div class="flex flex-wrap items-center gap-2 font-mono font-bold text-slate-900">
                            <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{{ gr.grn_number }}</span>
                            <span 
                                :class="[
                                    'px-2 py-0.5 rounded text-xs font-sans font-semibold border',
                                    gr.handover_status === 'handed_over' 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                ]"
                            >
                                {{ gr.handover_status_label || (gr.handover_status === 'handed_over' ? 'Sudah Diambil Pemohon' : 'Sampai di Gudang (Belum Diambil)') }}
                            </span>
                            <span class="text-slate-500 font-sans font-normal text-xs ml-1">Surat Jalan:</span>
                            <span class="text-slate-800 text-xs sm:text-sm">{{ gr.delivery_note_number || '-' }}</span>
                        </div>
                        <div class="text-xs text-slate-500">
                            Diterima: <strong class="text-slate-800">{{ formatDate(gr.receipt_date) }}</strong>
                            <span v-if="gr.shipping_carrier" class="ml-2 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-sans">Kurir: {{ gr.shipping_carrier }}</span>
                        </div>
                    </div>

                    <!-- GR Items List -->
                    <div class="border-t border-slate-100 pt-3 overflow-x-auto">
                        <table class="w-full text-xs sm:text-sm text-left">
                            <thead>
                                <tr class="text-slate-500 border-b border-slate-200">
                                    <th class="py-2 font-medium">Deskripsi Item</th>
                                    <th class="py-2 text-right font-medium">Diterima Fisik</th>
                                    <th class="py-2 text-right font-medium text-emerald-700">Diterima Baik</th>
                                    <th class="py-2 text-right font-medium text-rose-700">Ditolak (Cacat)</th>
                                    <th class="py-2 pl-4 font-medium">Alasan Penolakan</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="it in gr.items" :key="it.id">
                                    <td class="py-2.5 font-medium text-slate-900">{{ it.item_description }}</td>
                                    <td class="py-2.5 text-right font-mono">{{ Number(it.quantity_received) }}</td>
                                    <td class="py-2.5 text-right font-mono font-bold text-emerald-700">{{ Number(it.quantity_accepted) }}</td>
                                    <td class="py-2.5 text-right font-mono font-bold text-rose-700">{{ Number(it.quantity_rejected) }}</td>
                                    <td class="py-2.5 pl-4 text-slate-500">{{ it.rejection_reason || '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div v-else class="p-8 text-center text-sm text-slate-400">
                Belum ada bukti fisik penerimaan barang yang dicatat untuk transaksi ini.
            </div>
        </div>
    </div>
</template>

<style scoped>
.flex.justify-between { gap: 1rem; align-items: start; }
.flex.justify-between > :last-child { min-width: 0; overflow-wrap: anywhere; }
h3 { font-weight: 600; }
.seller-summary { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.25rem; padding: .5rem .25rem 1.25rem; }
.cost-summary { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; padding: 1.25rem; }
.cost-row { display: flex; justify-content: space-between; align-items: start; gap: 1rem; }
.cost-row dt { color: #64748b; }
.cost-row dd { min-width: 0; text-align: right; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; color: #334155; }
@media (min-width: 640px) {
    .seller-summary { grid-template-columns: minmax(0, 1fr) minmax(160px, .5fr); }
    .cost-summary { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2rem; }
}
</style>
