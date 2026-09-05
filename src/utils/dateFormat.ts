import { format } from 'date-fns';

/**
 * Returns ordinal indicator for numbers (1 -> 1st, 2 -> 2nd, 3 -> 3rd, 12 -> 12th)
 */
function getOrdinalNumber(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Robust date parser that correctly handles:
 * - Indian date format (DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY)
 * - ISO date strings (YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss.sssZ)
 * - Excel numeric serial dates
 * - Date objects
 */
export function parseAppDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    if (val > 20000 && val < 60000) {
      // Excel serial date number (days since Dec 30 1899)
      return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(val).trim();
  if (!str) return null;

  // 1. Check Indian format: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    let hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 12;
    const mins = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const secs = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const ampm = dmyMatch[7] ? dmyMatch[7].toUpperCase() : '';
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      // Create date safely in UTC noon to avoid any timezone boundary slips
      const d = new Date(Date.UTC(year, month, day, hours, mins, secs));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 2. Check ISO format: YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    if (str.includes('T') || str.includes(':')) {
      const direct = new Date(str);
      if (!isNaN(direct.getTime())) return direct;
    }
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day, 6, 0, 0));
    }
  }

  const direct = new Date(str);
  return isNaN(direct.getTime()) ? null : direct;
}

/**
 * Formats a date value uniformly across the entire app.
 * Standard display format: "12th June, 2026"
 * If includeTime is true and time is meaningful: "12th June, 2026 • 10:30 AM"
 */
export function formatAppDate(val: any, includeTime: boolean = false): string {
  const d = parseAppDate(val);
  if (!d) return val ? String(val) : 'N/A';
  
  try {
    // Format using Asia/Kolkata timezone to ensure consistency everywhere
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: includeTime ? 'numeric' : undefined,
      minute: includeTime ? 'numeric' : undefined,
      hour12: true
    });

    const parts = formatter.formatToParts(d);
    let day = '';
    let month = '';
    let year = '';
    let hour = '';
    let minute = '';
    let dayPeriod = '';

    for (const part of parts) {
      if (part.type === 'day') day = part.value;
      if (part.type === 'month') month = part.value;
      if (part.type === 'year') year = part.value;
      if (part.type === 'hour') hour = part.value;
      if (part.type === 'minute') minute = part.value;
      if (part.type === 'dayPeriod') dayPeriod = part.value.toUpperCase();
    }

    const dateStr = `${getOrdinalNumber(Number(day))} ${month}, ${year}`;
    if (includeTime && hour && minute && (hour !== '12' || minute !== '00' || dayPeriod !== 'AM')) {
      const timeStr = `${hour}:${minute.padStart(2, '0')} ${dayPeriod}`;
      return `${dateStr} • ${timeStr}`;
    }
    return dateStr;
  } catch {
    return format(d, "do MMMM, yyyy");
  }
}

/**
 * Returns formatted date for receipts and official records:
 * "12th June, 2026 • 10:30 AM"
 */
export function formatReceiptDate(val: any): string {
  return formatAppDate(val, true);
}

/**
 * Returns standard ISO YYYY-MM-DD for form input[type=date]
 */
export function toInputDateFormat(val: any): string {
  const d = parseAppDate(val);
  if (!d) return format(new Date(), 'yyyy-MM-dd');
  
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch {
    return format(d, 'yyyy-MM-dd');
  }
}

/**
 * Returns formatted numeric date in Indian standard format: DD-MM-YYYY (e.g. 05-09-2026)
 * Computed strictly in Asia/Kolkata timezone.
 */
export function formatDateDDMMYYYY(val: any): string {
  const d = parseAppDate(val);
  if (!d) return val ? String(val) : '';
  
  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const parts = formatter.formatToParts(d);
    let day = '01';
    let month = '01';
    let year = '2026';
    for (const part of parts) {
      if (part.type === 'day') day = part.value.padStart(2, '0');
      if (part.type === 'month') month = part.value.padStart(2, '0');
      if (part.type === 'year') year = part.value;
    }
    return `${day}-${month}-${year}`;
  } catch {
    return format(d, 'dd-MM-yyyy');
  }
}
