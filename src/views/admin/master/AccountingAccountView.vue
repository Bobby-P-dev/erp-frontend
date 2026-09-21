<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { 
    Plus, 
    Edit, 
    Trash2, 
    Landmark,
    X,
    Check,
    MoreVertical
} from '@lucide/vue'
import { 
    getAccountingAccounts, 
    createAccountingAccount, 
    updateAccountingAccount, 
    deleteAccountingAccount 
} from '../../../services/accountingAccountServices.js'
import { searchAccountingSubcategories } from '../../../services/accountingSubcategoryServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal.js'
import PageHeader from '../../../components/ui/PageHeader.vue'
import StatusBadge from '../../../components/ui/StatusBadge.vue'
import ToggleSwitch from '../../../components/ui/ToggleSwitch.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'
import SearchableSelect from '../../../components/ui/SearchableSelect.vue'

const accounts = ref([])
const subcategoriesList = ref([])
const isLoadingSubcategories = ref(false)

const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const selectedSubcategoryFilter = ref('')
const searchQuery = ref('')
let searchTimeout = null

const tableColumns = [
    { key: 'code', label: 'Account Code' },
    { key: 'name', label: 'Account Name' },
    { key: 'subcategory', label: 'Subcategory' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const subcategoryOptions = computed(() => {
    if (!subcategoriesList.value || !Array.isArray(subcategoriesList.value)) return []
    return subcategoriesList.value.map(s => {
        const catInfo = s.category?.name ? ` (${s.category.name})` : ''
        return {
            value: s.id,
            label: `${s.code} - ${s.name}${catInfo}`
        }
    })
})

const fetchSubcategoriesList = async (query = '') => {
    try {
        isLoadingSubcategories.value = true
        const response = await searchAccountingSubcategories(query)
        subcategoriesList.value = response.data || []
    } catch (error) {
        console.error('Failed to load accounting subcategories', error)
    } finally {
        isLoadingSubcategories.value = false
    }
}

const fetchAccounts = async (search = '', page = 1) => {
    try {
        const filter = {}
        if (selectedSubcategoryFilter.value) {
            filter.accounting_subcategory_id = selectedSubcategoryFilter.value
        }

        const response = await getAccountingAccounts(search, page, filter)

        accounts.value = response.data || []

        const resPagination = response.meta || response
        pagination.value = {
            current_page: resPagination.current_page || 1,
            last_page: resPagination.last_page || 1,
            from: resPagination.from || 0,
            to: resPagination.to || 0,
            total: resPagination.total || 0
        }
    } catch (error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan pada sistem.', error)
    }
}

watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchAccounts(newValue, 1)
    }, 500)
})

watch(selectedSubcategoryFilter, () => {
    fetchAccounts(searchQuery.value, 1)
})

onMounted(() => {
    fetchAccounts()
    fetchSubcategoriesList()
})

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)

const form = ref({
    accounting_subcategory_id: '',
    code: '',
    name: '',
    description: '',
    is_active: true
})

