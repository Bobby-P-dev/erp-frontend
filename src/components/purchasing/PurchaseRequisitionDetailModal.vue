<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseModal from '../ui/BaseModal.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import PRDetailSummary from './detail/PRDetailSummary.vue'
import PRApprovalList from './detail/PRApprovalList.vue'
import PRProcessStepper from './detail/PRProcessStepper.vue'
import PRItemsTable from './detail/PRItemsTable.vue'
import { useAuthStore } from '../../stores/auth.js'
import { generatePurchaseRequisitionPdf } from '../../utils/pdf/purchaseRequisitionPdfGenerator.js'
import { formatDate } from '../../composables/useFormatter.js'
import {
    FileText,
    RotateCcw,
    Package,
    FileEdit,
    Send,
    RefreshCw,
    ChevronDown,
    ShieldCheck,
    GitBranch,
    ShoppingBag,
    Download,
    Loader2
} from '@lucide/vue'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    item: {
        type: Object,
        default: null
    },
    isLoading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue', 'close', 'submitPR'])

const authStore = useAuthStore()
const isDownloadingPdf = ref(false)

// Accordion sections (default all 4 main sections open as per design spec)
const sections = ref({
    summary: true,
    approval: true,
    process: true,
    items: true
})

const toggleSection = (key) => {
    sections.value[key] = !sections.value[key]
}

const close = () => {
    emit('update:modelValue', false)
    emit('close')
}

const getLatestRevisionNote = (pr) => {
    if (!pr?.approval_request?.actions || !Array.isArray(pr.approval_request.actions)) return null
    const revAction = pr.approval_request.actions
        .filter(a => a.action === 'revision' || a.action === 'request_revision')
        .sort((a, b) => new Date(b.acted_at || 0) - new Date(a.acted_at || 0))[0]
    return revAction || null
}

const canDownloadPdf = computed(() => {
    if (!props.item) return false
    const approvedStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed']
    return approvedStatuses.includes(props.item.status)
})

const handleDownloadPdf = async () => {
    if (!props.item || isDownloadingPdf.value) return
    isDownloadingPdf.value = true
    try {
        await generatePurchaseRequisitionPdf(props.item, {
            currentUser: authStore.user?.name || 'Petugas ERP'
        })
    } finally {
        isDownloadingPdf.value = false
    }
}
</script>

