export const truncateText = (text, maxLength) => {
    if (!text) {
        return '';
    }

    if (text.length > maxLength) {
        return text.substring(0, maxLength) + '...';
    }

    return text;
};

export const formatCurrency = (amount, currency = 'IDR') => {
    if (amount === null || amount === undefined || amount === '') {
        return '-';
    }
    const numeric = Number(amount);
    if (isNaN(numeric)) {
        return '-';
    }
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(numeric);
};

export const parseCurrency = (str) => {
    if (typeof str === 'number') return str;
    if (!str) return null;
    let s = String(str).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) {
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
    }
    s = s.replace(/[^0-9.,-]/g, '');
    if (!s) return null;
    if (s.includes('.') && s.includes(',')) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes('.')) {
        const parts = s.split('.');
        if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
            s = s.replace(/\./g, '');
        }
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
};
