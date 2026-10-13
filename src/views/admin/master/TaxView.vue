<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
    Receipt,
    BadgePercent,
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    Check,
    AlertCircle,
    CheckCircle2,
    Info,
    Percent,
    Landmark,
    ShieldCheck,
    X,
    Coins,
    SlidersHorizontal
} from '@lucide/vue'
import {
    getTaxes,
    createTax,
    updateTax,
    deleteTax
} from '../../../services/taxServices.js'
import { searchAccountingAccounts } from '../../../services/accountingAccountServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal.js'
import PageHeader from '../../../components/ui/PageHeader.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'
import BaseModal from '../../../components/ui/BaseModal.vue'
import KpiCard from '../../../components/ui/KpiCard.vue'
import StatusBadge from '../../../components/ui/StatusBadge.vue'
import ToggleSwitch from '../../../components/ui/ToggleSwitch.vue'
import SearchableSelect from '../../../components/ui/SearchableSelect.vue'

// 1. Data State
const taxes = ref([])
const isLoading = ref(false)
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 10
})

const tableColumns = [
    { key: 'no', label: '#', class: 'w-12 text-center' },
    { key: 'code', label: 'Kode & Nama Pajak' },
    { key: 'rate', label: 'Tarif (%)', class: 'text-center' },
    { key: 'type', label: 'Tipe Pajak' },
    { key: 'is_inclusive', label: 'Metode Perhitungan' },
    { key: 'accounting_account', label: 'Akun Akuntansi (COA)' },
    { key: 'is_active', label: 'Status', class: 'text-center' },
    { key: 'actions', label: 'Aksi', class: 'text-right' }
]

// 2. Filters State
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref('')
let searchTimeout = null

// 3. Accounting Accounts for Dropdown
const accountingAccountOptions = ref([])
const isLoadingAccounts = ref(false)

const fetchAccountingAccounts = async (query = '') => {
    try {
        isLoadingAccounts.value = true
        const response = await searchAccountingAccounts(query)
        const accountList = response.data || []
        accountingAccountOptions.value = [
            { value: '', label: 'Tanpa Akun Terkait (Opsional)' },
            ...accountList.map((acc) => ({
                value: acc.id,
                label: `${acc.code} - ${acc.name}`,
                subtitle: acc.subcategory?.name || ''
            }))
        ]
    } catch (error) {
        console.error('Failed to load accounting accounts:', error)
        accountingAccountOptions.value = [{ value: '', label: 'Tanpa Akun Terkait (Opsional)' }]
    } finally {
        isLoadingAccounts.value = false
    }
}

// 4. Fetch Taxes Data
const fetchTaxes = async (search = '', page = 1) => {
    try {
        isLoading.value = true
        const filter = {}
        if (filterType.value) {
            filter.type = filterType.value
        }
        if (filterStatus.value !== '') {
            filter.is_active = filterStatus.value
        }

        const response = await getTaxes(search, page, filter, pagination.value.per_page)
        taxes.value = response.data || []

        const resPagination = response.meta || response
        pagination.value = {
            current_page: resPagination.current_page || 1,
            last_page: resPagination.last_page || 1,
            from: resPagination.from || 0,
            to: resPagination.to || 0,
            total: resPagination.total || 0,
            per_page: resPagination.per_page || 10
        }
    } catch (error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan saat memuat data master pajak.', error)
    } finally {
        isLoading.value = false
    }
}

// 5. KPI Metrics
const totalCount = computed(() => pagination.value.total || taxes.value.length)
const defaultTaxItem = computed(() => taxes.value.find((t) => t.is_default))
const activeVatCount = computed(() => taxes.value.filter((t) => t.type === 'vat' && t.is_active).length)
const activeWithholdingCount = computed(() => taxes.value.filter((t) => t.type === 'withholding' && t.is_active).length)

// 6. Modal Form State
const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)
const isSubmitting = ref(false)

