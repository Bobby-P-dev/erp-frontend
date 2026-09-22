<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
    ArrowLeft, 
    Shield, 
    Save, 
    Building2, 
    DollarSign, 
    Sliders,
    Layers
} from '@lucide/vue'
import PageHeader from '../../../../components/ui/PageHeader.vue'
import BaseInput from '../../../../components/ui/BaseInput.vue'
import BaseButton from '../../../../components/ui/BaseButton.vue'
import BaseSelect from '../../../../components/ui/BaseSelect.vue'
import ToggleSwitch from '../../../../components/ui/ToggleSwitch.vue'
import SearchableSelect from '../../../../components/ui/SearchableSelect.vue'
import ApprovalLevelBuilder from '../../../../components/approval/ApprovalLevelBuilder.vue'
import { 
    createApprovalConfiguration, 
    showApprovalConfiguration,
    getApprovalWorkflowMetadata,
    getApprovalOptions
} from '../../../../services/approvalServices.js'
import { showLoading, showSuccess, showError } from '../../../../utils/swal.js'

const router = useRouter()
const route = useRoute()

const isSubmitting = ref(false)
const documentTypes = ref([])
const companies = ref([])

const documentTypeOptions = computed(() => {
    return documentTypes.value.map(d => ({
        value: d.value,
        label: d.label,
        subtitle: d.module ? `Modul: ${d.module}` : ''
    }))
})

const form = ref({
    document_type: 'purchase_requisition',
    company_id: null,
    code: '',
    name: '',
    applies_to_all_amounts: true,
    min_amount: '',
    max_amount: '',
    description: '',
    is_active: true,
    levels: [
        {
            _uid: `uid_${Date.now()}_1`,
            step_order: 1,
            step_name: 'Persetujuan Kepala Divisi',
            approver_scope: 'department_head',
            approval_mode: 'any',
            role_id: null,
            job_level_id: null,
            position_id: null,
            specific_user_id: null,
            can_be_skipped: false,
            sla_hours: 24,
            condition_type: 'always',
            condition_value: '',
        }
    ],
})

const errors = ref({})

const fetchMetadata = async () => {
    try {
        const [metaRes, optsRes] = await Promise.all([
            getApprovalWorkflowMetadata(false),
            getApprovalOptions(),
        ])
        const meta = metaRes.data || {}
        documentTypes.value = meta.document_types || []

        const opts = optsRes.data || {}
        companies.value = (opts.companies || []).map(c => ({
            value: c.id ?? c.value,
            label: c.code ? `${c.name} (${c.code})` : (c.name ?? c.label),
        }))
    } catch (e) {
        console.error('Failed to fetch metadata:', e)
    }
}

const checkDuplicatePrefill = async () => {
    const duplicateId = route.query.duplicate_from
    if (!duplicateId) return

    try {
        showLoading('Memuat template duplikasi...')
        const res = await showApprovalConfiguration(duplicateId)
        const d = res.data
        if (d) {
            form.value.document_type = d.document_type
            form.value.company_id = d.company_id || null
            form.value.code = `${d.code}_COPY`
            form.value.name = `${d.name} (Copy)`
            form.value.description = d.description || ''
            form.value.is_active = false // Default inactive to avoid conflict
            form.value.applies_to_all_amounts = (d.min_amount === null && d.max_amount === null)
            form.value.min_amount = d.min_amount || ''
            form.value.max_amount = d.max_amount || ''
            form.value.levels = (d.levels || []).map((lvl, idx) => ({
                ...lvl,
                _uid: `uid_${Date.now()}_${idx}`,
                id: null, // Reset ID
            }))
            showSuccess('Template Dimuat', 'Data alur berhasil di-prefill untuk duplikasi.')
        }
    } catch (err) {
        showError('Gagal', 'Gagal memuat data untuk duplikasi alur.', err)
    }
}

