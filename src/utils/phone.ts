/**
 * Israeli Phone Number Utilities
 * Validation, formatting, and extraction
 */

/**
 * Check if a string is a valid Israeli phone number
 */
export function isIsraeliPhone(phone: string): boolean {
  // Remove all non-digits except * and +
  const cleaned = phone.replace(/[^\d*+]/g, '');

  // Israeli mobile: 05X-XXXXXXX (10 digits starting with 05)
  if (/^05\d{8}$/.test(cleaned)) return true;

  // Israeli mobile with country code: +9725XXXXXXXX
  if (/^\+9725\d{8}$/.test(cleaned)) return true;
  if (/^9725\d{8}$/.test(cleaned)) return true;

  // Israeli landline: 0X-XXXXXXX (9 digits starting with 0, not 05)
  if (/^0[2-489]\d{7}$/.test(cleaned)) return true;

  // Short codes: *XXXX
  if (/^\*\d{4}$/.test(phone)) return true;

  // Toll-free and special: 1-800, 1-700, 1-599, etc.
  if (/^1[578]\d{8}$/.test(cleaned)) return true;

  // *Digit codes (like *6423)
  if (/^\*\d{4,6}$/.test(phone)) return true;

  return false;
}

/**
 * Format a phone number to standard Israeli format
 */
export function formatIsraeliPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d*+]/g, '');

  // Mobile: 05X-XXX-XXXX
  if (/^05\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Mobile with country code
  if (/^\+?9725\d{8}$/.test(cleaned)) {
    const digits = cleaned.replace(/^\+?972/, '0');
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Landline: 0X-XXX-XXXX
  if (/^0[2-489]\d{7}$/.test(cleaned)) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
  }

  // Toll-free: 1-800-XXX-XXX
  if (/^1[578]\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Short codes stay as-is
  if (/^\*\d{4,6}$/.test(phone)) {
    return phone;
  }

  // Return as-is if no match
  return phone;
}

/**
 * Extract all phone numbers from text
 */
export function extractPhoneNumbers(text: string): string[] {
  const phones: string[] = [];

  // Patterns to look for
  const patterns = [
    // Mobile: 050-123-4567, 050-1234567, 0501234567
    /05\d[\s-]?\d{3}[\s-]?\d{4}/g,

    // Mobile with country code: +972-50-123-4567
    /\+?972[\s-]?5\d[\s-]?\d{3}[\s-]?\d{4}/g,

    // Landline: 02-123-4567, 03-1234567
    /0[2-489][\s-]?\d{3}[\s-]?\d{4}/g,

    // Short codes: *1234, *12345
    /\*\d{4,6}/g,

    // Toll-free: 1-800-123-456, 1800123456
    /1[578]00[\s-]?\d{3}[\s-]?\d{3}/g,

    // Generic toll-free: 1-700-123-456
    /1[578]\d{2}[\s-]?\d{3}[\s-]?\d{3}/g,
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const cleaned = match.replace(/[\s-]/g, '');
        if (isIsraeliPhone(cleaned) && !phones.includes(cleaned)) {
          phones.push(cleaned);
        }
      }
    }
  }

  return phones.map(formatIsraeliPhone);
}

/**
 * Normalize phone number for database storage/comparison
 */
export function normalizePhone(phone: string): string {
  // Remove everything except digits
  let digits = phone.replace(/[^\d]/g, '');

  // Handle country code
  if (digits.startsWith('972')) {
    digits = '0' + digits.slice(3);
  }

  return digits;
}

/**
 * Check if two phone numbers are the same
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  return normalizePhone(phone1) === normalizePhone(phone2);
}