const form = ref({
    code: '',
    name: '',
    rate: 0,
    type: 'vat',
    accounting_account_id: '',
    is_inclusive: false,
    is_default: false,
    is_active: true,
    description: ''
})

const errors = ref({})

// Watchers
watch(searchQuery, (newVal) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchTaxes(newVal, 1)
    }, 400)
})

watch([filterType, filterStatus], () => {
    fetchTaxes(searchQuery.value, 1)
})

onMounted(() => {
    fetchTaxes()
    fetchAccountingAccounts()
})

// Modal Open Handlers
const openCreateModal = () => {
    errors.value = {}
    isEditing.value = false
    editId.value = null
    form.value = {
        code: '',
        name: '',
        rate: 11,
        type: 'vat',
        accounting_account_id: '',
        is_inclusive: false,
        is_default: false,
        is_active: true,
        description: ''
    }
    showModal.value = true
}

const openEditModal = (tax) => {
    errors.value = {}
    isEditing.value = true
    editId.value = tax.id
    form.value = {
        code: tax.code || '',
        name: tax.name || '',
        rate: parseFloat(tax.rate) || 0,
        type: tax.type || 'vat',
        accounting_account_id: tax.accounting_account_id || tax.accounting_account?.id || '',
        is_inclusive: Boolean(tax.is_inclusive),
        is_default: Boolean(tax.is_default),
        is_active: Boolean(tax.is_active),
        description: tax.description || ''
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
    isEditing.value = false
    editId.value = null
    errors.value = {}
}

// Submit Form Handler
const handleSubmit = async () => {
    errors.value = {}

    // Frontend validations
    if (!form.value.code?.trim()) {
        errors.value.code = 'Kode pajak wajib diisi'
    }
    if (!form.value.name?.trim()) {
        errors.value.name = 'Nama pajak wajib diisi'
    }
    if (form.value.rate === null || form.value.rate === undefined || form.value.rate < 0 || form.value.rate > 100) {
        errors.value.rate = 'Tarif pajak harus bernilai antara 0% dan 100%'
    }

    if (Object.keys(errors.value).length > 0) {
        showError('Validasi Gagal', 'Mohon periksa kembali input formulir Anda.')
        return
    }

    isSubmitting.value = true
    try {
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')

        const payload = {
            code: form.value.code.trim().toUpperCase(),
            name: form.value.name.trim(),
            rate: parseFloat(form.value.rate),
            type: form.value.type,
            accounting_account_id: form.value.accounting_account_id ? Number(form.value.accounting_account_id) : null,
            is_inclusive: Boolean(form.value.is_inclusive),
            is_default: Boolean(form.value.is_default),
            is_active: Boolean(form.value.is_active),
            description: form.value.description ? form.value.description.trim() : null
        }

        if (isEditing.value) {
            await updateTax(editId.value, payload)
            showSuccess('Berhasil!', 'Data pajak berhasil diperbarui.')
        } else {
            await createTax(payload)
            showSuccess('Berhasil!', 'Data pajak baru berhasil ditambahkan.')
        }

        closeModal()
        await fetchTaxes(searchQuery.value, pagination.value.current_page)
    } catch (error) {
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors
            showError('Validasi Gagal', error.response.data.message || 'Data yang dikirim tidak valid.', error)
        } else {
            const msg = error.response?.data?.message || 'Terjadi kesalahan pada sistem.'
            showError('Gagal Menyimpan!', msg, error)
        }
    } finally {
        isSubmitting.value = false
    }
}

