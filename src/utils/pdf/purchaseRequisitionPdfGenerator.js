import pdfMake from 'pdfmake/build/pdfmake.js'
import pdfFonts from 'pdfmake/build/vfs_fonts.js'
import { formatCurrency } from '../stringUtils.js'
import Swal from 'sweetalert2'
import { getPurchaseRequisitionLifecycle } from '../../services/purchaseRequisitionServices.js'

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
 * Format date for PDF display.
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
 * Generate and download Purchase Requisition Approval History PDF.
 * 
 * @param {Object} pr - Purchase Requisition object (must have id, pr_number, status, etc.)
 * @param {Object} options - Additional options { currentUser, lifecycleData }
 */
export const generatePurchaseRequisitionPdf = async (pr, options = {}) => {
    if (!pr || !pr.id) {
        Swal.fire({
            icon: 'error',
            title: 'Dokumen Tidak Ditemukan',
            text: 'Data dokumen Purchase Requisition tidak valid untuk dicetak.',
        })
        return false
    }

    // 1. Download Guard: Strict requirement that all approvals are completed
    const approvedStatuses = ['approved', 'in_procurement', 'ready_for_pickup', 'completed']
    if (!approvedStatuses.includes(pr.status)) {
        Swal.fire({
            icon: 'warning',
            title: 'Belum Disetujui Penuh',
            text: 'Lembar Persetujuan PDF hanya dapat diunduh jika pengajuan telah disetujui penuh oleh seluruh peninjau.',
            confirmButtonColor: '#d97706',
        })
        return false
    }

    // Show loading indicator during PDF generation & asset resolution
    Swal.fire({
        title: 'Menyiapkan Lembar Persetujuan',
        text: 'Sedang memproses tanda tangan digital dan menyusun berkas PDF resmi...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading()
        }
    })

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
        const company = stage1.company || pr.company || { name: 'PADU KUE INDONESIA' }
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
        const totalAmount = items.reduce((sum, it) => {
            const q = Number(it.quantity) || 0
            const p = Number(it.estimated_price) || 0
            return sum + (q * p)
        }, 0)

        // 3. Resolve Signatures (Convert images to Base64)
        const requesterSignatureBase64 = await urlToBase64(requester.signature_url)

        // Approvers list from stage 2 levels and completed actions
        const approverColumns = []
        const approvalLevels = stage2.levels || []

        for (let i = 0; i < approvalLevels.length; i++) {
            const level = approvalLevels[i]
            // Find the approve action in this level
            const actions = level.actions || []
            const approveAction = actions.find(a => a.action === 'approve') || actions[actions.length - 1]

            const approverUser = approveAction?.user || level.assignee || {}
            const signUrl = approveAction?.signature_url || approverUser?.signature_url
            const signBase64 = await urlToBase64(signUrl)

            approverColumns.push({
                stepOrder: level.step_order || (i + 1),
                stepName: level.step_name || `Penyetuju Tahap ${i + 1}`,
                name: approverUser.name || 'Pejabat Berwenang',
                position: approverUser.position || level.assignee?.position || 'Peninjau Dokumen',
                actedAt: approveAction?.acted_at || null,
                notes: approveAction?.notes || null,
                signatureBase64: signBase64,
            })
        }

        // 4. Construct Item Table Rows
        const itemsRows = items.map((item, index) => {
            const qty = Number(item.quantity) || 0
            const price = Number(item.estimated_price) || 0
            const subtotal = qty * price
            const itemName = item.name || item.item?.name || item.item_name || 'Barang/Jasa'
            const itemCode = item.code || item.item?.code || item.item_code || '-'
            const unitName = item.unit_name || item.unit?.name || 'Unit'

            return [
                { text: String(index + 1), alignment: 'center', style: 'tableCell' },
                { text: itemCode, style: 'tableCellBold' },
                { text: itemName, style: 'tableCell' },
                { text: Number.isInteger(qty) ? String(qty) : qty.toFixed(2), alignment: 'right', style: 'tableCell' },
                { text: unitName, alignment: 'center', style: 'tableCell' },
                { text: formatCurrency(price), alignment: 'right', style: 'tableCell' },
                { text: formatCurrency(subtotal), alignment: 'right', style: 'tableCellBold' },
            ]
        })

        // 5. Construct Signatures Grid
        // Total signature slots = 1 (requester) + approvers.length
        const totalSigners = 1 + approverColumns.length
        const signCellWidths = Array(totalSigners).fill('*')

        const signatureCells = []

        // Column 1: Requester
        const reqSignStack = [
            { text: 'DIAJUKAN OLEH', style: 'signRoleHeader' },
            { text: `Tgl: ${formatDatePdf(requestDate)}`, style: 'signDate' },
        ]

        if (requesterSignatureBase64) {
            reqSignStack.push({
                image: requesterSignatureBase64,
                width: 75,
                height: 38,
                alignment: 'center',
                margin: [0, 4, 0, 4],
            })
        } else {
            reqSignStack.push({
                text: '[Tanda Tangan Digital]',
                style: 'signPlaceholder',
                margin: [0, 14, 0, 14],
            })
        }

        reqSignStack.push({ text: `( ${requester.name} )`, style: 'signerName' })
        reqSignStack.push({ text: `${requester.position || 'Staff'}`, style: 'signerTitle' })
        signatureCells.push(reqSignStack)

        // Columns 2..N: Approvers
        for (const app of approverColumns) {
            const appStack = [
                { text: `DISETUJUI OLEH (${app.stepName.toUpperCase()})`, style: 'signRoleHeader' },
                { text: `Tgl: ${formatDateTimePdf(app.actedAt)}`, style: 'signDate' },
            ]

            if (app.signatureBase64) {
                appStack.push({
                    image: app.signatureBase64,
                    width: 75,
                    height: 38,
                    alignment: 'center',
                    margin: [0, 4, 0, 4],
                })
            } else {
                appStack.push({
                    text: '[Disetujui Digital]',
                    style: 'signPlaceholder',
                    margin: [0, 14, 0, 14],
                })
            }

            appStack.push({ text: `( ${app.name} )`, style: 'signerName' })
            appStack.push({ text: `${app.position}`, style: 'signerTitle' })

            if (app.notes) {
                appStack.push({
                    text: `Catatan: "${app.notes}"`,
                    style: 'signNotes',
                    margin: [0, 2, 0, 0]
                })
            }

            signatureCells.push(appStack)
        }

        // Verification URL for QR code
        const origin = window?.location?.origin || ''
        const verificationUrl = `${origin}/purchasing/purchase-requisitions/${pr.id}`
        const printTimestamp = formatDateTimePdf(new Date())
        const currentUser = options.currentUser || 'Petugas ERP'

        // 6. Build Document Definition
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [36, 36, 36, 36],
            content: [
                // KOP PERUSAHAAN
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: (company.name || 'PT PERUSAHAAN').toUpperCase(), style: 'companyName' },
                                { text: company.address || 'Kawasan Operasional Perusahaan', style: 'companySub' },
                                { text: company.phone ? `Kontak: ${company.phone}` : 'Sistem Informasi Manajemen Pengadaan Terpadu', style: 'companySub' }
                            ]
                        },
                        {
                            width: 'auto',
                            stack: [
                                { text: 'LEMBAR PENGESAHAN PR', style: 'docBadge', alignment: 'right' },
                                { text: prNumber, style: 'docNumber', alignment: 'right' },
                                { text: `Pengajuan: ${formatDatePdf(requestDate)}`, style: 'docDate', alignment: 'right' }
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
                    margin: [0, 0, 0, 12]
                },
                // Judul Dokumen
                {
                    text: 'SURAT PERMINTAAN PENGADAAN (PURCHASE REQUISITION)',
                    style: 'docTitle',
                    alignment: 'center',
                    margin: [0, 0, 0, 2]
                },
                {
                    text: 'Lembar Riwayat Pengesahan Resmi Sistem ERP Multi-Tier Approval',
                    style: 'docSubtitle',
                    alignment: 'center',
                    margin: [0, 0, 0, 12]
                },
                // Metadata Table
                {
                    table: {
                        widths: ['18%', '32%', '18%', '32%'],
                        body: [
                            [
                                { text: 'Nomor PR', style: 'metaLabel' },
                                { text: prNumber, style: 'metaValueBold' },
                                { text: 'Status Dokumen', style: 'metaLabel' },
                                { text: 'DISETUJUI PENUH (APPROVED)', style: 'metaStatusApproved' }
                            ],
                            [
                                { text: 'Tgl Pengajuan', style: 'metaLabel' },
                                { text: formatDatePdf(requestDate), style: 'metaValue' },
                                { text: 'Tgl Dibutuhkan', style: 'metaLabel' },
                                { text: formatDatePdf(requiredDate), style: 'metaValue' }
                            ],
                            [
                                { text: 'Divisi Pemohon', style: 'metaLabel' },
                                { text: requester.division || '-', style: 'metaValue' },
                                { text: 'Diajukan Oleh', style: 'metaLabel' },
                                { text: requester.name, style: 'metaValue' }
                            ],
                            [
                                { text: 'Tujuan Pengadaan', style: 'metaLabel' },
                                { text: purpose || '-', style: 'metaValue', colSpan: 3 },
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
                    margin: [0, 0, 0, 14]
                },
                // Items Table
                {
                    text: 'RINCIAN BARANG / JASA YANG DIAJUKAN',
                    style: 'sectionHeading',
                    margin: [0, 0, 0, 5]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: [20, 60, '*', 38, 42, 70, 75],
                        body: [
                            [
                                { text: 'NO', style: 'tableHeader', alignment: 'center' },
                                { text: 'KODE', style: 'tableHeader' },
                                { text: 'NAMA BARANG / DESKRIPSI', style: 'tableHeader' },
                                { text: 'QTY', style: 'tableHeader', alignment: 'right' },
                                { text: 'SATUAN', style: 'tableHeader', alignment: 'center' },
                                { text: 'EST. HARGA', style: 'tableHeader', alignment: 'right' },
                                { text: 'TOTAL ESTIMASI', style: 'tableHeader', alignment: 'right' }
                            ],
                            ...itemsRows,
                            [
                                { text: 'TOTAL ESTIMASI KESELURUHAN', colSpan: 6, style: 'tableTotalLabel', alignment: 'right' },
                                {}, {}, {}, {}, {},
                                { text: formatCurrency(totalAmount), style: 'tableTotalValue', alignment: 'right' }
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
                        paddingTop: () => 3.5,
                        paddingBottom: () => 3.5,
                    },
                    margin: [0, 0, 0, 16]
                },
                // Section Matriks Pengesahan
                {
                    text: 'MATRIKS PENGESAHAN & TANDA TANGAN ELEKTRONIK',
                    style: 'sectionHeading',
                    margin: [0, 0, 0, 5]
                },
                {
                    table: {
                        widths: signCellWidths,
                        body: [
                            signatureCells
                        ]
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#cbd5e1',
                        vLineColor: () => '#cbd5e1',
                        paddingLeft: () => 4,
                        paddingRight: () => 4,
                        paddingTop: () => 6,
                        paddingBottom: () => 6,
                    },
                    margin: [0, 0, 0, 14]
                },
                // Footer / QR Code & Legal Verification
                {
                    columns: [
                        {
                            width: 108,
                            table: {
                                widths: ['*'],
                                body: [
                                    [
                                        {
                                            stack: [
                                                { qr: verificationUrl, fit: 88, eccLevel: 'M', alignment: 'center', margin: [0, 2, 0, 4] },
                                                { text: 'PINDAI VERIFIKASI', style: 'qrCaptionBold', alignment: 'center' },
                                                { text: 'Validasi Keaslian PR', style: 'qrCaptionSub', alignment: 'center' }
                                            ],
                                            fillColor: '#ffffff',
                                            alignment: 'center'
                                        }
                                    ]
                                ]
                            },
                            layout: {
                                hLineWidth: () => 1,
                                vLineWidth: () => 1,
                                hLineColor: () => '#94a3b8',
                                vLineColor: () => '#94a3b8',
                                paddingLeft: () => 4,
                                paddingRight: () => 4,
                                paddingTop: () => 4,
                                paddingBottom: () => 4,
                            }
                        },
                        {
                            width: '*',
                            margin: [12, 1, 0, 0],
                            stack: [
                                { text: 'LEGALITAS DOKUMEN & INTEGRITAS DIGITAL', style: 'legalHeader' },
                                { 
                                    text: 'Dokumen ini merupakan arsip elektronik resmi yang sah dan diterbitkan melalui Sistem ERP. Seluruh persetujuan berjenjang telah dibubuhkan dengan spesimen tanda tangan digital aktif dan terverifikasi secara kriptografis dalam catatan log audit (audit trail). Keabsahan dokumen dapat divalidasi kapan saja dengan memindai kode QR di samping menggunakan kamera smartphone.',
                                    style: 'legalBody',
                                    margin: [0, 3, 0, 4]
                                },
                                {
                                    text: `Tautan Verifikasi: ${verificationUrl}`,
                                    style: 'legalUrl',
                                    margin: [0, 0, 0, 3]
                                },
                                {
                                    text: `ID Dokumen: ${pr.id} | No PR: ${prNumber} | Dicetak: ${printTimestamp} oleh ${currentUser}`,
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
                metaStatusApproved: { fontSize: 8, bold: true, color: '#059669' },
                tableHeader: { fontSize: 7.5, bold: true, color: '#334155' },
                tableCell: { fontSize: 7.5, color: '#1e293b' },
                tableCellBold: { fontSize: 7.5, bold: true, color: '#0f172a' },
                tableTotalLabel: { fontSize: 8, bold: true, color: '#334155' },
                tableTotalValue: { fontSize: 8.5, bold: true, color: '#0f172a' },
                signRoleHeader: { fontSize: 7, bold: true, color: '#334155', alignment: 'center' },
                signDate: { fontSize: 6.5, color: '#64748b', alignment: 'center', margin: [0, 1, 0, 2] },
                signerName: { fontSize: 7.5, bold: true, color: '#0f172a', alignment: 'center', margin: [0, 2, 0, 0] },
                signerTitle: { fontSize: 6.5, color: '#475569', alignment: 'center' },
                signPlaceholder: { fontSize: 7, italic: true, color: '#94a3b8', alignment: 'center' },
                signNotes: { fontSize: 6, italic: true, color: '#059669', alignment: 'center' },
                qrCaptionBold: { fontSize: 7, bold: true, color: '#0f172a', letterSpacing: 0.3 },
                qrCaptionSub: { fontSize: 6, color: '#64748b' },
                legalHeader: { fontSize: 7.5, bold: true, color: '#334155' },
                legalBody: { fontSize: 6.5, color: '#64748b', leading: 1.2 },
                legalUrl: { fontSize: 6, color: '#2563eb' },
                legalMeta: { fontSize: 6, color: '#94a3b8' }
            },
            defaultStyle: {
                fontSize: 8,
                color: '#1e293b',
            }
        }

        // 7. Trigger PDF Download
        const sanitizedPrNumber = prNumber.replace(/[^a-zA-Z0-9-_]/g, '_')
        const fileName = `${sanitizedPrNumber}_Lembar_Persetujuan.pdf`

        pdfMake.createPdf(docDefinition).download(fileName)

        Swal.close()
        return true
    } catch (err) {
        console.error('PDF Generation Error:', err)
        Swal.fire({
            icon: 'error',
            title: 'Gagal Menghasilkan PDF',
            text: err.message || 'Terjadi kesalahan teknis saat menyusun berkas PDF.',
        })
        return false
    }
}