<template>
    <BaseModal
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        @close="close"
        size="5xl"
        body-class="p-5 sm:p-6 space-y-6 text-xs bg-slate-50/30"
    >
        <!-- 1. HEADER MODAL -->
        <template #header>
            <div class="flex items-center gap-3.5">
                <!-- Simple Clean Document Icon -->
                <div class="w-10 h-10 rounded-xl bg-[#EAF2FF] text-[#014BAA] border border-[#014BAA]/20 flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText class="w-5 h-5 text-[#014BAA]" />
                </div>

                <!-- Document Identity -->
                <div class="space-y-0.5 min-w-0">
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <h3 class="text-base sm:text-lg font-mono font-bold text-slate-900 tracking-tight">
                            {{ item?.pr_number || 'Purchase Requisition' }}
                        </h3>
                        <StatusBadge 
                            v-if="item?.status" 
                            :status="item.status" 
                            size="md" 
                        />
                    </div>
                    <p class="text-xs text-slate-500">
                        Detail pengajuan pengadaan barang & jasa
                    </p>
                </div>
            </div>
        </template>

        <!-- Loading State Skeleton -->
        <div v-if="isLoading" class="py-16 text-center space-y-3">
            <RefreshCw class="w-8 h-8 animate-spin text-[#014BAA] mx-auto" />
            <div class="text-xs font-semibold text-slate-700">Memuat rincian dokumen PR...</div>
            <p class="text-[11px] text-slate-400">Menyinkronkan data pemohon, status persetujuan, dan rincian item pengadaan.</p>
        </div>

        <template v-else-if="item">
            <!-- 2. SPECIAL CRITICAL STATUS BANNERS -->
            <!-- Ready for Pickup Banner -->
            <div 
                v-if="item.status === 'ready_for_pickup'" 
                class="p-4 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-start gap-3 shadow-2xs"
            >
                <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Package class="w-5 h-5" />
                </div>
                <div class="space-y-0.5">
                    <h4 class="text-xs sm:text-sm font-bold text-emerald-950">
                        Barang Telah Tiba di Gudang & Siap Diambil
                    </h4>
                    <p class="text-xs text-emerald-800 leading-relaxed">
                        Barang pesanan telah tiba di gudang dan selesai diverifikasi petugas logistik. Proses pencatatan penerimaan fisik dan serah terima dilakukan oleh staf gudang pada modul <strong>Inventory</strong>.
                    </p>
                </div>
            </div>

            <!-- Revision Requested Banner -->
            <div 
                v-if="item.status === 'revision_requested'" 
                class="p-4 bg-amber-50 border border-amber-200/90 rounded-xl space-y-2 shadow-2xs"
            >
                <div class="flex items-center gap-2 text-amber-950 font-bold text-xs">
                    <RotateCcw class="w-4 h-4 text-amber-600" />
                    <span>Permintaan Revisi Dokumen dari Peninjau:</span>
                </div>
                <p class="text-xs text-amber-900 bg-white/90 p-3 rounded-lg border border-amber-200/80 font-medium leading-relaxed">
                    "{{ getLatestRevisionNote(item)?.notes || 'Mohon sesuaikan rincian barang dan perkiraan harga sesuai arahan pimpinan.' }}"
                </p>
                <div class="flex items-center justify-between text-[11px] text-amber-800 pt-0.5">
                    <span>Peninjau: <strong>{{ getLatestRevisionNote(item)?.user_name || 'Approver' }}</strong></span>
                    <span v-if="getLatestRevisionNote(item)?.acted_at" class="font-mono">
                        {{ formatDate(getLatestRevisionNote(item).acted_at) }}
                    </span>
                </div>
            </div>

            <!-- 3. SECTION A: RINGKASAN DOKUMEN -->
            <div class="space-y-2.5">
                <button
                    type="button"
                    @click="toggleSection('summary')"
                    class="w-full flex items-center justify-between text-left py-1 group cursor-pointer select-none"
                    :aria-expanded="sections.summary"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Ringkasan Dokumen
                        </span>
                    </div>
                    <ChevronDown 
                        class="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200" 
                        :class="{'rotate-180': sections.summary}"
                    />
                </button>

                <div v-show="sections.summary">
                    <PRDetailSummary :item="item" />
                </div>
            </div>

            <!-- 4. SECTION B: APPROVAL (ALUR PERSETUJUAN) -->
            <div class="space-y-2.5">
                <button
                    type="button"
                    @click="toggleSection('approval')"
                    class="w-full flex items-center justify-between text-left py-1 group cursor-pointer select-none"
                    :aria-expanded="sections.approval"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Approval
                        </span>
                        <span 
                            v-if="item.approval_request?.levels?.length" 
                            class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/70"
                        >
                            {{ item.approval_request.levels.length }} Tingkat
                        </span>
                    </div>
                    <ChevronDown 
                        class="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200" 
                        :class="{'rotate-180': sections.approval}"
                    />
                </button>

                <div v-show="sections.approval">
                    <PRApprovalList :item="item" />
                </div>
            </div>

            <!-- 5. SECTION C: TAHAPAN PROSES (HORIZONTAL STEPPER) -->
            <div class="space-y-2.5">
                <button
                    type="button"
                    @click="toggleSection('process')"
                    class="w-full flex items-center justify-between text-left py-1 group cursor-pointer select-none"
                    :aria-expanded="sections.process"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Tahapan Proses
                        </span>
                        <span class="text-[11px] text-slate-400 font-normal">
                            Progres pengadaan lintas divisi
                        </span>
                    </div>
                    <ChevronDown 
                        class="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200" 
                        :class="{'rotate-180': sections.process}"
                    />
                </button>

                <div v-show="sections.process">
                    <PRProcessStepper :item="item" />
                </div>
            </div>

            <!-- 6. SECTION D: DAFTAR BARANG / JASA -->
            <div class="space-y-2.5">
                <button
                    type="button"
                    @click="toggleSection('items')"
                    class="w-full flex items-center justify-between text-left py-1 group cursor-pointer select-none"
                    :aria-expanded="sections.items"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Daftar Barang / Jasa
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/70">
                            {{ item.items?.length || 0 }} Item
                        </span>
                    </div>
                    <ChevronDown 
                        class="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200" 
                        :class="{'rotate-180': sections.items}"
                    />
                </button>

                <div v-show="sections.items">
                    <PRItemsTable :item="item" />
                </div>
            </div>
        </template>

        <!-- 7. FOOTER MODAL & ACTION BUTTONS -->
        <template #footer>
            <div class="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <!-- Left: Tutup -->
                <button
                    type="button"
                    @click="close"
                    class="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-300 bg-white cursor-pointer"
                >
                    Tutup
                </button>

                <!-- Right: Action Buttons -->
                <div class="flex items-center gap-2.5 flex-wrap">
                    <!-- Unduh PDF jika disetujui -->
                    <button
                        v-if="canDownloadPdf"
                        type="button"
                        :disabled="isDownloadingPdf"
                        @click="handleDownloadPdf"
                        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-slate-700 hover:text-[#014BAA] hover:bg-[#EAF2FF] rounded-lg text-xs font-semibold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                        title="Unduh Lembar Persetujuan PR (PDF)"
                    >
                        <Loader2 v-if="isDownloadingPdf" class="w-4 h-4 animate-spin text-[#014BAA]" />
                        <Download v-else class="w-4 h-4 text-slate-600" />
                        <span>Unduh PDF</span>
                    </button>


                    <!-- Edit Draft / Revisi PR -->
                    <RouterLink
                        v-if="item?.status === 'draft' || item?.status === 'revision_requested'"
                        :to="{ name: 'user.purchasing.requisitions.edit', params: { id: item.id } }"
                        class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EAF2FF] hover:bg-blue-100 text-[#014BAA] border border-[#014BAA]/20 rounded-lg text-xs font-bold transition-colors"
                    >
                        <FileEdit class="w-4 h-4" />
                        <span>{{ item?.status === 'revision_requested' ? 'Perbaiki & Edit PR' : 'Edit Draft PR' }}</span>
                    </RouterLink>

                    <!-- Submit PR -->
                    <button
                        v-if="item?.can_be_submitted || item?.status === 'draft' || item?.status === 'revision_requested'"
                        type="button"
                        @click="emit('submitPR', item)"
                        class="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                        <Send class="w-3.5 h-3.5" />
                        <span>{{ item?.status === 'revision_requested' ? 'Ajukan Ulang Persetujuan' : 'Ajukan Persetujuan Sekarang' }}</span>
                    </button>
                </div>
            </div>
        </template>
    </BaseModal>
</template>
