<script setup>
import { Clock, GitBranch } from '@lucide/vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import ApprovalStepper from '@/components/approval/ApprovalStepper.vue'

defineProps({
    form: {
        type: Object,
        required: true,
    },
    errors: {
        type: Object,
        default: () => ({}),
    },
    today: {
        type: String,
        required: true,
    },
    approvalConfigOptions: {
        type: Array,
        required: true,
    },
    selectedWorkflowLevels: {
        type: Array,
        required: true,
    },
    daysUntilRequired: {
        type: Number,
        default: null,
    },
    employeeName: {
        type: String,
        default: '',
    },
    employeePosition: {
        type: String,
        default: '',
    },
    employeeCompanyName: {
        type: String,
        default: '',
    },
    employeeDivisionName: {
        type: String,
        default: '',
    },
    formatDisplayDate: {
        type: Function,
        required: true,
    },
    getFieldError: {
        type: Function,
        required: true,
    },
})

defineEmits(['mark-touched'])
</script>

<template>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div class="lg:col-span-2 space-y-6">
            <div class="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 space-y-6 shadow-xs">
                <div>
                    <h2 class="text-lg sm:text-xl font-bold text-[#111827]">Informasi Pengadaan</h2>
                    <p class="text-sm text-slate-500 mt-1">Lengkapi tujuan pengadaan dan target tanggal kebutuhan barang</p>
                </div>

                <p v-if="errors.company_id || errors.division_id" class="text-sm font-medium text-[#C62828] bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    {{ errors.company_id || errors.division_id }} Hubungi admin jika profil Anda belum terhubung ke perusahaan atau divisi yang valid.
                </p>

                <!-- Tujuan Pengadaan -->
                <div>
                    <label for="input-purpose" class="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                        Tujuan Pengadaan <span class="text-[#C62828] font-bold">*</span>
                    </label>
                    <input
                        id="input-purpose"
                        v-model="form.purpose"
                        type="text"
                        required
                        @blur="$emit('mark-touched', 'purpose')"
                        @input="$emit('mark-touched', 'purpose')"
                        placeholder="Contoh: Pengadaan suku cadang mesin line 2"
                        class="w-full h-13 px-4 bg-white border rounded-xl text-base font-medium text-[#111827] placeholder:text-slate-400 focus:outline-none transition-colors"
                        :class="[
                            getFieldError('purpose')
                                ? 'border-[#C62828] ring-2 ring-[#C62828]/20 focus:border-[#C62828]'
                                : 'border-slate-300 focus:border-[#014BAA] focus:ring-2 focus:ring-[#014BAA]/15'
                        ]"
                    />
                    <p v-if="getFieldError('purpose')" class="text-sm text-[#C62828] mt-1.5 font-medium">
                        {{ getFieldError('purpose') }}
                    </p>
                </div>

                <!-- Tanggal Permintaan & Tanggal Kebutuhan -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <!-- Tanggal Permintaan (Read-only Calm Box) -->
                    <div>
                        <span class="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                            Tanggal Permintaan (Sistem)
                        </span>
                        <div class="h-13 px-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-base text-slate-700">
                            <span class="font-bold text-slate-900">{{ formatDisplayDate(form.request_date) }}</span>
                            <span class="text-xs sm:text-sm text-slate-500 font-medium">Otomatis hari ini</span>
                        </div>
                    </div>

                    <!-- Tanggal Kebutuhan -->
                    <div>
                        <label for="input-required-date" class="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                            Tanggal Kebutuhan <span class="text-[#C62828] font-bold">*</span>
                        </label>
                        <input
                            id="input-required-date"
                            v-model="form.required_date"
                            type="date"
                            :min="form.request_date || today"
                            required
                            @blur="$emit('mark-touched', 'required_date')"
                            @change="$emit('mark-touched', 'required_date')"
                            class="w-full h-13 px-4 bg-white border rounded-xl text-base font-medium text-[#111827] focus:outline-none transition-colors"
                            :class="[
                                getFieldError('required_date')
                                    ? 'border-[#C62828] ring-2 ring-[#C62828]/20 focus:border-[#C62828]'
                                    : 'border-slate-300 focus:border-[#014BAA] focus:ring-2 focus:ring-[#014BAA]/15'
                            ]"
                        />
                        <p v-if="getFieldError('required_date')" class="text-sm text-[#C62828] mt-1.5 font-medium">
                            {{ getFieldError('required_date') }}
                        </p>
                        <p v-else-if="daysUntilRequired !== null" class="text-xs sm:text-sm text-slate-600 mt-2 flex items-center gap-1.5 font-medium">
                            <Clock class="w-4 h-4 text-[#014BAA]" />
                            Target pemenuhan dalam <span class="font-bold text-slate-900">{{ daysUntilRequired }} hari</span> lagi
                        </p>
                    </div>
                </div>

                <!-- Catatan Tambahan -->
                <div>
                    <label for="input-notes" class="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                        Catatan Tambahan <span class="text-xs sm:text-sm font-normal text-slate-500">(opsional)</span>
                    </label>
                    <textarea
                        id="input-notes"
                        v-model="form.notes"
                        rows="3"
                        placeholder="Instruksi pengiriman, lokasi penyerahan barang, atau rincian operasional..."
                        class="w-full p-4 bg-white border border-slate-300 rounded-xl text-base text-[#111827] placeholder:text-slate-400 focus:outline-none focus:border-[#014BAA] focus:ring-2 focus:ring-[#014BAA]/15 transition-colors resize-y font-medium"
                    ></textarea>
                </div>

                <!-- Alur Persetujuan Dokumen -->
                <div class="border-t border-slate-200 pt-6 space-y-3.5">
                    <div>
                        <h3 class="text-sm sm:text-base font-bold text-[#111827]">Alur Persetujuan Dokumen</h3>
                        <p class="text-xs sm:text-sm text-slate-500">Otorisasi otomatis sesuai divisi dan hierarki perusahaan</p>
                    </div>

                    <BaseSelect
                        v-model="form.approval_configuration_id"
                        :options="approvalConfigOptions"
                        placeholder="Otomatis (alur standar divisi)..."
                        :error="errors.approval_configuration_id"
                    />

                    <!-- Pratinjau Alur Persetujuan -->
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                        <div class="mb-3.5 flex items-center justify-between">
                            <span class="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <GitBranch class="w-4 h-4 text-[#014BAA]" />
                                Urutan Verifikasi & Persetujuan:
                            </span>
                            <span v-if="selectedWorkflowLevels.length > 0" class="text-xs text-[#014BAA] font-bold bg-[#EEF4FC] border border-[#014BAA]/20 px-2.5 py-0.5 rounded-md">
                                {{ selectedWorkflowLevels.length }} Level Persetujuan
                            </span>
                        </div>
                        <div v-if="selectedWorkflowLevels.length > 0">
                            <ApprovalStepper
                                :levels="selectedWorkflowLevels"
                                :currentStepOrder="1"
                                overallStatus="pending"
                                orientation="horizontal"
                            />
                        </div>
                        <div v-else class="py-3 text-center text-xs sm:text-sm text-slate-500">
                            PR akan diproses melalui alur persetujuan default sistem.
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <aside class="space-y-5 lg:sticky lg:top-4">
            <!-- Profil Pemohon -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div class="flex items-center gap-3.5">
                    <span class="w-12 h-12 rounded-xl bg-[#EEF4FC] text-[#014BAA] border border-[#014BAA]/20 flex items-center justify-center text-base font-bold shrink-0">
                        {{ (employeeName || 'K').charAt(0).toUpperCase() }}
                    </span>
                    <div class="min-w-0">
                        <p class="text-base font-bold text-slate-900 truncate">{{ employeeName }}</p>
                        <p class="text-xs sm:text-sm text-slate-500 truncate font-medium">{{ employeePosition }}</p>
                    </div>
                </div>
                <dl class="mt-5 pt-4 border-t border-slate-100 space-y-3 text-xs sm:text-sm">
                    <div class="flex items-center justify-between gap-2">
                        <dt class="text-slate-500">Perusahaan</dt>
                        <dd class="font-bold text-slate-900 text-right truncate">{{ employeeCompanyName }}</dd>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <dt class="text-slate-500">Divisi</dt>
                        <dd class="font-bold text-slate-900 text-right truncate">{{ employeeDivisionName }}</dd>
                    </div>
                </dl>
            </div>

            <!-- Panduan Tahapan Pengajuan PR -->
            <div class="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <h4 class="text-sm sm:text-base font-bold text-slate-900">
                    Petunjuk Pengajuan PR
                </h4>
                <ol class="space-y-3.5 text-xs sm:text-sm text-slate-600">
                    <li class="flex items-start gap-3">
                        <span class="w-6 h-6 rounded-full bg-[#EEF4FC] text-[#014BAA] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <div>
                            <span class="font-bold text-slate-900">Langkah 1 (Saat Ini):</span>
                            <p class="text-slate-500 mt-0.5">Tentukan tujuan pengadaan serta tanggal batas kebutuhan barang.</p>
                        </div>
                    </li>
                    <li class="flex items-start gap-3">
                        <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <div>
                            <span class="font-bold text-slate-900">Langkah 2:</span>
                            <p class="text-slate-500 mt-0.5">Tambahkan rincian barang, jumlah, estimasi harga satuan, dan spesifikasi.</p>
                        </div>
                    </li>
                    <li class="flex items-start gap-3">
                        <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <div>
                            <span class="font-bold text-slate-900">Langkah 3:</span>
                            <p class="text-slate-500 mt-0.5">Periksa seluruh berkas dan ajukan ke atasan untuk otorisasi.</p>   
                        </div>
                    </li>
                </ol>
                <div class="pt-3.5 border-t border-slate-100 text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Total estimasi biaya akan otomatis dihitung saat Anda memasukkan item di Langkah 2.
                </div>
            </div>
        </aside>
    </div>
</template>
