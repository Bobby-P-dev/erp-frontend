<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { 
    getPublicPortalRfq, 
    submitPublicPortalQuotation, 
    declinePublicPortalRfq 
} from '../../services/rfqServices.js'
import { formatCurrency, formatDate } from '../../composables/useFormatter.js'
import { showSuccess, showError, showConfirm, showPrompt } from '../../utils/swal.js'

import AppHeader from '../../components/layout/AppHeader.vue'
import AppFooter from '../../components/layout/AppFooter.vue'

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

import {
    Scale,
    FileText,
    Building2,
    Calendar,
    Clock,
    MapPin,
    CreditCard,
    CheckCircle2,
    AlertCircle,
    XCircle,
    UploadCloud,
    Trash2,
    FileCheck,
    Send,
    X,
    ShieldCheck,
    Lock,
    ExternalLink,
    Info,
    ChevronDown,
    Truck,
    LayoutDashboard,
    Bell,
    Sun,
    LogOut,
    ArrowLeft,
    ReceiptText,
    Sparkles
} from '@lucide/vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const token = computed(() => route.params.token)

const isSupplierLoggedIn = computed(() => {
    return authStore.isAuthenticated && authStore.user?.account_type === 'supplier'
})

const authUser = computed(() => authStore.user || {})
const authSupplier = computed(() => authUser.value.supplier || {})

const supplierInitials = computed(() => {
    const name = authSupplier.value.name || authUser.value.name || portalData.value?.supplier?.name || 'Vendor'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
})

const handleLogout = async () => {
    const confirmed = await showConfirm(
        'Keluar dari Portal?',
        'Anda akan keluar dari sesi akun rekanan PT Padma Soode Indonesia.',
        'Ya, Keluar',
        'Batal',
        '#ef4444'
    )
    if (!confirmed) return

    await authStore.logout()
    showSuccess('Berhasil Keluar', 'Anda telah keluar dari Portal Rekanan.')
    router.push({ name: 'login' })
}

// State
const isLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref(null)

const portalData = ref(null)
const quoteForm = ref({
    vendor_quotation_reference: '',
    quotation_date: new Date().toISOString().substring(0, 10),
    valid_until: '',
    payment_terms: '',
    lead_time_days: 7,
    tax_rate: 11,
    shipping_cost: 0,
    notes: '',
    items: []
})

const selectedFile = ref(null)
const fileInputRef = ref(null)

// Load portal RFQ data
const loadPortalData = async () => {
    isLoading.value = true
    errorMessage.value = null
    try {
        const res = await getPublicPortalRfq(token.value)
        portalData.value = res.data

        // Initialize quote form items
        if (portalData.value?.rfq?.items) {
            quoteForm.value.items = portalData.value.rfq.items.map(it => ({
                rfq_item_id: it.id,
                item_name: it.item_name,
                item_specifications: it.item_specifications,
                unit_name: it.unit_name || it.unit_code,
                target_quantity: Number(it.target_quantity),
                offered_quantity: Number(it.target_quantity),
                unit_price: 0,
                lead_time_days: 7,
                brand: '',
                notes: ''
            }))
        }

        // Set default payment terms from supplier or RFQ
        if (portalData.value?.rfq?.payment_terms_requested) {
            quoteForm.value.payment_terms = portalData.value.rfq.payment_terms_requested
        }
    } catch (err) {
        console.error('Portal load error:', err)
        errorMessage.value = err.response?.data?.message || 'Tautan portal tender tidak valid atau telah kedaluwarsa.'
    } finally {
        isLoading.value = false
    }
}

// Financial calculations
const subtotalAmount = computed(() => {
    if (!quoteForm.value.items?.length) return 0
    return quoteForm.value.items.reduce((sum, item) => {
        const qty = Number(item.offered_quantity) || 0
        const price = Number(item.unit_price) || 0
        return sum + (qty * price)
    }, 0)
})

const taxAmount = computed(() => {
    const rate = Number(quoteForm.value.tax_rate) || 0
    return Math.round((subtotalAmount.value * rate) / 100)
})

const shippingAmount = computed(() => {
    return Number(quoteForm.value.shipping_cost) || 0
})

const grandTotalAmount = computed(() => {
    return subtotalAmount.value + taxAmount.value + shippingAmount.value
})

// File handling
const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
        showError('Berkas Terlalu Besar', 'Ukuran berkas lampiran maksimal 10 MB.')
        return
    }

    selectedFile.value = file
}

const removeFile = () => {
    selectedFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
}

// Form validation
const validateForm = () => {
    if (!quoteForm.value.vendor_quotation_reference?.trim()) {
        showError('Validasi Gagal', 'Nomor surat penawaran resmi vendor wajib diisi.')
        return false
    }

    if (!quoteForm.value.items?.length) {
        showError('Validasi Gagal', 'Daftar item penawaran tidak boleh kosong.')
        return false
    }

    for (const it of quoteForm.value.items) {
        if (!it.offered_quantity || Number(it.offered_quantity) <= 0) {
            showError('Validasi Gagal', `Kuantitas penawaran untuk "${it.item_name}" harus lebih besar dari 0.`)
            return false
        }
        if (Number(it.unit_price) <= 0) {
            showError('Validasi Gagal', `Harga satuan untuk "${it.item_name}" harus lebih besar dari Rp 0.`)
            return false
        }
    }

    return true
}

