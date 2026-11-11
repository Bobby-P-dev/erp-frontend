import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getRfqs, publishRfq, cancelRfq } from '../../services/rfqServices.js'
import { getProcurementPlans } from '../../services/procurementPlanServices.js'
import { showSuccess, showError, showConfirm, showPrompt } from '../../utils/swal.js'
import { formatDate } from '../useFormatter.js'

export function useRfqList() {
    const router = useRouter()
    const route = useRoute()

    // Primary Tab Switcher ('queue' for Rencana Siap Tender, 'rfqs' for Dokumen Tender RFQ)
    const activeMainTab = ref(route.query.tab || 'queue')

    // ==========================================
    // STATE TAB 1: RENCANA SIAP DITENDERKAN (QUEUE)
    // ==========================================
    const queuePlans = ref([])
    const isLoadingQueue = ref(false)
    const queueSearch = ref('')
    const onlyWithQuota = ref(true)
    const expandedPlans = ref({})
    const selectedPlanIds = ref([])

    const queueColumns = [
        { key: 'select', label: '', width: '48px', align: 'center', class: 'text-center' },
        { key: 'no', label: 'No', width: '60px', align: 'center', class: 'text-center' },
        { key: 'pp_number', label: 'No. Rencana & Tanggal', minWidth: '190px' },
        { key: 'pr_info', label: 'Dokumen PR Asal', minWidth: '220px' },
        { key: 'company_division', label: 'Perusahaan & Divisi', minWidth: '220px' },
        { key: 'items_summary', label: 'Keperluan & Rincian Item', minWidth: '230px' },
        { key: 'quota', label: 'Status & Sisa Kuota', minWidth: '170px', align: 'center', class: 'text-center' },
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

    const fetchQueuePlans = async () => {
        try {
            isLoadingQueue.value = true
            const response = await getProcurementPlans({
                status: 'active',
                procurement_method: 'rfq',
                per_page: 50
            }, 1, 50)
            queuePlans.value = response.data || []
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

    const stats = ref({
        total: 0,
        draft: 0,
        published: 0,
        evaluation: 0,
        completed: 0,
        cancelled: 0
    })

    const tableColumns = [
        { key: 'no', label: 'No', width: '60px', align: 'center', class: 'text-center' },
        { key: 'rfq_number', label: 'No. RFQ & Judul Tender', minWidth: '240px' },
        { key: 'procurement_plan', label: 'Rencana Pengadaan (PP)', minWidth: '220px' },
        { key: 'deadline', label: 'Batas Waktu (Deadline)', minWidth: '190px' },
        { key: 'progress', label: 'Progres Penawaran Masuk', minWidth: '190px', align: 'center', class: 'text-center' },
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

            const list = rfqs.value
            stats.value = {
                total: pagination.value.total || list.length,
                draft: list.filter(r => (r.status?.value || r.status) === 'draft').length,
                published: list.filter(r => (r.status?.value || r.status) === 'published').length,
                evaluation: list.filter(r => (r.status?.value || r.status) === 'evaluation').length,
                completed: list.filter(r => (r.status?.value || r.status) === 'completed').length,
                cancelled: list.filter(r => (r.status?.value || r.status) === 'cancelled').length
            }
        } catch (error) {
            console.error('Failed to fetch RFQs:', error)
            showError('Gagal Memuat Tender RFQ', error.response?.data?.message || 'Terjadi kesalahan saat memuat daftar RFQ.')
        } finally {
            isLoading.value = false
        }
    }

    const getDeadlineInfo = (deadlineDate) => {
        if (!deadlineDate) return { text: 'Tidak ada deadline', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' }

        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const target = new Date(deadlineDate)
        target.setHours(0, 0, 0, 0)

        const diffMs = target.getTime() - now.getTime()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return {
                text: `Lewat ${Math.abs(diffDays)} hari`,
                isExpired: true,
                badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
            }
        }
        if (diffDays === 0) {
            return {
                text: 'Hari ini batas akhir',
                isWarning: true,
                badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
            }
        }
        return {
            text: `Sisa ${diffDays} hari`,
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
        }
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
        stats,
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
