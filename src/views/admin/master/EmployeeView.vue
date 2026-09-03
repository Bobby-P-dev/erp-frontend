<script setup>
import { onMounted, ref, watch } from 'vue'
import { Plus, Edit, Trash2, Users, X, Check, MoreVertical } from '@lucide/vue'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getEmployeeDivisions, getEmployeePositions } from '../../../services/employeeServices'
import { searchCompanies } from '../../../services/companyServices'
import { searchJobLevels } from '../../../services/jobLevelServices'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal'
import PageHeader from '../../../components/ui/PageHeader.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'
import ToggleSwitch from '../../../components/ui/ToggleSwitch.vue'
import SearchableSelect from '../../../components/ui/SearchableSelect.vue'

const employees = ref([])
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const tableColumns = [
    { key: 'nik', label: 'NIK' },
    { key: 'name', label: 'Employee' },
    { key: 'company', label: 'Company' },
    { key: 'division', label: 'Division' },
    { key: 'position', label: 'Pos. & Job Level' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const fetchEmployees = async(search = '', page = 1) => {
    try {
        const response = await getEmployees(search, page)
        employees.value = response.data
        const resPagination = response.meta || response.data
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
    fetchEmployees()
    loadCompanies('')
    loadJobLevels('')
})

const searchQuery = ref('')
let searchTimeout = null

watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchEmployees(newValue, 1)
    }, 500) 
})

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)

const form = ref({
    nik: '',
    name: '',
    company_id: '',
    division_id: '',
    position_id: '',
    job_level_id: '',
    is_active: true
})

const companyOptions = ref([])
const divisionOptions = ref([])
const positionOptions = ref([])
const jobLevelOptions = ref([])

const loadCompanies = async (search = '') => {
    try {
        const res = await searchCompanies(search)
        companyOptions.value = res.data.map(item => ({ value: item.id, label: `${item.name} (${item.code})` }))
    } catch (e) {
        console.error(e)
    }
}

const loadDivisions = async (search = '') => {
    if (!form.value.company_id) {
        divisionOptions.value = []
        return
    }
    try {
        const res = await getEmployeeDivisions(form.value.company_id, search)
        divisionOptions.value = res.data.map(item => ({ value: item.id, label: item.name }))
    } catch (e) {
        console.error(e)
    }
}

const loadPositions = async (search = '') => {
    if (!form.value.division_id) {
        positionOptions.value = []
        return
    }
    try {
        const res = await getEmployeePositions(form.value.division_id, search)
        positionOptions.value = res.data.map(item => ({ value: item.position.id, label: item.position.name }))
    } catch (e) {
        console.error(e)
    }
}

const loadJobLevels = async (search = '') => {
    try {
        const res = await searchJobLevels(search)
        jobLevelOptions.value = res.data.map(item => ({ value: item.id, label: `${item.name} (${item.code})` }))
    } catch (e) {
        console.error(e)
    }
}

watch(() => form.value.company_id, (newVal, oldVal) => {
    if (newVal !== oldVal && newVal !== '') {
        if (oldVal !== '' && oldVal !== null) { 
            form.value.division_id = ''
            form.value.position_id = ''
            divisionOptions.value = []
            positionOptions.value = []
        }
        loadDivisions('')
    }
})

watch(() => form.value.division_id, (newVal, oldVal) => {
    if (newVal !== oldVal && newVal !== '') {
        if (oldVal !== '' && oldVal !== null) { 
            form.value.position_id = ''
            positionOptions.value = []
        }
        loadPositions('')
    }
})

