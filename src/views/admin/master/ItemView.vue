<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { 
    Package, 
    Plus, 
    Edit, 
    Trash2, 
    X, 
    Check, 
    Layers, 
    Tag, 
    SlidersHorizontal, 
    RefreshCw,
    AlertCircle
} from '@lucide/vue'
import { 
    getItems, 
    createItem, 
    updateItem, 
    deleteItem 
} from '../../../services/itemServices.js'
import { searchUnits } from '../../../services/unitServices.js'
import { searchAccountingAccounts } from '../../../services/accountingAccountServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal.js'
import PageHeader from '../../../components/ui/PageHeader.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'
import SearchableSelect from '../../../components/ui/SearchableSelect.vue'

// ==========================================
// STATE
// ==========================================
const items = ref([])
const unitsList = ref([])
const accountsList = ref([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const errors = ref({})

const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0
})

const searchQuery = ref('')
const selectedTypeFilter = ref('')
const selectedUnitFilter = ref('')
let searchTimeout = null

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)

const itemTypeOptions = [
    { value: 'Raw Material', label: 'Raw Material' },
    { value: 'Finished Goods', label: 'Finished Goods' },
    { value: 'Consumable', label: 'Consumable' },
    { value: 'Spare Part', label: 'Spare Part' },
    { value: 'Service', label: 'Service' }
]

const form = ref({
    code: '',
    name: '',
    description: '',
    item_type: 'Raw Material',
    unit_id: null,
    accounting_account_id: null
})

const tableColumns = [
    { key: 'code', label: 'Kode Item' },
    { key: 'name', label: 'Nama Item' },
    { key: 'item_type', label: 'Tipe' },
    { key: 'unit', label: 'Satuan (Unit)' },
    { key: 'accounting', label: 'Akun Akuntansi' },
    { key: 'actions', label: 'Aksi', class: 'text-right' }
]

// ==========================================
// COMPUTED OPTIONS
// ==========================================
const unitOptions = computed(() => {
    return unitsList.value.map(u => ({
        value: u.id,
        label: `${u.code} - ${u.name}`
    }))
})

const accountOptions = computed(() => {
    return accountsList.value.map(a => ({
        value: a.id,
        label: `${a.code} - ${a.name}`
    }))
})

// ==========================================
// DATA FETCHING
// ==========================================
const fetchUnits = async (query = '') => {
    try {
        const response = await searchUnits(query, 50)
        unitsList.value = response.data || []
    } catch (error) {
        console.error('Failed to load units', error)
    }
}

const fetchAccounts = async (query = '') => {
    try {
        const response = await searchAccountingAccounts(query)
        accountsList.value = response.data || []
    } catch (error) {
        console.error('Failed to load accounting accounts', error)
    }
}

const fetchItems = async (page = 1) => {
    try {
        isLoading.value = true
        const filter = {}
        if (selectedTypeFilter.value) {
            filter.item_type = selectedTypeFilter.value
        }
        if (selectedUnitFilter.value) {
            filter.unit_id = selectedUnitFilter.value
        }

        const response = await getItems(searchQuery.value, page, filter)
        items.value = response.data || []

        const meta = response.meta || response
        pagination.value = {
            current_page: meta.current_page || 1,
            last_page: meta.last_page || 1,
            from: meta.from || 0,
            to: meta.to || 0,
            total: meta.total || 0
        }
    } catch (error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan saat memuat data item.', error)
    } finally {
        isLoading.value = false
    }
}

const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.value.last_page) {
        fetchItems(newPage)
    }
}

// ==========================================
// WATCHERS
// ==========================================
watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchItems(1)
    }, 400)
})

watch([selectedTypeFilter, selectedUnitFilter], () => {
    fetchItems(1)
})

onMounted(() => {
    fetchItems()
    fetchUnits()
    fetchAccounts()
})

