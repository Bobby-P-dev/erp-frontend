import { toast } from 'vue-sonner'
import {
    openConfirmDialog,
    openPromptDialog,
    openLoadingDialog,
    closeGlobalDialog
} from '../composables/useFeedback.js'

/**
 * Modern shadcn-based toast notification for successful operations.
 * @param {string} title
 * @param {string} text
 */
export const showSuccess = (title = 'Berhasil!', text = 'Data berhasil disimpan.') => {
    closeGlobalDialog()
    toast.success(title, {
        description: text,
        duration: 3500
    })
}

/**
 * Modern shadcn-based toast notification for errors.
 * @param {string} title
 * @param {string} text
 * @param {any} error
 */
export const showError = (title = 'Gagal!', text = 'Terjadi kesalahan pada sistem.', error = null) => {
    closeGlobalDialog()
    let errorMessage = text
    if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
    } else if (typeof error === 'string') {
        errorMessage = error
    } else if (error?.message) {
        errorMessage = error.message
    }

    toast.error(title, {
        description: errorMessage,
        duration: 5000
    })
}

/**
 * Shows modern loading overlay.
 * @param {string} title
 * @param {string} text
 */
export const showLoading = (title = 'Memproses Data...', text = 'Mohon tunggu sebentar.') => {
    openLoadingDialog(title, text)
}

/**
 * Closes loading overlay and any active toasts.
 */
export const closeSwal = () => {
    closeGlobalDialog()
    toast.dismiss()
}

/**
 * Modern shadcn AlertDialog for confirmations (submits, approvals, deletions).
 * @param {string} title
 * @param {string} text
 * @param {string|null} confirmButtonText
 * @param {string} cancelButtonText
 * @param {string|null} confirmButtonColor
 * @returns {Promise<boolean>}
 */
export const showConfirm = async (
    title = 'Apakah Anda yakin?',
    text = 'Tindakan ini akan diproses.',
    confirmButtonText = null,
    cancelButtonText = 'Batal',
    confirmButtonColor = null
) => {
    const isDelete = confirmButtonColor === '#ef4444' || confirmButtonColor === '#e11d48' || /hapus|delete/i.test(`${title} ${text}`)
    return await openConfirmDialog({
        title,
        text,
        confirmText: confirmButtonText,
        cancelText: cancelButtonText,
        isDelete
    })
}

/**
 * Modern shadcn AlertDialog with prompt input (rejection, cancellation reason).
 * @param {object} options
 * @returns {Promise<{ isConfirmed: boolean, value: string|null }>}
 */
export const showPrompt = async ({
    title = 'Masukkan Alasan',
    text = '',
    placeholder = 'Tuliskan alasan di sini...',
    confirmText = 'Kirim',
    cancelText = 'Batal',
    isDestructive = false,
    validator = null
} = {}) => {
    return await openPromptDialog({
        title,
        text,
        placeholder,
        confirmText,
        cancelText,
        isDestructive,
        validator
    })
}

/**
 * Compatibility Facade for legacy Swal.fire callers.
 * Seamlessly routes SweetAlert2 calls to shadcn AlertDialog & Sonner.
 */
export const Swal = {
    fire: async (options, maybeText, maybeIcon) => {
        // String signature: Swal.fire('Title', 'Text', 'success')
        if (typeof options === 'string') {
            const title = options
            const text = maybeText || ''
            const icon = maybeIcon || 'info'
            if (icon === 'success') {
                showSuccess(title, text)
                return { isConfirmed: true, value: true }
            }
            if (icon === 'error') {
                showError(title, text)
                return { isConfirmed: true, value: false }
            }
            return { isConfirmed: await showConfirm(title, text), value: true }
        }

        const opt = options || {}
        const {
            title = '',
            text = '',
            icon = 'info',
            input,
            inputPlaceholder,
            confirmButtonText,
            cancelButtonText,
            confirmButtonColor,
            showCancelButton,
            inputValidator
        } = opt

        // 1. Textarea prompt (Reject / Cancel reason dialogs)
        if (input === 'textarea' || input === 'text') {
            const isDestructive = confirmButtonColor === '#e11d48' ||
                confirmButtonColor === '#ef4444' ||
                /batal|reject|tolak|hapus/i.test(`${title} ${confirmButtonText || ''}`)

            return await showPrompt({
                title,
                text,
                placeholder: inputPlaceholder,
                confirmText: confirmButtonText,
                cancelText: cancelButtonText,
                isDestructive,
                validator: inputValidator
            })
        }

        // 2. Loading state dialog
        if (opt.didOpen && !showCancelButton && opt.showConfirmButton === false) {
            showLoading(title, text)
            return { isConfirmed: true }
        }

        // 3. Confirmation dialog
        if (showCancelButton) {
            const isConfirmed = await showConfirm(
                title,
                text,
                confirmButtonText,
                cancelButtonText,
                confirmButtonColor
            )
            return { isConfirmed, isDismissed: !isConfirmed }
        }

        // 4. Notifications / Alerts
        if (icon === 'success') {
            showSuccess(title, text)
            return { isConfirmed: true }
        }
        if (icon === 'error') {
            showError(title, text)
            return { isConfirmed: true }
        }

        toast.info(title, { description: text })
        return { isConfirmed: true }
    },
    close: () => closeSwal(),
    showLoading: () => {}
}

export default Swal