const openModal = (account = null) => {
    if (account && account.id) {
        isEditing.value = true
        editId.value = account.id
        form.value = {
            accounting_subcategory_id: account.accounting_subcategory_id || (account.subcategory?.id ?? ''),
            code: account.code || '',
            name: account.name || '',
            description: account.description || '',
            is_active: account.is_active ?? true
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = {
            accounting_subcategory_id: selectedSubcategoryFilter.value || '',
            code: '',
            name: '',
            description: '',
            is_active: true
        }
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
    isEditing.value = false
    editId.value = null
    form.value = {
        accounting_subcategory_id: '',
        code: '',
        name: '',
        description: '',
        is_active: true
    }
}

const saveAccount = async () => {
    if (!form.value.accounting_subcategory_id) {
        showError('Validasi Gagal', 'Mohon pilih Subkategori Akuntansi.')
        return
    }
    if (!form.value.code || !form.value.name) {
        showError('Validasi Gagal', 'Mohon lengkapi kode dan nama akun.')
        return
    }

    try {
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')

        const payload = {
            accounting_subcategory_id: Number(form.value.accounting_subcategory_id),
            code: form.value.code.trim(),
            name: form.value.name.trim(),
            description: form.value.description ? form.value.description.trim() : null,
            is_active: Boolean(form.value.is_active)
        }

        if (isEditing.value) {
            await updateAccountingAccount(editId.value, payload)
        } else {
            await createAccountingAccount(payload)
        }

        closeModal()
        showSuccess('Berhasil!', `Akun akuntansi berhasil ${isEditing.value ? 'diperbarui' : 'disimpan'}.`)

        await fetchAccounts(searchQuery.value, pagination.value.current_page)
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Terjadi kesalahan pada sistem.'
        showError('Gagal Menyimpan!', errorMsg, error)
    }
}

const deleteAccount = async (id) => {
    const isConfirmed = await showConfirm(
        'Hapus Akun Akuntansi?',
        'Data ini akan dihapus secara permanen dan tidak dapat dikembalikan.'
    )

    if (isConfirmed) {
        try {
            showLoading('Menghapus Data...', 'Mohon tunggu sebentar.')

            await deleteAccountingAccount(id)
            showSuccess('Terhapus!', 'Akun akuntansi berhasil dihapus.')

            await fetchAccounts(searchQuery.value, pagination.value.current_page)
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Terjadi kesalahan saat menghapus data.'
            showError('Gagal Menghapus!', errorMsg, error)
        }
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PageHeader 
            title="Accounting Accounts"
            description="Manage chart of accounts detail codes, classifications, and ledgers"
        >
            <template #icon>
                <Landmark class="w-7 h-7" />
            </template>
        </PageHeader>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
                    <div class="w-full sm:max-w-xs">
                        <SearchInput v-model="searchQuery" placeholder="Search accounts..." />
                    </div>

                    <div class="w-full sm:w-72">
                        <select
                            v-model="selectedSubcategoryFilter"
                            class="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-gray-700 transition-colors"
                        >
                            <option value="">All Subcategories</option>
                            <option 
                                v-for="opt in subcategoryOptions" 
                                :key="opt.value" 
                                :value="opt.value"
                            >
                                {{ opt.label }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Add Account
                    </BaseButton>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns">
                <tr v-for="account in accounts" :key="account.id" class="hover:bg-gray-50/80 transition-colors group">
                    <td class="px-6 py-5 whitespace-nowrap">
                        <span class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            {{ account.code || '-' }}
                        </span>
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="text-base font-bold text-gray-900">{{ account.name || '-' }}</div>
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-800">
                            {{ account.subcategory ? `${account.subcategory.code} - ${account.subcategory.name}` : '-' }}
                        </div>
                        <div v-if="account.subcategory?.category?.name" class="text-xs text-gray-400">
                            {{ account.subcategory.category.name }}
                        </div>
                    </td>

                    <td class="px-6 py-5">
                        <div class="text-sm text-gray-500 max-w-xs truncate">{{ account.description || '-' }}</div>
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap">
                        <StatusBadge :isActive="Boolean(account.is_active)" />
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 transition-opacity">
                            <button @click="openModal(account)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Edit">
                                <Edit class="w-4 h-4" />
                            </button>
                            <button @click="deleteAccount(account.id)" class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Delete">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                        <button class="sm:hidden p-2 text-gray-400 hover:bg-gray-50 rounded-xl">
                            <MoreVertical class="w-4 h-4" />
                        </button>
                    </td>
                </tr>
            </BaseTable>
            
            <Pagination 
                :pagination="pagination"
                @change-page="(page) => fetchAccounts(searchQuery, page)"
            />
        </div>

        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div 
                    class="fixed inset-0 bg-gray-900/40 transition-opacity"
                    @click="closeModal"
                ></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Landmark class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">{{ isEditing ? 'Edit Accounting Account' : 'Add New Accounting Account' }}</h3>
                        </div>
                        <button 
                            @click="closeModal"
                            class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors"
                        >
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 space-y-5 overflow-y-auto min-h-[400px]">
                        <div>
                            <SearchableSelect 
                                v-model="form.accounting_subcategory_id"
                                label="Accounting Subcategory"
                                :options="subcategoryOptions"
                                placeholder="Select an accounting subcategory"
                                :loading="isLoadingSubcategories"
                                @search="fetchSubcategoriesList"
                                required
                            />
                        </div>

                        <div class="grid grid-cols-2 gap-5">
                            <div class="col-span-2 sm:col-span-1">
                                <BaseInput 
                                    v-model="form.code"
                                    label="Account Code"
                                    placeholder="e.g. 11101"
                                    required
                                />
                            </div>
                            <div class="col-span-2 sm:col-span-1">
                                <label class="block text-sm font-bold text-gray-700 mb-1.5">Status</label>
                                <ToggleSwitch v-model="form.is_active" />
                            </div>
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.name"
                                label="Account Name"
                                placeholder="e.g. Petty Cash"
                                required
                            />
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.description"
                                label="Description"
                                placeholder="Optional description..."
                            />
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="saveAccount">
                            <Check class="w-4 h-4" />
                            {{ isEditing ? 'Update Account' : 'Save Account' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
