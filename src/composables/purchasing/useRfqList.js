import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getRfqs, publishRfq, cancelRfq } from '../../services/rfqServices.js'
import { getProcurementPlans } from '../../services/procurementPlanServices.js'
import { showSuccess, showError, showConfirm, showPrompt } from '../../utils/swal.js'
import { useRfqDeadline } from './useRfqDeadline.js'
import { formatDate } from '../useFormatter.js'

export function useRfqList() {
    const { getDeadlineInfo: getServerDeadlineInfo } = useRfqDeadline()
    const router = useRouter()
    const route = useRoute()

    // Primary Tab Switcher ('queue' for Rencana Siap Tender, 'rfqs' for Dokumen Tender RFQ)
    const activeMainTab = ref(route.query.tab === 'rfqs' ? 'rfqs' : 'queue')

    // ==========================================
    // STATE TAB 1: RENCANA SIAP DITENDERKAN (QUEUE)
    // ==========================================
    const queuePlans = ref([])
    const queuePagination = ref({ current_page: 1, last_page: 1, per_page: 10, total: 0 })
    const isLoadingQueue = ref(false)
    const queueSearch = ref('')
    const onlyWithQuota = ref(true)
    const expandedPlans = ref({})
    const selectedPlanIds = ref([])

    const queueColumns = [
        { key: 'select', label: '', width: '48px', align: 'center', class: 'text-center' },
        { key: 'pp_number', label: 'Rencana pengadaan', minWidth: '220px' },
        { key: 'company_division', label: 'Perusahaan', minWidth: '190px' },
        { key: 'items_summary', label: 'Kebutuhan', minWidth: '210px' },
        { key: 'quota', label: 'Ketersediaan', minWidth: '150px', align: 'center', class: 'text-center' },
        { key: 'actions', label: 'Aksi', minWidth: '170px', align: 'center', class: 'text-center' }
    ]

    const hasRemainingQuota = (plan) => {
        if (plan.has_remaining_quota !== undefined && plan.has_remaining_quota !== null) {
            return Boolean(plan.has_remaining_quota)
        }
        if (Array.isArray(plan.items) && plan.items.length > 0) {
            return plan.items.some(it => Number(it.remaining_quantity ?? it.remaining_rfq_quantity ?? it.planned_quantity ?? 1) > 0)
        }
        return true
    }

    const getRemainingQuotaCount = (plan) => {
        if (plan.unallocated_items_count !== undefined && plan.unallocated_items_count !== null) {
            return plan.unallocated_items_count
        }
        if (Array.isArray(plan.items)) {
            return plan.items.filter(it => Number(it.remaining_quantity ?? it.remaining_rfq_quantity ?? it.planned_quantity ?? 1) > 0).length
        }
        return 0
    }

    const fetchQueuePlans = async (page = queuePagination.value.current_page) => {
        try {
            isLoadingQueue.value = true
            const response = await getProcurementPlans({
                status: 'active',
                procurement_method: 'rfq'
            }, page, queuePagination.value.per_page)
            queuePlans.value = response.data || []
            const meta = response.meta || response.pagination || {}
            queuePagination.value = { current_page: meta.current_page || page, last_page: meta.last_page || 1, per_page: meta.per_page || 10, total: meta.total ?? queuePlans.value.length }
            selectedPlanIds.value = []
            expandedPlans.value = {}
        } catch (error) {
            showError('Gagal Memuat Antrean Rencana!', 'Terjadi kesalahan saat memuat daftar rencana pengadaan RFQ yang siap ditenderkan.', error)
        } finally {
            isLoadingQueue.value = false
        }
    }

    const filteredQueuePlans = computed(() => {
        let list = queuePlans.value || []

        if (onlyWithQuota.value) {
            list = list.filter(p => hasRemainingQuota(p))
        }

        if (queueSearch.value.trim()) {
            const q = queueSearch.value.toLowerCase().trim()
            list = list.filter(p => {
                const ppNum = (p.pp_number || '').toLowerCase()
                const prNum = (p.purchase_requisition?.pr_number || (p.pr_numbers || []).join(' ') || '').toLowerCase()
                const comp = (p.company?.name || p.purchase_requisition?.company?.name || '').toLowerCase()
                const div = (p.purchase_requisition?.division?.name || '').toLowerCase()
                const purp = (p.purchase_requisition?.purpose || p.notes || '').toLowerCase()
                const itemMatch = (p.items || []).some(i =>
                    (i.item_name || i.item?.name || i.purchase_requisition_item?.item_name || '').toLowerCase().includes(q)
                )
                return ppNum.includes(q) || prNum.includes(q) || comp.includes(q) || div.includes(q) || purp.includes(q) || itemMatch
            })
        }

        return list
    })

    const readyQueueCount = computed(() => {
        return (queuePlans.value || []).filter(p => hasRemainingQuota(p)).length
    })

    const toggleExpandPlan = (planId) => {
        expandedPlans.value[planId] = !expandedPlans.value[planId]
    }

    const isPlanSelected = (planId) => {
        return selectedPlanIds.value.includes(planId)
    }

    const selectedPlansList = computed(() => {
        return queuePlans.value.filter(p => selectedPlanIds.value.includes(p.id))
    })

    const selectedQueueCompany = computed(() => {
        if (selectedPlansList.value.length === 0) return null
        const first = selectedPlansList.value[0]
        return first.company || first.purchase_requisition?.company || null
    })

    const toggleSelectPlan = (plan) => {
        if (!hasRemainingQuota(plan)) return
        const idx = selectedPlanIds.value.indexOf(plan.id)
        if (idx >= 0) {
            selectedPlanIds.value.splice(idx, 1)
            return
        }

        const planCompanyId = plan.company_id || plan.company?.id || plan.purchase_requisition?.company_id || plan.purchase_requisition?.company?.id
        const currentCompanyId = selectedQueueCompany.value?.id
        if (currentCompanyId && planCompanyId && Number(currentCompanyId) !== Number(planCompanyId)) {
            showError(
                'Perusahaan Berbeda',
                `Seluruh Rencana Pengadaan yang digabung harus berasal dari perusahaan yang sama (${selectedQueueCompany.value?.name || 'Perusahaan terpilih'}).`
            )
            return
        }

        selectedPlanIds.value.push(plan.id)
    }

    const clearQueueSelection = () => {
        selectedPlanIds.value = []
    }

    const handleExecuteSingleRfq = (plan) => {
        router.push({
            name: 'user.purchasing.rfq.create',
            query: { plan_id: plan.id }
        })
    }

    const handleExecuteCombinedRfq = () => {
        if (selectedPlanIds.value.length === 0) return
        if (selectedPlanIds.value.length === 1) {
            router.push({
                name: 'user.purchasing.rfq.create',
                query: { plan_id: selectedPlanIds.value[0] }
            })
            return
        }
        router.push({
            name: 'user.purchasing.rfq.create',
            query: { plan_ids: selectedPlanIds.value.join(',') }
        })
    }

    // ==========================================
    // STATE TAB 2: DOKUMEN TENDER RFQ
    // ==========================================
    const rfqs = ref([])
    const isLoading = ref(false)
    const searchQuery = ref('')
    const selectedStatus = ref('')
    const pagination = ref({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0
    })

    const tableColumns = [
        { key: 'rfq_number', label: 'Dokumen tender', minWidth: '250px' },
        { key: 'procurement_plan', label: 'Rencana & perusahaan', minWidth: '210px' },
        { key: 'deadline', label: 'Batas penawaran', minWidth: '175px' },
        { key: 'progress', label: 'Penawaran', minWidth: '150px', align: 'center', class: 'text-center' },
        { key: 'status', label: 'Status', minWidth: '150px', align: 'center', class: 'text-center' },
        { key: 'actions', label: 'Aksi', minWidth: '160px', align: 'center', class: 'text-center' }
    ]

    const statusTabs = [
        { id: '', label: 'Semua Status' },
        { id: 'draft', label: 'Draf', color: 'slate' },
        { id: 'published', label: 'Dipublikasikan', color: 'blue' },
        { id: 'evaluation', label: 'Evaluasi', color: 'amber' },
        { id: 'completed', label: 'Selesai', color: 'emerald' },
        { id: 'cancelled', label: 'Dibatalkan', color: 'rose' }
    ]

    const fetchRfqs = async (search = searchQuery.value, page = 1) => {
        try {
            isLoading.value = true
            const filters = {
                per_page: pagination.value.per_page
            }
            if (selectedStatus.value) filters.status = selectedStatus.value

            const response = await getRfqs(search, page, filters)
            rfqs.value = response.data || []

            if (response.meta) {
                pagination.value = {
                    current_page: response.meta.current_page || page,
                    last_page: response.meta.last_page || 1,
                    per_page: response.meta.per_page || 10,
                    total: response.meta.total || 0
                }
            } else if (response.pagination) {
                pagination.value = {
                    current_page: response.pagination.current_page || page,
                    last_page: response.pagination.last_page || 1,
                    per_page: response.pagination.per_page || 10,
                    total: response.pagination.total || 0
                }
            }

        } catch (error) {
            console.error('Failed to fetch RFQs:', error)
            showError('Gagal Memuat Tender RFQ', error.response?.data?.message || 'Terjadi kesalahan saat memuat daftar RFQ.')
        } finally {
            isLoading.value = false
        }
    }

    const getDeadlineInfo = (rfq) => {
        const status = rfq.status?.value || rfq.status
        if (status !== 'published') return null
        const info = getServerDeadlineInfo(rfq)
        return { text: info.label, badgeClass: info.class }
    }

    const handlePageChange = (page) => {
        fetchRfqs(searchQuery.value, page)
    }

    const handleStatusFilter = (statusId) => {
        selectedStatus.value = statusId
        fetchRfqs(searchQuery.value, 1)
    }

    const handlePublish = async (rfq) => {
        const confirmed = await showConfirm(
            'Publikasikan Tender RFQ?',
            `Apakah Anda yakin ingin mempublikasikan RFQ ${rfq.rfq_number}? Portal vendor dan token akses penawaran akan diaktifkan secara otomatis.`,
            'Ya, Publikasikan'
        )
        if (!confirmed) return

        try {
            await publishRfq(rfq.id)
            showSuccess('Berhasil!', `Tender RFQ ${rfq.rfq_number} berhasil dipublikasikan.`)
            fetchRfqs(searchQuery.value, pagination.value.current_page)
        } catch (err) {
            console.error('Failed to publish RFQ:', err)
            showError('Gagal Publikasi', err.response?.data?.message || 'Terjadi kesalahan saat mempublikasikan RFQ.')
        }
    }

    const handleCancel = async (rfq) => {
        const res = await showPrompt({
            title: 'Batalkan Tender RFQ',
            text: `Masukkan alasan pembatalan untuk RFQ ${rfq.rfq_number}:`,
            placeholder: 'Contoh: Alokasi anggaran dialihkan atau kuota dibatalkan...',
            confirmText: 'Batalkan RFQ',
            isDestructive: true,
            validator: (val) => (!val || !val.trim() ? 'Alasan pembatalan wajib diisi.' : null)
        })

        if (!res.isConfirmed || !res.value) return

        try {
            await cancelRfq(rfq.id, res.value)
            showSuccess('Tender Dibatalkan', `Tender RFQ ${rfq.rfq_number} telah berhasil dibatalkan.`)
            fetchRfqs(searchQuery.value, pagination.value.current_page)
        } catch (err) {
            console.error('Failed to cancel RFQ:', err)
            showError('Gagal Membatalkan', err.response?.data?.message || 'Terjadi kesalahan saat membatalkan RFQ.')
        }
    }

    const goToDetail = (id) => {
        router.push({ name: 'user.purchasing.rfq.detail', params: { id } })
    }

    const goToComparison = (id) => {
        router.push({ name: 'user.purchasing.rfq.comparison', params: { id } })
    }

    const goToCreate = () => {
        router.push({ name: 'user.purchasing.rfq.create' })
    }

    let searchTimer = null
    watch(searchQuery, (val) => {
        clearTimeout(searchTimer)
        searchTimer = setTimeout(() => {
            fetchRfqs(val, 1)
        }, 350)
    })

    onBeforeUnmount(() => clearTimeout(searchTimer))

    // Selection belongs to the visible page and must never include hidden plans.
    watch([queueSearch, onlyWithQuota], () => { selectedPlanIds.value = [] })

    watch(activeMainTab, (newTab) => {
        router.replace({ query: { ...route.query, tab: newTab } })
    })

    onMounted(async () => {
        await Promise.all([
            fetchQueuePlans(),
            fetchRfqs()
        ])

        if (!route.query.tab) {
            if (readyQueueCount.value > 0) {
                activeMainTab.value = 'queue'
            } else {
                activeMainTab.value = 'rfqs'
            }
        }
    })

    return {
        activeMainTab,
        queuePlans,
        queuePagination,
        isLoadingQueue,
        queueSearch,
        onlyWithQuota,
        expandedPlans,
        selectedPlanIds,
        selectedPlansList,
        selectedQueueCompany,
        queueColumns,
        filteredQueuePlans,
        readyQueueCount,
        hasRemainingQuota,
        getRemainingQuotaCount,
        fetchQueuePlans,
        toggleExpandPlan,
        isPlanSelected,
        toggleSelectPlan,
        clearQueueSelection,
        handleExecuteSingleRfq,
        handleExecuteCombinedRfq,
        rfqs,
        isLoading,
        searchQuery,
        selectedStatus,
        pagination,
        tableColumns,
        statusTabs,
        fetchRfqs,
        getDeadlineInfo,
        handlePageChange,
        handleStatusFilter,
        handlePublish,
        handleCancel,
        goToDetail,
        goToComparison,
        goToCreate,
        formatDate
    }
}
