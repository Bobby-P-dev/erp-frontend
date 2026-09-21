<script setup>
import { ref, onMounted, watch } from 'vue'
import { 
    FileText, 
    Plus, 
    Trash2, 
    CheckCircle, 
    Clock, 
    AlertTriangle, 
    X, 
    Check, 
    ShieldCheck, 
    UploadCloud 
} from '@lucide/vue'
import { 
    getSupplierDocuments, 
    createSupplierDocument, 
    deleteSupplierDocument,
    verifySupplierDocument 
} from '../../../../../services/supplierServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../../../utils/swal.js'
import BaseButton from '../../../../../components/ui/BaseButton.vue'
import BaseInput from '../../../../../components/ui/BaseInput.vue'
import BaseTable from '../../../../../components/ui/BaseTable.vue'
import SearchInput from '../../../../../components/ui/SearchInput.vue'

const props = defineProps({
    supplier: {
        type: Object,
        required: true
    }
})

const documents = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
let searchTimeout = null

const showModal = ref(false)
const isSubmitting = ref(false)
const errors = ref({})

const documentTypes = [
    { value: 'NIB', label: 'Nomor Induk Berusaha (NIB)' },
    { value: 'NPWP', label: 'Nomor Pokok Wajib Pajak (NPWP)' },
    { value: 'SIUP', label: 'Surat Izin Usaha Perdagangan (SIUP)' },
    { value: 'SPPKP', label: 'Surat Pengukuhan Pengusaha Kena Pajak' },
    { value: 'ISO_CERTIFICATE', label: 'ISO / Quality Certificate' },
    { value: 'BANK_STATEMENT', label: 'Rekening Koran / Bank Statement' },
    { value: 'OTHER', label: 'Dokumen Legal Lainnya' }
]

const form = ref({
    document_type: 'NIB',
    document_number: '',
    file_id: 1, // Default to file_id from backend storage
    file_name: '',
    has_no_expiry: false,
    issue_date: '',
    expiry_date: '',
    notes: ''
})

const tableColumns = [
    { key: 'type', label: 'Document Type' },
    { key: 'number', label: 'Document Number' },
    { key: 'issue_date', label: 'Issue Date' },
    { key: 'expiry_date', label: 'Expiry Date' },
    { key: 'verification', label: 'Verification' },
    { key: 'notes', label: 'Notes' },
    { key: 'actions', label: 'Actions', class: 'text-right' }
]

const fetchDocuments = async () => {
    if (!props.supplier?.id) return
    try {
        isLoading.value = true
        const response = await getSupplierDocuments(searchQuery.value, 1, {
            supplier_id: props.supplier.id
        })
        documents.value = response.data || []
    } catch (error) {
        showError('Error', 'Gagal memuat dokumen supplier.', error)
    } finally {
        isLoading.value = false
    }
}

watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchDocuments()
    }, 400)
})

watch(() => props.supplier?.id, () => {
    fetchDocuments()
})

onMounted(() => {
    fetchDocuments()
})

const openModal = () => {
    errors.value = {}
    form.value = {
        document_type: 'NIB',
        document_number: '',
        file_id: 1,
        file_name: '',
        has_no_expiry: false,
        issue_date: '',
        expiry_date: '',
        notes: ''
    }
    showModal.value = true
}

const closeModal = () => {
    showModal.value = false
}

const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
        form.value.file_name = file.name
        // In real environment linked to files table ID or default 1
    }
}

