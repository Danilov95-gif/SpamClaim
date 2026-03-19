# 🤖 Claude Code Prompts - SpamClaim Bot

## איך להשתמש במדריך הזה

1. פתח Claude Code בתיקיית הפרויקט: `claude`
2. העתק את ה-Prompt הרלוונטי
3. המתן לסיום
4. בדוק שהכל עובד
5. המשך ל-Prompt הבא

---

## 📋 Prompt 1: Project Setup (התחלה)

```
Create a new Telegram bot project called "spamclaim-bot" with the following:

Tech stack:
- TypeScript with strict mode
- grammY for Telegram bot framework
- Prisma with SQLite for database
- pdf-lib for PDF generation
- dotenv for environment variables

Project structure:
src/
  index.ts           - Entry point
  bot/
    index.ts         - Bot initialization
    handlers/
      start.ts       - /start command
      help.ts        - /help command
      photo.ts       - Photo/screenshot handler
      callback.ts    - Inline button callbacks
    keyboards/
      index.ts       - Keyboard builders
    middleware/
      auth.ts        - Ensure user exists in DB
  services/
    ocr.ts           - Gemini OCR integration
    business.ts      - Business lookup
    pdf.ts           - PDF generation
  templates/
    messages.ts      - Hebrew bot messages
    warning-letter.ts - Warning letter template
  utils/
    phone.ts         - Israeli phone validation
    date.ts          - Hebrew date formatting
  db/
    index.ts         - Prisma client export
prisma/
  schema.prisma      - Database schema

Create package.json with scripts:
- dev: ts-node with nodemon
- build: tsc
- start: node dist/index.js

Create .env.example with:
- BOT_TOKEN
- GEMINI_API_KEY
- DATABASE_URL

Create tsconfig.json with strict TypeScript settings.

For now, implement:
1. Basic bot that responds to /start with a Hebrew welcome message
2. Prisma schema with User, Business, Case, Reminder models
3. Middleware that creates user in DB on first message

The welcome message should be:
"שלום! 👋
אני הבוט של SpamClaim - עוזר לך להילחם בספאם.

📱 שלח לי צילום מסך של הודעת ספאם שקיבלת, ואני אעזור לך להכין מכתב התראה או כתב תביעה.

/help - עזרה
/status - התיקים שלי"
```

### ✅ בדיקה אחרי Prompt 1:
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```
- שלח `/start` לבוט בטלגרם
- צריך לקבל את ההודעה בעברית

---

## 📋 Prompt 2: OCR Service (זיהוי טקסט)

```
Create the OCR service using Gemini 2.0 Flash API.

File: src/services/ocr.ts

The service should:
1. Accept an image buffer
2. Send to Gemini with a prompt to extract:
   - Full text from the image (Hebrew + English)
   - Phone numbers (Israeli format: 05X-XXXXXXX, *XXXX, 1-800, etc.)
   - Possible business name
   - Date/time if visible
3. Return structured data:
   {
     text: string,
     phoneNumbers: string[],
     possibleBusinessName: string | null,
     detectedDate: Date | null,
     confidence: number
   }

Use this Gemini prompt:
"אתה מנתח צילומי מסך של הודעות SMS בעברית.
חלץ מהתמונה:
1. את כל הטקסט המופיע
2. מספרי טלפון (בפורמט ישראלי)
3. שם העסק השולח (אם מופיע)
4. תאריך ושעה (אם מופיעים)

החזר JSON בפורמט:
{
  \"text\": \"הטקסט המלא\",
  \"phones\": [\"050-1234567\"],
  \"business\": \"שם העסק או null\",
  \"datetime\": \"2024-01-15T14:30:00\" או null
}"

Also create src/utils/phone.ts with:
- isIsraeliPhone(phone: string): boolean
- formatIsraeliPhone(phone: string): string
- extractPhoneNumbers(text: string): string[]

Israeli phone patterns:
- Mobile: 05X-XXX-XXXX or 05XXXXXXXX
- Landline: 0X-XXX-XXXX
- Short codes: *XXXX
- Toll-free: 1-800-XXX-XXX, 1-700, etc.
```

### ✅ בדיקה אחרי Prompt 2:
- צור קובץ test עם תמונה של SMS
- וודא שה-OCR מחזיר תוצאות

---

## 📋 Prompt 3: Photo Handler (קבלת תמונות)

```
Implement the photo handler that processes spam screenshots.

File: src/bot/handlers/photo.ts

Flow:
1. User sends photo
2. Bot replies: "מעבד את התמונה... 🔍"
3. Download photo from Telegram
4. Send to OCR service
5. If phone number found:
   - Save case to DB with status NEW
   - Save Telegram file_id (not the actual file)
   - Show extracted data to user
   - Show action buttons (warning letter / claim / save)
