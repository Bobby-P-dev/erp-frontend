<script setup>
import { ref, onMounted, watch } from 'vue'
import { 
    CreditCard, 
    Plus, 
    Edit, 
    Trash2, 
    Star, 
    X, 
    Check, 
    Building2,
    AlertCircle 
} from '@lucide/vue'
import { 
    getSupplierBankAccounts, 
    createSupplierBankAccount, 
    updateSupplierBankAccount, 
    deleteSupplierBankAccount 
} from '../../../../../services/supplierServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../../../utils/swal.js'
import BaseButton from '../../../../../components/ui/BaseButton.vue'
import BaseInput from '../../../../../components/ui/BaseInput.vue'
import BaseTable from '../../../../../components/ui/BaseTable.vue'
import ToggleSwitch from '../../../../../components/ui/ToggleSwitch.vue'
import SearchInput from '../../../../../components/ui/SearchInput.vue'
import StatusBadge from '../../../../../components/ui/StatusBadge.vue'

const props = defineProps({
    supplier: {
        type: Object,
        required: true
    }
})

const bankAccounts = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
let searchTimeout = null

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)
const isSubmitting = ref(false)
const errors = ref({})

const form = ref({
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    branch: '',
    is_primary: false,
    is_active: true
})

const tableColumns = [
    { key: 'bank', label: 'Bank Name' },
    { key: 'account_number', label: 'Account Number' },
    { key: 'account_name', label: 'Beneficiary Name' },
    { key: 'branch', label: 'Branch' },
    { key: 'primary', label: 'Primary Account' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const fetchBankAccounts = async () => {
    if (!props.supplier?.id) return
    try {
        isLoading.value = true
        const response = await getSupplierBankAccounts(searchQuery.value, 1, {
            supplier_id: props.supplier.id
        })
        bankAccounts.value = response.data || []
    } catch (error) {
        showError('Error', 'Gagal memuat rekening bank supplier.', error)
    } finally {
        isLoading.value = false
    }
}

watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchBankAccounts()
    }, 400)
})

watch(() => props.supplier?.id, () => {
    fetchBankAccounts()
})

onMounted(() => {
    fetchBankAccounts()
})

