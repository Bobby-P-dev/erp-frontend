<template>
    <div class="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between antialiased font-sans">
        <!-- Minimalist Brand Header -->
        <header class="w-full bg-white border-b border-slate-200/90 py-3.5 px-4 sticky top-0 z-20 shadow-xs">
            <div class="max-w-xl mx-auto flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                        <ShieldCheck class="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 class="text-xs font-bold uppercase tracking-wider text-slate-900 leading-tight">
                            {{ documentData.companyName || 'PADMA SOODE INDONESIA' }}
                        </h1>
                        <p class="text-[10px] text-slate-500 font-medium">
                            Portal Verifikasi Tanda Tangan Elektronik
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600">
                    <Lock class="w-3 h-3 text-slate-500" />
                    <span>Resmi ERP</span>
                </div>
            </div>
        </header>

        <!-- Main Content Canvas -->
        <main class="w-full flex-1 max-w-xl mx-auto px-4 py-6 sm:py-8 flex flex-col justify-center">
            
            <!-- 1. LOADING STATE -->
            <div 
                v-if="isLoading" 
                class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center space-y-5"
                data-testid="loading-state"
            >
                <div class="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div class="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                    <div class="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                    <ShieldCheck class="w-7 h-7 text-blue-600 absolute" />
                </div>
                
                <div class="space-y-1.5">
                    <h2 class="text-base font-bold text-slate-900">
                        Memverifikasi Keabsahan Dokumen
                    </h2>
                    <p class="text-xs text-slate-500 max-w-xs mx-auto">
                        Memvalidasi token kriptografis dan mencocokkan integritas data tanda tangan elektronik...
                    </p>
                </div>

                <!-- Skeleton preview placeholder -->
                <div class="pt-4 space-y-3">
                    <div class="h-4 bg-slate-100 rounded-md animate-pulse w-3/4 mx-auto"></div>
                    <div class="h-10 bg-slate-100 rounded-lg animate-pulse w-full"></div>
                    <div class="h-20 bg-slate-100 rounded-lg animate-pulse w-full"></div>
                </div>
            </div>

            <!-- 2. VALID STATE (is_valid === true) -->
            <div 
                v-else-if="isValid" 
                class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0"
                data-testid="valid-state"
            >
                <!-- Official Verification Banner -->
                <div class="bg-gradient-to-b from-emerald-500 to-emerald-600 text-white p-6 sm:p-7 text-center relative">
                    <div class="w-16 h-16 mx-auto rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center mb-3 shadow-inner">
                        <CheckCircle2 class="w-9 h-9 text-white" />
                    </div>
                    <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/25 text-[11px] font-semibold tracking-wide uppercase mb-1">
                        <ShieldCheck class="w-3.5 h-3.5" />
                        <span>Sertifikasi Terverifikasi</span>
                    </div>
                    <h2 class="text-xl sm:text-2xl font-black tracking-tight">
                        Dokumen Sah & Terverifikasi
                    </h2>
                    <p class="text-xs text-emerald-100 mt-1 max-w-sm mx-auto font-medium">
                        Tanda tangan elektronik ini terdaftar resmi dan integritas dokumen terbukti otentik tanpa modifikasi.
                    </p>
                </div>

                <div class="p-5 sm:p-6 space-y-5">
                    <!-- Document Details Section -->
                    <div class="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3">
                        <div class="flex items-center justify-between pb-2.5 border-b border-slate-200">
                            <div class="flex items-center gap-2">
                                <FileText class="w-4 h-4 text-blue-600" />
                                <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Detail Dokumen</span>
                            </div>
                            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                {{ documentData.type }}
                            </span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <span class="text-slate-500 text-[11px] block">Nomor Dokumen</span>
                                <span class="font-bold text-slate-900 tracking-wide font-mono text-sm select-all">
                                    {{ documentData.number }}
                                </span>
                            </div>

                            <div>
                                <span class="text-slate-500 text-[11px] block">Tanggal Pengajuan</span>
                                <span class="font-semibold text-slate-800">
                                    {{ formatDate(documentData.date) }}
                                </span>
                            </div>

                            <div v-if="documentData.totalAmount !== null" class="sm:col-span-2 pt-1 border-t border-slate-200/80 flex items-center justify-between">
                                <span class="text-slate-500 text-[11px]">Total Estimasi Nilai</span>
                                <span class="text-base font-black text-emerald-700">
                                    {{ formatCurrency(documentData.totalAmount) }}
                                </span>
                            </div>

                            <div v-if="documentData.purpose" class="sm:col-span-2 pt-1 border-t border-slate-200/80">
                                <span class="text-slate-500 text-[11px] block">Keperluan / Keterangan</span>
                                <span class="text-xs text-slate-700 italic">
                                    "{{ documentData.purpose }}"
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Signer Details Section -->
                    <div class="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-xs">
                        <div class="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                            <UserCheck class="w-4 h-4 text-emerald-600" />
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Penandatangan Dokumen</span>
                        </div>

                        <div class="space-y-2.5 text-xs">
                            <div class="flex items-start justify-between gap-2">
                                <div>
                                    <h3 class="text-sm font-bold text-slate-900">
                                        {{ signerData.name }}
                                    </h3>
                                    <p class="text-slate-500 font-medium text-[11px]">
                                        {{ signerData.position }}
                                    </p>
                                </div>
                                <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    <CheckCircle2 class="w-3 h-3 text-emerald-600" />
                                    <span>APPROVED</span>
                                </span>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                                <div class="flex items-center gap-1.5 text-slate-600">
                                    <Clock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Waktu TTD: <strong class="text-slate-800 font-semibold">{{ formatDateTime(signerData.signedAt) }} WIB</strong></span>
                                </div>

                                <div v-if="signerData.ipAddress" class="flex items-center gap-1.5 text-slate-600">
                                    <Network class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Alamat IP: <code class="font-mono text-slate-800 bg-slate-100 px-1 rounded">{{ signerData.ipAddress }}</code></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Digital Fingerprint / Cryptographic Hash Box -->
                    <div class="rounded-xl bg-slate-900 text-slate-100 p-4 space-y-2.5 border border-slate-800">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <Fingerprint class="w-4 h-4 text-blue-400" />
                                <span class="text-xs font-bold tracking-wide uppercase text-slate-300">Digital Fingerprint</span>
                            </div>
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/80 font-bold">
                                {{ securityData.algorithm }}
                            </span>
                        </div>

                        <div class="space-y-1">
                            <div class="bg-slate-950/90 rounded-md p-2.5 border border-slate-800/80 text-[11px] font-mono break-all text-slate-300 leading-relaxed select-all">
                                {{ securityData.hash }}
                            </div>
                            <div class="flex items-center justify-between pt-1">
                                <span v-if="securityData.shortHash" class="text-[10px] text-slate-400 font-mono">
                                    Short Hash: <strong class="text-blue-300">{{ securityData.shortHash }}</strong>
                                </span>
                                <button
                                    type="button"
                                    @click="copyHash"
                                    class="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer ml-auto"
                                >
                                    <component :is="isCopied ? Check : Copy" class="w-3.5 h-3.5" />
                                    <span>{{ isCopied ? 'Tersalin!' : 'Salin Hash' }}</span>
                                </button>
                            </div>
                        </div>

                        <p class="text-[10px] text-slate-400 leading-normal pt-1 border-t border-slate-800">
                            Integritas dokumen dijaga melalui algoritma kriptografis <strong>HMAC-SHA256</strong>. Perubahan 1 karakter pada dokumen akan menggugurkan hash ini.
                        </p>
                    </div>
                </div>
            </div>

            <!-- 3. TAMPERED / INVALID STATE (is_valid === false) -->
            <div 
                v-else-if="isTampered" 
                class="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden"
                data-testid="tampered-state"
            >
                <div class="bg-gradient-to-b from-rose-500 to-rose-600 text-white p-6 sm:p-7 text-center">
                    <div class="w-16 h-16 mx-auto rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center mb-3 shadow-inner">
                        <ShieldAlert class="w-9 h-9 text-white" />
                    </div>
                    <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/25 text-[11px] font-semibold tracking-wide uppercase mb-1">
                        <AlertTriangle class="w-3.5 h-3.5" />
                        <span>Peringatan Keamanan</span>
                    </div>
                    <h2 class="text-xl sm:text-2xl font-black tracking-tight">
                        Integritas Data Tidak Valid!
                    </h2>
                    <p class="text-xs text-rose-100 mt-1 max-w-sm mx-auto font-medium">
                        Data dokumen telah mengalami modifikasi atau perubahan sejak proses penandatanganan elektronik berlangsung.
                    </p>
                </div>

                <div class="p-6 space-y-4">
                    <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                        <div class="font-bold flex items-center gap-2 text-rose-950">
                            <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Tanda Tangan Dibatalkan Secara Kriptografis</span>
                        </div>
                        <p class="leading-relaxed text-rose-800">
                            Sistem keamanan ERP mendeteksi ketidaksesuaian antara nilai hash saat ini dengan tanda tangan digital tersimpan. Dokumen ini <strong>TIDAK DAPAT DIANGGAP SAH</strong> untuk keperluan audit, pencairan keuangan, atau serah terima barang.
                        </p>
                    </div>

                    <div v-if="documentData.number !== '-'" class="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                        <span class="text-slate-500 text-[11px] block">Nomor Dokumen Terkait:</span>
                        <span class="font-bold font-mono text-slate-800">{{ documentData.number }}</span>
                    </div>
                </div>
            </div>

            <!-- 4. NOT FOUND STATE (404 / Token Tidak Terdaftar) -->
            <div 
                v-else 
                class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center space-y-5"
                data-testid="not-found-state"
            >
                <div class="w-16 h-16 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <FileX class="w-8 h-8" />
                </div>

                <div class="space-y-2">
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 uppercase">
                        Token Tidak Valid / 404
                    </span>
                    <h2 class="text-lg sm:text-xl font-bold text-slate-900">
                        Tanda Tangan Digital Tidak Ditemukan
                    </h2>
                    <p class="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Token verifikasi tanda tangan digital tidak terdaftar di sistem ERP Padma Soode Indonesia atau URL yang Anda pindai tidak lengkap.
                    </p>
                </div>

                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 break-all select-all">
                    Token: {{ currentToken || '-' }}
                </div>

                <div class="pt-2">
                    <button
                        type="button"
                        @click="fetchVerification"
                        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                        <RotateCw class="w-3.5 h-3.5" />
                        <span>Coba Verifikasi Lagi</span>
                    </button>
                </div>
            </div>

            <!-- Bottom Action & Info -->
            <div class="mt-6 text-center space-y-3">
                <div class="flex items-center justify-center gap-4 text-xs font-medium text-slate-500">
                    <button 
                        v-if="!isLoading" 
                        type="button" 
                        @click="fetchVerification" 
                        class="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                        <RotateCw class="w-3.5 h-3.5" />
                        <span>Segarkan Data</span>
                    </button>
                    <span>•</span>
                    <a 
                        href="/login" 
                        class="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                    >
                        <ExternalLink class="w-3.5 h-3.5" />
                        <span>Masuk ke Portal ERP</span>
                    </a>
                </div>
            </div>
        </main>

        <!-- Minimalist Official Footer -->
        <footer class="w-full border-t border-slate-200/80 bg-white py-4 px-4 text-center">
            <p class="text-[11px] text-slate-500 font-medium">
                © {{ new Date().getFullYear() }} PT PADMA SOODE INDONESIA • Security & Cryptographic Document Verification
            </p>
        </footer>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { 
    ShieldCheck, 
    ShieldAlert, 
    CheckCircle2, 
    AlertTriangle, 
    AlertCircle, 
    FileText, 
    FileX, 
    UserCheck, 
    Clock, 
    Network, 
    Fingerprint, 
    Copy, 
    Check, 
    RotateCw, 
    Lock, 
    ExternalLink 
} from '@lucide/vue'
import { getPublicVerification } from '../../services/verificationServices.js'
import { formatDate, formatDateTime, formatCurrency } from '../../composables/useFormatter.js'

