<script setup>
import ReviewDisclosure from '../../../ui/ReviewDisclosure.vue'
defineProps({
    form: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) }
})
</script>

<template>
    <section class="rfq-form-section" aria-labelledby="rfq-terms-heading">
        <div class="rfq-section-heading">
            <div>
                <h2 id="rfq-terms-heading">2. Informasi tender</h2>
                <p>Informasi ini menjadi acuan supplier saat menyiapkan penawaran.</p>
            </div>
        </div>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div class="sm:col-span-2">
                <label for="rfq-title" class="rfq-field-label"
                    >Judul tender <span class="text-rose-500">*</span></label
                ><input
                    class="rfq-input"
                    id="rfq-title"
                    v-model="form.title"
                    type="text"
                    maxlength="255"
                    :aria-invalid="!!errors.title"
                    placeholder="Contoh: Pengadaan material produksi November"
                />
                <p v-if="errors.title" class="mt-2 text-sm text-rose-700">{{ errors.title[0] }}</p>
            </div>
            <div>
                <label for="rfq-issue-date" class="rfq-field-label">Tanggal penerbitan</label
                ><input class="rfq-input" id="rfq-issue-date" v-model="form.issue_date" type="date" />
            </div>
            <div>
                <label for="rfq-deadline" class="rfq-field-label"
                    >Batas akhir penawaran <span class="text-rose-500">*</span></label
                ><input class="rfq-input" id="rfq-deadline" v-model="form.deadline_date" type="date" />
                <p v-if="errors.deadline_date" class="mt-2 text-sm text-rose-700">{{ errors.deadline_date[0] }}</p>
                <p class="mt-1.5 text-xs text-slate-500">
                    Berlaku sampai akhir hari pada tanggal ini, dalam WIB.
                </p>
            </div>
        </div>
        <ReviewDisclosure
            title="Pengiriman, pembayaran & catatan"
            :description="[form.delivery_address && 'Alamat diisi', form.payment_terms_requested && 'Pembayaran diisi', form.notes && 'Catatan diisi'].filter(Boolean).join(' · ') || 'Opsional · lengkapi jika ada persyaratan khusus'"
        >
            <div class="grid gap-5 sm:grid-cols-2">
            <div>
                <label for="rfq-address" class="rfq-field-label">Alamat pengiriman</label
                ><textarea
                    id="rfq-address"
                    v-model="form.delivery_address"
                    rows="2"
                    placeholder="Lokasi tujuan pengiriman barang"
                />
            </div>
            <div>
                <label for="rfq-payment-terms" class="rfq-field-label">Syarat pembayaran</label
                ><input
                    class="rfq-input"
                    id="rfq-payment-terms"
                    v-model="form.payment_terms_requested"
                    type="text"
                    placeholder="Contoh: Tempo 60 hari"
                />
            </div>
            <div class="sm:col-span-2">
            <label for="rfq-notes" class="rfq-field-label">Catatan tender</label
            ><textarea
                id="rfq-notes"
                v-model="form.notes"
                rows="3"
                placeholder="Contoh: Sertifikat material, garansi, atau persyaratan pengiriman"
            />
            </div>
            </div>
        </ReviewDisclosure>
    </section>
</template>
