# משימה: מודול זיהוי שולח SMS - Sender Identification Service

## הקשר
אנחנו בונים את SpamClaim - Telegram Bot שמאפשר למשתמשים בישראל להגיש תביעות/מכתבי התראה נגד שולחי ספאם.

**הבעיה:** כשמשתמש מצלם מסך של הודעת SMS, לפעמים השולח מופיע כשם עסק אלפאנומרי (Sender ID) במקום מספר טלפון - למשל "BEZEQ", "SUPERPHARM", "HOT". במקרה כזה אין מספר טלפון לעבוד איתו, והמערכת צריכה לזהות מי העסק האמיתי מאחורי ה-Sender ID כדי לשלוח לו מכתב התראה.

## מבנה הפרויקט הקיים
```
spamclaim-bot/
├── src/
│   ├── index.ts
│   ├── bot/
│   │   ├── handlers/
│   │   │   ├── photo.ts         # Screenshot handler - כאן מתחיל ה-flow
│   │   │   └── callback.ts
│   │   └── keyboards.ts
│   ├── services/
│   │   ├── ocr.ts               # Google Vision - מחזיר טקסט גולמי
│   │   ├── business.ts          # חיפוש עסק ברשם החברות
│   │   ├── pdf.ts
│   │   └── scheduler.ts
│   ├── db/
│   │   └── schema.prisma
│   └── utils/
│       ├── phone.ts             # Israeli phone validation
│       └── hebrew.ts
```

## מה לבנות

### 1. קובץ חדש: `src/services/sender-identifier.ts`

**הלוגיקה המרכזית - pipeline בשלבים:**

```
OCR Output → שלב 1: חילוץ Sender ID + מספרי טלפון + URLs + שמות עסקים מתוכן ההודעה
           → שלב 2: נרמול Sender ID (הסרת רווחים, lowercase, תרגום וריאציות נפוצות)
           → שלב 3: חיפוש במאגר פנימי (sender_id_cache בDB)
           → שלב 4: חיפוש חיצוני (data.gov.il / Google Places API)
           → שלב 5: fallback - מחזיר מה שנמצא + דגל "requires_manual_review"
```

### 2. שלב 1 - Content Parsing (`extractSenderInfo`)

מהטקסט שה-OCR מחזיר, חלץ את כל המזהים האפשריים:

```typescript
interface ExtractedInfo {
  senderName: string | null;        // שם השולח מראש ההודעה (ה-Sender ID)
  phoneNumbers: string[];           // כל מספרי הטלפון שנמצאו בתוכן
  urls: string[];                   // כל ה-URLs/דומיינים
  emails: string[];                 // כתובות מייל
  unsubscribePhone: string | null;  // מספר הסרה מרשימת תפוצה (לרוב מופיע בסוף)
  businessNames: string[];          // שמות עסקים שזוהו בתוכן
  rawText: string;                  // הטקסט המלא
}
```

**חוקי חילוץ:**
- מספרי טלפון ישראליים: regex עבור 05X, 07X, 1-800, 1-700, *-numbers, ומספרים עם קידומת 972+
- URLs: http/https links + דומיינים "עירומים" (example.co.il)
- מייל: pattern רגיל
- מספר הסרה: לרוב מופיע אחרי "להסרה", "להסיר", "הסרה מרשימת תפוצה", "STOP", "הקש", "שלח"
- שמות עסקים: מילים בעברית שמופיעות ליד "מ:", "מאת:", "בע\"מ", "בעמ", "ח.פ", "ע.מ"

### 3. שלב 2 - נרמול Sender ID (`normalizeSenderId`)

