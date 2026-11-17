export function supplierQuotationProgress(quotation) {
    const orders = quotation.purchase_orders || []
    if (orders.length) return {
        label: 'PO sudah diterbitkan',
        message: orders.some(order => order.status === 'issued')
            ? 'Buka Pesanan Pembelian (PO) di akun supplier untuk memeriksa dan mengonfirmasi pesanan.'
            : 'Lanjutkan proses pesanan sesuai status dan jadwal pada PO di akun supplier.',
    }
    if (['awarded', 'partially_awarded'].includes(quotation.evaluation_status)) return {
        label: 'Alokasi pembelian ditetapkan',
        message: 'Lihat jumlah terpilih per barang di bawah. Tunggu PO resmi dari pembeli sebelum menyiapkan pengiriman; alokasi ini belum merupakan pesanan pembelian.',
    }
    if (quotation.evaluation_status === 'rejected') return {
        label: 'Penawaran tidak terpilih',
        message: 'Penawaran Anda tidak mendapat alokasi pembelian pada hasil evaluasi saat ini. Hubungi pembeli jika membutuhkan penjelasan.',
    }
    if (quotation.review_status === 'rejected') return {
        label: 'Penawaran belum dapat dilanjutkan',
        message: 'Hubungi pembeli untuk penjelasan pemeriksaan penawaran Anda.',
    }
    return {
        label: 'Menunggu hasil evaluasi',
        message: 'Penawaran Anda sudah diterima. Pembeli akan mengevaluasi penawaran dan menetapkan alokasi pembelian. Tidak ada tindakan tambahan saat ini; revisi hanya tersedia jika diminta pembeli.',
    }
}

export function supplierReceiptItems(quotation, rfqItems = []) {
    return (quotation.items || []).map(item => {
        const source = rfqItems.find(rfqItem => String(rfqItem.id) === String(item.rfq_item_id)) || {}
        return {
            ...item,
            item_name: item.item_name || source.item_name || item.item_description?.trim() || 'Item Pengadaan',
            unit_name: item.unit_code || item.unit_name || source.unit_code || source.unit_name || '',
            item_specifications: item.item_specifications || source.item_specifications,
        }
    })
}
