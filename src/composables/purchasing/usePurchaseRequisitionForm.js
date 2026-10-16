import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
    createPurchaseRequisition,
    showPurchaseRequisition,
    updatePurchaseRequisition
} from '@/services/purchaseRequisitionServices.js'
import { getCompanies } from '@/services/companyServices.js'
import { searchItems } from '@/services/itemServices.js'
import { searchUnits } from '@/services/unitServices.js'
import { 
    getApprovalConfigurations, 
    getApprovalOptions 
} from '@/services/approvalServices.js'
import { searchAccountingCategories } from '@/services/accountingCategoryServices.js'
import { searchAccountingSubcategories } from '@/services/accountingSubcategoryServices.js'
import { searchAccountingAccounts } from '@/services/accountingAccountServices.js'
import { searchCurrencies } from '@/services/currencyServices.js'
import { showLoading, showSuccess, showError, showConfirm, closeSwal } from '@/utils/swal.js'

export function usePurchaseRequisitionForm() {
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()

    // Edit mode state
    const editPrId = computed(() => route.params.id ? Number(route.params.id) : null)
    const isEditMode = computed(() => Boolean(editPrId.value))
    const existingPrNumber = ref('')
    const existingPrStatus = ref('')
    const latestRevisionAction = ref(null)
    const existingRequester = ref(null)
    const isLoadingPr = ref(false)

    // Wizard state
    const currentStep = ref(1)
    const TOTAL_STEPS = 3
    const showWorkflowPreview = ref(false)

    // Master data state
    const isLoadingMeta = ref(false)
    const isSubmitting = ref(false)
    const companies = ref([])
    const divisions = ref([])
    const availableConfigs = ref([])
    const itemsCatalog = ref([])
    const unitsList = ref([])

    // Accounting master options (cache)
    const accountingCategories = ref([])
    const accountingSubcategories = ref([])
    const accountingAccounts = ref([])

    const errors = ref({})

    // Today & nextWeek dates (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    function createEmptyItemRow() {
        const defaultUnitId = unitsList.value.find(u => u.code?.toUpperCase() === 'PCS' || u.name?.toUpperCase() === 'PCS')?.id || unitsList.value[0]?.id || null
        return {
            _uid: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            entry_mode: 'catalog', // 'catalog' | 'custom'
            item_id: null,
            item_name: '',
            detail_name: '',
            unit_id: defaultUnitId,
            quantity: 1,
            estimated_price: '',
            reference_url: '',
            notes: '',
            accounting_category_id: null,
            accounting_subcategory_id: null,
            accounting_account_id: null,
            showAccounting: false,
            showDetails: false
        }
    }

    // Main Form Model
    const form = ref({
        company_id: null,
        division_id: null,
        requester_id: null,
        request_date: today,
        required_date: nextWeek,
        purpose: '',
        notes: '',
        approval_configuration_id: null,
        currency: 'IDR',
        exchange_rate: 1,
        items: [
            createEmptyItemRow()
        ]
    })

    // Computeds for Select Options
    const companyOptions = computed(() => {
        return companies.value.map(c => ({
            value: c.id,
            label: c.code ? `${c.name} (${c.code})` : c.name
        }))
    })

    const divisionOptions = computed(() => {
        return divisions.value.map(d => ({
            value: d.id,
            label: d.code ? `${d.name} (${d.code})` : d.name
        }))
    })

    const approvalConfigOptions = computed(() => {
        const list = availableConfigs.value.map(cfg => ({
            value: cfg.id,
            label: `${cfg.name} (${cfg.code})`,
            subtitle: `${cfg.levels?.length || 0} Level Persetujuan`
        }))
        return [
            { value: null, label: 'Otomatis (Sesuai Alur Perusahaan & Divisi)', subtitle: 'Sistem memilih alur aktif' },
            ...list
        ]
    })

    const selectedWorkflow = computed(() => {
        if (form.value.approval_configuration_id) {
            return availableConfigs.value.find(c => c.id === form.value.approval_configuration_id) || null
        }
        return availableConfigs.value.find(c => c.is_default) || availableConfigs.value[0] || null
    })

    const getApproverDisplay = (lvl) => {
        if (!lvl) return ''
        switch (lvl.approver_scope) {
            case 'department_head':
                return 'Department Head (Atasan Divisi)'
            case 'role_only':
                return lvl.role?.name ? `Role: ${lvl.role.name}` : (lvl.role_id ? `Role #${lvl.role_id}` : 'Role Khusus')
            case 'role_and_division':
                return lvl.role?.name ? `Role ${lvl.role.name} (${lvl.division?.name || 'Divisi Pemohon'})` : 'Role Divisi'
            case 'job_level_and_division':
                return lvl.job_level?.name ? `Level: ${lvl.job_level.name}` : (lvl.job_level_id ? `Job Level #${lvl.job_level_id}` : 'Job Level Divisi')
            case 'position_and_division':
                return lvl.position?.name ? `Jabatan: ${lvl.position.name}` : (lvl.position_id ? `Posisi #${lvl.position_id}` : 'Posisi Divisi')
            case 'specific_user':
                return lvl.specific_user?.name || lvl.user?.name || (lvl.specific_user_id ? `User #${lvl.specific_user_id}` : 'User Spesifik')
            default:
                return lvl.approver_scope_label || String(lvl.approver_scope || '').replace(/_/g, ' ')
        }
    }

    const selectedWorkflowLevels = computed(() => {
        if (!selectedWorkflow.value?.levels || !Array.isArray(selectedWorkflow.value.levels)) {
            return []
        }
        const sorted = [...selectedWorkflow.value.levels].sort((a, b) => (a.step_order || 0) - (b.step_order || 0))
        const totalTiers = sorted.length
        return sorted.map((lvl, idx) => {
            const order = lvl.step_order || idx + 1
            let tierBadge = `Tahap ${order}`
            if (order === 1) tierBadge = `Tahap 1 (Awal)`
            else if (order === totalTiers) tierBadge = `Tahap ${order} (Final)`

            return {
                ...lvl,
                id: lvl.id || idx + 1,
                step_order: order,
                step_name: lvl.step_name || `Persetujuan Tingkat ${order}`,
                assignee_label: getApproverDisplay(lvl),
                approver_name: getApproverDisplay(lvl),
                status_label: tierBadge,
                approval_mode: lvl.approval_mode || 'any'
            }
        })
    })

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date)
    }

    const itemOptions = computed(() => {
        return itemsCatalog.value.map(i => ({
            value: i.id,
            label: `${i.code} - ${i.name}`,
            subtitle: i.item_type || ''
        }))
    })

    const unitOptions = computed(() => {
        return unitsList.value.map(u => ({
            value: u.id,
            label: `${u.code} - ${u.name}`
        }))
    })

    const accountingCategoryOptions = computed(() => {
        return accountingCategories.value.map(c => ({
            value: c.id,
            label: `${c.code} - ${c.name}`
        }))
    })

    const accountingSubcategoryOptions = computed(() => {
        return accountingSubcategories.value.map(s => ({
            value: s.id,
            label: `${s.code} - ${s.name}`
        }))
    })

    const accountingAccountOptions = computed(() => {
        return accountingAccounts.value.map(a => ({
            value: a.id,
            label: `${a.code} - ${a.name}`
        }))
    })

    // Summary metrics
    const totalQuantity = computed(() => {
        return form.value.items.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
    })

    const totalEstimatedAmount = computed(() => {
        return form.value.items.reduce((sum, row) => {
            const qty = Number(row.quantity) || 0
            const price = Number(row.estimated_price) || 0
            return sum + (qty * price)
        }, 0)
    })

    const totalEstimatedAmountInBase = computed(() => {
        const rate = Number(form.value.exchange_rate) || 1
        return Math.round(totalEstimatedAmount.value * rate)
    })

    const currenciesList = ref([])
    const isLoadingCurrencies = ref(false)

    const fetchCurrenciesList = async () => {
        try {
            isLoadingCurrencies.value = true
            const res = await searchCurrencies('', 100)
            if (res.data && res.data.length > 0) {
                currenciesList.value = res.data
            } else {
                currenciesList.value = [
                    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', exchange_rate: 1, is_base: true },
                    { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 16250, is_base: false },
                    { code: 'EUR', name: 'Euro', symbol: '€', exchange_rate: 17500, is_base: false },
                    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', exchange_rate: 12100, is_base: false }
                ]
            }
        } catch {
            currenciesList.value = [
                { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', exchange_rate: 1, is_base: true },
                { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 16250, is_base: false }
            ]
        } finally {
            isLoadingCurrencies.value = false
        }
    }

    watch(() => form.value.currency, (newCode) => {
        const found = currenciesList.value.find(c => c.code === newCode)
        if (found) {
            form.value.exchange_rate = found.exchange_rate || 1
        }
    })

    const daysUntilRequired = computed(() => {
        if (!form.value.request_date || !form.value.required_date) return null
        const reqDate = new Date(form.value.request_date)
        const dueDate = new Date(form.value.required_date)
        const diffTime = dueDate.getTime() - reqDate.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    })

    // Computed display helpers for Employee info
    const employeeName = computed(() => {
        if (isEditMode.value && existingRequester.value?.name) {
            return existingRequester.value.name
        }
        return authStore.profile?.name || authStore.user?.name || 'Karyawan Pemohon'
    })

    const employeeNik = computed(() => {
        return authStore.profile?.nik ? `NIK: ${authStore.profile.nik}` : 'Profil Karyawan'
    })

    const employeePosition = computed(() => {
        return authStore.profile?.position?.name || authStore.profile?.job_level?.name || 'Staff'
    })

    const employeeCompanyName = computed(() => {
        return authStore.profile?.company?.name || companies.value.find(c => c.id === form.value.company_id)?.name || 'PADMA SOODE INDONESIA (PSI)'
    })

    const employeeDivisionName = computed(() => {
        return authStore.profile?.division?.name || divisions.value.find(d => d.id === form.value.division_id)?.name || 'SISTEM & AUDIT (IT)'
    })

    // Fetch existing PR data for edit mode
    const fetchExistingPr = async (id) => {
        try {
            isLoadingPr.value = true
            showLoading('Memuat data PR...', 'Mengambil detail dokumen draft')
            const response = await showPurchaseRequisition(id)
            const pr = response.data || {}

            if (pr.status !== 'draft' && pr.status !== 'revision_requested') {
                await showError(
                    'Tidak Dapat Mengedit',
                    `Purchase Requisition ${pr.pr_number || ''} saat ini berstatus "${pr.status}" dan tidak dapat diedit. Hanya PR berstatus Draft atau Perlu Revisi yang dapat diperbarui.`
                )
                router.push({ name: 'user.purchasing.requisitions' })
                return
            }

            existingPrStatus.value = pr.status || ''
            existingPrNumber.value = pr.pr_number || ''
            existingRequester.value = pr.requester || null

            if (pr.status === 'revision_requested' && pr.approval_request?.actions) {
                const revAction = pr.approval_request.actions
                    .filter(a => a.action === 'revision' || a.action === 'request_revision')
                    .sort((a, b) => new Date(b.acted_at || 0) - new Date(a.acted_at || 0))[0]
                latestRevisionAction.value = revAction || null
            } else {
                latestRevisionAction.value = null
            }

            form.value.company_id = pr.company_id || pr.company?.id || null
            form.value.requester_id = pr.requester_id || pr.requester?.id || authStore.user?.id || null
            form.value.request_date = pr.request_date ? String(pr.request_date).split('T')[0] : today
            form.value.required_date = pr.required_date ? String(pr.required_date).split('T')[0] : nextWeek
            form.value.purpose = pr.purpose || ''
            form.value.notes = pr.notes || ''
            form.value.approval_configuration_id = pr.approval_request?.configuration_id || null
            form.value.currency = pr.currency || 'IDR'
            form.value.exchange_rate = Number(pr.exchange_rate) || 1

            if (form.value.company_id) {
                await fetchDivisionsForCompany(form.value.company_id)
                form.value.division_id = pr.division_id || pr.division?.id || null
                await fetchApprovalConfigs()
            }

            if (Array.isArray(pr.items) && pr.items.length > 0) {
                form.value.items = pr.items.map((item, idx) => ({
                    _uid: `item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                    entry_mode: item.item_id ? 'catalog' : 'custom',
                    item_id: item.item_id || null,
                    item_name: item.item_name || item.item?.name || '',
                    detail_name: item.detail_name || '',
                    unit_id: item.unit_id || item.unit?.id || null,
                    quantity: Number(item.quantity) || 1,
                    estimated_price: item.estimated_price !== null && item.estimated_price !== undefined ? item.estimated_price : '',
                    reference_url: item.reference_url || '',
                    notes: item.notes || '',
                    accounting_category_id: item.accounting_category_id || null,
                    accounting_subcategory_id: item.accounting_subcategory_id || null,
                    accounting_account_id: item.accounting_account_id || null,
                    showAccounting: Boolean(item.accounting_category_id || item.accounting_subcategory_id || item.accounting_account_id),
                    showDetails: Boolean(item.detail_name || item.reference_url || item.notes)
                }))
            } else {
                form.value.items = [createEmptyItemRow()]
            }

            closeSwal()
        } catch (err) {
            console.error('Failed to load existing PR:', err)
            showError('Gagal Memuat PR', 'Data Purchase Requisition tidak ditemukan atau terjadi kesalahan server.', err)
            router.push({ name: 'user.purchasing.requisitions' })
        } finally {
            isLoadingPr.value = false
        }
    }

    // Fetch initial master data
    const fetchInitialMetadata = async () => {
        try {
            isLoadingMeta.value = true
            
            const companiesRes = await getCompanies('', 1)
            companies.value = companiesRes.data || []

            if (!isEditMode.value) {
                if (authStore.user?.id) {
                    form.value.requester_id = authStore.user.id
                }

                const userCompanyId = authStore.profile?.company?.id || authStore.profile?.company_id || (companies.value.length > 0 ? companies.value[0].id : 6)
                if (userCompanyId) {
                    form.value.company_id = userCompanyId
                }

                const userDivId = authStore.profile?.division?.id || authStore.profile?.division_id || 5
                if (userDivId) {
                    form.value.division_id = userDivId
                }
            }

            await Promise.all([
                fetchItemsSearch(''),
                fetchUnitsSearch(''),
                fetchAccountingCategoriesSearch(''),
                fetchApprovalConfigs()
            ])

            if (isEditMode.value) {
                await fetchExistingPr(editPrId.value)
            } else if (form.value.company_id) {
                await fetchDivisionsForCompany(form.value.company_id)
            }
        } catch (err) {
            console.error('Failed to load initial metadata:', err)
            showError('Gagal Memuat Data!', 'Tidak dapat memuat data referensi awal pengadaan.', err)
        } finally {
            isLoadingMeta.value = false
        }
    }

    watch(() => authStore.profile, (newProfile) => {
        if (isEditMode.value) return
        if (newProfile) {
            const cId = newProfile.company?.id || newProfile.company_id
            if (cId) form.value.company_id = cId
            const dId = newProfile.division?.id || newProfile.division_id
            if (dId) form.value.division_id = dId
        }
    }, { immediate: true })

    const fetchDivisionsForCompany = async (companyId) => {
        if (!companyId) {
            divisions.value = []
            return
        }

        try {
            const optsRes = await getApprovalOptions({ company_id: companyId })
            const opts = optsRes.data || {}
            divisions.value = opts.divisions || opts.division || []

            if (!isEditMode.value) {
                const userDivId = authStore.profile?.division?.id || authStore.profile?.division_id
                if (userDivId) {
                    form.value.division_id = userDivId
                } else if (divisions.value.length > 0 && !form.value.division_id) {
                    form.value.division_id = divisions.value[0].id
                }
            }
        } catch (err) {
            console.error('Failed to load divisions:', err)
        }
    }

    watch(() => form.value.company_id, async (newCompanyId) => {
        if (newCompanyId && !isLoadingPr.value) {
            await fetchDivisionsForCompany(newCompanyId)
            await fetchApprovalConfigs()
        }
    })

    const fetchApprovalConfigs = async () => {
        try {
            const res = await getApprovalConfigurations({
                document_type: 'purchase_requisition',
                is_active: true,
                company_id: form.value.company_id || undefined
            })
            if (res.data && res.data.length > 0) {
                availableConfigs.value = res.data
            } else {
                const fallbackRes = await getApprovalConfigurations({
                    document_type: 'purchase_requisition',
                    is_active: true
                })
                availableConfigs.value = fallbackRes.data || []
            }
        } catch (err) {
            console.error('Failed to load approval configurations:', err)
        }
    }

    const fetchItemsSearch = async (query = '') => {
        try {
            const res = await searchItems(query, 30)
            itemsCatalog.value = res.data || []
        } catch (err) {
            console.error('Failed to search items:', err)
        }
    }

    const fetchUnitsSearch = async (query = '') => {
        try {
            const res = await searchUnits(query, 30)
            unitsList.value = res.data || []

            const defaultUnitId = unitsList.value.find(u => u.code?.toUpperCase() === 'PCS' || u.name?.toUpperCase() === 'PCS')?.id || unitsList.value[0]?.id || null
            if (defaultUnitId) {
                form.value.items.forEach(row => {
                    if (!row.unit_id) {
                        row.unit_id = defaultUnitId
                    }
                })
            }
        } catch (err) {
            console.error('Failed to search units:', err)
        }
    }

    const fetchAccountingCategoriesSearch = async (query = '') => {
        try {
            const res = await searchAccountingCategories(query)
            accountingCategories.value = res.data || []
        } catch (err) {
            console.error('Failed to search accounting categories:', err)
        }
    }

    const handleItemChange = (row, itemId) => {
        if (!itemId) return
        const selected = itemsCatalog.value.find(i => i.id === itemId)
        if (!selected) return

        if (selected.unit_id) {
            row.unit_id = selected.unit_id
        } else if (selected.unit?.id) {
            row.unit_id = selected.unit.id
        }

        if (selected.accounting_category_id) {
            row.accounting_category_id = selected.accounting_category_id
            row.showAccounting = true
        }
        if (selected.accounting_subcategory_id) {
            row.accounting_subcategory_id = selected.accounting_subcategory_id
        }
        if (selected.accounting_account_id) {
            row.accounting_account_id = selected.accounting_account_id
        }
    }

    const addItemRow = () => {
        form.value.items.push(createEmptyItemRow())
    }

    const removeItemRow = (index) => {
        if (form.value.items.length <= 1) return
        form.value.items.splice(index, 1)
    }

    // Touched tracking
    const touchedFields = ref(new Set())

    const markTouched = (field) => {
        touchedFields.value.add(field)
        if (field === 'purpose' && form.value.purpose && form.value.purpose.trim()) {
            delete errors.value.purpose
        }
        if (field === 'required_date' && form.value.required_date) {
            delete errors.value.required_date
        }
    }

    const isFieldTouched = (field) => {
        return touchedFields.value.has(field)
    }

    const getFieldError = (field) => {
        return isFieldTouched(field) ? (errors.value[field] || '') : ''
    }

    const getItemError = (index, field) => {
        const key = `items.${index}.${field}`
        return isFieldTouched(key) ? (errors.value[key] || '') : ''
    }

    const markItemTouched = (index, field) => {
        const key = `items.${index}.${field}`
        touchedFields.value.add(key)
        const item = form.value.items[index]
        if (item && errors.value[key]) {
            if (field === 'item_id' && item.item_id) delete errors.value[key]
            if (field === 'item_name' && item.item_name && item.item_name.trim()) delete errors.value[key]
            if (field === 'unit_id' && item.unit_id) delete errors.value[key]
            if (field === 'quantity' && Number(item.quantity) > 0) delete errors.value[key]
            if (field === 'estimated_price' && Number(item.estimated_price) > 0) delete errors.value[key]
        }
    }

    const markStepTouched = (step) => {
        if (step === 1) {
            touchedFields.value.add('purpose')
            touchedFields.value.add('required_date')
        } else if (step === 2) {
            form.value.items.forEach((_, idx) => {
                touchedFields.value.add(`items.${idx}.item_id`)
                touchedFields.value.add(`items.${idx}.item_name`)
                touchedFields.value.add(`items.${idx}.unit_id`)
                touchedFields.value.add(`items.${idx}.quantity`)
                touchedFields.value.add(`items.${idx}.estimated_price`)
                touchedFields.value.add(`items.${idx}.detail_name`)
                touchedFields.value.add(`items.${idx}.reference_url`)
                touchedFields.value.add(`items.${idx}.notes`)
            })
        }
    }

    const validateForm = (actionType = 'submit') => {
        const errs = {}
        
        if (!form.value.company_id) {
            form.value.company_id = authStore.profile?.company?.id || authStore.profile?.company_id || (companies.value.length > 0 ? companies.value[0].id : 6)
        }
        if (!form.value.division_id) {
            form.value.division_id = authStore.profile?.division?.id || authStore.profile?.division_id || (divisions.value.length > 0 ? divisions.value[0].id : 5)
        }
        if (!form.value.requester_id) {
            form.value.requester_id = authStore.user?.id || 4
        }

        if (!form.value.company_id) {
            errs.company_id = 'Perusahaan (Company) belum ditentukan dari profil Anda.'
        }
        if (!form.value.division_id) {
            errs.division_id = 'Divisi pemohon (Division) belum ditentukan dari profil Anda.'
        }
        if (!form.value.purpose || !form.value.purpose.trim()) {
            errs.purpose = 'Tujuan pengadaan (Purpose) wajib diisi.'
        } else if (form.value.purpose.trim().length > 255) {
            errs.purpose = 'Tujuan pengadaan maksimal 255 karakter.'
        }
        if (!form.value.request_date) {
            form.value.request_date = today
        }
        if (!form.value.required_date) {
            errs.required_date = 'Tanggal kebutuhan barang wajib diisi.'
        } else if (form.value.request_date && form.value.required_date < form.value.request_date) {
            errs.required_date = 'Tanggal kebutuhan tidak boleh lebih awal dari tanggal permintaan.'
        }

        if (!form.value.items || form.value.items.length === 0) {
            errs.items = 'Minimal harus menambahkan 1 item pengadaan.'
        } else {
            form.value.items.forEach((item, idx) => {
                const rowNumber = idx + 1
                if (item.entry_mode === 'catalog' && !item.item_id) {
                    errs[`items.${idx}.item_id`] = `Barang dari katalog master wajib dipilih (Item #${rowNumber}).`
                }
                if (item.entry_mode === 'custom' && (!item.item_name || !item.item_name.trim())) {
                    errs[`items.${idx}.item_name`] = `Nama barang wajib diisi untuk pembelian non-katalog (Item #${rowNumber}).`
                }
                if (!item.unit_id) {
                    errs[`items.${idx}.unit_id`] = `Satuan (Unit) wajib dipilih (Item #${rowNumber}).`
                }
                if (!item.quantity || Number(item.quantity) <= 0) {
                    errs[`items.${idx}.quantity`] = `Jumlah kuantitas harus lebih besar dari 0 (Item #${rowNumber}).`
                }
                if (actionType === 'submit') {
                    if (item.estimated_price === '' || item.estimated_price === null || item.estimated_price === undefined || Number(item.estimated_price) <= 0) {
                        errs[`items.${idx}.estimated_price`] = `Perkiraan harga satuan wajib diisi dan lebih besar dari 0 (Item #${rowNumber}).`
                    }
                } else {
                    if (item.estimated_price !== '' && item.estimated_price !== null && item.estimated_price !== undefined && Number(item.estimated_price) < 0) {
                        errs[`items.${idx}.estimated_price`] = `Perkiraan harga satuan tidak boleh negatif (Item #${rowNumber}).`
                    }
                }
                if (item.reference_url && item.reference_url.trim()) {
                    try {
                        new URL(item.reference_url.trim())
                    } catch {
                        errs[`items.${idx}.reference_url`] = `Format tautan referensi tidak valid (harus https://...) (Item #${rowNumber}).`
                    }
                }
            })
        }

        errors.value = errs
        return Object.keys(errs).length === 0
    }

    const stepMeta = [
        { no: 1, title: 'Informasi Pengajuan', desc: 'Tanggal, tujuan, dan alur' },
        { no: 2, title: 'Daftar Item', desc: 'Barang, kuantitas, dan estimasi' },
        { no: 3, title: 'Review & Konfirmasi', desc: 'Verifikasi dan kirim berkas' }
    ]

    const validateStep = (step) => {
        if (step === 1) {
            const errs = {}
            if (!form.value.purpose || !form.value.purpose.trim()) {
                errs.purpose = 'Tujuan pengadaan (Purpose) wajib diisi.'
            } else if (form.value.purpose.trim().length > 255) {
                errs.purpose = 'Tujuan pengadaan maksimal 255 karakter.'
            }
            if (!form.value.required_date) {
                errs.required_date = 'Tanggal kebutuhan barang wajib diisi.'
            } else if (form.value.request_date && form.value.required_date < form.value.request_date) {
                errs.required_date = 'Tanggal kebutuhan tidak boleh lebih awal dari tanggal permintaan.'
            }
            errors.value = { ...errors.value, ...errs }
            for (const k of ['purpose', 'required_date']) {
                if (!errs[k]) delete errors.value[k]
            }
            return Object.keys(errs).length === 0
        }
        if (step === 2) {
            const errs = {}
            if (!form.value.items || form.value.items.length === 0) {
                errs.items = 'Minimal harus menambahkan 1 item pengadaan.'
            } else {
                form.value.items.forEach((item, idx) => {
                    const rowNumber = idx + 1
                    if (item.entry_mode === 'catalog' && !item.item_id) {
                        errs[`items.${idx}.item_id`] = `Barang dari katalog master wajib dipilih (Item #${rowNumber}).`
                    }
                    if (item.entry_mode === 'custom' && (!item.item_name || !item.item_name.trim())) {
                        errs[`items.${idx}.item_name`] = `Nama barang wajib diisi untuk pembelian non-katalog (Item #${rowNumber}).`
                    }
                    if (!item.unit_id) {
                        errs[`items.${idx}.unit_id`] = `Satuan (Unit) wajib dipilih (Item #${rowNumber}).`
                    }
                    if (!item.quantity || Number(item.quantity) <= 0) {
                        errs[`items.${idx}.quantity`] = `Jumlah kuantitas harus lebih besar dari 0 (Item #${rowNumber}).`
                    }
                    if (!item.estimated_price || Number(item.estimated_price) <= 0) {
                        errs[`items.${idx}.estimated_price`] = `Harga satuan wajib diisi dan lebih besar dari 0 (Item #${rowNumber}).`
                    }
                    if (errs[`items.${idx}.detail_name`] || errs[`items.${idx}.reference_url`] || errs[`items.${idx}.notes`]) {
                        item.showDetails = true
                    }
                    if (errs[`items.${idx}.accounting_category_id`] || errs[`items.${idx}.accounting_subcategory_id`] || errs[`items.${idx}.accounting_account_id`]) {
                        item.showAccounting = true
                    }
                })
            }
            errors.value = { ...errors.value, ...errs }
            return Object.keys(errs).length === 0
        }
        return true
    }

    const goToStep = (step) => {
        if (step < 1 || step > TOTAL_STEPS) return
        if (step > currentStep.value) {
            for (let s = currentStep.value; s < step; s++) {
                markStepTouched(s)
                if (!validateStep(s)) {
                    currentStep.value = s
                    return
                }
            }
        }
        currentStep.value = step
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const nextStep = () => {
        markStepTouched(currentStep.value)
        if (validateStep(currentStep.value)) {
            goToStep(currentStep.value + 1)
        } else {
            showError('Langkah Belum Lengkap', 'Mohon lengkapi kolom yang wajib diisi pada langkah ini sebelum lanjut.')
            setTimeout(() => {
                const firstErrorEl = document.querySelector('[aria-invalid="true"], .border-rose-300, .border-rose-400, .border-rose-500, input:invalid')
                if (firstErrorEl) firstErrorEl.focus()
            }, 120)
        }
    }

    const prevStep = () => {
        goToStep(currentStep.value - 1)
    }

    const handleSubmit = async (actionType = 'submit') => {
        if (!validateForm(actionType)) {
            const errorList = Object.values(errors.value)
            const errorHtml = errorList.map(msg => `<li class="flex items-start gap-1.5"><span class="text-rose-500 font-bold">•</span><span>${msg}</span></li>`).join('')
            
            showError(
                'Form Belum Lengkap',
                `<div class="text-left text-sm mt-2 text-slate-700">
                    <p class="font-semibold text-slate-800 mb-2">Mohon lengkapi atau periksa kolom berikut:</p>
                    <ul class="space-y-1.5 bg-rose-50 p-3 rounded-lg border border-rose-200 text-xs text-rose-900 font-medium max-h-52 overflow-y-auto">
                        ${errorHtml}
                    </ul>
                </div>`
            )

            setTimeout(() => {
                const firstErr = document.querySelector('.border-rose-300, .border-rose-400, .ring-rose-400')
                if (firstErr) {
                    firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }, 150)
            return
        }

        const isSubmitAction = actionType === 'submit'

        if (isSubmitAction) {
            const isRevision = existingPrStatus.value === 'revision_requested'
            const confirmed = await showConfirm(
                isRevision ? 'Ajukan Ulang Persetujuan PR?' : 'Ajukan Purchase Requisition?',
                isRevision
                    ? 'Seluruh perbaikan dokumen PR ini akan disimpan dan diajukan kembali ke alur persetujuan pimpinan. Lanjutkan?'
                    : (isEditMode.value
                        ? 'Perubahan dokumen PR akan disimpan dan langsung diajukan ke alur persetujuan (approval) atasan Anda. Lanjutkan?'
                        : 'Dokumen PR akan langsung dikirimkan ke alur persetujuan (approval) atasan Anda. Pastikan rincian item dan perkiraan harga sudah benar.'),
                isRevision ? 'Ya, Ajukan Ulang Sekarang' : 'Ya, Ajukan Sekarang',
                'Periksa Kembali'
            )
            if (!confirmed) return
        }

        try {
            isSubmitting.value = true
            const isRevision = existingPrStatus.value === 'revision_requested'
            showLoading(
                isSubmitAction 
                    ? (isRevision ? 'Menyimpan & mengajukan ulang PR...' : (isEditMode.value ? 'Menyimpan & mengajukan PR...' : 'Mengirimkan pengajuan PR...'))
                    : (isRevision ? 'Menyimpan perbaikan PR...' : (isEditMode.value ? 'Menyimpan perubahan draft PR...' : 'Menyimpan draft PR...'))
            )

            const payload = {
                company_id: form.value.company_id,
                division_id: form.value.division_id,
                requester_id: form.value.requester_id || authStore.user?.id,
                request_date: form.value.request_date,
                required_date: form.value.required_date,
                purpose: form.value.purpose.trim(),
                notes: form.value.notes ? form.value.notes.trim() : null,
                currency: form.value.currency || 'IDR',
                exchange_rate: Number(form.value.exchange_rate) || 1,
                action: isSubmitAction ? 'submit' : 'draft',
                submit_immediately: isSubmitAction,
                is_submitted: isSubmitAction,
                approval_configuration_id: form.value.approval_configuration_id || null,
                items: form.value.items.map(row => ({
                    item_id: row.entry_mode === 'catalog' ? row.item_id : null,
                    item_name: row.entry_mode === 'custom' ? (row.item_name ? row.item_name.trim() : null) : null,
                    detail_name: row.detail_name ? row.detail_name.trim() : null,
                    unit_id: row.unit_id,
                    quantity: Number(row.quantity),
                    estimated_price: Number(row.estimated_price) || 0,
                    accounting_category_id: row.accounting_category_id || null,
                    accounting_subcategory_id: row.accounting_subcategory_id || null,
                    accounting_account_id: row.accounting_account_id || null,
                    reference_url: row.reference_url ? row.reference_url.trim() : null,
                    notes: row.notes ? row.notes.trim() : null
                }))
            }

            let response
            if (isEditMode.value) {
                response = await updatePurchaseRequisition(editPrId.value, payload)
            } else {
                response = await createPurchaseRequisition(payload)
            }
            const prData = response.data || {}
            const prNumber = prData.pr_number || existingPrNumber.value || ''

            showSuccess(
                'Berhasil!', 
                isSubmitAction 
                    ? (isRevision
                        ? `Purchase Requisition ${prNumber} berhasil diperbaiki dan diajukan kembali ke alur persetujuan.`
                        : (isEditMode.value
                            ? `Purchase Requisition ${prNumber} berhasil diperbarui dan diajukan ke persetujuan.`
                            : `Purchase Requisition ${prNumber} berhasil dibuat dan diajukan ke persetujuan.`))
                    : (isRevision
                        ? `Perbaikan Purchase Requisition ${prNumber} berhasil disimpan.`
                        : (isEditMode.value
                            ? `Perubahan draft Purchase Requisition ${prNumber} berhasil disimpan.`
                            : `Draft Purchase Requisition ${prNumber} berhasil disimpan.`))
            )

            router.push({ name: 'user.purchasing.requisitions' })
        } catch (err) {
            console.error(`Failed to ${isEditMode.value ? 'update' : 'create'} purchase requisition:`, err)
            if (err?.response?.status === 422 && err?.response?.data?.errors) {
                const apiErrors = err.response.data.errors
                const mapped = {}
                for (const key in apiErrors) {
                    mapped[key] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key]
                }
                errors.value = mapped
                showError('Validasi Gagal', err.response?.data?.message || 'Mohon periksa data yang dimasukkan.')
            } else {
                showError(
                    'Gagal Menyimpan!', 
                    err?.response?.data?.message || 'Terjadi kesalahan sistem saat menyimpan Purchase Requisition.',
                    err
                )
            }
        } finally {
            isSubmitting.value = false
        }
    }

    return {
        // State
        router,
        route,
        authStore,
        editPrId,
        isEditMode,
        existingPrNumber,
        existingPrStatus,
        latestRevisionAction,
        existingRequester,
        isLoadingPr,
        currentStep,
        TOTAL_STEPS,
        stepMeta,
        showWorkflowPreview,
        isLoadingMeta,
        isSubmitting,
        companies,
        divisions,
        availableConfigs,
        itemsCatalog,
        unitsList,
        currenciesList,
        accountingCategories,
        accountingSubcategories,
        accountingAccounts,
        errors,
        form,
        today,
        nextWeek,

        // Options
        companyOptions,
        divisionOptions,
        approvalConfigOptions,
        selectedWorkflow,
        selectedWorkflowLevels,
        itemOptions,
        unitOptions,
        accountingCategoryOptions,
        accountingSubcategoryOptions,
        accountingAccountOptions,

        // Metric computeds
        totalQuantity,
        totalEstimatedAmount,
        totalEstimatedAmountInBase,
        daysUntilRequired,
        employeeName,
        employeeNik,
        employeePosition,
        employeeCompanyName,
        employeeDivisionName,

        // Actions
        createEmptyItemRow,
        addItemRow,
        removeItemRow,
        handleItemChange,
        fetchInitialMetadata,
        fetchCurrenciesList,
        fetchItemsSearch,
        fetchUnitsSearch,
        fetchAccountingCategoriesSearch,
        fetchDivisionsForCompany,
        fetchApprovalConfigs,
        formatDisplayDate,
        markTouched,
        isFieldTouched,
        getFieldError,
        getItemError,
        markItemTouched,
        markStepTouched,
        validateStep,
        goToStep,
        nextStep,
        prevStep,
        validateForm,
        handleSubmit,
    }
}
