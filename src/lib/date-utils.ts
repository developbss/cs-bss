/**
 * Parse a database timestamp as UTC — nuclear approach.
 * Strips ALL timezone suffixes and forces UTC interpretation.
 * Neon PostgreSQL stores in UTC via NOW(), so this is always correct.
 */
export function parseDbDate(dateStr: string | Date): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  // Strip any timezone indicator (Z, +00:00, +0000, -07:00, etc.) and force UTC
  const base = str.replace(/([+-]\d{2}:?\d{2}|Z)\s*$/, '').replace(' ', 'T');
  return new Date(base + 'Z');
}

/**
 * Format a database timestamp as HH:mm in WIB (Asia/Jakarta) timezone.
 * Uses explicit timeZone to guarantee correct display regardless of browser TZ.
 */
export function formatTimeWIB(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === 'string' ? parseDbDate(dateStr) : dateStr;
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    });
  } catch {
    return '';
  }
}

/**
 * Get YYYY-MM-DD date string in WIB timezone.
 */
export function getWibDateString(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? parseDbDate(dateStr) : dateStr;
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // en-CA gives YYYY-MM-DD
}

/**
 * Get today's YYYY-MM-DD in WIB timezone.
 */
export function getTodayWIB(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

/**
 * Get yesterday's YYYY-MM-DD in WIB timezone.
 */
export function getYesterdayWIB(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

/**
 * Format a date as a localized date label in WIB:
 * "Hari Ini", "Kemarin", day name, or "d MMM yyyy"
 */
export function getDateLabelWIB(dateStr: string): string {
  const wibDate = getWibDateString(dateStr);
  const today = getTodayWIB();
  const yesterday = getYesterdayWIB();

  if (wibDate === today) return 'Hari Ini';
  if (wibDate === yesterday) return 'Kemarin';

  const d = parseDbDate(dateStr);
  // Check if within last 7 days
  const daysDiff = Math.floor((new Date(today).getTime() - new Date(wibDate).getTime()) / 86400000);
  if (daysDiff < 7) {
    return d.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}
