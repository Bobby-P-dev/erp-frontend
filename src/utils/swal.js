import Swal from 'sweetalert2'

export const showLoading = (title = 'Memproses Data...', text = 'Mohon tunggu sebentar.') => {
    Swal.fire({
        title: title,
        text: text,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading()
        }
    })
}

export const showSuccess = (title = 'Berhasil!', text = 'Data berhasil disimpan.') => {
    Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        confirmButtonColor: '#4f46e5',
        timer: 2000,
        timerProgressBar: true
    })
}

export const showError = (title = 'Gagal!', text = 'Terjadi kesalahan pada sistem.', error = null) => {
    let errorMessage = text
    if (error && error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message
    }

    Swal.fire({
        icon: 'error',
        title: title,
        text: errorMessage,
        confirmButtonColor: '#4f46e5'
    })
}

export const closeSwal = () => {
    Swal.close()
}

export const showConfirm = async (
    title = 'Apakah Anda yakin?', 
    text = 'Tindakan ini akan diproses.', 
    confirmButtonText = null, 
    cancelButtonText = 'Batal',
    confirmButtonColor = null
) => {
    const isDelete = /hapus|delete/i.test(title + ' ' + text)
    const btnText = confirmButtonText || (isDelete ? 'Ya, Hapus!' : 'Ya, Lanjutkan')
    const btnColor = confirmButtonColor || (isDelete ? '#ef4444' : '#4f46e5')
    const icon = isDelete ? 'warning' : 'question'

    return Swal.fire({
        title: title,
        text: text,
        icon: icon,
        showCancelButton: true,
        confirmButtonColor: btnColor, 
        cancelButtonColor: '#6b7280', 
        confirmButtonText: btnText,
        cancelButtonText: cancelButtonText
    }).then((result) => {
        return result.isConfirmed
    })
}

