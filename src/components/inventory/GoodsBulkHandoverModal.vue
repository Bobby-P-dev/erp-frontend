<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import SearchableSelect from '../ui/SearchableSelect.vue'
import { getPendingHandoverItems, createBulkGoodsHandover } from '../../services/inventoryServices.js'
import { searchUsers } from '../../services/userServices.js'
import { uploadFile } from '../../services/fileServices.js'
import { generateGoodsHandoverPdf } from '../../utils/pdf/goodsHandoverPdfGenerator.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../utils/swal.js'
import { useAuthStore } from '../../stores/auth.js'
import {
    Boxes,
    Package,
    CheckCircle2,
    Clock,
    Search,
    Printer,
    UploadCloud,
    Trash2,
    FileText,
    AlertTriangle,
    User,
    Building2,
    Calendar,
    Paperclip,
    Check,
    X,
    Info,
    ArrowRight
} from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue', 'close', 'saved'])

const authStore = useAuthStore()
const currentUserName = computed(() => {
    return authStore.user?.name || authStore.profile?.name || 'Petugas Gudang'
})

// 1. Items State
const isLoadingItems = ref(false)
const pendingItems = ref([])
const searchQuery = ref('')
const selectedItemIds = ref(new Set())
const itemQuantities = ref({})
const itemNotes = ref({})

// 2. Recipient State
const recipientType = ref('employee') // 'employee' | 'external'
const selectedUserId = ref('')
const userOptions = ref([])
const isLoadingUsers = ref(false)

const externalRecipient = ref({
    name: '',
    identity_number: '',
    division_name: ''
})

const handoverDate = ref(new Date().toISOString().substring(0, 10))
const handoverNotes = ref('')

// 3. File Proof State
const isUploadingProof = ref(false)
const proofFile = ref(null)
const proofFileId = ref(null)

// 4. Submission State
const isSubmitting = ref(false)

// Fetch pending items
const fetchPendingItems = async () => {
    isLoadingItems.value = true
    try {
        const items = await getPendingHandoverItems()
        pendingItems.value = Array.isArray(items) ? items : []
        
        // Reset selections & prefill quantities
        selectedItemIds.value = new Set()
        const quantities = {}
        const notes = {}
        pendingItems.value.forEach(item => {
            quantities[item.id] = item.remaining_handover_quantity || 1
            notes[item.id] = ''
        })
        itemQuantities.value = quantities
        itemNotes.value = notes
    } catch (err) {
        console.error('Failed to load pending handover items:', err)
        pendingItems.value = []
    } finally {
        isLoadingItems.value = false
    }
}

// Fetch users for recipient picker
const fetchUsers = async (search = '') => {
    isLoadingUsers.value = true
    try {
        const res = await searchUsers(search)
        const userList = res?.data || res || []
        userOptions.value = userList.map(u => {
            const empName = u.employee?.name || u.name || `User #${u.id}`
            const nik = u.employee?.nik ? `NIK: ${u.employee.nik}` : ''
            const div = u.employee?.division?.name ? `(${u.employee.division.name})` : ''
            const subtitle = [nik, div].filter(Boolean).join(' • ')
            return {
                value: u.id,
                label: empName,
                subtitle: subtitle || u.email || 'Karyawan',
                raw: u
            }
        })
    } catch (err) {
        console.error('Failed to load users for handover:', err)
        userOptions.value = []
    } finally {
        isLoadingUsers.value = false
    }
}

// Watch modal visibility
watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        fetchPendingItems()
        fetchUsers()
        // Reset form
        recipientType.value = 'employee'
        selectedUserId.value = ''
        externalRecipient.value = { name: '', identity_number: '', division_name: '' }
        handoverDate.value = new Date().toISOString().substring(0, 10)
        handoverNotes.value = ''
        proofFile.value = null
        proofFileId.value = null
    }
})

// Filtered pending items based on search query
const filteredPendingItems = computed(() => {
    if (!searchQuery.value) return pendingItems.value
    const q = searchQuery.value.toLowerCase().trim()
    return pendingItems.value.filter(it => {
        return (
            (it.item_description || '').toLowerCase().includes(q) ||
            (it.pr_number || '').toLowerCase().includes(q) ||
            (it.grn_number || '').toLowerCase().includes(q) ||
            (it.pr_requester || '').toLowerCase().includes(q) ||
            (it.company_name || '').toLowerCase().includes(q)
        )
    })
})

