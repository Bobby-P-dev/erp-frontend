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
    MapPin,
    AlertCircle
} from '@lucide/vue'
import { showSupplier } from '../../../../services/supplierServices.js'
import { showError, showSuccess, showLoading } from '../../../../utils/swal.js'
import BaseBreadcrumb from '../../../../components/ui/BaseBreadcrumb.vue'
import StatusBadge from '../../../../components/ui/StatusBadge.vue'
import ApprovalBadge from '../../../../components/approval/ApprovalBadge.vue'
import ApprovalRevisionBanner from '../../../../components/approval/ApprovalRevisionBanner.vue'
import { resubmitApprovalRequest, getApprovalTrackerByDocument } from '../../../../services/approvalServices.js'

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

const handleResubmitApproval = async () => {
    try {
        showLoading('Mengirim ulang persetujuan...', 'Mohon tunggu sebentar.')
        let trackerId = supplier.value?.approval_tracker_id || supplier.value?.approval_request_id
        if (!trackerId && supplier.value?.id) {
            try {
                const trackerRes = await getApprovalTrackerByDocument('supplier', supplier.value.id)
                trackerId = trackerRes?.data?.request?.id || trackerRes?.data?.id
            } catch (resolveErr) {
                console.warn('Could not resolve tracker id by document, falling back to supplier id', resolveErr)
            }
        }
        await resubmitApprovalRequest(trackerId || supplier.value?.id, {
            notes: 'Revisi data supplier telah dilengkapi.'
        })
        showSuccess('Berhasil!', 'Permohonan persetujuan berhasil dikirim ulang.')
        fetchSupplier()
    } catch (err) {
        console.error('Failed to resubmit approval:', err)
        showError('Gagal!', err.response?.data?.message || 'Terjadi kesalahan saat mengirim ulang persetujuan.')
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- 1. Breadcrumb -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Master Data' },
                { label: 'Purchasing' },
                { label: 'Suppliers', to: { name: 'admin.master.supplier' } },
                { label: supplier?.name ? `${supplier.name} (${supplier.supplier_code})` : (supplier?.supplier_code || 'Detail Supplier') }
            ]" 
        />

        <!-- Back button & Header -->
        <div class="flex items-center gap-3">
            <button 
                @click="goBack" 
                class="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white border border-gray-200 transition-colors shadow-sm cursor-pointer"
                title="Back to Suppliers"
            >
                <ArrowLeft class="w-5 h-5" />
            </button>
            <div>
                <h2 class="text-xl font-bold text-gray-900">Supplier Master File</h2>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center gap-3 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div class="text-sm font-medium text-slate-500">Memuat profil supplier...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="fetchError || !supplier" class="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-2xs text-center">
            <AlertCircle class="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 class="text-lg font-bold text-slate-900">{{ isForbidden ? 'Akses Ditolak (403 Forbidden)' : 'Supplier Not Found' }}</h3>
            <p class="text-sm text-slate-500 mt-1">{{ fetchError || 'Data supplier tidak dapat ditemukan pada sistem.' }}</p>
            <button 
                @click="goBack" 
                class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
            >
                Kembali ke Daftar Supplier
            </button>
        </div>

        <!-- Header Card -->
        <div v-else class="space-y-6">
            <div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="flex items-start gap-4">
                        <div class="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                            <Building2 class="w-8 h-8" />
                        </div>

                        <div class="space-y-1.5">
                            <div class="flex flex-wrap items-center gap-2.5">
                                <h1 class="text-2xl font-bold text-slate-900">{{ supplier.name }}</h1>
                                <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                                    {{ supplier.supplier_code }}
                                </span>
                            </div>

                            <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                <div v-if="supplier.company?.name" class="flex items-center gap-1.5 text-blue-600 font-medium">
                                    <Building2 class="w-3.5 h-3.5" />
                                    <span>{{ supplier.company.name }}</span>
                                </div>
                                <div v-if="supplier.supplier_type" class="text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                    {{ supplier.supplier_type }}
                                </div>
                                <div v-if="supplier.city" class="flex items-center gap-1 text-slate-400">
                                    <MapPin class="w-3.5 h-3.5" />
                                    <span>{{ supplier.city }}, {{ supplier.country || 'Indonesia' }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Status Badges in Header -->
                    <div class="flex flex-wrap items-center md:flex-col md:items-end gap-2.5 shrink-0">
                        <div class="flex items-center gap-2">
                            <ApprovalBadge :status="supplier.approval_status" size="sm" />
                            <StatusBadge :isActive="Boolean(supplier.is_active)" />
                        </div>

                        <div v-if="supplier.tax_id" class="text-xs text-slate-400 font-mono">
                            NPWP: {{ supplier.tax_id }}
                        </div>
                    </div>
                </div>

                <!-- Approval Revision Banner (if revision requested) -->
                <div v-if="supplier.approval_status === 'revision_requested'" class="mt-6">
                    <ApprovalRevisionBanner
                        :revisionNotes="supplier.revision_notes || supplier.approval_revision_notes || 'Mohon perbaiki data kontak dan kelengkapan dokumen NPWP.'"
                        :requestedBy="supplier.approval_requested_by || 'Approver'"
                        :requestedAt="supplier.approval_requested_at"
                        @edit="router.push({ name: 'admin.master.supplier.general', params: { id: supplier.id } })"
                        @resubmit="handleResubmitApproval"
                    />
                </div>

                <!-- Navigation Tabs -->
                <div class="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <RouterLink
                        v-for="tab in tabs"
                        :key="tab.name"
                        :to="{ name: tab.routeName, params: { id: supplier.id } }"
                        class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                        :class="[
                            isTabActive(tab.routeName)
                                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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
