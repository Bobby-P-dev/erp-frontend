<script setup>

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
    { id: 'marketplace_va', label: 'Virtual Account' },
    { id: 'bank_transfer', label: 'Transfer Bank' },
    { id: 'cash', label: 'Tunai / Kas Kecil' },
    { id: 'corporate_card', label: 'Kartu Perusahaan' },
]
</script>

<template>
    <div class="dp-section bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-6">
        <div class="pb-3 border-b border-slate-100">
            <h3 class="text-sm font-bold text-slate-900">Tujuan pembayaran</h3>
            <p class="text-xs text-slate-500 mt-2">Lengkapi sebelum mengajukan pembayaran. Untuk draft, detail rekening dapat diisi nanti.</p>
        </div>

        <div class="space-y-3.5">
            <!-- Metode Pembayaran Selector -->
            <fieldset class="payment-methods">
                <legend class="sr-only">Metode pembayaran</legend>
                <label
                    v-for="m in methods"
                    :key="m.id"
                    class="p-4 rounded-xl border text-left flex items-center gap-3 transition-all text-sm cursor-pointer"
                    :class="form.payment_method === m.id
                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold ring-1 ring-blue-500/30'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 font-medium'"
                >
                    <input type="radio" name="payment-method" :value="m.id" v-model="form.payment_method" class="size-4 shrink-0 accent-[#014BAA]" />
                    <div class="min-w-0">
                        <span class="block leading-relaxed">{{ m.label }}</span>
                    </div>
                </label>
            </fieldset>

            <!-- Tipe Penerima & Nama Penerima -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">
                        Kategori Penerima
                    </label>
                    <select
                        v-model="form.recipient_type"
                        aria-label="Kategori penerima"
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
                        aria-label="Nama penerima dana"
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
                        aria-label="Bank atau provider VA"
                        placeholder="BCA Virtual Account, Bank Mandiri..."
                        class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                            No. Rekening / VA <span class="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            v-model="form.bank_account_number"
                            aria-label="Nomor rekening atau VA"
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
                            aria-label="Atas nama rekening"
                            placeholder="Tokopedia - Nama Toko"
                            class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.payment-methods { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; }
</style>
