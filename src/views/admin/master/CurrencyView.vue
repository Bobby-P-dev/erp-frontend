<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
    Coins,
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    Check,
    AlertCircle,
    Globe,
    CheckCircle2,
    Info,
    ArrowRightLeft
} from '@lucide/vue'
import {
    getCurrencies,
    createCurrency,
    updateCurrency,
    deleteCurrency
} from '../../../services/currencyServices.js'
import { showLoading, showSuccess, showError, showConfirm } from '../../../utils/swal.js'
import PageHeader from '../../../components/ui/PageHeader.vue'
import Pagination from '../../../components/ui/Pagination.vue'
import BaseInput from '../../../components/ui/BaseInput.vue'
import SearchInput from '../../../components/ui/SearchInput.vue'
import BaseButton from '../../../components/ui/BaseButton.vue'
import BaseTable from '../../../components/ui/BaseTable.vue'
import BaseModal from '../../../components/ui/BaseModal.vue'
import KpiCard from '../../../components/ui/KpiCard.vue'
import StatusBadge from '../../../components/ui/StatusBadge.vue'
import ToggleSwitch from '../../../components/ui/ToggleSwitch.vue'
import { formatCurrency, formatNumber, formatDate } from '../../../composables/useFormatter.js'

// State
const currencies = ref([])
const isLoading = ref(false)
const pagination = ref({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 10
})

const tableColumns = [
    { key: 'no', label: '#', class: 'w-14 text-center' },
    { key: 'code', label: 'Kode & Simbol' },
    { key: 'name', label: 'Nama Mata Uang' },
    { key: 'exchange_rate', label: 'Nilai Kurs (ke IDR)' },
    { key: 'decimal_places', label: 'Desimal' },
    { key: 'is_base', label: 'Tipe Valuta' },
    { key: 'is_active', label: 'Status' },
    { key: 'actions', label: 'Aksi', class: 'text-right' }
]

const searchQuery = ref('')
const filterStatus = ref('')
let searchTimeout = null

// Fetch data
const fetchCurrencies = async (search = '', page = 1) => {
    try {
        isLoading.value = true
        const filter = {}
        if (filterStatus.value !== '') {
            filter.is_active = filterStatus.value
        }

        const response = await getCurrencies(search, page, filter)
        currencies.value = response.data || []

        const resPagination = response.meta || response
        pagination.value = {
            current_page: resPagination.current_page || 1,
            last_page: resPagination.last_page || 1,
            from: resPagination.from || 0,
            to: resPagination.to || 0,
            total: resPagination.total || 0,
            per_page: resPagination.per_page || 10
        }
    } catch (error) {
        showError('Gagal Mengambil Data!', 'Terjadi kesalahan saat memuat master mata uang.', error)
    } finally {
        isLoading.value = false
    }
}

// KPI Metrics
const totalCount = computed(() => pagination.value.total || currencies.value.length)
const baseCurrencyItem = computed(() => currencies.value.find((c) => c.is_base))
const activeForeignCount = computed(() => {
    return currencies.value.filter((c) => !c.is_base && c.is_active).length
})

onMounted(() => {
    fetchCurrencies()
})

watch(searchQuery, (newVal) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        fetchCurrencies(newVal, 1)
    }, 400)
})

watch(filterStatus, () => {
    fetchCurrencies(searchQuery.value, 1)
})

// Modal & Form State
const showModal = ref(false)
const isEditing = ref(false)
const editId = ref(null)
const isSubmitting = ref(false)

const form = ref({
    code: '',
    name: '',
    symbol: '',
    exchange_rate: 1,
    decimal_places: 2,
    is_base: false,
    is_active: true
})

const errors = ref({})

