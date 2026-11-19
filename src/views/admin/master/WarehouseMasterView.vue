<script setup>
import { computed, onMounted, ref } from 'vue'
import { MapPin, Plus, Warehouse } from '@lucide/vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useAuthStore } from '@/stores/auth.js'
import { searchCompanies } from '@/services/companyServices.js'
import * as master from '@/services/warehouseMasterServices.js'

const types = {
    receiving: 'Penerimaan',
    quality_control: 'QC',
    quarantine: 'Karantina',
    raw_material: 'Bahan Baku',
    work_in_progress: 'Barang Dalam Proses',
    finished_goods: 'Barang Jadi',
}
const selectClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-100'
const auth = useAuthStore()
const canManage = computed(() => auth.hasStrictPermission('warehouse-master.manage'))
const isSuperAdmin = computed(() => auth.user?.roles?.some((role) => (role?.name ?? role) === 'Super Admin'))
const ownCompany = computed(() => (auth.user?.employee ?? auth.profile)?.company)
const companies = ref([])
const companyId = ref('')
const warehouses = ref([])
const warehouseId = ref('')
const locations = ref([])
const destination = ref(null)
const receivingWarehouseId = ref('')
const receivingLocationId = ref('')
const receivingOptions = ref([])
const loading = ref(false)
const locationsLoading = ref(false)
const receivingLoading = ref(false)
const masterSaving = ref(false)
const destinationSaving = ref(false)
const pageError = ref('')
const locationsError = ref('')
const receivingError = ref('')
const destinationError = ref('')
const notice = ref('')
const editor = ref(null)
const editorError = ref('')
const busy = computed(() => masterSaving.value || destinationSaving.value || Boolean(editor.value))
const activeWarehouses = computed(() => warehouses.value.filter((warehouse) => warehouse.is_active))
const selectedWarehouse = computed(() => warehouses.value.find((warehouse) => warehouse.id === warehouseId.value))
const selectedCompanyName = computed(() => companies.value.find((company) => company.id === companyId.value)?.name
    ?? ownCompany.value?.name)
const destinationChanged = computed(() => destination.value?.warehouse_id !== receivingWarehouseId.value
    || destination.value?.location_id !== receivingLocationId.value)

let companyRequest = 0
let locationRequest = 0
let receivingRequest = 0

function errorMessage(error, fallback) {
    const details = error.response?.data
    return Object.values(details?.errors ?? {})[0]?.[0] ?? details?.message ?? fallback
}

async function loadLocations(id) {
    const request = ++locationRequest
    locations.value = []
    locationsError.value = ''
    locationsLoading.value = Boolean(id)
    if (!id) return
    try {
        const result = await master.listWarehouseLocations(companyId.value, id)
        if (request === locationRequest) locations.value = result
    } catch (error) {
        if (request === locationRequest) locationsError.value = errorMessage(error, 'Lokasi gagal dimuat.')
    } finally {
        if (request === locationRequest) locationsLoading.value = false
    }
}

async function loadReceivingOptions(id, selected = '') {
    const request = ++receivingRequest
    receivingLocationId.value = ''
    receivingOptions.value = []
    receivingError.value = ''
    receivingLoading.value = Boolean(id)
    if (!id) return
    try {
        const result = await master.listWarehouseLocations(companyId.value, id, true)
        if (request !== receivingRequest) return
        receivingOptions.value = result
        if (result.some((location) => location.id === selected)) receivingLocationId.value = selected
    } catch (error) {
        if (request === receivingRequest) receivingError.value = errorMessage(error, 'Pilihan lokasi Penerimaan gagal dimuat.')
    } finally {
        if (request === receivingRequest) receivingLoading.value = false
    }
}

function showDestination(value) {
    destination.value = value
    receivingWarehouseId.value = value?.warehouse_id ?? ''
    return loadReceivingOptions(receivingWarehouseId.value, value?.location_id)
}

