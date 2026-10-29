import { ref } from 'vue'

export const dialogState = ref({
    isOpen: false,
    title: '',
    text: '',
    type: 'confirm', // 'confirm' | 'danger' | 'prompt' | 'loading' | 'success' | 'error' | 'info'
    confirmText: 'Ya, Lanjutkan',
    cancelText: 'Batal',
    showCancel: true,
    placeholder: '',
    inputValue: '',
    validationError: '',
    validator: null,
    resolve: null,
})

let autoCloseTimer = null

const clearAutoCloseTimer = () => {
    if (autoCloseTimer) {
        clearTimeout(autoCloseTimer)
        autoCloseTimer = null
    }
}

export const openAlertDialog = ({
    title = 'Informasi',
    text = '',
    type = 'info', // 'success' | 'error' | 'info'
    confirmText = 'Tutup',
    autoCloseMs = 0
} = {}) => {
    clearAutoCloseTimer()
    return new Promise((resolve) => {
        dialogState.value = {
            isOpen: true,
            title,
            text,
            type,
            confirmText: confirmText || (type === 'success' ? 'OK, Mengerti' : 'Tutup'),
            cancelText: '',
            showCancel: false,
            placeholder: '',
            inputValue: '',
            validationError: '',
            validator: null,
            resolve: (val) => {
                clearAutoCloseTimer()
                dialogState.value.isOpen = false
                resolve(val)
            }
        }

        if (autoCloseMs && autoCloseMs > 0) {
            autoCloseTimer = setTimeout(() => {
                if (dialogState.value.isOpen && dialogState.value.type === type) {
                    dialogState.value.isOpen = false
                    resolve(true)
                }
            }, autoCloseMs)
        }
    })
}

export const openConfirmDialog = ({
    title = 'Apakah Anda yakin?',
    text = 'Tindakan ini akan diproses.',
    confirmText = null,
    cancelText = 'Batal',
    isDelete = false,
    type = null
} = {}) => {
    const isDestructive = isDelete || /hapus|delete|batal/i.test(`${title} ${text}`)
    clearAutoCloseTimer()
    return new Promise((resolve) => {
        dialogState.value = {
            isOpen: true,
            title,
            text,
            type: type || (isDestructive ? 'danger' : 'confirm'),
            confirmText: confirmText || (isDestructive ? 'Ya, Hapus!' : 'Ya, Lanjutkan'),
            cancelText,
            showCancel: true,
            placeholder: '',
            inputValue: '',
            validationError: '',
            validator: null,
            resolve: (val) => {
                dialogState.value.isOpen = false
                resolve(val)
            }
        }
    })
}

export const openPromptDialog = ({
    title = 'Masukkan Alasan',
    text = '',
    placeholder = 'Tuliskan alasan di sini...',
    confirmText = 'Kirim',
    cancelText = 'Batal',
    isDestructive = false,
    validator = null
} = {}) => {
    clearAutoCloseTimer()
    return new Promise((resolve) => {
        dialogState.value = {
            isOpen: true,
            title,
            text,
            type: 'prompt',
            isDestructive,
            confirmText: confirmText || (isDestructive ? 'Ya, Lanjutkan' : 'Kirim'),
            cancelText: cancelText || 'Batal',
            showCancel: true,
            placeholder,
            inputValue: '',
            validationError: '',
            validator: validator || ((val) => (!val || !val.trim() ? 'Alasan wajib diisi!' : null)),
            resolve: (result) => {
                dialogState.value.isOpen = false
                resolve(result)
            }
        }
    })
}

export const openLoadingDialog = (title = 'Memproses Data...', text = 'Mohon tunggu sebentar.') => {
    clearAutoCloseTimer()
    dialogState.value = {
        isOpen: true,
        title,
        text,
        type: 'loading',
        confirmText: '',
        cancelText: '',
        showCancel: false,
        placeholder: '',
        inputValue: '',
        validationError: '',
        validator: null,
        resolve: null
    }
}

export const closeGlobalDialog = () => {
    clearAutoCloseTimer()
    if (dialogState.value.isOpen) {
        if (dialogState.value.resolve) {
            if (dialogState.value.type === 'prompt') {
                dialogState.value.resolve({ isConfirmed: false, value: null })
            } else {
                dialogState.value.resolve(false)
            }
        }
        dialogState.value.isOpen = false
    }
}

export const useFeedback = () => {
    return {
        dialogState,
        openAlertDialog,
        openConfirmDialog,
        openPromptDialog,
        openLoadingDialog,
        closeGlobalDialog
    }
}
