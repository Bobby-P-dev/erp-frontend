export const isInitialNeed = rfq => rfq?.source_type === 'initial_need'

export const rfqSourceLabel = rfq => rfq?.source_type_label || (isInitialNeed(rfq) ? 'Kebutuhan awal' : 'Rencana pengadaan')

export const rfqPurchaseBlockReason = rfq => {
    if (rfq?.purchase_blocked_reason) return rfq.purchase_blocked_reason
    if (rfq?.requires_pr_link || isInitialNeed(rfq)) {
        return 'Penawaran dapat dibandingkan. Penetapan pemenang dan pembuatan PO menunggu PR yang sudah disetujui.'
    }
    return null
}

export const newInitialNeedItem = () => ({
    item_mode: 'custom', item_id: null, item_code: '', unit_label: '',
    item_name: '', item_specifications: '', unit_id: '', target_quantity: '1',
    target_price: '', required_delivery_date: '', notes: '', is_selected: true,
})

// Infer the mode of historical rows without changing their saved snapshot.
export const initialNeedItemMode = item => item.item_mode || (item.item_id ? 'catalog' : 'custom')

export function changeInitialNeedItemMode(item, mode) {
    if (initialNeedItemMode(item) === mode) return
    Object.assign(item, { item_mode: mode, item_id: null, item_code: '', item_name: '', unit_id: '', unit_label: '', unit: null })
}

export function applyRfqCatalogItem(item, catalogItem) {
    Object.assign(item, {
        item_mode: 'catalog', item_id: catalogItem.id, item_code: catalogItem.code || '',
        item_name: catalogItem.name, unit_id: catalogItem.unit_id,
        unit_label: catalogItem.unit?.code || catalogItem.unit?.name || '',
    })
}

export function buildRfqDraftPayload(form, items, suppliers, additionalPlanIds = []) {
    const fromPlan = !isInitialNeed(form)
    return {
        source_type: form.source_type,
        ...(fromPlan ? {
            procurement_plan_id: Number(form.procurement_plan_id),
            additional_procurement_plan_ids: additionalPlanIds.map(Number),
        } : {}),
        title: form.title.trim(),
        issue_date: form.issue_date,
        deadline_date: form.deadline_date,
        delivery_address: form.delivery_address || null,
        payment_terms_requested: form.payment_terms_requested || null,
        notes: form.notes || null,
        items: items.map(item => ({
            ...(fromPlan ? { procurement_plan_item_id: item.procurement_plan_item_id } : {}),
            item_id: !fromPlan && initialNeedItemMode(item) === 'custom' ? null : (item.item_id || null),
            item_name: item.item_name?.trim() || null,
            item_specifications: item.item_specifications || null,
            unit_id: item.unit_id ? Number(item.unit_id) : null,
            target_quantity: String(item.target_quantity),
            target_price: item.target_price === '' || item.target_price == null ? null : String(item.target_price),
            required_delivery_date: item.required_delivery_date || null,
            notes: item.notes || null,
        })),
        suppliers: suppliers.map(supplier => ({
            supplier_id: supplier.id,
            contact_person: supplier.contact_person || supplier.contacts?.[0]?.name || null,
            email: supplier.email || supplier.contacts?.[0]?.email || null,
            phone: supplier.phone || supplier.contacts?.[0]?.phone || null,
        })),
    }
}

export function validateRfqDraft(form, items, suppliers, publish = false) {
    const errors = {}
    if (!isInitialNeed(form) && !form.procurement_plan_id) errors.procurement_plan_id = ['Pilih rencana pengadaan.']
    if (!form.title?.trim()) errors.title = ['Judul tender wajib diisi.']
    if (!form.deadline_date) errors.deadline_date = ['Batas penawaran wajib diisi.']
    if (!items.length) errors.items = ['Tambahkan atau pilih minimal satu barang.']
    items.forEach((item, index) => {
        const key = `items.${index}`
        if (isInitialNeed(form) && initialNeedItemMode(item) === 'catalog' && !item.item_id) errors[`${key}.item_id`] = ['Pilih barang dari katalog atau gunakan Barang custom.']
        if (isInitialNeed(form) && !item.item_id && !item.item_name?.trim()) errors[`${key}.item_name`] = ['Nama barang wajib diisi.']
        if (isInitialNeed(form) && !item.unit_id) errors[`${key}.unit_id`] = ['Pilih satuan barang.']
        if (!/^\d{1,14}(?:\.\d{1,4})?$/.test(String(item.target_quantity)) || Number(item.target_quantity) <= 0) {
            errors[`${key}.target_quantity`] = ['Jumlah harus lebih dari 0, maksimal 4 angka desimal (gunakan titik).']
        } else if (!isInitialNeed(form) && Number(item.target_quantity) > Number(item.remaining_quantity)) {
            errors[`${key}.target_quantity`] = [`Jumlah melebihi sisa kuota ${item.remaining_quantity}.`]
        }
        if (item.target_price !== '' && item.target_price != null && !/^\d{1,16}(?:\.\d{1,2})?$/.test(String(item.target_price))) {
            errors[`${key}.target_price`] = ['Estimasi harga harus nol atau lebih, maksimal 2 angka desimal.']
        }
    })
    if (publish && !suppliers.length) errors.suppliers = ['Pilih minimal satu supplier sebelum publikasi.']
    return errors
}
