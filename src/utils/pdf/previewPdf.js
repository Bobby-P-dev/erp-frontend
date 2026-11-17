import { createApp } from 'vue'

let closeActivePreview = null

// Both preview and download use the same generated PDF bytes.
export const previewPdf = async (blob, fileName) => {
    const { default: PdfPreviewDialog } = await import('../../components/ui/PdfPreviewDialog.vue')
    closeActivePreview?.()
    const url = URL.createObjectURL(blob)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const close = () => {
        app.unmount()
        host.remove()
        URL.revokeObjectURL(url)
        closeActivePreview = null
    }
    const app = createApp(PdfPreviewDialog, { url, fileName, onClose: close })
    app.mount(host)
    closeActivePreview = close
}