6. If no phone found:
   - Ask user to try again with clearer image

Create inline keyboard with 3 buttons:
- "📧 מכתב התראה" -> callback: action:warning:{caseId}
- "⚖️ כתב תביעה" -> callback: action:claim:{caseId}
- "📊 שמור למאגר" -> callback: action:save:{caseId}

Message format after OCR:
"✅ זיהיתי את ההודעה!

📞 מספר שולח: {phone}
🏢 עסק: {business או 'לא זוהה'}
📅 תאריך: {date או 'לא זוהה'}

מה תרצה לעשות?"

Update the Case model in Prisma if needed:
- Add screenshotFileId (Telegram file_id)
- Add ocrText, senderPhone, etc.
```

### ✅ בדיקה אחרי Prompt 3:
- שלח צילום מסך של SMS לבוט
- צריך לראות את הפרטים שזוהו
- צריך לראות 3 כפתורים

---

## 📋 Prompt 4: Warning Letter PDF (מכתב התראה)

```
Create the warning letter PDF generator.

File: src/services/pdf.ts
File: src/templates/warning-letter.ts

The PDF should be in Hebrew (RTL) and include:

1. Header:
   - Date (Hebrew format: "19 בפברואר 2026")
   - "לכבוד: {business_name}"
   - "ח.פ./ע.מ.: {company_number}" (if available)
   - "כתובת: {business_address}" (if available)

2. Subject line:
   "הנדון: דרישה לפיצוי בגין משלוח דבר פרסומת ללא הסכמה – התראה לפני נקיטת הליכים משפטיים"

3. Body (numbered paragraphs):
   1. Description of spam received (date, time, phone)
   2. Quote relevant law (Section 30a)
   3. Demand: removal from lists + 500₪ compensation
   4. Warning: 14 days to respond or lawsuit

4. Signature:
   - User name
   - User phone
   - User address

5. Attachment note:
   "נספח: צילום מסך של ההודעה הפרסומית"

6. Footer disclaimer:
   "מסמך זה הוכן באמצעות כלי אוטומטי ואינו מהווה ייעוץ משפטי."

For Hebrew RTL in pdf-lib:
- Use a Hebrew font (embed David or Arial Hebrew)
- Reverse text direction manually if needed
- Or use html-pdf / puppeteer as alternative

Also implement callback handler:
- When user clicks "📧 מכתב התראה"
- Check if we have user details (name, address)
- If not, ask for them
- Generate PDF
- Send PDF to user via Telegram
- Update case status to WARNING_GENERATED
- Schedule reminders for day 7 and day 14
```

### ✅ בדיקה אחרי Prompt 4:
- לחץ על "מכתב התראה"
- הזן פרטים אישיים
- קבל PDF
- פתח ובדוק שהעברית תקינה

---

## 📋 Prompt 5: User Details Collection (איסוף פרטים)

```
Implement user details collection flow.

When user needs to generate a document but we don't have their details:

1. Ask for full name:
   "כדי להכין את המסמך, אני צריך כמה פרטים.
   
   מה השם המלא שלך?"

2. After name, ask for phone:
   "מעולה! מה מספר הטלפון שלך?"

3. After phone, ask for address:
   "ומה הכתובת שלך? (לצורך המסמך)"

4. Save to User model in DB

5. Continue with document generation

Use grammY conversations or simple state management:
- Store conversation state in session or DB
- Track which field we're collecting
- Validate inputs (phone format, etc.)

Also add /settings command:
- Show current saved details
- Allow editing each field

Create file: src/bot/handlers/collect-details.ts
Update: src/bot/handlers/callback.ts
```

### ✅ בדיקה אחרי Prompt 5:
- התחל משתמש חדש
- לחץ על "מכתב התראה"
- עבור את תהליך איסוף הפרטים
- וודא שנשמר ב-DB

---

## 📋 Prompt 6: Reminders System (תזכורות)

```
Implement the reminder system.

Files:
- src/services/scheduler.ts
- src/bot/handlers/reminder.ts

Requirements:
1. When warning letter is generated, schedule:
   - Reminder at day 7: "האם שלחת את מכתב ההתראה?"
   - Reminder at day 14: "האם קיבלת תשובה?"

2. Use node-cron to check for due reminders every hour