const route = useRoute()
const currentToken = computed(() => route.params.token || '')

const isLoading = ref(true)
const verificationData = ref(null)
const errorState = ref(null)
const isCopied = ref(false)

// Computed validity states
const isValid = computed(() => {
    if (!verificationData.value) return false
    return verificationData.value.is_valid === true
})

const isTampered = computed(() => {
    if (!verificationData.value) return false
    return verificationData.value.is_valid === false
})

// Defensive extractors for Document Data
const documentData = computed(() => {
    const raw = verificationData.value || {}
    const doc = raw.document || raw.pr || raw.purchase_requisition || {}
    return {
        number: doc.number || doc.document_number || doc.doc_number || doc.pr_number || raw.document_number || raw.doc_number || '-',
        type: doc.type || doc.document_type || raw.document_type || 'Purchase Requisition',
        date: doc.date || doc.document_date || doc.request_date || raw.document_date || raw.created_at || null,
        totalAmount: doc.total_amount ?? doc.amount ?? doc.total ?? raw.total_amount ?? raw.amount ?? null,
        purpose: doc.purpose || doc.description || raw.purpose || null,
        companyName: doc.company_name || raw.company_name || 'PADMA SOODE INDONESIA',
    }
})

// Defensive extractors for Signer Data
const signerData = computed(() => {
    const raw = verificationData.value || {}
    const s = raw.signer || raw.approver || raw.user || {}
    return {
        name: s.name || raw.signer_name || raw.approver_name || 'Pejabat Berwenang',
        position: s.position || s.role || raw.signer_position || raw.position || 'Peninjau Dokumen',
        signedAt: s.signed_at || s.acted_at || raw.signed_at || raw.acted_at || null,
        ipAddress: s.ip_address || s.ip || raw.ip_address || null,
    }
})

