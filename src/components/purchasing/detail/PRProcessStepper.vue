<script setup>
import { computed, ref } from 'vue'
import {
    Check,
    Clock,
    ChevronDown,
    History,
    AlertCircle,
    XCircle,
    RotateCcw,
    Layers
} from '@lucide/vue'
import DocumentWorkflowTracker from '../../approval/DocumentWorkflowTracker.vue'
import DocumentLifecycleTimeline from '../../approval/DocumentLifecycleTimeline.vue'

const props = defineProps({
    item: {
        type: Object,
        required: true
    }
})

const showFullAudit = ref(false)
const activeTab = ref('lifecycle') // 'lifecycle' | 'tracker'

const prStatus = computed(() => {
    return props.item?.status || 'draft'
})

const steps = computed(() => {
    const s = prStatus.value

    // Stage 1: Pengajuan
    let step1 = { label: 'Pengajuan', state: 'completed', stateLabel: 'Selesai' }
    if (s === 'draft') {
        step1 = { label: 'Pengajuan', state: 'active', stateLabel: 'Draft PR' }
    }

    // Stage 2: Approval
    let step2 = { label: 'Approval', state: 'waiting', stateLabel: 'Menunggu' }
    if (s === 'pending_approval') {
        step2 = { label: 'Approval', state: 'active', stateLabel: 'Sedang Ditinjau' }
    } else if (s === 'revision_requested') {
        step2 = { label: 'Approval', state: 'revision', stateLabel: 'Perlu Revisi' }
    } else if (s === 'rejected') {
        step2 = { label: 'Approval', state: 'rejected', stateLabel: 'Ditolak' }
    } else if (['approved', 'in_procurement', 'ready_for_pickup', 'completed'].includes(s)) {
        step2 = { label: 'Approval', state: 'completed', stateLabel: 'Disetujui' }
    }

    // Stage 3: Pembelian
    let step3 = { label: 'Pembelian', state: 'waiting', stateLabel: 'Menunggu' }
    if (s === 'in_procurement') {
        step3 = { label: 'Pembelian', state: 'active', stateLabel: 'Berjalan' }
    } else if (['ready_for_pickup', 'completed'].includes(s)) {
        step3 = { label: 'Pembelian', state: 'completed', stateLabel: 'Selesai' }
    }

    // Stage 4: Pembayaran
    let step4 = { label: 'Pembayaran', state: 'waiting', stateLabel: 'Menunggu' }
    if (s === 'completed') {
        step4 = { label: 'Pembayaran', state: 'completed', stateLabel: 'Selesai' }
    } else if (s === 'in_procurement' || s === 'ready_for_pickup') {
        // Can be active/ongoing in finance
        step4 = { label: 'Pembayaran', state: 'waiting', stateLabel: 'Antrean Kasir' }
    }

    // Stage 5: Penerimaan
    let step5 = { label: 'Penerimaan', state: 'waiting', stateLabel: 'Menunggu' }
    if (['ready_for_pickup', 'completed'].includes(s)) {
        step5 = { label: 'Penerimaan', state: 'completed', stateLabel: 'Diterima di Gudang' }
    }

    // Stage 6: Serah Terima
    let step6 = { label: 'Serah Terima', state: 'waiting', stateLabel: 'Menunggu' }
    if (s === 'ready_for_pickup') {
        step6 = { label: 'Serah Terima', state: 'active', stateLabel: 'Siap Diambil' }
    } else if (s === 'completed') {
        step6 = { label: 'Serah Terima', state: 'completed', stateLabel: 'Selesai' }
    }

    return [step1, step2, step3, step4, step5, step6]
})
</script>

