import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
    getProcurementPlans,
    getProcurementQueue,
    activateProcurementPlan,
    cancelProcurementPlan
} from '../../services/procurementPlanServices.js'
import { showLoading, showSuccess, showError, showConfirm, showPrompt } from '../../utils/swal.js'

export function useProcurementPlanList() {
    const router = useRouter()
    const route = useRoute()

    // Primary View Switcher ('pending' for PR Siap Diplanning, 'plans' for Dokumen Rencana)
    const activeMainTab = ref(route.query.tab || 'pending')

    // State for Tab 1: Purchase Requisitions Waiting for Plan (Queue)
    const queueItems = ref([])
    const isLoadingQueue = ref(false)
    const queueSearch = ref('')
    const expandedPrs = ref({})

    // State for Tab 2: Existing Procurement Plans
    const plans = ref([])
    const isLoadingPlans = ref(false)
    const searchQuery = ref('')
    const selectedStatus = ref('')
    const selectedMethod = ref('')
    let searchTimeout = null

    const pagination = ref({
        current_page: 1,
        last_page: 1,
        from: 0,
        to: 0,
        total: 0,
        per_page: 10
    })

    // Grouped PRs for Tab 1
    const groupedPurchaseRequisitions = computed(() => {
        const map = new Map()
        for (const item of queueItems.value) {
            if (!map.has(item.pr_id)) {
                map.set(item.pr_id, {
                    pr_id: item.pr_id,
                    pr_number: item.pr_number || `PR #${item.pr_id}`,
                    company: item.company,
                    division: item.division,
                    requester: item.requester,
                    purpose: item.purpose,
                    request_date: item.request_date,
                    required_date: item.required_date,
                    items: [],
                    total_requested_qty: 0,
                    total_remaining_qty: 0,
                    has_custom_item: false
                })
            }
            const pr = map.get(item.pr_id)
            pr.items.push(item)
            pr.total_requested_qty += Number(item.requested_quantity || 0)
            pr.total_remaining_qty += Number(item.remaining_quantity || 0)
            if (item.is_custom_item) {
                pr.has_custom_item = true
            }
        }

        let list = Array.from(map.values())
        if (queueSearch.value.trim()) {
            const q = queueSearch.value.toLowerCase().trim()
            list = list.filter(pr =>
                pr.pr_number?.toLowerCase().includes(q) ||
                pr.division?.name?.toLowerCase().includes(q) ||
                pr.company?.name?.toLowerCase().includes(q) ||
                pr.requester?.name?.toLowerCase().includes(q) ||
                pr.items.some(i => (i.item_name || i.item?.name || '').toLowerCase().includes(q))
            )
        }
        return list
    })

    // Metrics for Tab 2
    const stats = computed(() => {
        const list = plans.value || []
        return {
            total: pagination.value.total || list.length,
            draft: list.filter(p => p.status === 'draft').length,
            active: list.filter(p => p.status === 'active').length,
            completed: list.filter(p => p.status === 'completed').length,
            cancelled: list.filter(p => p.status === 'cancelled').length,
            direct: list.filter(p => p.procurement_method === 'direct_purchase').length,
            rfq: list.filter(p => p.procurement_method === 'rfq').length
        }
    })

    const statusTabs = [
        { id: '', label: 'Semua Status' },
        { id: 'draft', label: 'Draft', color: 'amber' },
        { id: 'active', label: 'Aktif Berjalan', color: 'blue' },
        { id: 'completed', label: 'Selesai', color: 'emerald' },
        { id: 'cancelled', label: 'Dibatalkan', color: 'rose' }
    ]

    const methodOptions = [
        { value: '', label: 'Semua Sourcing Method' },
        { value: 'direct_purchase', label: 'Direct Purchase (Beli Langsung)' },
        { value: 'rfq', label: 'Tender RFQ (Multi-Vendor)' }
    ]

    const queueTableColumns = [
        { key: 'select', label: '', width: '48px', align: 'center', class: 'text-center' },
        { key: 'no', label: 'No', width: '60px', align: 'center', class: 'text-center' },
        { key: 'pr_number', label: 'No. PR', minWidth: '180px' },
        { key: 'request_date', label: 'Tanggal & Target', minWidth: '180px' },
        { key: 'company_id', label: 'Perusahaan & Divisi', minWidth: '220px' },
        { key: 'purpose', label: 'Keperluan & Item', minWidth: '240px' },
        { key: 'status', label: 'Status & Kuota', minWidth: '180px', align: 'center', class: 'text-center' },
        { key: 'actions', label: 'Aksi', minWidth: '160px', align: 'center', class: 'text-center' }
    ]

    const tableColumns = [
        { key: 'no', label: 'No', width: '70px', align: 'center', class: 'text-center' },
        { key: 'pp_number', label: 'No. Rencana & Tanggal', minWidth: '200px' },
        { key: 'pr_info', label: 'Dokumen PR Asal', minWidth: '220px' },
        { key: 'method', label: 'Metode Pengadaan', minWidth: '180px', align: 'center', class: 'text-center' },
        { key: 'items_count', label: 'Alokasi Item', minWidth: '130px', align: 'center', class: 'text-center' },
        { key: 'status', label: 'Status', minWidth: '140px', align: 'center', class: 'text-center' },
        { key: 'creator', label: 'Dibuat Oleh', minWidth: '160px' },
        { key: 'actions', label: 'Aksi', minWidth: '140px', align: 'center', class: 'text-center' }
    ]

    // Bulk Selection State for Tab 1
    const selectedItems = ref({})

    const selectedItemList = computed(() => Object.values(selectedItems.value))

    const selectedCompany = computed(() => {
        if (selectedItemList.value.length === 0) return null
        return selectedItemList.value[0]?.company || null
    })

    const selectedPrCount = computed(() => {
        const prIds = new Set(selectedItemList.value.map(i => i.pr_id))
        return prIds.size
    })

    const isItemChecked = (item) => !!selectedItems.value[item.purchase_requisition_item_id]

    const isPrFullyChecked = (pr) => {
        if (!pr.items || pr.items.length === 0) return false
        return pr.items.every(i => !!selectedItems.value[i.purchase_requisition_item_id])
    }

    const isPrPartiallyChecked = (pr) => {
        if (!pr.items || pr.items.length === 0) return false
        const checkedCount = pr.items.filter(i => !!selectedItems.value[i.purchase_requisition_item_id]).length
        return checkedCount > 0 && checkedCount < pr.items.length
    }

    const toggleSelectItem = (item, pr) => {
        const itemId = item.purchase_requisition_item_id
        if (selectedItems.value[itemId]) {
            const next = { ...selectedItems.value }
            delete next[itemId]
            selectedItems.value = next
            return
        }

        if (selectedCompany.value && selectedCompany.value.id !== pr.company?.id) {
            showError(
                'Perusahaan Berbeda',
                `Seluruh item yang dipilih harus berasal dari Perusahaan yang sama (${selectedCompany.value.name || 'Perusahaan sebelumnya'}).`
            )
            return
        }

        selectedItems.value = {
            ...selectedItems.value,
            [itemId]: {
                ...item,
                pr_id: pr.pr_id,
                pr_number: pr.pr_number,
                company: pr.company,
                division: pr.division,
                requester: pr.requester,
                purpose: pr.purpose
            }
        }
    }

    const toggleSelectPr = (pr) => {
        if (isPrFullyChecked(pr)) {
            const next = { ...selectedItems.value }
            pr.items.forEach(i => {
                delete next[i.purchase_requisition_item_id]
            })
            selectedItems.value = next
            return
        }

        if (selectedCompany.value && selectedCompany.value.id !== pr.company?.id) {
            showError(
                'Perusahaan Berbeda',
                `Seluruh item yang dipilih harus berasal dari Perusahaan yang sama (${selectedCompany.value.name || 'Perusahaan sebelumnya'}).`
            )
            return
        }

        const next = { ...selectedItems.value }
        pr.items.forEach(i => {
            next[i.purchase_requisition_item_id] = {
                ...i,
                pr_id: pr.pr_id,
                pr_number: pr.pr_number,
                company: pr.company,
                division: pr.division,
                requester: pr.requester,
                purpose: pr.purpose
            }
        })
        selectedItems.value = next
    }

    const clearSelection = () => {
        selectedItems.value = {}
    }

    const handleCreateConsolidatedPlan = () => {
        if (selectedItemList.value.length === 0) return
        sessionStorage.setItem('bulk_procurement_items', JSON.stringify(selectedItemList.value))
        sessionStorage.setItem('bulk_procurement_company', JSON.stringify(selectedCompany.value))
        router.push({
            name: 'user.purchasing.plans.create',
            query: { bulk: '1' }
        })
    }

    const handleFastTrackBulkRfq = () => {
        if (selectedItemList.value.length === 0) return
        sessionStorage.setItem('bulk_procurement_items', JSON.stringify(selectedItemList.value))
        sessionStorage.setItem('bulk_procurement_company', JSON.stringify(selectedCompany.value))
        router.push({
            name: 'user.purchasing.plans.create',
            query: { bulk: '1', method: 'rfq', fast_rfq: '1' }
        })
    }

    const handleFastTrackBulkDirectPurchase = () => {
        if (selectedItemList.value.length === 0) return
        sessionStorage.setItem('bulk_direct_purchase_items', JSON.stringify(selectedItemList.value))
        sessionStorage.setItem('bulk_direct_purchase_company', JSON.stringify(selectedCompany.value))
        router.push({
            name: 'user.purchasing.direct.create',
            query: { bulk: '1' }
        })
    }

    const fetchQueue = async () => {
        try {
            isLoadingQueue.value = true
            const response = await getProcurementQueue({}, 1, 100)
            queueItems.value = response.data || []
        } catch (error) {
            showError('Gagal Memuat Antrean PR!', 'Terjadi kesalahan saat memuat data Purchase Requisition yang siap diplanning.', error)
        } finally {
            isLoadingQueue.value = false
        }
    }

    const fetchPlans = async (search = searchQuery.value, page = 1) => {
        try {
            isLoadingPlans.value = true
            const filters = {}
            if (search) filters.search = search
            if (selectedStatus.value) filters.status = selectedStatus.value
            if (selectedMethod.value) filters.procurement_method = selectedMethod.value

            const response = await getProcurementPlans(filters, page, pagination.value.per_page)
            plans.value = response.data || []

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
            showError('Gagal Memuat Rencana!', 'Terjadi kesalahan saat memuat daftar rencana pengadaan.', error)
        } finally {
            isLoadingPlans.value = false
        }
    }

    watch(searchQuery, (newVal) => {
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(() => {
            fetchPlans(newVal, 1)
        }, 400)
    })

    watch([selectedStatus, selectedMethod], () => {
        fetchPlans(searchQuery.value, 1)
    })

    watch(activeMainTab, (newTab) => {
        router.replace({ query: { ...route.query, tab: newTab } })
    })

    const handleStatusTab = (statusId) => {
        if (selectedStatus.value === statusId) return
        selectedStatus.value = statusId
    }

    const handlePageChange = (page) => {
        fetchPlans(searchQuery.value, page)
    }

    const toggleExpandPr = (prId) => {
        expandedPrs.value[prId] = !expandedPrs.value[prId]
    }

    const handleCreatePlanForPr = (pr) => {
        router.push({
            name: 'user.purchasing.plans.create',
            query: { pr_id: pr.pr_id }
        })
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date)
    }

    // State & Helpers for Source PRs
    const isPrModalOpen = ref(false)
    const selectedPlanForPrModal = ref(null)

    const openPrModal = (plan) => {
        selectedPlanForPrModal.value = plan
        isPrModalOpen.value = true
    }

    const isMultiPrPlan = (plan) => {
        if (!plan) return false
        if (plan.is_consolidated) return true
        if (plan.source_prs && plan.source_prs.length > 1) return true
        if (plan.pr_numbers && plan.pr_numbers.length > 1) return true
        return false
    }

    const getSinglePrNumber = (plan) => {
        if (!plan) return '-'
        if (plan.source_prs && plan.source_prs.length > 0) {
            return plan.source_prs[0].pr_number || '-'
        }
        if (plan.purchase_requisition?.pr_number) {
            return plan.purchase_requisition.pr_number
        }
        if (plan.pr_numbers && plan.pr_numbers.length > 0) {
            return plan.pr_numbers[0]
        }
        return '-'
    }

    const getSinglePrSubtitle = (plan) => {
        if (!plan) return '-'
        if (plan.source_prs && plan.source_prs.length > 0) {
            return plan.source_prs[0].division_name || plan.source_prs[0].company_name || '-'
        }
        return plan.purchase_requisition?.division?.name || plan.purchase_requisition?.company?.name || '-'
    }

    const getMultiPrCount = (plan) => {
        if (!plan) return 0
        if (plan.source_prs && plan.source_prs.length > 0) {
            return plan.source_prs.length
        }
        if (plan.pr_numbers && plan.pr_numbers.length > 0) {
            return plan.pr_numbers.length
        }
        return 0
    }

    const getMultiPrSubtitle = (plan) => {
        if (!plan) return 'Multi-Dokumen'
        if (plan.source_prs && plan.source_prs.length > 0) {
            const divisions = [...new Set(plan.source_prs.map(p => p.division_name).filter(Boolean))]
            if (divisions.length === 1) {
                return `Divisi ${divisions[0]}`
            }
            if (divisions.length > 1) {
                return `${divisions.length} Divisi (${divisions.slice(0, 2).join(', ')}${divisions.length > 2 ? '...' : ''})`
            }
        }
        return `${getMultiPrCount(plan)} Dokumen PR`
    }

    const handleActivate = async (plan) => {
        const confirmed = await showConfirm(
            'Aktifkan Rencana Pengadaan?',
            `Rencana ${plan.pp_number} akan diaktifkan dan kuota item akan dikunci. Status PR terkait akan berubah menjadi In Procurement.`,
            'Ya, Aktifkan',
            'Batal',
            '#2563eb'
        )
        if (!confirmed) return

        try {
            showLoading('Mengaktifkan rencana...')
            await activateProcurementPlan(plan.id)
            showSuccess('Berhasil!', `Rencana pengadaan ${plan.pp_number} berhasil diaktifkan.`)
            fetchPlans(searchQuery.value, pagination.value.current_page)
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal mengaktifkan rencana pengadaan.'
            showError('Gagal!', errorMsg, error)
        }
    }

    const handleCancel = async (plan) => {
        const { value: reason, isConfirmed } = await showPrompt({
            title: 'Batalkan Rencana Pengadaan?',
            text: `Masukkan alasan pembatalan untuk rencana ${plan.pp_number}:`,
            placeholder: 'Tuliskan alasan pembatalan rencana ini...',
            confirmText: 'Ya, Batalkan Rencana',
            cancelText: 'Tutup',
            isDestructive: true,
            validator: (value) => {
                if (!value) {
                    return 'Alasan pembatalan wajib diisi!'
                }
            }
        })

        if (!isConfirmed) return

        try {
            showLoading('Membatalkan rencana...')
            await cancelProcurementPlan(plan.id, reason)
            showSuccess('Berhasil!', `Rencana pengadaan ${plan.pp_number} telah dibatalkan.`)
            fetchPlans(searchQuery.value, pagination.value.current_page)
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Gagal membatalkan rencana pengadaan.'
            showError('Gagal!', errorMsg, error)
        }
    }

    onMounted(async () => {
        await Promise.all([
            fetchQueue(),
            fetchPlans()
        ])

        if (!route.query.tab) {
            if (groupedPurchaseRequisitions.value.length > 0) {
                activeMainTab.value = 'pending'
            } else {
                activeMainTab.value = 'plans'
            }
        }
    })

    return {
        router,
        activeMainTab,
        queueItems,
        isLoadingQueue,
        queueSearch,
        expandedPrs,
        plans,
        isLoadingPlans,
        searchQuery,
        selectedStatus,
        selectedMethod,
        pagination,
        groupedPurchaseRequisitions,
        stats,
        statusTabs,
        methodOptions,
        queueTableColumns,
        tableColumns,
        selectedItems,
        selectedItemList,
        selectedCompany,
        selectedPrCount,
        isItemChecked,
        isPrFullyChecked,
        isPrPartiallyChecked,
        toggleSelectItem,
        toggleSelectPr,
        clearSelection,
        handleCreateConsolidatedPlan,
        handleFastTrackBulkRfq,
        handleFastTrackBulkDirectPurchase,
        fetchQueue,
        fetchPlans,
        handleStatusTab,
        handlePageChange,
        toggleExpandPr,
        handleCreatePlanForPr,
        formatDate,
        isPrModalOpen,
        selectedPlanForPrModal,
        openPrModal,
        isMultiPrPlan,
        getSinglePrNumber,
        getSinglePrSubtitle,
        getMultiPrCount,
        getMultiPrSubtitle,
        handleActivate,
        handleCancel
    }
}
