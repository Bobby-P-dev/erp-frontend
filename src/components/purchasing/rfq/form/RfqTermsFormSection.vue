<script setup>
defineProps({
    form: { type: Object, required: true }
})
</script>

<template>
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-sm">
                2
            </div>
            <div>
                <h3 class="text-base font-bold text-slate-900">Informasi Tender & Ketentuan Pengadaan</h3>
                <p class="text-xs text-slate-500">Atur judul paket tender, batas akhir penawaran (deadline), alamat pengiriman, dan syarat pembayaran (TOP).</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <!-- Title -->
            <div class="md:col-span-2">
                <label class="block font-bold text-slate-800 mb-1.5">
                    Judul Paket Tender <span class="text-rose-500">*</span>
                </label>
                <input
                    v-model="form.title"
                    type="text"
                    placeholder="Contoh: Tender Pengadaan Plat Baja SPCC & Baut Machining Q4"
                    class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all font-semibold"
                />
            </div>

            <!-- Issue Date & Deadline Date -->
            <div>
                <label class="block font-bold text-slate-800 mb-1.5">
                    Tanggal Penerbitan RFQ
                </label>
                <input
                    v-model="form.issue_date"
                    type="date"
                    class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all font-medium"
                />
            </div>

            <div>
                <label class="block font-bold text-slate-800 mb-1.5">
                    Batas Akhir Penawaran (Deadline) <span class="text-rose-500">*</span>
                </label>
                <input
                    v-model="form.deadline_date"
                    type="date"
                    class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all font-medium"
                />
            </div>

            <!-- Delivery Address -->
            <div>
                <label class="block font-bold text-slate-800 mb-1.5">
                    Alamat Pengiriman / Franco Gudang
                </label>
                <input
                    v-model="form.delivery_address"
                    type="text"
                    placeholder="Contoh: Kawasan Industri Bekasi Blok C-12, PT Padma Soode Indonesia"
                    class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all"
                />
            </div>

            <!-- Payment Terms -->
            <div>
                <label class="block font-bold text-slate-800 mb-1.5">
                    Syarat Pembayaran yang Diminta (TOP)
                </label>
                <input
                    v-model="form.payment_terms_requested"
                    type="text"
                    placeholder="Contoh: Tempo 60 Hari / SKBDN / Cash on Delivery"
                    class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all"
                />
            </div>

            <!-- Notes -->
            <div class="md:col-span-2">
                <label class="block font-bold text-slate-800 mb-1.5">
                    Catatan / Syarat Khusus Tender (Term of Reference)
                </label>
                <textarea
                    v-model="form.notes"
                    rows="2"
                    placeholder="Contoh: Wajib menyertakan Mill Certificate, toleransi ketebalan +/- 0.05mm, garansi 1 tahun..."
                    class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white transition-all resize-y"
                ></textarea>
            </div>
        </div>
    </div>
</template>
