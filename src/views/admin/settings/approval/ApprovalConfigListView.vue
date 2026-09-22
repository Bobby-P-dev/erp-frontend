<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
    Plus, 
    Shield, 
    Eye, 
    Edit, 
    Trash2, 
    Copy, 
    Layers, 
    Filter,
    CheckCircle2,
    XCircle,
    FileText
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
    { value: '', label: 'Semua Dokumen (All Documents)' },
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
    { key: 'code', label: 'Code', class: 'whitespace-nowrap' },
    { key: 'name', label: 'Configuration Name', class: 'min-w-[220px]' },
    { key: 'document_type', label: 'Document Type', class: 'whitespace-nowrap' },
    { key: 'company', label: 'Company', class: 'whitespace-nowrap' },
    { key: 'amount_range', label: 'Amount Range', class: 'whitespace-nowrap' },
    { key: 'levels_count', label: 'Tiers', class: 'whitespace-nowrap' },
    { key: 'status', label: 'Status', class: 'whitespace-nowrap' },
    { key: 'actions', label: 'Actions', class: 'text-right whitespace-nowrap' },
]

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
            title="Approval Configuration"
            description="Kelola matriks alur persetujuan bertingkat, batas nominal otorisasi, dan hak approver."
        >
            <template #icon>
                <Shield class="w-7 h-7 text-indigo-600" />
            </template>
            <template #actions>
                <BaseButton @click="router.push({ name: 'admin.settings.approval.create' })">
                    <Plus class="w-4 h-4 mr-1.5" />
                    Tambah Alur Baru
                </BaseButton>
            </template>
        </PageHeader>

        <!-- TOOLBAR & FILTERS -->
        <div class="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div class="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                <div class="w-full lg:w-72 shrink-0">
                    <SearchInput 
                        v-model="searchQuery" 
                        placeholder="Cari kode atau nama konfigurasi..." 
                    />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    <!-- Document Type Filter -->
                    <BaseSelect
                        v-model="selectedDocType"
                        :options="docTypeFilterOptions"
                        placeholder="Semua Dokumen"
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
            </div>

            <!-- TABLE -->
            <BaseTable :columns="tableColumns">
                <!-- Loading State -->
                <tr v-if="isLoading">
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                        <div class="text-sm font-medium text-gray-600">Loading configurations...</div>
                    </td>
                </tr>

                <!-- Data Rows -->
                <tr 
                    v-else-if="configurations.length > 0"
                    v-for="item in configurations" 
                    :key="item.id"
                    class="hover:bg-gray-50/70 transition-colors"
                >
                    <td class="px-6 py-4 font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">
                        {{ item.code }}
                    </td>

                    <td class="px-6 py-4 min-w-[200px]">
                        <div class="font-bold text-gray-900 text-sm">
                            {{ item.name }}
                        </div>
                        <div v-if="item.description" class="text-xs text-gray-400 truncate max-w-xs mt-0.5" :title="item.description">
                            {{ item.description }}
                        </div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="inline-flex flex-col items-start">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/80 whitespace-nowrap">
                                <FileText class="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                {{ formatDocType(item.document_type).label }}
                            </span>
                            <span 
                                v-if="formatDocType(item.document_type).subtitle" 
                                class="text-[11px] text-gray-400 mt-1 pl-1 font-medium whitespace-nowrap"
                            >
                                {{ formatDocType(item.document_type).subtitle }}
                            </span>
                        </div>
                    </td>

                    <td class="px-6 py-4 text-xs font-medium text-gray-600 whitespace-nowrap">
                        {{ item.company?.name || 'All Companies (Universal)' }}
                    </td>

                    <td class="px-6 py-4 text-xs font-semibold text-gray-800 font-mono whitespace-nowrap">
                        {{ formatAmountRange(item.min_amount, item.max_amount) }}
                    </td>

                    <td class="px-6 py-4 text-xs whitespace-nowrap">
                        <span class="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold">
                            {{ item.levels?.length || item.levels_count || 0 }} Tiers
                        </span>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <button 
                            @click="handleToggleStatus(item)" 
                            class="focus:outline-none transition-transform active:scale-95"
                            title="Klik untuk mengubah status"
                        >
                            <StatusBadge :isActive="Boolean(item.is_active)" />
                        </button>
                    </td>

                    <td class="px-6 py-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1">
                            <!-- View Detail -->
                            <button
                                @click="router.push({ name: 'admin.settings.approval.detail', params: { id: item.id } })"
                                class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="Lihat Detail"
                            >
                                <Eye class="w-4 h-4" />
                            </button>

                            <!-- Edit -->
                            <button
                                @click="router.push({ name: 'admin.settings.approval.edit', params: { id: item.id } })"
                                class="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                                title="Edit Alur"
                            >
                                <Edit class="w-4 h-4" />
                            </button>

                            <!-- Duplicate -->
                            <button
                                @click="handleDuplicate(item.id)"
                                class="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
                                title="Duplikasi Alur"
                            >
                                <Copy class="w-4 h-4" />
                            </button>

                            <!-- Delete -->
                            <button
                                @click="handleDelete(item.id, item.name)"
                                class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Hapus Alur"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>

                <!-- Empty State -->
                <tr v-else>
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <Shield class="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <div class="text-base font-semibold text-gray-800">No approval configurations found</div>
                        <p class="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                            Belum ada alur persetujuan yang terdaftar atau sesuai dengan filter pencarian Anda.
                        </p>
                        <BaseButton 
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
