<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { 
    createPurchaseRequisition,
    showPurchaseRequisition,
    updatePurchaseRequisition
} from '../../services/purchaseRequisitionServices.js'
import { getCompanies } from '../../services/companyServices.js'
import { searchItems } from '../../services/itemServices.js'
import { searchUnits } from '../../services/unitServices.js'
import { 
    getApprovalConfigurations, 
    getApprovalOptions 
} from '../../services/approvalServices.js'
import { searchAccountingCategories } from '../../services/accountingCategoryServices.js'
import { searchAccountingSubcategories } from '../../services/accountingSubcategoryServices.js'
import { searchAccountingAccounts } from '../../services/accountingAccountServices.js'
import { showLoading, showSuccess, showError, showConfirm, closeSwal } from '../../utils/swal.js'
import { formatCurrency } from '../../utils/stringUtils.js'

import BaseInput from '../../components/ui/BaseInput.vue'
import BaseSelect from '../../components/ui/BaseSelect.vue'
import SearchableSelect from '../../components/ui/SearchableSelect.vue'
import ApprovalStepper from '../../components/approval/ApprovalStepper.vue'

import {
    Home,
    ChevronRight,
    ShoppingBag,
    FileText,
    Plus,
    Trash2,
    Save,
    Send,
    ArrowLeft,
    Building2,
    Calendar,
    User,
    Layers,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Clock,
    Package,
    Globe,
    ChevronDown,
    ChevronUp,
    DollarSign,
    Check,
    GitBranch,
    RotateCcw
} from '@lucide/vue'

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

// State
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

// Today string YYYY-MM-DD
const today = new Date().toISOString().split('T')[0]
// Default required date (7 days from today)
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

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
    items: [
        createEmptyItemRow()
    ]
})

