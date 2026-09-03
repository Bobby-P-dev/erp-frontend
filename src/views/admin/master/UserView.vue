<script setup>
import { onMounted, ref, watch } from 'vue'
import { Plus, Edit, Users, X, Check, Filter, Search } from '@lucide/vue'
import { getUsers, updateUserPassword, syncUserRoles } from '../../../services/userServices'
import { register } from '../../../services/authServices'
import { searchEmployees } from '../../../services/employeeServices'
import { searchCompanies } from '../../../services/companyServices'
import { searchDivisions } from '../../../services/divisionServices'
import { searchJobLevels } from '../../../services/jobLevelServices'
import { getRoles, searchRoles } from '../../../services/roleServices'
import { showLoading, showSuccess, showError } from '../../../utils/swal'
import PageHeader from '../../../components/ui/PageHeader.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'
import SearchableSelect from '../../../components/ui/SearchableSelect.vue'
import SearchableMultiSelect from '../../../components/ui/SearchableMultiSelect.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const users = ref([])
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const tableColumns = [
    { key: 'employee', label: 'Employee' },
    { key: 'company_division', label: 'Company & Division' },
    { key: 'position_level', label: 'Pos. & Job Level' },
    { key: 'roles', label: 'Roles' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const searchQuery = ref('')
const showFilters = ref(false)
const filterParams = ref({
    company_id: '',
    division_id: '',
    job_level_id: '',
    role_id: ''
})

const fetchUsers = async(search = '', page = 1) => {
    try {
        const response = await getUsers(search, page, filterParams.value)
        if (response.data && response.data.data) {
            users.value = response.data.data
            const resPagination = response.data
            pagination.value = {
                current_page: resPagination.current_page,
                last_page: resPagination.last_page,
                from: resPagination.from || 0,
                to: resPagination.to || 0,
                total: resPagination.total
            }
        } else {
            users.value = response.data || []
            const resPagination = response.meta || response
            pagination.value = {
                current_page: resPagination.current_page || 1,
                last_page: resPagination.last_page || 1,
                from: resPagination.from || 0,
                to: resPagination.to || 0,
                total: resPagination.total || 0
            }
        }
    } catch(error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan pada sistem.', error)
    }
}

onMounted(() => {
    fetchUsers()
    loadFilterOptions()
})

let searchTimeout = null
watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchUsers(newValue, 1)
    }, 500) 
})

watch(() => filterParams.value, () => {
    fetchUsers(searchQuery.value, 1)
}, { deep: true })

const companyOptions = ref([])
const divisionOptions = ref([])
const jobLevelOptions = ref([])
const roleOptions = ref([])

const loadFilterOptions = async () => {
    try {
        const [comp, div, job, rol] = await Promise.all([
            searchCompanies(''),
            searchDivisions(''),
            searchJobLevels(''),
            getRoles('', 1)
        ])
        companyOptions.value = comp.data.map(item => ({ value: item.id, label: item.name }))
        divisionOptions.value = div.data.map(item => ({ value: item.id, label: item.name }))
        jobLevelOptions.value = job.data.map(item => ({ value: item.id, label: item.name }))
        
        const rolesArray = rol.data.data ? rol.data.data : (rol.data || [])
        roleOptions.value = rolesArray.map(item => ({ value: item.id, label: item.name }))
    } catch (e) {
        console.error("Failed to load filter options", e)
    }
}

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)

const form = ref({
    employee_id: '',
    password: '',
    password_confirmation: '',
    roles: []
})

const employeeOptions = ref([])


const loadModalRoles = async (search = '') => {
    try {
        const res = await searchRoles(search)
        roleOptions.value = res.data.map(item => ({ value: item.id, label: item.name }))
    } catch (e) {
        console.error(e)
    }
}

const loadEmployees = async (search = '') => {
    try {
        const res = await searchEmployees(search)
        employeeOptions.value = res.data.map(item => ({ 
            value: item.id, 
            label: `${item.name} (${item.nik})` 
        }))
    } catch (e) {
        console.error(e)
    }
}

