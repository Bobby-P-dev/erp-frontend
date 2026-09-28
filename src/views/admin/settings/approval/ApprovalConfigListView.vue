<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
    Plus, 
    GitBranch,
    ShieldCheck, 
    Eye, 
    Edit, 
    Trash2, 
    Copy, 
    Layers, 
    Filter,
    CheckCircle2,
    XCircle,
    FileText,
    Building2,
    Coins,
    RotateCcw
} from '@lucide/vue'
import PageHeader from '../../../../components/ui/PageHeader.vue'
import BaseButton from '../../../../components/ui/BaseButton.vue'
import BaseTable from '../../../../components/ui/BaseTable.vue'
import SearchInput from '../../../../components/ui/SearchInput.vue'
import BaseSelect from '../../../../components/ui/BaseSelect.vue'
import Pagination from '../../../../components/ui/Pagination.vue'
import StatusBadge from '../../../../components/ui/StatusBadge.vue'
import { formatCurrency } from '../../../../utils/stringUtils.js'
import { 
    getApprovalConfigurations, 
    deleteApprovalConfiguration, 
    updateApprovalConfiguration,
    getApprovalWorkflowMetadata,
    getApprovalOptions
} from '../../../../services/approvalServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../../utils/swal.js'

const router = useRouter()

const configurations = ref([])
const isLoading = ref(false)
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
})

const searchQuery = ref('')
const selectedDocType = ref('')
const selectedCompany = ref('')
const selectedStatus = ref('')
let searchTimer = null

const documentTypes = ref([])
const companies = ref([])

const docTypeFilterOptions = computed(() => [
    { value: '', label: 'Semua Tipe Dokumen' },
    ...(documentTypes.value || []).map(d => ({
        value: d.value,
        label: d.label,
    }))
])

const companyFilterOptions = computed(() => [
    { value: '', label: 'Semua Perusahaan (Universal)' },
    ...(companies.value || []).map(c => ({
        value: c.id ?? c.value,
        label: c.code ? `${c.name} (${c.code})` : (c.name ?? c.label),
    }))
])

const statusFilterOptions = [
    { value: '', label: 'Semua Status' },
    { value: '1', label: 'Hanya Aktif' },
    { value: '0', label: 'Hanya Nonaktif' },
]

const tableColumns = [
    { key: 'code', label: 'Kode Alur', class: 'whitespace-nowrap' },
    { key: 'name', label: 'Nama & Cakupan Alur', class: 'min-w-[240px]' },
    { key: 'document_type', label: 'Tipe Dokumen', class: 'whitespace-nowrap' },
    { key: 'company', label: 'Entitas Perusahaan', class: 'whitespace-nowrap' },
    { key: 'amount_range', label: 'Batas Nilai Transaksi', class: 'whitespace-nowrap' },
    { key: 'levels_count', label: 'Tingkatan', class: 'whitespace-nowrap text-center' },
    { key: 'status', label: 'Status', class: 'whitespace-nowrap text-center' },
    { key: 'actions', label: 'Aksi', class: 'text-right whitespace-nowrap' },
]

// Executive Summary Metrics (calculated from configurations and pagination)
const totalConfigsCount = computed(() => pagination.value.total || configurations.value.length || 0)
const activeConfigsCount = computed(() => configurations.value.filter(c => c.is_active).length)
const uniqueDocTypesCount = computed(() => {
    const set = new Set(configurations.value.map(c => c.document_type).filter(Boolean))
    return set.size
})
const universalConfigsCount = computed(() => {
    return configurations.value.filter(c => c.applies_to_all_amounts || (!c.min_amount && !c.max_amount)).length
})

const hasActiveFilters = computed(() => {
    return Boolean(searchQuery.value || selectedDocType.value || selectedCompany.value || selectedStatus.value)
})

const resetFilters = () => {
    searchQuery.value = ''
    selectedDocType.value = ''
    selectedCompany.value = ''
    selectedStatus.value = ''
    fetchConfigurations(1)
}

const fetchFilterOptions = async () => {
    try {
        const [metaRes, optsRes] = await Promise.all([
            getApprovalWorkflowMetadata(false),
            getApprovalOptions(),
        ])
        const meta = metaRes.data || {}
        documentTypes.value = meta.document_types || []

        const opts = optsRes.data || {}
        companies.value = (opts.companies || []).map(c => ({
            id: c.id ?? c.value,
            name: c.name ?? c.label,
        }))
    } catch (e) {
        console.error('Failed to fetch filter options:', e)
    }
}