<template>
    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <!-- Horizontal Stepper (Clean & Lightweight) -->
        <div class="overflow-x-auto pb-2">
            <div class="min-w-[620px] flex items-center justify-between relative px-2">
                <div 
                    v-for="(st, idx) in steps" 
                    :key="idx" 
                    class="flex flex-col items-center relative z-10 group flex-1"
                >
                    <!-- Connector line behind circles (between steps) -->
                    <div 
                        v-if="idx < steps.length - 1"
                        class="absolute top-4 left-1/2 w-full h-[2px] -z-10"
                        :class="[
                            st.state === 'completed' 
                                ? 'bg-[#1B5E20]' 
                                : 'bg-slate-200'
                        ]"
                    ></div>

                    <!-- Step Circle Indicator -->
                    <div 
                        class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-2xs"
                        :class="[
                            st.state === 'completed'
                                ? 'bg-[#1B5E20] text-white ring-2 ring-[#1B5E20]/20'
                                : st.state === 'active'
                                    ? 'bg-[#EAF2FF] border-2 border-[#014BAA] text-[#014BAA] ring-4 ring-[#014BAA]/10'
                                    : st.state === 'revision'
                                        ? 'bg-amber-50 border-2 border-amber-600 text-amber-700'
                                        : st.state === 'rejected'
                                            ? 'bg-rose-50 border-2 border-rose-600 text-rose-700'
                                            : 'bg-white border border-slate-300 text-slate-400'
                        ]"
                    >
                        <Check v-if="st.state === 'completed'" class="w-4 h-4 stroke-[2.75]" />
                        <span v-else-if="st.state === 'active'" class="w-2.5 h-2.5 rounded-full bg-[#014BAA] animate-pulse"></span>
                        <RotateCcw v-else-if="st.state === 'revision'" class="w-3.5 h-3.5" />
                        <XCircle v-else-if="st.state === 'rejected'" class="w-4 h-4" />
                        <span v-else class="font-mono text-xs">{{ idx + 1 }}</span>
                    </div>

                    <!-- Step Label & State Subtitle -->
                    <div class="text-center mt-2 space-y-0.5">
                        <span 
                            class="text-xs font-bold block"
                            :class="[
                                st.state === 'completed' || st.state === 'active'
                                    ? 'text-slate-900'
                                    : 'text-slate-500'
                            ]"
                        >
                            {{ st.label }}
                        </span>
                        <span 
                            class="text-[11px] font-medium block"
                            :class="[
                                st.state === 'completed'
                                    ? 'text-[#1B5E20] font-semibold'
                                    : st.state === 'active'
                                        ? 'text-[#014BAA] font-bold'
                                        : st.state === 'revision'
                                            ? 'text-amber-700 font-semibold'
                                            : st.state === 'rejected'
                                                ? 'text-rose-700 font-semibold'
                                                : 'text-slate-400'
                            ]"
                        >
                            {{ st.stateLabel }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- On-Demand Detailed End-to-End Flow & Audit Trail Disclosure -->
        <div class="border-t border-slate-100 pt-3">
            <button
                type="button"
                @click="showFullAudit = !showFullAudit"
                class="w-full py-2.5 px-3.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center justify-between transition-colors border border-slate-200/80 cursor-pointer"
                :aria-expanded="showFullAudit"
            >
                <span class="flex items-center gap-2">
                    <Layers class="w-4 h-4 text-[#014BAA]" />
                    <span>Lihat Detail Alur Dokumen (End-to-End) & Jejak Persetujuan</span>
                </span>
                <ChevronDown 
                    class="w-4 h-4 text-slate-400 transition-transform duration-200"
                    :class="{'rotate-180': showFullAudit}"
                />
            </button>

            <!-- Expanded Section -->
            <div v-if="showFullAudit" class="pt-4 space-y-4">
                <!-- Segmented View Selector -->
                <div class="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <div class="inline-flex items-center p-1 bg-slate-100/90 rounded-lg border border-slate-200 text-xs">
                        <button
                            type="button"
                            @click="activeTab = 'lifecycle'"
                            :class="[
                                'px-3.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-2',
                                activeTab === 'lifecycle'
                                    ? 'bg-white text-[#014BAA] shadow-2xs font-bold border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900'
                            ]"
                        >
                            <Layers class="w-3.5 h-3.5" :class="activeTab === 'lifecycle' ? 'text-[#014BAA]' : 'text-slate-400'" />
                            <span>Alur Siklus Hidup Dokumen (Inisiator s/d Selesai)</span>
                        </button>

                        <button
                            type="button"
                            @click="activeTab = 'tracker'"
                            :class="[
                                'px-3.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-2',
                                activeTab === 'tracker'
                                    ? 'bg-white text-[#014BAA] shadow-2xs font-bold border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900'
                            ]"
                        >
                            <History class="w-3.5 h-3.5" :class="activeTab === 'tracker' ? 'text-[#014BAA]' : 'text-slate-400'" />
                            <span>Jejak Audit Persetujuan (Audit Trail)</span>
                        </button>
                    </div>
                </div>

                <!-- Tab 1: Complete End-to-End Lifecycle Stages (Without 6-T Card) -->
                <div v-if="activeTab === 'lifecycle'">
                    <DocumentLifecycleTimeline
                        :documentId="item.id"
                        documentType="purchase_requisition"
                        :showProgressSummary="false"
                    />
                </div>

                <!-- Tab 2: Workflow & Approval Audit Trail Tracker -->
                <div v-else>
                    <DocumentWorkflowTracker
                        documentType="purchase_requisition"
                        :documentId="item.id"
                        title="Progres Alur Persetujuan (Workflow)"
                        auditTrailTitle="Jejak Audit Persetujuan (Audit Trail)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
