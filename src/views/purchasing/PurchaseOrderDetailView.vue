<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import {
    showPurchaseOrder,
    updatePurchaseOrder,
    submitPurchaseOrder,
    issuePurchaseOrder,
    cancelPurchaseOrder
} from '../../services/purchaseOrderServices.js'
import { showLoading, showSuccess, showError, showConfirm, showPrompt } from '../../utils/swal.js'
import { formatCurrency, formatDate } from '../../composables/useFormatter.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import DocumentWorkflowTracker from '../../components/approval/DocumentWorkflowTracker.vue'

import {
    Home,
    ChevronRight,
    ArrowLeft,
    RefreshCw,
    FileText,
    Building2,
    Calendar,
    MapPin,
    CreditCard,
    CheckCircle2,
    Send,
    Ban,
    Check,
    Pencil,
    X
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

const poId = computed(() => route.params.id)
const po = ref(null)
const loading = ref(false)

// Edit modal for Draft / Revision Requested PO
const isEditModalOpen = ref(false)
const editSubmitting = ref(false)
const editForm = ref({
    po_date: '',
    expected_delivery_date: '',
    payment_terms: '',
    delivery_address: '',
    shipping_cost: 0,
    notes: ''
})

const fetchPoDetail = async () => {
    loading.value = true
    try {
        const res = await showPurchaseOrder(poId.value)
        po.value = res.data || res
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal memuat rincian Purchase Order')
        router.push({ name: 'user.purchasing.orders' })
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchPoDetail()
})

// 4-Stage PO Stepper
const poSteps = computed(() => {
    const status = po.value?.status
    return [
        {
            key: 'draft',
            label: 'Penyusunan PO',
            description: 'Dokumen PO dibuat dari pemenang tender',
            meta: po.value?.po_date ? `Tgl PO: ${formatDate(po.value.po_date)}` : 'Draf PO'
        },
        {
            key: 'approval',
            label: 'Persetujuan Internal',
            description: 'Verifikasi manajemen & keuangan',
            meta: status === 'pending_approval'
                ? 'Menunggu keputusan pimpinan'
                : (po.value?.approved_at ? `Disetujui ${formatDate(po.value.approved_at)}` : 'Tahap verifikasi')
        },
        {
            key: 'issued',
            label: 'Diterbitkan ke Vendor',
            description: 'PO resmi dikirim ke Portal Supplier',
            meta: po.value?.issued_at ? `Terbit: ${formatDate(po.value.issued_at)}` : 'Menunggu penerbitan'
        },
        {
            key: 'acknowledged',
            label: 'Konfirmasi Vendor',
            description: 'Vendor menyanggupi pengiriman barang',
            meta: po.value?.acknowledged_at
                ? `Dikonfirmasi: ${po.value.acknowledged_by_name || 'Vendor'}`
                : 'Menunggu konfirmasi vendor'
        }
    ]
})

const currentStepIndex = computed(() => {
    const st = po.value?.status
    if (!st) return 0
    if (st === 'draft' || st === 'revision_requested' || st === 'rejected') return 0
    if (st === 'pending_approval') return 1
    if (st === 'approved') return 2
    if (st === 'issued') return 3
    if (['acknowledged', 'partially_received', 'completed'].includes(st)) return 4
    return 0
})

const getStepState = (idx) => {
    if (!po.value || po.value.status === 'cancelled') return 'upcoming'
    if (currentStepIndex.value === 4) return 'completed'
    if (idx < currentStepIndex.value) return 'completed'
    if (idx === currentStepIndex.value) return 'active'
    return 'upcoming'
}

const openEditModal = () => {
    if (!po.value) return
    editForm.value = {
        po_date: po.value.po_date || '',
        expected_delivery_date: po.value.expected_delivery_date || '',
        payment_terms: po.value.payment_terms || '',
        delivery_address: po.value.delivery_address || '',
        shipping_cost: Number(po.value.shipping_cost || 0),
        notes: po.value.notes || ''
    }
    isEditModalOpen.value = true
}

const handleSaveEdit = async () => {
    editSubmitting.value = true
    try {
        await updatePurchaseOrder(poId.value, editForm.value)
        await showSuccess('Berhasil Diperbarui', 'Informasi Purchase Order berhasil disimpan.')
        isEditModalOpen.value = false
        fetchPoDetail()
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal memperbarui Purchase Order')
    } finally {
        editSubmitting.value = false
    }
}

const handleSubmitApproval = async () => {
    const confirmed = await showConfirm(
        'Ajukan Persetujuan PO?',
        'Dokumen Purchase Order ini akan dikirimkan ke pejabat berwenang untuk disetujui.'
    )
    if (!confirmed) return

    showLoading('Mengajukan persetujuan PO...')
    try {
        await submitPurchaseOrder(poId.value)
        await showSuccess('Berhasil Diajukan!', 'Purchase Order telah masuk ke antrean persetujuan.')
        fetchPoDetail()
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal mengajukan persetujuan PO')
    }
}

const handleIssueToVendor = async () => {
    const confirmed = await showConfirm(
        'Terbitkan PO ke Vendor?',
        `Purchase Order ${po.value?.po_number} akan diterbitkan secara resmi ke Portal Rekanan (${po.value?.supplier?.name || 'Vendor'}) untuk dikonfirmasi.`
    )
    if (!confirmed) return

    showLoading('Menerbitkan PO ke vendor...')
    try {
        await issuePurchaseOrder(poId.value)
        await showSuccess('PO Diterbitkan ke Vendor!', 'Vendor kini dapat melihat dan mengonfirmasi PO ini di Portal Rekanan.')
        fetchPoDetail()
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal menerbitkan PO ke vendor')
    }
}

const handleCancelPo = async () => {
    const reason = await showPrompt(
        'Batalkan Purchase Order',
        'Masukkan alasan pembatalan Purchase Order ini:',
        'Alasan pembatalan'
    )
    if (!reason) return

    showLoading('Membatalkan Purchase Order...')
    try {
        await cancelPurchaseOrder(poId.value, reason)
        await showSuccess('PO Dibatalkan', 'Purchase Order berhasil dibatalkan.')
        fetchPoDetail()
    } catch (err) {
        showError(err.response?.data?.message || 'Gagal membatalkan Purchase Order')
    }
}
</script>

<template>
    <div class="space-y-6">
        <PageHeader
            :title="po ? `${po.po_number} — ${po.supplier?.name || 'Vendor'}` : 'Rincian Purchase Order'"
            subtitle="Dokumen pesanan pembelian resmi perusahaan kepada pemasok terpilih"
        >
            <template #breadcrumbs>
                <div class="flex items-center gap-2 text-xs text-slate-600">
                    <RouterLink :to="{ name: 'user.dashboard' }" class="hover:text-blue-700">
                        <Home class="w-3.5 h-3.5" />
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <RouterLink :to="{ name: 'user.purchasing' }" class="hover:text-blue-700">
                        Purchasing
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <RouterLink :to="{ name: 'user.purchasing.orders' }" class="hover:text-blue-700">
                        Purchase Order
                    </RouterLink>
                    <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
                    <span class="text-slate-900 font-semibold">{{ po?.po_number || 'Detail' }}</span>
                </div>
            </template>

            <template #actions>
                <div class="flex flex-wrap items-center gap-2.5">
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="router.push({ name: 'user.purchasing.orders' })"
                    >
                        <ArrowLeft class="w-4 h-4 mr-1.5" />
                        Kembali
                    </BaseButton>

                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="fetchPoDetail"
                        :disabled="loading"
                    >
                        <RefreshCw class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': loading }" />
                        Muat Ulang
                    </BaseButton>

                    <template v-if="po">
                        <BaseButton
                            v-if="['draft', 'revision_requested', 'pending_approval', 'approved', 'issued'].includes(po.status)"
                            variant="destructive"
                            size="sm"
                            @click="handleCancelPo"
                        >
                            <Ban class="w-4 h-4 mr-1.5" />
                            Batalkan PO
                        </BaseButton>

                        <BaseButton
                            v-if="['draft', 'revision_requested'].includes(po.status)"
                            variant="outline"
                            size="sm"
                            @click="openEditModal"
                        >
                            <Pencil class="w-4 h-4 mr-1.5" />
                            Ubah Ketentuan PO
                        </BaseButton>

                        <BaseButton
                            v-if="['draft', 'revision_requested'].includes(po.status)"
                            variant="primary"
                            size="sm"
                            @click="handleSubmitApproval"
                            class="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Send class="w-4 h-4 mr-1.5" />
                            {{ po.status === 'revision_requested' ? 'Ajukan Ulang Persetujuan' : 'Ajukan Persetujuan PO' }}
                        </BaseButton>

                        <BaseButton
                            v-if="['approved', 'draft'].includes(po.status)"
                            variant="primary"
                            size="sm"
                            @click="handleIssueToVendor"
                            class="bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                            <CheckCircle2 class="w-4 h-4 mr-1.5" />
                            Terbitkan PO ke Vendor
                        </BaseButton>
                    </template>
                </div>
            </template>
        </PageHeader>

        <!-- Loading -->
        <div v-if="loading && !po" class="p-12 text-center bg-white rounded-xl border border-slate-200">
            <RefreshCw class="w-7 h-7 mx-auto text-blue-600 animate-spin mb-3" />
            <p class="text-sm text-slate-600 font-medium">Memuat rincian Purchase Order...</p>
        </div>

        <template v-else-if="po">
            <!-- Stepper Card Bar -->
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-600">Tahapan Purchase Order</span>
                        <StatusBadge :status="po.status" :label="po.status_label" />
                    </div>
                    <div v-if="po.acknowledged_at" class="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                        <span>Dikonfirmasi oleh {{ po.acknowledged_by_name || 'Vendor' }} pada {{ formatDate(po.acknowledged_at) }}</span>
                    </div>
                </div>

                <div v-if="po.status !== 'cancelled'" class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div
                        v-for="(step, idx) in poSteps"
                        :key="step.key"
                        class="rounded-xl border p-4 flex flex-col justify-between"
                        :class="[
                            getStepState(idx) === 'completed'
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : getStepState(idx) === 'active'
                                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-100'
                                    : 'bg-slate-50/60 border-slate-200'
                        ]"
                    >
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2.5">
                                <div class="flex items-center gap-2">
                                    <div
                                        class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                                        :class="[
                                            getStepState(idx) === 'completed'
                                                ? 'bg-emerald-600 text-white'
                                                : getStepState(idx) === 'active'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-200 text-slate-600'
                                        ]"
                                    >
                                        <Check v-if="getStepState(idx) === 'completed'" class="w-4 h-4 stroke-[2.5]" />
                                        <span v-else>{{ idx + 1 }}</span>
                                    </div>
                                    <span class="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Tahap {{ idx + 1 }}
                                    </span>
                                </div>
                                <span
                                    class="text-[11px] font-semibold px-2 py-0.5 rounded border"
                                    :class="[
                                        getStepState(idx) === 'completed'
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                            : getStepState(idx) === 'active'
                                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                                : 'bg-white text-slate-500 border-slate-200'
                                    ]"
                                >
                                    {{ getStepState(idx) === 'completed' ? 'Selesai' : getStepState(idx) === 'active' ? 'Berjalan' : 'Menunggu' }}
                                </span>
                            </div>
                            <h4 class="text-sm font-bold text-slate-900">{{ step.label }}</h4>
                            <p class="text-xs text-slate-600 mt-1">{{ step.description }}</p>
                        </div>
                        <div class="mt-3 pt-2.5 border-t border-slate-200/80 text-xs font-medium text-slate-700">
                            {{ step.meta }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Vendor Acknowledgement Box if Acknowledged -->
            <div v-if="po.acknowledged_at" class="bg-emerald-50/80 border border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h4 class="text-sm font-bold text-emerald-950">Konfirmasi Kesanggupan Vendor</h4>
                    <p class="text-xs text-emerald-800 mt-0.5">
                        Dikonfirmasi oleh <strong>{{ po.acknowledged_by_name }}</strong> • Estimasi Pengiriman: <strong>{{ formatDate(po.expected_delivery_date) }}</strong>
                    </p>
                    <p v-if="po.vendor_notes" class="text-xs text-slate-700 mt-1 bg-white px-3 py-1.5 rounded border border-emerald-200">
                        Catatan Vendor: "{{ po.vendor_notes }}"
                    </p>
                </div>
            </div>

            <!-- Metadata Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <!-- Card 1: Vendor & Source Document -->
                <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                    <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Vendor & Referensi</span>
                        <Building2 class="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                        <span class="text-xs text-slate-500 block">Nama Pemasok (Vendor)</span>
                        <span class="text-sm font-bold text-slate-900">{{ po.supplier?.name || '-' }}</span>
                        <span class="text-xs text-slate-500 font-mono block">{{ po.supplier?.supplier_code || '' }}</span>
                    </div>
                    <div v-if="po.rfq">
                        <span class="text-xs text-slate-500 block">Sumber Tender RFQ</span>
                        <RouterLink
                            :to="{ name: 'user.purchasing.rfq.detail', params: { id: po.rfq.id } }"
                            class="text-xs font-mono font-bold text-blue-700 hover:underline"
                        >
                            {{ po.rfq.rfq_number }} — {{ po.rfq.title }}
                        </RouterLink>
                    </div>
                    <div v-if="po.supplier_quotation">
                        <span class="text-xs text-slate-500 block">No. Penawaran Vendor</span>
                        <span class="text-xs font-mono font-semibold text-slate-800">
                            {{ po.supplier_quotation.quotation_number }}
                            <span v-if="po.supplier_quotation.vendor_quotation_reference" class="text-slate-500">
                                (Ref: {{ po.supplier_quotation.vendor_quotation_reference }})
                            </span>
                        </span>
                    </div>
                </div>

                <!-- Card 2: Delivery & Payment Terms -->
                <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                    <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Jadwal & Pengiriman</span>
                        <Calendar class="w-4 h-4 text-slate-400" />
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <span class="text-xs text-slate-500 block">Tanggal PO</span>
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
                        <span class="text-xs text-slate-500 block">Alamat Tujuan Pengiriman</span>
                        <span class="text-xs text-slate-700 flex items-start gap-1.5 mt-0.5">
                            <MapPin class="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <span>{{ po.delivery_address || 'Gudang Utama PT Padma Soode Indonesia' }}</span>
                        </span>
                    </div>
                </div>

                <!-- Card 3: Financial Summary -->
                <div class="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-3">
                    <div>
                        <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Ringkasan Biaya PO</span>
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

            <!-- Line Items Table -->
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 class="text-sm font-bold text-slate-900">Daftar Rincian Barang yang Dipesan</h3>
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
                                <th class="py-3 px-4 text-center">Waktu Kirim</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 text-xs">
                            <tr v-for="(item, idx) in po.items" :key="item.id" class="hover:bg-slate-50">
                                <td class="py-3.5 px-4 text-center font-medium text-slate-600">{{ idx + 1 }}</td>
                                <td class="py-3.5 px-4">
                                    <div class="font-bold text-sm text-slate-900">{{ item.item_name }}</div>
                                    <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                                        <span v-if="item.item?.code" class="font-mono text-[11px] text-slate-500">{{ item.item.code }}</span>
                                        <span v-if="item.source_pp_number" class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[10px]">
                                            {{ item.source_pp_number }}
                                        </span>
                                        <span v-if="item.source_pr_number" class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px]">
                                            {{ item.source_pr_number }}
                                        </span>
                                    </div>
                                    <div v-if="item.item_specifications" class="text-xs text-slate-600 mt-1">
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
                                    <span v-if="item.lead_time_days">{{ item.lead_time_days }} hari</span>
                                    <span v-else>{{ formatDate(item.expected_delivery_date) || '-' }}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Approval Workflow Tracker -->
            <DocumentWorkflowTracker
                document-type="purchase_order"
                :document-id="po.id"
                title="Alur Persetujuan Purchase Order (Workflow)"
                hide-if-empty
            />
        </template>

        <!-- Edit Modal -->
        <div
            v-if="isEditModalOpen"
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
            @click.self="isEditModalOpen = false"
        >
            <div class="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <h3 class="text-sm font-bold text-slate-900">Ubah Ketentuan Purchase Order</h3>
                    <button type="button" @click="isEditModalOpen = false" class="text-slate-400 hover:text-slate-600">
                        <X class="w-5 h-5" />
                    </button>
                </div>
                <div class="p-6 space-y-4 text-xs">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Tanggal PO</label>
                            <input v-model="editForm.po_date" type="date" class="w-full rounded-lg border-slate-300 text-xs" />
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Target Pengiriman</label>
                            <input v-model="editForm.expected_delivery_date" type="date" class="w-full rounded-lg border-slate-300 text-xs" />
                        </div>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Syarat Pembayaran</label>
                        <input v-model="editForm.payment_terms" type="text" class="w-full rounded-lg border-slate-300 text-xs" />
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Biaya Pengiriman / Ongkir (IDR)</label>
                        <input v-model.number="editForm.shipping_cost" type="number" min="0" class="w-full rounded-lg border-slate-300 text-xs font-mono" />
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Alamat Tujuan Pengiriman</label>
                        <textarea v-model="editForm.delivery_address" rows="2" class="w-full rounded-lg border-slate-300 text-xs"></textarea>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                        <textarea v-model="editForm.notes" rows="2" class="w-full rounded-lg border-slate-300 text-xs"></textarea>
                    </div>
                </div>
                <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                    <BaseButton variant="outline" size="sm" @click="isEditModalOpen = false">Batal</BaseButton>
                    <BaseButton variant="primary" size="sm" :disabled="editSubmitting" @click="handleSaveEdit" class="bg-blue-600 hover:bg-blue-700 text-white">
                        Simpan Perubahan
                    </BaseButton>
                </div>
            </div>
        </div>
    </div>
</template>
