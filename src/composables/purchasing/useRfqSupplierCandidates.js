import { ref, computed, watch, onScopeDispose } from 'vue'
import { getRfqSupplierCandidates } from '../../services/rfqServices.js'
import { initialNeedItemMode } from '../../utils/rfqSource.js'

export function useRfqSupplierCandidates(items) {
    const selectedSupplierIds = ref([])
    const records = ref({})
    const candidates = ref([])
    const query = ref('')
    const requestedMode = ref('recommended')
    const page = ref(1)
    const lastPage = ref(1)
    const total = ref(0)
    const loading = ref(false)
    const error = ref('')
    const selectionState = ref('ready')
    const selectionNotice = ref('')
    let listVersion = 0, selectedVersion = 0, timer
    const catalogItems = computed(() => [...new Map(items.value
        .filter(item => initialNeedItemMode(item) === 'catalog' && item.item_id)
        .map(item => [Number(item.item_id), { id: Number(item.item_id), name: item.item_name }])).values()])
    const itemIds = computed(() => catalogItems.value.map(item => item.id).sort((a, b) => a - b))
    const hasCustom = computed(() => items.value.some(item => initialNeedItemMode(item) === 'custom'))
    const mode = computed(() => itemIds.value.length ? requestedMode.value : 'all')
    const selectedSuppliers = computed(() => selectedSupplierIds.value.map(id => records.value[id]).filter(Boolean))

    async function load(targetPage = 1) {
        clearTimeout(timer)
        const version = ++listVersion
        loading.value = true
        error.value = ''
        candidates.value = []
        try {
            const response = await getRfqSupplierCandidates({ search: query.value.trim(), page: targetPage, mode: mode.value, itemIds: itemIds.value })
            if (version !== listVersion) return
            candidates.value = [...new Map((response.data || []).map(row => [Number(row.id), row])).values()]
            page.value = response.meta?.current_page || targetPage
            lastPage.value = response.meta?.last_page || 1
            total.value = response.meta?.total ?? candidates.value.length
        } catch {
            if (version === listVersion) error.value = 'Daftar supplier belum dapat dimuat. Silakan coba lagi.'
        } finally {
            if (version === listVersion) loading.value = false
        }
    }

    // Selected rows are checked independently of search/page so absence on a
    // result page is never mistaken for a missing mapping or inactive supplier.
    async function refreshSelected() {
        const version = ++selectedVersion
        const ids = [...selectedSupplierIds.value]
        if (!ids.length) { selectionState.value = 'ready'; return }
        selectionState.value = 'loading'
        const currentItemIds = [...itemIds.value]
        try {
            const found = new Map()
            for (let offset = 0; offset < ids.length; offset += 100) {
                const response = await getRfqSupplierCandidates({ mode: 'all', itemIds: currentItemIds, supplierIds: ids.slice(offset, offset + 100), perPage: 100 })
                if (version !== selectedVersion) return
                for (const row of response.data || []) found.set(Number(row.id), row)
            }
            if (version !== selectedVersion) return
            for (const id of ids) records.value[id] = found.has(id)
                ? { ...records.value[id], ...found.get(id), availability: 'active' }
                : { ...records.value[id], matched_item_ids: [], availability: 'unavailable' }
            selectionState.value = 'ready'
        } catch {
            if (version === selectedVersion) selectionState.value = 'error'
        }
    }
    function select(row) {
        const id = Number(row.id)
        if (loading.value || selectedSupplierIds.value.includes(id)) return
        records.value[id] = { ...row, id, availability: 'active' }
        selectedSupplierIds.value = [...selectedSupplierIds.value, id]
        selectionNotice.value = ''
    }
    function remove(id) {
        selectedSupplierIds.value = selectedSupplierIds.value.filter(value => value !== Number(id))
    }
    // Invalidate invitations on item changes, while keeping quantity/price edits safe.
    watch(() => JSON.stringify(items.value.map(item => [
        initialNeedItemMode(item), item.item_id || null, item.procurement_plan_item_id || null,
        initialNeedItemMode(item) === 'custom' ? item.item_name?.trim() || '' : '',
    ])), () => {
        if (selectedSupplierIds.value.length) {
            selectionNotice.value = 'Barang berubah. Pilihan supplier sebelumnya dikosongkan. Silakan pilih supplier untuk barang terbaru.'
        }
        ++selectedVersion
        selectedSupplierIds.value = []
        records.value = {}
        query.value = ''
        requestedMode.value = 'recommended'
        page.value = 1
        // Refresh even when only a custom item's identity changes.
        ++listVersion
        clearTimeout(timer)
        candidates.value = []
        loading.value = true
        error.value = ''
        timer = setTimeout(() => load(1), 300)
    }, { flush: 'sync' })
    watch(() => JSON.stringify([itemIds.value, mode.value, query.value]), () => {
        ++listVersion
        clearTimeout(timer)
        candidates.value = []
        loading.value = true
        error.value = ''
        timer = setTimeout(() => load(1), 300)
    }, { immediate: true, flush: 'sync' })
    watch(() => JSON.stringify([itemIds.value, selectedSupplierIds.value]), refreshSelected, { flush: 'sync' })
    onScopeDispose(() => { ++listVersion; ++selectedVersion; clearTimeout(timer) })

    return { selectedSupplierIds, selectedSuppliers, candidates, query, requestedMode, mode,
        catalogItems, hasCustom, page, lastPage, total, loading, error, selectionState, selectionNotice,
        load, refreshSelected, select, remove }
}
