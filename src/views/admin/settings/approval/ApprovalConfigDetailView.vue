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
    Coins,
    GitBranch
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
            const sorted = [...config.value.levels].sort((a, b) => (a.step_order || 0) - (b.step_order || 0))
            const total = sorted.length
            previewSteps.value = sorted.map((lvl, idx) => {
                const order = lvl.step_order || idx + 1
                let tierBadge = `Tahap ${order}`
                if (order === 1) tierBadge = `Tahap 1 (Awal)`
                else if (order === total) tierBadge = `Tahap ${order} (Final)`

                return {
                    id: lvl.id || order,
                    step_order: order,
                    name: lvl.step_name || `Tahap ${order}`,
                    step_name: lvl.step_name || `Tahap ${order}`,
                    status: 'pending',
                    status_label: tierBadge,
                    approver_scope: lvl.approver_scope,
                    approver_name: getScopeDisplay(lvl),
                    assignee_label: getScopeDisplay(lvl),
                    approval_mode: lvl.approval_mode || ApprovalMode.ANY,
                    sla_hours: lvl.sla_hours,
                    can_be_skipped: lvl.can_be_skipped
                }
            })
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
            return 'bg-blue-50 text-blue-700 border-blue-200'
        case ApproverScope.ROLE_ONLY:
        case 'role_only':
            return 'bg-slate-100 text-slate-800 border-slate-300'
        case ApproverScope.ROLE_AND_DIVISION:
        case 'role_and_division':
            return 'bg-sky-50 text-sky-700 border-sky-200'
        case ApproverScope.JOB_LEVEL_AND_DIVISION:
        case 'job_level_and_division':
            return 'bg-teal-50 text-teal-700 border-teal-200'
        case ApproverScope.POSITION_AND_DIVISION:
        case 'position_and_division':
            return 'bg-amber-50 text-amber-800 border-amber-200'
        case ApproverScope.SPECIFIC_USER:
        case 'specific_user':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200'
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200'
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
            <div class="flex items-start sm:items-center gap-3">
                <button
                    type="button"
                    @click="router.push({ name: 'admin.settings.approval' })"
                    class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 shadow-2xs shrink-0"
                    title="Kembali ke Daftar Alur Persetujuan"
                >
                    <ArrowLeft class="w-5 h-5" />
                </button>
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            {{ config?.code || '...' }}
                        </span>
                        <span
                            :class="[
                                'text-xs font-semibold px-2.5 py-0.5 rounded-full border',
                                config?.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                            ]"
                        >
                            {{ config?.is_active ? 'Aktif' : 'Nonaktif' }}
                        </span>
                        <span v-if="config?.document_type_label || config?.document_type" class="text-xs font-medium text-slate-500 flex items-center gap-1">
                            • {{ config?.document_type_label || config?.document_type }}
                        </span>
                    </div>
                    <h1 class="text-xl font-bold text-slate-900 mt-1">
                        {{ config?.name || 'Detail Konfigurasi Alur' }}
                    </h1>
                </div>
            </div>

            <div class="flex items-center gap-2 shrink-0" v-if="config">
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
                    variant="primary"
                    size="sm"
                    @click="router.push({ name: 'admin.settings.approval.edit', params: { id: configId } })"
                >
                    <Edit3 class="w-4 h-4 mr-1.5" />
                    Edit Alur
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
        <div v-if="isLoading" class="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div class="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-sm font-medium text-slate-600">Memuat detail konfigurasi alur persetujuan...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="errorMessage" class="p-8 text-center bg-rose-50/50 rounded-2xl border border-rose-200 shadow-2xs space-y-4">
            <AlertCircle class="w-10 h-10 text-rose-500 mx-auto" />
            <p class="text-sm font-medium text-rose-700">{{ errorMessage }}</p>
            <BaseButton variant="outline" size="sm" @click="fetchDetail">
                Coba Lagi
            </BaseButton>
        </div>

        <!-- Detail Content -->
        <div v-else class="space-y-6">
            <!-- Asymmetric Specification Bento -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <!-- Info Card 1: Core Specifications (2 cols wide) -->
                <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-5">
                    <div class="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <FileText class="w-4 h-4" />
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900">Spesifikasi Dokumen & Entitas</h3>
                            <p class="text-xs text-slate-500">Cakupan pengadaan dan batasan nilai otorisasi yang berlaku.</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tipe Dokumen Transaksi</span>
                            <p class="text-sm font-bold text-slate-900 mt-0.5">
                                {{ config?.document_type_label || config?.document_type }}
                            </p>
                        </div>

                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Entitas Perusahaan</span>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <Building2 class="w-4 h-4 text-slate-400 shrink-0" />
                                <p class="text-sm font-semibold text-slate-800">
                                    {{ config?.company?.name || 'Semua Perusahaan (Universal)' }}
                                </p>
                            </div>
                        </div>

                        <div class="sm:col-span-2 pt-2 border-t border-slate-100">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Ambang Batas Nilai Transaksi</span>
                            <div class="flex items-center gap-2">
                                <span v-if="config?.applies_to_all_amounts" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                                    Berlaku untuk Semua Nominal Pengadaan (Universal)
                                </span>
                                <span v-else class="font-mono text-sm font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-md border border-slate-200 inline-block">
                                    {{ formatCurrency(config?.min_amount || 0) }} s/d {{ config?.max_amount ? formatCurrency(config.max_amount) : 'Tanpa Batas Atas' }}
                                </span>
                            </div>
                        </div>

                        <div v-if="config?.description" class="sm:col-span-2 pt-2 border-t border-slate-100">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Catatan Deskripsi</span>
                            <p class="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-200/60">
                                {{ config.description }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Info Card 2: Characteristics & Metadata (1 col wide) -->
                <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <ShieldCheck class="w-4 h-4" />
                            </div>
                            <div>
                                <h3 class="text-sm font-bold text-slate-900">Karakteristik Alur</h3>
                                <p class="text-xs text-slate-500">Parameter eksekusi tahapan.</p>
                            </div>
                        </div>

                        <div class="space-y-3 mt-3">
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-slate-500">Jumlah Tingkatan:</span>
                                <span class="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {{ config?.levels?.length || 0 }} Tahap
                                </span>
                            </div>

                            <div class="flex items-center justify-between text-xs">
                                <span class="text-slate-500">Metode Eksekusi:</span>
                                <span class="font-semibold text-slate-800">Sekuensial Berjenjang</span>
                            </div>

                            <div class="flex items-center justify-between text-xs">
                                <span class="text-slate-500">Status Alur:</span>
                                <span :class="config?.is_active ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'">
                                    {{ config?.is_active ? 'Aktif Digunakan' : 'Nonaktif' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="pt-3 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
                        <div class="flex items-center justify-between">
                            <span>Dibuat:</span>
                            <span class="text-slate-600 font-medium">{{ formatDate(config?.created_at) }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span>Pembaruan Terakhir:</span>
                            <span class="text-slate-600 font-medium">{{ formatDate(config?.updated_at) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Workflow Visual Preview -->
            <div class="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <GitBranch class="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div>
                            <h2 class="text-sm font-bold text-slate-900">
                                Visualisasi Alur Berjenjang (Sequential Pipeline)
                            </h2>
                            <p class="text-xs text-slate-500">
                                Tahapan persetujuan yang akan dijalankan dari kiri ke kanan secara sekuensial saat dokumen diajukan.
                            </p>
                        </div>
                    </div>

                    <span class="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                        {{ previewSteps.length }} Tahap Persetujuan
                    </span>
                </div>

                <div v-if="previewSteps.length > 0" class="pt-2 pb-2">
                    <ApprovalStepper
                        :levels="previewSteps"
                        :currentStepOrder="1"
                        overallStatus="pending"
                        orientation="horizontal"
                    />
                </div>
                <div v-else class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p class="text-sm text-slate-500">Belum ada tingkatan approval yang dikonfigurasi pada alur ini.</p>
                </div>
            </div>

            <!-- Detailed Tier Cards Table -->
            <div class="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                            <Layers class="w-4 h-4" />
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900">
                                Rincian Matriks Tingkatan (Tier Specifications)
                            </h3>
                            <p class="text-xs text-slate-500">
                                Aturan penanggung jawab otorisasi, mode konsensus, dan batas waktu SLA per tahap.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th class="py-3 px-4 w-16 text-center">Tahap</th>
                                <th class="py-3 px-4 min-w-[180px]">Nama Langkah</th>
                                <th class="py-3 px-4">Lingkup (Scope)</th>
                                <th class="py-3 px-4 min-w-[200px]">Pejabat Berwenang (Assignee)</th>
                                <th class="py-3 px-4 text-center">Mode Otorisasi</th>
                                <th class="py-3 px-4 text-center">Target SLA</th>
                                <th class="py-3 px-4 text-center">Izin Skip</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <tr
                                v-for="(lvl, idx) in config?.levels || []"
                                :key="lvl.id || idx"
                                class="hover:bg-slate-50/70 transition-colors"
                            >
                                <!-- Step Order -->
                                <td class="py-3.5 px-4 text-center font-bold text-slate-700">
                                    <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-200 shadow-2xs">
                                        {{ lvl.step_order }}
                                    </span>
                                </td>

                                <!-- Step Name -->
                                <td class="py-3.5 px-4">
                                    <p class="font-bold text-slate-900 text-xs">{{ lvl.step_name }}</p>
                                    <p v-if="lvl.description" class="text-[11px] text-slate-400 mt-0.5">{{ lvl.description }}</p>
                                </td>

                                <!-- Scope Badge -->
                                <td class="py-3.5 px-4 whitespace-nowrap">
                                    <span
                                        :class="[
                                            'px-2.5 py-0.5 text-[11px] font-semibold rounded-full border',
                                            getScopeBadgeClass(lvl.approver_scope)
                                        ]"
                                    >
                                        {{ lvl.approver_scope_label || lvl.approver_scope?.replace(/_/g, ' ') }}
                                    </span>
                                </td>

                                <!-- Assignee -->
                                <td class="py-3.5 px-4 font-semibold text-slate-800">
                                    {{ getScopeDisplay(lvl) }}
                                </td>

                                <!-- Approval Mode -->
                                <td class="py-3.5 px-4 text-center whitespace-nowrap">
                                    <span
                                        :class="[
                                            'px-2.5 py-0.5 text-[11px] font-bold rounded-md border uppercase tracking-wider',
                                            lvl.approval_mode === ApprovalMode.ALL
                                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                                : 'bg-slate-100 text-slate-700 border-slate-200'
                                        ]"
                                    >
                                        {{ lvl.approval_mode === ApprovalMode.ALL ? 'ALL (Konsensus)' : 'ANY (Salah Satu)' }}
                                    </span>
                                </td>

                                <!-- SLA -->
                                <td class="py-3.5 px-4 text-center whitespace-nowrap">
                                    <span v-if="lvl.sla_hours" class="inline-flex items-center gap-1 font-mono text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        <Clock class="w-3 h-3 text-amber-600" />
                                        {{ lvl.sla_hours }} Jam
                                    </span>
                                    <span v-else class="text-slate-400 text-xs">-</span>
                                </td>

                                <!-- Can Be Skipped -->
                                <td class="py-3.5 px-4 text-center whitespace-nowrap">
                                    <span
                                        v-if="lvl.can_be_skipped"
                                        class="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    >
                                        Diizinkan
                                    </span>
                                    <span
                                        v-else
                                        class="text-slate-400 text-xs"
                                    >
                                        Wajib
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