// Delete Handler
const handleDelete = async (tax) => {
    if (tax.is_default) {
        showError(
            'Tidak Dapat Menghapus!',
            `Pajak "${tax.name}" berstatus Default. Anda harus menetapkan pajak lain sebagai default sebelum menghapusnya.`
        )
        return
    }

    const isConfirmed = await showConfirm(
        'Hapus Master Pajak?',
        `Apakah Anda yakin ingin menghapus pajak "${tax.code} - ${tax.name}"? Data yang sudah dihapus tidak dapat dipulihkan.`,
        'Ya, Hapus'
    )

    if (!isConfirmed) return

    try {
        showLoading('Menghapus Data...', 'Mohon tunggu sebentar.')
        await deleteTax(tax.id)
        showSuccess('Terhapus!', `Pajak "${tax.name}" berhasil dihapus.`)
        await fetchTaxes(searchQuery.value, pagination.value.current_page)
    } catch (error) {
        const msg = error.response?.data?.message || 'Terjadi kesalahan saat menghapus pajak.'
        showError('Gagal Menghapus!', msg, error)
    }
}

// Helpers for badges and labels
const getTypeBadgeClass = (type) => {
    switch (type) {
        case 'vat':
            return 'bg-blue-50 text-blue-700 border-blue-200'
        case 'withholding':
            return 'bg-purple-50 text-purple-700 border-purple-200'
        case 'other':
            return 'bg-slate-100 text-slate-700 border-slate-200'
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200'
    }
}

