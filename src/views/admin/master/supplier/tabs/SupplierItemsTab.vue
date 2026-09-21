<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { 
    Package, 
    Plus, 
    Edit, 
    Trash2, 
    ExternalLink, 
    X, 
    Check, 
    Search,
    AlertCircle 
} from '@lucide/vue'
import { 
    getSupplierItems, 
    createSupplierItem, 
    updateSupplierItem, 
    deleteSupplierItem 
} from '../../../../../services/supplierServices.js'
import { searchItems } from '../../../../../services/itemServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../../../utils/swal.js'
import BaseButton from '../../../../../components/ui/BaseButton.vue'
import BaseInput from '../../../../../components/ui/BaseInput.vue'
import BaseTable from '../../../../../components/ui/BaseTable.vue'
import ToggleSwitch from '../../../../../components/ui/ToggleSwitch.vue'
import SearchInput from '../../../../../components/ui/SearchInput.vue'
import StatusBadge from '../../../../../components/ui/StatusBadge.vue'
import SearchableSelect from '../../../../../components/ui/SearchableSelect.vue'

const props = defineProps({
    supplier: {
        type: Object,
        required: true
    }
})

const supplierItems = ref([])
const masterItemsList = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedStatus = ref('')
let searchTimeout = null

const itemOptions = computed(() => {
    return masterItemsList.value.map(i => ({
        value: i.id,
        label: `${i.code} - ${i.name}`
    }))
})

const fetchMasterItems = async (query = '') => {
    try {
        const response = await searchItems(query, 50)
        masterItemsList.value = response.data || []
    } catch (error) {
        console.error('Failed to load master items', error)
    }
}

const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)
const isSubmitting = ref(false)
const errors = ref({})

const form = ref({
    item_id: '',
    supplier_item_code: '',
    supplier_item_name: '',
    reference_url: '',
    default_price: '',
    currency: 'IDR',
    minimum_order_quantity: 1,
    lead_time_days: 7,
    is_active: true
})

const tableColumns = [
    { key: 'internal_item', label: 'Internal Item (Canonical)' },
    { key: 'supplier_item_code', label: 'Supplier Item Code' },
    { key: 'supplier_item_name', label: 'Supplier Item Name' },
    { key: 'default_price', label: 'Reference Price' },
    { key: 'moq', label: 'MOQ' },
    { key: 'lead_time', label: 'Lead Time' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const fetchItems = async () => {
    if (!props.supplier?.id) return
    try {
        isLoading.value = true
        const filter = {
            supplier_id: props.supplier.id
        }
        if (selectedStatus.value !== '') {
            filter.is_active = selectedStatus.value
        }

        const response = await getSupplierItems(searchQuery.value, 1, filter)
        supplierItems.value = response.data || []
    } catch (error) {
        showError('Error', 'Gagal memuat katalog barang supplier.', error)
    } finally {
        isLoading.value = false
    }
}

watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchItems()
    }, 400)
})

watch(selectedStatus, () => {
    fetchItems()
})

watch(() => props.supplier?.id, () => {
    fetchItems()
})

onMounted(() => {
    fetchItems()
    fetchMasterItems()
})

