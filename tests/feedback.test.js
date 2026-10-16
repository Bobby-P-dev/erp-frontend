import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    dialogState,
    openConfirmDialog,
    openPromptDialog,
    openLoadingDialog,
    closeGlobalDialog,
    useFeedback
} from '../src/composables/useFeedback.js'
import {
    showSuccess,
    showError,
    showLoading,
    closeSwal,
    showConfirm,
    showPrompt,
    Swal
} from '../src/utils/swal.js'

describe('Modern Feedback & Dialog System (shadcn-vue backend)', () => {
    it('initializes dialog state with closed status', () => {
        const { dialogState: state } = useFeedback()
        assert.equal(typeof state.value, 'object')
        assert.equal(state.value.isOpen, false)
    })

    it('opens confirm dialog and detects destructive actions automatically', async () => {
        const promise = openConfirmDialog({
            title: 'Hapus Item Barang?',
            text: 'Data yang dihapus tidak dapat dipulihkan.'
        })

        assert.equal(dialogState.value.isOpen, true)
        assert.equal(dialogState.value.type, 'danger')
        assert.equal(dialogState.value.confirmText, 'Ya, Hapus!')

        // Simulate user confirming
        dialogState.value.resolve(true)
        const result = await promise
        assert.equal(result, true)
        assert.equal(dialogState.value.isOpen, false)
    })

    it('opens standard confirm dialog for constructive actions', async () => {
        const promise = openConfirmDialog({
            title: 'Ajukan Pembayaran?',
            text: 'Permintaan pembayaran akan dikirimkan ke finance.'
        })

        assert.equal(dialogState.value.isOpen, true)
        assert.equal(dialogState.value.type, 'confirm')
        assert.equal(dialogState.value.confirmText, 'Ya, Lanjutkan')

        // Simulate user canceling
        dialogState.value.resolve(false)
        const result = await promise
        assert.equal(result, false)
        assert.equal(dialogState.value.isOpen, false)
    })

    it('opens prompt dialog for rejection / cancellation with textarea validator', async () => {
        const promise = openPromptDialog({
            title: 'Batalkan Rencana Pengadaan?',
            text: 'Masukkan alasan pembatalan:',
            placeholder: 'Tuliskan alasan...',
            isDestructive: true
        })

        assert.equal(dialogState.value.isOpen, true)
        assert.equal(dialogState.value.type, 'prompt')
        assert.equal(dialogState.value.isDestructive, true)
        assert.equal(typeof dialogState.value.validator, 'function')

        // Test default validator
        assert.ok(dialogState.value.validator(''))
        assert.equal(dialogState.value.validator('Alasan spesifik'), null)

        // Simulate submission
        dialogState.value.resolve({ isConfirmed: true, value: 'Harga melebihi pagu' })
        const result = await promise
        assert.equal(result.isConfirmed, true)
        assert.equal(result.value, 'Harga melebihi pagu')
    })

    it('handles loading dialog and closeGlobalDialog correctly', () => {
        openLoadingDialog('Mengunggah Berkas...', 'Mohon tunggu')
        assert.equal(dialogState.value.isOpen, true)
        assert.equal(dialogState.value.type, 'loading')
        assert.equal(dialogState.value.showCancel, false)

        closeGlobalDialog()
        assert.equal(dialogState.value.isOpen, false)
    })

    it('ensures showSuccess automatically dismisses active loading dialog', () => {
        openLoadingDialog('Menyimpan Data...', 'Mohon tunggu sebentar')
        assert.equal(dialogState.value.isOpen, true)
        assert.equal(dialogState.value.type, 'loading')

        showSuccess('Berhasil!', 'Data tersimpan')
        assert.equal(dialogState.value.isOpen, false)
    })

    it('ensures showError automatically dismisses active loading dialog', () => {
        openLoadingDialog('Menyimpan Data...', 'Mohon tunggu sebentar')
        assert.equal(dialogState.value.isOpen, true)
        assert.equal(dialogState.value.type, 'loading')

        showError('Gagal!', 'Terjadi kesalahan sistem')
        assert.equal(dialogState.value.isOpen, false)
    })

    it('exports all expected swal functions for full backward compatibility', () => {
        assert.equal(typeof showSuccess, 'function')
        assert.equal(typeof showError, 'function')
        assert.equal(typeof showLoading, 'function')
        assert.equal(typeof closeSwal, 'function')
        assert.equal(typeof showConfirm, 'function')
        assert.equal(typeof showPrompt, 'function')
        assert.equal(typeof Swal.fire, 'function')
        assert.equal(typeof Swal.close, 'function')
    })

    it('Swal.fire facade properly routes textarea inputs to prompt mode', async () => {
        const promise = Swal.fire({
            title: 'Tolak Pengajuan',
            input: 'textarea',
            inputPlaceholder: 'Alasan penolakan',
            confirmButtonText: 'Tolak',
            confirmButtonColor: '#e11d48'
        })

        assert.equal(dialogState.value.isOpen, true)
        assert.equal(dialogState.value.type, 'prompt')
        assert.equal(dialogState.value.isDestructive, true)

        dialogState.value.resolve({ isConfirmed: true, value: 'Spesifikasi tidak sesuai' })
        const result = await promise
        assert.equal(result.isConfirmed, true)
        assert.equal(result.value, 'Spesifikasi tidak sesuai')
    })

    it('Swal.fire facade properly routes confirm dialogs with showCancelButton', async () => {
        const promise = Swal.fire({
            title: 'Setujui Permintaan?',
            showCancelButton: true,
            confirmButtonText: 'Ya, Setujui'
        })

        assert.equal(dialogState.value.isOpen, true)
        dialogState.value.resolve(true)
        const result = await promise
        assert.equal(result.isConfirmed, true)
    })
})
