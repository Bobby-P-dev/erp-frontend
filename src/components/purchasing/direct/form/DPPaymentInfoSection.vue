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
</script>

<template>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                4
            </div>
            <div>
                <h3 class="text-base font-bold text-gray-900">Informasi Pembayaran & Rekening Tujuan (Finance)</h3>
                <p class="text-xs text-gray-500">Tentukan metode pencairan dan nomor rekening/Virtual Account untuk pembayaran langsung oleh kasir.</p>
            </div>
        </div>

        <div class="space-y-4">
            <!-- Metode Pembayaran Selector -->
            <div>
                <label class="block text-xs font-bold text-gray-700 mb-2">
                    Metode Pembayaran <span class="text-rose-500">*</span>
                </label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                        type="button"
                        @click="form.payment_method = 'marketplace_va'"
                        class="p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold cursor-pointer"
                        :class="form.payment_method === 'marketplace_va' ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-bold ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 text-gray-700'"
                    >
                        <CreditCard class="w-4 h-4 shrink-0 text-blue-600" />
                        <div>
                            <p class="leading-tight">Virtual Account</p>
                            <p class="text-[10px] text-gray-500 font-normal">Tokopedia/Shopee/VA</p>
                        </div>
                    </button>

                    <button
                        type="button"
                        @click="form.payment_method = 'bank_transfer'"
                        class="p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold cursor-pointer"
                        :class="form.payment_method === 'bank_transfer' ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-bold ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 text-gray-700'"
                    >
                        <Landmark class="w-4 h-4 shrink-0 text-indigo-600" />
                        <div>
                            <p class="leading-tight">Transfer Bank</p>
                            <p class="text-[10px] text-gray-500 font-normal">Rekening giro / tabungan</p>
                        </div>
                    </button>

                    <button
                        type="button"
                        @click="form.payment_method = 'cash'"
                        class="p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold cursor-pointer"
                        :class="form.payment_method === 'cash' ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-bold ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 text-gray-700'"
                    >
                        <Wallet class="w-4 h-4 shrink-0 text-emerald-600" />
                        <div>
                            <p class="leading-tight">Tunai / Kas Kecil</p>
                            <p class="text-[10px] text-gray-500 font-normal">Petty cash pembelian</p>
                        </div>
                    </button>

                    <button
                        type="button"
                        @click="form.payment_method = 'corporate_card'"
                        class="p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold cursor-pointer"
                        :class="form.payment_method === 'corporate_card' ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-bold ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 text-gray-700'"
                    >
                        <CreditCard class="w-4 h-4 shrink-0 text-purple-600" />
                        <div>
                            <p class="leading-tight">Kartu Perusahaan</p>
                            <p class="text-[10px] text-gray-500 font-normal">Corporate card / Debit</p>
                        </div>
                    </button>
                </div>
            </div>

            <!-- Tipe Penerima & Nama Penerima -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1.5">
                        Kategori Penerima Dana
                    </label>
                    <select
                        v-model="form.recipient_type"
                        class="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    >
                        <option value="marketplace_merchant">Merchant / Toko Online</option>
                        <option value="supplier">Vendor / Rekanan Resmi</option>
                        <option value="employee_reimbursement">Reimbursement Karyawan</option>
                        <option value="other">Pihak Ketiga Lainnya</option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1.5">
                        Nama Penerima Dana
                    </label>
                    <input
                        type="text"
                        v-model="form.recipient_name"
                        placeholder="Contoh: PT Sumber Mesin atau Toko Jaya Elektronik"
                        class="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                </div>
            </div>

            <!-- Detail Rekening (Hidden if Cash) -->
            <div v-if="form.payment_method !== 'cash'" class="space-y-4 pt-2 border-t border-gray-100">
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="block text-xs font-bold text-gray-700">
                            Nama Bank / Provider VA <span class="text-rose-500">*</span>
                        </label>
                        <span class="text-[11px] text-gray-400">Pilih cepat:</span>
                    </div>
                    <input
                        type="text"
                        v-model="form.bank_name"
                        placeholder="Contoh: BCA Virtual Account, Bank Mandiri, BRI"
                        class="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                    <!-- Quick Chips -->
                    <div class="flex flex-wrap gap-1.5 mt-2">
                        <button
                            v-for="b in popularBanks"
                            :key="b"
                            type="button"
                            @click="form.bank_name = b"
                            class="px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer"
                            :class="form.bank_name === b ? 'bg-blue-600 text-white border-blue-600 font-semibold' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'"
                        >
                            {{ b }}
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1.5">
                            Nomor Rekening / No. Virtual Account <span class="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            v-model="form.bank_account_number"
                            placeholder="Contoh: 880123456789 atau 142001122334"
                            class="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1.5">
                            Nama Pemilik Rekening (Atas Nama)
                        </label>
                        <input
                            type="text"
                            v-model="form.bank_account_holder"
                            placeholder="Contoh: Tokopedia - PT Toko Komputer"
                            class="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