const handleSave = async () => {
    errors.value = {}

    if (!form.value.document_number.trim() || !form.value.document_type) {
        showError('Validasi Gagal', 'Mohon lengkapi Jenis Dokumen dan Nomor Dokumen.')
        return
    }

    if (!form.value.file_id) {
        showError('Validasi Gagal', 'File ID harus ditentukan sesuai sistem backend.')
        return
    }

    try {
        isSubmitting.value = true
        showLoading('Menyimpan Dokumen...', 'Mohon tunggu sebentar.')

        const payload = {
            supplier_id: props.supplier.id,
            file_id: Number(form.value.file_id),
            document_type: form.value.document_type,
            document_number: form.value.document_number.trim(),
            issue_date: form.value.issue_date || null,
            expiry_date: (!form.value.has_no_expiry && form.value.expiry_date) ? form.value.expiry_date : null,
            notes: form.value.notes ? form.value.notes.trim() : null
        }

        await createSupplierDocument(payload)
        closeModal()
        showSuccess('Berhasil!', 'Dokumen supplier berhasil didaftarkan.')
        fetchDocuments()
    } catch (error) {
        if (error.response?.status === 422 && error.response?.data?.errors) {
            errors.value = error.response.data.errors
            showError('Validasi Gagal', 'Silakan periksa kembali field input Anda.')
        } else {
            const errorMsg = error.response?.data?.message || 'Gagal menyimpan dokumen.'
            showError('Gagal Menyimpan!', errorMsg, error)
        }
    } finally {
        isSubmitting.value = false
    }
}

const handleVerify = async (doc) => {
    const isConfirmed = await showConfirm(
        'Verifikasi Dokumen Legal?',
        `Konfirmasi verifikasi kelayakan dokumen ${doc.document_type} (${doc.document_number}).`
    )

    if (isConfirmed) {
        try {
            showLoading('Memverifikasi...', 'Mohon tunggu sebentar.')
            await verifySupplierDocument(doc.id, { notes: 'Verified via ERP Compliance' })
            showSuccess('Terverifikasi!', 'Dokumen berhasil diverifikasi.')
            fetchDocuments()
        } catch (error) {
            showError('Gagal!', error.response?.data?.message || 'Gagal memverifikasi dokumen.', error)
        }
    }
}

const handleDelete = async (doc) => {
    const isConfirmed = await showConfirm(
        'Hapus Dokumen?',
        `Apakah Anda yakin ingin menghapus dokumen "${doc.document_type} - ${doc.document_number}"?`
    )

    if (isConfirmed) {
        try {
            showLoading('Menghapus Dokumen...', 'Mohon tunggu sebentar.')
            await deleteSupplierDocument(doc.id)
            showSuccess('Berhasil!', 'Dokumen berhasil dihapus.')
            fetchDocuments()
        } catch (error) {
            showError('Gagal!', error.response?.data?.message || 'Gagal menghapus dokumen.', error)
        }
    }
}

const isExpired = (expiryDate) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
}
</script>

