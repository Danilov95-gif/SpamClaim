import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractPhoneNumbers, formatIsraeliPhone, isIsraeliPhone } from '../utils/phone.js';
import { parseDateFromText } from '../utils/date.js';

export interface OcrResult {
  text: string;
  phoneNumbers: string[];
  possibleBusinessName: string | null; // Sender ID from header
  advertiserName: string | null;       // Actual advertiser from message body
  detectedDate: Date | null;
  confidence: number;
}

const OCR_PROMPT = `אתה מנתח צילומי מסך של הודעות SMS ו-iMessage בעברית.

**חשוב מאוד:** בצילומי מסך של iOS, מספר הטלפון של השולח מופיע בשורת הכותרת בראש המסך (contact header) – לא בגוף ההודעה. שורה זו כוללת לרוב את שם האיש הקשר או מספר הטלפון, לפעמים בפורמט בינלאומי כגון +972 55-7707702. **חלץ את המספר משם בראש עדיפות.**

חלץ מהתמונה:
1. את כל הטקסט המופיע (כולל טקסט בשורת הכותרת)
2. מספר הטלפון של **השולח** – חפש קודם בשורת הכותרת/contact header בראש המסך, ואחר כך בגוף ההודעה. המר פורמט בינלאומי (+972 5X-XXXXXXX) לפורמט מקומי (05X-XXXXXXX).
3. **business** – שם השולח כפי שמופיע בשורת הכותרת (Sender ID אלפאנומרי, למשל "BANK", "DEALS", "HOT" וכו'). אם אין Sender ID, החזר null.
4. **advertiser** – שם העסק/המפרסם האמיתי שמאחורי ההודעה, כפי שניתן להסיק מגוף ההודעה: שם מותג מפורש, שם חברה, דומיין URL (למשל "direct.co.il" → "ביטוח ישיר"), קישור הסרה, או כל אזכור של גוף מסחרי. אם לא ניתן לזהות, החזר null.
5. תאריך ושעה (אם מופיעים)

החזר JSON בלבד, ללא markdown, בפורמט:
{"text":"הטקסט המלא כולל כותרת","phones":["05X-XXXXXXX"],"business":"Sender ID מהכותרת או null","advertiser":"שם העסק המפרסם מגוף ההודעה או null","datetime":"2024-01-15T14:30:00 או null"}

המספרים ב-phones חייבים להיות בפורמט מקומי ישראלי (05X / 07X / 1-800 / *XXXX וכדומה).`;

interface GeminiOcrResponse {
  text?: string;
  phones?: string[];
  business?: string | null;
  advertiser?: string | null;
  datetime?: string | null;
}

export async function performOcr(imageBuffer: Buffer): Promise<OcrResult> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error('GEMINI_API_KEY is required');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: 'image/jpeg' as const,
    },
  };

  const result = await model.generateContent([OCR_PROMPT, imagePart]);
  const responseText = result.response.text();

  // Strip markdown code fences if present
  const cleaned = responseText.replace(/```(?:json)?\n?|\n?```/g, '').trim();

  let parsed: GeminiOcrResponse;
  try {
    parsed = JSON.parse(cleaned) as GeminiOcrResponse;
  } catch {
    // Fallback: extract phones from raw text
    const phones = extractPhoneNumbers(responseText);
    return {
      text: responseText,
      phoneNumbers: phones,
      possibleBusinessName: null,
      advertiserName: null,
      detectedDate: null,
      confidence: 0.3,
    };
  }

  // Get phone numbers - from parsed JSON or extracted from text
  const rawText = parsed.text ?? '';
  const phones =
    Array.isArray(parsed.phones) && parsed.phones.length > 0
      ? parsed.phones
          .map(formatIsraeliPhone)
          .filter(isIsraeliPhone)
      : extractPhoneNumbers(rawText);

  // Parse detected date
  let detectedDate: Date | null = null;
  if (parsed.datetime && parsed.datetime !== 'null') {
    const d = new Date(parsed.datetime);
    detectedDate = isNaN(d.getTime()) ? null : d;
  } else if (rawText) {
    detectedDate = parseDateFromText(rawText);
  }

  // Extract business name, treating "null" string as null
  const businessName =
    parsed.business && parsed.business !== 'null' ? parsed.business : null;

  const advertiserName =
    parsed.advertiser && parsed.advertiser !== 'null' ? parsed.advertiser : null;

  return {
    text: rawText,
    phoneNumbers: phones.filter(Boolean),
    possibleBusinessName: businessName,
    advertiserName,
    detectedDate,
    confidence: phones.length > 0 ? 0.9 : 0.5,
  };
}
