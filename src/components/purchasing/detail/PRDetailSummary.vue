<script setup>
import { computed } from 'vue'
import {
    Calendar,
    Clock,
    FileText,
    Building2,
    Briefcase,
    Mail,
    Tag,
    User
} from '@lucide/vue'
import { formatCurrency, formatDate } from '../../../composables/useFormatter.js'

const props = defineProps({
    item: {
        type: Object,
        required: true
    }
})

const requesterProfile = computed(() => {
    const r = props.item?.requester
    const emp = r?.employee
    const name = emp?.name || r?.name || 'Staff Pemohon'
    const words = name.trim().split(/\s+/)
    const initials = words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase()

    return {
        name,
        initials,
        nik: emp?.nik || null,
        email: emp?.email || r?.email || null,
        position: emp?.position?.name || null,
        jobLevel: emp?.job_level?.name || null,
        division: props.item?.division?.name || emp?.division?.name || null,
        company: props.item?.company?.name || emp?.company?.name || null,
    }
})

const totalCalculated = computed(() => {
    if (props.item?.total_estimated_amount && Number(props.item.total_estimated_amount) > 0) {
        return Number(props.item.total_estimated_amount)
    }
    const items = props.item?.items || []
    return items.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.estimated_price) || 0)), 0)
})

const isApproved = computed(() => {
    const approvedStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed']
    return approvedStatuses.includes(props.item?.status)
})
</script>

<template>
    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <!-- KOLOM 1: PEMOHON & WAKTU PENGAJUAN (~40%) -->
            <div class="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div>
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <User class="w-3.5 h-3.5 text-[#014BAA]" />
                            Pemohon
                        </span>
                        <span 
                            v-if="requesterProfile.nik" 
                            class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80 font-mono text-[11px] font-semibold"
                            title="Nomor Induk Karyawan"
                        >
                            NIK: {{ requesterProfile.nik }}
                        </span>
                    </div>

                    <div class="flex items-start gap-3.5">
                        <!-- Avatar Inisial -->
                        <div class="w-12 h-12 rounded-xl bg-[#EAF2FF] text-[#014BAA] border border-[#014BAA]/20 font-bold font-mono text-sm flex items-center justify-center shrink-0 shadow-2xs">
                            {{ requesterProfile.initials }}
                        </div>

                        <!-- Data Pemohon -->
                        <div class="space-y-1 min-w-0 flex-1">
                            <h4 class="text-sm font-bold text-slate-900 truncate" :title="requesterProfile.name">
                                {{ requesterProfile.name }}
                            </h4>
                            
                            <p v-if="requesterProfile.position || requesterProfile.jobLevel" class="text-xs text-slate-600 font-medium truncate flex items-center gap-1.5">
                                <Briefcase class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{{ requesterProfile.position || 'Staff' }}</span>
                                <span v-if="requesterProfile.jobLevel" class="text-slate-400">• {{ requesterProfile.jobLevel }}</span>
                            </p>

                            <p v-if="requesterProfile.division || requesterProfile.company" class="text-xs text-slate-500 truncate flex items-center gap-1.5">
                                <Building2 class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span class="font-medium text-slate-700">{{ requesterProfile.division || item.division?.name || '-' }}</span>
                                <span class="text-slate-400">•</span>
                                <span class="truncate">{{ requesterProfile.company || item.company?.name || '-' }}</span>
                            </p>

                            <p v-if="requesterProfile.email" class="text-xs text-slate-400 truncate flex items-center gap-1.5 pt-0.5">
                                <Mail class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span class="truncate">{{ requesterProfile.email }}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Waktu Pengajuan -->
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span class="flex items-center gap-1.5">
                        <Calendar class="w-3.5 h-3.5 text-slate-400" />
                        Waktu Pengajuan:
                    </span>
                    <strong class="text-slate-800 font-semibold font-mono">
                        {{ formatDate(item.request_date) }}
                    </strong>
                </div>
            </div>

            <!-- KOLOM 2: TARGET KEBUTUHAN & KEPERLUAN PENGADAAN (~38%) -->
            <div class="lg:col-span-4 flex flex-col justify-between space-y-4 lg:border-l lg:border-slate-100 lg:pl-5">
                <div class="space-y-3.5">
                    <!-- Target Kebutuhan -->
                    <div>
                        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                            <Clock class="w-3.5 h-3.5 text-[#014BAA]" />
                            Target Kebutuhan
                        </span>
                        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-800 font-semibold font-mono">
                            <Calendar class="w-3.5 h-3.5 text-slate-500" />
                            <span>{{ formatDate(item.required_date) }}</span>
                        </div>
                    </div>

                    <!-- Keperluan Pengadaan -->
                    <div>
                        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                            Keperluan Pengadaan
                        </span>
                        <p class="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed break-words bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                            {{ item.purpose || '—' }}
                        </p>
                    </div>

                    <!-- Catatan Tambahan (jika ada) -->
                    <div v-if="item.notes" class="text-xs text-slate-500 space-y-1">
                        <span class="font-semibold text-slate-600 block">Catatan Tambahan:</span>
                        <p class="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 leading-relaxed italic">
                            "{{ item.notes }}"
                        </p>
                    </div>
                </div>
            </div>

            <!-- KOLOM 3: TOTAL ESTIMASI BIAYA (~22%) -->
            <div class="lg:col-span-3 flex flex-col justify-between rounded-xl p-4.5 bg-[#EAF2FF] border border-[#014BAA]/15 text-[#014BAA] shadow-2xs">
                <div>
                    <div class="flex items-center justify-between gap-1.5 mb-1.5">
                        <span class="text-xs font-bold uppercase tracking-wider text-[#014BAA]">
                            {{ isApproved ? 'Total Disetujui' : 'Total Estimasi Biaya' }}
                        </span>
                        <Tag class="w-3.5 h-3.5 text-[#014BAA]/70" />
                    </div>

                    <div class="text-xl sm:text-2xl font-mono font-bold tracking-tight text-[#014BAA] mt-2">
                        {{ formatCurrency(totalCalculated, item.currency) }}
                    </div>
                </div>

                <div class="mt-4 pt-3 border-t border-[#014BAA]/15 flex items-center justify-between text-xs text-[#014BAA]/90 font-medium">
                    <span>Jumlah Barang:</span>
                    <strong class="font-bold">{{ item.items?.length || 0 }} Item</strong>
                </div>
            </div>
        </div>
    </div>
</template>
