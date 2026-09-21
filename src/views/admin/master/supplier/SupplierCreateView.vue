<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
    ArrowLeft, 
    Building2, 
    Check, 
    X,
    Briefcase,
    MapPin,
    CreditCard,
    ShieldCheck
} from '@lucide/vue'
import { createSupplier } from '../../../../services/supplierServices.js'
import { searchCompanies } from '../../../../services/companyServices.js'
import { showLoading, showSuccess, showError } from '../../../../utils/swal.js'
import PageHeader from '../../../../components/ui/PageHeader.vue'
import BaseInput from '../../../../components/ui/BaseInput.vue'
import BaseButton from '../../../../components/ui/BaseButton.vue'
import ToggleSwitch from '../../../../components/ui/ToggleSwitch.vue'
import SearchableSelect from '../../../../components/ui/SearchableSelect.vue'

const router = useRouter()

const isSubmitting = ref(false)
const companiesList = ref([])
const isLoadingCompanies = ref(false)

const form = ref({
    name: '',
    supplier_code: '',
    company_id: '',
    supplier_type: 'Manufacturer',
    bussines_type: '',
    company_category: '',
    bussines_field: '',
    email: '',
    phone: '',
    tax_id: '',
    payment_term: 'Net 30',
    lead_time_days: 7,
    address: '',
    city: '',
    region: '',
    postal_code: '',
    country: 'Indonesia',
    is_active: true
})

const errors = ref({})

const supplierTypes = [
    { value: 'Manufacturer', label: 'Manufacturer' },
    { value: 'Distributor', label: 'Distributor' },
    { value: 'Wholesaler', label: 'Wholesaler' },
    { value: 'Service Provider & Fabricator', label: 'Service Provider & Fabricator' },
    { value: 'Other', label: 'Other' }
]

const companyOptions = computed(() => {
    if (!companiesList.value || !Array.isArray(companiesList.value)) return []
    return companiesList.value.map(c => ({
        value: c.id,
        label: `${c.code} - ${c.name}`
    }))
})

const fetchCompaniesList = async (query = '') => {
    try {
        isLoadingCompanies.value = true
        const response = await searchCompanies(query)
        companiesList.value = response.data || []
    } catch (error) {
        console.error('Failed to load companies', error)
    } finally {
        isLoadingCompanies.value = false
    }
}

onMounted(() => {
    fetchCompaniesList()
})

const goBack = () => {
    router.push({ name: 'admin.master.supplier' })
}