const openModal = async (employee = null) => {
    if (employee && employee.id) {
        isEditing.value = true
        editId.value = employee.id
        form.value = { 
            nik: employee.nik,
            name: employee.name,
            company_id: employee.company_id || '',
            division_id: employee.division_id || '',
            position_id: employee.position_id || '',
            job_level_id: employee.job_level_id || '',
            is_active: employee.is_active === 1 || employee.is_active === true
        }
        
        if (employee.company_id) await loadDivisions('')
        if (employee.division_id) await loadPositions('')
    } else {
        isEditing.value = false
        editId.value = null
        form.value = { 
            nik: '',
            name: '',
            company_id: '',
            division_id: '',
            position_id: '',
            job_level_id: '',
            is_active: true
        }
        divisionOptions.value = []
        positionOptions.value = []
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
}

const saveEmployee = async () => {
    if (!form.value.position_id && !form.value.job_level_id) {
        showError('Validasi Gagal!', 'Position atau Job Level harus diisi salah satu (keduanya tidak boleh kosong).')
        return
    }

    try {
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')
        const payload = { ...form.value, is_active: form.value.is_active ? 1 : 0 }
        
        if (payload.position_id === '') payload.position_id = null
        if (payload.job_level_id === '') payload.job_level_id = null
        if (payload.division_id === '') payload.division_id = null
        if (payload.company_id === '') payload.company_id = null

        if (isEditing.value) {
            await updateEmployee(editId.value, payload)
        } else {
            await createEmployee(payload)
        }
        
        closeModal()
        showSuccess('Berhasil!', `Data employee berhasil ${isEditing.value ? 'diperbarui' : 'disimpan'}.`)
        await fetchEmployees(searchQuery.value, pagination.value.current_page)
    } catch(error) {
        showError('Gagal Menyimpan!', 'Terjadi kesalahan pada sistem.', error)
    }
}

const delEmployee = async (id) => {
    const isConfirmed = await showConfirm(
        'Hapus Employee?', 
        'Data ini akan dihapus secara permanen dan tidak dapat dikembalikan.'
    )
    if (isConfirmed) {
        try {
            showLoading('Menghapus Data...', 'Mohon tunggu sebentar.')
            await deleteEmployee(id)
            showSuccess('Terhapus!', 'Data employee berhasil dihapus.')
            await fetchEmployees(searchQuery.value, pagination.value.current_page)
        } catch(error) {
            showError('Gagal Menghapus!', error?.response?.data?.message || 'Terjadi kesalahan saat menghapus data.', error)
        }
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PageHeader title="Employees">
            <template #icon>
                <Users class="w-7 h-7" />
            </template>
        </PageHeader>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="w-full sm:max-w-xs">
                    <SearchInput v-model="searchQuery" placeholder="Search employees by name/NIK..." />
                </div>
                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Add Employee
                    </BaseButton>
                </div>
            </div>

            <BaseTable :columns="tableColumns">
                <tr v-for="emp in employees" :key="emp.id" class="hover:bg-gray-50/80 transition-colors group">
                    <td class="px-6 py-5 whitespace-nowrap text-sm font-semibold text-gray-700">
                        {{ emp.nik || '-' }}
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="flex flex-col">
                            <span class="text-base font-bold text-gray-900">{{ emp.name || '-' }}</span>
                            <span class="text-xs text-gray-500" v-if="emp.email">{{ emp.email }}</span>
                        </div>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="text-sm text-gray-700">{{ emp.company?.name || '-' }}</div>
                        <div class="text-xs text-gray-400">{{ emp.company?.code }}</div>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="text-sm text-gray-700">{{ emp.division?.name || '-' }}</div>
                        <div class="text-xs text-gray-400">{{ emp.division?.code }}</div>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap">
                        <div class="flex flex-col gap-1">
                            <div class="flex items-center gap-2" v-if="emp.position">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600">POS</span>
                                <span class="text-sm text-gray-700">{{ emp.position.name }}</span>
                            </div>
                            <div class="flex items-center gap-2" v-if="emp.job_level">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600">LVL</span>
                                <span class="text-sm text-gray-700">{{ emp.job_level.name }}</span>
                            </div>
                            <div v-if="!emp.position && !emp.job_level" class="text-sm text-gray-400">-</div>
                        </div>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap">
                        <span v-if="emp.is_active" class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/50">Active</span>
                        <span v-else class="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200/50">Inactive</span>
                    </td>
                    <td class="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 transition-opacity">
                            <button @click="openModal(emp)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Edit">
                                <Edit class="w-4 h-4" />
                            </button>
                            <button @click="delEmployee(emp.id)" class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Delete">
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            </BaseTable>
            
            <Pagination 
                :pagination="pagination"
                @change-page="(page) => fetchEmployees(searchQuery, page)"
            />
        </div>

        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/40 transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Users class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">{{ isEditing ? 'Edit Employee' : 'Add New Employee' }}</h3>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 overflow-y-auto overflow-x-hidden">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="md:col-span-1">
                                <BaseInput 
                                    v-model="form.nik"
                                    label="NIK"
                                    placeholder="Enter employee NIK"
                                    required
                                />
                            </div>
                            <div class="md:col-span-1">
                                <BaseInput 
                                    v-model="form.name"
                                    label="Employee Name"
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>

                            <div class="md:col-span-2">
                                <SearchableSelect 
                                    v-model="form.company_id"
                                    label="Company"
                                    placeholder="Select a company..."
                                    :options="companyOptions"
                                    @search="loadCompanies"
                                    required
                                />
                            </div>

                            <div class="md:col-span-2" :class="{'opacity-50 pointer-events-none': !form.company_id}">
                                <SearchableSelect 
                                    v-model="form.division_id"
                                    label="Division"
                                    placeholder="Select a division..."
                                    :options="divisionOptions"
                                    @search="loadDivisions"
                                    required
                                />
                                <p v-if="!form.company_id" class="text-xs text-rose-500 mt-1">Please select a company first.</p>
                            </div>

                            <div class="md:col-span-1" :class="{'opacity-50 pointer-events-none': !form.division_id}">
                                <SearchableSelect 
                                    v-model="form.position_id"
                                    label="Position (Optional)"
                                    placeholder="Select position..."
                                    :options="positionOptions"
                                    @search="loadPositions"
                                />
                                <p v-if="!form.division_id" class="text-[11px] text-rose-500 mt-1 leading-tight">Please select a division first.</p>
                            </div>
                            
                            <div class="md:col-span-1">
                                <SearchableSelect 
                                    v-model="form.job_level_id"
                                    label="Job Level (Optional)"
                                    placeholder="Select job level..."
                                    :options="jobLevelOptions"
                                    @search="loadJobLevels"
                                />
                            </div>

                            <div class="md:col-span-2 flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-gray-50/50 mt-2">
                                <div>
                                    <h4 class="font-semibold text-gray-900 text-sm">Status</h4>
                                    <p class="text-xs text-gray-500 mt-0.5">Determine if this employee is active</p>
                                </div>
                                <ToggleSwitch v-model="form.is_active" />
                            </div>
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="saveEmployee">
                            <Check class="w-4 h-4" />
                            {{ isEditing ? 'Update Employee' : 'Save Employee' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
