<script setup>
import { onMounted, ref, watch } from 'vue'
import { 
    Plus, 
    Edit, 
    Trash2, 
    Scale, 
    X, 
    Check, 
    Search,
    RefreshCw,
    AlertCircle
} from '@lucide/vue'
import { 
    getUnits, 
    createUnit, 
    updateUnit, 
    deleteUnit 
} from '../../../services/unitServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal.js'
import PageHeader from '../../../components/ui/PageHeader.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'

const units = ref([])
const isLoading = ref(false)
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const tableColumns = [
    { key: 'no', label: '#', class: 'w-16 text-center' },
    { key: 'code', label: 'Kode Satuan' },
    { key: 'name', label: 'Nama Satuan' },
    { key: 'created_at', label: 'Dibuat Pada' },
    { key: 'actions', label: 'Aksi', class: 'text-right' }
]

const searchQuery = ref('')
let searchTimeout = null

const fetchUnits = async (search = '', page = 1) => {
    try {
        isLoading.value = true
        const response = await getUnits(search, page)

        units.value = response.data || []

        const resPagination = response.meta || response
        pagination.value = {
            current_page: resPagination.current_page || 1,
            last_page: resPagination.last_page || 1,
            from: resPagination.from || 0,
            to: resPagination.to || 0,
            total: resPagination.total || 0
        }
    } catch (error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan saat memuat data satuan unit.', error)
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    fetchUnits()
})

watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchUnits(newValue, 1)
    }, 400)
})

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)
const isSubmitting = ref(false)

const form = ref({
    code: '',
    name: ''
})

const errors = ref({})