// Submit Quotation
const handleSubmit = async () => {
    if (!validateForm()) return

    const confirmed = await showConfirm(
        'Kirim Penawaran Harga?',
        `Total penawaran: ${formatCurrency(grandTotalAmount.value)}. Pastikan seluruh harga satuan dan spesifikasi yang Anda masukkan sudah akurat.`,
        'Ya, Kirim Penawaran'
    )
    if (!confirmed) return

    isSubmitting.value = true
    try {
        const formData = new FormData()
        formData.append('vendor_quotation_reference', quoteForm.value.vendor_quotation_reference.trim())
        formData.append('quotation_date', quoteForm.value.quotation_date)
        if (quoteForm.value.valid_until) formData.append('valid_until', quoteForm.value.valid_until)
        if (quoteForm.value.payment_terms) formData.append('payment_terms', quoteForm.value.payment_terms)
        if (quoteForm.value.lead_time_days) formData.append('lead_time_days', quoteForm.value.lead_time_days)
        formData.append('tax_rate', quoteForm.value.tax_rate)
        formData.append('shipping_cost', quoteForm.value.shipping_cost || 0)
        if (quoteForm.value.notes) formData.append('notes', quoteForm.value.notes)

        const formattedItems = quoteForm.value.items.map(it => ({
            rfq_item_id: it.rfq_item_id,
            offered_quantity: Number(it.offered_quantity),
            unit_price: Number(it.unit_price),
            lead_time_days: it.lead_time_days ? Number(it.lead_time_days) : null,
            brand: it.brand || null,
            notes: it.notes || null
        }))
        formData.append('items', JSON.stringify(formattedItems))

        if (selectedFile.value) {
            formData.append('quotation_file', selectedFile.value)
        }

        await submitPublicPortalQuotation(token.value, formData)
        showSuccess('Penawaran Terkirim!', 'Surat penawaran harga Anda telah resmi diterima oleh tim pengadaan.')
        await loadPortalData()
    } catch (err) {
        console.error('Submission failed:', err)
        showError('Gagal Mengirim Penawaran', err.response?.data?.message || 'Terjadi kesalahan saat memproses penawaran Anda.')
    } finally {
        isSubmitting.value = false
    }
}

// Decline Participation
const handleDecline = async () => {
    const { isConfirmed, value } = await showPrompt({
        title: 'Tolak Partisipasi Tender',
        text: 'Mohon tuliskan alasan penolakan (misal: kapasitas produksi penuh, spesifikasi di luar lini produk).',
        placeholder: 'Tuliskan alasan penolakan di sini...',
        confirmText: 'Konfirmasi Tolak Tender',
        isDestructive: true
    })

    if (!isConfirmed) return

    try {
        await declinePublicPortalRfq(token.value, value || '')
        showSuccess('Tercatat', 'Konfirmasi penolakan partisipasi tender telah berhasil disimpan.')
        await loadPortalData()
    } catch (err) {
        console.error('Decline error:', err)
        showError('Gagal Menolak', err.response?.data?.message || 'Terjadi kesalahan saat mencatat penolakan.')
    }
}

// Countdown display
const deadlineInfo = computed(() => {
    if (!portalData.value?.rfq?.deadline_date) return null
    const deadline = new Date(portalData.value.rfq.deadline_date)
    deadline.setHours(23, 59, 59, 999)
    const now = new Date()
    const diffMs = deadline - now

    if (diffMs <= 0) {
        return { label: 'Batas Waktu Telah Berakhir', isExpired: true, class: 'bg-rose-50 text-rose-700 border-rose-200' }
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diffDays === 0) {
        return { label: `Berakhir Hari Ini (${diffHours} jam lagi)`, isExpired: false, class: 'bg-amber-50 text-amber-800 border-amber-200 font-bold' }
    }

    return { label: `Sisa ${diffDays} hari ${diffHours} jam`, isExpired: false, class: 'bg-blue-50 text-blue-700 border-blue-200' }
})

onMounted(() => {
    loadPortalData()
})
</script>