<template>
    <div class="space-y-6">
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <!-- Header Toolbar -->
            <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
                <div class="w-full sm:max-w-xs">
                    <SearchInput v-model="searchQuery" placeholder="Search documents..." />
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <BaseButton @click="openModal()" class="w-full sm:w-auto">
                        <Plus class="w-4 h-4" />
                        Upload Document
                    </BaseButton>
                </div>
            </div>

            <!-- Table -->
            <BaseTable :columns="tableColumns">
                <tr v-for="doc in documents" :key="doc.id" class="hover:bg-gray-50/80 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {{ doc.document_type }}
                        </span>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-mono text-sm font-bold text-gray-900">{{ doc.document_number }}</div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-600">{{ doc.issue_date || '-' }}</div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <div v-if="doc.expiry_date">
                            <span 
                                class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded"
                                :class="isExpired(doc.expiry_date) ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-gray-700'"
                            >
                                <AlertTriangle v-if="isExpired(doc.expiry_date)" class="w-3 h-3" />
                                {{ doc.expiry_date }}
                                <span v-if="isExpired(doc.expiry_date)">(Expired)</span>
                            </span>
                        </div>
                        <span v-else class="text-xs text-gray-400 font-medium">Lifetime / No Expiry</span>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap">
                        <span 
                            v-if="doc.is_verified"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        >
                            <CheckCircle class="w-3.5 h-3.5 text-emerald-600" />
                            Verified
                        </span>
                        <span 
                            v-else
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                        >
                            <Clock class="w-3.5 h-3.5 text-amber-600" />
                            Pending Review
                        </span>
                    </td>

                    <td class="px-6 py-4">
                        <div class="text-xs text-gray-500 max-w-xs truncate">{{ doc.notes || '-' }}</div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-1.5">
                            <button 
                                v-if="!doc.is_verified"
                                @click="handleVerify(doc)" 
                                class="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                title="Verify Document"
                            >
                                <ShieldCheck class="w-4 h-4" />
                            </button>
                            <button 
                                @click="handleDelete(doc)" 
                                class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Delete Document"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>

                <!-- Loading state -->
                <tr v-if="isLoading">
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                        <div class="text-sm font-medium text-gray-600">Loading documents...</div>
                    </td>
                </tr>

                <!-- Empty state -->
                <tr v-else-if="documents.length === 0">
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <FileText class="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <div class="text-base font-semibold text-gray-800">No legal documents registered</div>
                        <p class="text-sm text-gray-400 mt-1">Upload supplier verification documents (NIB, SIUP, NPWP, certifications).</p>
                        <BaseButton @click="openModal()" class="mt-4" size="sm">
                            <Plus class="w-4 h-4" />
                            Add Legal Document
                        </BaseButton>
                    </td>
                </tr>
            </BaseTable>
        </div>

        <!-- Add Modal -->
        <Teleport to="body">
            <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                <div class="fixed inset-0 bg-gray-900/40 transition-opacity" @click="closeModal"></div>

                <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <FileText class="w-5 h-5" />
                            </div>
                            <h3 class="text-lg font-bold text-gray-900">Upload Supplier Document</h3>
                        </div>
                        <button @click="closeModal" class="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                            <X class="w-5 h-5" />
                        </button>
                    </div>

                    <div class="px-6 py-6 space-y-4 overflow-y-auto">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1.5">Document Type <span class="text-rose-500">*</span></label>
                            <select
                                v-model="form.document_type"
                                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-700"
                            >
                                <option v-for="t in documentTypes" :key="t.value" :value="t.value">
                                    {{ t.label }}
                                </option>
                            </select>
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.document_number"
                                label="Document Number"
                                placeholder="e.g. 0123456789 (NIB / SIUP / Tax Reg No)"
                                :error="errors.document_number?.[0] || errors.document_number"
                                required
                            />
                        </div>

                        <!-- File Input -->
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1.5">Attach Document File</label>
                            <div class="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-indigo-300 transition-colors bg-gray-50/50">
                                <UploadCloud class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <div class="text-xs text-gray-500 mb-2">
                                    <span v-if="form.file_name" class="font-semibold text-indigo-600">{{ form.file_name }}</span>
                                    <span v-else>Upload PDF, PNG, or JPEG (Max 10MB)</span>
                                </div>
                                <input 
                                    type="file" 
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    @change="handleFileSelect"
                                    class="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <BaseInput 
                                    v-model="form.issue_date"
                                    type="date"
                                    label="Issue Date"
                                />
                            </div>

                            <div>
                                <BaseInput 
                                    v-model="form.expiry_date"
                                    type="date"
                                    label="Expiry Date"
                                    :disabled="form.has_no_expiry"
                                    :error="errors.expiry_date?.[0] || errors.expiry_date"
                                />
                            </div>
                        </div>

                        <div class="flex items-center gap-2 pt-1">
                            <input 
                                id="no_expiry" 
                                type="checkbox" 
                                v-model="form.has_no_expiry"
                                class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                            <label for="no_expiry" class="text-xs font-medium text-gray-700 cursor-pointer">
                                Dokumen berlaku seumur hidup (Tanpa batas kedaluwarsa)
                            </label>
                        </div>

                        <div>
                            <BaseInput 
                                v-model="form.notes"
                                label="Notes / Remarks"
                                placeholder="e.g. Valid registered document"
                            />
                        </div>
                    </div>

                    <div class="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <BaseButton variant="secondary" @click="closeModal" :disabled="isSubmitting">
                            Cancel
                        </BaseButton>
                        <BaseButton @click="handleSave" :disabled="isSubmitting">
                            <Check class="w-4 h-4" />
                            {{ isSubmitting ? 'Saving...' : 'Save Document' }}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