const fetchConfigurations = async (page = 1) => {
    try {
        isLoading.value = true
        const params = {
            page,
            search: searchQuery.value,
            document_type: selectedDocType.value,
            company_id: selectedCompany.value,
            is_active: selectedStatus.value,
        }
        const res = await getApprovalConfigurations(params)
        configurations.value = res.data || []
        if (res.meta) {
            pagination.value = {
                current_page: res.meta.current_page || 1,
                last_page: res.meta.last_page || 1,
                from: res.meta.from || 0,
                to: res.meta.to || 0,
                total: res.meta.total || 0,
            }
        }
    } catch (error) {
        showError('Gagal!', 'Tidak dapat memuat daftar konfigurasi approval.', error)
    } finally {
        isLoading.value = false
    }
}

const formatAmountRange = (min, max) => {
    if ((min === null || min === undefined || min === '') && 
        (max === null || max === undefined || max === '')) {
        return 'Universal / All Amounts'
    }

    if (min !== null && (max === null || max === undefined || max === '')) {
        return `> ${formatCurrency(min)}`
    }

    if ((min === null || min === 0 || min === '0') && max !== null) {
        return `Rp 0 - ${formatCurrency(max)}`
    }

    return `${formatCurrency(min)} - ${formatCurrency(max)}`
}

const formatDocType = (type) => {
    if (!type) return { label: '-', subtitle: '' }
    const found = documentTypes.value.find(d => d.value === type)
    const rawLabel = found ? found.label : type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    // Check if label contains translation in parentheses, e.g. "Purchase Requisition (Pengajuan Pembelian)"
    const match = rawLabel.match(/^(.*?)\s*\((.*?)\)$/)
    if (match) {
        return {
            label: match[1].trim(),
            subtitle: match[2].trim()
        }
    }
    return {
        label: rawLabel,
        subtitle: ''
    }
}

const handleToggleStatus = async (item) => {
    const newStatus = !item.is_active
    const confirm = await showConfirm(
        'Ubah Status Konfigurasi?',
        `Apakah Anda yakin ingin ${newStatus ? 'mengaktifkan' : 'menonaktifkan'} alur persetujuan "${item.name}"?`
    )
    if (!confirm) return

    try {
        showLoading('Memperbarui status...')
        await updateApprovalConfiguration(item.id, { is_active: newStatus })
        item.is_active = newStatus
        showSuccess('Berhasil!', `Alur persetujuan berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}.`)
    } catch (err) {
        showError('Gagal!', 'Gagal memperbarui status konfigurasi approval.', err)
    }
}

const handleDelete = async (id, name) => {
    const confirm = await showConfirm(
        'Hapus Konfigurasi Approval?',
        `Data alur persetujuan "${name}" akan dihapus. Aksi ini tidak dapat dibatalkan.`
    )
    if (!confirm) return

    try {
        showLoading('Menghapus data...')
        await deleteApprovalConfiguration(id)
        showSuccess('Berhasil!', 'Konfigurasi approval berhasil dihapus.')
        fetchConfigurations(pagination.value.current_page)
    } catch (err) {
        showError('Gagal!', 'Gagal menghapus konfigurasi approval.', err)
    }
}

const handleDuplicate = (id) => {
    router.push({
        name: 'admin.settings.approval.create',
        query: { duplicate_from: id },
    })
}

watch(searchQuery, () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
        fetchConfigurations(1)
    }, 400)
})

watch([selectedDocType, selectedCompany, selectedStatus], () => {
    fetchConfigurations(1)
})

onMounted(() => {
    fetchFilterOptions()
    fetchConfigurations(1)
})
</script>

