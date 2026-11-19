import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createRfq, publishRfq } from '../../services/rfqServices.js'
import { getProcurementPlans, showProcurementPlan } from '../../services/procurementPlanServices.js'
import { useRfqSupplierCandidates } from './useRfqSupplierCandidates.js'
import { searchUnits } from '../../services/unitServices.js'
import { buildRfqDraftPayload, validateRfqDraft, newInitialNeedItem } from '../../utils/rfqSource.js'
import { showLoading, showSuccess, showError, showToast, closeSwal } from '../../utils/swal.js'

export function useRfqCreateForm() {
    const router = useRouter()
    const route = useRoute()

    // States
    const isSubmitting = ref(false)
    const isLoadingPlans = ref(false)
    const isLoadingPlanDetail = ref(false)

    // Data sources
    const procurementPlans = ref([])
    const selectedPlan = ref(null)
    const additionalPlanIds = ref([])
    const additionalPlans = ref([])
    const initialItems = ref([])
    const unitOptions = ref([])
    const isLoadingUnits = ref(false)
    const unitsError = ref('')
    const fieldErrors = ref({})
    let rowSequence = 0
    let planLoadVersion = 0
    let unitLoadVersion = 0
    const addInitialItem = () => initialItems.value.push({ ...newInitialNeedItem(), row_key: ++rowSequence })
    const removeInitialItem = index => initialItems.value.splice(index, 1)
    addInitialItem()
    const fetchUnits = async (search = '') => {
        const version = ++unitLoadVersion
        isLoadingUnits.value = true
        unitsError.value = ''
        try {
            const response = await searchUnits(search, 100)
            if (version !== unitLoadVersion) return
            const options = (response.data || []).map(unit => ({ value: unit.id, label: unit.code ? `${unit.name} (${unit.code})` : unit.name }))
            unitOptions.value = [...new Map([...unitOptions.value, ...options].map(option => [option.value, option])).values()]
        } catch {
            if (version === unitLoadVersion) unitsError.value = 'Satuan belum dapat dimuat. Coba lagi atau ketik nama satuan.'
        } finally {
            if (version === unitLoadVersion) isLoadingUnits.value = false
        }
    }

    const getPlanPrSummary = (plan) => {
        if (!plan) return '-'
        if (Array.isArray(plan.pr_numbers) && plan.pr_numbers.length > 0) {
            return plan.is_consolidated || plan.pr_numbers.length > 1
                ? `Konsolidasi ${plan.pr_numbers.length} PR: ${plan.pr_numbers.join(', ')}`
                : `PR: ${plan.pr_numbers[0]}`
        }
        if (plan.purchase_requisition?.pr_number) {
            return `PR: ${plan.purchase_requisition.pr_number}`
        }
        return 'Multi-PR'
    }

    const getPlanPurposeSummary = (plan) => {
        if (!plan) return 'Pengadaan RFQ'
        if (plan.purchase_requisition?.purpose) return plan.purchase_requisition.purpose
        if (Array.isArray(plan.source_prs) && plan.source_prs.length > 0) {
            const purposes = plan.source_prs.map(p => p.purpose).filter(Boolean)
            if (purposes.length > 0) return purposes.join(' & ')
        }
        return plan.notes || 'Konsolidasi Pengadaan RFQ'
    }

    const getPlanDivisionSummary = (plan) => {
        if (!plan) return '-'
        if (plan.division?.name || plan.purchase_requisition?.division?.name) {
            return plan.division?.name || plan.purchase_requisition?.division?.name
        }
        if (Array.isArray(plan.source_prs) && plan.source_prs.length > 0) {
            const divs = [...new Set(plan.source_prs.map(p => p.division_name).filter(Boolean))]
            if (divs.length > 0) return divs.join(', ')
        }
        return 'Lintas Divisi'
    }

    const primaryPlanOptions = computed(() => {
        return procurementPlans.value.map(p => ({
            value: p.id,
            label: `${p.pp_number} • ${p.company?.name || p.purchase_requisition?.company?.name || 'Perusahaan'} (${getPlanDivisionSummary(p)})`,
            subtitle: `Keperluan: ${getPlanPurposeSummary(p)} | ${getPlanPrSummary(p)} • ${p.items?.length || 0} Item`
        }))
    })

    const availableAdditionalPlanOptions = computed(() => {
        const primaryId = Number(form.value.procurement_plan_id || 0)
        const primaryCompanyId = selectedPlan.value?.company_id || selectedPlan.value?.purchase_requisition?.company_id || null

        return procurementPlans.value
            .filter(p => {
                if (Number(p.id) === primaryId) return false
                if (primaryCompanyId && p.company_id && Number(p.company_id) !== Number(primaryCompanyId)) return false
                return true
            })
            .map(p => ({
                value: p.id,
                label: `${p.pp_number} — ${getPlanPurposeSummary(p)} (${getPlanPrSummary(p)})`
            }))
    })

    // Form model
    const form = ref({
        source_type: route.query.plan_id || route.query.plan_ids ? 'procurement_plan' : 'initial_need',
        procurement_plan_id: '',
        title: '',
        issue_date: new Date().toISOString().substring(0, 10),
        deadline_date: '',
        delivery_address: 'Kawasan Industri Bekasi Blok C-12, PT Padma Soode Indonesia',
        payment_terms_requested: 'Tempo 60 Hari',
        notes: ''
    })

    // Item lines from selected procurement plan
    const planItems = ref([])
    const isInitialSource = computed(() => form.value.source_type === 'initial_need')
    const changeSource = source => {
        if (isSubmitting.value || source === form.value.source_type) return
        ++planLoadVersion
        isLoadingPlanDetail.value = false
        form.value.source_type = source
        form.value.procurement_plan_id = ''
        form.value.title = ''
        additionalPlanIds.value = []
        selectedPlan.value = null
        additionalPlans.value = []
        planItems.value = []
        initialItems.value = []
        fieldErrors.value = {}
        if (source === 'initial_need') addInitialItem()
        else if (!procurementPlans.value.length) fetchAvailablePlans()
    }

    const activeItems = computed(() => {
        return isInitialSource.value ? initialItems.value : planItems.value.filter(item => item.is_selected)
    })
    const supplierCandidates = useRfqSupplierCandidates(activeItems)
    const { selectedSupplierIds, selectedSuppliers, remove: removeSupplier } = supplierCandidates

    const totalEstimatedHpsAmount = computed(() => {
        return activeItems.value.reduce((sum, item) => {
            return sum + (Number(item.target_quantity || 0) * Number(item.target_price || 0))
        }, 0)
    })

    const fetchAvailablePlans = async () => {
        try {
            isLoadingPlans.value = true
            const res = await getProcurementPlans({ procurement_method: 'rfq', status: 'active' }, 1, 100)
            procurementPlans.value = res.data || []
        } catch (err) {
            console.error('Failed to load procurement plans:', err)
            showError('Gagal Memuat Rencana Pengadaan', 'Tidak dapat mengambil data procurement plan bertipe RFQ.')
        } finally {
            isLoadingPlans.value = false
        }
    }

    const mapPlanItemsToRows = (plan, existingRowsMap = new Map()) => {
        if (!plan || !Array.isArray(plan.items)) return []

        return plan.items.map(item => {
            const existing = existingRowsMap.get(item.id)
            if (existing) return existing

            const remaining = Number(item.remaining_quantity ?? item.remaining_rfq_quantity ?? item.planned_quantity ?? 0)
            const prItem = item.purchase_requisition_item || {}
            const catalogItem = prItem.item || item.item || {}
            const unit = prItem.unit || item.unit || {}
            const sourcePr = prItem.purchase_requisition || plan.purchase_requisition || {}
            const resolvedItemName = prItem.item_name || catalogItem.name || item.item_name || 'Item Pengadaan'
            const resolvedItemCode = catalogItem.code || catalogItem.item_code || item.item_code || null
            const resolvedUnitName = unit.code || unit.symbol || unit.name || item.unit_name || 'Unit'
            const resolvedUnitId = unit.id || item.unit_id || prItem.unit_id || null

            return {
                procurement_plan_item_id: item.id,
                source_pp_id: plan.id,
                source_pp_number: plan.pp_number,
                source_pr_id: sourcePr.id || prItem.purchase_requisition_id || null,
                source_pr_number: sourcePr.pr_number || null,
                item_id: prItem.item_id || item.item_id || catalogItem.id || null,
                item_name: resolvedItemName,
                item_code: resolvedItemCode,
                item_specifications: item.item_specifications || prItem.detail_name || catalogItem.description || '',
                unit_id: resolvedUnitId,
                unit_name: resolvedUnitName,
                remaining_quantity: remaining,
                target_quantity: remaining > 0 ? remaining : 1,
                target_price: Number(item.estimated_unit_price || prItem.estimated_price || 0),
                required_delivery_date: plan.required_date || sourcePr.required_date || '',
                notes: item.notes || '',
                is_selected: remaining > 0
            }
        })
    }

    const syncCombinedPlanItems = async (preserveExisting = false) => {
        if (isInitialSource.value) return
        const version = ++planLoadVersion
        if (!form.value.procurement_plan_id) {
            selectedPlan.value = null
            additionalPlans.value = []
            planItems.value = []
            return
        }

        try {
            isLoadingPlanDetail.value = true
            const existingMap = new Map()
            if (preserveExisting) {
                for (const row of planItems.value) {
                    existingMap.set(row.procurement_plan_item_id, row)
                }
            }

            const allPlanIds = [
                Number(form.value.procurement_plan_id),
                ...additionalPlanIds.value.map(id => Number(id)).filter(id => id !== Number(form.value.procurement_plan_id))
            ]

            const responses = await Promise.all(allPlanIds.map(id => showProcurementPlan(id)))
            if (version !== planLoadVersion || isInitialSource.value) return
            const loadedPlans = responses.map(r => r.data || r)

            const primaryPlan = loadedPlans[0] || null
            selectedPlan.value = primaryPlan
            additionalPlans.value = loadedPlans.slice(1)

            if (primaryPlan && !form.value.title) {
                const purposeText = getPlanPurposeSummary(primaryPlan)
                const ppLabel = loadedPlans.length > 1
                    ? loadedPlans.map(p => p.pp_number).join(' + ')
                    : (primaryPlan.pp_number || '')
                form.value.title = `Tender Pengadaan ${ppLabel} - ${purposeText}`.trim()
            }

            const combinedRows = []
            for (const p of loadedPlans) {
                combinedRows.push(...mapPlanItemsToRows(p, existingMap))
            }
            planItems.value = combinedRows
        } catch (err) {
            if (version !== planLoadVersion) return
            console.error('Failed to load plan details:', err)
            showError('Gagal Memuat Detail Rencana', 'Terjadi kesalahan saat memuat rincian item rencana pengadaan.')
        } finally {
            if (version === planLoadVersion) isLoadingPlanDetail.value = false
        }
    }

    const onPlanChange = async () => {
        additionalPlanIds.value = additionalPlanIds.value.filter(id => Number(id) !== Number(form.value.procurement_plan_id))
        await syncCombinedPlanItems(false)
    }

    const selectAllItems = () => {
        let count = 0
        planItems.value.forEach(it => {
            if (it.remaining_quantity > 0) {
                it.is_selected = true
                it.target_quantity = it.remaining_quantity
                count++
            }
        })
        if (count > 0) {
            showToast.info('Barang Dipilih', `${count} barang diisi sesuai sisa kuota rencana.`)
        }
    }

    watch(() => form.value.procurement_plan_id, async (newId, oldId) => {
        if (newId !== oldId) {
            await onPlanChange()
        }
    })

    watch(additionalPlanIds, async () => {
        if (form.value.procurement_plan_id) {
            await syncCombinedPlanItems(true)
        }
    })

    const validateForm = (publish = false) => {
        fieldErrors.value = validateRfqDraft(form.value, activeItems.value, selectedSuppliers.value, publish)
        if (selectedSuppliers.value.some(supplier => supplier.availability === 'unavailable')) {
            fieldErrors.value.suppliers = ['Hapus supplier yang tidak lagi tersedia dan pilih supplier aktif sebelum menyimpan.']
        }
        if (Object.keys(fieldErrors.value).length) nextTick(() => document.getElementById('rfq-validation-errors')?.focus())
        return Object.keys(fieldErrors.value).length === 0
    }

    const handleSubmit = async (publishImmediately = false) => {
        if (isSubmitting.value || !validateForm(publishImmediately)) return

        isSubmitting.value = true
        try {
            showLoading(publishImmediately ? 'Membuat & mempublikasikan tender RFQ...' : 'Menyimpan draf tender RFQ...')
            const payload = buildRfqDraftPayload(form.value, activeItems.value, selectedSuppliers.value, additionalPlanIds.value)
            const res = await createRfq(payload)
            const createdRfq = res.data || res

            if (publishImmediately && createdRfq?.id) {
                try {
                    await publishRfq(createdRfq.id)
                } catch (error) {
                    showError('Draf tersimpan, publikasi belum berhasil', error.response?.data?.message || 'Buka detail tender untuk mencoba publikasi kembali. Tidak perlu membuat draf baru.')
                    router.push({ name: 'user.purchasing.rfq.detail', params: { id: createdRfq.id } })
                    return
                }
                showSuccess('Berhasil Dipublikasikan!', `Tender RFQ ${createdRfq.rfq_number || form.value.title} berhasil dibuat dan portal penawaran vendor telah aktif.`)
            } else {
                closeSwal()
                showToast.success('Draf Tender Tersimpan', {
                    description: `Draf ${createdRfq.rfq_number || form.value.title} siap dilanjutkan.`,
                    action: {
                        label: 'Ke Daftar RFQ',
                        onClick: () => router.push({ name: 'user.purchasing.rfq' })
                    }
                })
            }

            router.push({
                name: 'user.purchasing.rfq.detail',
                params: { id: createdRfq.id }
            })
        } catch (err) {
            fieldErrors.value = err.response?.data?.errors || {}
            console.error('Failed to create RFQ:', err)
            await showError('Gagal Membuat RFQ', err.response?.data?.message || 'Terjadi kesalahan saat menyimpan draf RFQ.')
            if (Object.keys(fieldErrors.value).length) nextTick(() => document.getElementById('rfq-validation-errors')?.focus())
        } finally {
            isSubmitting.value = false
        }
    }

    onMounted(async () => {
        await Promise.all([
            isInitialSource.value ? Promise.resolve() : fetchAvailablePlans(),
            fetchUnits()
        ])

        if (!isInitialSource.value && route.query.plan_ids) {
            const ids = String(route.query.plan_ids)
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
            if (ids.length > 0) {
                form.value.procurement_plan_id = Number(ids[0])
                additionalPlanIds.value = ids.slice(1).map(id => Number(id))
                await syncCombinedPlanItems(false)
            }
        } else if (!isInitialSource.value && route.query.plan_id) {
            form.value.procurement_plan_id = Number(route.query.plan_id)
            await syncCombinedPlanItems(false)
        }
    })

    return {
        isInitialSource,
        changeSource,
        initialItems,
        addInitialItem,
        removeInitialItem,
        unitOptions,
        isLoadingUnits,
        unitsError,
        fetchUnits,
        fieldErrors,
        isSubmitting,
        isLoadingPlans,
        isLoadingPlanDetail,
        supplierCandidates,
        procurementPlans,
        selectedPlan,
        additionalPlanIds,
        additionalPlans,
        form,
        planItems,
        selectedSupplierIds,
        primaryPlanOptions,
        availableAdditionalPlanOptions,
        selectedSuppliers,
        activeItems,
        totalEstimatedHpsAmount,
        getPlanPrSummary,
        getPlanPurposeSummary,
        getPlanDivisionSummary,
        onPlanChange,
        selectAllItems,
        removeSupplier,
        handleSubmit
    }
}
