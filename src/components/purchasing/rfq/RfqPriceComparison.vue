<script setup>
import RfqOfferDetails from './RfqOfferDetails.vue'
import RfqSupplierCostCard from './RfqSupplierCostCard.vue'
import ReviewDisclosure from '../../ui/ReviewDisclosure.vue'
import { Coins, ChevronDown } from '@lucide/vue'
import { formatCurrency } from '../../../composables/useFormatter.js'
import { isLowestUnitPrice, isLowestTotalCost, totalCostExclusionText } from '../../../utils/rfqComparison.js'
import {
    quotationValidityLabel,
    canAwardQuotation
} from '../../../utils/quotationValidity.js'
import { quotationReviewLabel } from '../../../utils/quotationReview.js'

const props = defineProps({
    suppliers: { type: Array, required: true },
    priceDifference: { type: Function, required: true },
    items: { type: Array, required: true },
    currency: { type: String, default: 'IDR' },
    targetCurrency: { type: String, default: 'IDR' }
})
const costRows = [
    { key: 'base_subtotal', label: 'Total harga barang' },
    { key: 'base_tax_amount', label: 'Pajak' },
    { key: 'base_shipping_cost', label: 'Ongkir' },
    { key: 'base_total_amount', label: 'Total penawaran' }
]
const money = (value) => formatCurrency(value, props.currency)
const offerFor = (item, supplier) => item.vendor_offers?.[supplier.quotation_id]
const quantity = (value) => Number(value || 0).toLocaleString('id-ID')
</script>

