/**
 * SpamClaim Bot - Hebrew Messages
 * All user-facing messages in one place for easy editing
 */

export const MESSAGES = {
  // ============================================
  // Welcome & Help
  // ============================================
  WELCOME: `שלום! 👋
אני הבוט של SpamClaim - עוזר לך להילחם בספאם.

📱 שלח לי צילום מסך של הודעת ספאם שקיבלת, ואני אעזור לך להכין מכתב התראה או כתב תביעה.

/help - עזרה
/status - התיקים שלי`,

  HELP: `📚 *עזרה - SpamClaim Bot*

*איך זה עובד?*
1️⃣ שלח צילום מסך של הודעת ספאם
2️⃣ אני מזהה את השולח
3️⃣ בחר: מכתב התראה או תביעה
4️⃣ קבל מסמך מוכן!

*מכתב התראה (מומלץ)*
70-80% מהמקרים נפתרים כך ללא בית משפט.
שולחים, מחכים 14 יום, ולרוב מקבלים פיצוי.

*כתב תביעה*
אם מכתב ההתראה לא עזר, או שאתה רוצה ישר לבית משפט.

*פקודות:*
/start - התחלה מחדש
/status - התיקים שלי
/settings - הפרטים שלי
/help - העזרה הזו

*שאלות?*
צור קשר דרך הבוט`,

  // ============================================
  // Photo Processing
  // ============================================
  PROCESSING: '🔍 מעבד את התמונה...',

  PROCESSING_ERROR: `❌ לא הצלחתי לעבד את התמונה.
נסה שוב עם תמונה ברורה יותר.`,

  NO_PHONE_FOUND: `🤔 לא הצלחתי לזהות מספר טלפון בתמונה.

נסה שוב עם:
• תמונה ברורה יותר
• צילום מסך שכולל את מספר השולח
• קיצוץ של אזור ההודעה בלבד`,

  OCR_SUCCESS: (phone: string, business: string | null, date: string | null) => `✅ זיהיתי את ההודעה!

📞 מספר שולח: ${phone}
🏢 עסק: ${business || 'לא זוהה'}
📅 תאריך: ${date || 'לא זוהה'}

מה תרצה לעשות?`,

  // ============================================
  // Business Identification
  // ============================================
  BUSINESS_MATCHES: (matches: Array<{ name: string; address?: string }>) => {
    let msg = '🏢 זיהיתי כמה עסקים אפשריים:\n\n';
    matches.forEach((m, i) => {
      msg += `${i + 1}️⃣ ${m.name}`;
      if (m.address) msg += `\n   ${m.address}`;
      msg += '\n\n';
    });
    msg += 'בחר את העסק הנכון, או הזן ידנית.';
    return msg;
  },

  BUSINESS_NOT_FOUND: `🔍 לא מצאתי את העסק במאגר.

אנא הזן את שם העסק:`,

  BUSINESS_CONFIRMED: (name: string) => `✅ נרשם: ${name}`,

  // ============================================
  // User Details Collection
  // ============================================
  ASK_NAME: `כדי להכין את המסמך, אני צריך כמה פרטים.

מה השם המלא שלך?`,

  ASK_PHONE: `מעולה! 📱

מה מספר הטלפון שלך?`,

  ASK_ADDRESS: `👍

מה הכתובת שלך? (עיר ורחוב)`,

  DETAILS_SAVED: `✅ הפרטים נשמרו!`,

  SAVED_DETAILS: (name: string, phone: string, address: string) =>
    `נמצאו הפרטים השמורים שלך:\n\n👤 שם: ${name}\n📱 טלפון: ${phone}\n📍 כתובת: ${address}\n\nהאם להשתמש בפרטים אלה?`,

  INVALID_PHONE: `❌ מספר הטלפון לא תקין.
הזן מספר ישראלי (לדוגמה: 050-1234567)`,

  // ============================================
  // Warning Letter
  // ============================================
  WARNING_GENERATING: '📄 מכין את מכתב ההתראה...',

  WARNING_READY: `📄 מכתב ההתראה מוכן!

*הנחיות לשליחה:*
1️⃣ שלח בדואר רשום עם אישור מסירה
   _או_
2️⃣ שלח במייל + WhatsApp/SMS כגיבוי
3️⃣ שמור את אישור השליחה!

⏰ אחזור אליך בעוד 7 ימים לבדוק אם שלחת.`,

  // ============================================
  // Claim Document
  // ============================================
  CLAIM_GENERATING: '⚖️ מכין את כתב התביעה...',

  CLAIM_READY: (amount: number) => `⚖️ כתב התביעה מוכן!

*סכום התביעה:* ${amount} ש"ח
*אגרת בית משפט:* ${Math.max(50, Math.round(amount * 0.01))} ש"ח

*הגשה:*
1️⃣ היכנס ל-net.hamishpat.gov.il
2️⃣ התחבר עם תעודת זהות
3️⃣ בחר "הגשת תביעה קטנה"
4️⃣ העלה את הקובץ המצורף

בהצלחה! 💪`,

  // ============================================
  // Reminders
  // ============================================
  REMINDER_DAY_7: (business: string) => `⏰ *תזכורת*

לפני שבוע הכנת מכתב התראה נגד *${business}*.

האם שלחת אותו?`,

  REMINDER_DAY_14: (business: string) => `⏰ *תזכורת חשובה*

עברו 14 יום מאז ששלחת מכתב התראה ל-*${business}*.

האם קיבלת תשובה?`,

  // ============================================
  // Status
  // ============================================
  STATUS_EMPTY: `📊 אין לך עדיין תיקים פתוחים.

שלח צילום מסך של הודעת ספאם כדי להתחיל!`,

  STATUS_HEADER: (open: number, resolved: number, waiting: number) => `📊 *התיקים שלך*

🟢 *פתוחים:* ${open}
✅ *נסגרו בהצלחה:* ${resolved}
⏳ *ממתינים לתגובה:* ${waiting}

*תיקים אחרונים:*`,

  STATUS_CASE: (business: string, status: string, date: string) => 
    `• ${business} - ${status} (${date})`,

  // ============================================
  // Actions & Confirmations
  // ============================================
  ACTION_CANCELLED: '❌ הפעולה בוטלה.',

  SAVED_FOR_LATER: '📊 ההודעה נשמרה למאגר.',

  CASE_RESOLVED: '✅ מעולה! התיק נסגר בהצלחה.',

  CASE_ESCALATED: 'מעבר להכנת כתב תביעה...',

  SNOOZE_CONFIRMED: (days: number) => `⏸️ תזכורת נדחתה ל-${days} ימים.`,

  // ============================================
  // Errors
  // ============================================
  GENERIC_ERROR: `❌ משהו השתבש. נסה שוב.`,

  RATE_LIMITED: `⏳ שלחת יותר מדי בקשות.
נסה שוב בעוד כמה דקות.`,

  // ============================================
  // Buttons
  // ============================================
  BUTTONS: {
    WARNING_LETTER: '📧 מכתב התראה',
    FILE_CLAIM: '⚖️ כתב תביעה',
    SAVE_FOR_LATER: '📊 שמור למאגר',
    MANUAL_ENTRY: '✏️ הזנה ידנית',
    YES_SENT: '✅ כן, שלחתי',
    RESEND_PDF: '📄 שלח שוב את המכתב',
    SNOOZE: '⏸️ תזכיר בעוד 3 ימים',
    YES_RESOLVED: '✅ הגענו להסכמה',
    NO_RESPONSE: '❌ לא קיבלתי תשובה',
    NEGATIVE_RESPONSE: '📝 קיבלתי תשובה שלילית',
    USE_SAVED_DETAILS: '✅ כן, השתמש בפרטים שלי',
    UPDATE_DETAILS: '✏️ עדכן פרטים',
    BACK: '◀️ חזרה',
    CANCEL: '❌ ביטול',
  },
} as const;

// Status translations
export const STATUS_LABELS: Record<string, string> = {
  NEW: 'חדש',
  PROCESSING: 'בעיבוד',
  AWAITING_BUSINESS_ID: 'ממתין לזיהוי עסק',
  AWAITING_USER_DETAILS: 'ממתין לפרטים',
  WARNING_GENERATED: 'מכתב הוכן',
  WARNING_SENT: 'מכתב נשלח',
  AWAITING_RESPONSE: 'ממתין לתגובה',
  RESPONSE_POSITIVE: 'תגובה חיובית',
  RESPONSE_NEGATIVE: 'תגובה שלילית',
  CLAIM_GENERATED: 'תביעה הוכנה',
  CLAIM_FILED: 'תביעה הוגשה',
  RESOLVED: 'נפתר',
  CLOSED: 'נסגר',
};