// Defensive extractors for Cryptographic Security Data
const securityData = computed(() => {
    const raw = verificationData.value || {}
    const sec = raw.security || {}
    const fullHash = sec.hash || raw.hash || raw.signature_hash || currentToken.value
    return {
        algorithm: sec.algorithm || raw.algorithm || 'HMAC-SHA256',
        hash: fullHash,
        shortHash: sec.short_hash || raw.short_hash || (fullHash ? fullHash.substring(0, 10) : null),
    }
})

// Fetch token verification from backend
const fetchVerification = async () => {
    if (!currentToken.value) {
        isLoading.value = false
        errorState.value = 'TOKEN_EMPTY'
        return
    }

    isLoading.value = true
    errorState.value = null
    verificationData.value = null

    try {
        const result = await getPublicVerification(currentToken.value)
        verificationData.value = result
    } catch (err) {
        console.error('Public Verification Error:', err)
        errorState.value = err?.response?.status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR'
        // If backend returns data inside 422 or error response payload
        if (err?.response?.data?.data) {
            verificationData.value = err.response.data.data
        } else if (err?.response?.data && typeof err.response.data.is_valid !== 'undefined') {
            verificationData.value = err.response.data
        }
    } finally {
        isLoading.value = false
    }
}

// Copy hash to clipboard
const copyHash = async () => {
    if (!securityData.value.hash) return
    try {
        await navigator.clipboard.writeText(securityData.value.hash)
        isCopied.value = true
        setTimeout(() => {
            isCopied.value = false
        }, 2000)
    } catch (err) {
        console.warn('Clipboard copy failed:', err)
    }
}

onMounted(() => {
    fetchVerification()
})
</script>
