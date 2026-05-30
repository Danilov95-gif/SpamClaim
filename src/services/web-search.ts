import { GoogleGenerativeAI } from '@google/generative-ai';

export interface BusinessWebInfo {
  email: string | null;
  website: string | null;
  legalAddress: string | null;
  companyNumber: string | null;
  summary: string | null;
}

const EMPTY: BusinessWebInfo = {
  email: null,
  website: null,
  legalAddress: null,
  companyNumber: null,
  summary: null,
};

function nullIfEmpty(val: unknown): string | null {
  if (typeof val !== 'string' || val === 'null' || val.trim() === '') return null;
  return val.trim();
}

/**
 * Uses Gemini with Google Search grounding to find public contact details
 * for an Israeli business. Returns whatever it can find; all fields nullable.
 * Non-throwing — returns EMPTY on any error.
 */
export async function searchBusinessOnWeb(
  businessName: string,
  phone?: string | null,
): Promise<BusinessWebInfo> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) return EMPTY;

  const genAI = new GoogleGenerativeAI(apiKey);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', tools: [{ googleSearch: {} } as any] });

  const context = phone ? `${businessName} (טלפון: ${phone})` : businessName;

  const prompt = `חפש ברשת מידע עדכני על העסק הישראלי: ${context}.

אסוף:
1. כתובת מייל רשמית לפניות (info@, contact@, marketing@, legal@ וכו')
2. אתר אינטרנט רשמי
3. כתובת פיזית רשמית בישראל
4. מספר ח.פ. / ע.מ. (אם מוזכר)
5. תיאור קצר של פעילות העסק (משפט אחד)

החזר JSON בלבד, ללא markdown:
{"email":"...או null","website":"...או null","legalAddress":"...או null","companyNumber":"...או null","summary":"...או null"}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```(?:json)?\n?|\n?```/g, '').trim();

    // Extract JSON object even if surrounded by extra text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return EMPTY;

    const parsed = JSON.parse(match[0]) as Record<string, unknown>;

    return {
      email: nullIfEmpty(parsed['email']),
      website: nullIfEmpty(parsed['website']),
      legalAddress: nullIfEmpty(parsed['legalAddress']),
      companyNumber: nullIfEmpty(parsed['companyNumber']),
      summary: nullIfEmpty(parsed['summary']),
    };
  } catch (err) {
    console.error('[web-search] Failed:', err);
    return EMPTY;
  }
}
