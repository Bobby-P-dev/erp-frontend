<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
    Plus, 
    Edit, 
    Trash2, 
    Building2,
    Eye,
    Search,
    Filter,
    MoreVertical,
    CheckCircle,
    Clock,
    XCircle,
    Check,
    X
} from '@lucide/vue'
import { 
    getSuppliers, 
    deleteSupplier,
    updateSupplier
} from '../../../../services/supplierServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../../utils/swal.js'
import PageHeader from '../../../../components/ui/PageHeader.vue'
import StatusBadge from '../../../../components/ui/StatusBadge.vue'
import Pagination from '../../../../components/ui/Pagination.vue'
import SearchInput from '../../../../components/ui/SearchInput.vue'
import BaseButton from '../../../../components/ui/BaseButton.vue'
import BaseTable from '../../../../components/ui/BaseTable.vue'

const router = useRouter()

const suppliers = ref([])
const isLoading = ref(false)
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const searchQuery = ref('')
const selectedStatus = ref('')
const selectedApprovalStatus = ref('')
const selectedType = ref('')
let searchTimeout = null

const tableColumns = [
    { key: 'code', label: 'Supplier Code' },
    { key: 'name', label: 'Supplier Name' },
    { key: 'type', label: 'Type' },
    { key: 'contact', label: 'Contact Details' },
    { key: 'approval', label: 'Approval' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const fetchSuppliers = async (page = 1) => {
    try {
        isLoading.value = true
        const filter = {}
        if (selectedStatus.value !== '') {
            filter.is_active = selectedStatus.value
        }
        if (selectedApprovalStatus.value !== '') {
            filter.approval_status = selectedApprovalStatus.value
        }
        if (selectedType.value !== '') {
            filter.supplier_type = selectedType.value
        }

        const response = await getSuppliers(searchQuery.value, page, filter)

        suppliers.value = response.data || []
        const resPagination = response.meta || response
        pagination.value = {
            current_page: resPagination.current_page || 1,
            last_page: resPagination.last_page || 1,
            from: resPagination.from || 0,
            to: resPagination.to || 0,
            total: resPagination.total || 0
        }
    } catch (error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan saat memuat data supplier.', error)
    } finally {
        isLoading.value = false
    }
}

watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchSuppliers(1)
    }, 400)
})

watch([selectedStatus, selectedApprovalStatus, selectedType], () => {
    fetchSuppliers(1)
})

onMounted(() => {
    fetchSuppliers(1)
})

const navigateToCreate = () => {
    router.push({ name: 'admin.master.supplier.create' })
}

const navigateToDetail = (id) => {
    router.push({ name: 'admin.master.supplier.general', params: { id } })
}

const toggleActiveStatus = async (supplier) => {
    const newStatus = !supplier.is_active
    const actionText = newStatus ? 'mengaktifkan' : 'menonaktifkan'
    
    const isConfirmed = await showConfirm(
        `${newStatus ? 'Aktifkan' : 'Nonaktifkan'} Supplier?`,
        `Anda akan ${actionText} supplier "${supplier.name}".`
    )

    if (isConfirmed) {
        try {
            showLoading('Memproses status...', 'Mohon tunggu sebentar.')
            await updateSupplier(supplier.id, { is_active: newStatus })
            showSuccess('Berhasil!', `Supplier berhasil di${newStatus ? 'aktifkan' : 'nonaktifkan'}.`)
            fetchSuppliers(pagination.value.current_page)
        } catch (error) {
            showError('Gagal!', error.response?.data?.message || 'Terjadi kesalahan saat mengubah status.', error)
        }
    }
}

const handleDeleteSupplier = async (id, name) => {
    const isConfirmed = await showConfirm(
        'Hapus Supplier?',
        `Data supplier "${name}" akan dihapus secara permanen.`
    )

    if (isConfirmed) {
        try {
            showLoading('Menghapus data...', 'Mohon tunggu sebentar.')
            await deleteSupplier(id)
            showSuccess('Berhasil!', 'Supplier berhasil dihapus.')
            fetchSuppliers(pagination.value.current_page)
        } catch (error) {
            showError('Gagal!', error.response?.data?.message || 'Terjadi kesalahan saat menghapus data.', error)
        }
    }
}

