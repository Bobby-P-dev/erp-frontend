import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createRfq, publishRfq } from '../../services/rfqServices.js'
import { getProcurementPlans, showProcurementPlan } from '../../services/procurementPlanServices.js'
import { getSuppliers } from '../../services/supplierServices.js'
import { showLoading, showSuccess, showError } from '../../utils/swal.js'

export function useRfqCreateForm() {
    const router = useRouter()
    const route = useRoute()

    // States
    const isSubmitting = ref(false)
    const isLoadingPlans = ref(false)
    const isLoadingPlanDetail = ref(false)
    const isLoadingSuppliers = ref(false)

    // Data sources
    const procurementPlans = ref([])
    const selectedPlan = ref(null)
    const additionalPlanIds = ref([])
    const additionalPlans = ref([])
    const masterSuppliers = ref([])

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

    // Selected supplier IDs
    const selectedSupplierIds = ref([])

    const supplierOptions = computed(() => {
        return masterSuppliers.value.map(s => ({
            value: s.id,
            label: `${s.name} (${s.supplier_code || 'SUP-' + s.id})`
        }))
    })

    const selectedSuppliers = computed(() => {
        return masterSuppliers.value.filter(s => selectedSupplierIds.value.includes(s.id))
    })

    const activeItems = computed(() => {
        return planItems.value.filter(item => item.is_selected)
    })

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

    const fetchSuppliers = async () => {
        try {
            isLoadingSuppliers.value = true
            const res = await getSuppliers('', 1, { is_active: true }, 200)
            masterSuppliers.value = res.data || []
        } catch (err) {
            console.error('Failed to load suppliers:', err)
        } finally {
            isLoadingSuppliers.value = false
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
            console.error('Failed to load plan details:', err)
            showError('Gagal Memuat Detail Rencana', 'Terjadi kesalahan saat memuat rincian item rencana pengadaan.')
        } finally {
            isLoadingPlanDetail.value = false
        }
    }

    const onPlanChange = async () => {
        additionalPlanIds.value = additionalPlanIds.value.filter(id => Number(id) !== Number(form.value.procurement_plan_id))
        await syncCombinedPlanItems(false)
    }

    const selectAllItems = () => {
        planItems.value.forEach(it => {
            if (it.remaining_quantity > 0) {
                it.is_selected = true
                it.target_quantity = it.remaining_quantity
            }
        })
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

    const removeSupplier = (id) => {
        selectedSupplierIds.value = selectedSupplierIds.value.filter(sId => sId !== id)
    }

    const validateForm = () => {
        if (!form.value.procurement_plan_id) {
            showError('Validasi Gagal', 'Silakan pilih Dokumen Procurement Plan terlebih dahulu.')
            return false
        }
        if (!form.value.title || !form.value.title.trim()) {
            showError('Validasi Gagal', 'Judul Tender RFQ wajib diisi.')
            return false
        }
        if (!form.value.deadline_date) {
            showError('Validasi Gagal', 'Tanggal Batas Akhir Penawaran (Deadline) wajib diisi.')
            return false
        }

        if (activeItems.value.length === 0) {
            showError('Validasi Gagal', 'Pilih minimal satu item untuk dimasukkan ke paket tender ini.')
            return false
        }

        for (const it of activeItems.value) {
            if (!it.target_quantity || Number(it.target_quantity) <= 0) {
                showError('Validasi Gagal', `Kuantitas target untuk item "${it.item_name}" harus lebih besar dari 0.`)
                return false
            }
            if (Number(it.target_quantity) > Number(it.remaining_quantity)) {
                showError('Validasi Gagal', `Kuantitas target "${it.item_name}" (${it.target_quantity}) melebihi sisa kuota yang tersedia (${it.remaining_quantity}).`)
                return false
            }
        }

        if (selectedSupplierIds.value.length === 0) {
            showError('Validasi Gagal', 'Pilih minimal satu vendor / supplier yang akan diundang ke tender ini.')
            return false
        }

        return true
    }

    const handleSubmit = async (publishImmediately = false) => {
        if (!validateForm()) return

        isSubmitting.value = true
        try {
            showLoading(publishImmediately ? 'Membuat & mempublikasikan tender RFQ...' : 'Menyimpan draf tender RFQ...')
            const payload = {
                procurement_plan_id: parseInt(form.value.procurement_plan_id, 10),
                additional_procurement_plan_ids: additionalPlanIds.value.map(id => parseInt(id, 10)),
                title: form.value.title.trim(),
                issue_date: form.value.issue_date,
                deadline_date: form.value.deadline_date,
                delivery_address: form.value.delivery_address || null,
                payment_terms_requested: form.value.payment_terms_requested || null,
                notes: form.value.notes || null,
                items: activeItems.value.map(it => ({
                    procurement_plan_item_id: it.procurement_plan_item_id,
                    item_id: it.item_id,
                    item_name: it.item_name,
                    item_specifications: it.item_specifications || null,
                    unit_id: it.unit_id,
                    target_quantity: Number(it.target_quantity),
                    target_price: it.target_price ? Number(it.target_price) : null,
                    required_delivery_date: it.required_delivery_date || null,
                    notes: it.notes || null
                })),
                suppliers: selectedSuppliers.value.map(s => ({
                    supplier_id: s.id,
                    contact_person: s.contact_person || s.contacts?.[0]?.name || null,
                    email: s.email || s.contacts?.[0]?.email || null,
                    phone: s.phone || s.contacts?.[0]?.phone || null
                }))
            }

            const res = await createRfq(payload)
            const createdRfq = res.data || res

            if (publishImmediately && createdRfq?.id) {
                await publishRfq(createdRfq.id)
                showSuccess('Berhasil Dipublikasikan!', `Tender RFQ ${createdRfq.rfq_number || form.value.title} berhasil dibuat dan portal penawaran vendor telah aktif.`)
            } else {
                showSuccess('Berhasil!', `Draf tender RFQ ${createdRfq.rfq_number || form.value.title} berhasil dibuat.`)
            }

            router.push({
                name: 'user.purchasing.rfq.detail',
                params: { id: createdRfq.id }
            })
        } catch (err) {
            console.error('Failed to create RFQ:', err)
            showError('Gagal Membuat RFQ', err.response?.data?.message || 'Terjadi kesalahan saat menyimpan draf RFQ.')
        } finally {
            isSubmitting.value = false
        }
    }

    onMounted(async () => {
        await Promise.all([
            fetchAvailablePlans(),
            fetchSuppliers()
        ])

        if (route.query.plan_ids) {
            const ids = String(route.query.plan_ids)
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
            if (ids.length > 0) {
                form.value.procurement_plan_id = Number(ids[0])
                additionalPlanIds.value = ids.slice(1).map(id => Number(id))
                await syncCombinedPlanItems(false)
            }
        } else if (route.query.plan_id) {
            form.value.procurement_plan_id = Number(route.query.plan_id)
            await syncCombinedPlanItems(false)
        } else if (procurementPlans.value.length > 0) {
            // Auto-select first ready plan if user opened /purchasing/rfqs/create directly
            form.value.procurement_plan_id = procurementPlans.value[0].id
        }
    })

    return {
        isSubmitting,
        isLoadingPlans,
        isLoadingPlanDetail,
        isLoadingSuppliers,
        procurementPlans,
        selectedPlan,
        additionalPlanIds,
        additionalPlans,
        form,
        planItems,
        selectedSupplierIds,
        primaryPlanOptions,
        availableAdditionalPlanOptions,
        supplierOptions,
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
