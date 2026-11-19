import pdfMake from 'pdfmake/build/pdfmake.js'
import pdfFonts from 'pdfmake/build/vfs_fonts.js'
import { formatCurrency } from '../stringUtils.js'
import { showLoading, showError, closeSwal } from '../swal.js'
import { toast } from 'vue-sonner'
import { getPurchaseRequisitionLifecycle } from '../../services/purchaseRequisitionServices.js'
import { previewPdf } from './previewPdf.js'

// Initialize pdfMake virtual file system for fonts
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs
} else if (pdfFonts && pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs
} else if (pdfFonts) {
    pdfMake.vfs = pdfFonts
}

/**
 * Convert remote/local image URL to base64 Data URL for pdfmake embedding.
 */
export const urlToBase64 = async (url) => {
    if (!url || typeof url !== 'string') return null
    if (url.startsWith('data:image/')) return url

    try {
        const response = await fetch(url, { mode: 'cors' })
        if (!response.ok) return null
        const blob = await response.blob()
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
    } catch (err) {
        console.warn('Could not convert signature URL to base64 for PDF:', err)
        return null
    }
}

/**
 * Format date for formal Indonesian letter display.
 */
const formatDatePdf = (dateStr) => {
    if (!dateStr) return '-'
    try {
        const cleanStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr
        const d = new Date(cleanStr)
        if (isNaN(d.getTime())) return String(dateStr)
        return d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
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
        const cleanStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr
        const d = new Date(cleanStr)
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
 * Format quantity cleanly without redundant trailing zeros (e.g. 1.0000 -> 1, 1.50 -> 1,5).
 */
const formatQtyPdf = (value) => {
    const num = Number(value)
    if (Number.isNaN(num)) return String(value ?? '-')
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(num)
}

/**
 * Chunk array into balanced rows (max 3 signature columns per row so slots never get cramped).
 */
const chunkArray = (arr, size) => {
    const chunks = []
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size))
    }
    return chunks
}

/**
 * Build a clean formal signature column block (no heavy grid boxes).
 */
const buildSignatureSlot = ({ roleLabel, stepLabel, dateText, signatureImage, name, position, timestamp }) => {
    const stack = [
        { text: roleLabel, style: 'signRoleHeader' },
        { text: stepLabel || ' ', style: 'signStepLabel' },
        { text: dateText ? `Tanggal: ${dateText}` : ' ', style: 'signDate' },
    ]

    if (signatureImage) {
        stack.push({
            image: signatureImage,
            fit: [105, 44],
            alignment: 'center',
            margin: [0, 4, 0, 4],
        })
    } else {
        // Reserve comfortable space for wet/manual signature
        stack.push({
            text: ' ',
            margin: [0, 22, 0, 22],
        })
    }

    stack.push({
        canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 112, y2: 0, lineWidth: 0.75, lineColor: '#475569' }
        ],
        alignment: 'center',
        margin: [0, 0, 0, 4],
    })
    stack.push({ text: name || 'Pejabat Berwenang', style: 'signerName' })
    stack.push({ text: position || '-', style: 'signerTitle' })

    if (signatureImage && timestamp) {
        stack.push({
            text: `Ditandatangani: ${timestamp}`,
            style: 'signTimestamp',
        })
    }

    return { stack, margin: [6, 0, 6, 0] }
}

/**
 * Preview the Purchase Requisition Approval History PDF before download.
 * 
 * @param {Object} pr - Purchase Requisition object (must have id, pr_number, status, etc.)
 * @param {Object} options - Additional options { currentUser, lifecycleData }
 */