async function loadCompany(preferredWarehouse = '') {
    const request = ++companyRequest
    pageError.value = ''
    destinationError.value = ''
    warehouses.value = []
    warehouseId.value = ''
    void loadLocations('')
    void showDestination(null)
    loading.value = Boolean(companyId.value)
    if (!companyId.value) return
    try {
        const [list, current] = await Promise.all([
            master.listWarehouses(companyId.value),
            master.getReceivingDestination(companyId.value),
        ])
        if (request !== companyRequest) return
        warehouses.value = list
        warehouseId.value = list.find((warehouse) => warehouse.id === preferredWarehouse)?.id
            ?? current?.warehouse_id ?? list[0]?.id ?? ''
        await Promise.all([loadLocations(warehouseId.value), showDestination(current)])
    } catch (error) {
        if (request === companyRequest) pageError.value = errorMessage(error, 'Data gudang gagal dimuat.')
    } finally {
        if (request === companyRequest) loading.value = false
    }
}

onMounted(async () => {
    const employee = auth.user?.employee ?? auth.profile
    if (isSuperAdmin.value) {
        try {
            const response = await searchCompanies()
            companies.value = response.data
        } catch (error) {
            pageError.value = errorMessage(error, 'Daftar perusahaan gagal dimuat.')
        }
    }
    const employeeCompany = employee?.company_id ?? ownCompany.value?.id
    companyId.value = companies.value.find((company) => company.id === employeeCompany)?.id
        ?? companies.value[0]?.id ?? employeeCompany ?? ''
    if (companyId.value) await loadCompany()
})

function openEditor(kind, record = null) {
    editorError.value = ''
    editor.value = {
        kind,
        id: record?.id,
        code: record?.code ?? '',
        name: record?.name ?? '',
        type: record?.type ?? 'receiving',
        is_active: record?.is_active ?? true,
    }
}

async function submitMaster() {
    if (masterSaving.value) return
    const { kind, id, code, name, type, is_active } = editor.value
    const payload = { code, name, is_active }
    masterSaving.value = true
    editorError.value = ''
    notice.value = ''
    try {
        if (kind === 'location') {
            await master.saveWarehouseLocation(companyId.value, warehouseId.value, id, { ...payload, type })
            await Promise.all([
                loadLocations(warehouseId.value),
                loadReceivingOptions(receivingWarehouseId.value, receivingLocationId.value),
            ])
        } else {
            const response = await master.saveWarehouse(companyId.value, id, payload)
            await loadCompany(response.data.data.id)
        }
        editor.value = null
        notice.value = kind === 'location' ? 'Lokasi tersimpan.' : 'Gudang tersimpan.'
    } catch (error) {
        editorError.value = errorMessage(error, 'Perubahan gagal disimpan.')
    } finally {
        masterSaving.value = false
    }
}

async function submitDestination(clear = false) {
    destinationSaving.value = true
    destinationError.value = ''
    notice.value = ''
    try {
        if (clear) {
            await master.clearReceivingDestination(companyId.value)
            await showDestination(null)
        } else {
            const result = await master.saveReceivingDestination(companyId.value, {
                warehouse_id: receivingWarehouseId.value,
                location_id: receivingLocationId.value,
            })
            await showDestination(result)
        }
        notice.value = clear ? 'Tujuan penerimaan dikosongkan.' : 'Tujuan penerimaan tersimpan.'
    } catch (error) {
        destinationError.value = errorMessage(error, 'Tujuan penerimaan gagal disimpan.')
    } finally {
        destinationSaving.value = false
    }
}
</script>