const openModal = (item = null) => {
    errors.value = {}
    if (item && item.id) {
        isEditing.value = true
        editId.value = item.id
        form.value = {
            code: item.code || '',
            name: item.name || '',
            symbol: item.symbol || '',
            exchange_rate: Number(item.exchange_rate) || 1,
            decimal_places: item.decimal_places ?? 2,
            is_base: Boolean(item.is_base),
            is_active: Boolean(item.is_active)
        }
    } else {
        isEditing.value = false
        editId.value = null
        form.value = {
            code: '',
            name: '',
            symbol: '',
            exchange_rate: 1,
            decimal_places: 2,
            is_base: false,
            is_active: true
        }
    }
    showModal.value = true
}

const closeModal = () => {
    if (isSubmitting.value) return
    showModal.value = false
}

// When is_base is checked, rate must be 1.0 and active must be true
watch(() => form.value.is_base, (isBase) => {
    if (isBase) {
        form.value.exchange_rate = 1
        form.value.is_active = true
    }
})

const validate = () => {
    const errs = {}
    if (!form.value.code || !form.value.code.trim()) {
        errs.code = 'Kode mata uang (ISO) wajib diisi.'
    } else if (form.value.code.trim().length > 10) {
        errs.code = 'Kode maksimal 10 karakter (misal: USD, EUR).'
    }

    if (!form.value.name || !form.value.name.trim()) {
        errs.name = 'Nama mata uang wajib diisi.'
    } else if (form.value.name.trim().length > 100) {
        errs.name = 'Nama mata uang maksimal 100 karakter.'
    }

    if (!form.value.symbol || !form.value.symbol.trim()) {
        errs.symbol = 'Simbol mata uang wajib diisi (misal: $, Rp, €).'
    }

    if (form.value.exchange_rate === null || form.value.exchange_rate === undefined || form.value.exchange_rate <= 0) {
        errs.exchange_rate = 'Nilai kurs harus bernilai angka lebih dari 0.'
    }

    errors.value = errs
    return Object.keys(errs).length === 0
}

const saveCurrency = async () => {
    if (!validate()) return

    try {
        isSubmitting.value = true
        showLoading('Menyimpan Data...', 'Mohon tunggu sebentar.')

        const payload = {
            code: form.value.code.trim().toUpperCase(),
            name: form.value.name.trim(),
            symbol: form.value.symbol.trim(),
            exchange_rate: Number(form.value.exchange_rate),
            decimal_places: Number(form.value.decimal_places) || 0,
            is_base: Boolean(form.value.is_base),
            is_active: Boolean(form.value.is_active)
        }

        if (isEditing.value) {
            await updateCurrency(editId.value, payload)
        } else {
            await createCurrency(payload)
        }

        closeModal()
        showSuccess('Berhasil!', `Data mata uang berhasil ${isEditing.value ? 'diperbarui' : 'disimpan'}.`)
        await fetchCurrencies(searchQuery.value, isEditing.value ? pagination.value.current_page : 1)
    } catch (error) {
        if (error?.response?.status === 422 && error?.response?.data?.errors) {
            const apiErrors = error.response.data.errors
            errors.value = {
                code: apiErrors.code ? apiErrors.code[0] : '',
                name: apiErrors.name ? apiErrors.name[0] : '',
                symbol: apiErrors.symbol ? apiErrors.symbol[0] : '',
                exchange_rate: apiErrors.exchange_rate ? apiErrors.exchange_rate[0] : ''
            }
            showError('Validasi Gagal!', error?.response?.data?.message || 'Mohon periksa kembali isian formulir.')
        } else {
            showError('Gagal Menyimpan!', error?.response?.data?.message || 'Terjadi kesalahan sistem saat menyimpan mata uang.', error)
        }
    } finally {
        isSubmitting.value = false
    }
}

const delCurrency = async (item) => {
    if (item.is_base) {
        showError('Tidak Dapat Dihapus!', 'Mata uang utama (Base Currency) tidak boleh dihapus demi menjaga integritas data keuangan.')
        return
    }

    const isConfirmed = await showConfirm(
        'Hapus Mata Uang?',
        `Apakah Anda yakin ingin menghapus "${item.name}" (${item.code})? Data yang dihapus tidak dapat dikembalikan.`
    )

    if (isConfirmed) {
        try {
            showLoading('Menghapus Data...', 'Mohon tunggu sebentar.')
            await deleteCurrency(item.id)
            showSuccess('Terhapus!', 'Data mata uang berhasil dihapus.')
            await fetchCurrencies(searchQuery.value, pagination.value.current_page)
        } catch (error) {
            const errMsg = error?.response?.data?.message || 'Terjadi kesalahan saat menghapus data mata uang.'
            showError('Gagal Menghapus!', errMsg, error)
        }
    }
}
</script>

