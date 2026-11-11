<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import {
    getSupplierPortalPurchaseOrderDetail,
    acknowledgeSupplierPortalPurchaseOrder
} from '../../../services/supplierPortalServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal.js'
import { formatCurrency, formatDate } from '../../../composables/useFormatter.js'

import PageHeader from '../../../components/ui/PageHeader.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import StatusBadge from '../../../components/ui/StatusBadge.vue'

import {
    Home,
    ChevronRight,
    ArrowLeft,
    RefreshCw,
    Building2,
    Calendar,
    MapPin,
    CreditCard,
    CheckCircle2,
    FileText,
    Check
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

const poId = computed(() => route.params.id)
const po = ref(null)
const loading = ref(false)
const ackSubmitting = ref(false)

const ackForm = ref({
    acknowledged_by_name: '',
    expected_delivery_date: '',
    vendor_notes: ''
})

const fetchDetail = async () => {
    loading.value = true
    try {
        const res = await getSupplierPortalPurchaseOrderDetail(poId.value)
        po.value = res.data || res
        if (po.value) {
            ackForm.value.acknowledged_by_name = po.value.acknowledged_by_name || po.value.supplier?.contact_name || po.value.supplier?.name || ''
            ackForm.value.expected_delivery_date = po.value.expected_delivery_date || ''
            ackForm.value.vendor_notes = po.value.vendor_notes || ''
        }
    } catch (err) {
        showError('Gagal Memuat PO', err.response?.data?.message || 'Pesanan Pembelian tidak ditemukan.')
        router.push({ name: 'supplier.portal.purchase-orders' })
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchDetail()
})

const canAcknowledge = computed(() => {
    if (!po.value) return false
    return ['issued', 'approved'].includes(po.value.status)
})

const handleAcknowledge = async () => {
    if (!ackForm.value.acknowledged_by_name) {
        showError('Nama Penanggung Jawab Wajib Diisi', 'Silakan isi nama pejabat/PIC yang mengonfirmasi pesanan ini.')
        return
    }

    const confirmed = await showConfirm(
        'Konfirmasi Kesanggupan Pesanan (PO)?',
        `Dengan mengonfirmasi PO ${po.value.po_number}, perusahaan Anda menyepakati rincian barang, harga, dan jadwal pengiriman yang tertera.`
    )
    if (!confirmed) return

    ackSubmitting.value = true
    showLoading('Menyimpan konfirmasi pesanan...')
    try {
        await acknowledgeSupplierPortalPurchaseOrder(poId.value, ackForm.value)
        await showSuccess(
            'Pesanan Berhasil Dikonfirmasi!',
            'Terima kasih. Tim Purchasing PT Padma Soode Indonesia telah menerima konfirmasi kesanggupan pengiriman Anda.'
        )
        fetchDetail()
    } catch (err) {
        showError('Gagal Mengonfirmasi PO', err.response?.data?.message || 'Terjadi kesalahan saat menyimpan konfirmasi.')
    } finally {
        ackSubmitting.value = false
    }
}
</script>

<template>
    <div class="space-y-6">
        <PageHeader
            :title="po ? `Pesanan Pembelian — ${po.po_number}` : 'Detail Pesanan Pembelian (PO)'"
            subtitle="Rincian pesanan resmi dari PT Padma Soode Indonesia"
        >
            <template #breadcrumbs>
                <div class="flex items-center gap-2 text-xs text-slate-600">
                    <RouterLink :to="{ name: 'supplier.portal.dashboard' }" class="hover:text-blue-700">
                        <Home class="w-3.5 h-3.5" />
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <RouterLink :to="{ name: 'supplier.portal.purchase-orders' }" class="hover:text-blue-700">
                        Pesanan Pembelian (PO)
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span class="text-slate-900 font-semibold">{{ po?.po_number || 'Detail' }}</span>
                </div>
            </template>

            <template #actions>
                <div class="flex items-center gap-2.5">
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="router.push({ name: 'supplier.portal.purchase-orders' })"
                    >
                        <ArrowLeft class="w-4 h-4 mr-1.5" />
                        Kembali ke Daftar PO
                    </BaseButton>
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="fetchDetail"
                        :disabled="loading"
                    >
                        <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': loading }" />
                        Muat Ulang
                    </BaseButton>
                </div>
            </template>
        </PageHeader>

        <div v-if="loading && !po" class="p-12 text-center bg-white rounded-xl border border-slate-200">
            <RefreshCw class="w-7 h-7 mx-auto text-blue-600 animate-spin mb-3" />
            <p class="text-sm text-slate-600 font-medium">Memuat dokumen Pesanan Pembelian...</p>
        </div>

        <template v-else-if="po">
            <!-- Top Action / Status Banner for Vendor -->
            <div
                v-if="canAcknowledge"
                class="bg-blue-50 border border-blue-300 rounded-xl p-5 space-y-4"
            >
                <div>
                    <h3 class="text-base font-bold text-blue-950">
                        Mohon Konfirmasi Pesanan Pembelian (PO) Ini
                    </h3>
                    <p class="text-xs text-blue-900 mt-1">
                        Perusahaan Anda telah terpilih sebagai pemenang pengadaan. Silakan periksa rincian pesanan di bawah ini lalu isi formulir konfirmasi kesanggupan pengiriman.
                    </p>
                </div>

                <div class="bg-white rounded-xl border border-blue-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-800 mb-1">
                            Nama Pejabat / PIC Konfirmasi <span class="text-rose-600">*</span>
                        </label>
                        <input
                            v-model="ackForm.acknowledged_by_name"
                            type="text"
                            placeholder="Contoh: Bapak Hendra (Sales Manager)"
                            class="w-full text-xs rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-800 mb-1">
                            Estimasi Tanggal Pengiriman Barang
                        </label>
                        <input
                            v-model="ackForm.expected_delivery_date"
                            type="date"
                            class="w-full text-xs rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-800 mb-1">
                            Catatan Pengiriman (Opsional)
                        </label>
                        <input
                            v-model="ackForm.vendor_notes"
                            type="text"
                            placeholder="Contoh: Barang dikirim bertahap / siap kirim"
                            class="w-full text-xs rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div class="flex justify-end">
                    <BaseButton
                        variant="primary"
                        size="md"
                        :disabled="ackSubmitting"
                        @click="handleAcknowledge"
                        class="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                    >
                        <Check class="w-4 h-4 mr-1.5" />
                        Konfirmasi & Sanggupi Pesanan (PO)
                    </BaseButton>
                </div>
            </div>

            <!-- Already Acknowledged Banner -->
            <div
                v-else-if="po.acknowledged_at"
                class="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
            >
                <div class="flex items-start gap-3">
                    <CheckCircle2 class="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                    <div>
                        <h3 class="text-sm font-bold text-emerald-950">
                            Pesanan Pembelian Telah Dikonfirmasi
                        </h3>
                        <p class="text-xs text-emerald-900 mt-0.5">
                            Dikonfirmasi oleh <strong>{{ po.acknowledged_by_name }}</strong> pada {{ formatDate(po.acknowledged_at) }} • Target Pengiriman: <strong>{{ formatDate(po.expected_delivery_date) }}</strong>
                        </p>
                        <p v-if="po.vendor_notes" class="text-xs text-slate-700 mt-1">
                            Catatan: "{{ po.vendor_notes }}"
                        </p>
                    </div>
                </div>
                <StatusBadge :status="po.status" :label="po.status_label" />
            </div>

            <!-- Metadata Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                    <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Pemesan & Referensi</span>
                        <Building2 class="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Perusahaan Pemesan</span>
                        <span class="text-sm font-bold text-slate-900">{{ po.company?.name || 'PT Padma Soode Indonesia' }}</span>
                    </div>
                    <div v-if="po.rfq">
                        <span class="text-xs text-slate-500 block">Nomor Tender RFQ</span>
                        <span class="text-xs font-mono font-bold text-slate-800">{{ po.rfq.rfq_number }} — {{ po.rfq.title }}</span>
                    </div>
                    <div v-if="po.supplier_quotation">
                        <span class="text-xs text-slate-500 block">Referensi Surat Penawaran Anda</span>
                        <span class="text-xs font-mono font-semibold text-blue-800">
                            {{ po.supplier_quotation.vendor_quotation_reference || po.supplier_quotation.quotation_number }}
                        </span>
                    </div>
                </div>

                <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                    <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Jadwal & Tujuan Kirim</span>
                        <Calendar class="w-4 h-4 text-slate-400" />
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <span class="text-xs text-slate-500 block">Tanggal Terbit PO</span>
                            <span class="text-xs font-bold text-slate-900">{{ formatDate(po.po_date) }}</span>
                        </div>
                        <div>
                            <span class="text-xs text-slate-500 block">Target Pengiriman</span>
                            <span class="text-xs font-bold text-slate-900">{{ formatDate(po.expected_delivery_date) || '-' }}</span>
                        </div>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Syarat Pembayaran</span>
                        <span class="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                            <CreditCard class="w-3.5 h-3.5 text-slate-400" />
                            {{ po.payment_terms || 'Sesuai Kesepakatan' }}
                        </span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Alamat Pengiriman Barang</span>
                        <span class="text-xs text-slate-700 flex items-start gap-1.5 mt-0.5">
                            <MapPin class="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <span>{{ po.delivery_address || 'Gudang Utama PT Padma Soode Indonesia' }}</span>
                        </span>
                    </div>
                </div>

                <div class="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-3">
                    <div>
                        <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Ringkasan Nilai Pesanan</span>
                            <FileText class="w-4 h-4 text-slate-400" />
                        </div>
                        <div class="mt-3 space-y-2 text-xs">
                            <div class="flex justify-between text-slate-600">
                                <span>Subtotal Barang ({{ po.items?.length || 0 }} Item):</span>
                                <span class="font-mono font-semibold text-slate-900">{{ formatCurrency(po.subtotal) }}</span>
                            </div>
                            <div class="flex justify-between text-slate-600">
                                <span>PPN ({{ Number(po.tax_rate || 0) }}%):</span>
                                <span class="font-mono font-semibold text-slate-900">{{ formatCurrency(po.tax_amount) }}</span>
                            </div>
                            <div class="flex justify-between text-slate-600">
                                <span>Biaya Pengiriman (Ongkir):</span>
                                <span class="font-mono font-semibold text-slate-900">{{ formatCurrency(po.shipping_cost) }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="pt-3 border-t-2 border-slate-200 flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-800 uppercase">Total Nilai PO:</span>
                        <span class="text-base font-extrabold font-mono text-blue-700">{{ formatCurrency(po.total_amount) }}</span>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 class="text-sm font-bold text-slate-900">Daftar Barang yang Harus Dikirim</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-700">
                                <th class="py-3 px-4 w-12 text-center">No</th>
                                <th class="py-3 px-4">Nama & Spesifikasi Barang</th>
                                <th class="py-3 px-4 text-center">Merk</th>
                                <th class="py-3 px-4 text-right">Jumlah Dipesan</th>
                                <th class="py-3 px-4 text-right">Harga Satuan</th>
                                <th class="py-3 px-4 text-right">Subtotal</th>
                                <th class="py-3 px-4 text-center">Target Kirim</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 text-xs">
                            <tr v-for="(item, idx) in po.items" :key="item.id" class="hover:bg-slate-50">
                                <td class="py-3.5 px-4 text-center font-medium text-slate-600">{{ idx + 1 }}</td>
                                <td class="py-3.5 px-4">
                                    <div class="font-bold text-sm text-slate-900">{{ item.item_name }}</div>
                                    <div v-if="item.item_specifications" class="text-xs text-slate-600 mt-0.5">
                                        {{ item.item_specifications }}
                                    </div>
                                </td>
                                <td class="py-3.5 px-4 text-center text-slate-700">{{ item.brand || '-' }}</td>
                                <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                                    {{ Number(item.quantity).toLocaleString('id-ID') }} {{ item.unit?.name || 'Unit' }}
                                </td>
                                <td class="py-3.5 px-4 text-right font-mono text-slate-800">
                                    {{ formatCurrency(item.unit_price) }}
                                </td>
                                <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                                    {{ formatCurrency(item.subtotal) }}
                                </td>
                                <td class="py-3.5 px-4 text-center text-slate-700">
                                    {{ formatDate(item.expected_delivery_date) || (item.lead_time_days ? `${item.lead_time_days} hari` : '-') }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>
    </div>
</template>