const openModal = (supplierItem = null) => {
    errors.value = {}
    if (supplierItem && supplierItem.id) {
        isEditing.value = true
        editId.value = supplierItem.id
        form.value = {
            item_id: supplierItem.item_id || supplierItem.item?.id || '',
            supplier_item_code: supplierItem.supplier_item_code || '',
            supplier_item_name: supplierItem.supplier_item_name || '',
            reference_url: supplierItem.reference_url || '',
            default_price: supplierItem.default_price !== null ? supplierItem.default_price : '',
            currency: supplierItem.currency || 'IDR',
            minimum_order_quantity: supplierItem.minimum_order_quantity !== null ? supplierItem.minimum_order_quantity : 1,
            lead_time_days: supplierItem.lead_time_days ?? 7,
            is_active: supplierItem.is_active ?? true
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = {
            item_id: '',
            supplier_item_code: '',
            supplier_item_name: '',
            reference_url: '',
            default_price: '',
            currency: 'IDR',
            minimum_order_quantity: 1,
            lead_time_days: props.supplier?.lead_time_days || 7,
            is_active: true
        }
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
    isEditing.value = false
    editId.value = null
}

const handleSave = async () => {
    errors.value = {}

    if (!form.value.item_id) {
        showError('Validasi Gagal', 'Internal Item ID wajib ditentukan.')
        return
    }

    try {
        isSubmitting.value = true
        showLoading('Menyimpan Item Supplier...', 'Mohon tunggu sebentar.')

        const payload = {
            supplier_id: props.supplier.id,
            item_id: Number(form.value.item_id),
            supplier_item_code: form.value.supplier_item_code ? form.value.supplier_item_code.trim() : null,
            supplier_item_name: form.value.supplier_item_name ? form.value.supplier_item_name.trim() : null,
            reference_url: form.value.reference_url ? form.value.reference_url.trim() : null,
            default_price: form.value.default_price !== '' ? Number(form.value.default_price) : null,
            currency: form.value.currency || 'IDR',
            minimum_order_quantity: form.value.minimum_order_quantity !== '' ? Number(form.value.minimum_order_quantity) : null,
            lead_time_days: form.value.lead_time_days !== '' ? Number(form.value.lead_time_days) : null,
            is_active: Boolean(form.value.is_active)
        }

        if (isEditing.value) {
            await updateSupplierItem(editId.value, payload)
        } else {
            await createSupplierItem(payload)
        }

        closeModal()
        showSuccess('Berhasil!', `Item supplier berhasil ${isEditing.value ? 'diperbarui' : 'dipetakan'}.`)
        fetchItems()
    } catch (error) {
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors
            const msg = error.response.data.errors?.item_id?.[0] || 'Validasi gagal, silakan periksa data input.'
            showError('Validasi Gagal', msg)
        } else {
            const errorMsg = error.response?.data?.message || 'Gagal menyimpan pemetaan item supplier.'
            showError('Gagal Menyimpan!', errorMsg, error)
        }
    } finally {
        isSubmitting.value = false
    }
}

const handleDelete = async (supplierItem) => {
    const itemName = supplierItem.supplier_item_name || supplierItem.item?.name || 'Item'
    const isConfirmed = await showConfirm(
        'Hapus Pemetaan Item?',
        `Apakah Anda yakin ingin menghapus item "${itemName}" dari supplier ini?`
    )

    if (isConfirmed) {
        try {
            showLoading('Menghapus Item...', 'Mohon tunggu sebentar.')
            await deleteSupplierItem(supplierItem.id)
            showSuccess('Berhasil!', 'Pemetaan item berhasil dihapus.')
            fetchItems()
        } catch (error) {
            showError('Gagal!', error.response?.data?.message || 'Gagal menghapus item.', error)
        }
    }
}

const formatCurrency = (amount, currency = 'IDR') => {
    if (amount === null || amount === undefined || isNaN(amount)) return '-'
    const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount)
    return `${currency} ${formatted}`
}
</script>