const openModal = (unit = null) => {
    errors.value = {}
    if (unit && unit.id) {
        isEditing.value = true
        editId.value = unit.id
        form.value = {
            code: unit.code || '',
            name: unit.name || ''
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = {
            code: '',
            name: ''
        }
    }
    showModal.value = true
}

const closeModal = () => {
    if (isSubmitting.value) return
    showModal.value = false
}

const validate = () => {
    const errs = {}
    if (!form.value.code || !form.value.code.trim()) {
        errs.code = 'Kode satuan wajib diisi.'
    } else if (form.value.code.trim().length > 50) {
        errs.code = 'Kode satuan maksimal 50 karakter.'
    }

    if (!form.value.name || !form.value.name.trim()) {
        errs.name = 'Nama satuan wajib diisi.'
    } else if (form.value.name.trim().length > 100) {
        errs.name = 'Nama satuan maksimal 100 karakter.'
    }

    errors.value = errs
    return Object.keys(errs).length === 0
}

const saveUnit = async () => {
    if (!validate()) return

    try {
        isSubmitting.value = true
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')

        const payload = {
            code: form.value.code.trim().toUpperCase(),
            name: form.value.name.trim()
        }

        if (isEditing.value) {
            await updateUnit(editId.value, payload)
        } else {
            await createUnit(payload)
        }

        closeModal()
        showSuccess('Berhasil!', `Data satuan unit berhasil ${isEditing.value ? 'diperbarui' : 'disimpan'}.`)
        await fetchUnits(searchQuery.value, isEditing.value ? pagination.value.current_page : 1)
    } catch (error) {
        if (error?.response?.status === 422 && error?.response?.data?.errors) {
            const apiErrors = error.response.data.errors
            errors.value = {
                code: apiErrors.code ? apiErrors.code[0] : '',
                name: apiErrors.name ? apiErrors.name[0] : ''
            }
            showError('Validasi Gagal!', error?.response?.data?.message || 'Mohon periksa kembali isian formulir.')
        } else {
            showError('Gagal Menyimpan!', error?.response?.data?.message || 'Terjadi kesalahan pada sistem saat menyimpan data.', error)
        }
    } finally {
        isSubmitting.value = false
    }
}

const delUnit = async (unit) => {
    const isConfirmed = await showConfirm(
        'Hapus Satuan Unit?',
        `Apakah Anda yakin ingin menghapus "${unit.name}" (${unit.code})? Data yang dihapus tidak dapat dikembalikan.`
    )

    if (isConfirmed) {
        try {
            showLoading('Menghapus Data...', 'Mohon tunggu sebentar.')
            await deleteUnit(unit.id)
            showSuccess('Terhapus!', 'Data satuan unit berhasil dihapus.')
            await fetchUnits(searchQuery.value, pagination.value.current_page)
        } catch (error) {
            const errMsg = error?.response?.data?.message || 'Terjadi kesalahan saat menghapus data satuan unit.'
            showError('Gagal Menghapus!', errMsg, error)
        }
    }
}

const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- PAGE HEADER -->
        <PageHeader 
            title="Satuan Barang (Units)"
            description="Kelola master data satuan ukuran barang untuk pengadaan, inventaris, dan transaksi (misal: PCS, BOX, KG, LTR, METER)."
        >
            <template #icon>
                <Scale class="w-7 h-7 text-indigo-600" />
            </template>
            <template #actions>
                <BaseButton @click="openModal()">
                    <Plus class="w-4 h-4" />
                    Tambah Satuan
                </BaseButton>
            </template>
        </PageHeader>

        <!-- MAIN CARD -->
        <div class="bg-white rounded-2xl shadow-xs border border-gray-100 flex flex-col overflow-hidden">
            <!-- TOOLBAR: SEARCH & REFRESH -->
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="w-full sm:max-w-md">
                    <SearchInput 
                        v-model="searchQuery" 
                        placeholder="Cari kode atau nama satuan (e.g. PCS, KG)..." 
                    />
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <span class="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-xl bg-white border border-gray-200/80 shadow-2xs">
                        Total: <span class="text-indigo-600 font-bold">{{ pagination.total }}</span> Satuan
                    </span>
                    <button
                        type="button"
                        @click="fetchUnits(searchQuery, pagination.current_page)"
                        :disabled="isLoading"
                        class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-colors disabled:opacity-50"
                        title="Segarkan Data"
                    >
                        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                    </button>
                </div>
            </div>

            <!-- TABLE VIEW -->
            <BaseTable :columns="tableColumns">
                <tr v-if="isLoading" class="animate-pulse">
                    <td colspan="5" class="px-6 py-12 text-center text-sm text-gray-400">
                        <div class="inline-flex items-center gap-2">
                            <RefreshCw class="w-4 h-4 animate-spin text-indigo-600" />
                            Memuat data satuan unit...
                        </div>
                    </td>
                </tr>

                <tr v-else-if="units.length === 0">
                    <td colspan="5" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-gray-400 space-y-3">
                            <div class="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <Scale class="w-8 h-8 text-gray-300" />
                            </div>
                            <div class="text-sm font-semibold text-gray-700">
                                {{ searchQuery ? 'Tidak ada satuan yang cocok dengan pencarian' : 'Belum ada data satuan unit' }}
                            </div>
                            <p class="text-xs text-gray-400">
                                {{ searchQuery ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Klik tombol "Tambah Satuan" untuk menambahkan satuan ukuran baru.' }}
                            </p>
                            <BaseButton v-if="!searchQuery" size="sm" @click="openModal()">
                                <Plus class="w-4 h-4" />
                                Tambah Satuan Pertama
                            </BaseButton>
                        </div>
                    </td>
                </tr>

                <tr 
                    v-for="(unit, index) in units" 
                    :key="unit.id" 
                    class="hover:bg-gray-50/80 transition-colors group"
                >
                    <!-- NO -->
                    <td class="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-400 text-center">
                        {{ ((pagination.current_page - 1) * (pagination.per_page || 10)) + index + 1 }}
                    </td>

                    <!-- CODE -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/80 shadow-2xs">
                            {{ unit.code || '-' }}
                        </span>
                    </td>

                    <!-- NAME -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-bold text-gray-900">
                            {{ unit.name || '-' }}
                        </div>
                    </td>

                    <!-- CREATED AT -->
                    <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                        {{ formatDate(unit.created_at) }}
                    </td>

                    <!-- ACTIONS -->
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-1.5">
                            <button 
                                @click="openModal(unit)" 
                                class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" 
                                title="Edit Satuan"
                            >
                                <Edit class="w-4 h-4" />
                            </button>
                            <button 
                                @click="delUnit(unit)" 
                                class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" 
                                title="Hapus Satuan"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
            </BaseTable>

            <!-- PAGINATION -->
            <Pagination 
                :pagination="pagination"
                @change-page="(page) => fetchUnits(searchQuery, page)"
            />
        </div>

        <!-- MODAL FORM (CREATE / EDIT) -->
        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                    <!-- MODAL HEADER -->
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Scale class="w-5 h-5" />
                            </div>
                            <h3 class="text-base sm:text-lg font-bold text-gray-900">
                                {{ isEditing ? 'Edit Satuan Ukuran' : 'Tambah Satuan Baru' }}
                            </h3>
                        </div>
                        <button 
                            @click="closeModal" 
                            class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors"
                        >
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <!-- MODAL BODY -->
                    <form @submit.prevent="saveUnit" class="px-6 py-6 space-y-4 overflow-y-auto">
                        <div>
                            <BaseInput 
                                v-model="form.code"
                                label="Kode Satuan (Unit Code)"
                                placeholder="e.g. PCS, KG, BOX, METER"
                                :error="errors.code"
                                required
                            />
                            <p class="text-[11px] text-gray-400 mt-1">
                                Kode unik satuan (otomatis dikonversi ke huruf kapital).
                            </p>
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.name"
                                label="Nama Satuan (Unit Name)"
                                placeholder="e.g. Pieces, Kilogram, Box, Meter"
                                :error="errors.name"
                                required
                            />
                            <p class="text-[11px] text-gray-400 mt-1">
                                Nama lengkap atau deskriptif satuan ukuran.
                            </p>
                        </div>
                    </form>

                    <!-- MODAL FOOTER -->
                    <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton 
                            variant="secondary" 
                            @click="closeModal"
                            :disabled="isSubmitting"
                        >
                            Batal
                        </BaseButton>
                        <BaseButton 
                            @click="saveUnit"
                            :disabled="isSubmitting"
                        >
                            <Check class="w-4 h-4" />
                            {{ isEditing ? 'Perbarui Satuan' : 'Simpan Satuan' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
