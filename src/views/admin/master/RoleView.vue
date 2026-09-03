<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
    Search, 
    Plus, 
    Edit, 
    Trash2, 
    Shield,
    X,
    Check,
    MoreVertical,
    ShieldCheck
} from '@lucide/vue'
import { createRole, getRoles, updateRole, deleteRole } from '../../../services/roleServices'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal'
import PageHeader from '../../../components/ui/PageHeader.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'

const router = useRouter()
const roles = ref([])
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const tableColumns = [
    { key: 'name', label: 'Role Name' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const fetchRoles = async(search = '', page = 1) => {
    try {
        const response = await getRoles(search, page)

        roles.value = response.data || []
        
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

onMounted(() => {
    fetchRoles()
})

const searchQuery = ref('')
let searchTimeout = null

watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchRoles(newValue, 1)
    }, 500) 
})

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)

const form = ref({
    name: ''
})

const openModal = (role = null) => {
    if (role && role.id) {
        isEditing.value = true
        editId.value = role.id
        form.value = { name: role.name }
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

const saveRole = async () => {
    try {
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')

        if (isEditing.value) {
            await updateRole(editId.value, form.value)
        } else {
            await createRole(form.value)
        }
        
        closeModal()
        showSuccess('Berhasil!', `Data role berhasil ${isEditing.value ? 'diperbarui' : 'disimpan'}.`)
        
        await fetchRoles(searchQuery.value, pagination.value.current_page)

    } catch(error) {
        showError('Gagal Menyimpan!', 'Terjadi kesalahan pada sistem.', error)
    }
}

const delRole = async (id) => {
    const isConfirmed = await showConfirm(
        'Hapus Role?', 
        'Data ini akan dihapus secara permanen dan tidak dapat dikembalikan.'
    )
    
    if (isConfirmed) {
        try {
            showLoading('Menghapus Data...', 'Mohon tunggu sebentar.')
            
            await deleteRole(id)
            showSuccess('Terhapus!', 'Data role berhasil dihapus.')
            
            await fetchRoles(searchQuery.value, pagination.value.current_page)
            
        } catch(error) {
            showError('Gagal Menghapus!', error?.response?.data?.message || 'Terjadi kesalahan saat menghapus data.', error)
        }
    }
}

const managePermissions = (id) => {
    router.push({ name: 'admin.master.role.permissions', params: { id } })
}

</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <PageHeader 
            title="Roles"
        >
            <template #icon>
                <Shield class="w-7 h-7" />
            </template>
        </PageHeader>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="w-full sm:max-w-xs">
                    <SearchInput v-model="searchQuery" placeholder="Search roles..." />
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Add Role
                    </BaseButton>
                </div>
            </div>

            <BaseTable :columns="tableColumns">
                <tr v-for="role in roles" :key="role.id" class="hover:bg-gray-50/80 transition-colors group">
                    
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="flex items-center gap-4">
                            <div>
                                <div class="text-base font-bold text-gray-900">{{ role.name || '-' }}</div>
                            </div>
                        </div>
                    </td>
                    
                    <td class="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 transition-opacity">
                            <button @click="managePermissions(role.id)" class="px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 rounded-xl transition-colors font-semibold flex items-center gap-2 border border-indigo-100" title="Manage Permissions">
                                <ShieldCheck class="w-4 h-4" />
                                Permissions
                            </button>
                            <div class="w-px h-6 bg-gray-200 mx-1"></div>
                            <button @click="openModal(role)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Edit">
                                <Edit class="w-4 h-4" />
                            </button>
                            <button @click="delRole(role.id)" class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Delete">
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
                @change-page="(page) => fetchRoles(searchQuery, page)"
            />
        </div>

        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/40 transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Shield class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">{{ isEditing ? 'Edit Role' : 'Add New Role' }}</h3>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 space-y-5 overflow-y-auto overflow-x-hidden min-h-[100px]">
                        <div>
                            <BaseInput 
                                v-model="form.name"
                                label="Role Name"
                                placeholder="Enter role name"
                                required
                            />
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="saveRole">
                            <Check class="w-4 h-4" />
                            {{ isEditing ? 'Update Role' : 'Save Role' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
