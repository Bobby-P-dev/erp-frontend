<script setup>
import { onMounted, ref, watch } from 'vue'
import { 
    Plus, 
    Edit, 
    Trash2, 
    ShieldAlert,
    X,
    Check,
    MoreVertical
} from '@lucide/vue'
import { createPermissionCategory, getPermissionCategories, updatePermissionCategory, deletePermissionCategory } from '../../../services/permissionCategoryServices'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal'
import PageHeader from '../../../components/ui/PageHeader.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'

const categories = ref([])
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const tableColumns = [
    { key: 'name', label: 'Category Name' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const fetchCategories = async(search = '', page = 1) => {
    try {
        const response = await getPermissionCategories(search, page)

        categories.value = response.data.data
        pagination.value = {
            current_page: response.data.current_page,
            last_page: response.data.last_page,
            from: response.data.from || 0,
            to: response.data.to || 0,
            total: response.data.total
        }
        
    } catch(error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan pada sistem.', error)
    }
}

onMounted(() => {
    fetchCategories()
})

const searchQuery = ref('')
let searchTimeout = null

watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchCategories(newValue, 1)
    }, 500) 
})

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)

const form = ref({
    name: ''
})

const openModal = (category = null) => {
    if (category && category.id) {
        isEditing.value = true
        editId.value = category.id
        form.value = { name: category.name }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = { name: '' }
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
}

const saveCategory = async () => {
    try {
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')

        if (isEditing.value) {
            await updatePermissionCategory(editId.value, form.value)
        } else {
            await createPermissionCategory(form.value)
        }
        
        closeModal()
        showSuccess('Berhasil!', `Data kategori berhasil ${isEditing.value ? 'diperbarui' : 'disimpan'}.`)
        
        await fetchCategories(searchQuery.value, pagination.value.current_page)

    } catch(error) {
        showError('Gagal Menyimpan!', 'Terjadi kesalahan pada sistem.', error)
    }
}

const deleteCategory = async (id) => {
    const isConfirmed = await showConfirm(
        'Hapus Kategori?', 
        'Data ini akan dihapus secara permanen dan tidak dapat dikembalikan.'
    )
    
    if (isConfirmed) {
        try {
            showLoading('Menghapus Data...', 'Mohon tunggu sebentar.')
            
            await deletePermissionCategory(id)
            showSuccess('Terhapus!', 'Data kategori berhasil dihapus.')
            
            await fetchCategories(searchQuery.value, pagination.value.current_page)
            
        } catch(error) {
            showError('Gagal Menghapus!', 'Terjadi kesalahan saat menghapus data.', error)
        }
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <PageHeader 
            title="Permission Categories"
        >
            <template #icon>
                <ShieldAlert class="w-7 h-7" />
            </template>
        </PageHeader>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="w-full sm:max-w-xs">
                    <SearchInput v-model="searchQuery" placeholder="Search categories..." />
                </div>
                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Add Category
                    </BaseButton>
                </div>
            </div>

            <BaseTable :columns="tableColumns">
                <tr v-for="category in categories" :key="category.id" class="hover:bg-gray-50/80 transition-colors group">
                    
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="flex items-center gap-4">
                            <div>
                                <div class="text-base font-bold text-gray-900">{{ category.name || '-' }}</div>
                            </div>
                        </div>
                    </td>
                    
                    <td class="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 transition-opacity">
                            <button @click="openModal(category)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Edit">
                                <Edit class="w-4 h-4" />
                            </button>
                            <button @click="deleteCategory(category.id)" class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Delete">
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
                @change-page="(page) => fetchCategories(searchQuery, page)"
            />
        </div>

        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <ShieldAlert class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">{{ isEditing ? 'Edit Category' : 'Add New Category' }}</h3>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 space-y-5 overflow-y-auto overflow-x-hidden min-h-[100px]">
                        <div>
                            <BaseInput 
                                v-model="form.name"
                                label="Category Name"
                                placeholder="Enter category name"
                                required
                            />
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="saveCategory">
                            <Check class="w-4 h-4" />
                            {{ isEditing ? 'Update Category' : 'Save Category' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
