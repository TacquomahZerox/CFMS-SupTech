import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function generateReferenceNumber(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
}

export function getRiskGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    A: 'text-green-600 bg-green-100',
    B: 'text-yellow-600 bg-yellow-100',
    C: 'text-orange-600 bg-orange-100',
    D: 'text-red-600 bg-red-100',
  };
  return colors[grade] || 'text-gray-600 bg-gray-100';
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    LOW: 'text-blue-600 bg-blue-100',
    MEDIUM: 'text-yellow-600 bg-yellow-100',
    HIGH: 'text-orange-600 bg-orange-100',
    CRITICAL: 'text-red-600 bg-red-100',
  };
  return colors[severity] || 'text-gray-600 bg-gray-100';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'text-green-600 bg-green-100',
    PENDING: 'text-yellow-600 bg-yellow-100',
    VALIDATED: 'text-green-600 bg-green-100',
    REJECTED: 'text-red-600 bg-red-100',
    PROCESSING: 'text-blue-600 bg-blue-100',
    COMPLETED: 'text-green-600 bg-green-100',
    EXPIRED: 'text-gray-600 bg-gray-100',
    CANCELLED: 'text-red-600 bg-red-100',
    UTILIZED: 'text-purple-600 bg-purple-100',
    PARTIALLY_UTILIZED: 'text-orange-600 bg-orange-100',
    OPEN: 'text-red-600 bg-red-100',
    UNDER_REVIEW: 'text-yellow-600 bg-yellow-100',
    RESOLVED: 'text-green-600 bg-green-100',
    ESCALATED: 'text-orange-600 bg-orange-100',
    DISMISSED: 'text-gray-600 bg-gray-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

export function parseCSVDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try different date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,  // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/,  // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/,  // DD-MM-YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
