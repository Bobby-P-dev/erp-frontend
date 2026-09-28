<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { 
    Plus, 
    Trash2, 
    ArrowUp, 
    ArrowDown, 
    AlertCircle, 
    ChevronDown, 
    ChevronUp,
    Shield,
    Users,
    Clock,
    Sliders,
    GitBranch
} from '@lucide/vue'
import BaseInput from '../ui/BaseInput.vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseSelect from '../ui/BaseSelect.vue'
import ToggleSwitch from '../ui/ToggleSwitch.vue'
import SearchableSelect from '../ui/SearchableSelect.vue'
import { 
    getApprovalWorkflowMetadata, 
    getApprovalOptions 
} from '../../services/approvalServices.js'
import { searchUsers } from '../../services/userServices.js'

const props = defineProps({
    modelValue: {
        type: Array,
        required: true,
        default: () => [],
    },
    errors: {
        type: Object,
        default: () => ({}),
    },
    companyId: {
        type: [Number, String],
        default: null,
    },
    approverScopes: {
        type: Array,
        default: null,
    },
    approvalModes: {
        type: Array,
        default: null,
    },
    optionsData: {
        type: Object,
        default: null,
    },
})

const emit = defineEmits(['update:modelValue'])

const approverScopeOptions = ref([])
const approvalModeOptions = ref([])
const roleOptions = ref([])
const jobLevelOptions = ref([])
const positionOptions = ref([])
const divisionOptions = ref([])
const userOptions = ref([])
const isLoadingDropdowns = ref(false)

// Tracking collapsed state for advanced conditions
const openAdvancedIndex = ref({})

const toggleAdvanced = (index) => {
    openAdvancedIndex.value[index] = !openAdvancedIndex.value[index]
}

const conditionTypeOptions = [
    { value: 'always', label: 'Selalu Aktif (Always Active)' },
    { value: 'amount_gte', label: 'Nilai Transaksi ≥ (Amount Greater or Equal)' },
    { value: 'amount_lte', label: 'Nilai Transaksi ≤ (Amount Less or Equal)' },
    { value: 'context_equals', label: 'Konteks Dokumen Sama Dengan (Context Equals)' },
]

// Opsi Divisi dengan dukungan "Sesuai Divisi Dokumen Transaksi (Dinamis)"
const divisionSelectOptions = computed(() => [
    { value: null, label: 'Sesuai Divisi Dokumen Transaksi (Dinamis)' },
    ...divisionOptions.value.map(d => ({
        value: d.id ?? d.value,
        label: d.code ? `${d.name ?? d.label} (${d.code})` : (d.name ?? d.label),
    }))
])

// Filter opsi posisi berdasarkan divisi yang dipilih
const getFilteredPositionOptions = (divisionId) => {
    if (!divisionId) return positionOptions.value
    return positionOptions.value.filter(pos => {
        if (!pos.division_ids || pos.division_ids.length === 0) return true
        return pos.division_ids.includes(Number(divisionId))
    })
}

// Handler saat divisi di level posisi berubah: reset posisi jika tidak sesuai divisi baru
const handleDivisionChangeForPosition = (level) => {
    if (!level.division_id || !level.position_id) return
    const pos = positionOptions.value.find(p => p.value === level.position_id)
    if (pos && pos.division_ids && pos.division_ids.length > 0) {
        if (!pos.division_ids.includes(Number(level.division_id))) {
            level.position_id = null
        }
    }
}

// Sinkronisasi step_order
const syncStepOrders = (levels) => {
    return levels.map((lvl, idx) => ({
        ...lvl,
        step_order: idx + 1,
    }))
}

// Handler perubahan approver_scope: WAJIB CLEAR STALE CONDITIONAL VALUES
const handleConditionTypeChange = (level) => {
    if (level.condition_type === 'always') {
        level.condition_value = ''
    }
}