// ==========================================
// MODAL & CRUD ACTIONS
// ==========================================
const openModal = (item = null) => {
    errors.value = {}
    if (item && item.id) {
        isEditing.value = true
        editId.value = item.id
        form.value = {
            code: item.code || '',
            name: item.name || '',
            description: item.description || '',
            item_type: item.item_type || 'Raw Material',
            unit_id: item.unit_id ?? item.unit?.id ?? null,
            accounting_account_id: item.accounting_account_id ?? item.accounting_account?.id ?? null
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = {
            code: '',
            name: '',
            description: '',
            item_type: 'Raw Material',
            unit_id: null,
            accounting_account_id: null
        }
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
    isEditing.value = false
    editId.value = null
    errors.value = {}
}

const saveItem = async () => {
    errors.value = {}

    if (!form.value.code?.trim()) {
        errors.value.code = 'Kode item wajib diisi.'
    }
    if (!form.value.name?.trim()) {
        errors.value.name = 'Nama item wajib diisi.'
    }
    if (!form.value.item_type) {
        errors.value.item_type = 'Tipe item wajib dipilih.'
    }

    if (Object.keys(errors.value).length > 0) {
        return
    }

    const payload = {
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        description: form.value.description?.trim() || null,
        item_type: form.value.item_type,
        unit_id: form.value.unit_id ? Number(form.value.unit_id) : null,
        accounting_account_id: form.value.accounting_account_id ? Number(form.value.accounting_account_id) : null
    }

    try {
        isSubmitting.value = true
        showLoading(isEditing.value ? 'Memperbarui data...' : 'Menyimpan data...')

        if (isEditing.value) {
            await updateItem(editId.value, payload)
            showSuccess('Berhasil!', 'Data item berhasil diperbarui.')
        } else {
            await createItem(payload)
            showSuccess('Berhasil!', 'Item baru berhasil ditambahkan.')
        }

        closeModal()
        fetchItems(pagination.value.current_page)
    } catch (error) {
        if (error.response?.data?.errors) {
            errors.value = error.response.data.errors
            showError('Validasi Gagal!', error.response.data.message || 'Periksa kembali data yang dimasukkan.')
        } else {
            showError('Gagal!', error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.', error)
        }
    } finally {
        isSubmitting.value = false
    }
}

const deleteItemAction = async (item) => {
    const confirmed = await showConfirm(
        'Hapus Item?',
        `Apakah Anda yakin ingin menghapus item "${item.name}" (${item.code})? Data yang dihapus tidak dapat dikembalikan.`
    )

    if (confirmed) {
        try {
            showLoading('Menghapus item...')
            await deleteItem(item.id)
            showSuccess('Berhasil!', 'Item berhasil dihapus.')
            fetchItems(pagination.value.current_page)
        } catch (error) {
            showError('Gagal!', error.response?.data?.message || 'Gagal menghapus item.', error)
        }
    }
}

// ==========================================
// BADGE STYLING HELPERS
// ==========================================
const getItemTypeBadgeClass = (type) => {
    switch (type) {
        case 'Raw Material':
            return 'bg-amber-50 text-amber-700 border-amber-200'
        case 'Finished Goods':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200'
        case 'Consumable':
            return 'bg-sky-50 text-sky-700 border-sky-200'
        case 'Spare Part':
            return 'bg-purple-50 text-purple-700 border-purple-200'
        case 'Service':
            return 'bg-slate-100 text-slate-700 border-slate-200'
        default:
            return 'bg-gray-50 text-gray-700 border-gray-200'
    }
}
</script>

<template>
    <div class="space-y-6">
        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <PageHeader 
                title="Master Items" 
                description="Kelola data barang/item internal, unit satuan, dan klasifikasi akun akuntansi untuk pengadaan."
            >
                <template #icon>
                    <Package class="w-6 h-6" />
                </template>
            </PageHeader>

            <div class="flex items-center gap-3">
                <BaseButton @click="openModal()" variant="primary">
                    <Plus class="w-4 h-4" />
                    Tambah Item
                </BaseButton>
            </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="w-full md:w-80">
                <SearchInput 
                    v-model="searchQuery" 
                    placeholder="Cari kode, nama, atau deskripsi..." 
                />
            </div>

            <div class="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                <!-- Filter Type -->
                <div class="w-full sm:w-44">
                    <select
                        v-model="selectedTypeFilter"
                        class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-700"
                    >
                        <option value="">Semua Tipe</option>
                        <option 
                            v-for="opt in itemTypeOptions" 
                            :key="opt.value" 
                            :value="opt.value"
                        >
                            {{ opt.label }}
                        </option>
                    </select>
                </div>

                <!-- Filter Unit -->
                <div class="w-full sm:w-44">
                    <select
                        v-model="selectedUnitFilter"
                        class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-700"
                    >
                        <option value="">Semua Satuan</option>
                        <option 
                            v-for="unit in unitsList" 
                            :key="unit.id" 
                            :value="unit.id"
                        >
                            {{ unit.code }} - {{ unit.name }}
                        </option>
                    </select>
                </div>

                <button 
                    @click="fetchItems(1)" 
                    class="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-gray-200 bg-white"
                    title="Refresh Data"
                >
                    <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                </button>
            </div>
        </div>

        <!-- Table Card -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <BaseTable :columns="tableColumns">
                <!-- Data Rows -->
                <tr 
                    v-for="item in items" 
                    :key="item.id" 
                    class="hover:bg-gray-50/60 transition-colors"
                >
                    <!-- Code -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-mono font-bold">
                            <Tag class="w-3 h-3 text-indigo-500" />
                            {{ item.code }}
                        </span>
                    </td>

                    <!-- Name & Description -->
                    <td class="px-6 py-4">
                        <div class="font-bold text-gray-900 text-sm">{{ item.name }}</div>
                        <div v-if="item.description" class="text-xs text-gray-500 mt-0.5 max-w-md line-clamp-1">
                            {{ item.description }}
                        </div>
                    </td>

                    <!-- Item Type -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span 
                            class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                            :class="getItemTypeBadgeClass(item.item_type)"
                        >
                            {{ item.item_type }}
                        </span>
                    </td>

                    <!-- Unit -->
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span 
                            v-if="item.unit" 
                            class="inline-flex items-center px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold"
                        >
                            {{ item.unit.code }}
                        </span>
                        <span v-else class="text-xs text-gray-400 italic">-</span>
                    </td>

                    <!-- Accounting Account -->
                    <td class="px-6 py-4">
                        <div v-if="item.accounting_account" class="text-xs">
                            <span class="font-mono font-semibold text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                {{ item.accounting_account.code }}
                            </span>
                            <span class="text-gray-600 ml-1.5">{{ item.accounting_account.name }}</span>
                        </div>
                        <span v-else class="text-xs text-gray-400 italic">-</span>
                    </td>

                    <!-- Actions -->
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-1.5">
                            <button 
                                @click="openModal(item)" 
                                class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="Edit Item"
                            >
                                <Edit class="w-4 h-4" />
                            </button>
                            <button 
                                @click="deleteItemAction(item)" 
                                class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Hapus Item"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>

                <!-- Loading State -->
                <tr v-if="isLoading">
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                        <div class="text-sm font-medium text-gray-600">Memuat data item...</div>
                    </td>
                </tr>

                <!-- Empty State -->
                <tr v-else-if="items.length === 0">
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                        <Package class="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <div class="text-base font-semibold text-gray-800">Belum ada data item</div>
                        <p class="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                            Mulai tambahkan master item atau barang pengadaan untuk digunakan pada modul Purchasing.
                        </p>
                        <BaseButton @click="openModal()" class="mt-4" size="sm">
                            <Plus class="w-4 h-4" />
                            Tambah Item Pertama
                        </BaseButton>
                    </td>
                </tr>
            </BaseTable>

            <!-- Pagination -->
            <Pagination 
                :pagination="pagination" 
                @change-page="handlePageChange" 
            />
        </div>

        <!-- Create / Edit Modal -->
        <Teleport to="body">
            <div 
                v-if="showModal" 
                class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0"
            >
                <div class="fixed inset-0 bg-gray-900/40 transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                    <!-- Modal Header -->
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Package class="w-5 h-5" />
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-900">
                                    {{ isEditing ? 'Edit Item' : 'Tambah Item Baru' }}
                                </h3>
                                <p class="text-xs text-gray-500 mt-0.5">
                                    {{ isEditing ? 'Perbarui informasi data item master' : 'Masukkan informasi item baru' }}
                                </p>
                            </div>
                        </div>
                        <button 
                            @click="closeModal" 
                            class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors"
                        >
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <!-- Modal Body -->
                    <div class="px-6 py-6 space-y-4 overflow-y-auto">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <!-- Code -->
                            <div>
                                <BaseInput 
                                    v-model="form.code"
                                    label="Kode Item"
                                    placeholder="e.g. ITEM-001"
                                    :error="errors.code?.[0] || errors.code"
                                    required
                                />
                            </div>

                            <!-- Item Type -->
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1.5">
                                    Tipe Item <span class="text-rose-500">*</span>
                                </label>
                                <select
                                    v-model="form.item_type"
                                    class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-gray-900"
                                >
                                    <option 
                                        v-for="opt in itemTypeOptions" 
                                        :key="opt.value" 
                                        :value="opt.value"
                                    >
                                        {{ opt.label }}
                                    </option>
                                </select>
                                <span v-if="errors.item_type" class="text-xs text-rose-500 mt-1 block">
                                    {{ errors.item_type?.[0] || errors.item_type }}
                                </span>
                            </div>
                        </div>

                        <!-- Name -->
                        <div>
                            <BaseInput 
                                v-model="form.name"
                                label="Nama Item"
                                placeholder="e.g. Plat Besi Lembaran 2mm"
                                :error="errors.name?.[0] || errors.name"
                                required
                            />
                        </div>

                        <!-- Unit -->
                        <div>
                            <SearchableSelect 
                                v-model="form.unit_id"
                                label="Satuan (Unit)"
                                :options="unitOptions"
                                placeholder="Pilih Satuan Unit (e.g. PCS, KG, METER)"
                                @search="fetchUnits"
                            />
                            <span v-if="errors.unit_id" class="text-xs text-rose-500 mt-1 block">
                                {{ errors.unit_id?.[0] || errors.unit_id }}
                            </span>
                        </div>

                        <!-- Accounting Account -->
                        <div>
                            <SearchableSelect 
                                v-model="form.accounting_account_id"
                                label="Akun Akuntansi (COA)"
                                :options="accountOptions"
                                placeholder="Pilih Akun Persediaan/Beban (Opsional)"
                                @search="fetchAccounts"
                            />
                            <p class="text-xs text-gray-400 mt-1">
                                Kategori & Subkategori akuntansi akan otomatis disesuaikan dengan akun yang dipilih.
                            </p>
                            <span v-if="errors.accounting_account_id" class="text-xs text-rose-500 mt-1 block">
                                {{ errors.accounting_account_id?.[0] || errors.accounting_account_id }}
                            </span>
                        </div>

                        <!-- Description -->
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1.5">Deskripsi</label>
                            <textarea
                                v-model="form.description"
                                rows="3"
                                placeholder="Catatan atau spesifikasi teknis barang..."
                                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium text-gray-900"
                            ></textarea>
                            <span v-if="errors.description" class="text-xs text-rose-500 mt-1 block">
                                {{ errors.description?.[0] || errors.description }}
                            </span>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div class="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-3">
                        <BaseButton @click="closeModal" variant="secondary" type="button">
                            Batal
                        </BaseButton>
                        <BaseButton @click="saveItem" variant="primary" :disabled="isSubmitting" type="button">
                            {{ isEditing ? 'Simpan Perubahan' : 'Tambah Item' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
