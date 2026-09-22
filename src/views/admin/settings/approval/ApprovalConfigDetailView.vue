<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../../../../components/ui/PageHeader.vue'
import BaseButton from '../../../../components/ui/BaseButton.vue'
import ApprovalStepper from '../../../../components/approval/ApprovalStepper.vue'
import {
    showApprovalConfiguration,
    deleteApprovalConfiguration,
    ApproverScope,
    ApprovalMode
} from '../../../../services/approvalServices'
import { formatCurrency } from '../../../../utils/stringUtils'
import { showConfirm, showLoading, showSuccess, showError } from '../../../../utils/swal'
import {
    ArrowLeft,
    Edit3,
    Copy,
    Trash2,
    Building2,
    FileText,
    Layers,
    Clock,
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
    Coins
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const configId = route.params.id

const isLoading = ref(true)
const errorMessage = ref('')
const config = ref(null)
const previewSteps = ref([])

const fetchDetail = async () => {
    isLoading.value = true
    errorMessage.value = ''
    try {
        const response = await showApprovalConfiguration(configId)
        config.value = response.data || response

        // Format levels for ApprovalStepper preview
        if (config.value?.levels && Array.isArray(config.value.levels)) {
            previewSteps.value = config.value.levels.map((lvl) => ({
                id: lvl.id || lvl.step_order,
                step_order: lvl.step_order,
                name: lvl.step_name || `Tingkat ${lvl.step_order}`,
                status: 'pending',
                approver_scope: lvl.approver_scope,
                approver_name: getScopeDisplay(lvl),
                approval_mode: lvl.approval_mode || ApprovalMode.ANY,
                sla_hours: lvl.sla_hours,
                can_be_skipped: lvl.can_be_skipped
            }))
        } else {
            previewSteps.value = []
        }
    } catch (err) {
        console.error('Failed to load approval configuration detail:', err)
        errorMessage.value = err.response?.data?.message || 'Gagal memuat data konfigurasi approval.'
    } finally {
        isLoading.value = false
    }
}

const getScopeDisplay = (lvl) => {
    switch (lvl.approver_scope) {
        case ApproverScope.DEPARTMENT_HEAD:
        case 'department_head':
            return 'Department Head (Atasan Langsung Divisi)'
        case ApproverScope.ROLE_ONLY:
        case 'role_only':
            return lvl.role?.name ? `Role: ${lvl.role.name}` : (lvl.role_id ? `Role #${lvl.role_id}` : 'Role Khusus')
        case ApproverScope.ROLE_AND_DIVISION:
        case 'role_and_division':
            return lvl.role?.name ? `Role ${lvl.role.name} dalam Divisi` : (lvl.role_id ? `Role #${lvl.role_id} dalam Divisi` : 'Role dalam Divisi')
        case ApproverScope.JOB_LEVEL_AND_DIVISION:
        case 'job_level_and_division':
            return lvl.job_level?.name ? `Level ${lvl.job_level.name} dalam Divisi` : (lvl.job_level_id ? `Job Level #${lvl.job_level_id}` : 'Job Level dalam Divisi')
        case ApproverScope.POSITION_AND_DIVISION:
        case 'position_and_division':
            return lvl.position?.name
                ? (lvl.division?.name ? `Posisi ${lvl.position.name} (${lvl.division.name})` : `Posisi ${lvl.position.name} dalam Divisi`)
                : (lvl.position_id ? `Posisi #${lvl.position_id}` : 'Posisi Jabatan dalam Divisi')
        case ApproverScope.SPECIFIC_USER:
        case 'specific_user':
            return lvl.specific_user?.name || lvl.user?.name || (lvl.specific_user_id ? `User #${lvl.specific_user_id}` : 'User Tertentu')
        default:
            return String(lvl.approver_scope || '-').replace(/_/g, ' ')
    }
}

const getScopeBadgeClass = (scope) => {
    switch (scope) {
        case ApproverScope.DEPARTMENT_HEAD:
        case 'department_head':
            return 'bg-indigo-50 text-indigo-700 border-indigo-200'
        case ApproverScope.ROLE_ONLY:
        case 'role_only':
            return 'bg-purple-50 text-purple-700 border-purple-200'
        case ApproverScope.ROLE_AND_DIVISION:
        case 'role_and_division':
            return 'bg-blue-50 text-blue-700 border-blue-200'
        case ApproverScope.JOB_LEVEL_AND_DIVISION:
        case 'job_level_and_division':
            return 'bg-teal-50 text-teal-700 border-teal-200'
        case ApproverScope.POSITION_AND_DIVISION:
        case 'position_and_division':
            return 'bg-amber-50 text-amber-700 border-amber-200'
        case ApproverScope.SPECIFIC_USER:
        case 'specific_user':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200'
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200'
    }
}

const handleDuplicate = () => {
    router.push({
        name: 'admin.settings.approval.create',
        query: { duplicate_from: configId }
    })
}

const handleDelete = async () => {
    const confirmed = await showConfirm(
        'Hapus Konfigurasi Approval?',
        `Apakah Anda yakin ingin menghapus konfigurasi "${config.value?.name}"? Dokumen yang sedang berjalan dapat terpengaruh.`
    )
    if (!confirmed) return

    try {
        showLoading('Menghapus konfigurasi...')
        await deleteApprovalConfiguration(configId)
        showSuccess('Berhasil!', 'Konfigurasi approval berhasil dihapus.')
        router.push({ name: 'admin.settings.approval' })
    } catch (err) {
        console.error('Delete configuration failed:', err)
        showError('Gagal!', err.response?.data?.message || 'Terjadi kesalahan saat menghapus konfigurasi.')
    }
}

const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

onMounted(() => {
    fetchDetail()
})
</script>

<template>
    <div class="space-y-6">
        <!-- Back Navigation & Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-3">
                <button
                    type="button"
                    @click="router.push({ name: 'admin.settings.approval' })"
                    class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 shadow-xs"
                    title="Kembali ke Daftar Konfigurasi"
                >
                    <ArrowLeft class="w-5 h-5" />
                </button>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                            {{ config?.code || '...' }}
                        </span>
                        <span
                            :class="[
                                'text-xs font-semibold px-2 py-0.5 rounded-full border',
                                config?.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                            ]"
                        >
                            {{ config?.is_active ? 'Aktif' : 'Nonaktif' }}
                        </span>
                    </div>
                    <h1 class="text-xl font-bold text-gray-900 mt-1">
                        {{ config?.name || 'Detail Konfigurasi Approval' }}
                    </h1>
                </div>
            </div>

            <div class="flex items-center gap-2" v-if="config">
                <BaseButton
                    variant="outline"
                    size="sm"
                    @click="handleDuplicate"
                    title="Duplikasi konfigurasi ini sebagai aturan baru"
                >
                    <Copy class="w-4 h-4 mr-1.5" />
                    Duplikasi
                </BaseButton>

                <BaseButton
                    variant="outline"
                    size="sm"
                    @click="router.push({ name: 'admin.settings.approval.edit', params: { id: configId } })"
                >
                    <Edit3 class="w-4 h-4 mr-1.5 text-indigo-600" />
                    Edit
                </BaseButton>

                <BaseButton
                    variant="danger"
                    size="sm"
                    @click="handleDelete"
                >
                    <Trash2 class="w-4 h-4 mr-1.5" />
                    Hapus
                </BaseButton>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-sm text-gray-500">Memuat detail konfigurasi approval...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="errorMessage" class="p-8 text-center bg-red-50/50 rounded-2xl border border-red-200 shadow-xs space-y-4">
            <AlertCircle class="w-10 h-10 text-red-500 mx-auto" />
            <p class="text-sm font-medium text-red-700">{{ errorMessage }}</p>
            <BaseButton variant="outline" size="sm" @click="fetchDetail">
                Coba Lagi
            </BaseButton>
        </div>

        <!-- Detail Content -->
        <div v-else class="space-y-6">
            <!-- Basic Info Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <!-- Info Card 1: Core Target -->
                <div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
                    <div class="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <FileText class="w-4 h-4 text-indigo-600" />
                        Target Dokumen
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 font-medium">Tipe Dokumen</p>
                        <p class="text-base font-semibold text-gray-900 mt-0.5">
                            {{ config?.document_type_label || config?.document_type }}
                        </p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 font-medium">Entitas Perusahaan</p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <Building2 class="w-4 h-4 text-gray-400 shrink-0" />
                            <p class="text-sm font-semibold text-gray-800">
                                {{ config?.company?.name || 'Semua Perusahaan (Global)' }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Info Card 2: Threshold & Limits -->
                <div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
                    <div class="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <Coins class="w-4 h-4 text-emerald-600" />
                        Batasan Nominal
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 font-medium">Cakupan Nominal Transaksi</p>
                        <p class="text-base font-semibold text-gray-900 mt-0.5">
                            <span v-if="config?.applies_to_all_amounts" class="inline-flex items-center gap-1 text-emerald-700">
                                <CheckCircle2 class="w-4 h-4" /> Berlaku Semua Nominal
                            </span>
                            <span v-else class="font-mono text-sm">
                                {{ formatCurrency(config?.min_amount || 0) }} s/d {{ config?.max_amount ? formatCurrency(config.max_amount) : 'Tak Terhingga' }}
                            </span>
                        </p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 font-medium">Jumlah Tingkatan</p>
                        <p class="text-sm font-bold text-indigo-700 mt-0.5">
                            {{ config?.levels?.length || 0 }} Tingkatan Approval
                        </p>
                    </div>
                </div>

                <!-- Info Card 3: Meta & Description -->
                <div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
                    <div class="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <ShieldCheck class="w-4 h-4 text-purple-600" />
                        Keterangan & Metadata
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 font-medium">Deskripsi</p>
                        <p class="text-xs text-gray-700 mt-0.5 leading-relaxed">
                            {{ config?.description || 'Tidak ada deskripsi tambahan.' }}
                        </p>
                    </div>
                    <div class="pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
                        <span>Dibuat: {{ formatDate(config?.created_at) }}</span>
                    </div>
                </div>
            </div>

            <!-- Workflow Visual Preview -->
            <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Layers class="w-5 h-5 text-indigo-600" />
                            Visualisasi Alur Approval (Preview)
                        </h2>
                        <p class="text-xs text-gray-500 mt-0.5">
                            Berikut alur persetujuan bertingkat yang akan dieksekusi secara sekuensial untuk dokumen terkait.
                        </p>
                    </div>
                    <span class="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                        {{ previewSteps.length }} Langkah
                    </span>
                </div>

                <div v-if="previewSteps.length > 0" class="pt-3 pb-2 overflow-x-auto">
                    <ApprovalStepper
                        :levels="previewSteps"
                        orientation="horizontal"
                    />
                </div>
                <div v-else class="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p class="text-sm text-gray-500">Belum ada tingkatan approval yang dikonfigurasi.</p>
                </div>
            </div>

            <!-- Detailed Tier Cards Table -->
            <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
                <h2 class="text-base font-bold text-gray-900">
                    Daftar Rincian Tingkatan (Tier Details)
                </h2>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <tr>
                                <th class="py-3 px-4 w-16 text-center">Urutan</th>
                                <th class="py-3 px-4">Nama Langkah</th>
                                <th class="py-3 px-4">Lingkup (Scope)</th>
                                <th class="py-3 px-4">Penerima Tugas (Assignee)</th>
                                <th class="py-3 px-4">Mode</th>
                                <th class="py-3 px-4">SLA (Batas Waktu)</th>
                                <th class="py-3 px-4 text-center">Boleh Dilewati</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <tr
                                v-for="(lvl, idx) in config?.levels || []"
                                :key="lvl.id || idx"
                                class="hover:bg-gray-50/70 transition-colors"
                            >
                                <td class="py-3.5 px-4 text-center font-bold text-gray-700">
                                    <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-mono font-bold">
                                        {{ lvl.step_order }}
                                    </span>
                                </td>
                                <td class="py-3.5 px-4">
                                    <p class="font-semibold text-gray-900">{{ lvl.step_name }}</p>
                                    <p v-if="lvl.description" class="text-xs text-gray-400 mt-0.5">{{ lvl.description }}</p>
                                </td>
                                <td class="py-3.5 px-4">
                                    <span
                                        :class="[
                                            'px-2.5 py-0.5 text-xs font-medium rounded-full border capitalize',
                                            getScopeBadgeClass(lvl.approver_scope)
                                        ]"
                                    >
                                        {{ lvl.approver_scope.replace('_', ' ') }}
                                    </span>
                                </td>
                                <td class="py-3.5 px-4 font-medium text-gray-800">
                                    {{ getScopeDisplay(lvl) }}
                                </td>
                                <td class="py-3.5 px-4">
                                    <span
                                        :class="[
                                            'px-2 py-0.5 text-[11px] font-bold rounded-md uppercase tracking-wider',
                                            lvl.approval_mode === ApprovalMode.ALL
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-blue-100 text-blue-700'
                                        ]"
                                    >
                                        {{ lvl.approval_mode === ApprovalMode.ALL ? 'ALL (Semua)' : 'ANY (Salah Satu)' }}
                                    </span>
                                </td>
                                <td class="py-3.5 px-4 text-gray-600">
                                    <span v-if="lvl.sla_hours" class="inline-flex items-center gap-1 font-mono text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        <Clock class="w-3 h-3" />
                                        {{ lvl.sla_hours }} Jam
                                    </span>
                                    <span v-else class="text-gray-400 text-xs">-</span>
                                </td>
                                <td class="py-3.5 px-4 text-center">
                                    <span
                                        v-if="lvl.can_be_skipped"
                                        class="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    >
                                        Ya
                                    </span>
                                    <span
                                        v-else
                                        class="text-gray-400 text-xs"
                                    >
                                        Tidak
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