const openModal = async (user = null) => {
    if (user && user.id) {
        isEditing.value = true
        editId.value = user.id
        
        employeeOptions.value = [{
            value: user.employee.id,
            label: `${user.employee.name} (${user.employee.nik})`
        }]

        form.value = { 
            employee_id: user.employee.id,
            password: '',
            password_confirmation: '',
            roles: user.roles ? user.roles.map(r => r.id) : []
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = { 
            employee_id: '',
            password: '',
            password_confirmation: '',
            roles: []
        }
        employeeOptions.value = []
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
}

const saveUser = async () => {
    try {
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')
        
        if (isEditing.value) {
            if (form.value.password) {
                await updateUserPassword(editId.value, {
                    password: form.value.password,
                    password_confirmation: form.value.password_confirmation
                })
            }
            const rolesToSync = Array.isArray(form.value.roles) ? form.value.roles : (form.value.roles ? [form.value.roles] : [])
            await syncUserRoles(editId.value, rolesToSync)
        } else {
            const newUser = await register({
                employee_id: form.value.employee_id,
                password: form.value.password,
                password_confirmation: form.value.password_confirmation
            })
            if (newUser && newUser.data && newUser.data.id) {
                const rolesToSync = Array.isArray(form.value.roles) ? form.value.roles : (form.value.roles ? [form.value.roles] : [])
                await syncUserRoles(newUser.data.id, rolesToSync)
            }
        }
        
        closeModal()
        showSuccess('Berhasil!', `Data user berhasil ${isEditing.value ? 'diperbarui' : 'disimpan'}.`)
        await fetchUsers(searchQuery.value, pagination.value.current_page)
    } catch(error) {
        showError('Gagal Menyimpan!', error?.response?.data?.message || 'Terjadi kesalahan pada sistem.', error)
    }
}


const resetFilters = () => {
    filterParams.value = {
        company_id: '',
        division_id: '',
        job_level_id: '',
        role_id: ''
    }
    showFilters.value = false
}

const toggleFilters = () => {
    showFilters.value = !showFilters.value
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PageHeader title="User Management">
            <template #icon>
                <Users class="w-7 h-7" />
            </template>
        </PageHeader>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <div class="w-full sm:w-64">
                        <SearchInput v-model="searchQuery" placeholder="Search by Employee Name..." />
                    </div>
                </div>
                
                <div class="flex items-center justify-end gap-3 w-full sm:w-auto">
                    <div class="relative">
                        <button @click="toggleFilters" 
                                :class="['p-2 rounded-xl border transition-colors flex items-center justify-center', 
                                         showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50']"
                                title="Advanced Filters">
                            <Filter class="w-5 h-5" />
                        </button>
                        
                        <div v-if="showFilters" class="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-50 animate-in fade-in slide-in-from-top-2">
                            <div class="flex items-center justify-between mb-4">
                                <h4 class="text-sm font-bold text-gray-900">Advanced Filters</h4>
                                <button @click="showFilters = false" class="text-gray-400 hover:text-gray-600"><X class="w-4 h-4"/></button>
                            </div>
                            <div class="flex flex-col gap-4">
                                <div>
                                    <label class="block text-xs font-semibold text-gray-600 mb-1">Company</label>
                                    <SearchableSelect v-model="filterParams.company_id" :options="companyOptions" placeholder="All Companies" />
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-gray-600 mb-1">Division</label>
                                    <SearchableSelect v-model="filterParams.division_id" :options="divisionOptions" placeholder="All Divisions" />
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-gray-600 mb-1">Job Level</label>
                                    <SearchableSelect v-model="filterParams.job_level_id" :options="jobLevelOptions" placeholder="All Job Levels" />
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                                    <SearchableSelect v-model="filterParams.role_id" :options="roleOptions" placeholder="All Roles" />
                                </div>
                            </div>
                            <div class="flex justify-end mt-5 pt-4 border-t border-gray-100">
                                <button @click="resetFilters" class="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Create User
                    </BaseButton>
                </div>
            </div>

            <BaseTable :columns="tableColumns">
                <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50/80 transition-colors group">
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="flex flex-col">
                            <span class="text-base font-bold text-gray-900">{{ user.employee?.name || '-' }}</span>
                            <span class="text-xs text-gray-500 font-mono">{{ user.employee?.nik || '-' }}</span>
                        </div>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="text-sm text-gray-700 font-medium">{{ user.employee?.company?.name || '-' }}</div>
                        <div class="text-xs text-gray-400">{{ user.employee?.division?.name || '-' }}</div>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="flex flex-col gap-1">
                            <span class="text-sm text-gray-700" v-if="user.employee?.position">{{ user.employee.position.name }}</span>
                            <span class="text-xs text-indigo-600 font-medium" v-if="user.employee?.job_level">{{ user.employee.job_level.name }}</span>
                            <span class="text-sm text-gray-400" v-if="!user.employee?.position && !user.employee?.job_level">-</span>
                        </div>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="flex flex-wrap gap-1">
                            <span v-for="role in user.roles" :key="role.id" 
                                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 uppercase">
                                {{ role.name }}
                            </span>
                            <span v-if="!user.roles || user.roles.length === 0" class="text-xs text-gray-400 italic">No Roles</span>
                        </div>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 transition-opacity">
                            <button @click="openModal(user)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Change Password">
                                <Edit class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
                <tr v-if="users.length === 0">
                    <td colspan="5" class="px-6 py-10 text-center text-gray-400 italic">No users found.</td>
                </tr>
            </BaseTable>
            
            <Pagination 
                :pagination="pagination"
                @change-page="(page) => fetchUsers(searchQuery, page)"
            />
        </div>

        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/40 transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Users class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">{{ isEditing ? 'Change Password' : 'Create User' }}</h3>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 overflow-y-auto overflow-x-hidden">
                        <div class="grid grid-cols-1 gap-5">
                            
                            <div>
                                <SearchableSelect 
                                    v-model="form.employee_id"
                                    label="Employee"
                                    placeholder="Search by NIK or Name..."
                                    :options="employeeOptions"
                                    @search="loadEmployees"
                                    required
                                    :disabled="isEditing"
                                />
                                <p v-if="isEditing" class="text-xs text-gray-400 mt-1">Employee details cannot be changed during password update.</p>
                                <p v-else class="text-xs text-gray-400 mt-1">Start typing NIK or Name to search.</p>
                            </div>

                            <BaseInput 
                                v-model="form.password"
                                type="password"
                                :label="isEditing ? 'New Password (leave blank to keep current)' : 'Password'"
                                placeholder="Enter password"
                                :required="!isEditing"
                            />

                            <BaseInput 
                                v-model="form.password_confirmation"
                                type="password"
                                label="Confirm Password"
                                placeholder="Re-enter password"
                                :required="!isEditing"
                            />

                            <div>
                                <SearchableMultiSelect 
                                    v-model="form.roles"
                                    label="Assign Roles"
                                    placeholder="Select one or more roles..."
                                    :options="roleOptions"
                                    @search="loadModalRoles"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="saveUser">
                            <Check class="w-4 h-4" />
                            {{ isEditing ? 'Update Password' : 'Create User' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