<template>
    <div class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- PAGE HEADER -->
        <PageHeader 
            title="Mata Uang & Kurs (Currencies)"
            description="Kelola master data valuta asing, kurs konversi transaksi terhadap Rupiah (Base Currency IDR), dan presisi desimal akuntansi."
        >
            <template #icon>
                <div class="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                    <Coins class="w-6 h-6" />
                </div>
            </template>
            <template #actions>
                <BaseButton variant="primary" @click="openModal()">
                    <Plus class="w-4 h-4" />
                    Tambah Mata Uang
                </BaseButton>
            </template>
        </PageHeader>

        <!-- KPI METRICS SUMMARY -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
                title="Total Master Mata Uang"
                :value="totalCount"
                unit="Valuta"
                :icon="Globe"
                variant="blue"
            />
            <KpiCard
                title="Base Reporting Currency"
                :value="baseCurrencyItem?.code || 'IDR'"
                :unit="baseCurrencyItem?.name || 'Rupiah (1.00)'"
                :icon="CheckCircle2"
                variant="emerald"
            />
            <KpiCard
                title="Valuta Asing Aktif"
                :value="activeForeignCount"
                unit="Valas"
                :icon="ArrowRightLeft"
                variant="indigo"
            />
        </div>

        <!-- MAIN CARD -->
        <div class="bg-white rounded-2xl shadow-xs border border-slate-200/80 flex flex-col overflow-hidden">
            <!-- TOOLBAR: SEARCH & FILTERS -->
            <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50/50">
                <div class="flex flex-col sm:flex-row gap-3 w-full sm:max-w-xl">
                    <div class="w-full sm:w-80">
                        <SearchInput 
                            v-model="searchQuery" 
                            placeholder="Cari kode, nama, atau simbol (e.g. USD, Dollar)..." 
                        />
                    </div>
                    <select
                        v-model="filterStatus"
                        class="px-3.5 py-2 text-xs sm:text-sm font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    >
                        <option value="">Semua Status</option>
                        <option value="1">Hanya Aktif</option>
                        <option value="0">Non-Aktif</option>
                    </select>
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <span class="text-xs font-semibold text-slate-500 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        Total: <span class="text-blue-600 font-bold">{{ pagination.total }}</span> Mata Uang
                    </span>
                    <button
                        type="button"
                        @click="fetchCurrencies(searchQuery, pagination.current_page)"
                        :disabled="isLoading"
                        class="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Segarkan Data"
                    >
                        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                    </button>
                </div>
            </div>

            <!-- TABLE VIEW -->
            <BaseTable :columns="tableColumns">
                <tr v-if="isLoading" class="animate-pulse">
                    <td colspan="8" class="px-6 py-12 text-center text-sm text-slate-400">
                        <div class="inline-flex items-center gap-2">
                            <RefreshCw class="w-4 h-4 animate-spin text-blue-600" />
                            Memuat data mata uang...
                        </div>
                    </td>
                </tr>

                <tr v-else-if="currencies.length === 0">
                    <td colspan="8" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-3">
                            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                                <Coins class="w-8 h-8" />
                            </div>
                            <div class="text-sm font-semibold text-slate-700">
                                {{ searchQuery ? 'Tidak ada mata uang yang cocok' : 'Belum ada data mata uang' }}
                            </div>
                            <p class="text-xs text-slate-400">
                                {{ searchQuery ? 'Coba ubah kata kunci pencarian.' : 'Klik tombol "Tambah Mata Uang" untuk menambahkan mata uang baru.' }}
                            </p>
                            <BaseButton v-if="!searchQuery" size="sm" @click="openModal()">
                                <Plus class="w-4 h-4" />
                                Tambah Mata Uang Pertama
                            </BaseButton>
                        </div>
                    </td>
                </tr>

                <tr 
                    v-for="(item, index) in currencies" 
                    :key="item.id" 
                    class="hover:bg-slate-50/80 transition-colors group"
                >
                    <!-- NO -->
                    <td class="px-4 py-4 whitespace-nowrap text-xs font-semibold text-slate-400 text-center">
                        {{ ((pagination.current_page - 1) * (pagination.per_page || 10)) + index + 1 }}
                    </td>

                    <!-- CODE & SYMBOL -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs">
                                {{ item.code }}
                            </span>
                            <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                                {{ item.symbol }}
                            </span>
                        </div>
                    </td>

                    <!-- NAME -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <div class="text-sm font-bold text-slate-900">
                            {{ item.name }}
                        </div>
                    </td>

                    <!-- EXCHANGE RATE -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <div v-if="item.is_base" class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <span>1 {{ item.code }} = Rp 1,00</span>
                            <span class="text-[10px] bg-emerald-200/60 text-emerald-800 px-1 rounded font-bold">Base</span>
                        </div>
                        <div v-else class="text-sm font-semibold text-slate-800">
                            <span>1 {{ item.code }} = </span>
                            <span class="text-blue-700 font-bold font-mono">{{ formatCurrency(item.exchange_rate, 'IDR') }}</span>
                        </div>
                    </td>

                    <!-- DECIMAL PLACES -->
                    <td class="px-4 py-4 whitespace-nowrap text-xs font-medium text-slate-600">
                        {{ item.decimal_places }} digit desimal
                    </td>

                    <!-- TYPE / BASE -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <span 
                            v-if="item.is_base" 
                            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                        >
                            <CheckCircle2 class="w-3 h-3 text-emerald-600" />
                            Base Currency
                        </span>
                        <span 
                            v-else 
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                        >
                            Valuta Asing (Valas)
                        </span>
                    </td>

                    <!-- STATUS -->
                    <td class="px-4 py-4 whitespace-nowrap">
                        <StatusBadge :isActive="item.is_active" />
                    </td>

                    <!-- ACTIONS -->
                    <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-1.5">
                            <button 
                                @click="openModal(item)" 
                                class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer" 
                                title="Edit Mata Uang"
                            >
                                <Edit class="w-4 h-4" />
                            </button>
                            <button 
                                v-if="!item.is_base"
                                @click="delCurrency(item)" 
                                class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer" 
                                title="Hapus Mata Uang"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                            <span 
                                v-else 
                                class="p-2 text-slate-300 cursor-not-allowed" 
                                title="Mata uang utama tidak dapat dihapus"
                            >
                                <Trash2 class="w-4 h-4 opacity-40" />
                            </span>
                        </div>
                    </td>
                </tr>
            </BaseTable>

            <!-- PAGINATION -->
            <Pagination 
                :pagination="pagination"
                @page-change="(page) => fetchCurrencies(searchQuery, page)"
            />
        </div>

        <!-- MODAL FORM (CREATE / EDIT) -->
        <BaseModal
            v-model="showModal"
            :title="isEditing ? 'Edit Master Mata Uang' : 'Tambah Mata Uang Baru'"
            :subtitle="isEditing ? 'Perbarui informasi kurs dan presisi mata uang.' : 'Daftarkan valuta asing baru ke dalam sistem ERP.'"
            :icon="Coins"
            size="lg"
            @close="closeModal"
        >
            <form @submit.prevent="saveCurrency" class="space-y-4.5">
                <!-- INFO BANNER JIKA BASE -->
                <div v-if="form.is_base" class="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                    <Info class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div class="text-xs text-emerald-900 leading-relaxed">
                        <strong>Mata Uang Utama (Base Reporting Currency):</strong> Mata uang ini akan menjadi standar pembukuan dan pelaporan keuangan perusahaan. Nilai kurs otomatis dikunci sebesar <strong>1,00</strong>.
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- KODE -->
                    <div>
                        <BaseInput 
                            v-model="form.code"
                            label="Kode Mata Uang (ISO Code)"
                            placeholder="e.g. USD, EUR, SGD, JPY"
                            :error="errors.code"
                            required
                        />
                        <p class="text-[11px] text-slate-400 mt-1">
                            Kode resmi ISO 4217 3-huruf (otomatis kapital).
                        </p>
                    </div>

                    <!-- SIMBOL -->
                    <div>
                        <BaseInput 
                            v-model="form.symbol"
                            label="Simbol Mata Uang"
                            placeholder="e.g. $, €, ¥, S$, Rp"
                            :error="errors.symbol"
                            required
                        />
                        <p class="text-[11px] text-slate-400 mt-1">
                            Simbol tampilan transaksi (misal: $, Rp).
                        </p>
                    </div>
                </div>

                <!-- NAMA -->
                <div>
                    <BaseInput 
                        v-model="form.name"
                        label="Nama Mata Uang"
                        placeholder="e.g. US Dollar, Euro, Singapore Dollar"
                        :error="errors.name"
                        required
                    />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- KURS -->
                    <div>
                        <BaseInput 
                            v-model.number="form.exchange_rate"
                            type="number"
                            step="0.000001"
                            min="0.000001"
                            label="Nilai Kurs ke IDR"
                            placeholder="e.g. 16250"
                            :error="errors.exchange_rate"
                            :disabled="form.is_base"
                            required
                        />
                        <p class="text-[11px] text-slate-400 mt-1">
                            {{ form.is_base ? 'Terkunci 1.00 untuk mata uang utama' : `1 ${form.code || 'Valas'} setara dengan berapa Rupiah.` }}
                        </p>
                    </div>

                    <!-- DECIMAL PLACES -->
                    <div>
                        <BaseInput 
                            v-model.number="form.decimal_places"
                            type="number"
                            min="0"
                            max="4"
                            label="Presisi Desimal (0-4)"
                            placeholder="e.g. 2"
                            required
                        />
                        <p class="text-[11px] text-slate-400 mt-1">
                            Standar desimal nominal (biasanya 2 untuk valas, 0 untuk IDR/JPY).
                        </p>
                    </div>
                </div>

                <!-- SWITCH OPTIONS -->
                <div class="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center bg-slate-50/50 p-3.5 rounded-xl border">
                    <div>
                        <label class="text-xs sm:text-sm font-bold text-slate-800 block">
                            Jadikan Base Reporting Currency
                        </label>
                        <p class="text-[11px] text-slate-500">
                            Menetapkan mata uang ini sebagai basis pembukuan keuangan.
                        </p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            v-model="form.is_base"
                            class="sr-only peer"
                        >
                        <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>

                <div class="flex items-center justify-between p-3.5 rounded-xl border border-slate-100">
                    <div>
                        <label class="text-xs sm:text-sm font-bold text-slate-800 block">
                            Status Aktif
                        </label>
                        <p class="text-[11px] text-slate-500">
                            Mata uang aktif dapat dipilih pada modul pengadaan dan transaksi.
                        </p>
                    </div>
                    <ToggleSwitch 
                        v-model="form.is_active"
                        :disabled="form.is_base"
                        label-active="Aktif"
                        label-inactive="Non-Aktif"
                    />
                </div>
            </form>

            <template #footer>
                <BaseButton 
                    variant="outline" 
                    @click="closeModal"
                    :disabled="isSubmitting"
                >
                    Batal
                </BaseButton>
                <BaseButton 
                    variant="primary"
                    @click="saveCurrency"
                    :disabled="isSubmitting"
                >
                    <Check class="w-4 h-4" />
                    {{ isEditing ? 'Simpan Perubahan' : 'Simpan Mata Uang' }}
                </BaseButton>
            </template>
        </BaseModal>
    </div>
</template>