```typescript
// מיפוי וריאציות נפוצות - טבלה ידנית ראשונית
const KNOWN_SENDER_IDS: Record<string, {
  businessName: string;
  companyNumber?: string;  // ח.פ
  category: string;
}> = {
  'bezeq': { businessName: 'בזק בינלאומי בע"מ', companyNumber: '520044078', category: 'telecom' },
  'hot': { businessName: 'הוט מובייל בע"מ', companyNumber: '514142730', category: 'telecom' },
  'superpharm': { businessName: 'סופר פארם (ישראל) בע"מ', companyNumber: '511892477', category: 'retail' },
  'fox': { businessName: 'פוקס ויזל בע"מ', companyNumber: '520032826', category: 'retail' },
  'leumi': { businessName: 'בנק לאומי לישראל בע"מ', companyNumber: '520018015', category: 'banking' },
  'isracard': { businessName: 'ישראכרט בע"מ', companyNumber: '511809125', category: 'finance' },
  // ... להרחיב עם עוד 50-100 שולחים נפוצים
};

function normalizeSenderId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s\-_.]/g, '')
    .replace(/[^a-z0-9א-ת]/g, '');
}
```

### 4. שלב 3 - חיפוש במאגר פנימי

**הוסף לschema.prisma:**

```prisma
model SenderIdMapping {
  id            String   @id @default(cuid())
  senderId      String   @unique        // הSender ID המנורמל
  senderIdRaw   String                  // הSender ID המקורי
  businessName  String                  // שם העסק
  companyNumber String?                 // ח.פ
  address       String?                 // כתובת
  phone         String?                 // טלפון העסק
  email         String?                 // מייל העסק
  website       String?                 // אתר
  category      String?                 // קטגוריה
  source        String                  // מאיפה הגיע: 'manual' | 'data_gov' | 'google' | 'user_reported'
  confidence    Float    @default(0.5)  // 0-1, רמת הוודאות
  reportCount   Int      @default(1)    // כמה משתמשים דיווחו
  verified      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

כל פעם שמשתמש מאשר שהזיהוי נכון - עדכן `reportCount++` ו-`confidence` עולה.

### 5. שלב 4 - חיפוש חיצוני

**4א: data.gov.il - רשם החברות**
```
GET https://data.gov.il/api/3/action/datastore_search
?resource_id=f004176c-b85f-4542-8901-7b3176f9a054
&q={searchTerm}
&limit=5
```

חפש את ה-Sender ID ואת שמות העסקים שנחלצו מהתוכן. ה-API מחזיר שם חברה, ח.פ, כתובת, סטטוס.

**4ב: Google Places API (אופציונלי, עולה כסף)**
```
GET https://maps.googleapis.com/maps/api/place/textsearch/json
?query={senderName}+ישראל
&language=he
&key={API_KEY}
```

**4ג: חיפוש הפוך לפי URL** - אם יש URL בהודעה, עשה WHOIS lookup על הדומיין. הRregistrant לרוב חושף את החברה.

### 6. שלב 5 - Confidence Scoring

```typescript
interface IdentificationResult {
  businessName: string | null;
  companyNumber: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  confidence: number;           // 0-1
  source: string;               // מה המקור שזיהה
  requiresManualReview: boolean;
  allCandidates: Candidate[];   // כל האפשרויות שנמצאו
}

// Confidence scoring:
// - sender_id_cache (verified=true): 0.95
// - sender_id_cache (verified=false, reportCount>3): 0.8
// - sender_id_cache (verified=false, reportCount<=3): 0.6
// - KNOWN_SENDER_IDS hardcoded: 0.9
// - data.gov.il exact match: 0.85
// - data.gov.il partial match: 0.5
// - Google Places match: 0.4
// - URL/domain match only: 0.3
// - requiresManualReview = true if confidence < 0.6
```

### 7. שילוב עם ה-Flow הקיים (עדכון `photo.ts`)

```typescript
// בתוך ה-photo handler, אחרי ה-OCR:

const ocrText = await extractFromImage(buffer);
const senderInfo = await extractSenderInfo(ocrText);