const getApprovalBadge = (status) => {
    switch (status) {
        case 'approved':
            return { label: 'Approved', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
        case 'rejected':
            return { label: 'Rejected', class: 'bg-rose-50 text-rose-700 border-rose-200' }
        default:
            return { label: 'Pending', class: 'bg-amber-50 text-amber-700 border-amber-200' }
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PageHeader 
            title="Suppliers"
            description="Manage vendors, suppliers, credentials, bank accounts, and catalog items"
        >
            <template #icon>
                <Building2 class="w-7 h-7" />
            </template>
        </PageHeader>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <!-- Filter Toolbar -->
            <div class="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-gray-50/30">
                <div class="flex flex-wrap items-center gap-3 flex-1">
                    <div class="w-full sm:w-64">
                        <SearchInput v-model="searchQuery" placeholder="Search code, name, email, tax ID..." />
                    </div>

                    <div class="w-full sm:w-40">
                        <select
                            v-model="selectedStatus"
                            class="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-gray-700"
                        >
                            <option value="">All Status</option>
                            <option value="1">Active</option>
                            <option value="0">Inactive</option>
                        </select>
                    </div>

                    <div class="w-full sm:w-44">
                        <select
                            v-model="selectedApprovalStatus"
                            class="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-gray-700"
                        >
                            <option value="">All Approval</option>
                            <option value="pending">Pending Approval</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div class="w-full sm:w-44">
                        <select
                            v-model="selectedType"
                            class="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-gray-700"
                        >
                            <option value="">All Types</option>
                            <option value="Manufacturer">Manufacturer</option>
                            <option value="Distributor">Distributor</option>
                            <option value="Wholesaler">Wholesaler</option>
                            <option value="Service Provider & Fabricator">Service Provider</option>
                        </select>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <BaseButton @click="navigateToCreate" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Add Supplier
                    </BaseButton>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns">
                <tr v-for="supplier in suppliers" :key="supplier.id" class="hover:bg-gray-50/80 transition-colors group">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 font-mono">
                            {{ supplier.supplier_code || '-' }}
                        </span>
                    </td>

                    <td class="px-6 py-4">
                        <div class="font-bold text-gray-900">{{ supplier.name }}</div>
                        <div v-if="supplier.company?.name" class="text-xs text-indigo-600 font-medium">
                            {{ supplier.company.name }}
                        </div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                            {{ supplier.supplier_type || 'Unspecified' }}
                        </span>
                    </td>

                    <td class="px-6 py-4">
                        <div class="text-xs text-gray-700 font-medium">{{ supplier.email || '-' }}</div>
                        <div class="text-xs text-gray-400">{{ supplier.phone || '-' }}</div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <span 
                            class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                            :class="getApprovalBadge(supplier.approval_status).class"
                        >
                            {{ getApprovalBadge(supplier.approval_status).label }}
                        </span>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <StatusBadge :isActive="Boolean(supplier.is_active)" />
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-1.5">
                            <button 
                                @click="navigateToDetail(supplier.id)" 
                                class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="View Detail"
                            >
                                <Eye class="w-4 h-4" />
                            </button>

                            <button 
                                @click="toggleActiveStatus(supplier)" 
                                class="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                                :title="supplier.is_active ? 'Deactivate Supplier' : 'Activate Supplier'"
                            >
                                <XCircle v-if="supplier.is_active" class="w-4 h-4 text-rose-500" />
                                <CheckCircle v-else class="w-4 h-4 text-emerald-500" />
                            </button>

                            <button 
                                @click="handleDeleteSupplier(supplier.id, supplier.name)" 
                                class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Delete Supplier"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>

                <tr v-if="isLoading">
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                        <div class="text-sm font-medium text-gray-600">Loading suppliers...</div>
                    </td>
                </tr>

                <tr v-else-if="suppliers.length === 0">
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <Building2 class="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <div class="text-base font-semibold text-gray-800">No suppliers found</div>
                        <p class="text-sm text-gray-400 mt-1">Get started by creating a new supplier or adjusting your search filters.</p>
                        <BaseButton @click="navigateToCreate" class="mt-4" size="sm">
                            <Plus class="w-4 h-4" />
                            Add New Supplier
                        </BaseButton>
                    </td>
                </tr>
            </BaseTable>

            <Pagination 
                :pagination="pagination"
                @change-page="(page) => fetchSuppliers(page)"
            />
        </div>
    </div>
</template>
