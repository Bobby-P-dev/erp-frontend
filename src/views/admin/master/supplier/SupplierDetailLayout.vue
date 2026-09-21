<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router'
import { 
    Building2, 
    ArrowLeft, 
    Users, 
    CreditCard, 
    FileText, 
    Package, 
    Info,
    CheckCircle,
    Clock,
    XCircle,
    Calendar,
    Mail,
    Phone,
    MapPin,
    AlertCircle
} from '@lucide/vue'
import { showSupplier } from '../../../../services/supplierServices.js'
import { showError } from '../../../../utils/swal.js'
import StatusBadge from '../../../../components/ui/StatusBadge.vue'

const route = useRoute()
const router = useRouter()

const supplierId = computed(() => route.params.id)
const supplier = ref(null)
const isLoading = ref(true)
const fetchError = ref(null)

const tabs = [
    { name: 'General', routeName: 'admin.master.supplier.general', icon: Info },
    { name: 'Contacts', routeName: 'admin.master.supplier.contacts', icon: Users },
    { name: 'Bank Accounts', routeName: 'admin.master.supplier.bank-accounts', icon: CreditCard },
    { name: 'Documents', routeName: 'admin.master.supplier.documents', icon: FileText },
    { name: 'Items', routeName: 'admin.master.supplier.items', icon: Package }
]

const isTabActive = (tabRouteName) => {
    return route.name === tabRouteName || (route.name === 'admin.master.supplier.detail' && tabRouteName === 'admin.master.supplier.general')
}

const isForbidden = ref(false)

const fetchSupplier = async () => {
    if (!supplierId.value) return
    try {
        isLoading.value = true
        fetchError.value = null
        isForbidden.value = false
        const response = await showSupplier(supplierId.value)
        supplier.value = response.data
    } catch (error) {
        if (error.response?.status === 403) {
            isForbidden.value = true
            fetchError.value = 'Anda tidak memiliki hak akses untuk melihat data supplier ini.'
        } else {
            fetchError.value = error.response?.data?.message || 'Data supplier tidak dapat ditemukan pada sistem.'
        }
        showError(isForbidden.value ? 'Akses Ditolak' : 'Error', fetchError.value, error)
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    fetchSupplier()
})

watch(() => route.params.id, (newId) => {
    if (newId && newId !== supplier.value?.id) {
        fetchSupplier()
    }
})

const goBack = () => {
    router.push({ name: 'admin.master.supplier' })
}

const getApprovalBadge = (status) => {
    switch (status) {
        case 'approved':
            return { label: 'Approved', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
        case 'rejected':
            return { label: 'Rejected', class: 'bg-rose-50 text-rose-700 border-rose-200' }
        default:
            return { label: 'Pending Approval', class: 'bg-amber-50 text-amber-700 border-amber-200' }
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- Back button & Breadcrumb -->
        <div class="flex items-center gap-3">
            <button 
                @click="goBack" 
                class="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white border border-gray-200 transition-colors shadow-sm"
                title="Back to Suppliers"
            >
                <ArrowLeft class="w-5 h-5" />
            </button>
            <div>
                <div class="flex items-center gap-2 text-xs text-gray-400 font-medium">
                    <RouterLink :to="{ name: 'admin.master.supplier' }" class="hover:text-indigo-600 transition-colors">
                        Suppliers
                    </RouterLink>
                    <span>/</span>
                    <span class="text-gray-600 font-semibold">{{ supplier?.supplier_code || 'Supplier Detail' }}</span>
                </div>
                <h2 class="text-xl font-bold text-gray-900 mt-0.5">Supplier Master File</h2>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <div class="text-sm font-medium text-gray-500">Memuat profil supplier...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="fetchError || !supplier" class="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm text-center">
            <AlertCircle class="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 class="text-lg font-bold text-gray-900">{{ isForbidden ? 'Akses Ditolak (403 Forbidden)' : 'Supplier Not Found' }}</h3>
            <p class="text-sm text-gray-500 mt-1">{{ fetchError || 'Data supplier tidak dapat ditemukan pada sistem.' }}</p>
            <button 
                @click="goBack" 
                class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
                Kembali ke Daftar Supplier
            </button>
        </div>

        <!-- Header Card -->
        <div v-else class="space-y-6">
            <div class="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="flex items-start gap-4">
                        <div class="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
                            <Building2 class="w-8 h-8" />
                        </div>

                        <div class="space-y-1.5">
                            <div class="flex flex-wrap items-center gap-2.5">
                                <h1 class="text-2xl font-bold text-gray-900">{{ supplier.name }}</h1>
                                <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 font-mono">
                                    {{ supplier.supplier_code }}
                                </span>
                            </div>

                            <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                <div v-if="supplier.company?.name" class="flex items-center gap-1.5 text-indigo-600 font-medium">
                                    <Building2 class="w-3.5 h-3.5" />
                                    <span>{{ supplier.company.name }}</span>
                                </div>
                                <div v-if="supplier.supplier_type" class="text-gray-600 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                    {{ supplier.supplier_type }}
                                </div>
                                <div v-if="supplier.city" class="flex items-center gap-1 text-gray-400">
                                    <MapPin class="w-3.5 h-3.5" />
                                    <span>{{ supplier.city }}, {{ supplier.country || 'Indonesia' }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Status Badges in Header -->
                    <div class="flex flex-wrap items-center md:flex-col md:items-end gap-2.5 shrink-0">
                        <div class="flex items-center gap-2">
                            <span 
                                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
                                :class="getApprovalBadge(supplier.approval_status).class"
                            >
                                {{ getApprovalBadge(supplier.approval_status).label }}
                            </span>
                            <StatusBadge :isActive="Boolean(supplier.is_active)" />
                        </div>

                        <div v-if="supplier.tax_id" class="text-xs text-gray-400 font-mono">
                            NPWP: {{ supplier.tax_id }}
                        </div>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <div class="mt-8 pt-4 border-t border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <RouterLink
                        v-for="tab in tabs"
                        :key="tab.name"
                        :to="{ name: tab.routeName, params: { id: supplier.id } }"
                        class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                        :class="[
                            isTabActive(tab.routeName)
                                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                        ]"
                    >
                        <component :is="tab.icon" class="w-4 h-4" />
                        <span>{{ tab.name }}</span>
                    </RouterLink>
                </div>
            </div>

            <!-- Tab Content (Child Route View) -->
            <div class="animate-in fade-in duration-300">
                <RouterView 
                    :supplier="supplier" 
                    @supplier-updated="fetchSupplier"
                />
            </div>
        </div>
    </div>
</template>