const validate = () => {
    errors.value = {}
    let isValid = true

    if (!form.value.document_type) {
        errors.value.document_type = 'Tipe dokumen wajib dipilih.'
        isValid = false
    }
    if (!form.value.code || !form.value.code.trim()) {
        errors.value.code = 'Kode workflow wajib diisi.'
        isValid = false
    }
    if (!form.value.name || !form.value.name.trim()) {
        errors.value.name = 'Nama workflow wajib diisi.'
        isValid = false
    }

    if (!form.value.applies_to_all_amounts) {
        if (form.value.min_amount === '' || form.value.min_amount === null) {
            errors.value.min_amount = 'Minimal nominal wajib diisi jika batasan aktif.'
            isValid = false
        }
        if (
            form.value.max_amount !== '' && 
            form.value.max_amount !== null &&
            Number(form.value.max_amount) < Number(form.value.min_amount)
        ) {
            errors.value.max_amount = 'Maksimal nominal harus lebih besar atau sama dengan minimal nominal.'
            isValid = false
        }
    }

    if (!form.value.levels || form.value.levels.length === 0) {
        errors.value.levels = 'Minimal harus memiliki 1 level persetujuan.'
        isValid = false
    }

    form.value.levels.forEach((lvl, idx) => {
        if (!lvl.step_name || !lvl.step_name.trim()) {
            errors.value[`levels.${idx}.step_name`] = 'Nama tahapan wajib diisi.'
            isValid = false
        }
        if (['role_only', 'role_and_division'].includes(lvl.approver_scope) && !lvl.role_id) {
            errors.value[`levels.${idx}.role_id`] = 'Role wajib dipilih.'
            isValid = false
        }
        if (lvl.approver_scope === 'job_level_and_division' && !lvl.job_level_id) {
            errors.value[`levels.${idx}.job_level_id`] = 'Job Level wajib dipilih.'
            isValid = false
        }
        if (lvl.approver_scope === 'specific_user' && !lvl.specific_user_id) {
            errors.value[`levels.${idx}.specific_user_id`] = 'User spesifik wajib dipilih.'
            isValid = false
        }
    })

    return isValid
}

const handleSubmit = async () => {
    if (isSubmitting.value) return

    if (!validate()) {
        showError('Validasi Gagal', 'Mohon periksa kolom formulir yang bertanda merah.')
        return
    }

    try {
        isSubmitting.value = true
        showLoading('Menyimpan Konfigurasi...', 'Mohon tunggu sebentar.')

        const payload = {
            document_type: form.value.document_type,
            company_id: form.value.company_id ? Number(form.value.company_id) : null,
            code: form.value.code.trim().toUpperCase(),
            name: form.value.name.trim(),
            description: form.value.description ? form.value.description.trim() : null,
            is_active: Boolean(form.value.is_active),
            min_amount: form.value.applies_to_all_amounts ? null : (form.value.min_amount !== '' ? Number(form.value.min_amount) : null),
            max_amount: form.value.applies_to_all_amounts ? null : (form.value.max_amount !== '' ? Number(form.value.max_amount) : null),
            levels: form.value.levels.map((lvl, idx) => ({
                step_order: idx + 1,
                step_name: lvl.step_name.trim(),
                approver_scope: lvl.approver_scope,
                approval_mode: lvl.approval_mode,
                role_id: ['role_only', 'role_and_division'].includes(lvl.approver_scope) ? Number(lvl.role_id) : null,
                job_level_id: lvl.approver_scope === 'job_level_and_division' ? Number(lvl.job_level_id) : null,
                specific_user_id: lvl.approver_scope === 'specific_user' ? Number(lvl.specific_user_id) : null,
                can_be_skipped: Boolean(lvl.can_be_skipped),
                sla_hours: lvl.sla_hours ? Number(lvl.sla_hours) : null,
                condition_type: lvl.condition_type || 'always',
                condition_value: (lvl.condition_type && lvl.condition_type !== 'always' && lvl.condition_value) ? String(lvl.condition_value).trim() : null,
            })),
        }

        await createApprovalConfiguration(payload)
        showSuccess('Berhasil!', 'Alur persetujuan baru berhasil disimpan.')
        router.push({ name: 'admin.settings.approval' })
    } catch (error) {
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors
            showError('Validasi Server Gagal', 'Mohon periksa input formulir Anda.')
        } else {
            showError('Gagal!', error.response?.data?.message || 'Terjadi kesalahan sistem saat menyimpan alur.', error)
        }
    } finally {
        isSubmitting.value = false
    }
}

onMounted(async () => {
    await fetchMetadata()
    await checkDuplicatePrefill()
})
</script>

