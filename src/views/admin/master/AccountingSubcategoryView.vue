<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { 
    Plus, 
    Edit, 
    Trash2, 
    FolderTree,
    X,
    Check,
    MoreVertical
} from '@lucide/vue'
import { 
    getAccountingSubcategories, 
    createAccountingSubcategory, 
    updateAccountingSubcategory, 
    deleteAccountingSubcategory 
} from '../../../services/accountingSubcategoryServices.js'
import { searchAccountingCategories } from '../../../services/accountingCategoryServices.js'
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

const subcategories = ref([])
const categoriesList = ref([])
const isLoadingCategories = ref(false)

const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const selectedCategoryFilter = ref('')
const searchQuery = ref('')
let searchTimeout = null

const tableColumns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Subcategory Name' },
    { key: 'category', label: 'Accounting Category' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const categoryOptions = computed(() => {
    if (!categoriesList.value || !Array.isArray(categoriesList.value)) return []
    return categoriesList.value.map(c => ({
        value: c.id,
        label: `${c.code} - ${c.name}`
    }))
})

const fetchCategoriesList = async (query = '') => {
    try {
        isLoadingCategories.value = true
        const response = await searchAccountingCategories(query)
        categoriesList.value = response.data || []
    } catch (error) {
        console.error('Failed to load accounting categories', error)
    } finally {
        isLoadingCategories.value = false
    }
}

const fetchSubcategories = async (search = '', page = 1) => {
    try {
        const filter = {}
        if (selectedCategoryFilter.value) {
            filter.accounting_category_id = selectedCategoryFilter.value
        }

        const response = await getAccountingSubcategories(search, page, filter)

        subcategories.value = response.data || []

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
        fetchSubcategories(newValue, 1)
    }, 500)
})

watch(selectedCategoryFilter, () => {
    fetchSubcategories(searchQuery.value, 1)
})

onMounted(() => {
    fetchSubcategories()
    fetchCategoriesList()
})

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)

const form = ref({
    accounting_category_id: '',
    code: '',
    name: '',
    description: '',
    is_active: true
})

const openModal = (subcategory = null) => {
    if (subcategory && subcategory.id) {
        isEditing.value = true
        editId.value = subcategory.id
        form.value = {
            accounting_category_id: subcategory.accounting_category_id || (subcategory.category?.id ?? ''),
            code: subcategory.code || '',
            name: subcategory.name || '',
            description: subcategory.description || '',
            is_active: subcategory.is_active ?? true
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = {
            accounting_category_id: selectedCategoryFilter.value || '',
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
        accounting_category_id: '',
        code: '',
        name: '',
        description: '',
        is_active: true
    }
}

const saveSubcategory = async () => {
    if (!form.value.accounting_category_id) {
        showError('Validasi Gagal', 'Mohon pilih Kategori Akuntansi.')
        return
    }
    if (!form.value.code || !form.value.name) {
        showError('Validasi Gagal', 'Mohon lengkapi kode dan nama subkategori.')
        return
    }

    try {
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')

        const payload = {
            accounting_category_id: Number(form.value.accounting_category_id),
            code: form.value.code.trim(),
            name: form.value.name.trim(),
            description: form.value.description ? form.value.description.trim() : null,
            is_active: Boolean(form.value.is_active)
        }

        if (isEditing.value) {
            await updateAccountingSubcategory(editId.value, payload)
        } else {
            await createAccountingSubcategory(payload)
        }

        closeModal()
        showSuccess('Berhasil!', `Subkategori akuntansi berhasil ${isEditing.value ? 'diperbarui' : 'disimpan'}.`)

        await fetchSubcategories(searchQuery.value, pagination.value.current_page)
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'Terjadi kesalahan pada sistem.'
        showError('Gagal Menyimpan!', errorMsg, error)
    }
}

const deleteSubcategory = async (id) => {
    const isConfirmed = await showConfirm(
        'Hapus Subkategori Akuntansi?',
        'Data ini akan dihapus secara permanen dan tidak dapat dikembalikan.'
    )

    if (isConfirmed) {
        try {
            showLoading('Menghapus Data...', 'Mohon tunggu sebentar.')

            await deleteAccountingSubcategory(id)
            showSuccess('Terhapus!', 'Subkategori akuntansi berhasil dihapus.')

            await fetchSubcategories(searchQuery.value, pagination.value.current_page)
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
            title="Accounting Subcategories"
            description="Manage chart of accounts subcategories grouped by category"
        >
            <template #icon>
                <FolderTree class="w-7 h-7" />
            </template>
        </PageHeader>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
                    <div class="w-full sm:max-w-xs">
                        <SearchInput v-model="searchQuery" placeholder="Search subcategories..." />
                    </div>

                    <div class="w-full sm:w-64">
                        <select
                            v-model="selectedCategoryFilter"
                            class="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-gray-700 transition-colors"
                        >
                            <option value="">All Categories</option>
                            <option 
                                v-for="opt in categoryOptions" 
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
                        Add Subcategory
                    </BaseButton>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns">
                <tr v-for="subcategory in subcategories" :key="subcategory.id" class="hover:bg-gray-50/80 transition-colors group">
                    <td class="px-6 py-5 whitespace-nowrap">
                        <span class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            {{ subcategory.code || '-' }}
                        </span>
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="text-base font-bold text-gray-900">{{ subcategory.name || '-' }}</div>
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-800">
                            {{ subcategory.category ? `${subcategory.category.code} - ${subcategory.category.name}` : '-' }}
                        </div>
                    </td>

                    <td class="px-6 py-5">
                        <div class="text-sm text-gray-500 max-w-xs truncate">{{ subcategory.description || '-' }}</div>
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap">
                        <StatusBadge :isActive="Boolean(subcategory.is_active)" />
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 transition-opacity">
                            <button @click="openModal(subcategory)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Edit">
                                <Edit class="w-4 h-4" />
                            </button>
                            <button @click="deleteSubcategory(subcategory.id)" class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Delete">
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
                @change-page="(page) => fetchSubcategories(searchQuery, page)"
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
                                <FolderTree class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">{{ isEditing ? 'Edit Accounting Subcategory' : 'Add New Accounting Subcategory' }}</h3>
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
                                v-model="form.accounting_category_id"
                                label="Accounting Category"
                                :options="categoryOptions"
                                placeholder="Select an accounting category"
                                :loading="isLoadingCategories"
                                @search="fetchCategoriesList"
                                required
                            />
                        </div>

                        <div class="grid grid-cols-2 gap-5">
                            <div class="col-span-2 sm:col-span-1">
                                <BaseInput 
                                    v-model="form.code"
                                    label="Subcategory Code"
                                    placeholder="e.g. CURR-ASSET-01"
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
                                label="Subcategory Name"
                                placeholder="e.g. Cash and Bank"
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
                        <BaseButton @click="saveSubcategory">
                            <Check class="w-4 h-4" />
                            {{ isEditing ? 'Update Subcategory' : 'Save Subcategory' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
