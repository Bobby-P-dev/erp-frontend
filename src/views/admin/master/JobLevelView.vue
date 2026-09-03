<script setup>
import { onMounted, ref, watch } from 'vue'
import { Search, Plus, Edit, Trash2, Layers, X, Check, MoreVertical } from '@lucide/vue'
import { getJobLevels, createJobLevel, updateJobLevel, deleteJobLevel } from '../../../services/jobLevelServices'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal'
import PageHeader from '../../../components/ui/PageHeader.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'
import ToggleSwitch from '../../../components/ui/ToggleSwitch.vue'

const jobLevels = ref([])
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const tableColumns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Job Level Name' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const fetchJobLevels = async(search = '', page = 1) => {
    try {
        const response = await getJobLevels(search, page)

        jobLevels.value = response.data.data
        
        const resPagination = response.data
        pagination.value = {
            current_page: resPagination.current_page,
            last_page: resPagination.last_page,
            from: resPagination.from || 0,
            to: resPagination.to || 0,
            total: resPagination.total
        }
        
    } catch(error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan pada sistem.', error)
    }
}

onMounted(() => {
    fetchJobLevels()
})

const searchQuery = ref('')
let searchTimeout = null

watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchJobLevels(newValue, 1)
    }, 500) 
})

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)

const form = ref({
    code: '',
    name: '',
    is_active: true
})

const openModal = (jobLevel = null) => {
    if (jobLevel && jobLevel.id) {
        isEditing.value = true
        editId.value = jobLevel.id
        form.value = { 
            code: jobLevel.code,
            name: jobLevel.name,
            is_active: jobLevel.is_active === 1 || jobLevel.is_active === true
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = { 
            code: '',
            name: '',
            is_active: true
        }
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
}

const saveJobLevel = async () => {
    try {
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')

        const payload = { ...form.value, is_active: form.value.is_active ? 1 : 0 }

        if (isEditing.value) {
            await updateJobLevel(editId.value, payload)
        } else {
            await createJobLevel(payload)
        }
        
        closeModal()
        showSuccess('Berhasil!', `Data job level berhasil ${isEditing.value ? 'diperbarui' : 'disimpan'}.`)
        
        await fetchJobLevels(searchQuery.value, pagination.value.current_page)

    } catch(error) {
        showError('Gagal Menyimpan!', 'Terjadi kesalahan pada sistem.', error)
    }
}

const delJobLevel = async (id) => {
    const isConfirmed = await showConfirm(
        'Hapus Job Level?', 
        'Data ini akan dihapus secara permanen dan tidak dapat dikembalikan.'
    )
    
    if (isConfirmed) {
        try {
            showLoading('Menghapus Data...', 'Mohon tunggu sebentar.')
            
            await deleteJobLevel(id)
            showSuccess('Terhapus!', 'Data job level berhasil dihapus.')
            
            await fetchJobLevels(searchQuery.value, pagination.value.current_page)
            
        } catch(error) {
            showError('Gagal Menghapus!', error?.response?.data?.message || 'Terjadi kesalahan saat menghapus data.', error)
        }
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <PageHeader 
            title="Job Levels"
        >
            <template #icon>
                <Layers class="w-7 h-7" />
            </template>
        </PageHeader>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="w-full sm:max-w-xs">
                    <SearchInput v-model="searchQuery" placeholder="Search job levels..." />
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Add Job Level
                    </BaseButton>
                </div>
            </div>

            <BaseTable :columns="tableColumns">
                <tr v-for="jobLevel in jobLevels" :key="jobLevel.id" class="hover:bg-gray-50/80 transition-colors group">
                    
                    <td class="px-6 py-5 whitespace-nowrap text-sm font-semibold text-gray-700">
                        {{ jobLevel.code || '-' }}
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="text-base font-bold text-gray-900">{{ jobLevel.name || '-' }}</div>
                    </td>

                    <td class="px-6 py-5 whitespace-nowrap">
                        <span v-if="jobLevel.is_active" class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/50">Active</span>
                        <span v-else class="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200/50">Inactive</span>
                    </td>
                    
                    <td class="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 transition-opacity">
                            <button @click="openModal(jobLevel)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Edit">
                                <Edit class="w-4 h-4" />
                            </button>
                            <button @click="delJobLevel(jobLevel.id)" class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Delete">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            </BaseTable>
            
            <Pagination 
                :pagination="pagination"
                @change-page="(page) => fetchJobLevels(searchQuery, page)"
            />
        </div>

        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/40 transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Layers class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">{{ isEditing ? 'Edit Job Level' : 'Add New Job Level' }}</h3>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 space-y-5 overflow-y-auto overflow-x-hidden min-h-[100px]">
                        <div>
                            <BaseInput 
                                v-model="form.code"
                                label="Job Level Code"
                                placeholder="e.g. MGR, STF"
                                required
                            />
                        </div>
                        <div>
                            <BaseInput 
                                v-model="form.name"
                                label="Job Level Name"
                                placeholder="e.g. Manager, Staff"
                                required
                            />
                        </div>
                        <div class="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
                            <div>
                                <h4 class="font-semibold text-gray-900 text-sm">Status</h4>
                                <p class="text-xs text-gray-500 mt-0.5">Determine if this job level is active or not</p>
                            </div>
                            <ToggleSwitch v-model="form.is_active" />
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="saveJobLevel">
                            <Check class="w-4 h-4" />
                            {{ isEditing ? 'Update Job Level' : 'Save Job Level' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
