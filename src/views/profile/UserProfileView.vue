<script setup>
import { ref, computed } from 'vue'
import {
    User,
    Mail,
    Building2,
    Shield,
    BadgeCheck,
    PenTool,
    Trash2,
    Edit3,
    AlertTriangle,
    CheckCircle2,
    Briefcase,
    Hash,
    Layers,
    Calendar
} from '@lucide/vue'
import { useAuthStore } from '../../stores/auth.js'
import { deleteUserSignature } from '../../services/userServices.js'
import SignaturePadModal from '../../components/profile/SignaturePadModal.vue'
import Swal from 'sweetalert2'

const authStore = useAuthStore()
const isSignatureModalOpen = ref(false)
const isDeletingSignature = ref(false)

const user = computed(() => authStore.user || {})
const employee = computed(() => authStore.profile || user.value.employee || {})

const rolesList = computed(() => {
    return (user.value.roles || []).map(r => typeof r === 'string' ? r : r.name).join(', ') || 'Employee'
})

const handleDeleteSignature = async () => {
    const result = await Swal.fire({
        title: 'Hapus Tanda Tangan?',
        text: 'Anda harus mengunggah atau membuat tanda tangan baru untuk dapat menyetujui dokumen di sistem ERP.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
    })

    if (!result.isConfirmed) return

    try {
        isDeletingSignature.value = true
        await deleteUserSignature()
        authStore.updateUserSignature(false, null, null)

        Swal.fire({
            icon: 'success',
            title: 'Tanda Tangan Dihapus',
            text: 'Spesimen tanda tangan digital Anda berhasil dihapus.',
            timer: 2000,
            showConfirmButton: false,
        })
    } catch (err) {
        console.error(err)
        Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus',
            text: err.response?.data?.message || 'Terjadi kesalahan saat menghapus tanda tangan.',
        })
    } finally {
        isDeletingSignature.value = false
    }
}
</script>

<template>
    <div class="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <!-- Page Header -->
        <div class="border-b border-slate-200 pb-5">
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">Profil Pengguna</h1>
            <p class="text-sm text-slate-500 mt-1">Kelola data profil akun dan spesimen tanda tangan digital resmi Anda</p>
        </div>

        <!-- Identity Banner -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div class="flex items-center gap-5">
                <div class="w-16 h-16 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-sm">
                    {{ user.name?.charAt(0)?.toUpperCase() || 'U' }}
                </div>
                <div>
                    <div class="flex items-center gap-2.5">
                        <h2 class="text-xl font-bold text-slate-900">{{ user.name || 'Nama Pengguna' }}</h2>
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Shield class="w-3 h-3" />
                            {{ rolesList }}
                        </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-1.5 font-medium">
                        <span class="inline-flex items-center gap-1.5">
                            <Mail class="w-3.5 h-3.5 text-slate-400" />
                            {{ user.email || '-' }}
                        </span>
                        <span v-if="employee.nik" class="inline-flex items-center gap-1.5">
                            <Hash class="w-3.5 h-3.5 text-slate-400" />
                            NIK: {{ employee.nik }}
                        </span>
                        <span v-if="employee.position?.name" class="inline-flex items-center gap-1.5">
                            <Briefcase class="w-3.5 h-3.5 text-slate-400" />
                            {{ employee.position.name }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Signature Status Chip -->
            <div class="shrink-0">
                <span
                    v-if="user.has_signature"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                    <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                    Tanda Tangan Digital Aktif
                </span>
                <span
                    v-else
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"
                >
                    <AlertTriangle class="w-4 h-4 text-amber-600" />
                    Belum Ada Tanda Tangan
                </span>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Organization & Employee Information Card -->
            <div class="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Building2 class="w-4 h-4 text-slate-500" />
                    Data Kepegawaian
                </h3>

                <div class="space-y-3.5 text-xs">
                    <div>
                        <span class="text-slate-400 font-medium block">Perusahaan:</span>
                        <span class="text-slate-800 font-semibold text-sm">{{ employee.company?.name || '-' }}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-medium block">Divisi Kerja:</span>
                        <span class="text-slate-800 font-semibold">{{ employee.division?.name || '-' }}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-medium block">Jabatan / Posisi:</span>
                        <span class="text-slate-800 font-semibold">{{ employee.position?.name || '-' }}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-medium block">Jenjang Karir (Job Level):</span>
                        <span class="text-slate-800 font-semibold">{{ employee.jobLevel?.name || employee.job_level?.name || '-' }}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 font-medium block">Status Akun:</span>
                        <span class="inline-flex items-center gap-1 font-semibold text-emerald-700 mt-0.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Karyawan Aktif
                        </span>
                    </div>
                </div>
            </div>

            <!-- Digital Signature Specimen Card (Main Feature) -->
            <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
                <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                            <PenTool class="w-4 h-4 text-blue-600" />
                            Spesimen Tanda Tangan Digital Resmi
                        </h3>
                        <p class="text-xs text-slate-500 mt-0.5">Digunakan secara otomatis pada dokumen persetujuan pengadaan dan pencetakan PDF resmi</p>
                    </div>
                    <button
                        v-if="user.has_signature"
                        type="button"
                        @click="isSignatureModalOpen = true"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors cursor-pointer"
                    >
                        <Edit3 class="w-3.5 h-3.5" />
                        Ganti Tanda Tangan
                    </button>
                </div>

                <!-- Specimen View When Present -->
                <div v-if="user.has_signature" class="space-y-4">
                    <div class="relative w-full h-44 rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col items-center justify-center overflow-hidden group">
                        <!-- Blueprint grid pattern background -->
                        <div class="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>

                        <img
                            :src="user.signature_url"
                            alt="Spesimen Tanda Tangan"
                            class="max-h-32 max-w-full object-contain relative z-10 transition-transform duration-200 group-hover:scale-105"
                        />

                        <div class="absolute bottom-2 right-3 text-[10px] text-slate-400 font-mono z-10">
                            Valid Specimen • {{ user.name }}
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                        <div class="flex items-start gap-2 text-slate-600">
                            <BadgeCheck class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>Tanda tangan ini sah dan siap digunakan untuk menandatangani dokumen persetujuan (Purchase Requisition).</span>
                        </div>
                        <button
                            type="button"
                            @click="handleDeleteSignature"
                            :disabled="isDeletingSignature"
                            class="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline shrink-0 cursor-pointer"
                        >
                            <Trash2 class="w-3.5 h-3.5" />
                            Hapus Tanda Tangan
                        </button>
                    </div>
                </div>

                <!-- Empty State When Not Present -->
                <div v-else class="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                    <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                        <PenTool class="w-6 h-6" />
                    </div>
                    <div class="max-w-md mx-auto">
                        <h4 class="text-sm font-bold text-slate-900">Belum Ada Tanda Tangan Digital</h4>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                            Sebagai approver atau inisiator, Anda wajib memiliki spesimen tanda tangan digital. Tanpa tanda tangan, Anda tidak dapat memberikan keputusan persetujuan pada dokumen apa pun.
                        </p>
                    </div>
                    <button
                        type="button"
                        @click="isSignatureModalOpen = true"
                        class="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                        <PenTool class="w-4 h-4" />
                        Buat / Unggah Tanda Tangan Sekarang
                    </button>
                </div>
            </div>
        </div>

        <!-- Signature Pad Modal -->
        <SignaturePadModal
            :is-open="isSignatureModalOpen"
            @close="isSignatureModalOpen = false"
        />
    </div>
</template>
