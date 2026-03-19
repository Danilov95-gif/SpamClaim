import { formatHebrewDate, formatTime } from '../utils/date.js';

export interface WarningLetterData {
  // Sender (user / plaintiff)
  senderName: string;
  senderPhone: string;
  senderAddress: string;

  // Recipient (business / defendant)
  businessName: string;
  businessAddress: string | null;
  companyNumber: string | null;

  // Spam message details
  spamPhone: string;        // Numeric phone (may be empty for sender-ID cases)
  spamSenderId: string | null; // Alphanumeric Sender ID (e.g. "BANK")
  senderDisplay: string;    // What to show in the letter: phone if available, else sender ID
  spamDate: string;         // Pre-formatted Hebrew date
  spamTime: string | null;

  // Document metadata
  documentDate: string; // Today's date in Hebrew
  referenceNumber: string; // Unique reference e.g. SC-1710500000-1234
  claimAmount: number;
}

export function buildWarningLetterData(params: {
  user: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    address: string | null;
  };
  business: {
    name: string;
    address: string | null;
    companyNumber: string | null;
  } | null;
  spamCase: {
    senderPhone: string | null;
    senderIdRaw: string | null;
    spamReceivedAt: Date | null;
  };
  claimAmount?: number;
}): WarningLetterData {
  const { user, business, spamCase, claimAmount = 1000 } = params;

  const senderName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'לא ידוע';
  const senderPhone = user.phone ?? '';
  const senderAddress = user.address ?? '';

  const spamDate = spamCase.spamReceivedAt
    ? formatHebrewDate(spamCase.spamReceivedAt)
    : formatHebrewDate(new Date());

  const spamTime = spamCase.spamReceivedAt ? formatTime(spamCase.spamReceivedAt) : null;

  const referenceNumber = `SC-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;

  const spamPhone = spamCase.senderPhone ?? '';
  const spamSenderId = spamCase.senderIdRaw ?? null;
  const senderDisplay = spamPhone || spamSenderId || '';

  return {
    senderName,
    senderPhone,
    senderAddress,
    businessName: business?.name ?? 'לא ידוע',
    businessAddress: business?.address ?? null,
    companyNumber: business?.companyNumber ?? null,
    spamPhone,
    spamSenderId,
    senderDisplay,
    spamDate,
    spamTime,
    documentDate: formatHebrewDate(new Date()),
    referenceNumber,
    claimAmount,
  };
}

// Hebrew legal text for each paragraph in the warning letter
export const WARNING_PARAGRAPHS = {
  opening: (data: WarningLetterData): string => {
    const senderLabel = data.spamPhone
      ? `ממספר הטלפון ${data.spamPhone}`
      : data.spamSenderId
        ? `מהשולח "${data.spamSenderId}"`
        : '';
    return `הנני פונה אליכם בעניין הודעת פרסומת שנשלחה אלי ביום ${data.spamDate}${data.spamTime ? ` בשעה ${data.spamTime}` : ''}${senderLabel ? ` ${senderLabel}` : ''}. הודעה זו לא נדרשה על ידי ולא ניתנה לה כל הסכמה מראש.`;
  },

  lawReference: (): string =>
    `בהתאם לסעיף 30א לחוק התקשורת (בזק ושידורים), תשמ"ב-1982, חל איסור מפורש על שליחת דבר פרסומת ללא קבלת הסכמה מפורשת מראש של הנמען. הסעיף מקנה לנמען זכות לפיצוי קבוע של עד 1,000 ש"ח לכל הודעה, ללא הוכחת נזק. שליחת ההודעה האמורה מהווה הפרה מפורשת של הוראות החוק.`,

  demand: (data: WarningLetterData): string =>
    `הנני דורש/ת מכם כי בתוך 14 יום ממועד קבלת מכתב זה תפעלו לביצוע שני אלה: ראשית, מחיקת פרטי מרשימות הדיוור שלכם ומכל מאגר מידע בחזקתכם; שנית, תשלום פיצוי בסך ${data.claimAmount} ש"ח בהתאם לזכאות הקבועה בחוק ללא הוכחת נזק.`,

  warning: (): string =>
    `אם לא תיענו לדרישתי במלואה בתוך המועד האמור, אהיה רשאי/ת לפנות ללא הודעה נוספת לבית משפט לתביעות קטנות לאכיפת זכויותי. במסגרת הליך משפטי שכזה אדרוש גם החזר הוצאות משפטיות ואגרות בית משפט.`,

  disclaimer: (): string =>
    `מסמך זה הוכן באמצעות כלי אוטומטי ואינו מהווה ייעוץ משפטי.`,
};
