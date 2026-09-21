<script setup>
import { ref, onMounted, watch } from 'vue'
import { 
    Users, 
    Plus, 
    Edit, 
    Trash2, 
    Star, 
    Mail, 
    Phone, 
    X, 
    Check, 
    AlertCircle 
} from '@lucide/vue'
import { 
    getSupplierContacts, 
    createSupplierContact, 
    updateSupplierContact, 
    deleteSupplierContact 
} from '../../../../../services/supplierServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../../../utils/swal.js'
import BaseButton from '../../../../../components/ui/BaseButton.vue'
import BaseInput from '../../../../../components/ui/BaseInput.vue'
import BaseTable from '../../../../../components/ui/BaseTable.vue'
import ToggleSwitch from '../../../../../components/ui/ToggleSwitch.vue'
import SearchInput from '../../../../../components/ui/SearchInput.vue'

const props = defineProps({
    supplier: {
        type: Object,
        required: true
    }
})

const contacts = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
let searchTimeout = null

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)
const isSubmitting = ref(false)
const errors = ref({})

const form = ref({
    name: '',
    title: '',
    email: '',
    phone: '',
    is_primary: false
})

const tableColumns = [
    { key: 'name', label: 'Contact Name' },
    { key: 'title', label: 'Position / Title' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'primary', label: 'Primary Contact' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const fetchContacts = async () => {
    if (!props.supplier?.id) return
    try {
        isLoading.value = true
        const response = await getSupplierContacts(searchQuery.value, 1, {
            supplier_id: props.supplier.id
        })
        contacts.value = response.data || []
    } catch (error) {
        showError('Error', 'Gagal memuat kontak supplier.', error)
    } finally {
        isLoading.value = false
    }
}

watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchContacts()
    }, 400)
})

watch(() => props.supplier?.id, () => {
    fetchContacts()
})

onMounted(() => {
    fetchContacts()
})

const openModal = (contact = null) => {
    errors.value = {}
    if (contact && contact.id) {
        isEditing.value = true
        editId.value = contact.id
        form.value = {
            name: contact.name || '',
            title: contact.title || '',
            email: contact.email || '',
            phone: contact.phone || '',
            is_primary: Boolean(contact.is_primary)
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = {
            name: '',
            title: '',
            email: '',
            phone: '',
            is_primary: contacts.value.length === 0 // Default to primary if first contact
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

    if (!form.value.name.trim() || !form.value.title.trim() || !form.value.email.trim() || !form.value.phone.trim()) {
        showError('Validasi Gagal', 'Mohon lengkapi seluruh field wajib (Nama, Posisi/Jabatan, Email, No. Telepon).')
        return
    }

    try {
        isSubmitting.value = true
        showLoading('Menyimpan Kontak...', 'Mohon tunggu sebentar.')

        const payload = {
            supplier_id: props.supplier.id,
            name: form.value.name.trim(),
            title: form.value.title.trim(),
            email: form.value.email.trim(),
            phone: form.value.phone.trim(),
            is_primary: Boolean(form.value.is_primary)
        }

        if (isEditing.value) {
            await updateSupplierContact(editId.value, payload)
        } else {
            await createSupplierContact(payload)
        }

        closeModal()
        showSuccess('Berhasil!', `Kontak supplier berhasil ${isEditing.value ? 'diperbarui' : 'ditambahkan'}.`)
        fetchContacts()
    } catch (error) {
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors
            showError('Validasi Gagal', 'Silakan periksa kembali field input Anda.')
        } else {
            const errorMsg = error.response?.data?.message || 'Gagal menyimpan kontak.'
            showError('Gagal Menyimpan!', errorMsg, error)
        }
    } finally {
        isSubmitting.value = false
    }
}

const handleDelete = async (contact) => {
    const isConfirmed = await showConfirm(
        'Hapus Kontak?',
        `Apakah Anda yakin ingin menghapus kontak "${contact.name}"?`
    )

    if (isConfirmed) {
        try {
            showLoading('Menghapus Kontak...', 'Mohon tunggu sebentar.')
            await deleteSupplierContact(contact.id)
            showSuccess('Berhasil!', 'Kontak berhasil dihapus.')
            fetchContacts()
        } catch (error) {
            showError('Gagal!', error.response?.data?.message || 'Gagal menghapus kontak.', error)
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
                    <SearchInput v-model="searchQuery" placeholder="Search contacts..." />
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Add Contact
                    </BaseButton>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns">
                <tr v-for="contact in contacts" :key="contact.id" class="hover:bg-gray-50/80 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                {{ contact.name.charAt(0).toUpperCase() }}
                            </div>
                            <div class="font-bold text-gray-900">{{ contact.name }}</div>
                        </div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-sm font-medium text-gray-700 bg-gray-100/80 px-2.5 py-1 rounded-md">
                            {{ contact.title }}
                        </span>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-700">{{ contact.email }}</div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-700">{{ contact.phone }}</div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <span 
                            v-if="contact.is_primary"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                            <Star class="w-3 h-3 fill-indigo-600" />
                            Primary
                        </span>
                        <span v-else class="text-xs text-gray-400">-</span>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-1.5">
                            <button 
                                @click="openModal(contact)" 
                                class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="Edit Contact"
                            >
                                <Edit class="w-4 h-4" />
                            </button>
                            <button 
                                @click="handleDelete(contact)" 
                                class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Delete Contact"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>

                <!-- Loading state -->
                <tr v-if="isLoading">
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                        <div class="text-sm font-medium text-gray-600">Loading contacts...</div>
                    </td>
                </tr>

                <!-- Empty state -->
                <tr v-else-if="contacts.length === 0">
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                        <Users class="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <div class="text-base font-semibold text-gray-800">No contacts registered yet</div>
                        <p class="text-sm text-gray-400 mt-1">Add primary PIC or sales representatives for this supplier.</p>
                        <BaseButton @click="openModal()" class="mt-4" size="sm">
                            <Plus class="w-4 h-4" />
                            Add First Contact
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
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Users class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">
                                {{ isEditing ? 'Edit Contact' : 'Add New Contact' }}
                            </h3>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 space-y-4 overflow-y-auto">
                        <div>
                            <BaseInput 
                                v-model="form.name"
                                label="Contact Person Name"
                                placeholder="e.g. Budi Santoso"
                                :error="errors.name?.[0] || errors.name"
                                required
                            />
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.title"
                                label="Position / Job Title"
                                placeholder="e.g. Sales Manager, Account Executive"
                                :error="errors.title?.[0] || errors.title"
                                required
                            />
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.email"
                                type="email"
                                label="Email Address"
                                placeholder="budi.santoso@supplier.co.id"
                                :error="errors.email?.[0] || errors.email"
                                required
                            />
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.phone"
                                label="Phone Number"
                                placeholder="+62 812 3456 7890"
                                :error="errors.phone?.[0] || errors.phone"
                                required
                            />
                        </div>

                        <div class="pt-2 flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <div class="text-sm font-bold text-gray-800">Primary Contact</div>
                                <div class="text-xs text-gray-500">Designate as main point of contact for procurement</div>
                            </div>
                            <ToggleSwitch v-model="form.is_primary" />
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal" :disabled="isSubmitting">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="handleSave" :disabled="isSubmitting">
                            <Check class="w-4 h-4" />
                            {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update Contact' : 'Save Contact') }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