<template>
    <div class="space-y-6">
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <!-- Header Toolbar -->
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="flex items-center gap-3 w-full sm:w-auto flex-1">
                    <div class="w-full sm:max-w-xs">
                        <SearchInput v-model="searchQuery" placeholder="Search item name / code..." />
                    </div>

                    <div class="w-full sm:w-40">
                        <select
                            v-model="selectedStatus"
                            class="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-gray-700"
                        >
                            <option value="">All Status</option>
                            <option value="1">Active</option>
                            <option value="0">Inactive</option>
                        </select>
                    </div>
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Map New Item
                    </BaseButton>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns">
                <tr v-for="sItem in supplierItems" :key="sItem.id" class="hover:bg-gray-50/80 transition-colors">
                    <td class="px-6 py-4">
                        <div class="font-bold text-gray-900">{{ sItem.item?.name || `Item ID #${sItem.item_id}` }}</div>
                        <div class="text-xs font-mono text-gray-400 mt-0.5">
                            {{ sItem.item?.code || `ID: ${sItem.item_id}` }}
                        </div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                            {{ sItem.supplier_item_code || '-' }}
                        </span>
                    </td>

                    <td class="px-6 py-4">
                        <div class="text-sm font-medium text-gray-800">
                            {{ sItem.supplier_item_name || sItem.item?.name || '-' }}
                        </div>
                        <a 
                            v-if="sItem.reference_url" 
                            :href="sItem.reference_url" 
                            target="_blank" 
                            class="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline mt-0.5"
                        >
                            <span>Product Link</span>
                            <ExternalLink class="w-3 h-3" />
                        </a>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-semibold text-sm text-gray-900">
                            {{ formatCurrency(sItem.default_price, sItem.currency) }}
                        </div>
                        <div class="text-[10px] text-gray-400 font-medium uppercase">Reference Price</div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-xs font-medium text-gray-700">
                            {{ sItem.minimum_order_quantity !== null ? sItem.minimum_order_quantity : '-' }}
                        </span>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-xs font-medium text-gray-700">
                            {{ sItem.lead_time_days !== null ? `${sItem.lead_time_days} Days` : '-' }}
                        </span>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <StatusBadge :isActive="Boolean(sItem.is_active)" />
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-1.5">
                            <button 
                                @click="openModal(sItem)" 
                                class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="Edit Item Mapping"
                            >
                                <Edit class="w-4 h-4" />
                            </button>
                            <button 
                                @click="handleDelete(sItem)" 
                                class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Delete Item Mapping"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>

                <!-- Loading state -->
                <tr v-if="isLoading">
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                        <div class="text-sm font-medium text-gray-600">Loading mapped items...</div>
                    </td>
                </tr>

                <!-- Empty state -->
                <tr v-else-if="supplierItems.length === 0">
                    <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                        <Package class="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <div class="text-base font-semibold text-gray-800">No items mapped to this supplier</div>
                        <p class="text-sm text-gray-400 mt-1">Map internal inventory items with this supplier's catalog codes and reference prices.</p>
                        <BaseButton @click="openModal()" class="mt-4" size="sm">
                            <Plus class="w-4 h-4" />
                            Map First Item
                        </BaseButton>
                    </td>
                </tr>
            </BaseTable>
        </div>

        <!-- Add/Edit Modal -->
        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/40 transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Package class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">
                                {{ isEditing ? 'Edit Supplier Item' : 'Map Item to Supplier' }}
                            </h3>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 space-y-4 overflow-y-auto">
                        <div class="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 leading-relaxed">
                            <div class="font-bold flex items-center gap-1.5 mb-1">
                                <AlertCircle class="w-4 h-4 text-indigo-600" />
                                <span>Internal Item Mapping</span>
                            </div>
                            Pemetaan ini menghubungkan Master Barang Internal dengan kode & harga referensi khusus supplier.
                        </div>

                        <div>
                            <SearchableSelect 
                                v-model="form.item_id"
                                label="Internal Master Item"
                                :options="itemOptions"
                                placeholder="Pilih atau cari Master Item..."
                                @search="fetchMasterItems"
                                required
                            />
                            <span v-if="errors.item_id" class="text-xs text-rose-500 mt-1 block">
                                {{ errors.item_id?.[0] || errors.item_id }}
                            </span>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <BaseInput 
                                    v-model="form.supplier_item_code"
                                    label="Supplier Item Code"
                                    placeholder="e.g. KS-SHT-A36"
                                />
                            </div>

                            <div>
                                <BaseInput 
                                    v-model="form.supplier_item_name"
                                    label="Supplier Item Name"
                                    placeholder="e.g. Hot Rolled Steel A36"
                                />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <BaseInput 
                                    v-model.number="form.default_price"
                                    type="number"
                                    step="0.01"
                                    label="Reference Price (Master)"
                                    placeholder="e.g. 150000"
                                />
                            </div>

                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1.5">Currency</label>
                                <select
                                    v-model="form.currency"
                                    class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-700"
                                >
                                    <option value="IDR">IDR (Rupiah)</option>
                                    <option value="USD">USD (US Dollar)</option>
                                    <option value="SGD">SGD (Singapore Dollar)</option>
                                    <option value="JPY">JPY (Japanese Yen)</option>
                                    <option value="EUR">EUR (Euro)</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <BaseInput 
                                    v-model.number="form.minimum_order_quantity"
                                    type="number"
                                    step="any"
                                    label="Min. Order Qty (MOQ)"
                                    placeholder="e.g. 10.5"
                                />
                            </div>

                            <div>
                                <BaseInput 
                                    v-model.number="form.lead_time_days"
                                    type="number"
                                    label="Lead Time (Days)"
                                    placeholder="e.g. 7"
                                />
                            </div>
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.reference_url"
                                label="Product Catalog URL"
                                placeholder="https://supplier.com/products/item-123"
                                :error="errors.reference_url?.[0] || errors.reference_url"
                            />
                        </div>

                        <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                            <div>
                                <div class="text-sm font-bold text-gray-800">Active Status</div>
                                <div class="text-xs text-gray-400 mt-0.5">Enable item for RFQ and PO selection</div>
                            </div>
                            <ToggleSwitch v-model="form.is_active" />
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal" :disabled="isSubmitting">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="handleSave" :disabled="isSubmitting">
                            <Check class="w-4 h-4" />
                            {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update Item' : 'Map Item') }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