<template>
    <div class="space-y-6 max-w-5xl mx-auto pb-12">
        <!-- HEADER -->
        <PageHeader
            title="Create Approval Flow"
            description="Definisikan aturan baru, ambang batas nominal pengadaan, dan tahapan berjenjang."
        >
            <template #icon>
                <Shield class="w-7 h-7 text-indigo-600" />
            </template>
            <template #actions>
                <BaseButton 
                    variant="outline" 
                    @click="router.push({ name: 'admin.settings.approval' })"
                >
                    <ArrowLeft class="w-4 h-4 mr-1.5" />
                    Kembali
                </BaseButton>
            </template>
        </PageHeader>

        <!-- MAIN FORM -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- CARD 1: BASIC INFO -->
            <div class="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-5">
                <div class="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Layers class="w-4 h-4 text-indigo-600" />
                        Informasi Alur & Dokumen
                    </h3>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-gray-500">Status Aktif:</span>
                        <ToggleSwitch v-model="form.is_active" />
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <!-- Document Type -->
                    <div>
                        <BaseSelect
                            v-model="form.document_type"
                            :options="documentTypeOptions"
                            label="Tipe Dokumen (Document Type)"
                            required
                            placeholder="Pilih tipe dokumen"
                            :error="errors.document_type"
                        />
                    </div>

                    <!-- Company Selector -->
                    <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Cakupan Perusahaan (Company)
                        </label>
                        <SearchableSelect
                            v-model="form.company_id"
                            :options="companies"
                            placeholder="Semua Perusahaan (Universal)"
                            :error="errors.company_id"
                        />
                        <p class="text-[11px] text-gray-400 mt-1">
                            Kosongkan jika alur berlaku untuk seluruh entitas legal/anak perusahaan.
                        </p>
                    </div>

                    <!-- Code -->
                    <div>
                        <BaseInput
                            v-model="form.code"
                            label="Kode Alur (Workflow Code)"
                            placeholder="e.g. APPR-PR-LOW"
                            :error="errors.code"
                            required
                        />
                    </div>

                    <!-- Name -->
                    <div>
                        <BaseInput
                            v-model="form.name"
                            label="Nama Alur Persetujuan"
                            placeholder="e.g. Alur Persetujuan PR Bahan Baku"
                            :error="errors.name"
                            required
                        />
                    </div>

                    <!-- Description -->
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Keterangan / Deskripsi Aturan
                        </label>
                        <textarea
                            v-model="form.description"
                            rows="2"
                            placeholder="Catatan tambahan mengenai ruang lingkup alur persetujuan ini..."
                            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-gray-800 font-medium placeholder:text-gray-400"
                        ></textarea>
                    </div>
                </div>

                <!-- AMOUNT THRESHOLD RANGE -->
                <div class="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-100/70 space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h4 class="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                                Batasan Nominal Pengadaan (Amount Range)
                            </h4>
                            <p class="text-xs text-indigo-700 mt-0.5">
                                Atur apakah alur persetujuan ini universal untuk semua nilai atau memiliki batas nominal tertentu.
                            </p>
                        </div>

                        <div class="flex items-center gap-2">
                            <span class="text-xs font-semibold text-gray-700">Berlaku untuk semua nominal:</span>
                            <ToggleSwitch v-model="form.applies_to_all_amounts" />
                        </div>
                    </div>

                    <!-- Min & Max Fields (If not applies_to_all_amounts) -->
                    <div v-if="!form.applies_to_all_amounts" class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                            <BaseInput
                                v-model="form.min_amount"
                                type="number"
                                label="Minimal Nominal Transaksi (IDR)"
                                placeholder="0"
                                :error="errors.min_amount"
                                required
                            />
                        </div>

                        <div>
                            <BaseInput
                                v-model="form.max_amount"
                                type="number"
                                label="Maksimal Nominal Transaksi (IDR)"
                                placeholder="Kosongkan jika tanpa batas atas"
                                :error="errors.max_amount"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- CARD 2: TIER BUILDER COMPONENT -->
            <div class="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm">
                <ApprovalLevelBuilder
                    v-model="form.levels"
                    :company-id="form.company_id"
                    :errors="errors"
                />
            </div>

            <!-- FOOTER ACTIONS -->
            <div class="flex items-center justify-end gap-3 pt-2">
                <BaseButton
                    type="button"
                    variant="outline"
                    @click="router.push({ name: 'admin.settings.approval' })"
                    :disabled="isSubmitting"
                >
                    Batal
                </BaseButton>

                <BaseButton
                    type="submit"
                    :disabled="isSubmitting"
                    class="px-7"
                >
                    <Save class="w-4 h-4 mr-1.5" />
                    Simpan Alur Persetujuan
                </BaseButton>
            </div>
        </form>
    </div>
</template>