<template>
    <div class="space-y-6">
        <section class="comparison-panel desktop-comparison" aria-labelledby="price-matrix-heading">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 id="price-matrix-heading" class="text-lg font-semibold text-slate-900">
                        Perbandingan harga supplier
                    </h2>
                    <p class="mt-2 text-sm text-slate-600">
                        Bandingkan dari kiri ke kanan. Harga dalam {{ currency }}, sebelum pajak dan ongkir.
                    </p>
                </div>
                <p id="matrix-scroll-help" class="text-sm text-slate-500">
                    Geser tabel untuk melihat supplier lainnya →
                </p>
            </div>
            <div
                class="matrix-scroll mt-5"
                tabindex="0"
                role="region"
                aria-label="Matriks harga supplier"
                aria-describedby="matrix-scroll-help"
            >
                <table class="price-matrix" :style="{ minWidth: `${280 + suppliers.length * 280}px` }">
                    <caption class="sr-only">
                        Perbandingan penawaran per barang. Barang pada baris dan supplier pada kolom. Total
                        penawaran termasuk pajak dan ongkir ada di bagian bawah.
                    </caption>
                    <colgroup>
                        <col style="width: 280px" />
                        <col
                            v-for="supplier in suppliers"
                            :key="supplier.quotation_id"
                            style="width: 280px"
                        />
                    </colgroup>
                    <thead>
                        <tr>
                            <th scope="col" class="item-column">
                                <span class="text-base font-semibold text-slate-900">Barang & kebutuhan</span>
                                <p class="mt-2 font-normal text-slate-500">
                                    {{ items.length }} barang · {{ suppliers.length }} supplier
                                </p>
                            </th>
                            <th v-for="supplier in suppliers" :key="supplier.quotation_id" scope="col">
                                <p class="text-base font-semibold text-slate-900">
                                    {{ supplier.supplier_name }}
                                </p>
                                <p class="mt-1 font-normal text-slate-500">
                                    {{
                                        supplier.vendor_quotation_reference ||
                                        supplier.quotation_number ||
                                        'Nomor belum tersedia'
                                    }}
                                </p>
                                <p
                                    class="mt-3 font-medium"
                                    :class="canAwardQuotation(supplier) ? 'text-slate-600' : 'text-amber-900'"
                                >
                                    {{ quotationValidityLabel(supplier) }}
                                </p>
                                <p class="mt-1 font-normal text-slate-600">
                                    {{ quotationReviewLabel(supplier) }}
                                </p>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in items" :key="item.rfq_item_id">
                            <th scope="row" class="item-column">
                                <p class="text-base font-semibold text-slate-900">{{ item.item_name }}</p>
                                <p class="mt-2 font-normal text-slate-600">
                                    Kebutuhan:
                                    <strong class="font-medium text-slate-900"
                                        >{{ quantity(item.target_quantity) }}
                                        {{ item.unit_name || 'Unit' }}</strong
                                    >
                                </p>
                                <p class="mt-3 font-normal text-slate-500">
                                    HPS / {{ item.unit_name || 'Unit' }}
                                </p>
                                <p class="mt-1 font-medium text-slate-900">
                                    {{
                                        item.target_price != null
                                            ? formatCurrency(item.target_price, targetCurrency)
                                            : 'Belum ditentukan'
                                    }}
                                </p>
                                <details
                                    v-if="item.item_specifications || item.item_code"
                                    class="mt-4 font-normal text-slate-600"
                                >
                                    <summary class="cursor-pointer font-medium text-[#014BAA]">
                                        Spesifikasi kebutuhan
                                    </summary>
                                    <p class="mt-3 whitespace-pre-line break-words">
                                        {{ item.item_code }}<br v-if="item.item_code" />{{
                                            item.item_specifications
                                        }}
                                    </p>
                                </details>
                            </th>
                            <td
                                v-for="supplier in suppliers"
                                :key="supplier.quotation_id"
                                :class="{ 'selected-offer': offerFor(item, supplier)?.is_awarded }"
                            >
                                <template v-if="offerFor(item, supplier)?.quoted">
                                    <div class="flex flex-wrap items-baseline justify-between gap-2">
                                        <p class="text-lg font-semibold tabular-nums text-slate-900">
                                            {{ money(offerFor(item, supplier).base_unit_price) }}
                                        </p>
                                        <span class="text-slate-500">/ {{ item.unit_name || 'Unit' }}</span>
                                    </div>
                                    <p class="mt-2 min-h-6 text-emerald-800">
                                        <span v-if="isLowestUnitPrice(offerFor(item, supplier))">
                                            Satuan terendah
                                        </span>
                                    </p>
                                    <dl class="mt-4 space-y-2 text-slate-600">
                                        <div class="flex flex-wrap justify-between gap-2">
                                            <dt>Jumlah ditawarkan</dt>
                                            <dd class="tabular-nums text-slate-900">
                                                {{ quantity(offerFor(item, supplier).offered_quantity) }}
                                                {{ item.unit_name || 'Unit' }}
                                            </dd>
                                        </div>
                                        <div class="flex flex-wrap justify-between gap-2">
                                            <dt>Subtotal barang</dt>
                                            <dd class="font-medium tabular-nums text-slate-900">
                                                {{ money(offerFor(item, supplier).base_subtotal) }}
                                            </dd>
                                        </div>
                                    </dl>
                                    <p
                                        v-if="
                                            Number(offerFor(item, supplier).offered_quantity) !==
                                            Number(item.target_quantity)
                                        "
                                        class="mt-3 text-amber-900"
                                    >
                                        Jumlah berbeda dari kebutuhan
                                    </p>
                                    <p
                                        v-if="offerFor(item, supplier).is_awarded"
                                        class="mt-3 font-medium text-emerald-800"
                                    >
                                        ✓ Terpilih · {{ quantity(offerFor(item, supplier).awarded_quantity) }}
                                        {{ item.unit_name }}
                                    </p>
                                    <p
                                        v-if="offerFor(item, supplier).purchase_order_id"
                                        class="mt-2 text-slate-600"
                                    >
                                        Terkunci pada
                                        {{ offerFor(item, supplier).purchase_order_number || 'PO' }}
                                    </p>
                                    <RfqOfferDetails
                                        :offer="offerFor(item, supplier)"
                                        :currency="supplier.currency"
                                        :price-difference="priceDifference(item, offerFor(item, supplier))"
                                    />
                                </template>
                                <p v-else class="text-slate-500">Tidak menawarkan barang ini</p>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr
                            v-for="row in costRows"
                            :key="row.key"
                            :class="{ 'total-row': row.key === 'base_total_amount' }"
                        >
                            <th scope="row" class="item-column">
                                {{ row.label }}
                                <p
                                    v-if="row.key === 'base_total_amount'"
                                    class="mt-1 font-normal text-slate-500"
                                >
                                    Termasuk pajak & ongkir
                                </p>
                            </th>
                            <td v-for="supplier in suppliers" :key="supplier.quotation_id">
                                <p
                                    class="tabular-nums"
                                    :class="
                                        row.key === 'base_total_amount'
                                            ? 'text-lg font-semibold text-slate-900'
                                            : 'text-slate-700'
                                    "
                                >
                                    {{ money(supplier[row.key]) }}
                                </p>
                                <template v-if="row.key === 'base_total_amount'">
                                    <p v-if="isLowestTotalCost(supplier)" class="mt-2 text-emerald-800">
                                        Total terendah · cakupan setara
                                    </p>
                                    <p
                                        v-else-if="totalCostExclusionText(supplier)"
                                        class="mt-2 text-slate-600"
                                    >
                                        Total tidak diranking: {{ totalCostExclusionText(supplier) }}
                                    </p>
                                </template>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p class="mt-4 text-sm text-slate-600">
                Harga terendah bukan penetapan pemenang. Ranking total hanya untuk penawaran dengan barang dan
                jumlah setara; bukan total gabungan beberapa pemenang.
            </p>
        </section>

        <div class="mobile-comparison">
            <h2 class="text-lg font-semibold text-slate-900">Bandingkan per barang</h2>
            <p class="mt-2 text-sm text-slate-600">
                Periksa harga satuan, jumlah yang ditawarkan, lalu subtotalnya. Buka rincian untuk spesifikasi
                dan catatan supplier.
            </p>
        </div>
        <section
            v-for="(item, index) in items"
            :key="item.rfq_item_id"
            class="comparison-panel mobile-comparison"
            :aria-labelledby="`comparison-item-${item.rfq_item_id}`"
        >
            <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div class="min-w-0">
                    <p class="text-sm text-slate-500">Barang {{ index + 1 }}</p>
                    <h3
                        :id="`comparison-item-${item.rfq_item_id}`"
                        class="mt-1 break-words text-base font-semibold text-slate-900"
                    >
                        {{ item.item_name }}
                    </h3>
                    <p class="mt-2 text-sm text-slate-600">
                        Kebutuhan:
                        <strong class="font-medium text-slate-900"
                            >{{ quantity(item.target_quantity) }} {{ item.unit_name || 'Unit' }}</strong
                        >
                    </p>
                </div>
                <p class="text-sm text-slate-600 sm:text-right">
                    Perkiraan harga (HPS)<span class="mt-1 block font-medium text-slate-900"
                        >{{
                            item.target_price != null
                                ? formatCurrency(item.target_price, targetCurrency)
                                : 'Belum ditentukan'
                        }}<template v-if="item.target_price != null">
                            / {{ item.unit_name || 'Unit' }}</template
                        ></span
                    >
                </p>
            </div>
            <details v-if="item.item_specifications || item.item_code" class="mt-4 text-sm text-slate-600">
                <summary class="cursor-pointer font-medium text-[#014BAA]">Spesifikasi kebutuhan</summary>
                <p class="mt-2 whitespace-pre-line break-words">
                    {{ item.item_code }}<br v-if="item.item_code" />{{ item.item_specifications }}
                </p>
            </details>
            <table class="offer-table mt-5 w-full text-left text-sm">
                <thead>
                    <tr>
                        <th scope="col">Supplier</th>
                        <th scope="col">Harga / {{ item.unit_name || 'Unit' }}</th>
                        <th scope="col">Jumlah ditawarkan</th>
                        <th scope="col">Subtotal barang</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="supplier in suppliers"
                        :key="supplier.quotation_id"
                        :class="{ 'bg-emerald-50/50': offerFor(item, supplier)?.is_awarded }"
                    >
                        <td data-label="Supplier">
                            <p class="font-medium text-slate-900">{{ supplier.supplier_name }}</p>
                            <p v-if="offerFor(item, supplier)?.is_awarded" class="mt-2 text-emerald-800">
                                ✓ Terpilih · {{ quantity(offerFor(item, supplier).awarded_quantity) }}
                                {{ item.unit_name }}
                            </p>
                            <p v-if="offerFor(item, supplier)?.purchase_order_id" class="mt-2 text-slate-600">
                                Terkunci pada {{ offerFor(item, supplier).purchase_order_number || 'PO' }}
                            </p>
                            <RfqOfferDetails
                                v-if="offerFor(item, supplier)?.quoted"
                                :offer="offerFor(item, supplier)"
                                :currency="supplier.currency"
                                :price-difference="priceDifference(item, offerFor(item, supplier))"
                            />
                            <p v-else class="mt-2 text-slate-500">Tidak menawarkan barang ini</p>
                        </td>
                        <td data-label="Harga satuan" class="tabular-nums">
                            <span class="font-semibold text-slate-900">{{
                                offerFor(item, supplier)?.quoted
                                    ? money(offerFor(item, supplier).base_unit_price)
                                    : '—'
                            }}</span
                            ><span
                                v-if="isLowestUnitPrice(offerFor(item, supplier))"
                                class="mt-2 block text-sm text-emerald-800"
                                >Satuan terendah</span
                            >
                        </td>
                        <td data-label="Jumlah ditawarkan" class="tabular-nums">
                            {{
                                offerFor(item, supplier)?.quoted
                                    ? `${quantity(offerFor(item, supplier).offered_quantity)} ${item.unit_name || 'Unit'}`
                                    : '—'
                            }}
                            <p
                                v-if="
                                    offerFor(item, supplier)?.quoted &&
                                    Number(offerFor(item, supplier).offered_quantity) !==
                                        Number(item.target_quantity)
                                "
                                class="mt-2 text-amber-900"
                            >
                                Berbeda dari kebutuhan
                            </p>
                        </td>
                        <td data-label="Subtotal barang" class="tabular-nums font-semibold text-slate-900">
                            {{
                                offerFor(item, supplier)?.quoted
                                    ? money(offerFor(item, supplier).base_subtotal)
                                    : '—'
                            }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
        <details class="comparison-panel supplier-cost-section">
            <summary class="cost-section-toggle flex cursor-pointer items-center gap-3 rounded-xl text-slate-900">
                <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#014BAA]"><Coins class="size-5" aria-hidden="true" /></span>
                <span class="min-w-0 flex-1"><span class="block text-base font-semibold">Biaya & ketentuan supplier</span><span class="mt-1 block text-sm font-normal text-slate-500">Bandingkan total biaya, pembayaran & pengiriman.</span></span>
                <ChevronDown class="cost-section-chevron size-5 shrink-0 text-slate-400" aria-hidden="true" />
            </summary>
            <div class="mt-5">
                <h2 id="quotation-totals-heading" class="text-lg font-semibold text-slate-900">
                    Total penawaran supplier
                </h2>
                <p class="mt-2 text-sm text-slate-600">
                    Termasuk pajak dan ongkir, dalam {{ currency }}. Harga terendah menjadi bahan
                    pertimbangan; pemenang tetap dipilih setelah evaluasi.
                </p>
                <div
                    class="mt-5 grid gap-5 lg:grid-cols-2"
                    :class="{ 'xl:grid-cols-3': suppliers.length >= 3 }"
                >
                    <RfqSupplierCostCard v-for="supplier in suppliers" :key="supplier.quotation_id" :supplier="supplier" :currency="currency" />
                </div>
                <ReviewDisclosure class="cost-reading-help mt-5" title="Cara membaca perbandingan" description="Pahami cakupan total, pajak dan pemilihan pemenang">
                    <p class="text-sm leading-relaxed text-slate-600">
                        Harga satuan belum termasuk pajak dan ongkir. Total penawaran hanya diranking
                        jika seluruh barang dan jumlahnya sama dengan kebutuhan RFQ. Total supplier tidak
                        menentukan biaya akhir gabungan beberapa pemenang. Nilai “—” berarti data tidak
                        tersedia.
                    </p>
                </ReviewDisclosure>
            </div>
        </details>
        <p v-if="!items.length" class="comparison-panel text-sm text-slate-600">
            Belum ada barang untuk dibandingkan.
        </p>
    </div>
</template>

<style scoped>
.cost-section-toggle { list-style: none; padding: 4px; transition: background-color 160ms ease; }
.cost-section-toggle::-webkit-details-marker { display: none; }
.cost-section-toggle:hover { background: #f8faff; }
.cost-section-toggle:focus-visible { outline: 2px solid #014baa; outline-offset: 4px; }
.cost-section-chevron { transition: transform 180ms ease; }
.supplier-cost-section[open] > summary .cost-section-chevron { transform: rotate(180deg); }
.cost-reading-help :deep(summary) { border-radius: 12px; }
.cost-reading-help :deep(summary:hover) { background: #f8faff; }
@media (prefers-reduced-motion: reduce) { .cost-section-toggle, .cost-section-chevron { transition: none; } }

.mobile-comparison {
    display: none;
}
.matrix-scroll {
    max-width: 100%;
    overflow-x: auto;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    scrollbar-color: #94a3b8 #f1f5f9;
}
.price-matrix {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
    text-align: left;
    font-size: 14px;
    line-height: 1.6;
}
.price-matrix th,
.price-matrix td {
    padding: 20px;
    vertical-align: top;
    overflow-wrap: anywhere;
    border-right: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
}
.price-matrix th:last-child,
.price-matrix td:last-child {
    border-right: 0;
}
.price-matrix thead th {
    background: #f8fafc;
}
.price-matrix .item-column {
    position: sticky;
    left: 0;
    z-index: 1;
    background: white;
    box-shadow: 1px 0 #e2e8f0;
}
.price-matrix thead .item-column {
    background: #f8fafc;
    z-index: 2;
}
.price-matrix .selected-offer {
    background: #f0fdf4;
}
.price-matrix tfoot th,
.price-matrix tfoot td {
    padding: 14px 20px;
}
.price-matrix .total-row th,
.price-matrix .total-row td {
    background: #f8fafc;
    border-bottom: 0;
}
@media (max-width: 767px) {
    .desktop-comparison {
        display: none;
    }
    .mobile-comparison {
        display: block;
    }
}

.offer-table {
    table-layout: fixed;
    border-collapse: collapse;
}
.offer-table th {
    padding: 14px 16px;
    background: #f8fafc;
    color: #475569;
    font-weight: 500;
}
.offer-table td {
    padding: 20px 16px;
    vertical-align: top;
    overflow-wrap: anywhere;
    border-bottom: 1px solid #f1f5f9;
}
.offer-table th:first-child {
    width: 37%;
}
.offer-table td:not(:first-child),
.offer-table th:not(:first-child) {
    text-align: right;
}
@media (max-width: 767px) {
    .offer-table,
    .offer-table tbody,
    .offer-table tr,
    .offer-table td {
        display: block;
        width: 100%;
    }
    .offer-table thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
    }
    .offer-table tr {
        padding: 12px 0;
        border-top: 1px solid #e2e8f0;
    }
    .offer-table td {
        padding: 10px 12px;
        border: 0;
    }
    .offer-table td:not(:first-child) {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: baseline;
        gap: 8px;
        text-align: left;
    }
    .offer-table td:not(:first-child)::before {
        content: attr(data-label);
        color: #64748b;
        font-weight: 400;
    }
    .offer-table td p,
    .offer-table td span + span {
        flex-basis: 100%;
    }
}
</style>