3. Reminder messages with inline buttons:
   
   Day 7 message:
   "⏰ תזכורת: לפני שבוע הכנת מכתב התראה נגד {business}.
   
   האם שלחת אותו?"
   
   Buttons:
   - "✅ כן, שלחתי" -> Update case status to WARNING_SENT
   - "📄 שלח לי שוב את המכתב" -> Resend PDF
   - "⏸️ עוד לא, תזכיר בעוד 3 ימים" -> Snooze

   Day 14 message:
   "⏰ עברו 14 יום מאז ששלחת מכתב התראה ל-{business}.
   
   האם קיבלת תשובה?"
   
   Buttons:
   - "✅ כן, הגענו להסכמה" -> Mark RESOLVED
   - "❌ לא קיבלתי תשובה" -> Offer to generate claim
   - "📝 קיבלתי תשובה שלילית" -> Offer to generate claim

4. Prisma Reminder model should track:
   - caseId
   - type ('day7', 'day14', 'custom')
   - scheduledFor: DateTime
   - sent: Boolean
   - snoozedUntil: DateTime?

5. Scheduler should:
   - Run every hour (or more frequently)
   - Find reminders where scheduledFor <= now AND sent = false
   - Send the appropriate message
   - Mark as sent
```

### ✅ בדיקה אחרי Prompt 6:
- צור תיק חדש עם מכתב התראה
- שנה ידנית את scheduledFor ל-עכשיו
- וודא שהתזכורת נשלחת

---

## 📋 Prompt 7: Business Lookup (זיהוי עסקים)

```
Implement business lookup from Israeli Companies Registry.

File: src/services/business.ts

Two lookup methods:

1. Internal DB lookup:
   - Search by phone number in Business.phones array
   - Return if found (with high confidence)

2. Companies Registry API (data.gov.il):
   - Endpoint: https://data.gov.il/api/3/action/datastore_search
   - Resource ID: f004176c-b85f-4542-8901-7b3f66a88b91
   - Search by company name
   
   Example:
   GET https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3f66a88b91&q={business_name}

3. Return array of matches:
   {
     id: string,
     name: string,
     companyNumber: string,
     address: string,
     confidence: number, // 0-1
     source: 'internal' | 'registry'
   }

4. In photo handler, after OCR:
   - If business name detected, search for it
   - Show top 3 matches to user
   - Let user confirm or enter manually

5. Create keyboard for business selection:
   "זיהיתי כמה עסקים אפשריים:
   
   1️⃣ {name1} - {address1}
   2️⃣ {name2} - {address2}
   3️⃣ {name3} - {address3}
   
   בחר את העסק הנכון, או לחץ להזנה ידנית."
   
   Buttons:
   - "1️⃣" -> business:confirm:{bizId1}:{caseId}
   - "2️⃣" -> business:confirm:{bizId2}:{caseId}
   - "3️⃣" -> business:confirm:{bizId3}:{caseId}
   - "✏️ הזנה ידנית" -> business:manual:{caseId}

6. When confirmed:
   - Link business to case
   - Save to internal DB for future lookups
   - Increment business.spamCount
```

### ✅ בדיקה אחרי Prompt 7:
- שלח צילום מסך עם שם עסק מוכר
- וודא שמציג אפשרויות
- בחר אחת ווודא שנשמר

---

## 📋 Prompt 8: Status & Help Commands (פקודות נוספות)

```
Implement /status and /help commands.

File: src/bot/handlers/status.ts
File: src/bot/handlers/help.ts

/help command:
"📚 *עזרה - SpamClaim Bot*

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
📧 support@spamclaim.co.il"

/status command:
Query all cases for user, show summary:

"📊 *התיקים שלך*

🟢 *פתוחים:* {count}
✅ *נסגרו בהצלחה:* {count}
⏳ *ממתינים לתגובה:* {count}

*תיקים אחרונים:*
• {business1} - {status1} ({date1})
• {business2} - {status2} ({date2})
• {business3} - {status3} ({date3})

לחץ על תיק לפרטים נוספים."

With inline buttons for each case:
"📋 {business}" -> case:view:{caseId}

Case view shows full details:
- Business name
- Spam date
- Status
- Actions taken
- Available actions
```

### ✅ בדיקה אחרי Prompt 8:
- שלח `/help` ווודא תצוגה יפה
- שלח `/status` ווודא שמציג את התיקים

---

## 📋 Prompt 9: Claim Document (כתב תביעה)

```
Implement claim document generation (Small Claims Court Form 1).

File: src/services/pdf.ts (add generateClaim function)
File: src/templates/claim.ts

Claim document structure:
1. Court header:
   "בבית משפט לתביעות קטנות ב{city}"

2. Parties:
   "התובע: {user_name}, ת.ז. ______
    כתובת: {user_address}
    טלפון: {user_phone}
    
    הנתבע: {business_name}
    ח.פ.: {company_number}
    כתובת: {business_address}"

3. Claim amount:
   "סכום התביעה: {amount} ש״ח"

4. Facts (numbered):
   - Date spam received
   - Content description
   - No prior consent given
   - (If applicable) Warning letter sent, no response