<template>
    <div class="space-y-6">
        <!-- PAGE HEADER -->
        <PageHeader
            title="Konfigurasi Alur Persetujuan"
            description="Kelola matriks alur persetujuan berjenjang, batasan nominal otorisasi, dan pejabat berwenang."
        >
            <template #icon>
                <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <GitBranch class="w-5 h-5 stroke-[2.2]" />
                </div>
            </template>
            <template #actions>
                <BaseButton 
                    variant="primary"
                    @click="router.push({ name: 'admin.settings.approval.create' })"
                >
                    <Plus class="w-4 h-4 mr-1.5" />
                    Tambah Alur Baru
                </BaseButton>
            </template>
        </PageHeader>

        <!-- EXECUTIVE METRIC BENTO BAR -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- 1. Total Alur -->
            <div class="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Matriks Alur</span>
                    <div class="text-2xl font-black text-slate-900 mt-1 font-mono">
                        {{ totalConfigsCount }}
                    </div>
                    <span class="text-xs text-slate-500 font-medium">Aturan persetujuan terdaftar</span>
                </div>
                <div class="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <GitBranch class="w-5 h-5 stroke-[2.2]" />
                </div>
            </div>

            <!-- 2. Alur Aktif -->
            <div class="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Status Operasional</span>
                    <div class="text-2xl font-black text-emerald-700 mt-1 font-mono flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {{ activeConfigsCount }} Aktif
                    </div>
                    <span class="text-xs text-slate-500 font-medium">Siap mengeksekusi dokumen</span>
                </div>
                <div class="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 class="w-5 h-5 stroke-[2.2]" />
                </div>
            </div>

            <!-- 3. Dokumen Terhubung -->
            <div class="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Jenis Dokumen</span>
                    <div class="text-2xl font-black text-slate-800 mt-1 font-mono">
                        {{ uniqueDocTypesCount }} Modul
                    </div>
                    <span class="text-xs text-slate-500 font-medium">PR, PO, dan paket pengadaan</span>
                </div>
                <div class="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <FileText class="w-5 h-5 stroke-[2.2]" />
                </div>
            </div>

            <!-- 4. Universal vs Threshold -->
            <div class="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Cakupan Nominal</span>
                    <div class="text-2xl font-black text-blue-700 mt-1 font-mono">
                        {{ universalConfigsCount }} Universal
                    </div>
                    <span class="text-xs text-slate-500 font-medium">Berlaku tanpa batasan nominal</span>
                </div>
                <div class="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Coins class="w-5 h-5 stroke-[2.2]" />
                </div>
            </div>
        </div>

        <!-- TOOLBAR & FILTERS -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-4">
            <div class="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                <div class="w-full lg:w-80 shrink-0">
                    <SearchInput 
                        v-model="searchQuery" 
                        placeholder="Cari kode atau nama alur..." 
                    />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    <!-- Document Type Filter -->
                    <BaseSelect
                        v-model="selectedDocType"
                        :options="docTypeFilterOptions"
                        placeholder="Semua Tipe Dokumen"
                        size="sm"
                    />

                    <!-- Company Filter -->
                    <BaseSelect
                        v-model="selectedCompany"
                        :options="companyFilterOptions"
                        placeholder="Semua Perusahaan"
                        size="sm"
                    />

                    <!-- Status Filter -->
                    <BaseSelect
                        v-model="selectedStatus"
                        :options="statusFilterOptions"
                        placeholder="Semua Status"
                        size="sm"
                    />
                </div>

                <div v-if="hasActiveFilters" class="shrink-0 flex items-center">
                    <BaseButton
                        variant="outline"
                        size="sm"
                        @click="resetFilters"
                        title="Reset semua filter pencarian"
                    >
                        <RotateCcw class="w-3.5 h-3.5 mr-1" />
                        Reset
                    </BaseButton>
                </div>
            </div>

            <!-- TABLE -->
            <BaseTable :columns="tableColumns">
                <!-- Loading State -->
                <tr v-if="isLoading">
                    <td colspan="8" class="px-6 py-12 text-center text-slate-500">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-2"></div>
                        <div class="text-sm font-medium text-slate-600">Memuat data konfigurasi alur persetujuan...</div>
                    </td>
                </tr>

                <!-- Data Rows -->
                <tr 
                    v-else-if="configurations.length > 0"
                    v-for="item in configurations" 
                    :key="item.id"
                    class="hover:bg-slate-50/80 transition-colors"
                >
                    <!-- Code -->
                    <td class="px-5 py-4 whitespace-nowrap">
                        <span class="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/80 inline-block shadow-2xs">
                            {{ item.code }}
                        </span>
                    </td>

                    <!-- Name & Description -->
                    <td class="px-5 py-4 min-w-[220px]">
                        <div class="font-bold text-slate-900 text-sm">
                            {{ item.name }}
                        </div>
                        <div v-if="item.description" class="text-xs text-slate-500 truncate max-w-sm mt-0.5" :title="item.description">
                            {{ item.description }}
                        </div>
                    </td>

                    <!-- Document Type -->
                    <td class="px-5 py-4 whitespace-nowrap">
                        <div class="inline-flex flex-col items-start">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                                <FileText class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                {{ formatDocType(item.document_type).label }}
                            </span>
                            <span 
                                v-if="formatDocType(item.document_type).subtitle" 
                                class="text-[11px] text-slate-400 mt-1 pl-0.5 font-medium whitespace-nowrap"
                            >
                                {{ formatDocType(item.document_type).subtitle }}
                            </span>
                        </div>
                    </td>

                    <!-- Company -->
                    <td class="px-5 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                        <div class="flex items-center gap-1.5">
                            <Building2 class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{{ item.company?.name || 'Semua Perusahaan (Universal)' }}</span>
                        </div>
                    </td>

                    <!-- Amount Range -->
                    <td class="px-5 py-4 text-xs font-medium whitespace-nowrap">
                        <span 
                            v-if="item.applies_to_all_amounts || (!item.min_amount && !item.max_amount)"
                            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                        >
                            Universal (Semua Nilai)
                        </span>
                        <span 
                            v-else 
                            class="font-mono text-xs font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
                        >
                            {{ formatAmountRange(item.min_amount, item.max_amount) }}
                        </span>
                    </td>

                    <!-- Tiers -->
                    <td class="px-5 py-4 text-xs whitespace-nowrap text-center">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            {{ item.levels?.length || item.levels_count || 0 }} Tahap
                        </span>
                    </td>

                    <!-- Status -->
                    <td class="px-5 py-4 whitespace-nowrap text-center">
                        <button 
                            @click="handleToggleStatus(item)" 
                            class="focus:outline-none transition-transform active:scale-95 inline-flex"
                            title="Klik untuk mengubah status aktif/nonaktif"
                        >
                            <StatusBadge :isActive="Boolean(item.is_active)" />
                        </button>
                    </td>

                    <!-- Actions -->
                    <td class="px-5 py-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                            <!-- View Detail -->
                            <button
                                @click="router.push({ name: 'admin.settings.approval.detail', params: { id: item.id } })"
                                class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-colors"
                                title="Lihat Detail Alur"
                            >
                                <Eye class="w-4 h-4" />
                            </button>

                            <!-- Edit -->
                            <button
                                @click="router.push({ name: 'admin.settings.approval.edit', params: { id: item.id } })"
                                class="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-200 transition-colors"
                                title="Edit Alur Persetujuan"
                            >
                                <Edit class="w-4 h-4" />
                            </button>

                            <!-- Duplicate -->
                            <button
                                @click="handleDuplicate(item.id)"
                                class="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg border border-transparent hover:border-sky-200 transition-colors"
                                title="Duplikasi Alur Ini"
                            >
                                <Copy class="w-4 h-4" />
                            </button>

                            <!-- Delete -->
                            <button
                                @click="handleDelete(item.id, item.name)"
                                class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                                title="Hapus Alur Persetujuan"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>

                <!-- Empty State -->
                <tr v-else>
                    <td colspan="8" class="px-6 py-12 text-center text-slate-500">
                        <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                            <GitBranch class="w-6 h-6 stroke-[1.8]" />
                        </div>
                        <div class="text-base font-bold text-slate-800">Tidak ada alur persetujuan ditemukan</div>
                        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Belum ada konfigurasi alur persetujuan yang terdaftar atau sesuai dengan filter pencarian Anda.
                        </p>
                        <BaseButton 
                            variant="primary"
                            @click="router.push({ name: 'admin.settings.approval.create' })" 
                            size="sm" 
                            class="mt-4"
                        >
                            <Plus class="w-4 h-4 mr-1.5" />
                            Tambah Alur Persetujuan
                        </BaseButton>
                    </td>
                </tr>
            </BaseTable>

            <!-- PAGINATION -->
            <Pagination
                :pagination="pagination"
                @change-page="(p) => fetchConfigurations(p)"
            />
        </div>
    </div>
</template>
