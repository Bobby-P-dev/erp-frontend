<script setup>
import { formatRfqTimestamp } from '../../../utils/rfqTimestamp.js'
defineProps({ decisions: { type: Array, default: () => [] } })
const technicalLabel = status => ({ compliant: 'Sesuai spesifikasi', deviation: 'Ada penyimpangan', not_verified: 'Belum diverifikasi' }[status] || 'Belum diverifikasi')
</script>

<template>
    <section class="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 class="text-sm font-bold text-slate-900">Dasar pemilihan dan riwayat keputusan</h2>
        <p class="text-xs text-slate-600">Harga satuan dan total quotation memiliki dasar perbandingan berbeda. Bukti di bawah merupakan catatan pemeriksaan buyer; data kosong berarti belum tersedia.</p>
        <p v-if="!decisions.length" class="text-xs text-slate-600">Belum ada riwayat keputusan terstruktur. Award lama tidak dianggap sudah dievaluasi.</p>
        <details v-for="decision in decisions" :key="decision.id" class="rounded-lg border border-slate-200 p-3 text-xs">
            <summary class="cursor-pointer font-semibold">
                {{ decision.snapshot.quotation_number }} — {{ decision.snapshot.item_description }} —
                {{ decision.action === 'selected' ? 'Dipilih' : 'Diganti' }} — versi {{ decision.review_version }}
            </summary>
            <div class="mt-3 grid gap-2 md:grid-cols-2">
                <p>Pelaku: user #{{ decision.decided_by }} · {{ formatRfqTimestamp(decision.decided_at) }}</p>
                <p>Teknis: {{ technicalLabel(decision.evaluation.technical_compliance) }}</p>
                <p>Spesifikasi kebutuhan: {{ decision.snapshot.item_specifications || 'Belum tersedia' }}</p>
                <p>Catatan teknis: {{ decision.evaluation.technical_notes || 'Belum tersedia' }}</p>
                <p>Catatan komersial: {{ decision.evaluation.commercial_notes || 'Belum tersedia' }}</p>
                <p>Pembayaran: {{ decision.snapshot.payment_terms || 'Belum tersedia' }}</p>
                <p>Waktu kirim: {{ decision.snapshot.lead_time_days == null ? 'Belum tersedia' : `${decision.snapshot.lead_time_days} hari` }}</p>
                <p>Garansi: {{ decision.evaluation.warranty_terms || 'Belum tersedia' }}</p>
                <p>Referensi bukti: {{ decision.evaluation.evidence_reference || 'Belum tersedia' }}</p>
                <p>Alasan pemilihan: {{ decision.evaluation.selection_reason }}</p>
            </div>
        </details>
    </section>
</template>
