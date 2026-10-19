import pdfMake from 'pdfmake/build/pdfmake.js'
import pdfFonts from 'pdfmake/build/vfs_fonts.js'
import { showLoading, showError, closeSwal } from '../swal.js'
import { toast } from 'vue-sonner'

// Initialize pdfMake virtual file system for fonts
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs
} else if (pdfFonts && pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs
} else if (pdfFonts) {
    pdfMake.vfs = pdfFonts
}

/**
 * Format date for PDF display (e.g. 09 Okt 2026).
 */
const formatDatePdf = (dateStr) => {
    if (!dateStr) return '-'
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return String(dateStr)
        return d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    } catch {
        return String(dateStr)
    }
}

/**
 * Format datetime with hours:minutes for PDF display.
 */
const formatDateTimePdf = (dateStr) => {
    if (!dateStr) return '-'
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return String(dateStr)
        return d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) + ' WIB'
    } catch {
        return String(dateStr)
    }
}

/**
 * Generate and download Berita Acara Serah Terima Barang (BAST / Goods Handover Note) PDF.
 * Supports both saved BAST records and pre-submission preview data for hardcopy printing before signing.
 *
 * @param {Object} handover - Handover data object
 * @param {Object} options - Additional options { currentUser, isPreview }
 */
export const generateGoodsHandoverPdf = async (handover, options = {}) => {
    if (!handover || !handover.items || handover.items.length === 0) {
        toast.warning('Data Barang Kosong', {
            description: 'Tidak ada daftar barang yang dipilih untuk dicetak pada lembar BAST.'
        })
        return false
    }

    showLoading('Menyiapkan Lembar BAST', 'Menyusun berkas Berita Acara Serah Terima Barang untuk dicetak...')

    try {
        const isPreview = options.isPreview || !handover.handover_number
        const docNumber = handover.handover_number || `BAST-PREVIEW-${new Date().getTime().toString().slice(-6)}`
        const companyName = handover.company?.name || handover.company_name || 'PT PADMA SOODE INDONESIA'
        const companyAddress = handover.company?.address || 'Kawasan Pergudangan & Logistik Operasional'
        const handoverDate = handover.handover_date || new Date().toISOString()
        const handedOverByName = handover.handed_over_by_user?.name || handover.handed_over_by_name || options.currentUser || 'Petugas Gudang'
        const recipientName = handover.recipient_name || handover.recipient_user?.name || '-'
        const recipientIdentity = handover.recipient_identity_number || handover.recipient_user?.employee?.nik || '-'
        const recipientDivision = handover.recipient_division_name || handover.recipient_user?.employee?.division?.name || '-'
        const notes = handover.notes || '-'
        const printTimestamp = formatDateTimePdf(new Date())
        const currentUser = options.currentUser || handedOverByName

        // Verification QR code content
        const origin = typeof window !== 'undefined' ? window?.location?.origin || '' : ''
        const verificationUrl = handover.id 
            ? `${origin}/inventory/goods-receipts?handover_number=${docNumber}` 
            : `BAST-VERIFY:${docNumber}:${recipientName}:${printTimestamp}`

        // Build item table rows
        let totalQty = 0
        const itemsRows = handover.items.map((it, idx) => {
            const prNum = it.pr_number || it.purchase_requisition?.pr_number || it.goods_receipt_item?.direct_purchase_item?.procurement_plan_item?.purchase_requisition_item?.purchase_requisition?.pr_number || '-'
            const grnNum = it.grn_number || it.goods_receipt?.grn_number || it.goods_receipt_item?.goods_receipt?.grn_number || '-'
            const itemName = it.item_description || it.goods_receipt_item?.item_description || it.item?.name || 'Barang Pengadaan'
            const qty = parseFloat(it.quantity_handed_over || it.quantity || 0)
            totalQty += qty
            const unit = it.unit_name || it.unit?.name || it.unit?.code || it.goods_receipt_item?.unit?.code || 'Unit'
            const requester = it.pr_requester || it.goods_receipt_item?.goods_receipt?.purchase_requisition?.requester?.name || '-'
            const itemNotes = it.notes ? `(${it.notes})` : ''
            const requesterInfo = itemNotes ? `${requester} ${itemNotes}` : requester

            return [
                { text: String(idx + 1), alignment: 'center', style: 'tableCell' },
                { text: prNum, style: 'tableCellBold' },
                { text: grnNum, style: 'tableCell' },
                { text: itemName, style: 'tableCell' },
                { text: Number.isInteger(qty) ? String(qty) : qty.toFixed(2), alignment: 'right', style: 'tableCellBold' },
                { text: unit, alignment: 'center', style: 'tableCell' },
                { text: requesterInfo, style: 'tableCellSmall' },
            ]
        })

        // Document Definition
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [36, 36, 36, 36],
            content: [
                // 1. KOP PERUSAHAAN & HEADER
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: companyName.toUpperCase(), style: 'companyName' },
                                { text: companyAddress, style: 'companySub' },
                                { text: 'Sistem Informasi Manajemen Logistik & Pergudangan Terpadu', style: 'companySub' }
                            ]
                        },
                        {
                            width: 'auto',
                            stack: [
                                { text: isPreview ? 'LEMBAR CETAK BAST (DRAFT)' : 'BERITA ACARA SERAH TERIMA', style: 'docBadge', alignment: 'right' },
                                { text: docNumber, style: 'docNumber', alignment: 'right' },
                                { text: `Tanggal: ${formatDatePdf(handoverDate)}`, style: 'docDate', alignment: 'right' }
                            ]
                        }
                    ]
                },
                // Divider line
                {
                    canvas: [
                        { type: 'line', x1: 0, y1: 8, x2: 523, y2: 8, lineWidth: 1.5, lineColor: '#0f172a' },
                        { type: 'line', x1: 0, y1: 10, x2: 523, y2: 10, lineWidth: 0.5, lineColor: '#94a3b8' }
                    ],
                    margin: [0, 0, 0, 10]
                },
                // 2. JUDUL DOKUMEN
                {
                    text: 'BERITA ACARA SERAH TERIMA BARANG (BAST GUDANG)',
                    style: 'docTitle',
                    alignment: 'center',
                    margin: [0, 0, 0, 2]
                },
                {
                    text: 'Bukti Fisik Pengambilan & Serah Terima Barang Logistik Lintas Pengadaan (Purchase Requisition)',
                    style: 'docSubtitle',
                    alignment: 'center',
                    margin: [0, 0, 0, 12]
                },
                // 3. METADATA PARTISIPAN & TRANSAKSI
                {
                    table: {
                        widths: ['18%', '32%', '18%', '32%'],
                        body: [
                            [
                                { text: 'Nomor BAST', style: 'metaLabel' },
                                { text: docNumber, style: 'metaValueBold' },
                                { text: 'Nama Pengambil', style: 'metaLabel' },
                                { text: recipientName, style: 'metaValueBold' }
                            ],
                            [
                                { text: 'Tgl Penyerahan', style: 'metaLabel' },
                                { text: formatDatePdf(handoverDate), style: 'metaValue' },
                                { text: 'NIK / Identitas', style: 'metaLabel' },
                                { text: recipientIdentity, style: 'metaValue' }
                            ],
                            [
                                { text: 'Petugas Gudang', style: 'metaLabel' },
                                { text: handedOverByName, style: 'metaValue' },
                                { text: 'Divisi / Unit', style: 'metaLabel' },
                                { text: recipientDivision, style: 'metaValue' }
                            ],
                            [
                                { text: 'Catatan / Keperluan', style: 'metaLabel' },
                                { text: notes, style: 'metaValue', colSpan: 3 },
                                {},
                                {}
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#cbd5e1',
                        vLineColor: () => '#cbd5e1',
                        paddingLeft: () => 6,
                        paddingRight: () => 6,
                        paddingTop: () => 4,
                        paddingBottom: () => 4,
                    },
                    margin: [0, 0, 0, 12]
                },
                // 4. TABEL RINCIAN BARANG
                {
                    text: 'RINCIAN BARANG YANG DISERAHKAN (GOODS HANDOVER ITEMS)',
                    style: 'sectionHeading',
                    margin: [0, 0, 0, 5]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: [20, 75, 75, '*', 38, 42, 85],
                        body: [
                            [
                                { text: 'NO', style: 'tableHeader', alignment: 'center' },
                                { text: 'NO. PR', style: 'tableHeader' },
                                { text: 'NO. GRN', style: 'tableHeader' },
                                { text: 'NAMA BARANG / DESKRIPSI', style: 'tableHeader' },
                                { text: 'QTY', style: 'tableHeader', alignment: 'right' },
                                { text: 'SATUAN', style: 'tableHeader', alignment: 'center' },
                                { text: 'PEMOHON ASAL', style: 'tableHeader' }
                            ],
                            ...itemsRows,
                            [
                                { text: `TOTAL FISIK DISERAHKAN (${handover.items.length} Macam Barang)`, colSpan: 4, style: 'tableTotalLabel', alignment: 'right' },
                                {}, {}, {},
                                { text: Number.isInteger(totalQty) ? String(totalQty) : totalQty.toFixed(2), style: 'tableTotalValue', alignment: 'right' },
                                { text: 'Item Fisik', colSpan: 2, style: 'tableTotalLabel', alignment: 'left' },
                                {}
                            ]
                        ]
                    },
                    layout: {
                        fillColor: (rowIndex) => {
                            if (rowIndex === 0) return '#f1f5f9'
                            return rowIndex % 2 === 0 ? '#f8fafc' : null
                        },
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#cbd5e1',
                        vLineColor: () => '#cbd5e1',
                        paddingLeft: () => 5,
                        paddingRight: () => 5,
                        paddingTop: () => 4,
                        paddingBottom: () => 4,
                    },
                    margin: [0, 0, 0, 12]
                },
                // 5. KLAUSUL PERNYATAAN SERAH TERIMA
                {
                    table: {
                        widths: ['*'],
                        body: [
                            [
                                {
                                    stack: [
                                        { text: 'KLAUSUL & PERNYATAAN SERAH TERIMA FISIK', style: 'klausulTitle' },
                                        {
                                            text: 'Dengan ditandatanganinya lembar Berita Acara ini, kedua belah pihak menyatakan bahwa barang-barang tersebut di atas telah diperiksa secara fisik, diserahkan, dan diterima dalam kondisi baik, lengkap, dan sesuai peruntukan. Tanggung jawab fisik atas pemanfaatan, penyimpanan, dan pengamanan barang beralih sepenuhnya kepada pihak penerima.',
                                            style: 'klausulBody',
                                            margin: [0, 2, 0, 0]
                                        }
                                    ],
                                    fillColor: '#f8fafc'
                                }
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#94a3b8',
                        vLineColor: () => '#94a3b8',
                        paddingLeft: () => 8,
                        paddingRight: () => 8,
                        paddingTop: () => 6,
                        paddingBottom: () => 6,
                    },
                    margin: [0, 0, 0, 14]
                },
                // 6. MATRIKS TANDA TANGAN BASAH (WET SIGNATURE BOXES)
                {
                    table: {
                        widths: ['33.33%', '33.33%', '33.34%'],
                        body: [
                            [
                                // Kolom 1: Diserahkan Oleh (Gudang)
                                {
                                    stack: [
                                        { text: 'DISERAHKAN OLEH', style: 'signRoleHeader' },
                                        { text: 'Petugas Gudang / Logistik', style: 'signSubHeader' },
                                        { text: `Tgl: ${formatDatePdf(handoverDate)}`, style: 'signDate' },
                                        { text: '', margin: [0, 24, 0, 24] }, // Ruang tanda tangan basah
                                        { text: `( ${handedOverByName} )`, style: 'signerName' },
                                        { text: 'Tanda Tangan & Cap Gudang', style: 'signerTitle' }
                                    ]
                                },
                                // Kolom 2: Diterima Oleh (Penerima)
                                {
                                    stack: [
                                        { text: 'DITERIMA OLEH', style: 'signRoleHeader' },
                                        { text: 'Pihak Pengambil / Penerima', style: 'signSubHeader' },
                                        { text: `Tgl: ${formatDatePdf(handoverDate)}`, style: 'signDate' },
                                        { text: '', margin: [0, 24, 0, 24] }, // Ruang tanda tangan basah
                                        { text: `( ${recipientName} )`, style: 'signerName' },
                                        { text: recipientDivision !== '-' ? `Divisi: ${recipientDivision}` : 'Tanda Tangan Pengambil', style: 'signerTitle' }
                                    ]
                                }
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#cbd5e1',
                        vLineColor: () => '#cbd5e1',
                        paddingLeft: () => 6,
                        paddingRight: () => 6,
                        paddingTop: () => 8,
                        paddingBottom: () => 8,
                    },
                    margin: [0, 0, 0, 14]
                },
                // 7. FOOTER & QR VERIFIKASI AUDIT INTERNAL
                {
                    columns: [
                        {
                            width: 85,
                            table: {
                                widths: ['*'],
                                body: [
                                    [
                                        {
                                            stack: [
                                                { qr: verificationUrl, fit: 70, eccLevel: 'M', alignment: 'center', margin: [0, 2, 0, 2] },
                                                { text: 'AUDIT VERIFIKASI', style: 'qrCaptionBold', alignment: 'center' },
                                                { text: 'Validasi Keaslian BAST', style: 'qrCaptionSub', alignment: 'center' }
                                            ],
                                            fillColor: '#ffffff',
                                            alignment: 'center'
                                        }
                                    ]
                                ]
                            },
                            layout: {
                                hLineWidth: () => 0.5,
                                vLineWidth: () => 0.5,
                                hLineColor: () => '#94a3b8',
                                vLineColor: () => '#94a3b8',
                                paddingLeft: () => 4,
                                paddingRight: () => 4,
                                paddingTop: () => 3,
                                paddingBottom: () => 3,
                            }
                        },
                        {
                            width: '*',
                            margin: [10, 0, 0, 0],
                            stack: [
                                { text: 'LEMBAR ARSIP FISIK & AUDIT INTERNAL PERUSAHAAN', style: 'legalHeader' },
                                { 
                                    text: 'Dokumen BAST ini dicetak resmi dari modul Inventory Sistem ERP untuk keperluan audit internal, pembuktian serah terima barang fisik, dan pencocokan kartu stok gudang. Berkas asli yang telah dibubuhi tanda tangan basah wajib disimpan oleh bagian logistik dan diunggah salinannya ke sistem sebagai bukti digital.',
                                    style: 'legalBody',
                                    margin: [0, 2, 0, 3]
                                },
                                {
                                    text: `No. BAST: ${docNumber} | Dicetak: ${printTimestamp} oleh ${currentUser}`,
                                    style: 'legalMeta'
                                }
                            ]
                        }
                    ]
                }
            ],
            styles: {
                companyName: { fontSize: 13, bold: true, color: '#0f172a', letterSpacing: 0.5 },
                companySub: { fontSize: 8, color: '#475569', margin: [0, 1, 0, 0] },
                docBadge: { fontSize: 8, bold: true, color: '#0369a1' },
                docNumber: { fontSize: 11, bold: true, color: '#0f172a' },
                docDate: { fontSize: 8, color: '#64748b' },
                docTitle: { fontSize: 11, bold: true, color: '#0f172a', letterSpacing: 0.3 },
                docSubtitle: { fontSize: 8, color: '#64748b' },
                sectionHeading: { fontSize: 8.5, bold: true, color: '#334155', letterSpacing: 0.3 },
                metaLabel: { fontSize: 7.5, bold: true, color: '#64748b' },
                metaValue: { fontSize: 8, color: '#1e293b' },
                metaValueBold: { fontSize: 8, bold: true, color: '#0f172a' },
                tableHeader: { fontSize: 7.5, bold: true, color: '#334155' },
                tableCell: { fontSize: 7.5, color: '#1e293b' },
                tableCellBold: { fontSize: 7.5, bold: true, color: '#0f172a' },
                tableCellSmall: { fontSize: 7, color: '#475569' },
                tableTotalLabel: { fontSize: 8, bold: true, color: '#334155' },
                tableTotalValue: { fontSize: 8.5, bold: true, color: '#0f172a' },
                klausulTitle: { fontSize: 7.5, bold: true, color: '#334155' },
                klausulBody: { fontSize: 7, color: '#475569', leading: 1.2 },
                signRoleHeader: { fontSize: 8, bold: true, color: '#0f172a', alignment: 'center' },
                signSubHeader: { fontSize: 7, color: '#475569', alignment: 'center' },
                signDate: { fontSize: 6.5, color: '#64748b', alignment: 'center', margin: [0, 1, 0, 2] },
                signerName: { fontSize: 8, bold: true, color: '#0f172a', alignment: 'center' },
                signerTitle: { fontSize: 7, color: '#64748b', alignment: 'center' },
                qrCaptionBold: { fontSize: 6.5, bold: true, color: '#0f172a', letterSpacing: 0.2 },
                qrCaptionSub: { fontSize: 5.5, color: '#64748b' },
                legalHeader: { fontSize: 7.5, bold: true, color: '#334155' },
                legalBody: { fontSize: 6.5, color: '#64748b', leading: 1.2 },
                legalMeta: { fontSize: 6, color: '#94a3b8' }
            },
            defaultStyle: {
                fontSize: 8,
                color: '#1e293b',
            }
        }

        const sanitizedNumber = docNumber.replace(/[^a-zA-Z0-9-_]/g, '_')
        const fileName = `${sanitizedNumber}_BAST_Serah_Terima.pdf`

        pdfMake.createPdf(docDefinition).download(fileName)

        closeSwal()
        return true
    } catch (err) {
        console.error('Handover PDF Generation Error:', err)
        closeSwal()
        showError('Gagal Menghasilkan PDF BAST', err.message || 'Terjadi kesalahan teknis saat menyusun berkas BAST PDF.', err)
        return false
    }
}