if (senderInfo.phoneNumbers.length > 0) {
  // המצב הקיים - יש מספר טלפון, flow רגיל
  // ...
} else if (senderInfo.senderName) {
  // מצב חדש - יש Sender ID אלפאנומרי
  const identification = await identifySender(senderInfo);
  
  if (identification.confidence >= 0.6) {
    // זיהוי סביר - הצג למשתמש לאישור
    await ctx.reply(
      `🔍 זיהיתי את השולח:\n` +
      `🏢 ${identification.businessName}\n` +
      `${identification.companyNumber ? `ח.פ: ${identification.companyNumber}\n` : ''}` +
      `${identification.address ? `📍 ${identification.address}\n` : ''}` +
      `\nהאם זה נכון?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ כן, זה נכון', callback_data: `confirm_sender:${identification.companyNumber}` },
              { text: '❌ לא, זה לא', callback_data: 'wrong_sender' }
            ]
          ]
        }
      }
    );
  } else if (identification.allCandidates.length > 0) {
    // כמה אפשרויות - תן למשתמש לבחור
    const buttons = identification.allCandidates.slice(0, 4).map(c => ([
      { text: `${c.businessName}`, callback_data: `select_sender:${c.companyNumber}` }
    ]));
    buttons.push([{ text: '❓ אף אחד מהם', callback_data: 'manual_sender' }]);
    
    await ctx.reply(
      `🔍 מצאתי כמה אפשרויות לזהות את "${senderInfo.senderName}".\nבחר את העסק הנכון:`,
      { reply_markup: { inline_keyboard: buttons } }
    );
  } else {
    // לא נמצא כלום - בקש מהמשתמש
    await ctx.reply(
      `❓ לא הצלחתי לזהות את השולח "${senderInfo.senderName}".\n` +
      `אם אתה יודע מי שלח, שלח לי את שם העסק ואנסה לחפש ברשם החברות.`
    );
    // שמור state שמחכים לקלט ידני
  }
} else {
  // אין מספר ואין שם - בקש תמונה ברורה יותר
  await ctx.reply('לא הצלחתי לזהות שולח או מספר טלפון. נסה שוב עם תמונה ברורה יותר 📸');
}
```

### 8. למידה מהמשתמשים (עדכון `callback.ts`)

כשהמשתמש מאשר זיהוי (`confirm_sender`) או בוחר מתוך רשימה (`select_sender`):
- עדכן/צור רשומה ב-`SenderIdMapping`
- העלה את `reportCount`
- חשב מחדש `confidence`
- אם `reportCount >= 5`, סמן `verified = true`

כשהמשתמש מזין ידנית שם עסק (`manual_sender`):
- חפש ברשם החברות
- הצג תוצאות
- אחרי אישור - שמור מיפוי חדש עם `source: 'user_reported'`

## דגשים חשובים
- כל הטקסטים למשתמש בעברית טבעית, לא רובוטית
- Error handling מלא - כל קריאת API יכולה להיכשל
- Rate limiting על data.gov.il (אל תשלח יותר מ-10 בקשות בדקה)
- Cache תוצאות חיפוש חיצוני ל-24 שעות
- לוגים מפורטים לכל שלב בpipeline (לdebug)
- הוסף טסטים עם מקרי קצה: sender ID בעברית, בערבית, עם מספרים, עם תווים מיוחדים

## קבצים ליצור/לעדכן
1. **חדש:** `src/services/sender-identifier.ts` - הלוגיקה המרכזית
2. **חדש:** `src/services/content-parser.ts` - חילוץ מידע מתוכן ההודעה
3. **חדש:** `src/data/known-senders.ts` - טבלת Sender IDs ידועים
4. **עדכון:** `src/services/business.ts` - הוספת חיפוש ב-data.gov.il
5. **עדכון:** `src/bot/handlers/photo.ts` - שילוב ה-flow החדש
6. **עדכון:** `src/bot/handlers/callback.ts` - טיפול באישור/בחירת שולח
7. **עדכון:** `prisma/schema.prisma` - הוספת SenderIdMapping
8. **חדש:** `tests/sender-identifier.test.ts`
9. **חדש:** `tests/content-parser.test.ts`