const handleSubmit = async () => {
    errors.value = {}

    if (!form.value.name.trim()) {
        errors.value.name = 'Supplier name is required.'
        showError('Validasi Gagal', 'Mohon isi nama supplier.')
        return
    }

    try {
        isSubmitting.value = true
        showLoading('Menyimpan Supplier...', 'Mohon tunggu sebentar.')

        const payload = {
            name: form.value.name.trim(),
            supplier_code: form.value.supplier_code ? form.value.supplier_code.trim() : null,
            company_id: form.value.company_id ? Number(form.value.company_id) : null,
            supplier_type: form.value.supplier_type || null,
            bussines_type: form.value.bussines_type ? form.value.bussines_type.trim() : null,
            company_category: form.value.company_category ? form.value.company_category.trim() : null,
            bussines_field: form.value.bussines_field ? form.value.bussines_field.trim() : null,
            email: form.value.email ? form.value.email.trim() : null,
            phone: form.value.phone ? form.value.phone.trim() : null,
            tax_id: form.value.tax_id ? form.value.tax_id.trim() : null,
            payment_term: form.value.payment_term ? form.value.payment_term.trim() : null,
            lead_time_days: form.value.lead_time_days !== '' ? Number(form.value.lead_time_days) : null,
            address: form.value.address ? form.value.address.trim() : null,
            city: form.value.city ? form.value.city.trim() : null,
            region: form.value.region ? form.value.region.trim() : null,
            postal_code: form.value.postal_code ? form.value.postal_code.trim() : null,
            country: form.value.country ? form.value.country.trim() : 'Indonesia',
            is_active: Boolean(form.value.is_active)
        }

        const response = await createSupplier(payload)
        const createdSupplier = response.data

        showSuccess('Berhasil!', 'Supplier berhasil didaftarkan. Anda dialihkan ke halaman Supplier Detail.')

        // Redirect directly to the created supplier detail
        router.push({
            name: 'admin.master.supplier.general',
            params: { id: createdSupplier.id }
        })
    } catch (error) {
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors
            showError('Validasi Gagal', 'Silakan periksa kembali field formulir Anda.')
        } else {
            const errorMsg = error.response?.data?.message || 'Terjadi kesalahan pada sistem saat menyimpan supplier.'
            showError('Gagal Menyimpan!', errorMsg, error)
        }
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-5xl mx-auto">
        <div class="flex items-center gap-3">
            <button 
                @click="goBack" 
                class="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white border border-gray-200 transition-colors shadow-sm"
            >
                <ArrowLeft class="w-5 h-5" />
            </button>
            <PageHeader 
                title="Create Supplier"
                description="Register a new vendor or business partner profile"
            >
                <template #icon>
                    <Building2 class="w-7 h-7" />
                </template>
            </PageHeader>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Section 1: General Info -->
            <div class="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Briefcase class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-gray-900">General Information</h3>
                        <p class="text-xs text-gray-400">Basic identification and company categorization</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div class="col-span-1 sm:col-span-2">
                        <BaseInput 
                            v-model="form.name"
                            label="Supplier Name"
                            placeholder="e.g. PT Krakatau Steel Tbk"
                            :error="errors.name?.[0] || errors.name"
                            required
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.supplier_code"
                            label="Supplier Code"
                            placeholder="e.g. SUP-0001 (Leave empty for auto-generated)"
                            :error="errors.supplier_code?.[0] || errors.supplier_code"
                        />
                    </div>

                    <div>
                        <SearchableSelect 
                            v-model="form.company_id"
                            label="Associated Company"
                            :options="companyOptions"
                            placeholder="Select enterprise company"
                            :loading="isLoadingCompanies"
                            @search="fetchCompaniesList"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1.5">Supplier Type</label>
                        <select
                            v-model="form.supplier_type"
                            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-700"
                        >
                            <option v-for="t in supplierTypes" :key="t.value" :value="t.value">
                                {{ t.label }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.bussines_type"
                            label="Business Type"
                            placeholder="e.g. B2B, Distributor, Agent"
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.company_category"
                            label="Company Category"
                            placeholder="e.g. Raw Material, Fastener, Steel"
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.bussines_field"
                            label="Business Field"
                            placeholder="e.g. Metal Fabrication, Chemical"
                        />
                    </div>
                </div>
            </div>

            <!-- Section 2: Contact & Tax Info -->
            <div class="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CreditCard class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-gray-900">Contact & Commercial Terms</h3>
                        <p class="text-xs text-gray-400">Tax ID, payment terms, and direct company contacts</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <BaseInput 
                            v-model="form.email"
                            type="email"
                            label="Official Email"
                            placeholder="sales@supplier.co.id"
                            :error="errors.email?.[0] || errors.email"
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.phone"
                            label="Official Phone"
                            placeholder="+62 21 5000 1234"
                            :error="errors.phone?.[0] || errors.phone"
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.tax_id"
                            label="Tax Identification (NPWP / Tax ID)"
                            placeholder="e.g. 01.234.567.8-012.000"
                            :error="errors.tax_id?.[0] || errors.tax_id"
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.payment_term"
                            label="Payment Terms"
                            placeholder="e.g. Net 30, COD, Net 60"
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model.number="form.lead_time_days"
                            type="number"
                            label="Default Lead Time (Days)"
                            placeholder="e.g. 7"
                            min="0"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1.5">Supplier Status</label>
                        <div class="pt-2">
                            <ToggleSwitch v-model="form.is_active" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section 3: Address Info -->
            <div class="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div class="p-2 bg-amber-50 text-amber-600 rounded-xl">
                        <MapPin class="w-5 h-5" />
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-gray-900">Address & Location</h3>
                        <p class="text-xs text-gray-400">Headquarters and shipping origin location</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div class="col-span-1 sm:col-span-2">
                        <BaseInput 
                            v-model="form.address"
                            label="Street Address"
                            placeholder="Full factory or office address..."
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.city"
                            label="City"
                            placeholder="e.g. Cilegon, Bekasi"
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.region"
                            label="Region / Province"
                            placeholder="e.g. Banten, Jawa Barat"
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.postal_code"
                            label="Postal Code"
                            placeholder="e.g. 42435"
                        />
                    </div>

                    <div>
                        <BaseInput 
                            v-model="form.country"
                            label="Country"
                            placeholder="e.g. Indonesia"
                        />
                    </div>
                </div>
            </div>

            <!-- Actions Bar -->
            <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-end gap-3 sticky bottom-4 z-10">
                <BaseButton variant="secondary" type="button" @click="goBack" :disabled="isSubmitting">
                    Cancel
                </BaseButton>
                <BaseButton type="submit" :disabled="isSubmitting">
                    <Check class="w-4 h-4" />
                    {{ isSubmitting ? 'Creating...' : 'Save & Proceed to Detail' }}
                </BaseButton>
            </div>
        </form>
    </div>
</template>
