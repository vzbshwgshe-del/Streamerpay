export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Exclusively formats amounts in Indian Rupees (INR) using Indian number grouping (e.g., ₹1,000, ₹20).
 */
export function formatCurrency(amount: number, _currency: string = 'INR'): string {
  if (isNaN(amount)) return '₹0';

  const isWhole = amount % 1 === 0;
  try {
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: isWhole ? 0 : 2,
      minimumFractionDigits: isWhole ? 0 : 2,
    }).format(amount);
    return `₹${formatted}`;
  } catch {
    return `₹${amount.toFixed(isWhole ? 0 : 2)}`;
  }
}

export function formatTimeAgo(timestamp: number | string): string {
  const now = Date.now();
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}