const getTypeLabel = (type) => {
    switch (type) {
        case 'vat':
            return 'PPN / Value Added Tax'
        case 'withholding':
            return 'PPh / Withholding Tax'
        case 'other':
            return 'Lainnya / Other'
        default:
            return type || '-'
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- 1. Page Header -->
        <PageHeader
            title="Master Pajak (Taxes)"
            description="Kelola tarif perpajakan (PPN, PPh, dll), integrasi akun akuntansi (COA), serta pengaturan pajak default transaksi."
        >
            <template #icon>
                <div class="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Receipt class="w-6 h-6" />
                </div>
            </template>
        </PageHeader>

        <!-- 2. KPI Cards Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
                title="Total Jenis Pajak"
                :value="totalCount"
                unit="Konfigurasi"
                :icon="Receipt"
                variant="blue"
            />
            <KpiCard
                title="Pajak Default Utama"
                :value="defaultTaxItem ? defaultTaxItem.code : '-'"
                :unit="defaultTaxItem ? `${defaultTaxItem.rate}%` : 'Belum diatur'"
                :icon="ShieldCheck"
                variant="emerald"
            />
            <KpiCard
                title="PPN Aktif"
                :value="activeVatCount"
                unit="Jenis PPN"
                :icon="Percent"
                variant="indigo"
            />
            <KpiCard
                title="PPh (Withholding) Aktif"
                :value="activeWithholdingCount"
                unit="Jenis PPh"
                :icon="Coins"
                variant="slate"
            />
        </div>

        <!-- 3. Main Data Card -->
        <div class="bg-white rounded-2xl shadow-xs border border-slate-200/80 flex flex-col overflow-hidden">
            <!-- Filter Bar -->
            <div class="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50/50">
                <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
                    <div class="w-full sm:max-w-xs">
                        <SearchInput
                            v-model="searchQuery"
                            placeholder="Cari kode, nama, atau deskripsi..."
                        />
                    </div>

                    <!-- Filter Type -->
                    <div class="w-full sm:w-56">
                        <select
                            v-model="filterType"
                            class="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-700 transition-colors"
                        >
                            <option value="">Semua Tipe Pajak</option>
                            <option value="vat">PPN (Value Added Tax)</option>
                            <option value="withholding">PPh (Withholding Tax)</option>
                            <option value="other">Lainnya (Other)</option>
                        </select>
                    </div>

                    <!-- Filter Status -->
                    <div class="w-full sm:w-44">
                        <select
                            v-model="filterStatus"
                            class="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-700 transition-colors"
                        >
                            <option value="">Semua Status</option>
                            <option value="1">Aktif Saja</option>
                            <option value="0">Nonaktif Saja</option>
                        </select>
                    </div>
                </div>

                <div class="flex items-center gap-2.5 w-full sm:w-auto">
                    <BaseButton
                        variant="primary"
                        @click="openCreateModal"
                        class="w-full sm:w-auto shadow-2xs flex items-center gap-2"
                    >
                        <Plus class="w-4 h-4" />
                        <span>Tambah Pajak Baru</span>
                    </BaseButton>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns">
                <tr
                    v-for="(tax, index) in taxes"
                    :key="tax.id"
                    class="hover:bg-slate-50/80 transition-colors group"
                >
                    <!-- No -->
                    <td class="px-5 py-4 whitespace-nowrap text-center text-xs text-slate-400 font-mono">
                        {{ ((pagination.current_page - 1) * pagination.per_page) + index + 1 }}
                    </td>

                    <!-- Code & Name -->
                    <td class="px-5 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                {{ tax.code }}
                            </span>
                            <span
                                v-if="tax.is_default"
                                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 ring-1 ring-amber-400/20"
                                title="Pajak Utama / Default untuk jenis transaksi ini"
                            >
                                <CheckCircle2 class="w-3 h-3 text-amber-600" />
                                Default
                            </span>
                        </div>
                        <div class="text-sm font-bold text-slate-900 mt-1">
                            {{ tax.name }}
                        </div>
                        <div v-if="tax.description" class="text-xs text-slate-400 truncate max-w-sm mt-0.5">
                            {{ tax.description }}
                        </div>
                    </td>

                    <!-- Rate -->
                    <td class="px-5 py-4 whitespace-nowrap text-center">
                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                            {{ parseFloat(tax.rate) }}%
                        </span>
                    </td>

                    <!-- Type -->
                    <td class="px-5 py-4 whitespace-nowrap">
                        <span :class="['inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border', getTypeBadgeClass(tax.type)]">
                            {{ tax.type_label || getTypeLabel(tax.type) }}
                        </span>
                    </td>

                    <!-- Inclusive / Exclusive -->
                    <td class="px-5 py-4 whitespace-nowrap text-xs">
                        <span
                            v-if="tax.is_inclusive"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                            Inklusif (Termasuk dlm Harga)
                        </span>
                        <span
                            v-else
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium bg-slate-50 text-slate-700 border border-slate-200"
                        >
                            Eksklusif (Di luar Harga)
                        </span>
                    </td>

                    <!-- Accounting Account -->
                    <td class="px-5 py-4 whitespace-nowrap text-xs">
                        <div v-if="tax.accounting_account" class="space-y-0.5">
                            <div class="font-mono font-bold text-slate-800 flex items-center gap-1">
                                <Landmark class="w-3.5 h-3.5 text-slate-400" />
                                <span>{{ tax.accounting_account.code }}</span>
                            </div>
                            <div class="text-slate-500 text-[11px] truncate max-w-xs">
                                {{ tax.accounting_account.name }}
                            </div>
                        </div>
                        <span v-else class="text-slate-400 italic text-[11px]">
                            - Tidak terhubung -
                        </span>
                    </td>

                    <!-- Status -->
                    <td class="px-5 py-4 whitespace-nowrap text-center">
                        <StatusBadge :isActive="Boolean(tax.is_active)" />
                    </td>

                    <!-- Actions -->
                    <td class="px-5 py-4 whitespace-nowrap text-right text-xs">
                        <div class="flex items-center justify-end gap-1.5">
                            <button
                                @click="openEditModal(tax)"
                                class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Pajak"
                            >
                                <Edit class="w-4 h-4" />
                            </button>
                            <button
                                @click="handleDelete(tax)"
                                :disabled="tax.is_default"
                                :class="[
                                    'p-1.5 rounded-lg transition-colors',
                                    tax.is_default
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                ]"
                                :title="tax.is_default ? 'Pajak default tidak dapat dihapus' : 'Hapus Pajak'"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>

                <!-- Empty State -->
                <tr v-if="!isLoading && taxes.length === 0">
                    <td colspan="8" class="p-12 text-center space-y-3">
                        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <ReceiptPercent class="w-6 h-6" />
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-700">Tidak ada data pajak</p>
                            <p class="text-xs text-slate-400 mt-0.5">
                                {{ searchQuery || filterType || filterStatus ? 'Tidak ada pajak yang cocok dengan filter pencarian.' : 'Belum ada data pajak yang didaftarkan.' }}
                            </p>
                        </div>
                    </td>
                </tr>
            </BaseTable>

            <!-- Pagination -->
            <div class="p-4 border-t border-slate-100 flex items-center justify-between">
                <Pagination
                    :pagination="pagination"
                    @change-page="(page) => fetchTaxes(searchQuery, page)"
                />
            </div>
        </div>

        <!-- 4. Modal Form (Create / Edit) -->
        <BaseModal
            :model-value="showModal"
            @update:model-value="showModal = $event"
            @close="closeModal"
            size="xl"
            body-class="p-6 space-y-5 text-xs max-h-[85vh] overflow-y-auto"
        >
            <template #header>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-2xs">
                        <Receipt class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-slate-900 tracking-tight">
                            {{ isEditing ? 'Edit Master Pajak' : 'Tambah Master Pajak Baru' }}
                        </h3>
                        <p class="text-xs text-slate-500">
                            Konfigurasi rincian tarif, tipe perpajakan, dan akun buku besar terkait.
                        </p>
                    </div>
                </div>
            </template>

            <form @submit.prevent="handleSubmit" class="space-y-4">
                <!-- Row 1: Code & Name -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="block text-slate-700 font-semibold text-xs">
                            Kode Pajak <span class="text-rose-500">*</span>
                        </label>
                        <input
                            v-model="form.code"
                            type="text"
                            placeholder="Contoh: PPN11, PPH23"
                            class="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-colors"
                            :class="{ 'border-rose-400 ring-1 ring-rose-400': errors.code }"
                        />
                        <p v-if="errors.code" class="text-[11px] text-rose-500">
                            {{ Array.isArray(errors.code) ? errors.code[0] : errors.code }}
                        </p>
                    </div>

                    <div class="space-y-1">
                        <label class="block text-slate-700 font-semibold text-xs">
                            Nama Pajak <span class="text-rose-500">*</span>
                        </label>
                        <input
                            v-model="form.name"
                            type="text"
                            placeholder="Contoh: Pajak Pertambahan Nilai 11%"
                            class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-colors"
                            :class="{ 'border-rose-400 ring-1 ring-rose-400': errors.name }"
                        />
                        <p v-if="errors.name" class="text-[11px] text-rose-500">
                            {{ Array.isArray(errors.name) ? errors.name[0] : errors.name }}
                        </p>
                    </div>
                </div>

                <!-- Row 2: Rate & Type -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="block text-slate-700 font-semibold text-xs">
                            Tarif Pajak (%) <span class="text-rose-500">*</span>
                        </label>
                        <div class="relative">
                            <input
                                v-model.number="form.rate"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="Contoh: 11"
                                class="w-full pl-3 pr-8 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-colors"
                                :class="{ 'border-rose-400 ring-1 ring-rose-400': errors.rate }"
                            />
                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                %
                            </span>
                        </div>
                        <p v-if="errors.rate" class="text-[11px] text-rose-500">
                            {{ Array.isArray(errors.rate) ? errors.rate[0] : errors.rate }}
                        </p>
                    </div>

                    <div class="space-y-1">
                        <label class="block text-slate-700 font-semibold text-xs">
                            Tipe Pajak <span class="text-rose-500">*</span>
                        </label>
                        <select
                            v-model="form.type"
                            class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-colors"
                        >
                            <option value="vat">PPN / Value Added Tax (VAT)</option>
                            <option value="withholding">PPh / Withholding Tax</option>
                            <option value="other">Lainnya / Other Tax</option>
                        </select>
                    </div>
                </div>

                <!-- Row 3: Linked Accounting Account (COA) -->
                <div class="space-y-1">
                    <label class="block text-slate-700 font-semibold text-xs">
                        Akun Akuntansi Terkait (Chart of Accounts / COA)
                    </label>
                    <SearchableSelect
                        v-model="form.accounting_account_id"
                        :options="accountingAccountOptions"
                        :loading="isLoadingAccounts"
                        placeholder="Pilih akun akuntansi buku besar (opsional)..."
                        search-placeholder="Cari kode atau nama akun..."
                        @search="fetchAccountingAccounts"
                    />
                    <p class="text-[11px] text-slate-400 mt-0.5">
                        Akun jurnal yang akan otomatis didebet/dikredit saat transaksi pengadaan atau penjualan mencantumkan pajak ini (misal: PPN Masukan / Utang PPh 23).
                    </p>
                </div>

                <!-- Row 4: Toggles (Inclusive, Default, Active) -->
                <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <!-- Toggle Inclusive -->
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-bold text-slate-800 text-xs">Perhitungan Inklusif (Harga Termasuk Pajak)</span>
                            <p class="text-[11px] text-slate-500">
                                Jika diaktifkan, harga barang yang dimasukkan sudah termasuk nilai pajak ini.
                            </p>
                        </div>
                        <ToggleSwitch v-model="form.is_inclusive" />
                    </div>

                    <div class="border-t border-slate-200"></div>

                    <!-- Toggle Default -->
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-bold text-slate-800 text-xs">Pajak Default (Utama)</span>
                            <p class="text-[11px] text-slate-500">
                                Menjadikan pajak ini terpilih secara otomatis untuk transaksi bertipe {{ form.type === 'vat' ? 'PPN' : 'PPh' }}.
                            </p>
                        </div>
                        <ToggleSwitch
                            v-model="form.is_default"
                            :disabled="isEditing && taxes.find(t => t.id === editId)?.is_default"
                        />
                    </div>
                    <p
                        v-if="isEditing && taxes.find(t => t.id === editId)?.is_default"
                        class="text-[10px] text-amber-600 italic bg-amber-50 p-2 rounded border border-amber-200"
                    >
                        * Pajak ini saat ini adalah default. Status default hanya dapat dipindahkan dengan memilih pajak lain sebagai default.
                    </p>

                    <div class="border-t border-slate-200"></div>

                    <!-- Toggle Active -->
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-bold text-slate-800 text-xs">Status Aktif</span>
                            <p class="text-[11px] text-slate-500">
                                Pajak aktif akan muncul pada opsi pemilihan transaksi sistem.
                            </p>
                        </div>
                        <ToggleSwitch
                            v-model="form.is_active"
                            :disabled="isEditing && taxes.find(t => t.id === editId)?.is_default"
                        />
                    </div>
                </div>

                <!-- Row 5: Description -->
                <div class="space-y-1">
                    <label class="block text-slate-700 font-semibold text-xs">
                        Keterangan / Dasar Regulasi Pajak
                    </label>
                    <textarea
                        v-model="form.description"
                        rows="3"
                        placeholder="Contoh: Pajak Pertambahan Nilai sesuai UU HPP Bab IV Pasal 7 ayat 1"
                        class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-colors resize-none"
                    ></textarea>
                </div>
            </form>

            <template #footer>
                <div class="flex items-center justify-end gap-2.5 w-full">
                    <button
                        type="button"
                        @click="closeModal"
                        class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                        Batal
                    </button>
                    <BaseButton
                        variant="primary"
                        :loading="isSubmitting"
                        @click="handleSubmit"
                        class="shadow-xs"
                    >
                        <Check class="w-4 h-4 mr-1.5" />
                        <span>{{ isEditing ? 'Simpan Perubahan' : 'Simpan Pajak' }}</span>
                    </BaseButton>
                </div>
            </template>
        </BaseModal>
    </div>
</template>