function createEmptyItemRow() {
    const defaultUnitId = unitsList.value.find(u => u.code?.toUpperCase() === 'PCS' || u.name?.toUpperCase() === 'PCS')?.id || unitsList.value[0]?.id || null
    return {
        _uid: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        entry_mode: 'catalog', // 'catalog' | 'custom'
        item_id: null,
        item_name: '',
        unit_id: defaultUnitId,
        quantity: 1,
        estimated_price: '',
        reference_url: '',
        notes: '',
        accounting_category_id: null,
        accounting_subcategory_id: null,
        accounting_account_id: null,
        showAccounting: false
    }
}

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

        // Extract latest revision notes if revision_requested
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

        // Fetch divisions based on this PR's company
        if (form.value.company_id) {
            await fetchDivisionsForCompany(form.value.company_id)
            form.value.division_id = pr.division_id || pr.division?.id || null
            await fetchApprovalConfigs()
        }

        // Map line items
        if (Array.isArray(pr.items) && pr.items.length > 0) {
            form.value.items = pr.items.map((item, idx) => ({
                _uid: `item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                entry_mode: item.item_id ? 'catalog' : 'custom',
                item_id: item.item_id || null,
                item_name: item.item_name || item.item?.name || '',
                unit_id: item.unit_id || item.unit?.id || null,
                quantity: Number(item.quantity) || 1,
                estimated_price: item.estimated_price !== null && item.estimated_price !== undefined ? item.estimated_price : '',
                reference_url: item.reference_url || '',
                notes: item.notes || '',
                accounting_category_id: item.accounting_category_id || null,
                accounting_subcategory_id: item.accounting_subcategory_id || null,
                accounting_account_id: item.accounting_account_id || null,
                showAccounting: Boolean(item.accounting_category_id || item.accounting_subcategory_id || item.accounting_account_id)
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
        
        // 1. Fetch Companies
        const companiesRes = await getCompanies('', 1)
        companies.value = companiesRes.data || []

        if (!isEditMode.value) {
            // Set default requester ID from current auth user
            if (authStore.user?.id) {
                form.value.requester_id = authStore.user.id
            }

            // Set default Company & Division from profile if available, with robust fallbacks
            const userCompanyId = authStore.profile?.company?.id || authStore.profile?.company_id || (companies.value.length > 0 ? companies.value[0].id : 6)
            if (userCompanyId) {
                form.value.company_id = userCompanyId
            }

            const userDivId = authStore.profile?.division?.id || authStore.profile?.division_id || 5
            if (userDivId) {
                form.value.division_id = userDivId
            }
        }

        // 2. Fetch initial items catalog & units
        await Promise.all([
            fetchItemsSearch(''),
            fetchUnitsSearch(''),
            fetchAccountingCategoriesSearch(''),
            fetchApprovalConfigs()
        ])

        // 3. Load existing PR if in edit mode, else load divisions for default company
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

// Watch profile to automatically set company and division behind the scenes
watch(() => authStore.profile, (newProfile) => {
    if (isEditMode.value) return
    if (newProfile) {
        const cId = newProfile.company?.id || newProfile.company_id
        if (cId) form.value.company_id = cId
        const dId = newProfile.division?.id || newProfile.division_id
        if (dId) form.value.division_id = dId
    }
}, { immediate: true })

// Fetch divisions filtered by company
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
            // Set default division from profile if it matches company
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

// Watch company change to reload divisions & approval configs
watch(() => form.value.company_id, async (newCompanyId) => {
    if (newCompanyId && !isLoadingPr.value) {
        await fetchDivisionsForCompany(newCompanyId)
        await fetchApprovalConfigs()
    }
})

// Fetch Approval Configurations for PR
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
            // Fallback: muat konfigurasi PR aktif jika filter perusahaan belum membuahkan hasil
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

// Search items
const fetchItemsSearch = async (query = '') => {
    try {
        const res = await searchItems(query, 30)
        itemsCatalog.value = res.data || []
    } catch (err) {
        console.error('Failed to search items:', err)
    }
}

// Search units
const fetchUnitsSearch = async (query = '') => {
    try {
        const res = await searchUnits(query, 30)
        unitsList.value = res.data || []

        // Auto-assign default unit (e.g. PCS or first unit) to any item row missing a unit
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

// Search accounting categories
const fetchAccountingCategoriesSearch = async (query = '') => {
    try {
        const res = await searchAccountingCategories(query)
        accountingCategories.value = res.data || []
    } catch (err) {
        console.error('Failed to search accounting categories:', err)
    }
}

// Handle item selection change: auto-fill unit & accounting relations
const handleItemChange = (row, itemId) => {
    if (!itemId) return
    const selected = itemsCatalog.value.find(i => i.id === itemId)
    if (!selected) return

    // Auto-fill Unit if not already selected
    if (selected.unit_id) {
        row.unit_id = selected.unit_id
    } else if (selected.unit?.id) {
        row.unit_id = selected.unit.id
    }

    // Auto-fill Accounting relations if defined on Item
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

// Add Item Row
const addItemRow = () => {
    form.value.items.push(createEmptyItemRow())
}

// Remove Item Row
const removeItemRow = (index) => {
    if (form.value.items.length <= 1) return
    form.value.items.splice(index, 1)
}

// Helpers for nested errors
const getItemError = (index, field) => {
    return errors.value[`items.${index}.${field}`] || ''
}

// Client-side validation
const validateForm = (actionType = 'submit') => {
    const errs = {}
    
    // Fallback ensure organizational data
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

// Submit Form (Draft vs Submit to Approval)
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
            action: isSubmitAction ? 'submit' : 'draft',
            submit_immediately: isSubmitAction,
            is_submitted: isSubmitAction,
            approval_configuration_id: form.value.approval_configuration_id || null,
            items: form.value.items.map(row => ({
                item_id: row.entry_mode === 'catalog' ? row.item_id : null,
                item_name: row.entry_mode === 'custom' ? (row.item_name ? row.item_name.trim() : null) : null,
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

onMounted(() => {
    fetchInitialMetadata()
})
</script>

<template>
    <div class="flex flex-col gap-5 pb-14">
        <!-- 1. BREADCRUMB NAVIGATION -->
        <BaseBreadcrumb 
            :items="[
                { label: 'Purchasing', to: { name: 'user.purchasing' } },
                { label: 'Purchase Requisitions', to: { name: 'user.purchasing.requisitions' } },
                { label: isEditMode ? (existingPrStatus === 'revision_requested' ? `Perbaiki PR (${existingPrNumber || 'Loading...'})` : `Edit Draft PR (${existingPrNumber || 'Loading...'})`) : 'Buat Pengajuan Baru' }
            ]" 
        />

        <!-- 2. PAGE HEADER -->
        <div class="bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1">
                <div class="flex items-center gap-2.5">
                    <div class="p-2 rounded-lg border" :class="existingPrStatus === 'revision_requested' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-800 border-slate-200/60'">
                        <RotateCcw v-if="existingPrStatus === 'revision_requested'" class="w-5 h-5 text-amber-600" />
                        <FileText v-else class="w-5 h-5 text-slate-800" />
                    </div>
                    <div>
                        <h1 class="text-lg font-bold text-slate-900 tracking-tight">
                            {{ isEditMode ? (existingPrStatus === 'revision_requested' ? 'Perbaiki Pengajuan Purchase Requisition' : 'Edit Draft Purchase Requisition') : 'Buat Purchase Requisition (PR)' }}
                        </h1>
                        <p class="text-xs text-slate-500 mt-0.5">
                            {{ isEditMode ? (existingPrStatus === 'revision_requested' ? `Perbaiki rincian dokumen pengadaan ${existingPrNumber || ''} sesuai arahan revisi peninjau.` : `Perbarui data dan rincian item kebutuhan pengadaan untuk dokumen ${existingPrNumber || 'Draft'}.`) : 'Ajukan permohonan kebutuhan pengadaan barang atau jasa untuk divisi Anda.' }}
                        </p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    @click="router.push({ name: 'user.purchasing.requisitions' })"
                    :disabled="isSubmitting"
                    class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                    Batal
                </button>

                <button
                    type="button"
                    @click="handleSubmit('draft')"
                    :disabled="isSubmitting"
                    class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                    <Save class="w-3.5 h-3.5 text-slate-600" />
                    <span>{{ isEditMode ? (existingPrStatus === 'revision_requested' ? 'Simpan Perbaikan (Draft)' : 'Simpan Perubahan') : 'Simpan Draft' }}</span>
                </button>

                <button
                    type="button"
                    @click="handleSubmit('submit')"
                    :disabled="isSubmitting"
                    class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-colors shadow-xs shadow-blue-200 disabled:opacity-50"
                >
                    <Send class="w-3.5 h-3.5" />
                    <span>{{ existingPrStatus === 'revision_requested' ? 'Simpan & Ajukan Ulang' : 'Ajukan Persetujuan' }}</span>
                </button>
            </div>
        </div>

        <!-- REVISION INSTRUCTIONS ALERT BANNER (if revision_requested) -->
        <div 
            v-if="isEditMode && existingPrStatus === 'revision_requested'" 
            class="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5 shadow-2xs"
        >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-amber-200/80">
                <div class="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <RotateCcw class="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Dokumen Memerlukan Perbaikan (Instruksi Revisi Peninjau)</span>
                </div>
                <div v-if="latestRevisionAction?.user_name" class="text-[11px] text-amber-800">
                    Oleh Peninjau: <strong class="text-amber-950">{{ latestRevisionAction.user_name }}</strong> <span v-if="latestRevisionAction.user_role">({{ latestRevisionAction.user_role }})</span>
                </div>
            </div>

            <div class="space-y-1">
                <span class="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Catatan & Arahan Revisi:</span>
                <p class="text-xs text-amber-950 bg-white/90 p-3 rounded-lg border border-amber-200 leading-relaxed font-medium">
                    "{{ latestRevisionAction?.notes || 'Mohon periksa dan sesuaikan kembali item kebutuhan serta estimasi harga pengadaan.' }}"
                </p>
            </div>

            <p class="text-[11px] text-amber-700 italic">
                Tips: Silakan perbarui data atau rincian item di bawah ini, lalu klik tombol <strong>"Simpan & Ajukan Ulang"</strong> untuk mengajukan kembali ke alur persetujuan.
            </p>
        </div>

        <!-- MAIN FORM BODY -->
        <form @submit.prevent="handleSubmit('submit')" class="space-y-5">
            <!-- SECTION 1: HEADER & ORGANIZATIONAL DETAILS -->
            <div class="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-5">
                <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-300">
                            1
                        </span>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900">
                                Informasi Pengajuan & Organisasi
                            </h3>
                            <p class="text-xs text-slate-500">
                                Data pemohon, perusahaan, dan divisi otomatis terisi dari profil karyawan Anda.
                            </p>
                        </div>
                    </div>

                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Check class="w-3 h-3 stroke-[3]" />
                        Profil Karyawan Aktif
                    </span>
                </div>

                <!-- Employee & Organization Automatic Info Banner -->
                <div class="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-xs">
                        <!-- 1. Pemohon / Karyawan -->
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                                <User class="w-4 h-4" />
                            </div>
                            <div class="space-y-0.5">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pemohon (Requester)</span>
                                <h4 class="font-bold text-slate-900 text-xs leading-tight">{{ employeeName }}</h4>
                                <span class="text-[11px] text-slate-500 block">{{ employeeNik }} • {{ employeePosition }}</span>
                            </div>
                        </div>

                        <!-- 2. Perusahaan -->
                        <div class="flex items-center gap-2.5 pt-2.5 sm:pt-0 sm:pl-3">
                            <div class="w-8 h-8 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                                <Building2 class="w-4 h-4" />
                            </div>
                            <div class="space-y-0.5">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Perusahaan (Company)</span>
                                <h4 class="font-bold text-slate-900 text-xs leading-tight">{{ employeeCompanyName }}</h4>
                                <span class="text-[11px] text-slate-500 block">Unit Bisnis Pemohon</span>
                            </div>
                        </div>

                        <!-- 3. Divisi Pemohon -->
                        <div class="flex items-center gap-2.5 pt-2.5 sm:pt-0 sm:pl-3">
                            <div class="w-8 h-8 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                                <Layers class="w-4 h-4" />
                            </div>
                            <div class="space-y-0.5">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Divisi Pemohon (Division)</span>
                                <h4 class="font-bold text-slate-900 text-xs leading-tight">{{ employeeDivisionName }}</h4>
                                <span class="text-[11px] text-slate-500 block">Pusat Biaya Pengadaan</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Alert if Profile Company/Division is unmapped -->
                <div v-if="errors.company_id || errors.division_id" class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle class="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{{ errors.company_id || errors.division_id }} Hubungi admin sistem jika profil karyawan Anda belum terhubung dengan perusahaan atau divisi yang valid.</span>
                </div>

                <!-- Input Fields Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Request Date (Ditetapkan Otomatis Saat Pembuatan) -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Tanggal Permintaan</span>
                            <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                <Check class="w-3 h-3 stroke-[2.5]" />
                                Otomatis Hari Ini
                            </span>
                        </label>
                        <div class="h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center justify-between shadow-2xs select-none">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Calendar class="w-3.5 h-3.5" />
                                </div>
                                <span>{{ formatDisplayDate(form.request_date) }}</span>
                            </div>
                            <span class="text-[11px] text-slate-400 font-normal italic">Ditetapkan sistem</span>
                        </div>
                        <p class="text-[11px] text-slate-400 mt-1">
                            Ditetapkan otomatis saat PR dibuat (tidak dapat diubah).
                        </p>
                    </div>

                    <!-- Required Date -->
                    <div>
                        <BaseInput
                            v-model="form.required_date"
                            type="date"
                            :min="form.request_date || today"
                            label="Tanggal Kebutuhan (Required Date)"
                            :error="errors.required_date"
                            required
                        />
                        <p v-if="daysUntilRequired !== null" class="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                            <Clock class="w-3 h-3 text-slate-400" />
                            Target pemenuhan dalam <span class="font-bold text-slate-800">{{ daysUntilRequired }} hari</span>.
                        </p>
                    </div>

                    <!-- Approval Workflow Config -->
                    <div>
                        <BaseSelect
                            v-model="form.approval_configuration_id"
                            :options="approvalConfigOptions"
                            label="Alur Persetujuan (Workflow)"
                            placeholder="Otomatis (Sesuai Alur Perusahaan)..."
                            :error="errors.approval_configuration_id"
                        />
                        <p class="text-[11px] text-slate-400 mt-1">
                            Pilih alur spesifik atau gunakan penentuan otomatis alur default.
                        </p>
                    </div>

                    <!-- Live Workflow Preview Container (Horizontal Stepper Kiri ke Kanan) -->
                    <div class="md:col-span-2 lg:col-span-3">
                        <div class="rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/40 via-white to-slate-50/60 p-4 transition-all">
                            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-blue-100/70">
                                <div class="flex items-center gap-2.5">
                                    <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                        <GitBranch class="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h4 class="text-xs font-bold text-slate-900">
                                                Pratinjau Alur Persetujuan Dokumen (Workflow Preview)
                                            </h4>
                                            <span v-if="selectedWorkflow" class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                                {{ selectedWorkflow.code || selectedWorkflow.name }}
                                            </span>
                                        </div>
                                        <p class="text-[11px] text-slate-500 mt-0.5">
                                            {{ selectedWorkflow ? (selectedWorkflow.description || selectedWorkflow.name) : 'Alur bertingkat yang akan memproses pengajuan PR ini' }}
                                        </p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2">
                                    <span v-if="selectedWorkflowLevels.length > 0" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                        {{ selectedWorkflowLevels.length }} Tahap Persetujuan Berjenjang
                                    </span>
                                    <span v-else class="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                                        Belum ada konfigurasi alur aktif
                                    </span>
                                </div>
                            </div>

                            <!-- Horizontal Stepper from Left to Right -->
                            <div v-if="selectedWorkflowLevels.length > 0" class="py-1">
                                <ApprovalStepper
                                    :levels="selectedWorkflowLevels"
                                    :currentStepOrder="1"
                                    overallStatus="pending"
                                    orientation="horizontal"
                                />
                            </div>
                            <div v-else class="py-6 text-center text-xs text-slate-400 bg-white/70 rounded-lg border border-dashed border-slate-200">
                                <AlertCircle class="w-5 h-5 text-slate-300 mx-auto mb-1" />
                                Tidak ditemukan konfigurasi alur persetujuan untuk pilihan ini. PR akan diproses melalui alur persetujuan default sistem.
                            </div>
                        </div>
                    </div>

                    <!-- Purpose (Tujuan Pengadaan) -->
                    <div class="md:col-span-2 lg:col-span-3">
                        <BaseInput
                            v-model="form.purpose"
                            label="Tujuan Pengadaan (Purpose)"
                            placeholder="e.g. Pengadaan Suku Cadang Mesin Line 2"
                            :error="errors.purpose"
                            required
                        />
                        <p class="text-[11px] text-slate-400 mt-1">
                            Tuliskan ringkasan singkat alasan kebutuhan pengadaan ini.
                        </p>
                    </div>
                </div>

                <!-- Notes / Additional Instructions -->
                <div>
                    <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Catatan Pengadaan Tambahan (Opsional)
                    </label>
                    <textarea
                        v-model="form.notes"
                        rows="2"
                        class="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400 transition-all"
                        placeholder="Instruksi pengiriman, lokasi penyerahan barang, kontak vendor rekanan, atau informasi teknis..."
                    ></textarea>
                </div>
            </div>

            <!-- SECTION 2: ITEMS LIST (REPEATER) -->
            <div class="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-300">
                            2
                        </span>
                        <div>
                            <div class="flex flex-wrap items-center gap-2">
                                <h3 class="text-sm font-bold text-slate-900">
                                    Daftar Barang / Jasa (Line Items)
                                </h3>
                                <span class="px-2 py-0.2 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {{ form.items.length }} Item
                                </span>
                                <span v-if="totalEstimatedAmount > 0" class="px-2 py-0.2 rounded text-[11px] font-mono font-bold bg-blue-600 text-white shadow-xs shadow-blue-200">
                                    Total Est: {{ formatCurrency(totalEstimatedAmount) }}
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 mt-0.5">
                                Masukkan rincian spesifikasi barang, satuan unit, estimasi kuantitas, dan perkiraan harga.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        @click="addItemRow"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-semibold transition-colors self-start sm:self-auto"
                    >
                        <Plus class="w-3.5 h-3.5 text-blue-600" />
                        <span>Tambah Item Baru</span>
                    </button>
                </div>

                <!-- Global items validation error banner -->
                <div v-if="errors.items" class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle class="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{{ errors.items }}</span>
                </div>

                <!-- REPEATER ROWS -->
                <div class="space-y-3.5">
                    <div 
                        v-for="(row, index) in form.items" 
                        :key="row._uid"
                        class="bg-slate-50/60 rounded-lg border border-slate-200 p-4 space-y-3.5 hover:border-slate-300 transition-colors relative"
                    >
                        <!-- ROW HEADER -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
                            <div class="flex items-center gap-2.5">
                                <span class="w-5 h-5 rounded bg-blue-600 text-white text-[11px] font-bold font-mono flex items-center justify-center shadow-xs shadow-blue-200">
                                    {{ index + 1 }}
                                </span>
                                <div class="flex items-center p-0.5 bg-slate-200/80 rounded-md text-xs font-medium">
                                    <button
                                        type="button"
                                        @click="row.entry_mode = 'catalog'"
                                        :class="row.entry_mode === 'catalog' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'"
                                        class="px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1"
                                    >
                                        <Package class="w-3 h-3" />
                                        <span>Master Katalog</span>
                                    </button>
                                    <button
                                        type="button"
                                        @click="row.entry_mode = 'custom'"
                                        :class="row.entry_mode === 'custom' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'"
                                        class="px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1"
                                    >
                                        <Globe class="w-3 h-3" />
                                        <span>Beli Langsung / Non-Katalog</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="button"
                                    @click="removeItemRow(index)"
                                    :disabled="form.items.length <= 1"
                                    :class="[
                                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs',
                                        form.items.length > 1
                                            ? 'text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/90 border border-rose-200 cursor-pointer active:scale-95'
                                            : 'text-slate-400 bg-slate-100 border border-slate-200/80 cursor-not-allowed opacity-60'
                                    ]"
                                    :title="form.items.length <= 1 ? 'Minimal harus ada 1 item permohonan' : 'Hapus baris item ini'"
                                >
                                    <Trash2 class="w-3.5 h-3.5" :class="form.items.length > 1 ? 'text-rose-500' : 'text-slate-400'" />
                                    <span>Hapus Item</span>
                                </button>
                            </div>
                        </div>

                        <!-- MAIN ITEM FIELDS -->
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                            <!-- Item Selection (Catalog Mode) -->
                            <div v-if="row.entry_mode === 'catalog'" class="md:col-span-5">
                                <SearchableSelect
                                    v-model="row.item_id"
                                    :options="itemOptions"
                                    label="Barang / Item (Katalog)"
                                    placeholder="Cari item barang..."
                                    :error="getItemError(index, 'item_id')"
                                    :searchable="true"
                                    @search="fetchItemsSearch"
                                    @update:modelValue="(val) => handleItemChange(row, val)"
                                    required
                                />
                            </div>

                            <!-- Custom Free-Text Item Name (Direct Purchase Mode) -->
                            <div v-else class="md:col-span-5">
                                <BaseInput
                                    v-model="row.item_name"
                                    label="Nama Barang / Spesifikasi Bebas"
                                    placeholder="e.g. Logitech Wireless Mouse M331 Silent Hitam"
                                    :error="getItemError(index, 'item_name')"
                                    required
                                />
                                <span class="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                                    <span>Barang insidental (misal Tokopedia, Shopee, atau toko rekanan).</span>
                                </span>
                            </div>

                            <!-- Unit Selection -->
                            <div class="md:col-span-2">
                                <SearchableSelect
                                    v-model="row.unit_id"
                                    :options="unitOptions"
                                    label="Satuan (Unit)"
                                    placeholder="Pilih Satuan..."
                                    :error="getItemError(index, 'unit_id')"
                                    :searchable="true"
                                    @search="fetchUnitsSearch"
                                    required
                                />
                            </div>

                            <!-- Quantity -->
                            <div class="md:col-span-2">
                                <BaseInput
                                    v-model="row.quantity"
                                    type="number"
                                    min="0.001"
                                    step="any"
                                    label="Jumlah (Qty)"
                                    placeholder="0"
                                    :error="getItemError(index, 'quantity')"
                                    required
                                />
                            </div>

                            <!-- Estimated Price (Per Unit) -->
                            <div class="md:col-span-3">
                                <BaseInput
                                    v-model="row.estimated_price"
                                    type="number"
                                    min="0"
                                    step="any"
                                    label="Est. Harga Satuan (Rp)"
                                    placeholder="e.g. 150000"
                                    :error="getItemError(index, 'estimated_price')"
                                    required
                                />
                                <div v-if="row.estimated_price && row.quantity" class="text-[11px] text-slate-800 font-semibold mt-1 flex items-center justify-between bg-white px-2 py-0.5 rounded border border-slate-200">
                                    <span class="text-slate-500">Subtotal:</span>
                                    <span class="font-mono font-bold">{{ formatCurrency((Number(row.quantity) || 0) * (Number(row.estimated_price) || 0)) }}</span>
                                </div>
                            </div>

                            <!-- Reference URL -->
                            <div class="md:col-span-6">
                                <BaseInput
                                    v-model="row.reference_url"
                                    label="Link Referensi Barang (Opsional)"
                                    placeholder="e.g. https://www.tokopedia.com/product/..."
                                    :error="getItemError(index, 'reference_url')"
                                />
                                <div v-if="row.reference_url" class="mt-1">
                                    <a
                                        :href="row.reference_url"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 underline font-medium"
                                    >
                                        <span>Buka tautan referensi</span>
                                        <ExternalLink class="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            <!-- Item Notes -->
                            <div class="md:col-span-6">
                                <BaseInput
                                    v-model="row.notes"
                                    label="Catatan / Spesifikasi Teknis Khusus"
                                    placeholder="e.g. Warna hitam, kapasitas 500GB, garansi resmi"
                                    :error="getItemError(index, 'notes')"
                                />
                            </div>
                        </div>

                        <!-- SEKSI KLASIFIKASI AKUN & ANGGARAN (DI BAWAH FORM ITEM) -->
                        <div class="pt-3 border-t border-slate-200/80 flex flex-col gap-2.5">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <button
                                    type="button"
                                    @click="row.showAccounting = !row.showAccounting"
                                    :class="[
                                        'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs w-fit',
                                        row.showAccounting
                                            ? 'bg-indigo-50/80 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/10'
                                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                                    ]"
                                >
                                    <Layers class="w-3.5 h-3.5" :class="row.showAccounting ? 'text-indigo-600' : 'text-slate-500'" />
                                    <span>Klasifikasi Akun & Anggaran</span>
                                    <span class="text-[11px] font-normal text-slate-400">(Opsional)</span>
                                    <span 
                                        v-if="row.accounting_account_id" 
                                        class="ml-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold"
                                    >
                                        Terisi
                                    </span>
                                    <ChevronDown 
                                        class="w-3.5 h-3.5 ml-1 transition-transform duration-200" 
                                        :class="row.showAccounting ? 'rotate-180 text-indigo-600' : 'text-slate-400'" 
                                    />
                                </button>

                                <span v-if="!row.showAccounting" class="text-[11px] text-slate-400 italic">
                                    Klik tombol di samping jika item ini memerlukan pemetaan Chart of Accounts (CoA)
                                </span>
                            </div>

                            <!-- COLLAPSIBLE ACCOUNTING REFERENCES SECTION -->
                            <div 
                                v-if="row.showAccounting" 
                                class="p-4 bg-white rounded-xl border border-indigo-100 ring-1 ring-indigo-500/10 space-y-3 mt-1 shadow-2xs"
                            >
                                <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <Layers class="w-3.5 h-3.5 text-indigo-600" />
                                        Alokasi Akun & Anggaran Item
                                    </h4>
                                    <span class="text-[11px] text-slate-500">
                                        Alokasi beban akuntansi & CoA pembiayaan (opsional)
                                    </span>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <SearchableSelect
                                            v-model="row.accounting_category_id"
                                            :options="accountingCategoryOptions"
                                            label="Kategori Akun"
                                            placeholder="Pilih Kategori..."
                                            :searchable="true"
                                            @search="fetchAccountingCategoriesSearch"
                                        />
                                    </div>
                                    <div>
                                        <SearchableSelect
                                            v-model="row.accounting_subcategory_id"
                                            :options="accountingSubcategoryOptions"
                                            label="Subkategori Akun"
                                            placeholder="Pilih Subkategori..."
                                            :searchable="true"
                                        />
                                    </div>
                                    <div>
                                        <SearchableSelect
                                            v-model="row.accounting_account_id"
                                            :options="accountingAccountOptions"
                                            label="Akun Beban / Aset"
                                            placeholder="Pilih Akun..."
                                            :searchable="true"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ADD ITEM BUTTON FOOTER -->
                <div class="pt-1">
                    <button
                        type="button"
                        @click="addItemRow"
                        class="w-full py-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
                    >
                        <Plus class="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                        <span>+ Tambah Item Barang Lainnya</span>
                    </button>
                </div>
            </div>

            <!-- SECTION 3: SUMMARY BANNER -->
            <div class="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div class="space-y-0.5 text-center sm:text-left">
                    <h4 class="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                        <CheckCircle2 class="w-4 h-4 text-emerald-300" />
                        Ringkasan Permohonan Pengadaan
                    </h4>
                    <p class="text-[11px] text-blue-100/90">
                        Pastikan seluruh kebutuhan telah dicantumkan dengan benar sebelum mengirimkan persetujuan.
                    </p>
                </div>

                <div class="flex items-center gap-4 sm:gap-6 divide-x divide-blue-500/30 text-xs">
                    <div class="text-center px-2">
                        <p class="text-[10px] text-blue-200 uppercase tracking-wider font-semibold">Total Item</p>
                        <p class="text-base font-bold font-mono text-white mt-0.5">{{ form.items.length }}</p>
                    </div>

                    <div class="text-center px-3 sm:px-4">
                        <p class="text-[10px] text-blue-200 uppercase tracking-wider font-semibold">Total Qty</p>
                        <p class="text-base font-bold font-mono text-white mt-0.5">{{ totalQuantity.toLocaleString('id-ID') }}</p>
                    </div>

                    <div class="text-center px-3 sm:px-4">
                        <p class="text-[10px] text-blue-200 uppercase tracking-wider font-semibold">Estimasi Total</p>
                        <p class="text-base font-bold font-mono text-emerald-300 mt-0.5">{{ formatCurrency(totalEstimatedAmount) }}</p>
                    </div>

                    <div class="text-center px-3 sm:px-4">
                        <p class="text-[10px] text-blue-200 uppercase tracking-wider font-semibold">Target Waktu</p>
                        <p class="text-xs font-semibold text-blue-100 mt-0.5">
                            {{ daysUntilRequired !== null ? `${daysUntilRequired} Hari` : '-' }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- SECTION 4: FORM ACTION CONTROLS -->
            <div class="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <button
                    type="button"
                    @click="router.push({ name: 'user.purchasing.requisitions' })"
                    :disabled="isSubmitting"
                    class="w-full sm:w-auto px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                    <ArrowLeft class="w-3.5 h-3.5" />
                    <span>Kembali ke Daftar</span>
                </button>

                <div class="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                    <button
                        type="button"
                        @click="handleSubmit('draft')"
                        :disabled="isSubmitting"
                        class="w-full sm:w-auto px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        <Save class="w-3.5 h-3.5 text-slate-600" />
                        <span>{{ isEditMode ? (existingPrStatus === 'revision_requested' ? 'Simpan Perbaikan (Draft)' : 'Simpan Perubahan Draft') : 'Simpan sebagai Draft' }}</span>
                    </button>

                    <button
                        type="button"
                        @click="handleSubmit('submit')"
                        :disabled="isSubmitting"
                        class="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs shadow-blue-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        <Send class="w-3.5 h-3.5" />
                        <span>{{ existingPrStatus === 'revision_requested' ? 'Simpan & Ajukan Ulang Persetujuan' : 'Simpan & Ajukan Persetujuan' }}</span>
                    </button>
                </div>
            </div>
        </form>
    </div>
</template>
