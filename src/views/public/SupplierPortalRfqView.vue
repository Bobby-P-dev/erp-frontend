<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { formatDate } from '@/composables/useFormatter.js'
import { useSupplierPortalRfqForm } from '@/composables/purchasing/useSupplierPortalRfqForm.js'

import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import SupplierRfqHeaderBanner from '@/components/purchasing/rfq/portal/SupplierRfqHeaderBanner.vue'
import SupplierRfqSubmittedReceipt from '@/components/purchasing/rfq/portal/SupplierRfqSubmittedReceipt.vue'
import SupplierRfqItemsTable from '@/components/purchasing/rfq/portal/SupplierRfqItemsTable.vue'
import SupplierRfqCommercialForm from '@/components/purchasing/rfq/portal/SupplierRfqCommercialForm.vue'
import SupplierRfqCostSidebar from '@/components/purchasing/rfq/portal/SupplierRfqCostSidebar.vue'

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu'

import {
    FileText,
    Clock,
    AlertCircle,
    XCircle,
    ShieldCheck,
    Lock,
    ChevronDown,
    LayoutDashboard,
    Bell,
    Sun,
    LogOut,
    ArrowLeft,
    ReceiptText
} from '@lucide/vue'

const {
    router,
    isSupplierLoggedIn,
    authUser,
    authSupplier,
    supplierInitials,
    isLoading,
    isSubmitting,
    errorMessage,
    portalData,
    quoteForm,
    selectedFile,
    subtotalAmount,
    taxAmount,
    shippingAmount,
    grandTotalAmount,
    deadlineInfo,
    canRespond,
    handleLogout,
    loadPortalData,
    handleFileSelect,
    removeFile,
    handleSubmit,
    handleDecline,
} = useSupplierPortalRfqForm()

onMounted(() => {
    loadPortalData()
})
</script>

<template>
    <div class="min-h-screen flex flex-col bg-[#F7F9FC] font-sans antialiased text-slate-800 selection:bg-blue-100 selection:text-blue-900">
        <!-- 1. Corporate Brand Header -->
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

            <template #right>
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

        <!-- 2. Main Canvas -->
        <main class="flex-1 flex flex-col w-full">
            <div class="w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-8 flex-1 space-y-6">

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
                    <SupplierRfqHeaderBanner
                        :portal-data="portalData"
                        :deadline-info="deadlineInfo"
                    />

                    <!-- STATE A: ALREADY SUBMITTED -->
                    <SupplierRfqSubmittedReceipt
                        v-if="portalData.portal.quote_status === 'received' && portalData.existing_quotation && !portalData.portal.can_revise"
                        :existing-quotation="portalData.existing_quotation"
                    />

                    <!-- STATE B: DECLINED NOTICE -->
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

                    <!-- STATE C: EXPIRED NOTICE -->
                    <div 
                        v-else-if="!canRespond"
                        class="bg-white rounded-2xl border border-amber-200 p-8 text-center space-y-3 shadow-xs"
                    >
                        <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                            <Clock class="w-6 h-6" />
                        </div>
                        <h3 class="text-base font-bold text-slate-900">Respons Tender Belum Tersedia</h3>
                        <p class="text-xs text-slate-500 max-w-md mx-auto">
                            {{ deadlineInfo.reason || 'Tender tidak menerima respons baru.' }} Batas respons: {{ formatDate(portalData.rfq.deadline_date) }} (akhir hari WIB). Status diperbarui otomatis setiap menit.
                        </p>
                    </div>

                    <!-- STATE D: ACTIVE SUBMISSION FORM -->
                    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
                        <div v-if="portalData.portal.can_revise" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm space-y-3">
                            <h3 class="font-bold">Revisi Penawaran Versi {{ portalData.existing_quotation.review_version }}</h3>
                            <p class="whitespace-pre-wrap">{{ portalData.existing_quotation.supplier_message }}</p>
                            <label class="block">Alasan perubahan
                                <textarea v-model="quoteForm.revision_reason" required maxlength="2000" :disabled="isSubmitting" class="block w-full border rounded p-2 mt-1" />
                            </label>
                            <p class="text-xs">Versi sebelumnya tetap disimpan. Penawaran baru akan diperiksa kembali oleh buyer.</p>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-2 text-xs">
                            <h4 class="font-bold text-slate-900 text-sm">
                                Panduan Pengisian Penawaran (3 Langkah Sederhana)
                            </h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-slate-700">
                                <div class="flex items-center gap-2 font-medium">
                                    <span class="w-5 h-5 rounded bg-slate-200 text-slate-900 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                                    <span>Isi <strong>Harga Satuan</strong> & <strong>Waktu Kirim</strong></span>
                                </div>
                                <div class="flex items-center gap-2 font-medium">
                                    <span class="w-5 h-5 rounded bg-slate-200 text-slate-900 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                                    <span>Isi <strong>Nomor Surat Penawaran</strong> Anda</span>
                                </div>
                                <div class="flex items-center gap-2 font-medium">
                                    <span class="w-5 h-5 rounded bg-slate-200 text-slate-900 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                                    <span>Periksa Total & Klik <strong>Kirim Surat Penawaran</strong></span>
                                </div>
                            </div>
                        </div>

                        <SupplierRfqItemsTable :items="quoteForm.items" />

                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            <div class="lg:col-span-8">
                                <SupplierRfqCommercialForm
                                    :quote-form="quoteForm"
                                    :selected-file="selectedFile"
                                    :requested-payment-terms="portalData.rfq.payment_terms_requested"
                                    @file-select="handleFileSelect"
                                    @remove-file="removeFile"
                                />
                            </div>

                            <div class="lg:col-span-4">
                                <SupplierRfqCostSidebar
                                    :quote-form="quoteForm"
                                    :subtotal-amount="subtotalAmount"
                                    :tax-amount="taxAmount"
                                    :shipping-amount="shippingAmount"
                                    :grand-total-amount="grandTotalAmount"
                                    :is-submitting="isSubmitting"
                                    @decline="handleDecline"
                                />
                            </div>
                        </div>
                    </form>
                </template>
            </div>
        </main>

        <!-- 3. Footer Resmi ERP Sistem -->
        <AppFooter />
    </div>
</template>