<template>
    <div class="min-h-screen flex flex-col bg-[#F7F9FC] font-sans antialiased text-slate-800 selection:bg-blue-100 selection:text-blue-900">
        <!-- 1. Corporate Brand Header (AppHeader identik dengan Dashboard Portal Rekanan & Main Layout) -->
        <AppHeader isSticky fullWidth>
            <template #left>
                <RouterLink 
                    :to="isSupplierLoggedIn ? { name: 'supplier.portal.dashboard' } : '#'" 
                    class="flex items-center gap-2.5 sm:gap-3 group select-none cursor-pointer"
                >
                    <img 
                        src="/pses_transparent.png" 
                        alt="Padma Soode ERP Sistem" 
                        class="h-6.5 sm:h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105" 
                    />
                    <div class="hidden sm:block h-5 w-px bg-[#E5EAF1]"></div>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF2FF] text-[#014BAA] border border-blue-200/80">
                        <ShieldCheck class="w-3.5 h-3.5 text-[#014BAA]" />
                        <span>PORTAL REKANAN</span>
                    </span>
                </RouterLink>
            </template>

            <!-- Right slot: Context-aware actions based on supplier auth session -->
            <template #right>
                <!-- Jika Sesi Rekanan Login Aktif -->
                <template v-if="isSupplierLoggedIn">
                    <RouterLink
                        :to="{ name: 'supplier.portal.dashboard' }"
                        class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#014BAA] bg-[#EAF2FF] hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs mr-1"
                    >
                        <LayoutDashboard class="w-3.5 h-3.5" />
                        <span>Dashboard Rekanan</span>
                    </RouterLink>

                    <button 
                        type="button" 
                        class="p-2.5 text-slate-500 hover:text-[#014BAA] hover:bg-[#EAF2FF] rounded-[10px] transition-colors relative cursor-pointer" 
                        title="Notifikasi Pengadaan"
                    >
                        <Bell class="w-5 h-5" />
                    </button>

                    <button 
                        type="button" 
                        class="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-[10px] transition-colors cursor-pointer" 
                        title="Mode Tampilan"
                    >
                        <Sun class="w-5 h-5" />
                    </button>

                    <div class="w-px h-6 bg-[#E5EAF1] mx-1"></div>

                    <!-- Supplier Profile Dropdown -->
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <button 
                                type="button" 
                                class="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer group select-none"
                            >
                                <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-[#014BAA] text-xs font-bold shadow-2xs border border-blue-200/80 shrink-0">
                                    {{ supplierInitials }}
                                </div>
                                <div class="text-left hidden sm:block">
                                    <p class="text-xs font-bold text-slate-900 leading-tight group-hover:text-[#014BAA] transition-colors uppercase tracking-tight truncate max-w-[150px]">
                                        {{ authSupplier.name || authUser.name || 'Akun Rekanan' }}
                                    </p>
                                    <p class="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5 uppercase tracking-wider font-mono">
                                        {{ authSupplier.supplier_code || 'VENDOR' }}
                                    </p>
                                </div>
                                <ChevronDown class="w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" :side-offset="8" class="w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50">
                            <DropdownMenuLabel class="px-3 py-2.5 border-b border-slate-100 mb-1">
                                <p class="text-xs font-bold text-slate-900 uppercase truncate">{{ authSupplier.name || authUser.name || 'Akun Rekanan' }}</p>
                                <p class="text-[10px] font-semibold text-slate-500 font-mono mt-0.5">{{ authSupplier.supplier_code || 'VENDOR REKANAN' }}</p>
                            </DropdownMenuLabel>

                            <DropdownMenuItem 
                                @click="router.push({ name: 'supplier.portal.dashboard' })"
                                class="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                            >
                                <LayoutDashboard class="w-4 h-4 text-slate-500" />
                                <span>Dashboard Rekanan</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                                @click="router.push({ name: 'supplier.portal.rfqs' })"
                                class="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                            >
                                <FileText class="w-4 h-4 text-slate-500" />
                                <span>Tender & RFQ Saya</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                                @click="router.push({ name: 'supplier.portal.quotations' })"
                                class="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                            >
                                <ReceiptText class="w-4 h-4 text-slate-500" />
                                <span>Riwayat Penawaran</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator class="my-1 border-slate-100" />

                            <DropdownMenuItem 
                                @click="handleLogout"
                                class="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
                            >
                                <LogOut class="w-4 h-4 text-rose-500" />
                                <span>Keluar (Logout)</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </template>

                <!-- Jika Guest / Magic Link Eksternal -->
                <template v-else>
                    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                        <Lock class="w-3.5 h-3.5" />
                        <span>Akses Terenkripsi</span>
                    </div>

                    <button 
                        type="button" 
                        class="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-[10px] transition-colors cursor-pointer" 
                        title="Mode Tampilan"
                    >
                        <Sun class="w-5 h-5" />
                    </button>

                    <div class="w-px h-6 bg-[#E5EAF1] mx-1"></div>

                    <RouterLink 
                        :to="{ name: 'login' }"
                        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#014BAA] bg-[#EAF2FF] hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                        <span>Masuk Akun</span>
                    </RouterLink>
                </template>
            </template>
        </AppHeader>

        <!-- 2. Main Canvas (Full Width identik dengan Dashboard Portal Rekanan & Main Layout) -->
        <main class="flex-1 flex flex-col w-full">
            <div class="w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-8 flex-1 space-y-6">

                <!-- Navigasi Cepat Jika Vendor Login -->
                <div v-if="isSupplierLoggedIn" class="flex items-center justify-between">
                    <RouterLink 
                        :to="{ name: 'supplier.portal.rfqs' }" 
                        class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#014BAA] transition-colors group cursor-pointer"
                    >
                        <ArrowLeft class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        <span>Kembali ke Tender & RFQ Saya</span>
                    </RouterLink>
                </div>

            <!-- A. LOADING STATE -->
            <div 
                v-if="isLoading" 
                class="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs"
            >
                <div class="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto"></div>
                <h3 class="text-sm font-bold text-slate-900">Memuat Dokumen Tender...</h3>
                <p class="text-xs text-slate-500">Memvalidasi token akses dan memuat spesifikasi teknis barang.</p>
            </div>

            <!-- B. ERROR STATE -->
            <div 
                v-else-if="errorMessage" 
                class="bg-white rounded-2xl border border-rose-200 p-8 sm:p-12 text-center space-y-5 shadow-xs max-w-xl mx-auto my-12"
            >
                <div class="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                    <AlertCircle class="w-8 h-8" />
                </div>
                <div class="space-y-1.5">
                    <h3 class="text-lg font-bold text-slate-900">Akses Tender Tidak Tersedia</h3>
                    <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">{{ errorMessage }}</p>
                </div>
                <div class="pt-2">
                    <button 
                        type="button" 
                        @click="loadPortalData"
                        class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                    >
                        Coba Muat Ulang
                    </button>
                </div>
            </div>

            <!-- C. TENDER CONTENT -->
            <template v-else-if="portalData">

                <!-- 1. Header Banner & Status Summary -->
                <div class="bg-white rounded-2xl border border-[#E5EAF1] p-6 sm:p-7 shadow-xs space-y-6">
                    <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-100">
                        <div class="space-y-1.5 max-w-4xl">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-mono text-xs font-bold text-[#014BAA] bg-[#EAF2FF] border border-blue-200/80 px-2.5 py-0.5 rounded-md">
                                    {{ portalData.rfq.rfq_number }}
                                </span>
                                <span class="text-xs font-medium text-slate-400">•</span>
                                <span class="text-xs font-medium text-slate-500">
                                    Diterbitkan: {{ formatDate(portalData.rfq.issue_date) }}
                                </span>
                            </div>
                            <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                {{ portalData.rfq.title }}
                            </h2>
                            <p v-if="portalData.rfq.notes" class="text-xs text-slate-600 leading-relaxed pt-1">
                                {{ portalData.rfq.notes }}
                            </p>
                        </div>

                        <!-- Status & Deadline Pill -->
                        <div class="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2.5 shrink-0">
                            <div 
                                v-if="deadlineInfo"
                                :class="['inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border font-medium', deadlineInfo.class]"
                            >
                                <Clock class="w-3.5 h-3.5" />
                                <span>{{ deadlineInfo.label }}</span>
                            </div>

                            <div class="text-xs text-slate-500 text-left md:text-right">
                                Batas Akhir: <strong class="text-slate-800">{{ formatDate(portalData.rfq.deadline_date) }}</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Meta Badges: Address, Terms, Supplier Profile -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                        <div class="p-4 rounded-xl bg-slate-50/80 border border-[#E5EAF1] space-y-1.5">
                            <div class="flex items-center gap-2 text-slate-500 font-medium">
                                <Building2 class="w-4 h-4 text-[#014BAA]" />
                                <span>Rekanan yang Diundang</span>
                            </div>
                            <div class="font-bold text-slate-900 text-sm">
                                {{ portalData.supplier.name }}
                            </div>
                            <div class="text-slate-500 text-[11px]">
                                Kontak: {{ portalData.supplier.contact_person || '-' }} ({{ portalData.supplier.email || '-' }})
                            </div>
                        </div>

                        <div class="p-4 rounded-xl bg-slate-50/80 border border-[#E5EAF1] space-y-1.5">
                            <div class="flex items-center gap-2 text-slate-500 font-medium">
                                <MapPin class="w-4 h-4 text-[#014BAA]" />
                                <span>Alamat Pengiriman Target</span>
                            </div>
                            <div class="font-bold text-slate-900">
                                {{ portalData.rfq.delivery_address || 'Pabrik Bekasi (FOB Destination)' }}
                            </div>
                            <div class="text-slate-500 text-[11px]">
                                Syarat Pembayaran: {{ portalData.rfq.payment_terms_requested || 'Net 30 Days' }}
                            </div>
                        </div>

                        <div class="p-4 rounded-xl bg-slate-50/80 border border-[#E5EAF1] space-y-1.5 sm:col-span-2 lg:col-span-1">
                            <div class="flex items-center gap-2 text-slate-500 font-medium">
                                <FileCheck class="w-4 h-4 text-[#014BAA]" />
                                <span>Status Respon Anda</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span 
                                    v-if="portalData.portal.quote_status === 'received'"
                                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs"
                                >
                                    <CheckCircle2 class="w-3.5 h-3.5" />
                                    Penawaran Terkirim
                                </span>
                                <span 
                                    v-else-if="portalData.portal.quote_status === 'declined'"
                                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-xs"
                                >
                                    <XCircle class="w-3.5 h-3.5" />
                                    Partisipasi Ditolak
                                </span>
                                <span 
                                    v-else
                                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-xs"
                                >
                                    <Clock class="w-3.5 h-3.5" />
                                    Menunggu Pengisian Penawaran
                                </span>
                            </div>
                            <div class="text-slate-500 text-[11px]">
                                Tautan dibuka: {{ formatDate(portalData.portal.viewed_at) }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. STATE A: ALREADY SUBMITTED (READ-ONLY OFFICIAL RECEIPT) -->
                <div 
                    v-if="portalData.portal.quote_status === 'received' && portalData.existing_quotation"
                    class="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 shadow-xs space-y-6"
                >
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-emerald-100">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                                <CheckCircle2 class="w-6 h-6" />
                            </div>
                            <div>
                                <h3 class="text-base sm:text-lg font-bold text-slate-900">
                                    Tanda Terima Penawaran Harga Resmi
                                </h3>
                                <p class="text-xs text-slate-500">
                                    No. Registrasi Sistem: <span class="font-mono font-bold text-emerald-700">{{ portalData.existing_quotation.quotation_number }}</span>
                                    • Ref Surat: <strong>{{ portalData.existing_quotation.vendor_quotation_reference || '-' }}</strong>
                                </p>
                            </div>
                        </div>

                        <div class="text-right">
                            <span class="text-xs text-slate-500">Total Nilai Penawaran:</span>
                            <div class="text-xl sm:text-2xl font-black text-emerald-700">
                                {{ formatCurrency(portalData.existing_quotation.total_amount) }}
                            </div>
                        </div>
                    </div>

                    <!-- Items Submitted Table -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                                <tr>
                                    <th class="py-3 px-4 w-12 text-center">No</th>
                                    <th class="py-3 px-4">Deskripsi Barang</th>
                                    <th class="py-3 px-4 text-right">Kuantitas Ditawarkan</th>
                                    <th class="py-3 px-4 text-right">Harga Satuan (Rp)</th>
                                    <th class="py-3 px-4 text-right">Subtotal (Rp)</th>
                                    <th class="py-3 px-4 text-center">Lead Time</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="(it, idx) in portalData.existing_quotation.items" :key="idx" class="hover:bg-slate-50/50">
                                    <td class="py-3 px-4 text-center text-slate-400 font-mono">{{ idx + 1 }}</td>
                                    <td class="py-3 px-4 font-bold text-slate-900">
                                        {{ it.item_description }}
                                        <span v-if="it.brand" class="block text-[11px] font-normal text-slate-500">Merk: {{ it.brand }}</span>
                                    </td>
                                    <td class="py-3 px-4 text-right font-medium text-slate-800">{{ it.offered_quantity }}</td>
                                    <td class="py-3 px-4 text-right font-mono text-slate-800">{{ formatCurrency(it.unit_price) }}</td>
                                    <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">{{ formatCurrency(it.subtotal) }}</td>
                                    <td class="py-3 px-4 text-center text-slate-600">{{ it.lead_time_days ? it.lead_time_days + ' hari' : '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                        <div>
                            Waktu Pengiriman: <strong>{{ formatDate(portalData.existing_quotation.submitted_at) }}</strong>
                        </div>
                        <a 
                            v-if="portalData.existing_quotation.file_url" 
                            :href="portalData.existing_quotation.file_url" 
                            target="_blank"
                            class="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700"
                        >
                            <FileText class="w-4 h-4" />
                            <span>Unduh Lampiran Berkas Penawaran</span>
                            <ExternalLink class="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>

                <!-- 3. STATE B: DECLINED NOTICE -->
                <div 
                    v-else-if="portalData.portal.quote_status === 'declined'"
                    class="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3 shadow-xs"
                >
                    <div class="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                        <XCircle class="w-6 h-6" />
                    </div>
                    <h3 class="text-base font-bold text-slate-900">Partisipasi Tender Telah Ditolak</h3>
                    <p class="text-xs text-slate-500 max-w-md mx-auto">
                        Anda telah mengonfirmasi untuk tidak berpartisipasi dalam tender ini. Terima kasih atas konfirmasi cepat Anda.
                    </p>
                </div>

                <!-- 4. STATE C: EXPIRED NOTICE -->
                <div 
                    v-else-if="portalData.portal.is_expired"
                    class="bg-white rounded-2xl border border-amber-200 p-8 text-center space-y-3 shadow-xs"
                >
                    <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                        <Clock class="w-6 h-6" />
                    </div>
                    <h3 class="text-base font-bold text-slate-900">Batas Waktu Pengiriman Telah Berakhir</h3>
                    <p class="text-xs text-slate-500 max-w-md mx-auto">
                        Masa penerimaan surat penawaran harga untuk tender ini telah ditutup pada {{ formatDate(portalData.rfq.deadline_date) }}.
                    </p>
                </div>

                <!-- 5. STATE D: ACTIVE SUBMISSION FORM (Simplified UX & Progressive Disclosure) -->
                <form v-else @submit.prevent="handleSubmit" class="space-y-6">

                    <!-- Panduan Cepat Ramah Rekanan -->
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
                        <div class="w-9 h-9 rounded-xl bg-[#014BAA] text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Sparkles class="w-4 h-4" />
                        </div>
                        <div class="space-y-1 text-xs">
                            <h4 class="font-bold text-slate-900 text-sm">
                                Panduan Pengisian Penawaran (3 Langkah Sederhana)
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-slate-600">
                                <div class="flex items-center gap-1.5 font-medium">
                                    <span class="w-4 h-4 rounded-full bg-blue-100 text-[#014BAA] text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                                    <span>Isi <strong>Harga Satuan</strong> & <strong>Waktu Kirim</strong></span>
                                </div>
                                <div class="flex items-center gap-1.5 font-medium">
                                    <span class="w-4 h-4 rounded-full bg-blue-100 text-[#014BAA] text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                                    <span>Isi <strong>Nomor Surat Penawaran</strong> Anda</span>
                                </div>
                                <div class="flex items-center gap-1.5 font-medium">
                                    <span class="w-4 h-4 rounded-full bg-blue-100 text-[#014BAA] text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                                    <span>Periksa Total & Klik <strong>Kirim Penawaran</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 1: Rincian Barang yang Ditenderkan & Input Harga Satuan -->
                    <div class="bg-white rounded-2xl border border-[#E5EAF1] shadow-xs overflow-hidden">
                        <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="w-6 h-6 rounded-lg bg-[#EAF2FF] text-[#014BAA] font-bold text-xs flex items-center justify-center">1</span>
                                    <h3 class="text-base font-bold text-slate-900">
                                        Daftar Kebutuhan Barang & Rincian Harga
                                    </h3>
                                </div>
                                <p class="text-xs text-slate-500 mt-0.5">
                                    Masukkan harga penawaran satuan terbaik Anda (sebelum PPN) dan estimasi waktu pengiriman barang.
                                </p>
                            </div>
                            <span class="text-xs font-semibold text-[#014BAA] bg-[#EAF2FF] px-3 py-1 rounded-lg border border-blue-200/80 self-start sm:self-auto">
                                {{ quoteForm.items.length }} Item Ditenderkan
                            </span>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-xs text-left">
                                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th class="py-3.5 px-4 w-12 text-center">No</th>
                                        <th class="py-3.5 px-4 min-w-[240px]">Deskripsi Barang & Kebutuhan</th>
                                        <th class="py-3.5 px-4 w-28 text-center">Target Qty</th>
                                        <th class="py-3.5 px-4 w-44">
                                            Merk / Tipe
                                            <span class="block text-[10px] font-normal text-slate-400">Opsional</span>
                                        </th>
                                        <th class="py-3.5 px-4 w-36">Qty Ditawarkan</th>
                                        <th class="py-3.5 px-4 w-52">
                                            Harga Satuan (Rp) *
                                            <span class="block text-[10px] font-normal text-slate-400">Sebelum PPN</span>
                                        </th>
                                        <th class="py-3.5 px-4 w-32">
                                            Waktu Kirim *
                                            <span class="block text-[10px] font-normal text-slate-400">Hari kerja</span>
                                        </th>
                                        <th class="py-3.5 px-4 w-44 text-right">Subtotal Baris</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    <tr v-for="(it, idx) in quoteForm.items" :key="it.rfq_item_id" class="hover:bg-slate-50/50 transition-colors">
                                        <td class="py-4 px-4 text-center font-mono text-slate-400 font-medium">
                                            {{ idx + 1 }}
                                        </td>
                                        <td class="py-4 px-4 space-y-1">
                                            <div class="font-bold text-slate-900 text-sm">
                                                {{ it.item_name }}
                                            </div>
                                            <div v-if="it.item_specifications" class="text-[11px] text-slate-500 leading-snug">
                                                {{ it.item_specifications }}
                                            </div>
                                        </td>
                                        <td class="py-4 px-4 text-center">
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-slate-700 bg-slate-100">
                                                {{ it.target_quantity }} {{ it.unit_name }}
                                            </span>
                                        </td>
                                        <td class="py-4 px-4">
                                            <input 
                                                v-model="it.brand"
                                                type="text" 
                                                placeholder="Contoh: Lokal / Sandvik"
                                                class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-[#014BAA] focus:ring-1 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
                                            />
                                        </td>
                                        <td class="py-4 px-4">
                                            <div class="flex items-center gap-1.5">
                                                <input 
                                                    v-model.number="it.offered_quantity"
                                                    type="number" 
                                                    min="0.0001" 
                                                    step="any"
                                                    class="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 text-center font-medium focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                />
                                                <span class="text-[11px] text-slate-500 font-medium">{{ it.unit_name }}</span>
                                            </div>
                                        </td>
                                        <td class="py-4 px-4">
                                            <div class="relative">
                                                <span class="absolute left-3 top-2 text-[11px] font-bold text-slate-400">Rp</span>
                                                <input 
                                                    v-model.number="it.unit_price"
                                                    type="number" 
                                                    min="0"
                                                    placeholder="0"
                                                    class="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                />
                                            </div>
                                        </td>
                                        <td class="py-4 px-4">
                                            <div class="flex items-center gap-1.5">
                                                <input 
                                                    v-model.number="it.lead_time_days"
                                                    type="number" 
                                                    min="0"
                                                    class="w-16 px-2.5 py-1.5 rounded-lg border border-slate-200 text-center font-medium focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                />
                                                <span class="text-[11px] text-slate-500">hari</span>
                                            </div>
                                        </td>
                                        <td class="py-4 px-4 text-right font-mono font-bold text-[#014BAA] text-sm">
                                            {{ formatCurrency((Number(it.offered_quantity) || 0) * (Number(it.unit_price) || 0)) }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Section 2 & 3 + Sidebar Grand Total -->
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        <!-- Left 8 Kolom: Dokumen Penawaran & Opsi Komersial Lanjutan -->
                        <div class="lg:col-span-8 space-y-6">
                            
                            <!-- Bagian 2: Informasi Surat & Dokumen Penawaran Resmi -->
                            <div class="bg-white rounded-2xl border border-[#E5EAF1] p-5 sm:p-6 shadow-xs space-y-5">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="w-6 h-6 rounded-lg bg-[#EAF2FF] text-[#014BAA] font-bold text-xs flex items-center justify-center">2</span>
                                        <h4 class="text-sm sm:text-base font-bold text-slate-900">
                                            Dokumen & Surat Penawaran Resmi
                                        </h4>
                                    </div>
                                    <p class="text-xs text-slate-500 mt-0.5">
                                        Informasi nomor referensi penawaran harga dari perusahaan rekanan Anda.
                                    </p>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                                    <div class="space-y-1.5">
                                        <label class="block font-semibold text-slate-800">
                                            Nomor Surat Penawaran Resmi Rekanan *
                                        </label>
                                        <input 
                                            v-model="quoteForm.vendor_quotation_reference"
                                            type="text" 
                                            placeholder="Contoh: QUO/BM/2026/X/089"
                                            required
                                            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-medium text-xs sm:text-sm transition-all"
                                        />
                                        <p class="text-[11px] text-slate-400">
                                            Nomor surat resmi yang diterbitkan oleh bagian penjualan perusahaan Anda.
                                        </p>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="block font-semibold text-slate-800">
                                            Tanggal Surat Penawaran *
                                        </label>
                                        <input 
                                            v-model="quoteForm.quotation_date"
                                            type="date" 
                                            required
                                            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-medium text-xs sm:text-sm transition-all"
                                        />
                                        <p class="text-[11px] text-slate-400">
                                            Tanggal penawaran harga ini diterbitkan.
                                        </p>
                                    </div>
                                </div>

                                <!-- Upload Lampiran PDF -->
                                <div class="pt-2 border-t border-slate-100 space-y-2">
                                    <div class="flex items-center justify-between">
                                        <label class="block text-xs font-semibold text-slate-800">
                                            Unggah Berkas Surat Penawaran Resmi (PDF / Scan)
                                        </label>
                                        <span class="text-[11px] font-medium text-slate-400">Disarankan</span>
                                    </div>

                                    <div 
                                        v-if="!selectedFile"
                                        @click="fileInputRef?.click()"
                                        class="border-2 border-dashed border-slate-200 hover:border-[#014BAA] rounded-2xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 group"
                                    >
                                        <input 
                                            ref="fileInputRef"
                                            type="file" 
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            @change="handleFileChange"
                                            class="hidden"
                                        />
                                        <UploadCloud class="w-7 h-7 text-[#014BAA] mx-auto mb-1.5 transition-transform group-hover:scale-110" />
                                        <div class="text-xs font-bold text-slate-800">
                                            Klik untuk memilih berkas surat penawaran Anda
                                        </div>
                                        <div class="text-[11px] text-slate-400 mt-0.5">
                                            Format PDF, JPG, atau PNG (Maksimal 10MB)
                                        </div>
                                    </div>

                                    <div 
                                        v-else 
                                        class="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <div class="flex items-center gap-3 overflow-hidden">
                                            <FileText class="w-5 h-5 text-[#014BAA] shrink-0" />
                                            <div class="overflow-hidden">
                                                <div class="font-bold text-slate-900 truncate">
                                                    {{ selectedFile.name }}
                                                </div>
                                                <div class="text-[11px] text-slate-500">
                                                    {{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB • Terpilih
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            @click="removeFile"
                                            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                            title="Hapus berkas"
                                        >
                                            <Trash2 class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Bagian 3: Syarat Komersial & Ketentuan Pengiriman (Langsung Terlihat Tanpa Buka-Tutup) -->
                            <div class="bg-white rounded-2xl border border-[#E5EAF1] p-5 sm:p-6 shadow-xs space-y-5">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="w-6 h-6 rounded-lg bg-[#EAF2FF] text-[#014BAA] font-bold text-xs flex items-center justify-center">3</span>
                                        <h4 class="text-sm sm:text-base font-bold text-slate-900">
                                            Syarat Komersial & Ketentuan Pengiriman
                                        </h4>
                                    </div>
                                    <p class="text-xs text-slate-500 mt-0.5">
                                        Termin pembayaran, tarif PPN, ongkos kirim, masa berlaku harga, dan catatan penawaran.
                                    </p>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                                    <div class="space-y-1.5">
                                        <label class="block font-semibold text-slate-800">
                                            Masa Berlaku Penawaran Hingga
                                        </label>
                                        <input 
                                            v-model="quoteForm.valid_until"
                                            type="date" 
                                            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-medium bg-white transition-all text-xs sm:text-sm"
                                        />
                                        <p class="text-[11px] text-slate-400">Batas akhir harga ini dijamin berlaku.</p>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="block font-semibold text-slate-800">
                                            Syarat Pembayaran (Terms of Payment)
                                        </label>
                                        <input 
                                            v-model="quoteForm.payment_terms"
                                            type="text" 
                                            placeholder="Contoh: Tempo 60 Hari / COD"
                                            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-medium bg-white transition-all text-xs sm:text-sm"
                                        />
                                        <p class="text-[11px] text-slate-400">Permintaan pembeli: {{ portalData.rfq.payment_terms_requested || 'Sesuai Standar' }}</p>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="block font-semibold text-slate-800">
                                            Pajak Pertambahan Nilai (PPN)
                                        </label>
                                        <select 
                                            v-model.number="quoteForm.tax_rate"
                                            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-medium bg-white transition-all cursor-pointer text-xs sm:text-sm"
                                        >
                                            <option :value="11">PPN 11% (Standar Nasional)</option>
                                            <option :value="12">PPN 12%</option>
                                            <option :value="0">Tanpa PPN (Bebas Pajak / 0%)</option>
                                        </select>
                                        <p class="text-[11px] text-slate-400">PPN otomatis dihitung pada ringkasan biaya penawaran.</p>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="block font-semibold text-slate-800">
                                            Ongkos Kirim Tambahan (Rp)
                                        </label>
                                        <div class="relative">
                                            <span class="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                                            <input 
                                                v-model.number="quoteForm.shipping_cost"
                                                type="number" 
                                                min="0" 
                                                placeholder="0"
                                                class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none font-mono font-medium bg-white transition-all text-xs sm:text-sm"
                                            />
                                        </div>
                                        <p class="text-[11px] text-slate-400">Kosongkan (0) jika harga barang sudah termasuk ongkir (Franco Pabrik).</p>
                                    </div>

                                    <div class="sm:col-span-2 space-y-1.5">
                                        <label class="block font-semibold text-slate-800">
                                            Catatan Tambahan untuk Tim Pembeli
                                        </label>
                                        <textarea 
                                            v-model="quoteForm.notes"
                                            rows="3"
                                            placeholder="Catatan mengenai spesifikasi alternatif, ketersediaan stok, garansi, atau instruksi pengiriman khusus..."
                                            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#014BAA] focus:ring-2 focus:ring-blue-100 outline-none text-xs sm:text-sm bg-white transition-all"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right 4 Kolom: Sticky Grand Total & Action Buttons -->
                        <div class="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
                            <div class="bg-white rounded-2xl border border-[#E5EAF1] p-5 sm:p-6 shadow-xs space-y-4">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600">
                                        Ringkasan Biaya Penawaran
                                    </h4>
                                    <span class="text-[11px] font-semibold text-[#014BAA] bg-[#EAF2FF] px-2 py-0.5 rounded-md">
                                        Otomatis
                                    </span>
                                </div>

                                <div class="space-y-3 text-xs">
                                    <div class="flex items-center justify-between text-slate-600">
                                        <span>Subtotal Barang:</span>
                                        <span class="font-mono font-semibold text-slate-900">
                                            {{ formatCurrency(subtotalAmount) }}
                                        </span>
                                    </div>

                                    <div class="flex items-center justify-between text-slate-600">
                                        <span class="flex items-center gap-1">
                                            <span>PPN ({{ quoteForm.tax_rate }}%):</span>
                                        </span>
                                        <span class="font-mono font-semibold text-slate-900">
                                            {{ formatCurrency(taxAmount) }}
                                        </span>
                                    </div>

                                    <div class="flex items-center justify-between text-slate-600">
                                        <span>Ongkos Kirim:</span>
                                        <span class="font-mono font-semibold" :class="shippingAmount > 0 ? 'text-slate-900' : 'text-emerald-700'">
                                            {{ shippingAmount > 0 ? formatCurrency(shippingAmount) : 'Rp 0 (Franco)' }}
                                        </span>
                                    </div>

                                    <div class="pt-3 border-t border-slate-200 flex items-center justify-between">
                                        <div>
                                            <span class="text-xs font-bold text-slate-900 block">Total Penawaran:</span>
                                            <span class="text-[10px] text-slate-400">Termasuk PPN & Biaya</span>
                                        </div>
                                        <span class="text-xl font-black text-[#014BAA] font-mono">
                                            {{ formatCurrency(grandTotalAmount) }}
                                        </span>
                                    </div>
                                </div>

                                <div class="pt-3 space-y-2.5">
                                    <button 
                                        type="submit"
                                        :disabled="isSubmitting"
                                        class="w-full py-3.5 px-4 rounded-xl bg-[#014BAA] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow cursor-pointer transition-all"
                                    >
                                        <Send class="w-4 h-4" />
                                        <span>{{ isSubmitting ? 'Mengirim Penawaran...' : 'Kirim Surat Penawaran' }}</span>
                                    </button>

                                    <button 
                                        type="button"
                                        @click="handleDecline"
                                        :disabled="isSubmitting"
                                        class="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                    >
                                        <X class="w-4 h-4 text-slate-400" />
                                        <span>Tolak Partisipasi Tender</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Security / SLA Note -->
                            <div class="p-4 rounded-xl bg-slate-100/70 border border-slate-200/70 text-[11px] text-slate-500 space-y-1.5">
                                <div class="flex items-center gap-1.5 font-semibold text-slate-700">
                                    <ShieldCheck class="w-3.5 h-3.5 text-[#014BAA]" />
                                    <span>Pemberitahuan Kerahasiaan</span>
                                </div>
                                <p class="leading-relaxed">
                                    Data harga yang Anda berikan dienkripsi dan hanya dapat dievaluasi oleh tim pengadaan PT Padma Soode Indonesia setelah batas waktu tender berakhir.
                                </p>
                            </div>
                        </div>

                    </div>
                </form>

            </template>
            </div>
        </main>

        <!-- 3. Footer Resmi ERP Sistem (Konsisten dengan Seluruh Modul ERP) -->
        <AppFooter />
    </div>
</template>