<template>
    <div class="space-y-5">
        <PageHeader title="Warehouses & Locations" description="Kelola gudang, area penyimpanan, dan tujuan penerimaan perusahaan."
            :breadcrumbs="[{ label: 'Admin', to: { name: 'admin.dashboard' } }, { label: 'Warehouses & Locations' }]">
            <template #icon><Warehouse class="size-6" /></template>
        </PageHeader>

        <div v-if="isSuperAdmin && companies.length" class="max-w-sm">
            <label for="warehouse-company" class="mb-1.5 block text-sm font-semibold">Perusahaan</label>
            <select id="warehouse-company" v-model="companyId" :class="selectClass" :disabled="busy"
                @change="notice = ''; loadCompany()">
                <option v-for="company in companies" :key="company.id" :value="company.id">{{ company.name }}</option>
            </select>
        </div>
        <p v-else-if="ownCompany?.name" class="text-sm font-medium text-slate-600">{{ ownCompany.name }}</p>
        <p v-if="notice" role="status" class="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ notice }}</p>
        <div v-if="pageError" role="alert" class="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
            {{ pageError }}
            <BaseButton v-if="companyId" variant="secondary" size="xs" class="ml-2" @click="loadCompany()">Muat ulang</BaseButton>
        </div>
        <p v-else-if="loading" role="status" class="text-sm text-slate-600">Memuat data gudang...</p>
        <p v-else-if="!companyId" class="text-sm text-slate-600">Perusahaan belum tersedia untuk akun ini.</p>

        <template v-else>
            <section class="rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/80 to-white p-4 sm:p-5" aria-labelledby="receiving-heading">
                <div class="flex items-start gap-3">
                    <MapPin class="mt-0.5 size-5 shrink-0 text-blue-600" />
                    <div>
                        <h2 id="receiving-heading" class="font-bold text-slate-900">Tujuan Penerimaan Default</h2>
                        <p class="mt-1 text-sm text-slate-600">{{ destination ? 'Tujuan penerimaan sudah disetel.' : 'Belum ada tujuan penerimaan default.' }}</p>
                    </div>
                </div>
                <form v-if="canManage && activeWarehouses.length" class="mt-4 space-y-3" @submit.prevent="submitDestination()">
                    <div class="grid gap-3 sm:grid-cols-2">
                        <label class="space-y-1.5 text-sm font-semibold">Gudang penerimaan
                            <select v-model="receivingWarehouseId" :class="selectClass" :disabled="busy"
                                @change="destinationError = ''; loadReceivingOptions(receivingWarehouseId)">
                                <option value="">Pilih gudang</option>
                                <option v-for="warehouse in activeWarehouses" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option>
                            </select>
                        </label>
                        <label class="space-y-1.5 text-sm font-semibold">Lokasi penerimaan
                            <select v-model="receivingLocationId" :class="selectClass" :disabled="busy || receivingLoading || !receivingOptions.length">
                                <option value="">{{ receivingLoading ? 'Memuat lokasi...' : 'Pilih lokasi' }}</option>
                                <option v-for="location in receivingOptions" :key="location.id" :value="location.id">{{ location.name }} ({{ location.code }})</option>
                            </select>
                        </label>
                    </div>
                    <p v-if="receivingError || destinationError" role="alert" class="text-sm text-rose-700">{{ receivingError || destinationError }}</p>
                    <p v-else-if="receivingWarehouseId && !receivingLoading && !receivingOptions.length" class="text-sm text-slate-600">Tambahkan lokasi aktif bertipe Penerimaan di gudang ini.</p>
                    <div class="flex flex-wrap justify-end gap-2">
                        <BaseButton v-if="destination" type="button" variant="secondary" size="sm" :disabled="busy" @click="submitDestination(true)">Kosongkan default</BaseButton>
                        <BaseButton type="submit" size="sm" :disabled="busy || !destinationChanged || !receivingLocationId">Simpan default</BaseButton>
                    </div>
                </form>
                <p v-else-if="destination" class="mt-3 text-sm font-medium text-slate-800">
                    {{ warehouses.find((warehouse) => warehouse.id === destination.warehouse_id)?.name }}
                    / {{ receivingOptions.find((location) => location.id === destination.location_id)?.name }}
                </p>
            </section>

            <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
                <section class="rounded-2xl border border-slate-200 bg-white" aria-labelledby="warehouse-heading">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
                        <h2 id="warehouse-heading" class="font-bold text-slate-900">Daftar Gudang</h2>
                        <BaseButton v-if="canManage" size="sm" :disabled="busy" @click="openEditor('warehouse')"><Plus class="size-4" />Tambah gudang</BaseButton>
                    </div>
                    <p v-if="!warehouses.length" class="p-4 text-sm text-slate-600">Belum ada gudang.</p>
                    <ul v-else class="divide-y divide-slate-100">
                        <li v-for="warehouse in warehouses" :key="warehouse.id" class="flex items-center gap-2 px-3 py-2" :class="{ 'bg-blue-50/70': warehouse.id === warehouseId }">
                            <button type="button" class="min-w-0 flex-1 rounded-lg px-2 py-2 text-left hover:bg-blue-100/60" :disabled="busy"
                                :aria-pressed="warehouse.id === warehouseId" @click="warehouseId = warehouse.id; loadLocations(warehouse.id)">
                                <span class="block wrap-anywhere text-sm font-semibold text-slate-900">{{ warehouse.name }}</span>
                                <span class="text-xs text-slate-600">{{ warehouse.code }} <span v-if="!warehouse.is_active">/ Nonaktif</span></span>
                            </button>
                            <BaseButton v-if="canManage" variant="ghost" size="xs" :aria-label="'Ubah gudang ' + warehouse.name" :disabled="busy" @click="openEditor('warehouse', warehouse)">Ubah</BaseButton>
                        </li>
                    </ul>
                </section>

                <section class="rounded-2xl border border-slate-200 bg-white" aria-labelledby="locations-heading">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
                        <div>
                            <h2 id="locations-heading" class="font-bold text-slate-900">Lokasi Gudang</h2>
                            <p v-if="selectedWarehouse" class="mt-1 wrap-anywhere text-sm text-slate-600">{{ selectedWarehouse.name }}</p>
                        </div>
                        <BaseButton v-if="canManage && selectedWarehouse" variant="secondary" size="sm" :disabled="busy"
                            @click="openEditor('location')"><Plus class="size-4" />Tambah lokasi</BaseButton>
                    </div>
                    <p v-if="locationsError" role="alert" class="p-4 text-sm text-rose-700">{{ locationsError }}</p>
                    <p v-else-if="locationsLoading" role="status" class="p-4 text-sm text-slate-600">Memuat lokasi...</p>
                    <p v-else-if="!locations.length" class="p-4 text-sm text-slate-600">{{ selectedWarehouse ? 'Belum ada lokasi di gudang ini.' : 'Pilih gudang untuk melihat lokasinya.' }}</p>
                    <ul v-else class="divide-y divide-slate-100">
                        <li v-for="location in locations" :key="location.id" class="flex items-center gap-3 px-4 py-3">
                            <div class="min-w-0 flex-1">
                                <p class="wrap-anywhere text-sm font-semibold text-slate-900">{{ location.name }}</p>
                                <p class="mt-1 text-xs text-slate-600">{{ location.code }} / {{ types[location.type] }} <span v-if="!location.is_active">/ Nonaktif</span></p>
                            </div>
                            <span v-if="location.id === destination?.location_id" class="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Default</span>
                            <BaseButton v-if="canManage" variant="ghost" size="xs" :aria-label="'Ubah lokasi ' + location.name" :disabled="busy" @click="openEditor('location', location)">Ubah</BaseButton>
                        </li>
                    </ul>
                </section>
            </div>
        </template>

        <Dialog :open="Boolean(editor)" @update:open="(open) => { if (!open && !masterSaving) editor = null }">
            <DialogContent v-if="editor" class="max-h-[90dvh] overflow-y-auto p-5 sm:max-w-md">
                <DialogTitle>{{ editor.id ? 'Ubah' : 'Tambah' }} {{ editor.kind === 'location' ? 'lokasi' : 'gudang' }}</DialogTitle>
                <DialogDescription>{{ editor.kind === 'location' ? selectedWarehouse?.name : (selectedCompanyName ?? 'Master gudang perusahaan') }}</DialogDescription>
                <form class="space-y-3" @submit.prevent="submitMaster">
                    <label class="block space-y-1.5 font-medium">Kode
                        <input v-model.trim="editor.code" required maxlength="30" pattern="[A-Za-z0-9_\-]+" :class="selectClass" />
                    </label>
                    <label class="block space-y-1.5 font-medium">Nama
                        <input v-model.trim="editor.name" required maxlength="255" :class="selectClass" />
                    </label>
                    <label v-if="editor.kind === 'location'" class="block space-y-1.5 font-medium">Tipe lokasi
                        <select v-model="editor.type" :class="selectClass">
                            <option v-for="(label, value) in types" :key="value" :value="value">{{ label }}</option>
                        </select>
                    </label>
                    <label class="flex items-center gap-2 font-medium"><input v-model="editor.is_active" type="checkbox" /> Aktif</label>
                    <p v-if="editorError" role="alert" class="text-sm text-rose-700">{{ editorError }}</p>
                    <div class="flex justify-end gap-2 pt-2">
                        <BaseButton type="button" variant="secondary" size="sm" :disabled="masterSaving" @click="editor = null">Batal</BaseButton>
                        <BaseButton type="submit" size="sm" :disabled="masterSaving">{{ masterSaving ? 'Menyimpan...' : 'Simpan' }}</BaseButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    </div>
</template>