// Single company check: items selected must belong to the same company
const selectedItemsList = computed(() => {
    return pendingItems.value
        .filter(it => selectedItemIds.value.has(it.id))
        .map(it => ({
            ...it,
            quantity_handed_over: parseFloat(itemQuantities.value[it.id]) || it.remaining_handover_quantity || 1,
            notes: itemNotes.value[it.id] || ''
        }))
})

const selectedCompanies = computed(() => {
    const map = new Map()
    selectedItemsList.value.forEach(it => {
        if (it.company_id) {
            map.set(it.company_id, it.company_name || `Company #${it.company_id}`)
        }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
})

const hasCompanyMismatch = computed(() => {
    return selectedCompanies.value.length > 1
})

const totalSelectedQty = computed(() => {
    return selectedItemsList.value.reduce((sum, it) => sum + (it.quantity_handed_over || 0), 0)
})

// Selection Helpers
const toggleItemSelection = (id) => {
    const next = new Set(selectedItemIds.value)
    if (next.has(id)) {
        next.delete(id)
    } else {
        next.add(id)
    }
    selectedItemIds.value = next
}

const isItemSelected = (id) => selectedItemIds.value.has(id)

const selectAllFiltered = () => {
    const next = new Set(selectedItemIds.value)
    filteredPendingItems.value.forEach(it => next.add(it.id))
    selectedItemIds.value = next
}

const clearAllSelection = () => {
    selectedItemIds.value = new Set()
}

// Selected User Details
const selectedUserObject = computed(() => {
    if (!selectedUserId.value) return null
    const opt = userOptions.value.find(o => o.value == selectedUserId.value)
    return opt?.raw || null
})

// Resolved Recipient Information for PDF & Submission
const resolvedRecipientInfo = computed(() => {
    if (recipientType.value === 'employee') {
        const u = selectedUserObject.value
        if (!u) return { name: '', identity: '', division: '', userId: null }
        return {
            name: u.employee?.name || u.name || `User #${u.id}`,
            identity: u.employee?.nik || '',
            division: u.employee?.division?.name || '',
            userId: u.id
        }
    } else {
        return {
            name: externalRecipient.value.name.trim(),
            identity: externalRecipient.value.identity_number.trim(),
            division: externalRecipient.value.division_name.trim(),
            userId: null
        }
    }
})

// File Upload Handler
const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
        showError('Berkas Terlalu Besar', 'Ukuran berkas bukti tanda tangan maksimal adalah 10MB.')
        return
    }

    isUploadingProof.value = true
    try {
        const res = await uploadFile(file, 'goods_handovers')
        const fileRecord = res.file || res.data || res
        proofFile.value = {
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            url: fileRecord.file_url || null
        }
        proofFileId.value = fileRecord.id
        showSuccess('Berhasil Mengunggah', 'Berkas bukti fisik tanda tangan basah berhasil diunggah.')
    } catch (err) {
        console.error('File upload failed:', err)
        showError('Gagal Mengunggah', 'Tidak dapat mengunggah berkas bukti. Silakan coba kembali.', err)
    } finally {
        isUploadingProof.value = false
    }
}

const removeProofFile = () => {
    proofFile.value = null
    proofFileId.value = null
}

// Print BAST PDF (Before or After submission)
const printBastPdf = async () => {
    if (selectedItemsList.value.length === 0) {
        showError('Pilih Barang Dahulu', 'Pilih minimal 1 item barang yang akan dicetak ke dalam lembar BAST.')
        return
    }

    if (!resolvedRecipientInfo.value.name) {
        showError('Penerima Belum Diisi', 'Silakan tentukan atau isi nama pihak penerima barang terlebih dahulu agar tercantum di lembar BAST.')
        return
    }

    const companyName = selectedCompanies.value[0]?.name || 'PT PADMA SOODE INDONESIA'
    
    const previewData = {
        company_name: companyName,
        recipient_name: resolvedRecipientInfo.value.name,
        recipient_identity_number: resolvedRecipientInfo.value.identity,
        recipient_division_name: resolvedRecipientInfo.value.division,
        handover_date: handoverDate.value,
        handed_over_by_name: currentUserName.value,
        notes: handoverNotes.value || 'Serah terima barang operasional/inventaris gudang.',
        items: selectedItemsList.value
    }

    await generateGoodsHandoverPdf(previewData, {
        currentUser: currentUserName.value,
        isPreview: true
    })
}

