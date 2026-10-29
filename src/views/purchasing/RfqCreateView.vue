<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { createRfq } from '../../services/rfqServices.js'
import { getProcurementPlans, showProcurementPlan } from '../../services/procurementPlanServices.js'
import { getSuppliers } from '../../services/supplierServices.js'
import { showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { formatCurrency, formatDate } from '../../composables/useFormatter.js'

import PageHeader from '../../components/ui/PageHeader.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import SearchableMultiSelect from '../../components/ui/SearchableMultiSelect.vue'

import {
    ArrowLeft,
    Scale,
    Layers,
    Calendar,
    Building2,
    Users,
    FileText,
    CheckCircle2,
    AlertCircle,
    Info,
    Trash2,
    Plus,
    Save,
    MapPin,
    CreditCard,
    Package,
    Clock,
    Search
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()

// States
const isSubmitting = ref(false)
const isLoadingPlans = ref(false)
const isLoadingPlanDetail = ref(false)
const isLoadingSuppliers = ref(false)

// Data sources
const procurementPlans = ref([])
const selectedPlan = ref(null)
const masterSuppliers = ref([])

// Form model
const form = ref({
    procurement_plan_id: '',
    title: '',
    issue_date: new Date().toISOString().substring(0, 10),
    deadline_date: '',
    delivery_address: 'Kawasan Industri Bekasi Blok C-12, PT Padma Soode Indonesia',
    payment_terms_requested: 'Tempo 60 Hari',
    notes: ''
})

// Item lines from selected procurement plan
const planItems = ref([])

// Selected supplier IDs
const selectedSupplierIds = ref([])

// Computed suppliers list mapped for multi-select
const supplierOptions = computed(() => {
    return masterSuppliers.value.map(s => ({
        value: s.id,
        label: `${s.name} (${s.supplier_code || 'SUP-' + s.id})`
    }))
})

// Selected full supplier objects
const selectedSuppliers = computed(() => {
    return masterSuppliers.value.filter(s => selectedSupplierIds.value.includes(s.id))
})

// Active items included in RFQ
const activeItems = computed(() => {
    return planItems.value.filter(item => item.is_selected)
})

// Fetch active RFQ procurement plans
const fetchAvailablePlans = async () => {
    try {
        isLoadingPlans.value = true
        // Fetch plans with method = rfq and status = active
        const res = await getProcurementPlans({ procurement_method: 'rfq', status: 'active' }, 1, 100)
        procurementPlans.value = res.data || []
    } catch (err) {
        console.error('Failed to load procurement plans:', err)
        showError('Gagal Memuat Rencana Pengadaan', 'Tidak dapat mengambil data procurement plan bertipe RFQ.')
    } finally {
        isLoadingPlans.value = false
    }
}

// Fetch active master suppliers
const fetchSuppliers = async () => {
    try {
        isLoadingSuppliers.value = true
        const res = await getSuppliers('', 1, { is_active: true }, 200)
        masterSuppliers.value = res.data || []
    } catch (err) {
        console.error('Failed to load suppliers:', err)
    } finally {
        isLoadingSuppliers.value = false
    }
}

// Handle plan change
const onPlanChange = async () => {
    if (!form.value.procurement_plan_id) {
        selectedPlan.value = null
        planItems.value = []
        return
    }

    try {
        isLoadingPlanDetail.value = true
        const res = await showProcurementPlan(form.value.procurement_plan_id)
        const plan = res.data || res
        selectedPlan.value = plan

        // Auto-fill title if empty
        if (!form.value.title) {
            form.value.title = `Tender Pengadaan ${plan.pp_number || ''} - ${plan.purchase_requisition?.purpose || 'Multi-Vendor'}`.trim()
        }

        // Map items from plan
        if (Array.isArray(plan.items)) {
            planItems.value = plan.items.map(item => {
                const remaining = Number(item.remaining_quantity ?? item.remaining_rfq_quantity ?? item.planned_quantity ?? 0)
                const prItem = item.purchase_requisition_item || {}
                const catalogItem = prItem.item || item.item || {}
                const unit = prItem.unit || item.unit || {}
                const resolvedItemName = prItem.item_name || catalogItem.name || item.item_name || 'Item Pengadaan'
                const resolvedItemCode = catalogItem.code || catalogItem.item_code || item.item_code || null
                const resolvedUnitName = unit.code || unit.symbol || unit.name || item.unit_name || 'Unit'
                const resolvedUnitId = unit.id || item.unit_id || prItem.unit_id || null

                return {
                    procurement_plan_item_id: item.id,
                    item_id: prItem.item_id || item.item_id || catalogItem.id || null,
                    item_name: resolvedItemName,
                    item_code: resolvedItemCode,
                    item_specifications: item.item_specifications || prItem.detail_name || catalogItem.description || '',
                    unit_id: resolvedUnitId,
                    unit_name: resolvedUnitName,
                    remaining_quantity: remaining,
                    target_quantity: remaining > 0 ? remaining : 1,
                    target_price: Number(item.estimated_unit_price || prItem.estimated_price || 0),
                    required_delivery_date: plan.required_date || '',
                    notes: item.notes || '',
                    is_selected: remaining > 0
                }
            })
        }
    } catch (err) {
        console.error('Failed to load plan details:', err)
        showError('Gagal Memuat Detail Rencana', 'Terjadi kesalahan saat memuat rincian item rencana pengadaan.')
    } finally {
        isLoadingPlanDetail.value = false
    }
}

// Remove supplier from selected list
const removeSupplier = (id) => {
    selectedSupplierIds.value = selectedSupplierIds.value.filter(sId => sId !== id)
}

// Quick validation before submit
const validateForm = () => {
    if (!form.value.procurement_plan_id) {
        showError('Validasi Gagal', 'Silakan pilih Dokumen Procurement Plan terlebih dahulu.')
        return false
    }
    if (!form.value.title || !form.value.title.trim()) {
        showError('Validasi Gagal', 'Judul Tender RFQ wajib diisi.')
        return false
    }
    if (!form.value.deadline_date) {
        showError('Validasi Gagal', 'Tanggal Batas Akhir Penawaran (Deadline) wajib diisi.')
        return false
    }

    if (activeItems.value.length === 0) {
        showError('Validasi Gagal', 'Pilih minimal satu item untuk dimasukkan ke paket tender ini.')
        return false
    }

    for (const it of activeItems.value) {
        if (!it.target_quantity || Number(it.target_quantity) <= 0) {
            showError('Validasi Gagal', `Kuantitas target untuk item "${it.item_name}" harus lebih besar dari 0.`)
            return false
        }
        if (Number(it.target_quantity) > Number(it.remaining_quantity)) {
            showError('Validasi Gagal', `Kuantitas target "${it.item_name}" (${it.target_quantity}) melebihi sisa kuota yang tersedia (${it.remaining_quantity}).`)
            return false
        }
    }

    if (selectedSupplierIds.value.length === 0) {
        showError('Validasi Gagal', 'Pilih minimal satu vendor / supplier yang akan diundang ke tender ini.')
        return false
    }

    return true
}

// Submit RFQ Draft
const handleSubmit = async () => {
    if (!validateForm()) return

    isSubmitting.value = true
    try {
        const payload = {
            procurement_plan_id: parseInt(form.value.procurement_plan_id, 10),
            title: form.value.title.trim(),
            issue_date: form.value.issue_date,
            deadline_date: form.value.deadline_date,
            delivery_address: form.value.delivery_address || null,
            payment_terms_requested: form.value.payment_terms_requested || null,
            notes: form.value.notes || null,
            items: activeItems.value.map(it => ({
                procurement_plan_item_id: it.procurement_plan_item_id,
                item_id: it.item_id,
                item_name: it.item_name,
                item_specifications: it.item_specifications || null,
                unit_id: it.unit_id,
                target_quantity: Number(it.target_quantity),
                target_price: it.target_price ? Number(it.target_price) : null,
                required_delivery_date: it.required_delivery_date || null,
                notes: it.notes || null
            })),
            suppliers: selectedSuppliers.value.map(s => ({
                supplier_id: s.id,
                contact_person: s.contact_person || s.contacts?.[0]?.name || null,
                email: s.email || s.contacts?.[0]?.email || null,
                phone: s.phone || s.contacts?.[0]?.phone || null
            }))
        }

        const res = await createRfq(payload)
        const createdRfq = res.data || res

        showSuccess('Berhasil!', `Draf tender RFQ ${createdRfq.rfq_number || form.value.title} berhasil dibuat.`)
        router.push({
            name: 'user.purchasing.rfq.detail',
            params: { id: createdRfq.id }
        })
    } catch (err) {
        console.error('Failed to create RFQ:', err)
        showError('Gagal Membuat RFQ', err.response?.data?.message || 'Terjadi kesalahan saat menyimpan draf RFQ.')
    } finally {
        isSubmitting.value = false
    }
}

onMounted(async () => {
    await Promise.all([
        fetchAvailablePlans(),
        fetchSuppliers()
    ])

    // If plan_id query parameter is present, select it automatically
    if (route.query.plan_id) {
        form.value.procurement_plan_id = String(route.query.plan_id)
        await onPlanChange()
    }
})
</script>

<template>
    <div class="space-y-6 max-w-6xl mx-auto pb-16">
        <!-- Page Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <RouterLink
                    :to="{ name: 'user.purchasing.rfq' }"
                    class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Kembali ke Daftar RFQ"
                >
                    <ArrowLeft class="w-5 h-5" />
                </RouterLink>
                <div>
                    <h1 class="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Buat Tender Request for Quotation (RFQ)</span>
                        <span class="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                            Multi-Vendor
                        </span>
                    </h1>
                    <p class="text-xs text-slate-500 mt-0.5">
                        Inisiasi paket permintaan penawaran harga vendor dari alokasi Procurement Plan.
                    </p>
                </div>
            </div>
        </div>

        <!-- Step 1: Pilih Procurement Plan -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    1
                </div>
                <div>
                    <h3 class="text-sm font-bold text-slate-900">Pilih Alokasi Procurement Plan</h3>
                    <p class="text-xs text-slate-500">Pilih dokumen rencana pengadaan bertipe RFQ yang siap dieksekusi</p>
                </div>
            </div>

            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-bold text-slate-800 mb-1">
                        Dokumen Procurement Plan <span class="text-rose-500">*</span>
                    </label>
                    <select
                        v-model="form.procurement_plan_id"
                        @change="onPlanChange"
                        :disabled="isLoadingPlans || isLoadingPlanDetail"
                        class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all font-mono"
                    >
                        <option value="" disabled>-- Pilih Dokumen Procurement Plan --</option>
                        <option
                            v-for="plan in procurementPlans"
                            :key="plan.id"
                            :value="plan.id"
                        >
                            {{ plan.pp_number }} — {{ plan.purchase_requisition?.purpose || plan.title || 'Pengadaan RFQ' }} ({{ plan.items?.length || 0 }} Item)
                        </option>
                    </select>
                </div>

                <!-- Selected Plan Summary Card -->
                <div v-if="selectedPlan" class="bg-blue-50/40 border border-blue-200/70 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 font-bold text-slate-900">
                            <Layers class="w-4 h-4 text-blue-600" />
                            <span>{{ selectedPlan.pp_number }}</span>
                            <span class="text-slate-400 font-normal">| Ref PR: {{ selectedPlan.purchase_requisition?.pr_number || '-' }}</span>
                        </div>
                        <div class="text-slate-600">
                            Perusahaan: <strong class="text-slate-800">{{ selectedPlan.company?.name || selectedPlan.purchase_requisition?.company?.name || '-' }}</strong>
                            • Divisi: <strong class="text-slate-800">{{ selectedPlan.division?.name || selectedPlan.purchase_requisition?.division?.name || '-' }}</strong>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-700 font-bold font-mono">
                            {{ planItems.length }} Item Tersedia
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 2: Informasi Tender & Syarat Pengadaan -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    2
                </div>
                <div>
                    <h3 class="text-sm font-bold text-slate-900">Informasi Tender & Ketentuan</h3>
                    <p class="text-xs text-slate-500">Atur judul paket, batas akhir penawaran, alamat kirim, dan syarat pembayaran</p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <!-- Title -->
                <div class="md:col-span-2">
                    <label class="block font-bold text-slate-800 mb-1">
                        Judul Paket Tender <span class="text-rose-500">*</span>
                    </label>
                    <input
                        v-model="form.title"
                        type="text"
                        placeholder="Contoh: Tender Pengadaan Plat Baja SPCC & Baut Machining Q4"
                        class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all font-medium"
                    />
                </div>

                <!-- Issue Date & Deadline Date -->
                <div>
                    <label class="block font-bold text-slate-800 mb-1">
                        Tanggal Penerbitan RFQ
                    </label>
                    <input
                        v-model="form.issue_date"
                        type="date"
                        class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all"
                    />
                </div>

                <div>
                    <label class="block font-bold text-slate-800 mb-1">
                        Batas Akhir Penawaran (Deadline) <span class="text-rose-500">*</span>
                    </label>
                    <input
                        v-model="form.deadline_date"
                        type="date"
                        class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all"
                    />
                </div>

                <!-- Delivery Address -->
                <div>
                    <label class="block font-bold text-slate-800 mb-1">
                        Alamat Pengiriman / Franco Gudang
                    </label>
                    <input
                        v-model="form.delivery_address"
                        type="text"
                        placeholder="Contoh: Kawasan Industri Bekasi Blok C-12, PT Padma Soode Indonesia"
                        class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all"
                    />
                </div>

                <!-- Payment Terms -->
                <div>
                    <label class="block font-bold text-slate-800 mb-1">
                        Syarat Pembayaran yang Diminta (TOP)
                    </label>
                    <input
                        v-model="form.payment_terms_requested"
                        type="text"
                        placeholder="Contoh: Tempo 60 Hari / SKBDN / Cash on Delivery"
                        class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all"
                    />
                </div>

                <!-- Notes -->
                <div class="md:col-span-2">
                    <label class="block font-bold text-slate-800 mb-1">
                        Catatan / Syarat Khusus Tender
                    </label>
                    <textarea
                        v-model="form.notes"
                        rows="2"
                        placeholder="Contoh: Wajib menyertakan Mill Certificate, toleransi ketebalan +/- 0.05mm, garansi 1 tahun..."
                        class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all resize-none"
                    ></textarea>
                </div>
            </div>
        </div>

        <!-- Step 3: Rincian Item Tender -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        3
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Rincian Item yang Ditenderkan</h3>
                        <p class="text-xs text-slate-500">Tentukan kuantitas target dan Harga Perkiraan Sendiri (HPS) per item</p>
                    </div>
                </div>

                <div class="text-xs font-semibold text-slate-600">
                    {{ activeItems.length }} / {{ planItems.length }} Item Terpilih
                </div>
            </div>

            <!-- Empty Plan Notice -->
            <div v-if="!form.procurement_plan_id" class="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Pilih Dokumen Procurement Plan pada Langkah 1 untuk memuat daftar item.
            </div>

            <!-- Items Table -->
            <div v-else class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                    <thead>
                        <tr class="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                            <th class="py-3 px-3 w-12 text-center">Pilih</th>
                            <th class="py-3 px-3 min-w-[200px]">Item / Spesifikasi</th>
                            <th class="py-3 px-3 w-28 text-center">Satuan</th>
                            <th class="py-3 px-3 w-32 text-center">Sisa Kuota</th>
                            <th class="py-3 px-3 w-36 text-center">Kuantitas Target *</th>
                            <th class="py-3 px-3 w-40 text-right">Target Price / HPS (Rp)</th>
                            <th class="py-3 px-3 min-w-[180px]">Catatan Khusus</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr
                            v-for="(it, idx) in planItems"
                            :key="it.procurement_plan_item_id"
                            :class="[
                                it.is_selected ? 'bg-white' : 'bg-slate-50/50 opacity-60',
                                'transition-colors hover:bg-slate-50'
                            ]"
                        >
                            <!-- Checkbox -->
                            <td class="py-3 px-3 text-center">
                                <input
                                    type="checkbox"
                                    v-model="it.is_selected"
                                    class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                            </td>

                            <!-- Item Name & Code -->
                            <td class="py-3 px-3">
                                <div class="font-bold text-slate-900">{{ it.item_name }}</div>
                                <div v-if="it.item_code" class="text-[11px] font-mono text-slate-500">{{ it.item_code }}</div>
                                <div v-if="it.item_specifications" class="text-[11px] text-slate-500 line-clamp-1 mt-0.5" :title="it.item_specifications">
                                    Spec: {{ it.item_specifications }}
                                </div>
                            </td>

                            <!-- Unit -->
                            <td class="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                                {{ it.unit_name }}
                            </td>

                            <!-- Sisa Kuota -->
                            <td class="py-3 px-3 text-center font-mono font-bold text-slate-800">
                                {{ Number(it.remaining_quantity).toLocaleString('id-ID') }}
                            </td>

                            <!-- Target Qty Input -->
                            <td class="py-3 px-3 text-center">
                                <input
                                    v-model.number="it.target_quantity"
                                    :disabled="!it.is_selected"
                                    type="number"
                                    min="1"
                                    :max="it.remaining_quantity"
                                    class="w-28 px-2.5 py-1.5 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </td>

                            <!-- Target Price / HPS Input -->
                            <td class="py-3 px-3 text-right">
                                <input
                                    v-model.number="it.target_price"
                                    :disabled="!it.is_selected"
                                    type="number"
                                    min="0"
                                    step="500"
                                    placeholder="0"
                                    class="w-32 px-2.5 py-1.5 text-right font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </td>

                            <!-- Notes Input -->
                            <td class="py-3 px-3">
                                <input
                                    v-model="it.notes"
                                    :disabled="!it.is_selected"
                                    type="text"
                                    placeholder="Catatan item..."
                                    class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Step 4: Undang Supplier / Rekanan -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        4
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Undang Supplier / Rekanan Tender</h3>
                        <p class="text-xs text-slate-500">Pilih vendor yang akan diberikan akses Magic Link untuk memasukkan penawaran</p>
                    </div>
                </div>

                <div class="text-xs font-semibold text-slate-600">
                    {{ selectedSuppliers.length }} Vendor Terpilih
                </div>
            </div>

            <!-- Multi-Select Supplier Input -->
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-bold text-slate-800 mb-1">
                        Cari & Pilih Vendor Aktif <span class="text-rose-500">*</span>
                    </label>
                    <SearchableMultiSelect
                        v-model="selectedSupplierIds"
                        :options="supplierOptions"
                        placeholder="Ketik nama atau kode supplier untuk menambahkan..."
                        :loading="isLoadingSuppliers"
                    />
                </div>

                <!-- Selected Suppliers Table -->
                <div v-if="selectedSuppliers.length > 0" class="border border-slate-200 rounded-xl overflow-hidden mt-3">
                    <table class="w-full text-xs text-left">
                        <thead>
                            <tr class="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                                <th class="py-2.5 px-3">Nama Supplier</th>
                                <th class="py-2.5 px-3">Kode Vendor</th>
                                <th class="py-2.5 px-3">Kontak / PIC</th>
                                <th class="py-2.5 px-3">Email</th>
                                <th class="py-2.5 px-3">Telepon</th>
                                <th class="py-2.5 px-3 w-16 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <tr
                                v-for="s in selectedSuppliers"
                                :key="s.id"
                                class="hover:bg-slate-50 transition-colors"
                            >
                                <td class="py-2.5 px-3 font-bold text-slate-900">
                                    {{ s.name }}
                                </td>
                                <td class="py-2.5 px-3 font-mono text-slate-600">
                                    {{ s.supplier_code || `SUP-${s.id}` }}
                                </td>
                                <td class="py-2.5 px-3 text-slate-700">
                                    {{ s.contact_person || s.contacts?.[0]?.name || '-' }}
                                </td>
                                <td class="py-2.5 px-3 font-mono text-slate-600">
                                    {{ s.email || s.contacts?.[0]?.email || '-' }}
                                </td>
                                <td class="py-2.5 px-3 font-mono text-slate-600">
                                    {{ s.phone || s.contacts?.[0]?.phone || '-' }}
                                </td>
                                <td class="py-2.5 px-3 text-center">
                                    <button
                                        type="button"
                                        @click="removeSupplier(s.id)"
                                        class="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
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

        <!-- Sticky Footer Submit Bar -->
        <div class="fixed bottom-0 left-0 right-0 z-30 bg-white/95 border-t border-slate-200 px-6 py-4 shadow-lg flex items-center justify-between">
            <div class="flex items-center gap-4 text-xs">
                <span class="text-slate-500">
                    Item Ditenderkan: <strong class="text-slate-900 font-mono">{{ activeItems.length }}</strong>
                </span>
                <span class="text-slate-300">•</span>
                <span class="text-slate-500">
                    Vendor Diundang: <strong class="text-slate-900 font-mono">{{ selectedSuppliers.length }}</strong>
                </span>
            </div>

            <div class="flex items-center gap-3">
                <RouterLink
                    :to="{ name: 'user.purchasing.rfq' }"
                    class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    Batal
                </RouterLink>

                <button
                    type="button"
                    @click="handleSubmit"
                    :disabled="isSubmitting"
                    class="px-6 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    <div v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <Save v-else class="w-4 h-4" />
                    <span>{{ isSubmitting ? 'Menyimpan Draf...' : 'Simpan sebagai Draf RFQ' }}</span>
                </button>
            </div>
        </div>
    </div>
</template>
