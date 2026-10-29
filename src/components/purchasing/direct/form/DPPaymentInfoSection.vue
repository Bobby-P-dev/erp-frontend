<script setup>
import { CreditCard, Landmark, Wallet } from '@lucide/vue'

defineProps({
    form: {
        type: Object,
        required: true,
    },
    popularBanks: {
        type: Array,
        required: true,
    },
})

const methods = [
    { id: 'marketplace_va', label: 'Virtual Account', sub: 'VA Marketplace', icon: CreditCard },
    { id: 'bank_transfer', label: 'Transfer Bank', sub: 'Rekening Bank', icon: Landmark },
    { id: 'cash', label: 'Tunai / Kas Kecil', sub: 'Petty Cash', icon: Wallet },
    { id: 'corporate_card', label: 'Kartu Perusahaan', sub: 'Corporate Card', icon: CreditCard },
]
</script>

<template>
    <div class="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div class="pb-3 border-b border-slate-100">
            <h3 class="text-sm font-bold text-slate-900">Metode Pembayaran & Rekening Tujuan</h3>
            <p class="text-xs text-slate-500">Informasi pencairan dana untuk eksekusi pembayaran oleh Finance.</p>
        </div>

        <div class="space-y-3.5">
            <!-- Metode Pembayaran Selector -->
            <div class="grid grid-cols-2 gap-2">
                <button
                    v-for="m in methods"
                    :key="m.id"
                    type="button"
                    @click="form.payment_method = m.id"
                    class="p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all text-xs cursor-pointer"
                    :class="form.payment_method === m.id
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold ring-1 ring-blue-500/30'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 font-medium'"
                >
                    <component :is="m.icon" class="w-4 h-4 shrink-0" :class="form.payment_method === m.id ? 'text-blue-600' : 'text-slate-400'" />
                    <div class="min-w-0">
                        <p class="leading-tight truncate">{{ m.label }}</p>
                        <p class="text-[10px] text-slate-400 font-normal truncate">{{ m.sub }}</p>
                    </div>
                </button>
            </div>

            <!-- Tipe Penerima & Nama Penerima -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">
                        Kategori Penerima
                    </label>
                    <select
                        v-model="form.recipient_type"
                        class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    >
                        <option value="marketplace_merchant">Merchant / Toko Online</option>
                        <option value="supplier">Vendor / Rekanan Resmi</option>
                        <option value="employee_reimbursement">Reimbursement Karyawan</option>
                        <option value="other">Pihak Ketiga Lainnya</option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Penerima Dana
                    </label>
                    <input
                        type="text"
                        v-model="form.recipient_name"
                        placeholder="Nama toko / vendor penerima"
                        class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                </div>
            </div>

            <!-- Detail Rekening (Hidden if Cash) -->
            <div v-if="form.payment_method !== 'cash'" class="space-y-3 pt-2 border-t border-slate-100">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">
                        Bank / Provider VA <span class="text-rose-500">*</span>
                    </label>
                    <input
                        type="text"
                        v-model="form.bank_name"
                        placeholder="BCA Virtual Account, Bank Mandiri..."
                        class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                    <div class="flex flex-wrap gap-1 mt-1.5">
                        <button
                            v-for="b in popularBanks"
                            :key="b"
                            type="button"
                            @click="form.bank_name = b"
                            class="px-2 py-0.5 text-[10px] rounded border transition-colors cursor-pointer"
                            :class="form.bank_name === b ? 'bg-blue-600 text-white border-blue-600 font-semibold' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'"
                        >
                            {{ b }}
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            No. Rekening / VA <span class="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            v-model="form.bank_account_number"
                            placeholder="880123456789"
                            class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            Atas Nama Rekening
                        </label>
                        <input
                            type="text"
                            v-model="form.bank_account_holder"
                            placeholder="Tokopedia - Nama Toko"
                            class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