const openModal = (account = null) => {
    errors.value = {}
    if (account && account.id) {
        isEditing.value = true
        editId.value = account.id
        form.value = {
            bank_name: account.bank_name || '',
            bank_account_number: account.bank_account_number || '',
            bank_account_name: account.bank_account_name || '',
            branch: account.branch || '',
            is_primary: Boolean(account.is_primary),
            is_active: account.is_active ?? true
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = {
            bank_name: '',
            bank_account_number: '',
            bank_account_name: props.supplier?.name || '',
            branch: '',
            is_primary: bankAccounts.value.length === 0,
            is_active: true
        }
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
    isEditing.value = false
    editId.value = null
}

const handleSave = async () => {
    errors.value = {}

    if (!form.value.bank_name.trim() || !form.value.bank_account_number.trim() || !form.value.bank_account_name.trim()) {
        showError('Validasi Gagal', 'Mohon lengkapi Nama Bank, No. Rekening, dan Nama Pemilik Rekening.')
        return
    }

    if (!form.value.is_active && form.value.is_primary) {
        showError('Validasi Gagal', 'Rekening bank yang dinonaktifkan tidak dapat dijadikan rekening utama.')
        return
    }

    try {
        isSubmitting.value = true
        showLoading('Menyimpan Rekening...', 'Mohon tunggu sebentar.')

        const payload = {
            supplier_id: props.supplier.id,
            bank_name: form.value.bank_name.trim(),
            bank_account_number: form.value.bank_account_number.trim(),
            bank_account_name: form.value.bank_account_name.trim(),
            branch: form.value.branch ? form.value.branch.trim() : null,
            is_primary: Boolean(form.value.is_primary),
            is_active: Boolean(form.value.is_active)
        }

        if (isEditing.value) {
            await updateSupplierBankAccount(editId.value, payload)
        } else {
            await createSupplierBankAccount(payload)
        }

        closeModal()
        showSuccess('Berhasil!', `Rekening bank supplier berhasil ${isEditing.value ? 'diperbarui' : 'ditambahkan'}.`)
        fetchBankAccounts()
    } catch (error) {
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors
            showError('Validasi Gagal', 'Silakan periksa kembali field input Anda.')
        } else {
            const errorMsg = error.response?.data?.message || 'Gagal menyimpan rekening bank.'
            showError('Gagal Menyimpan!', errorMsg, error)
        }
    } finally {
        isSubmitting.value = false
    }
}

const handleDelete = async (account) => {
    const isConfirmed = await showConfirm(
        'Hapus Rekening Bank?',
        `Apakah Anda yakin ingin menghapus rekening "${account.bank_name} - ${account.bank_account_number}"?`
    )

    if (isConfirmed) {
        try {
            showLoading('Menghapus Rekening...', 'Mohon tunggu sebentar.')
            await deleteSupplierBankAccount(account.id)
            showSuccess('Berhasil!', 'Rekening bank berhasil dihapus.')
            fetchBankAccounts()
        } catch (error) {
            showError('Gagal!', error.response?.data?.message || 'Gagal menghapus rekening bank.', error)
        }
    }
}
</script>

<template>
    <div class="space-y-6">
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <!-- Header Toolbar -->
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="w-full sm:max-w-xs">
                    <SearchInput v-model="searchQuery" placeholder="Search bank accounts..." />
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Add Bank Account
                    </BaseButton>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns">
                <tr v-for="account in bankAccounts" :key="account.id" class="hover:bg-gray-50/80 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-bold text-gray-900">{{ account.bank_name }}</div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="font-mono text-sm font-semibold text-gray-800 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                            {{ account.bank_account_number }}
                        </span>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-800">{{ account.bank_account_name }}</div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">{{ account.branch || '-' }}</div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <span 
                            v-if="account.is_primary"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                            <Star class="w-3 h-3 fill-emerald-600" />
                            Primary
                        </span>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <StatusBadge :isActive="Boolean(account.is_active)" />
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-1.5">
                            <button 
                                @click="openModal(account)" 
                                class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="Edit Bank Account"
                            >
                                <Edit class="w-4 h-4" />
                            </button>
                            <button 
                                @click="handleDelete(account)" 
                                class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Delete Bank Account"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>

                <!-- Loading state -->
                <tr v-if="isLoading">
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                        <div class="text-sm font-medium text-gray-600">Loading bank accounts...</div>
                    </td>
                </tr>

                <!-- Empty state -->
                <tr v-else-if="bankAccounts.length === 0">
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <CreditCard class="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <div class="text-base font-semibold text-gray-800">No bank accounts registered yet</div>
                        <p class="text-sm text-gray-400 mt-1">Register supplier payment banking details for accounts payable disbursement.</p>
                        <BaseButton @click="openModal()" class="mt-4" size="sm">
                            <Plus class="w-4 h-4" />
                            Add First Bank Account
                        </BaseButton>
                    </td>
                </tr>
            </BaseTable>
        </div>

        <!-- Add/Edit Modal -->
        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/40 transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <CreditCard class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">
                                {{ isEditing ? 'Edit Bank Account' : 'Add Bank Account' }}
                            </h3>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 space-y-4 overflow-y-auto">
                        <div>
                            <BaseInput 
                                v-model="form.bank_name"
                                label="Bank Name"
                                placeholder="e.g. Bank Central Asia (BCA), Mandiri"
                                :error="errors.bank_name?.[0] || errors.bank_name"
                                required
                            />
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.bank_account_number"
                                label="Account Number"
                                placeholder="e.g. 8830192831"
                                :error="errors.bank_account_number?.[0] || errors.bank_account_number"
                                required
                            />
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.bank_account_name"
                                label="Beneficiary Account Name"
                                placeholder="e.g. PT SUMBER PERKASA ABADI"
                                :error="errors.bank_account_name?.[0] || errors.bank_account_name"
                                required
                            />
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.branch"
                                label="Branch Office (Optional)"
                                placeholder="e.g. KCP Cikarang Barat"
                            />
                        </div>

                        <div class="grid grid-cols-2 gap-4 pt-2">
                            <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between">
                                <div>
                                    <div class="text-sm font-bold text-gray-800">Primary Account</div>
                                    <div class="text-xs text-gray-400 mt-0.5">Used for default AP transfers</div>
                                </div>
                                <div class="pt-3">
                                    <ToggleSwitch v-model="form.is_primary" />
                                </div>
                            </div>

                            <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between">
                                <div>
                                    <div class="text-sm font-bold text-gray-800">Active Status</div>
                                    <div class="text-xs text-gray-400 mt-0.5">Allow transactions to this bank</div>
                                </div>
                                <div class="pt-3">
                                    <ToggleSwitch v-model="form.is_active" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal" :disabled="isSubmitting">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="handleSave" :disabled="isSubmitting">
                            <Check class="w-4 h-4" />
                            {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update Account' : 'Save Account') }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
