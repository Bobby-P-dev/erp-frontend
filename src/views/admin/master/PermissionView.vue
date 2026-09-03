<script setup>
import { onMounted, ref, watch } from 'vue'
import { 
    Plus, 
    Edit, 
    Trash2, 
    Key,
    X,
    Check,
    MoreVertical
} from '@lucide/vue'
import { createPermission, getPermissions, updatePermission, deletePermission } from '../../../services/permissionServices'
import { searchPermissionCategories } from '../../../services/permissionCategoryServices'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal'
import PageHeader from '../../../components/ui/PageHeader.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'
import SearchableSelect from '../../../components/ui/SearchableSelect.vue'

const permissions = ref([])
const categoryList = ref([])
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const tableColumns = [
    { key: 'name', label: 'Full Permission' },
    { key: 'label', label: 'Action/Label' },
    { key: 'category', label: 'Category' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const fetchPermissions = async(search = '', page = 1) => {
    try {
        const response = await getPermissions(search, page)

        permissions.value = response.data || []
        
        const resPagination = response.meta || response
        pagination.value = {
            current_page: resPagination.current_page || 1,
            last_page: resPagination.last_page || 1,
            from: resPagination.from || 0,
            to: resPagination.to || 0,
            total: resPagination.total || 0
        }
        
    } catch(error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan pada sistem.', error)
    }
}

const isLoadingCategories = ref(false)
const categoryOptions = ref([])

const fetchCategoriesList = async (query = '') => {
    try {
        isLoadingCategories.value = true
        const response = await searchPermissionCategories(query)
        categoryList.value = response.data || []
        categoryOptions.value = categoryList.value.map(c => ({
            value: c.id,
            label: c.name
        }))
    } catch (error) {
        console.error('Failed to load category list', error)
    } finally {
        isLoadingCategories.value = false
    }
}

onMounted(() => {
    fetchPermissions()
    fetchCategoriesList()
})

const searchQuery = ref('')
let searchTimeout = null

watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchPermissions(newValue, 1)
    }, 500) 
})

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)

const form = ref({
    label: '',
    category_id: null
})

const openModal = (permission = null) => {
    if (permission && permission.id) {
        isEditing.value = true
        editId.value = permission.id
        
        // Ensure category is in the options list so its name shows up
        if (permission.permission_category && !categoryList.value.find(c => c.id === permission.permission_category_id)) {
            categoryList.value.push({
                id: permission.permission_category_id,
                name: permission.permission_category.name
            })
            categoryOptions.value = categoryList.value.map(c => ({
                value: c.id,
                label: c.name
            }))
        }

        form.value = { 
            label: permission.label,
            category_id: permission.permission_category_id
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = { label: '', category_id: null }
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
}

const savePermission = async () => {
    try {
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')

        if (isEditing.value) {
            await updatePermission(editId.value, form.value)
        } else {
            await createPermission(form.value)
        }
        
        closeModal()
        showSuccess('Berhasil!', `Data permission berhasil ${isEditing.value ? 'diperbarui' : 'disimpan'}.`)
        
        await fetchPermissions(searchQuery.value, pagination.value.current_page)

    } catch(error) {
        showError('Gagal Menyimpan!', 'Terjadi kesalahan pada sistem.', error)
    }
}

const deletePerm = async (id) => {
    const isConfirmed = await showConfirm(
        'Hapus Permission?', 
        'Data ini akan dihapus secara permanen dan tidak dapat dikembalikan.'
    )
    
    if (isConfirmed) {
        try {
            showLoading('Menghapus Data...', 'Mohon tunggu sebentar.')
            
            await deletePermission(id)
            showSuccess('Terhapus!', 'Data permission berhasil dihapus.')
            
            await fetchPermissions(searchQuery.value, pagination.value.current_page)
            
        } catch(error) {
            showError('Gagal Menghapus!', 'Terjadi kesalahan saat menghapus data.', error)
        }
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <!-- Header Section -->
        <PageHeader 
            title="Permissions"
        >
            <template #icon>
                <Key class="w-7 h-7" />
            </template>
        </PageHeader>

        <!-- Main Content Section -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            
            <!-- Toolbar -->
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <!-- Search -->
                <div class="w-full sm:max-w-xs">
                    <SearchInput v-model="searchQuery" placeholder="Search permissions..." />
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Add Permission
                    </BaseButton>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns">
                <tr v-for="permission in permissions" :key="permission.id" class="hover:bg-gray-50/80 transition-colors group">
                    
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="text-base font-bold text-gray-900">{{ permission.name || '-' }}</div>
                    </td>
                    
                    <td class="px-6 py-5 whitespace-nowrap">
                        <span class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            {{ permission.label || '-' }}
                        </span>
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-700">
                            {{ permission.permission_category?.name || '-' }}
                        </div>
                    </td>
                    
                    <td class="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 transition-opacity">
                            <button @click="openModal(permission)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Edit">
                                <Edit class="w-4 h-4" />
                            </button>
                            <button @click="deletePerm(permission.id)" class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Delete">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                        <button class="sm:hidden p-2 text-gray-400 hover:bg-gray-50 rounded-xl">
                            <MoreVertical class="w-4 h-4" />
                        </button>
                    </td>
                </tr>
            </BaseTable>
            
            <!-- Pagination -->
            <Pagination 
                :pagination="pagination"
                @change-page="(page) => fetchPermissions(searchQuery, page)"
            />
        </div>

        <!-- Add/Edit Modal -->
        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/40 transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Key class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">{{ isEditing ? 'Edit Permission' : 'Add New Permission' }}</h3>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 space-y-5 overflow-y-auto overflow-x-hidden min-h-[300px]">
                        <div>
                            <SearchableSelect 
                                v-model="form.category_id"
                                label="Permission Category"
                                :options="categoryOptions"
                                placeholder="Select a category"
                                :loading="isLoadingCategories"
                                @search="fetchCategoriesList"
                                required
                            />
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.label"
                                label="Action / Label"
                                placeholder="e.g. view, create, edit, delete"
                                required
                            />
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="savePermission">
                            <Check class="w-4 h-4" />
                            {{ isEditing ? 'Update Permission' : 'Save Permission' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
