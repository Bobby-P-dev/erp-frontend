import { ref, watch, onMounted } from 'vue'

/**
 * Reusable data table management composable for ERP Frontend.
 * Handles state for pagination, debounced searching, filtering, and loading lifecycle.
 *
 * @param {Function} fetchFn - Async function returning response data: { data: [], meta: {}, counts: {} }
 * @param {Object} options - Configuration options:
 *   - initialFilters {Object}: initial filter key-value pairs
 *   - initialPerPage {Number}: initial items per page (default: 10)
 *   - debounceMs {Number}: search debounce in milliseconds (default: 350)
 *   - immediate {Boolean}: whether to auto-fetch on mount (default: true)
 */
export function useDataTable(fetchFn, options = {}) {
    const {
        initialFilters = {},
        initialPerPage = 10,
        debounceMs = 350,
        immediate = true
    } = options

    const items = ref([])
    const isLoading = ref(false)
    const searchQuery = ref('')
    const filters = ref({ ...initialFilters })
    const counts = ref({})

    const pagination = ref({
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
        total: 0,
        per_page: initialPerPage
    })

    let searchTimeout = null

    const fetchData = async (page = 1) => {
        if (!fetchFn) return
        isLoading.value = true
        try {
            const pageNum = Number(page) || 1
            const perPageNum = Number(pagination.value.per_page) || 10
            const response = await fetchFn(
                searchQuery.value,
                pageNum,
                perPageNum,
                { ...filters.value }
            )

            const rawItems = response?.data || response || []
            items.value = Array.isArray(rawItems) ? rawItems : []

            if (response?.counts) {
                counts.value = { ...response.counts }
            }

            const meta = response?.meta || response
            if (meta && typeof meta === 'object') {
                pagination.value = {
                    current_page: meta.current_page || pageNum,
                    last_page: meta.last_page || 1,
                    from: meta.from || (items.value.length > 0 ? 1 : 0),
                    to: meta.to || items.value.length,
                    total: meta.total ?? items.value.length,
                    per_page: meta.per_page || perPageNum
                }
            } else {
                pagination.value = {
                    current_page: pageNum,
                    last_page: 1,
                    from: items.value.length > 0 ? 1 : 0,
                    to: items.value.length,
                    total: items.value.length,
                    per_page: perPageNum
                }
            }
            return response
        } catch (error) {
            console.error('[useDataTable] Failed to fetch data:', error)
            items.value = []
            throw error
        } finally {
            isLoading.value = false
        }
    }

    const handlePageChange = (page) => {
        fetchData(page)
    }

    const handlePerPageChange = (eventOrValue) => {
        const val = typeof eventOrValue === 'object' && eventOrValue?.target 
            ? eventOrValue.target.value 
            : eventOrValue
        pagination.value.per_page = Number(val) || 10
        fetchData(1)
    }

    const clearSearch = () => {
        searchQuery.value = ''
        fetchData(1)
    }

    const resetFilters = (newDefaults = {}) => {
        filters.value = { ...initialFilters, ...newDefaults }
        searchQuery.value = ''
        fetchData(1)
    }

    // Debounce search input
    watch(searchQuery, (newVal, oldVal) => {
        if (newVal === oldVal) return
        if (searchTimeout) clearTimeout(searchTimeout)
        searchTimeout = setTimeout(() => {
            fetchData(1)
        }, debounceMs)
    })

    // Watch filters (shallow object changes)
    watch(filters, () => {
        fetchData(1)
    }, { deep: true })

    if (immediate) {
        onMounted(() => {
            fetchData(pagination.value.current_page || 1)
        })
    }

    return {
        items,
        isLoading,
        searchQuery,
        filters,
        pagination,
        counts,
        fetchData,
        handlePageChange,
        handlePerPageChange,
        clearSearch,
        resetFilters
    }
}