// Submit Bulk Handover
const submitBulkHandover = async () => {
    if (selectedItemsList.value.length === 0) {
        showError('Validasi Gagal', 'Pilih minimal 1 item barang yang akan diserahterimakan.')
        return
    }

    if (hasCompanyMismatch.value) {
        showError('Perusahaan Berbeda', 'Seluruh barang dalam satu dokumen BAST harus berasal dari Perusahaan yang sama.')
        return
    }

    if (!resolvedRecipientInfo.value.name) {
        showError('Validasi Gagal', 'Nama pihak pengambil/penerima barang wajib ditentukan.')
        return
    }

    // Validate quantities
    for (const item of selectedItemsList.value) {
        if (!item.quantity_handed_over || item.quantity_handed_over <= 0) {
            showError('Validasi Kuantitas', `Kuantitas untuk barang "${item.item_description}" harus lebih dari 0.`)
            return
        }
        if (item.quantity_handed_over > item.remaining_handover_quantity) {
            showError('Kuantitas Melebihi Sisa', `Kuantitas untuk "${item.item_description}" melebihi sisa yang ada di gudang (${item.remaining_handover_quantity}).`)
            return
        }
    }

    const recipientName = resolvedRecipientInfo.value.name
    const isConfirmed = await showConfirm(
        'Konfirmasi Serah Terima Barang?',
        `Konfirmasi penyerahan ${selectedItemsList.value.length} macam barang fisik (${totalSelectedQty.value} unit) kepada ${recipientName}. Sistem akan mencatat riwayat BAST dan otomatis menyelesaikan status PR jika seluruh barangnya telah diambil.`,
        'Ya, Selesaikan Serah Terima'
    )

    if (!isConfirmed) return

    isSubmitting.value = true
    try {
        showLoading('Menyimpan Berita Acara...', 'Sedang memvalidasi inventaris dan memperbarui status barang...')

        const payload = {
            recipient_user_id: resolvedRecipientInfo.value.userId,
            recipient_name: resolvedRecipientInfo.value.name,
            recipient_identity_number: resolvedRecipientInfo.value.identity || null,
            recipient_division_name: resolvedRecipientInfo.value.division || null,
            handover_date: handoverDate.value,
            notes: handoverNotes.value || null,
            proof_file_id: proofFileId.value || null,
            items: selectedItemsList.value.map(it => ({
                goods_receipt_item_id: it.id,
                quantity_handed_over: it.quantity_handed_over,
                notes: it.notes || null
            }))
        }

        const res = await createBulkGoodsHandover(payload)
        const createdHandover = res.data || res

        showSuccess(
            'Serah Terima Berhasil!',
            `Dokumen BAST ${createdHandover.handover_number || ''} berhasil dibuat. Seluruh item telah tercatat diserahkan.`
        )

        emit('saved')
        emit('update:modelValue', false)
    } catch (err) {
        console.error('Failed to create bulk handover:', err)
        const msg = err.response?.data?.message || 'Gagal menyimpan serah terima barang.'
        showError('Gagal Menyimpan', msg, err)
    } finally {
        isSubmitting.value = false
    }
}