5. Legal basis:
   - Section 30a of Communications Law
   - Right to compensation without proving damage
   - Up to 1000₪ per message

6. Relief requested:
   - Compensation of {amount}
   - Court fees
   - Expenses

7. Evidence list:
   - Attachment A: Screenshot
   - Attachment B: Warning letter (if sent)
   - Attachment C: Proof of sending (if applicable)

8. Declaration:
   "אני מצהיר/ה כי כל האמור לעיל הוא אמת."

9. Signature line

Also include a cover page with:
- Step-by-step guide to filing on Net Hamishpat
- Court fee calculation (1% of claim, min 50₪)
- What to expect after filing

Callback handler:
- When user clicks "⚖️ כתב תביעה"
- Or when escalating from warning letter
- Collect any missing details
- Calculate claim amount
- Generate PDF
- Send with instructions
```

### ✅ בדיקה אחרי Prompt 9:
- בחר "כתב תביעה" על תיק
- קבל PDF
- וודא שכל הפרטים נכונים

---

## 📋 Prompt 10: Final Polish & Error Handling

```
Add error handling, logging, and polish.

1. Error handling:
   - Wrap all handlers in try-catch
   - Send user-friendly error messages
   - Log errors with context
   - Don't crash on Telegram API errors

2. Logging:
   - Use a simple logger (console with timestamps)
   - Log all incoming messages (without content for privacy)
   - Log OCR results
   - Log errors with stack traces

3. Rate limiting:
   - Max 10 photos per hour per user
   - Max 5 documents per day per user
   - Show friendly message when limited

4. Input validation:
   - Validate phone numbers before saving
   - Sanitize text inputs
   - Check file sizes (max 10MB)

5. Hebrew improvements:
   - Ensure all messages are in Hebrew
   - Use proper Hebrew date format
   - Handle RTL in PDFs correctly

6. Add /cancel command:
   - Cancels current conversation flow
   - Returns to main menu

7. Handle edge cases:
   - User sends video instead of photo
   - User sends document instead of photo
   - User sends multiple photos at once
   - User sends photo without context

8. Improve keyboards:
   - Add "חזור" button where appropriate
   - Add "ביטול" button in flows

9. Database cleanup:
   - Add index on User.telegramId
   - Add index on Case.userId
   - Add index on Reminder.scheduledFor

10. Create README.md with:
    - Project description
    - Setup instructions
    - Environment variables
    - Available commands
    - Development guide
```

### ✅ בדיקה אחרי Prompt 10:
- נסה לשבור את הבוט (הודעות לא צפויות)
- וודא שלא קורס
- וודא הודעות שגיאה ברורות

---

## 🚀 Prompt 11: Deployment to Railway

```
Prepare the project for deployment to Railway.

1. Create Dockerfile:
   - Use node:20-alpine
   - Copy package.json and install
   - Copy source and build
   - Run with node dist/index.js

2. Create railway.toml (optional)

3. Update package.json:
   - Add "engines": { "node": ">=20" }
   - Ensure build script works

4. Database considerations:
   - SQLite works on Railway with volume
   - Or suggest switching to PostgreSQL

5. Create .gitignore:
   - node_modules
   - dist
   - .env
   - *.db

6. Create deployment checklist in README:
   - [ ] Create Railway account
   - [ ] Connect GitHub repo
   - [ ] Set environment variables
   - [ ] Deploy
   - [ ] Set up Telegram webhook (or use polling)

7. Webhook vs Polling:
   - For Railway, webhook is better
   - Add webhook setup code
   - Or keep polling for simplicity
```

---

## 📝 Tips לעבודה עם Claude Code

1. **תן הקשר** - אם משהו לא עובד, הסבר מה קרה

2. **בדוק אחרי כל שלב** - אל תמשיך לשלב הבא לפני שהנוכחי עובד

3. **שמור גרסאות** - עשה commit אחרי כל שלב מוצלח

4. **שאל שאלות** - אם לא בטוח, שאל את Claude להסביר

5. **תקן בעיות** - אם יש באג, תאר אותו ובקש תיקון

---

## 🎯 סדר עדיפויות

**חובה ל-MVP:**
1. ✅ Prompt 1 - Setup
2. ✅ Prompt 2 - OCR
3. ✅ Prompt 3 - Photo Handler
4. ✅ Prompt 4 - Warning Letter
5. ✅ Prompt 5 - User Details

**חשוב אבל אפשר אחר כך:**
6. Prompt 6 - Reminders
7. Prompt 7 - Business Lookup
8. Prompt 8 - Status & Help

**נחמד שיהיה:**
9. Prompt 9 - Claim Document
10. Prompt 10 - Polish

**לפני Production:**
11. Prompt 11 - Deployment
