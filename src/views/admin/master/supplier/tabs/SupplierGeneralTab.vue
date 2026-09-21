<script setup>
import { ref, watch } from 'vue'
import { 
    Edit, 
    Briefcase, 
    CreditCard, 
    MapPin, 
    ShieldCheck, 
    X, 
    Check, 
    Building2 
} from '@lucide/vue'
import { updateSupplier } from '../../../../../services/supplierServices.js'
import { showLoading, showSuccess, showError } from '../../../../../utils/swal.js'
import BaseInput from '../../../../../components/ui/BaseInput.vue'
import BaseButton from '../../../../../components/ui/BaseButton.vue'
import ToggleSwitch from '../../../../../components/ui/ToggleSwitch.vue'

const props = defineProps({
    supplier: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['supplier-updated'])

const showEditModal = ref(false)
const isSubmitting = ref(false)
const errors = ref({})

const editForm = ref({
    name: '',
    supplier_code: '',
    supplier_type: '',
    bussines_type: '',
    company_category: '',
    bussines_field: '',
    email: '',
    phone: '',
    tax_id: '',
    payment_term: '',
    lead_time_days: 0,
    address: '',
    city: '',
    region: '',
    postal_code: '',
    country: 'Indonesia',
    is_active: true
})

const supplierTypes = [
    { value: 'Manufacturer', label: 'Manufacturer' },
    { value: 'Distributor', label: 'Distributor' },
    { value: 'Wholesaler', label: 'Wholesaler' },
    { value: 'Service Provider & Fabricator', label: 'Service Provider & Fabricator' },
    { value: 'Other', label: 'Other' }
]

const openEditModal = () => {
    errors.value = {}
    editForm.value = {
        name: props.supplier.name || '',
        supplier_code: props.supplier.supplier_code || '',
        supplier_type: props.supplier.supplier_type || '',
        bussines_type: props.supplier.bussines_type || '',
        company_category: props.supplier.company_category || '',
        bussines_field: props.supplier.bussines_field || '',
        email: props.supplier.email || '',
        phone: props.supplier.phone || '',
        tax_id: props.supplier.tax_id || '',
        payment_term: props.supplier.payment_term || '',
        lead_time_days: props.supplier.lead_time_days ?? 7,
        address: props.supplier.address || '',
        city: props.supplier.city || '',
        region: props.supplier.region || '',
        postal_code: props.supplier.postal_code || '',
        country: props.supplier.country || 'Indonesia',
        is_active: props.supplier.is_active ?? true
    }
    showEditModal.value = true
}

const closeEditModal = () => {
    showEditModal.value = false
}

const handleUpdate = async () => {
    errors.value = {}
    if (!editForm.value.name.trim()) {
        errors.value.name = 'Supplier name is required.'
        return
    }

    try {
        isSubmitting.value = true
        showLoading('Memperbarui Data...', 'Mohon tunggu sebentar.')

        const payload = {
            name: editForm.value.name.trim(),
            supplier_code: editForm.value.supplier_code.trim(),
            supplier_type: editForm.value.supplier_type || null,
            bussines_type: editForm.value.bussines_type ? editForm.value.bussines_type.trim() : null,
            company_category: editForm.value.company_category ? editForm.value.company_category.trim() : null,
            bussines_field: editForm.value.bussines_field ? editForm.value.bussines_field.trim() : null,
            email: editForm.value.email ? editForm.value.email.trim() : null,
            phone: editForm.value.phone ? editForm.value.phone.trim() : null,
            tax_id: editForm.value.tax_id ? editForm.value.tax_id.trim() : null,
            payment_term: editForm.value.payment_term ? editForm.value.payment_term.trim() : null,
            lead_time_days: editForm.value.lead_time_days !== '' ? Number(editForm.value.lead_time_days) : null,
            address: editForm.value.address ? editForm.value.address.trim() : null,
            city: editForm.value.city ? editForm.value.city.trim() : null,
            region: editForm.value.region ? editForm.value.region.trim() : null,
            postal_code: editForm.value.postal_code ? editForm.value.postal_code.trim() : null,
            country: editForm.value.country ? editForm.value.country.trim() : 'Indonesia',
            is_active: Boolean(editForm.value.is_active)
        }

        await updateSupplier(props.supplier.id, payload)
        showSuccess('Berhasil!', 'Data profil supplier berhasil diperbarui.')
        closeEditModal()
        emit('supplier-updated')
    } catch (error) {
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors
            showError('Validasi Gagal', 'Silakan periksa kembali field input Anda.')
        } else {
            const errorMsg = error.response?.data?.message || 'Gagal memperbarui data supplier.'
            showError('Gagal Menyimpan!', errorMsg, error)
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="space-y-6">
        <!-- Action Header -->
        <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900">General Information</h3>
            <BaseButton @click="openEditModal" size="sm">
                <Edit class="w-4 h-4" />
                Edit Supplier Info
            </BaseButton>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Card 1: Identification & Organization -->
            <div class="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div class="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-indigo-600 font-bold text-sm">
                    <Briefcase class="w-4 h-4" />
                    <span>Company & Identification</span>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Supplier Code</div>
                        <div class="font-mono font-bold text-gray-800 mt-0.5">{{ supplier.supplier_code || '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Associated Company</div>
                        <div class="font-semibold text-gray-800 mt-0.5">{{ supplier.company?.name || '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Supplier Type</div>
                        <div class="font-semibold text-gray-800 mt-0.5">{{ supplier.supplier_type || '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Business Type</div>
                        <div class="text-gray-800 mt-0.5">{{ supplier.bussines_type || '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Category</div>
                        <div class="text-gray-800 mt-0.5">{{ supplier.company_category || '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Business Field</div>
                        <div class="text-gray-800 mt-0.5">{{ supplier.bussines_field || '-' }}</div>
                    </div>
                </div>
            </div>

            <!-- Card 2: Commercial & Contact Terms -->
            <div class="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div class="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-emerald-600 font-bold text-sm">
                    <CreditCard class="w-4 h-4" />
                    <span>Commercial & Contacts</span>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Tax ID / NPWP</div>
                        <div class="font-mono font-bold text-gray-800 mt-0.5">{{ supplier.tax_id || '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Payment Terms</div>
                        <div class="font-semibold text-gray-800 mt-0.5">{{ supplier.payment_term || '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Official Email</div>
                        <div class="text-gray-800 mt-0.5 break-all">{{ supplier.email || '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Official Phone</div>
                        <div class="text-gray-800 mt-0.5">{{ supplier.phone || '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Default Lead Time</div>
                        <div class="text-gray-800 mt-0.5 font-semibold">{{ supplier.lead_time_days !== null ? `${supplier.lead_time_days} Days` : '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">System Status</div>
                        <div class="mt-0.5 font-semibold" :class="supplier.is_active ? 'text-emerald-600' : 'text-gray-400'">
                            {{ supplier.is_active ? 'Active' : 'Inactive' }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card 3: Address & Location -->
            <div class="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div class="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-amber-600 font-bold text-sm">
                    <MapPin class="w-4 h-4" />
                    <span>Registered Address</span>
                </div>

                <div class="space-y-3 text-sm">
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Street Address</div>
                        <div class="text-gray-800 mt-0.5">{{ supplier.address || '-' }}</div>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <div class="text-xs text-gray-400 font-medium">City</div>
                            <div class="text-gray-800 mt-0.5">{{ supplier.city || '-' }}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400 font-medium">Region / State</div>
                            <div class="text-gray-800 mt-0.5">{{ supplier.region || '-' }}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400 font-medium">Postal Code</div>
                            <div class="text-gray-800 mt-0.5 font-mono">{{ supplier.postal_code || '-' }}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-400 font-medium">Country</div>
                            <div class="text-gray-800 mt-0.5">{{ supplier.country || '-' }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card 4: Governance & Approval -->
            <div class="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div class="flex items-center gap-2.5 pb-3 border-b border-gray-100 text-purple-600 font-bold text-sm">
                    <ShieldCheck class="w-4 h-4" />
                    <span>Approval & Audit Trail</span>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Approval Status</div>
                        <div class="font-bold capitalize mt-0.5" :class="supplier.approval_status === 'approved' ? 'text-emerald-600' : (supplier.approval_status === 'rejected' ? 'text-rose-600' : 'text-amber-600')">
                            {{ supplier.approval_status || 'Pending' }}
                        </div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Approved At</div>
                        <div class="text-gray-800 mt-0.5">{{ supplier.approved_at ? new Date(supplier.approved_at).toLocaleDateString('id-ID') : '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Registered Date</div>
                        <div class="text-gray-800 mt-0.5">{{ supplier.created_at ? new Date(supplier.created_at).toLocaleDateString('id-ID') : '-' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-medium">Last Updated</div>
                        <div class="text-gray-800 mt-0.5">{{ supplier.updated_at ? new Date(supplier.updated_at).toLocaleDateString('id-ID') : '-' }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit Modal -->
        <Teleport to="body">
            <div v-if="showEditModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/40 transition-opacity" @click="closeEditModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Edit class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">Edit Supplier Profile</h3>
                        </div>
                        <button @click="closeEditModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 space-y-5 overflow-y-auto">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="sm:col-span-2">
                                <BaseInput 
                                    v-model="editForm.name"
                                    label="Supplier Name"
                                    :error="errors.name?.[0] || errors.name"
                                    required
                                />
                            </div>

                            <div>
                                <BaseInput 
                                    v-model="editForm.supplier_code"
                                    label="Supplier Code"
                                    :error="errors.supplier_code?.[0] || errors.supplier_code"
                                />
                            </div>

                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1.5">Supplier Type</label>
                                <select
                                    v-model="editForm.supplier_type"
                                    class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-700"
                                >
                                    <option v-for="t in supplierTypes" :key="t.value" :value="t.value">
                                        {{ t.label }}
                                    </option>
                                </select>
                            </div>

                            <div>
                                <BaseInput 
                                    v-model="editForm.email"
                                    type="email"
                                    label="Email"
                                    :error="errors.email?.[0] || errors.email"
                                />
                            </div>

                            <div>
                                <BaseInput 
                                    v-model="editForm.phone"
                                    label="Phone"
                                    :error="errors.phone?.[0] || errors.phone"
                                />
                            </div>

                            <div>
                                <BaseInput 
                                    v-model="editForm.tax_id"
                                    label="Tax ID / NPWP"
                                />
                            </div>

                            <div>
                                <BaseInput 
                                    v-model="editForm.payment_term"
                                    label="Payment Term"
                                />
                            </div>

                            <div>
                                <BaseInput 
                                    v-model.number="editForm.lead_time_days"
                                    type="number"
                                    label="Default Lead Time (Days)"
                                />
                            </div>

                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1.5">Status Aktif</label>
                                <div class="pt-2">
                                    <ToggleSwitch v-model="editForm.is_active" />
                                </div>
                            </div>

                            <div class="sm:col-span-2">
                                <BaseInput 
                                    v-model="editForm.address"
                                    label="Address"
                                />
                            </div>

                            <div>
                                <BaseInput 
                                    v-model="editForm.city"
                                    label="City"
                                />
                            </div>

                            <div>
                                <BaseInput 
                                    v-model="editForm.region"
                                    label="Region"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeEditModal" :disabled="isSubmitting">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="handleUpdate" :disabled="isSubmitting">
                            <Check class="w-4 h-4" />
                            {{ isSubmitting ? 'Updating...' : 'Save Changes' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
