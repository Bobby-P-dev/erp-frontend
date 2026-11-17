<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { Package } from '@lucide/vue'
import AsyncSearchPicker from '@/components/ui/AsyncSearchPicker.vue'
import { getRfqCatalogItems } from '@/services/rfqServices.js'

const props = defineProps({ item: { type: Object, required: true }, inputId: { type: String, required: true }, error: { type: String, default: '' } })
const emit = defineEmits(['select'])
const query = ref('')
const rows = ref([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)
const failure = ref('')
const choosing = ref(false)
let version = 0
let timer

async function load(targetPage = 1) {
    const requestVersion = ++version
    loading.value = true
    failure.value = ''
    rows.value = []
    try {
        const response = await getRfqCatalogItems(query.value.trim(), targetPage)
        if (requestVersion !== version) return
        rows.value = response.data || []
        page.value = response.meta?.current_page || targetPage
        lastPage.value = response.meta?.last_page || 1
    } catch {
        if (requestVersion === version) failure.value = 'Katalog belum dapat dimuat. Silakan coba lagi.'
    } finally {
        if (requestVersion === version) loading.value = false
    }
}

watch(query, () => {
    ++version // Invalidate immediately, including during the debounce interval.
    clearTimeout(timer)
    rows.value = []
    loading.value = true
    failure.value = ''
    timer = setTimeout(() => load(1), 300)
})
watch(choosing, value => {
    clearTimeout(timer)
    if (value) load(1)
    else { ++version; loading.value = false }
})
onBeforeUnmount(() => { ++version; clearTimeout(timer) })
function select(row) {
    ++version
    clearTimeout(timer)
    loading.value = false
    emit('select', row)
    choosing.value = false
}
</script>

<template>
    <div class="space-y-3">
        <label :for="inputId" class="rfq-field-label">Barang katalog <span class="text-rose-500">*</span></label>
        <AsyncSearchPicker :id="inputId" v-model:open="choosing" v-model:query="query"
            trigger-label="Pilih barang dari katalog" search-label="Cari barang katalog" placeholder="Ketik nama atau kode barang"
            :value-label="item.item_id ? item.item_name : ''" :rows="rows" :selected-ids="item.item_id ? [item.item_id] : []"
            :loading="loading" :error="failure" :invalid="!!error" :page="page" :last-page="lastPage" page-label="Halaman katalog"
            empty-text="Barang tidak ditemukan. Coba kata lain atau gunakan Barang custom."
            @select="select" @page="load" @retry="load(1)">
            <template #icon><Package class="size-4" /></template>
            <template #option="{ row }"><span class="block break-words text-sm font-medium text-slate-900">{{ row.name }}</span><span class="mt-1 block text-xs text-slate-500">{{ row.code }} · {{ row.unit?.name }}{{ row.unit?.code ? ` (${row.unit.code})` : '' }}</span></template>
        </AsyncSearchPicker>
        <p v-if="item.item_id" class="text-xs text-blue-700">{{ item.item_code || `#${item.item_id}` }} · Nama dan satuan mengikuti katalog. Klik pilihan untuk mengganti barang.</p>
        <p v-if="error" role="alert" class="text-sm text-rose-700">{{ error }}</p>
    </div>
</template>
