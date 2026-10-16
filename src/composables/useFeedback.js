import { ref } from 'vue'

export const dialogState = ref({
    isOpen: false,
    title: '',
    text: '',
    type: 'confirm', // 'confirm' | 'danger' | 'prompt' | 'loading'
    confirmText: 'Ya, Lanjutkan',
    cancelText: 'Batal',
    showCancel: true,
    placeholder: '',
    inputValue: '',
    validationError: '',
    validator: null,
    resolve: null,
})

export const openConfirmDialog = ({
    title = 'Apakah Anda yakin?',
    text = 'Tindakan ini akan diproses.',
    confirmText = null,
    cancelText = 'Batal',
    isDelete = false,
    type = null
} = {}) => {
    const isDestructive = isDelete || /hapus|delete|batal/i.test(`${title} ${text}`)
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
        openConfirmDialog,
        openPromptDialog,
        openLoadingDialog,
        closeGlobalDialog
    }
}
