// Utility functions for formatting data

// Format date to readable string
export const formatDate = (date) => {
    if (!date) return 'N/A';

    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';

        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid Date';
    }
};

// Format currency (Philippine Peso)
export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₱0.00';

    try {
        const num = parseFloat(amount);
        if (isNaN(num)) return '₱0.00';

        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(num);
    } catch (error) {
        return '₱0.00';
    }
};

// Format number with commas
export const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';

    try {
        const number = parseFloat(num);
        if (isNaN(number)) return '0';

        return new Intl.NumberFormat('en-PH').format(number);
    } catch (error) {
        return '0';
    }
};

// Format percentage
export const formatPercentage = (value, decimals = 2) => {
    if (value === null || value === undefined) return '0%';

    try {
        const num = parseFloat(value);
        if (isNaN(num)) return '0%';

        return `${num.toFixed(decimals)}%`;
    } catch (error) {
        return '0%';
    }
};

// Format file size
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format phone number
export const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';

    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');

    // Format Philippine phone number
    if (cleaned.length === 11 && cleaned.startsWith('09')) {
        return `+63 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }

    if (cleaned.length === 10 && cleaned.startsWith('9')) {
        return `+63 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }

    return phone;
};

// Format status text
export const formatStatus = (status) => {
    if (!status) return 'Unknown';

    return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Export to CSV helper
export const exportToCSV = (data, filename = 'export.csv') => {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    try {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    // Escape commas and quotes
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error exporting to CSV:', error);
    }
};
