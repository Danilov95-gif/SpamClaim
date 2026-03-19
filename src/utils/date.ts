/**
 * Hebrew Date Utilities
 * Format dates in Hebrew for legal documents
 */

const HEBREW_MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

const HEBREW_DAYS = [
  'ראשון',
  'שני',
  'שלישי',
  'רביעי',
  'חמישי',
  'שישי',
  'שבת',
];

/**
 * Format date in Hebrew for documents
 * Example: "19 בפברואר 2026"
 */
export function formatHebrewDate(date: Date): string {
  const day = date.getDate();
  const month = HEBREW_MONTHS[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ב${month} ${year}`;
}

/**
 * Format date with day name
 * Example: "יום שני, 19 בפברואר 2026"
 */
export function formatHebrewDateWithDay(date: Date): string {
  const dayName = HEBREW_DAYS[date.getDay()];
  return `יום ${dayName}, ${formatHebrewDate(date)}`;
}

/**
 * Format date and time
 * Example: "19 בפברואר 2026, 14:30"
 */
export function formatHebrewDateTime(date: Date): string {
  const time = date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatHebrewDate(date)}, ${time}`;
}

/**
 * Format just the time
 * Example: "14:30"
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format relative date
 * Example: "לפני 3 ימים", "היום", "מחר"
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'מחר';
  if (diffDays === -1) return 'אתמול';
  if (diffDays > 1) return `בעוד ${diffDays} ימים`;
  if (diffDays < -1) return `לפני ${Math.abs(diffDays)} ימים`;

  return formatHebrewDate(date);
}

/**
 * Parse common date formats from OCR text
 */
export function parseDateFromText(text: string): Date | null {
  // Try common formats

  // DD/MM/YYYY or DD.MM.YYYY
  const slashMatch = text.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (slashMatch) {
    const day = slashMatch[1];
    const month = slashMatch[2];
    const year = slashMatch[3];
    if (!day || !month || !year) return null;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
  }

  // Hebrew format: 19 בפברואר 2026
  for (let i = 0; i < HEBREW_MONTHS.length; i++) {
    const month = HEBREW_MONTHS[i];
    const regex = new RegExp(`(\\d{1,2})\\s*ב?${month}\\s*(\\d{4})`);
    const match = text.match(regex);
    if (match) {
      const day = match[1];
      const year = match[2];
      if (!day || !year) continue;
      return new Date(parseInt(year), i, parseInt(day));
    }
  }

  return null;
}

/**
 * Parse time from text
 * Returns hours and minutes
 */
export function parseTimeFromText(text: string): { hours: number; minutes: number } | null {
  // HH:MM or H:MM
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = match[1];
    const minutes = match[2];
    if (!hours || !minutes) return null;
    return {
      hours: parseInt(hours),
      minutes: parseInt(minutes),
    };
  }

  return null;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get date X days from now
 */
export function daysFromNow(days: number): Date {
  return addDays(new Date(), days);
}