export const generatePurchaseRequisitionPdf = async (pr, options = {}) => {
    if (!pr || !pr.id) {
        showError('Dokumen Tidak Ditemukan', 'Data dokumen Purchase Requisition tidak valid untuk dicetak.')
        return false
    }

    // 1. Download Guard: Strict requirement that all approvals are completed
    const approvedStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed']
    if (!approvedStatuses.includes(pr.status)) {
        toast.warning('Belum Disetujui Penuh', {
            description: 'Lembar Persetujuan PDF tersedia setelah pengajuan disetujui penuh oleh seluruh peninjau.'
        })
        return false
    }

    // Show loading indicator during PDF generation & asset resolution
    showLoading('Menyiapkan Preview PDF', 'Memuat tanda tangan dan menyusun lembar persetujuan...')

    try {
        // 2. Fetch full lifecycle data if not provided
        let lifecycle = options.lifecycleData || null
        if (!lifecycle || !lifecycle.stages) {
            const res = await getPurchaseRequisitionLifecycle(pr.id)
            lifecycle = res?.data || res
        }

        const stages = lifecycle?.stages || []
        const stage1 = stages.find(s => s.key === 'pr_submission') || {}
        const stage2 = stages.find(s => s.key === 'pr_approval') || {}

        // Metadata extraction
        const company = stage1.company || pr.company || { name: 'PT PADMA SOODE INDONESIA' }
        const requester = stage1.actor || {
            name: pr.requester?.name || pr.requester?.employee?.name || 'Staff Pemohon',
            division: pr.division?.name || pr.requester?.employee?.division?.name || '-',
            position: pr.requester?.employee?.position?.name || 'Staff',
            signature_url: pr.requester?.signature_url || null,
        }

        const items = stage1.items || pr.items || []
        const prNumber = pr.pr_number || stage1.document?.number || 'PR-DOKUMEN'
        const requestDate = stage1.document?.date || pr.request_date
        const requiredDate = stage1.document?.required_date || pr.required_date
        const purpose = stage1.document?.purpose || pr.purpose || '-'
        const currency = stage1.document?.currency || pr.currency || 'IDR'
        const activeItems = items.filter(it => String(it.approval_status || '').toLowerCase() !== 'rejected')
        const totalAmount = activeItems.reduce((sum, it) => {
            const q = Number(it.quantity) || 0
            const p = Number(it.estimated_price) || 0
            return sum + (q * p)
        }, 0)

        // 3. Resolve ordinary image/canvas signatures saved in the user profile.
        const requesterSignature = await urlToBase64(requester.signature_url)
        const reqSignedAt = stage1.signed_at || stage1.actor?.signed_at || pr.signed_at || requestDate

        // Approvers list from stage 2 levels and completed actions
        const approverColumns = []
        const approvalLevels = stage2.levels || []

        for (let i = 0; i < approvalLevels.length; i++) {
            const level = approvalLevels[i]
            const actions = level.actions || []
            const approveAction = actions.find(a => a.action === 'approve')
            const approverUser = approveAction?.user || level.assignee || {}

            const status = String(approveAction?.action || level.status || '').toLowerCase()
            const isApproved = status === 'approve' || status === 'approved'
            // Never place a signature for a pending/rejected step.
            const signatureImage = isApproved ? await urlToBase64(approveAction?.signature_url || approverUser.signature_url) : null
            const signedAt = approveAction?.signed_at || approveAction?.acted_at || level.completed_at || level.acted_at || null

            approverColumns.push({
                stepOrder: level.step_order || (i + 1),
                stepName: level.step_name || `Penyetuju Tahap ${i + 1}`,
                name: approverUser.name || 'Pejabat Berwenang',
                position: approverUser.position || level.assignee?.position || 'Peninjau Dokumen',
                actedAt: signedAt,
                signedAt: signedAt,
                notes: approveAction?.notes || level.notes || null,
                isApproved,
                signatureImage,
            })
        }

        // 4. Construct Item Table Rows (clean typography, formatted quantity, specification subline)
        const itemsRows = items.map((item, index) => {
            const qty = Number(item.quantity) || 0
            const price = Number(item.estimated_price) || 0
            const subtotal = qty * price
            const isRejected = String(item.approval_status || '').toLowerCase() === 'rejected'
            const itemName = item.name || item.item?.name || item.item_name || 'Barang/Jasa'
            const itemCode = item.code || item.item?.code || item.item_code || '-'
            const itemDetail = item.detail_name || item.specification || null
            const unitName = item.unit_name || item.unit?.code || item.unit?.name || 'Unit'

            const nameStack = [
                {
                    text: itemName,
                    style: isRejected ? 'tableCellMutedStrike' : 'tableCellBold',
                },
            ]
            if (itemDetail) {
                nameStack.push({ text: itemDetail, style: 'tableCellSub', margin: [0, 2, 0, 0] })
            }
            if (isRejected) {
                nameStack.push({
                    text: item.rejection_reason ? `Ditolak: ${item.rejection_reason}` : 'Item ditolak pada tahap persetujuan',
                    style: 'tableCellRejected',
                    margin: [0, 2, 0, 0],
                })
            }

            return [
                { text: String(index + 1), alignment: 'center', style: isRejected ? 'tableCellMuted' : 'tableCell' },
                { text: itemCode, style: isRejected ? 'tableCellMuted' : 'tableCellCode' },
                { stack: nameStack },
                { text: formatQtyPdf(qty), alignment: 'right', style: isRejected ? 'tableCellMutedStrike' : 'tableCell' },
                { text: unitName, alignment: 'center', style: isRejected ? 'tableCellMuted' : 'tableCell' },
                { text: formatCurrency(price, currency), alignment: 'right', style: isRejected ? 'tableCellMutedStrike' : 'tableCell' },
                { text: formatCurrency(isRejected ? 0 : subtotal, currency), alignment: 'right', style: isRejected ? 'tableCellMuted' : 'tableCellBold' },
            ]
        })

        // 5. Construct Formal Signature Rows (max 3 columns per row, borderless formal letter blocks)
        const allSigners = [
            buildSignatureSlot({
                roleLabel: 'Diajukan oleh,',
                stepLabel: requester.division && requester.division !== '-' ? requester.division : 'Pemohon',
                dateText: formatDatePdf(requestDate),
                signatureImage: requesterSignature,
                name: requester.name,
                position: requester.position || 'Staff',
                timestamp: requesterSignature && reqSignedAt ? formatDateTimePdf(reqSignedAt) : null,
            }),
            ...approverColumns.map(app =>
                buildSignatureSlot({
                    roleLabel: 'Disetujui oleh,',
                    stepLabel: app.stepName,
                    dateText: formatDatePdf(app.actedAt),
                    signatureImage: app.isApproved ? app.signatureImage : null,
                    name: app.name,
                    position: app.position,
                    timestamp: app.isApproved && app.signatureImage && app.signedAt ? formatDateTimePdf(app.signedAt) : null,
                })
            ),
        ]

        const signatureRows = chunkArray(allSigners, 3).map((rowSlots, rowIndex) => ({
            columns: rowSlots.map(slot => ({ ...slot, width: '*' })),
            columnGap: 14,
            margin: [0, rowIndex === 0 ? 0 : 18, 0, 0],
            unbreakable: true,
        }))

        // 5b. Construct Notes Section only when meaningful notes exist (keeps formal letter uncluttered)
        const requesterNotes = stage1.document?.notes || stage1.notes || stage1.actions?.[0]?.notes || pr.notes || pr.remarks || null
        const hasNote = (n) => Boolean(n && typeof n === 'string' ? n.trim() : n)
        const noteEntries = [
            ...(hasNote(requesterNotes) ? [{
                role: 'Pemohon',
                actor: `${requester.name} (${requester.position || 'Staff'})`,
                date: formatDatePdf(requestDate),
                note: String(requesterNotes).trim(),
            }] : []),
            ...approverColumns
                .filter(app => hasNote(app.notes))
                .map(app => ({
                    role: app.stepName,
                    actor: `${app.name} (${app.position})`,
                    date: formatDatePdf(app.actedAt),
                    note: String(app.notes).trim(),
                })),
        ]

        const printTimestamp = formatDateTimePdf(new Date())
        const currentUser = options.currentUser || 'Petugas ERP'

        // 6. Build Formal Letter Document Definition (A4 Portrait, generous margins & airy hierarchy)
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [48, 44, 48, 56],
            footer: (currentPage, pageCount) => ({
                margin: [48, 8, 48, 0],
                stack: [
                    {
                        canvas: [
                            { type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 0.5, lineColor: '#cbd5e1' }
                        ],
                        margin: [0, 0, 0, 6],
                    },
                    {
                        columns: [
                            {
                                width: '*',
                                text: `Dokumen resmi Sistem ERP · ${prNumber} (ID #${pr.id}) · Dicetak ${printTimestamp} oleh ${currentUser}`,
                                style: 'footerText',
                            },
                            {
                                width: 'auto',
                                text: `Halaman ${currentPage} dari ${pageCount}`,
                                style: 'footerPage',
                                alignment: 'right',
                            },
                        ],
                    },
                ],
            }),
            content: [
                // KOP SURAT PERUSAHAAN
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: (company.name || 'PT PERUSAHAAN').toUpperCase(), style: 'companyName' },
                                { text: company.address || 'Kawasan Operasional Perusahaan', style: 'companySub' },
                                { text: company.phone ? `Telp. ${company.phone}` : 'Sistem Informasi Manajemen Pengadaan Terpadu', style: 'companySub' },
                            ],
                        },
                        {
                            width: 'auto',
                            stack: [
                                { text: 'FORMULIR PENGADAAN RESMI', style: 'docCategory', alignment: 'right' },
                                { text: 'DISETUJUI PENUH', style: 'docStatusPill', alignment: 'right', margin: [0, 3, 0, 0] },
                            ],
                        },
                    ],
                },
                // Garis Kop Surat Ganda Klasik
                {
                    canvas: [
                        { type: 'line', x1: 0, y1: 10, x2: 499, y2: 10, lineWidth: 1.8, lineColor: '#0f172a' },
                        { type: 'line', x1: 0, y1: 13, x2: 499, y2: 13, lineWidth: 0.6, lineColor: '#014BAA' },
                    ],
                    margin: [0, 0, 0, 18],
                },

                // JUDUL SURAT & NOMOR RESMI
                {
                    text: 'SURAT PERMINTAAN PENGADAAN BARANG / JASA',
                    style: 'docTitle',
                    alignment: 'center',
                },
                {
                    text: `Nomor: ${prNumber}`,
                    style: 'docNumber',
                    alignment: 'center',
                    margin: [0, 3, 0, 18],
                },

                // IDENTITAS SURAT (Borderless 2-Column Formal Header Block)
                {
                    table: {
                        widths: [96, '*', 96, '*'],
                        body: [
                            [
                                { text: 'Tanggal Pengajuan', style: 'metaLabel' },
                                { text: `:  ${formatDatePdf(requestDate)}`, style: 'metaValue' },
                                { text: 'Target Kebutuhan', style: 'metaLabel' },
                                { text: `:  ${formatDatePdf(requiredDate)}`, style: 'metaValue' },
                            ],
                            [
                                { text: 'Divisi Pemohon', style: 'metaLabel' },
                                { text: `:  ${requester.division || '-'}`, style: 'metaValue' },
                                { text: 'Diajukan Oleh', style: 'metaLabel' },
                                { text: `:  ${requester.name}`, style: 'metaValue' },
                            ],
                            [
                                { text: 'Perihal / Tujuan', style: 'metaLabel' },
                                { text: `:  ${purpose || '-'}`, style: 'metaValueBold', colSpan: 3 },
                                {},
                                {},
                            ],
                        ],
                    },
                    layout: {
                        hLineWidth: (i, node) => (i === node.table.body.length ? 0.5 : 0),
                        vLineWidth: () => 0,
                        hLineColor: () => '#e2e8f0',
                        paddingLeft: () => 0,
                        paddingRight: () => 6,
                        paddingTop: () => 3,
                        paddingBottom: (i, node) => (i === node.table.body.length - 1 ? 10 : 3),
                    },
                    margin: [0, 0, 0, 14],
                },

                // BLOK JALUR PEMBELIAN LANGSUNG (Compact Formal Notice)
                ...(pr.procurement_route === 'direct_supplier' ? [{
                    table: {
                        widths: ['*'],
                        body: [[
                            {
                                stack: [
                                    {
                                        columns: [
                                            { text: 'KETENTUAN PEMBELIAN LANGSUNG (DIRECT PO)', style: 'directHeader', width: '*' },
                                            { text: 'PR disetujui → langsung PO', style: 'directTag', width: 'auto', alignment: 'right' },
                                        ],
                                        margin: [0, 0, 0, 6],
                                    },
                                    {
                                        table: {
                                            widths: [92, '*', 82, '*'],
                                            body: [
                                                [
                                                    { text: 'Supplier Tujuan', style: 'metaLabel' },
                                                    { text: `:  ${pr.direct_supplier?.name || '-'}`, style: 'metaValueBold' },
                                                    { text: 'Pembayaran', style: 'metaLabel' },
                                                    { text: `:  ${pr.direct_purchase_terms?.payment_terms || '-'}`, style: 'metaValue' },
                                                ],
                                                [
                                                    { text: 'Referensi Harga', style: 'metaLabel' },
                                                    { text: `:  ${pr.direct_purchase_terms?.reference || '-'}`, style: 'metaValue' },
                                                    { text: 'Pengiriman', style: 'metaLabel' },
                                                    { text: `:  ${pr.direct_purchase_terms?.delivery_address || '-'}`, style: 'metaValue' },
                                                ],
                                            ],
                                        },
                                        layout: 'noBorders',
                                    },
                                ],
                            },
                        ]],
                    },
                    layout: {
                        fillColor: () => '#f8fafc',
                        hLineWidth: () => 0.5,
                        vLineWidth: (i) => (i === 0 ? 2.5 : 0.5),
                        hLineColor: () => '#cbd5e1',
                        vLineColor: (i) => (i === 0 ? '#014BAA' : '#cbd5e1'),
                        paddingLeft: () => 12,
                        paddingRight: () => 12,
                        paddingTop: () => 9,
                        paddingBottom: () => 9,
                    },
                    margin: [0, 0, 0, 14],
                }] : []),

                // KALIMAT PEMBUKA SURAT FORMAL
                {
                    text: 'Dengan hormat, bersama surat ini kami mengajukan permohonan pengadaan barang/jasa dengan rincian sebagai berikut:',
                    style: 'letterBody',
                    margin: [0, 0, 0, 10],
                },

                // TABEL RINCIAN BARANG / JASA (Clean Formal Table, Horizontal Lines Only)
                {
                    table: {
                        headerRows: 1,
                        dontBreakRows: true,
                        widths: [22, 62, '*', 42, 46, 76, 84],
                        body: [
                            [
                                { text: 'No', style: 'tableHeader', alignment: 'center' },
                                { text: 'Kode', style: 'tableHeader' },
                                { text: 'Uraian Barang / Jasa', style: 'tableHeader' },
                                { text: 'Jumlah', style: 'tableHeader', alignment: 'right' },
                                { text: 'Satuan', style: 'tableHeader', alignment: 'center' },
                                { text: 'Est. Harga', style: 'tableHeader', alignment: 'right' },
                                { text: 'Subtotal', style: 'tableHeader', alignment: 'right' },
                            ],
                            ...itemsRows,
                            [
                                { text: 'Total Estimasi Pengadaan', colSpan: 6, style: 'tableTotalLabel', alignment: 'right' },
                                {}, {}, {}, {}, {},
                                { text: formatCurrency(totalAmount, currency), style: 'tableTotalValue', alignment: 'right' },
                            ],
                        ],
                    },
                    layout: {
                        fillColor: (rowIndex, node) => {
                            if (rowIndex === 0) return '#f1f5f9'
                            if (rowIndex === node.table.body.length - 1) return '#f8fafc'
                            return null
                        },
                        hLineWidth: (i, node) => {
                            if (i === 0 || i === 1) return 1
                            if (i === node.table.body.length) return 1.2
                            if (i === node.table.body.length - 1) return 0.8
                            return 0.5
                        },
                        vLineWidth: () => 0,
                        hLineColor: (i, node) => {
                            if (i === 0 || i === 1 || i === node.table.body.length) return '#0f172a'
                            if (i === node.table.body.length - 1) return '#64748b'
                            return '#e2e8f0'
                        },
                        paddingLeft: () => 6,
                        paddingRight: () => 6,
                        paddingTop: () => 6.5,
                        paddingBottom: () => 6.5,
                    },
                    margin: [0, 0, 0, 16],
                },

                // CATATAN PENGAJUAN & PERSETUJUAN (Hanya ditampilkan bila ada catatan)
                ...(noteEntries.length ? [
                    {
                        text: 'Catatan Pengajuan & Persetujuan',
                        style: 'sectionHeading',
                        margin: [0, 0, 0, 6],
                    },
                    {
                        table: {
                            headerRows: 1,
                            dontBreakRows: true,
                            widths: [110, 125, '*'],
                            body: [
                                [
                                    { text: 'Tahap / Peran', style: 'tableHeader' },
                                    { text: 'Peninjau & Tanggal', style: 'tableHeader' },
                                    { text: 'Catatan', style: 'tableHeader' },
                                ],
                                ...noteEntries.map(entry => [
                                    { text: entry.role, style: 'tableCellBold' },
                                    {
                                        stack: [
                                            { text: entry.actor, style: 'tableCell' },
                                            { text: entry.date, style: 'tableCellSub', margin: [0, 1, 0, 0] },
                                        ],
                                    },
                                    { text: entry.note, style: 'tableCellItalic' },
                                ]),
                            ],
                        },
                        layout: {
                            fillColor: (rowIndex) => (rowIndex === 0 ? '#f8fafc' : null),
                            hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 0.75 : 0.4),
                            vLineWidth: () => 0,
                            hLineColor: (i, node) => (i === 0 || i === node.table.body.length ? '#94a3b8' : '#e2e8f0'),
                            paddingLeft: () => 6,
                            paddingRight: () => 6,
                            paddingTop: () => 5,
                            paddingBottom: () => 5,
                        },
                        margin: [0, 0, 0, 16],
                    },
                ] : []),

                // PENUTUP SURAT & BLOK PENGESAHAN FORMAL (Anti-terpotong halaman)
                {
                    unbreakable: true,
                    stack: [
                        {
                            text: 'Demikian surat permintaan pengadaan ini disampaikan untuk dapat diproses lebih lanjut. Atas perhatian dan persetujuannya, kami ucapkan terima kasih.',
                            style: 'letterBody',
                            margin: [0, 2, 0, 18],
                        },
                        ...signatureRows,
                        {
                            text: 'Keterangan: Lembar ini diterbitkan melalui Sistem ERP. Nama peninjau, tanggal, dan tanda tangan mengikuti riwayat pengesahan; kolom tanpa gambar tanda tangan dapat ditandatangani secara manual.',
                            style: 'legalNote',
                            margin: [0, 20, 0, 0],
                        },
                    ],
                },
            ],
            styles: {
                companyName: { fontSize: 13.5, bold: true, color: '#0f172a', letterSpacing: 0.4 },
                companySub: { fontSize: 8.5, color: '#475569', margin: [0, 1.5, 0, 0] },
                docCategory: { fontSize: 7.5, bold: true, color: '#64748b', letterSpacing: 0.6 },
                docStatusPill: { fontSize: 8.5, bold: true, color: '#047857', letterSpacing: 0.4 },
                docTitle: { fontSize: 12, bold: true, color: '#0f172a', letterSpacing: 0.4 },
                docNumber: { fontSize: 9.5, bold: true, color: '#014BAA' },
                letterBody: { fontSize: 9, color: '#334155', lineHeight: 1.45 },
                sectionHeading: { fontSize: 9, bold: true, color: '#0f172a' },
                directHeader: { fontSize: 8, bold: true, color: '#014BAA', letterSpacing: 0.3 },
                directTag: { fontSize: 7.5, italic: true, color: '#475569' },
                metaLabel: { fontSize: 8.5, color: '#64748b' },
                metaValue: { fontSize: 8.5, color: '#1e293b' },
                metaValueBold: { fontSize: 8.5, bold: true, color: '#0f172a' },
                tableHeader: { fontSize: 8.5, bold: true, color: '#0f172a' },
                tableCell: { fontSize: 8.5, color: '#1e293b', lineHeight: 1.3 },
                tableCellCode: { fontSize: 8, bold: true, color: '#334155', lineHeight: 1.3 },
                tableCellBold: { fontSize: 8.5, bold: true, color: '#0f172a', lineHeight: 1.3 },
                tableCellSub: { fontSize: 7.5, color: '#64748b', lineHeight: 1.25 },
                tableCellItalic: { fontSize: 8.5, italic: true, color: '#334155', lineHeight: 1.35 },
                tableCellMuted: { fontSize: 8.5, color: '#94a3b8' },
                tableCellMutedStrike: { fontSize: 8.5, color: '#94a3b8', decoration: 'lineThrough' },
                tableCellRejected: { fontSize: 7.5, italic: true, color: '#be123c' },
                tableTotalLabel: { fontSize: 9, bold: true, color: '#334155' },
                tableTotalValue: { fontSize: 9.5, bold: true, color: '#0f172a' },
                signRoleHeader: { fontSize: 8.5, color: '#475569', alignment: 'center' },
                signStepLabel: { fontSize: 8, bold: true, color: '#0f172a', alignment: 'center', margin: [0, 1, 0, 0] },
                signDate: { fontSize: 7.5, color: '#64748b', alignment: 'center', margin: [0, 1, 0, 2] },
                signerName: { fontSize: 8.5, bold: true, color: '#0f172a', alignment: 'center' },
                signerTitle: { fontSize: 7.5, color: '#475569', alignment: 'center', margin: [0, 1, 0, 0] },
                signTimestamp: { fontSize: 6.5, color: '#64748b', alignment: 'center', margin: [0, 2, 0, 0] },
                legalNote: { fontSize: 7.5, italic: true, color: '#64748b', lineHeight: 1.35 },
                footerText: { fontSize: 7, color: '#64748b' },
                footerPage: { fontSize: 7, bold: true, color: '#475569' },
            },
            defaultStyle: {
                fontSize: 9,
                color: '#1e293b',
                lineHeight: 1.3,
            },
        }

        // 7. Preview first; download is available inside the preview only.
        const sanitizedPrNumber = prNumber.replace(/[^a-zA-Z0-9-_]/g, '_')
        const fileName = `${sanitizedPrNumber}_Lembar_Persetujuan.pdf`

        const blob = await pdfMake.createPdf(docDefinition).getBlob()
        closeSwal()
        await previewPdf(blob, fileName)
        return true
    } catch (err) {
        console.error('PDF Generation Error:', err)
        closeSwal()
        showError('Gagal Menghasilkan PDF', err.message || 'Terjadi kesalahan teknis saat menyusun berkas PDF.', err)
        return false
    }
}
