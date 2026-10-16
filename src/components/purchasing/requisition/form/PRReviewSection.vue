<script setup>
import { formatCurrency } from '@/composables/useFormatter.js'

defineProps({
    form: {
        type: Object,
        required: true,
    },
    itemsCatalog: {
        type: Array,
        required: true,
    },
    unitsList: {
        type: Array,
        required: true,
    },
    selectedWorkflow: {
        type: Object,
        default: null,
    },
    selectedWorkflowLevels: {
        type: Array,
        required: true,
    },
    daysUntilRequired: {
        type: Number,
        default: null,
    },
    totalQuantity: {
        type: Number,
        required: true,
    },
    totalEstimatedAmount: {
        type: Number,
        required: true,
    },
    totalEstimatedAmountInBase: {
        type: Number,
        required: true,
    },
    formatDisplayDate: {
        type: Function,
        required: true,
    },
})

defineEmits(['go-to-step'])
</script>

<template>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div class="lg:col-span-2 space-y-6">
            <!-- Card 1: Ringkasan Pengajuan -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-xs">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                        <h2 class="text-lg sm:text-xl font-bold text-slate-900">Ringkasan Pengajuan</h2>
                        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Periksa kembali kelengkapan informasi sebelum dikirim</p>
                    </div>
                    <button
                        type="button"
                        @click="$emit('go-to-step', 1)"
                        class="text-xs sm:text-sm font-bold text-[#014BAA] hover:underline cursor-pointer"
                    >
                        Ubah Data
                    </button>
                </div>

                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs sm:text-sm">
                    <div class="flex justify-between gap-3 py-2 border-b border-slate-100">
                        <dt class="text-slate-500">Tujuan Pengadaan</dt>
                        <dd class="font-bold text-slate-900 text-right">{{ form.purpose || '-' }}</dd>
                    </div>
                    <div class="flex justify-between gap-3 py-2 border-b border-slate-100">
                        <dt class="text-slate-500">Mata Uang & Kurs</dt>
                        <dd class="font-bold text-slate-900 text-right">{{ form.currency }}<span v-if="form.currency !== 'IDR'"> (kurs Rp{{ Number(form.exchange_rate).toLocaleString('id-ID') }})</span></dd>
                    </div>
                    <div class="flex justify-between gap-3 py-2 border-b border-slate-100">
                        <dt class="text-slate-500">Tanggal Permintaan</dt>
                        <dd class="font-bold text-slate-900 text-right">{{ formatDisplayDate(form.request_date) }}</dd>
                    </div>
                    <div class="flex justify-between gap-3 py-2 border-b border-slate-100">
                        <dt class="text-slate-500">Tanggal Kebutuhan</dt>
                        <dd class="font-bold text-slate-900 text-right">{{ formatDisplayDate(form.required_date) }} ({{ daysUntilRequired }} hari)</dd>
                    </div>
                    <div class="flex justify-between gap-3 py-2 border-b border-slate-100 sm:col-span-2">
                        <dt class="text-slate-500">Alur Persetujuan</dt>
                        <dd class="font-bold text-slate-900 text-right">{{ selectedWorkflow ? (selectedWorkflow.code || selectedWorkflow.name) : 'Otomatis' }}, {{ selectedWorkflowLevels.length }} tahap</dd>
                    </div>
                </dl>
                <div v-if="form.notes" class="text-xs sm:text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <span class="font-bold text-slate-900">Catatan Pengadaan:</span> {{ form.notes }}
                </div>
            </div>

            <!-- Card 2: Rincian Item yang Diajukan -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 space-y-4 shadow-xs">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h2 class="text-lg sm:text-xl font-bold text-slate-900">{{ form.items.length }} Item Diajukan</h2>
                    <button
                        type="button"
                        @click="$emit('go-to-step', 2)"
                        class="text-xs sm:text-sm font-bold text-[#014BAA] hover:underline cursor-pointer"
                    >
                        Ubah Item
                    </button>
                </div>

                <div class="divide-y divide-slate-100">
                    <div
                        v-for="(row, index) in form.items"
                        :key="row._uid"
                        class="py-4 flex items-start justify-between gap-4 text-xs sm:text-sm"
                    >
                        <div class="min-w-0">
                            <p class="font-bold text-slate-900 text-sm sm:text-base">
                                <span class="text-slate-400 font-mono mr-2">#{{ String(index + 1).padStart(2, '0') }}</span>
                                {{ row.entry_mode === 'catalog' ? (itemsCatalog.find(i => i.id === row.item_id)?.name || `Item katalog #${row.item_id || '-'}`) : (row.item_name || 'Item nonkatalog') }}
                            </p>
                            <p class="text-slate-500 mt-1 font-medium">
                                {{ Number(row.quantity).toLocaleString('id-ID') }} {{ unitsList.find(u => u.id === row.unit_id)?.code || 'Unit' }} &times; {{ formatCurrency(Number(row.estimated_price) || 0, form.currency) }}
                                <span v-if="row.detail_name" class="text-slate-600 font-normal"> &middot; {{ row.detail_name }}</span>
                            </p>
                            <p v-if="row.notes" class="text-xs text-slate-500 mt-0.5">
                                Catatan: {{ row.notes }}
                            </p>
                        </div>
                        <span class="font-mono text-sm sm:text-base font-bold text-slate-900 shrink-0">
                            {{ formatCurrency((Number(row.quantity) || 0) * (Number(row.estimated_price) || 0), form.currency) }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Sidebar Kanan Step 3 -->
        <aside class="space-y-5 lg:sticky lg:top-4">
            <!-- Total Estimasi -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Estimasi Anggaran
                </p>
                <p class="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-[#014BAA] mt-2">
                    {{ formatCurrency(totalEstimatedAmount, form.currency) }}
                </p>
                <p v-if="form.currency !== 'IDR'" class="text-xs sm:text-sm text-slate-500 font-mono mt-1 pt-2 border-t border-slate-100">
                    &asymp; {{ formatCurrency(totalEstimatedAmountInBase, 'IDR') }}
                </p>
                <p class="text-xs sm:text-sm text-slate-600 mt-3 font-medium">
                    {{ form.items.length }} item &middot; {{ totalQuantity.toLocaleString('id-ID') }} kuantitas
                </p>
            </div>

            <!-- Panduan Prosedur -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 text-xs sm:text-sm text-slate-600 space-y-2 shadow-xs">
                <p class="font-bold text-slate-900 text-sm sm:text-base">Prosedur Pengajuan</p>
                <p class="leading-relaxed text-slate-500">
                    Dokumen PR akan langsung masuk ke antrean verifikasi pemberi persetujuan sesuai hierarki yang telah dikonfigurasi. Anda dapat melacak status persetujuan secara berkala di dashboard pengadaan.
                </p>
            </div>
        </aside>
    </div>
</template>