const handleScopeChange = (level) => {
    switch (level.approver_scope) {
        case 'department_head':
            level.role_id = null
            level.job_level_id = null
            level.position_id = null
            level.specific_user_id = null
            break
        case 'role_only':
            level.division_id = null
            level.job_level_id = null
            level.position_id = null
            level.specific_user_id = null
            break
        case 'role_and_division':
            level.job_level_id = null
            level.position_id = null
            level.specific_user_id = null
            break
        case 'job_level_and_division':
            level.role_id = null
            level.position_id = null
            level.specific_user_id = null
            break
        case 'position_and_division':
            level.role_id = null
            level.job_level_id = null
            level.specific_user_id = null
            break
        case 'specific_user':
            level.division_id = null
            level.role_id = null
            level.job_level_id = null
            level.position_id = null
            break
    }
}

const addLevel = () => {
    const newOrder = props.modelValue.length + 1
    const defaultScope = approverScopeOptions.value[0]?.value || 'department_head'
    const defaultMode = approvalModeOptions.value[0]?.value || 'any'
    const newLevel = {
        _uid: `uid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        id: null,
        step_order: newOrder,
        step_name: `Persetujuan Tahap ${newOrder}`,
        approver_scope: defaultScope,
        role_id: null,
        job_level_id: null,
        position_id: null,
        division_id: null,
        specific_user_id: null,
        approval_mode: defaultMode,
        can_be_skipped: false,
        sla_hours: 24,
        condition_type: 'always',
        condition_value: '',
    }
    const updated = [...props.modelValue, newLevel]
    emit('update:modelValue', syncStepOrders(updated))
}

const removeLevel = (index) => {
    if (props.modelValue.length <= 1) return
    const updated = [...props.modelValue]
    updated.splice(index, 1)
    emit('update:modelValue', syncStepOrders(updated))
}

const moveUp = (index) => {
    if (index <= 0) return
    const updated = [...props.modelValue]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    emit('update:modelValue', syncStepOrders(updated))
}

const moveDown = (index) => {
    if (index >= props.modelValue.length - 1) return
    const updated = [...props.modelValue]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    emit('update:modelValue', syncStepOrders(updated))
}

// Ambil pesan error untuk field level tertentu (mendukung dot-notation Laravel: levels.0.step_name)
const getLevelError = (index, fieldName) => {
    const dotKey = `levels.${index}.${fieldName}`
    if (props.errors[dotKey]) {
        return Array.isArray(props.errors[dotKey]) ? props.errors[dotKey][0] : props.errors[dotKey]
    }
    return ''
}

const handleSearchUsers = async (query = '') => {
    try {
        const res = await searchUsers(query)
        const list = res.data || []
        userOptions.value = list.map(u => ({
            value: u.id,
            label: u.email ? `${u.name} (${u.email})` : u.name,
        }))
    } catch (err) {
        console.error('Failed to search users:', err)
    }
}

const loadDropdowns = async (companyId = null) => {
    try {
        isLoadingDropdowns.value = true

        // 1. Workflow metadata (approver scopes, approval modes)
        if (props.approverScopes && props.approvalModes) {
            approverScopeOptions.value = props.approverScopes
            approvalModeOptions.value = props.approvalModes
        } else {
            const metaRes = await getApprovalWorkflowMetadata(false)
            const meta = metaRes.data || {}
            approverScopeOptions.value = meta.approver_scopes || []
            approvalModeOptions.value = meta.approval_modes || []
        }

        // 2. Approval options (roles, job_levels, positions, divisions)
        if (props.optionsData) {
            roleOptions.value = props.optionsData.roles || []
            jobLevelOptions.value = props.optionsData.job_levels || []
            positionOptions.value = (props.optionsData.positions || []).map(p => ({
                value: p.id ?? p.value,
                label: p.code ? `${p.name} (${p.code})` : (p.name ?? p.label),
                division_ids: p.division_ids || [],
            }))
            divisionOptions.value = (props.optionsData.divisions || []).map(d => ({
                value: d.id ?? d.value,
                label: d.code ? `${d.name} (${d.code})` : (d.name ?? d.label),
                code: d.code,
                name: d.name,
                company_id: d.company_id,
            }))
        } else {
            const filter = companyId ? { company_id: companyId } : {}
            const optsRes = await getApprovalOptions(filter)
            const opts = optsRes.data || {}
            roleOptions.value = (opts.roles || []).map(r => ({
                value: r.id ?? r.value,
                label: r.name ?? r.label,
            }))
            jobLevelOptions.value = (opts.job_levels || []).map(j => ({
                value: j.id ?? j.value,
                label: j.code ? `${j.name} (${j.code})` : (j.name ?? j.label),
            }))
            positionOptions.value = (opts.positions || []).map(p => ({
                value: p.id ?? p.value,
                label: p.code ? `${p.name} (${p.code})` : (p.name ?? p.label),
                division_ids: p.division_ids || [],
            }))
            divisionOptions.value = (opts.divisions || []).map(d => ({
                value: d.id ?? d.value,
                label: d.code ? `${d.name} (${d.code})` : (d.name ?? d.label),
                code: d.code,
                name: d.name,
                company_id: d.company_id,
            }))
        }

        // 3. Specific Users via user/search
        await handleSearchUsers('')
    } catch (err) {
        console.error('Failed to load level builder dropdown options:', err)
    } finally {
        isLoadingDropdowns.value = false
    }
}

watch(() => props.companyId, (newCompanyId) => {
    loadDropdowns(newCompanyId)
})

onMounted(() => {
    loadDropdowns(props.companyId)
})
</script>

<template>
    <div class="space-y-5">
        <!-- HEADER -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
                <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <div class="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                        <GitBranch class="w-3.5 h-3.5" />
                    </div>
                    Penyusun Tahapan Persetujuan Berjenjang (Sequential Pipeline)
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                    Alur dieksekusi berurutan dari Tahap 1 hingga selesai. Setiap tingkat menentukan pejabat yang berwenang meninjau.
                </p>
            </div>

            <BaseButton
                type="button"
                @click="addLevel"
                size="sm"
                variant="outline"
                class="border-blue-200 text-blue-700 hover:bg-blue-50 shrink-0"
            >
                <Plus class="w-4 h-4 mr-1.5" />
                Tambah Tingkat
            </BaseButton>
        </div>

        <!-- LEVEL CARDS PIPELINE CHAIN -->
        <div class="relative space-y-4">
            <div 
                v-for="(level, index) in modelValue" 
                :key="level._uid || level.id || index"
                class="relative flex items-start gap-3 sm:gap-4"
            >
                <!-- Vertical Pipeline Rail Line connecting nodes -->
                <div 
                    v-if="index < modelValue.length - 1"
                    class="absolute left-4 sm:left-4.5 top-9 bottom-[-16px] w-0.5 bg-blue-200 z-0"
                ></div>

                <!-- Number Node Badge (1, 2, 3...) -->
                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white font-mono font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs ring-4 ring-blue-50 shrink-0 z-10 select-none">
                    {{ level.step_order }}
                </div>

                <!-- Step Card Body -->
                <div class="flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all overflow-hidden">
                    <!-- Step Header Bar -->
                    <div class="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-900">
                                {{ level.step_name || `Tahap ${level.step_order}` }}
                            </span>
                            <span v-if="level.approver_scope" class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                                {{ level.approver_scope.replace(/_/g, ' ') }}
                            </span>
                        </div>

                        <!-- Step Reorder & Remove Controls -->
                        <div class="flex items-center gap-1">
                            <button
                                type="button"
                                title="Pindah Naik (Move Up)"
                                :disabled="index === 0"
                                @click="moveUp(index)"
                                class="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200/60 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                            >
                                <ArrowUp class="w-3.5 h-3.5" />
                            </button>

                            <button
                                type="button"
                                title="Pindah Turun (Move Down)"
                                :disabled="index === modelValue.length - 1"
                                @click="moveDown(index)"
                                class="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200/60 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                            >
                                <ArrowDown class="w-3.5 h-3.5" />
                            </button>

                            <button
                                type="button"
                                title="Hapus Tahapan"
                                :disabled="modelValue.length <= 1"
                                @click="removeLevel(index)"
                                class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 disabled:hover:bg-transparent transition-colors ml-1"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <!-- Step Content Form -->
                    <div class="p-4 sm:p-5 space-y-4 text-xs">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Step Name -->
                            <div>
                                <BaseInput
                                    v-model="level.step_name"
                                    label="Nama Tahapan (Step Name)"
                                    placeholder="e.g. Persetujuan Kepala Divisi"
                                    :error="getLevelError(index, 'step_name')"
                                    required
                                />
                            </div>

                            <!-- Approver Scope Selector -->
                            <div>
                                <BaseSelect
                                    v-model="level.approver_scope"
                                    :options="approverScopeOptions"
                                    label="Lingkup Approver (Approver Scope)"
                                    :error="getLevelError(index, 'approver_scope')"
                                    required
                                    @change="handleScopeChange(level)"
                                />
                            </div>
                        </div>

                        <!-- DYNAMIC SCOPE CONTAINER -->
                        <div class="bg-slate-50/90 rounded-xl p-3.5 sm:p-4 border border-slate-200 space-y-3">
                            <!-- Scope: DepartmentHead -->
                            <div v-if="level.approver_scope === 'department_head'" class="space-y-2">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Divisi Kepala Bagian (Opsional)
                                        </label>
                                        <SearchableSelect
                                            v-model="level.division_id"
                                            :options="divisionSelectOptions"
                                            placeholder="Pilih divisi..."
                                            :error="getLevelError(index, 'division_id')"
                                        />
                                    </div>
                                    <div class="flex items-center text-xs text-slate-600 leading-relaxed pt-1 sm:pt-4">
                                        <p>
                                            <strong class="text-blue-700 font-semibold">Penetapan Otomatis:</strong> Sistem mencari Kepala Divisi secara dinamis dari pemohon dokumen atau divisi yang ditentukan.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Scope: RoleOnly -->
                            <div v-else-if="level.approver_scope === 'role_only'">
                                <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Pilih Role Penyetuju <span class="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    v-model="level.role_id"
                                    :options="roleOptions"
                                    placeholder="Cari role (misal: Finance Manager)..."
                                    :error="getLevelError(index, 'role_id')"
                                />
                                <p class="text-[11px] text-slate-500 mt-1">
                                    Setiap pengguna yang memiliki role ini berhak meninjau dan menyetujui dokumen.
                                </p>
                            </div>

                            <!-- Scope: RoleAndDivision -->
                            <div v-else-if="level.approver_scope === 'role_and_division'" class="space-y-3">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Pilih Divisi (Division) <span class="text-rose-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            v-model="level.division_id"
                                            :options="divisionSelectOptions"
                                            placeholder="Pilih divisi..."
                                            :error="getLevelError(index, 'division_id')"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Pilih Role Penyetuju <span class="text-rose-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            v-model="level.role_id"
                                            :options="roleOptions"
                                            placeholder="Cari role..."
                                            :error="getLevelError(index, 'role_id')"
                                        />
                                    </div>
                                </div>
                                <p class="text-[11px] text-blue-700 font-medium">
                                    * Penyetuju dicari dari pengguna dengan role ini yang bertugas dalam divisi terkait.
                                </p>
                            </div>

                            <!-- Scope: JobLevelAndDivision -->
                            <div v-else-if="level.approver_scope === 'job_level_and_division'" class="space-y-3">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Pilih Divisi (Division) <span class="text-rose-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            v-model="level.division_id"
                                            :options="divisionSelectOptions"
                                            placeholder="Pilih divisi..."
                                            :error="getLevelError(index, 'division_id')"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Pilih Level Jabatan (Job Level) <span class="text-rose-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            v-model="level.job_level_id"
                                            :options="jobLevelOptions"
                                            placeholder="Cari level jabatan (misal: Kabag, Manager)..."
                                            :error="getLevelError(index, 'job_level_id')"
                                        />
                                    </div>
                                </div>
                                <p class="text-[11px] text-blue-700 font-medium">
                                    * Penyetuju dicari berdasarkan jenjang jabatan ini dalam divisi yang ditentukan.
                                </p>
                            </div>

                            <!-- Scope: PositionAndDivision -->
                            <div v-else-if="level.approver_scope === 'position_and_division'" class="space-y-3">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Pilih Divisi (Division) <span class="text-rose-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            v-model="level.division_id"
                                            :options="divisionSelectOptions"
                                            placeholder="Pilih divisi..."
                                            :error="getLevelError(index, 'division_id')"
                                            @update:model-value="() => handleDivisionChangeForPosition(level)"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Pilih Posisi Jabatan (Position) <span class="text-rose-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            v-model="level.position_id"
                                            :options="getFilteredPositionOptions(level.division_id)"
                                            :placeholder="level.division_id ? 'Pilih posisi dalam divisi...' : 'Cari posisi jabatan...'"
                                            :error="getLevelError(index, 'position_id')"
                                        />
                                    </div>
                                </div>
                                <p class="text-[11px] text-blue-700 font-medium">
                                    * Penyetuju dicari berdasarkan posisi jabatan ini dalam divisi yang dipilih (daftar posisi disaring otomatis).
                                </p>
                            </div>

                            <!-- Scope: SpecificUser -->
                            <div v-else-if="level.approver_scope === 'specific_user'">
                                <label class="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Pilih Pengguna Spesifik (User) <span class="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    v-model="level.specific_user_id"
                                    :options="userOptions"
                                    @search="handleSearchUsers"
                                    placeholder="Cari nama atau email pengguna..."
                                    :error="getLevelError(index, 'specific_user_id')"
                                />
                            </div>
                        </div>

                        <!-- APPROVAL MODE & SLA & SKIP -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                            <!-- Approval Mode -->
                            <div>
                                <BaseSelect
                                    v-model="level.approval_mode"
                                    :options="approvalModeOptions"
                                    label="Mode Persetujuan"
                                />
                                <p class="text-[11px] text-slate-400 mt-1">
                                    {{ level.approval_mode === 'all' ? 'Semua pejabat wajib menyetujui (Konsensus).' : 'Cukup salah satu pejabat yang menyetujui.' }}
                                </p>
                            </div>

                            <!-- SLA (Hours) -->
                            <div>
                                <BaseInput
                                    v-model="level.sla_hours"
                                    type="number"
                                    label="Target SLA (Jam)"
                                    placeholder="24"
                                    :error="getLevelError(index, 'sla_hours')"
                                />
                                <p class="text-[11px] text-slate-400 mt-1">
                                    Batas waktu toleransi respon persetujuan.
                                </p>
                            </div>

                            <!-- Can Be Skipped -->
                            <div class="flex flex-col justify-center">
                                <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Aturan Skip
                                </span>
                                <div class="flex items-center gap-2">
                                    <ToggleSwitch v-model="level.can_be_skipped" />
                                    <span class="text-xs font-medium text-slate-700">Dapat dilewati jika diizinkan</span>
                                </div>
                            </div>
                        </div>

                        <!-- COLLAPSIBLE ADVANCED CONDITIONS -->
                        <div class="border-t border-slate-100 pt-3">
                            <button
                                type="button"
                                @click="toggleAdvanced(index)"
                                class="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                            >
                                <Sliders class="w-3.5 h-3.5" />
                                <span>Kondisi Lanjutan (Advanced Conditions)</span>
                                <ChevronDown v-if="!openAdvancedIndex[index]" class="w-3.5 h-3.5" />
                                <ChevronUp v-else class="w-3.5 h-3.5" />
                            </button>

                            <div v-if="openAdvancedIndex[index]" class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
                                <div>
                                    <BaseSelect
                                        v-model="level.condition_type"
                                        :options="conditionTypeOptions"
                                        label="Tipe Kondisi (Condition Type)"
                                        size="sm"
                                        @change="handleConditionTypeChange(level)"
                                    />
                                </div>

                                <div v-if="level.condition_type && level.condition_type !== 'always'">
                                    <BaseInput
                                        v-model="level.condition_value"
                                        label="Nilai Pembanding (Threshold)"
                                        placeholder="e.g. 50000000"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ADD STEP BOTTOM BUTTON -->
        <div class="pt-2 flex justify-center">
            <button
                type="button"
                @click="addLevel"
                class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 text-blue-700 text-xs font-bold hover:bg-blue-100/70 hover:border-blue-400 transition-all shadow-2xs"
            >
                <Plus class="w-4 h-4 stroke-[2.5]" />
                Tambah Tingkat Persetujuan Berikutnya
            </button>
        </div>
    </div>
</template>