const close = () => {
    emit('update:modelValue', false)
    emit('close')
}
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        @close="close"
        size="4xl"
        body-class="p-6 space-y-6 text-xs max-h-[85vh] overflow-y-auto"
    >
        <template #header>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
                    <Boxes class="w-5 h-5" />
                </div>
                <div>
                    <h3 class="text-base font-bold text-slate-900 tracking-tight">
                        Serah Terima Barang Borongan (Bulk Handover / BAST)
                    </h3>
                    <p class="text-xs text-slate-500">
                        Pilih barang fisik dari berbagai PR yang siap diambil, cetak lembar BAST untuk tanda tangan basah, dan selesaikan serah terima.
                    </p>
                </div>
            </div>
        </template>

        <!-- 1. Warning Alert if Company Mismatch -->
        <div v-if="hasCompanyMismatch" class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800">
            <AlertTriangle class="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
                <p class="font-bold text-xs">Peringatan Batasan Perusahaan:</p>
                <p class="text-[11px] mt-0.5">
                    Item yang Anda pilih berasal dari lebih dari satu perusahaan:
                    <strong class="font-semibold">{{ selectedCompanies.map(c => c.name).join(', ') }}</strong>.
                    Satu dokumen BAST resmi hanya boleh memuat barang-barang dari 1 Perusahaan yang sama. Silakan batalkan pilihan item dari perusahaan yang berbeda.
                </p>
            </div>
        </div>

        <!-- 2. Step 1: Daftar Barang Siap Diambil di Gudang -->
        <div class="space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">1</span>
                        <span>Pilih Barang yang Diambil di Gudang</span>
                        <span class="ml-1 text-[11px] font-normal text-slate-500">
                            ({{ pendingItems.length }} item tersedia)
                        </span>
                    </h4>
                </div>

                <div class="flex items-center gap-2">
                    <div class="relative w-full sm:w-56">
                        <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Cari PR, GRN, atau barang..."
                            class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                    </div>
                    <button
                        type="button"
                        @click="selectAllFiltered"
                        class="px-2.5 py-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                        Pilih Semua
                    </button>
                    <button
                        v-if="selectedItemIds.size > 0"
                        type="button"
                        @click="clearAllSelection"
                        class="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                        Batal
                    </button>
                </div>
            </div>

            <!-- Items Table Container -->
            <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <div v-if="isLoadingItems" class="p-8 text-center">
                    <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p class="text-xs text-slate-500">Memuat stok barang gudang yang belum diambil...</p>
                </div>

                <div v-else-if="filteredPendingItems.length === 0" class="p-8 text-center space-y-2">
                    <Package class="w-8 h-8 text-slate-300 mx-auto" />
                    <p class="text-xs font-semibold text-slate-700">Tidak ada barang yang menunggu serah terima</p>
                    <p class="text-[11px] text-slate-400">
                        {{ searchQuery ? 'Tidak ada barang yang cocok dengan kata kunci pencarian.' : 'Seluruh barang di gudang telah diserahkan atau belum ada penerimaan fisik baru.' }}
                    </p>
                </div>

                <div v-else class="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 text-[11px]">
                            <tr>
                                <th class="w-10 px-3 py-2 text-center">Pilih</th>
                                <th class="px-3 py-2 font-semibold">Nomor PR & GRN</th>
                                <th class="px-3 py-2 font-semibold">Barang & Spesifikasi</th>
                                <th class="px-3 py-2 font-semibold text-right">Sisa di Gudang</th>
                                <th class="px-3 py-2 font-semibold text-right w-28">Qty Diambil</th>
                                <th class="px-3 py-2 font-semibold">Pemohon Asal</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <tr
                                v-for="item in filteredPendingItems"
                                :key="item.id"
                                :class="[
                                    'transition-colors hover:bg-slate-50/80',
                                    isItemSelected(item.id) ? 'bg-blue-50/40' : ''
                                ]"
                            >
                                <!-- Checkbox -->
                                <td class="px-3 py-2.5 text-center">
                                    <input
                                        type="checkbox"
                                        :checked="isItemSelected(item.id)"
                                        @change="toggleItemSelection(item.id)"
                                        class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </td>

                                <!-- PR & GRN -->
                                <td class="px-3 py-2.5">
                                    <div class="space-y-0.5">
                                        <div class="flex items-center gap-1.5">
                                            <span class="font-mono font-bold text-blue-700 text-[11px]">
                                                {{ item.pr_number || '-' }}
                                            </span>
                                        </div>
                                        <div class="text-[10px] font-mono text-slate-500">
                                            GRN: {{ item.grn_number || '-' }}
                                        </div>
                                    </div>
                                </td>

                                <!-- Item Description -->
                                <td class="px-3 py-2.5">
                                    <p class="font-semibold text-slate-900 leading-tight">
                                        {{ item.item_description }}
                                    </p>
                                    <p v-if="item.company_name" class="text-[10px] text-slate-400 mt-0.5">
                                        {{ item.company_name }}
                                    </p>
                                </td>

                                <!-- Sisa di Gudang -->
                                <td class="px-3 py-2.5 text-right">
                                    <span class="font-mono font-bold text-slate-700">
                                        {{ item.remaining_handover_quantity }}
                                    </span>
                                    <span class="text-slate-500 ml-1 text-[11px]">
                                        {{ item.unit?.code || item.unit?.name || 'Unit' }}
                                    </span>
                                </td>

                                <!-- Qty Diambil Input -->
                                <td class="px-3 py-2.5 text-right">
                                    <input
                                        type="number"
                                        v-model.number="itemQuantities[item.id]"
                                        :disabled="!isItemSelected(item.id)"
                                        :min="0.0001"
                                        :max="item.remaining_handover_quantity"
                                        step="any"
                                        class="w-24 px-2 py-1 text-right text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                </td>

                                <!-- Pemohon Asal -->
                                <td class="px-3 py-2.5">
                                    <p class="font-medium text-slate-800">
                                        {{ item.pr_requester || '-' }}
                                    </p>
                                    <p class="text-[10px] text-slate-400">
                                        {{ item.pr_division || '-' }}
                                    </p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Footer Summary Bar -->
                <div class="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-3">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                            <CheckCircle2 class="w-3.5 h-3.5" />
                            {{ selectedItemIds.size }} Macam Barang Dipilih
                        </span>
                        <span class="text-slate-500 text-[11px]">
                            Total Fisik: <strong class="text-slate-800 font-bold">{{ totalSelectedQty }} Unit</strong>
                        </span>
                    </div>

                    <div v-if="selectedCompanies.length === 1" class="text-slate-500 text-[11px] flex items-center gap-1">
                        <Building2 class="w-3.5 h-3.5 text-slate-400" />
                        <span>Perusahaan: <strong class="text-slate-700 font-semibold">{{ selectedCompanies[0].name }}</strong></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. Step 2: Identitas Pihak Pengambil (Penerima Barang) -->
        <div class="space-y-3 pt-2 border-t border-slate-200">
            <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Pihak Pengambil / Penerima Barang</span>
            </h4>

            <!-- Toggle Recipient Type -->
            <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                        type="radio"
                        value="employee"
                        v-model="recipientType"
                        class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span>Karyawan / User Sistem ERP</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                        type="radio"
                        value="external"
                        v-model="recipientType"
                        class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span>Pihak Luar / Eksternal (Kurir, Vendor, Tamu)</span>
                </label>
            </div>

            <!-- Recipient Input Controls -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <!-- If Employee -->
                <div v-if="recipientType === 'employee'" class="sm:col-span-2 lg:col-span-3 space-y-2">
                    <label class="block text-slate-700 font-semibold text-xs">
                        Pilih Karyawan Penerima <span class="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                        v-model="selectedUserId"
                        :options="userOptions"
                        :loading="isLoadingUsers"
                        placeholder="Ketik untuk mencari nama karyawan / user..."
                        search-placeholder="Cari nama, NIK, atau divisi..."
                        @search="fetchUsers"
                    />

                    <!-- Detail Karyawan Terpilih -->
                    <div v-if="selectedUserObject" class="mt-2 p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                                <User class="w-4 h-4" />
                            </div>
                            <div>
                                <p class="font-bold text-slate-900">{{ resolvedRecipientInfo.name }}</p>
                                <p class="text-[10px] text-slate-500">
                                    {{ resolvedRecipientInfo.identity ? `NIK: ${resolvedRecipientInfo.identity}` : '' }}
                                    {{ resolvedRecipientInfo.division ? `• Divisi: ${resolvedRecipientInfo.division}` : '' }}
                                </p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Terverifikasi Sistem
                        </span>
                    </div>
                </div>

                <!-- If External -->
                <template v-else>
                    <div class="space-y-1">
                        <label class="block text-slate-700 font-semibold text-xs">
                            Nama Lengkap Pengambil <span class="text-rose-500">*</span>
                        </label>
                        <input
                            v-model="externalRecipient.name"
                            type="text"
                            placeholder="Contoh: Budi Santoso (Kurir J&T)"
                            class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div class="space-y-1">
                        <label class="block text-slate-700 font-semibold text-xs">
                            No. Identitas / KTP / SIM
                        </label>
                        <input
                            v-model="externalRecipient.identity_number"
                            type="text"
                            placeholder="Contoh: 3201xxxxxxxxxxxx"
                            class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div class="space-y-1">
                        <label class="block text-slate-700 font-semibold text-xs">
                            Instansi / Divisi / Keterangan
                        </label>
                        <input
                            v-model="externalRecipient.division_name"
                            type="text"
                            placeholder="Contoh: Ekspedisi Anteraja / Vendor"
                            class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </template>

                <!-- Tanggal Serah Terima & Catatan -->
                <div class="space-y-1 sm:col-span-1">
                    <label class="block text-slate-700 font-semibold text-xs">
                        Tanggal Serah Terima <span class="text-rose-500">*</span>
                    </label>
                    <input
                        v-model="handoverDate"
                        type="date"
                        class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                <div class="space-y-1 sm:col-span-2">
                    <label class="block text-slate-700 font-semibold text-xs">
                        Catatan Pengambilan / Keperluan
                    </label>
                    <input
                        v-model="handoverNotes"
                        type="text"
                        placeholder="Contoh: Diambil langsung oleh teknisi untuk perbaikan mesin line 2"
                        class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>
        </div>

        <!-- 4. Step 3: Cetak Lembar BAST Fisik & Unggah Bukti TTD Basah -->
        <div class="space-y-3 pt-2 border-t border-slate-200">
            <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Cetak Lembar BAST & Unggah Bukti Fisik TTD</span>
            </h4>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Kolom Cetak PDF -->
                <div class="p-4 bg-blue-50/50 border border-blue-200/80 rounded-xl space-y-3">
                    <div class="flex items-start gap-2.5">
                        <Printer class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <h5 class="font-bold text-xs text-blue-900">Cetak Lembar BAST Fisik</h5>
                            <p class="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                                Unduh dan cetak formulir Berita Acara ini ke printer kertas. Bawa lembar ini saat penyerahan barang untuk ditandatangani basah oleh penerima dan petugas gudang.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        @click="printBastPdf"
                        class="w-full py-2 px-3 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-bold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                        <Printer class="w-4 h-4" />
                        <span>Cetak / Unduh Lembar BAST (PDF)</span>
                    </button>
                </div>

                <!-- Kolom Unggah Foto/Scan TTD -->
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div class="flex items-start gap-2.5">
                        <UploadCloud class="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                        <div>
                            <h5 class="font-bold text-xs text-slate-900">Unggah Bukti Hardfile (Scan/Foto TTD)</h5>
                            <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                Setelah ditandatangani basah, foto atau scan berkas fisik dan unggah di sini sebagai bukti digital audit internal.
                            </p>
                        </div>
                    </div>

                    <!-- File Upload Input / Card -->
                    <div v-if="proofFile" class="p-2.5 bg-white rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2 overflow-hidden">
                            <FileText class="w-4 h-4 text-emerald-600 shrink-0" />
                            <div class="truncate">
                                <p class="font-semibold text-slate-800 truncate">{{ proofFile.name }}</p>
                                <p class="text-[10px] text-slate-400">{{ proofFile.size }}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            @click="removeProofFile"
                            class="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>

                    <label
                        v-else
                        class="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg bg-white cursor-pointer transition-colors"
                    >
                        <div class="flex items-center gap-2 text-slate-600">
                            <Paperclip class="w-4 h-4 text-slate-400" />
                            <span class="font-semibold text-[11px]">
                                {{ isUploadingProof ? 'Mengunggah Berkas...' : 'Pilih Berkas PDF / Foto TTD Basah' }}
                            </span>
                        </div>
                        <span class="text-[10px] text-slate-400 mt-0.5">Maks. 10MB (PDF, JPG, PNG)</span>
                        <input
                            type="file"
                            accept="application/pdf,image/*"
                            class="hidden"
                            :disabled="isUploadingProof"
                            @change="handleFileUpload"
                        />
                    </label>
                </div>
            </div>
        </div>

        <!-- Footer Actions -->
        <template #footer>
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                <div class="text-[11px] text-slate-500">
                    <span v-if="selectedItemIds.size > 0">
                        <strong class="text-slate-800">{{ selectedItemIds.size }}</strong> barang dipilih (Total <strong class="text-slate-800">{{ totalSelectedQty }}</strong> unit).
                    </span>
                    <span v-else class="text-amber-600 font-medium">
                        Belum ada barang yang dipilih.
                    </span>
                </div>

                <div class="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                        type="button"
                        @click="close"
                        class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                        Batal
                    </button>

                    <button
                        type="button"
                        @click="submitBulkHandover"
                        :disabled="isSubmitting || selectedItemIds.size === 0 || hasCompanyMismatch"
                        class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                        <CheckCircle2 class="w-4 h-4" />
                        <span>{{ isSubmitting ? 'Menyimpan...' : 'Konfirmasi & Selesaikan Serah Terima' }}</span>
                    </button>
                </div>
            </div>
        </template>
    </BaseModal>
</template>
