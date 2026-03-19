# 🚀 SpamClaim - מדריך התקנה מלא

## סיכום ההחלטות הטכניות

| קומפוננטה | בחירה | סיבה |
|-----------|--------|------|
| שפה | TypeScript + grammY | Type-safe, מתועד מעולה |
| OCR | Gemini 2.0 Flash | חינמי, טוב לעברית |
| אחסון | Telegram file_id | אפס עלות |
| DB | SQLite + Prisma | פשוט, מספיק ל-MVP |
| Hosting | Railway | $5/חודש, קל |
| סכום התראה | 500₪ | ריאלי, לא תאב בצע |

---

## שלב 1: יצירת Telegram Bot (5 דקות)

### 1.1 פתח את @BotFather בטלגרם

1. פתח טלגרם וחפש `@BotFather`
2. לחץ START
3. שלח: `/newbot`

### 1.2 הגדר את הבוט

```
BotFather: Alright, a new bot. How are we going to call it?
You: SpamClaim Bot

BotFather: Good. Now let's choose a username for your bot...
You: SpamClaimBot
```

> 💡 אם השם תפוס, נסה: `SpamClaimILBot`, `SpamClaim_Bot`, וכו'

### 1.3 שמור את ה-Token

תקבל הודעה כזו:
```
Done! Congratulations on your new bot. You will find it at t.me/SpamClaimBot.
You can now add a description...

Use this token to access the HTTP API:
7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**שמור את ה-Token!** זה ה-`BOT_TOKEN` שלך.

### 1.4 הגדרות נוספות (אופציונלי אבל מומלץ)

שלח ל-BotFather:
```
/setdescription
```
ואז:
```
בוט לסיוע בהגשת תביעות ספאם בישראל. שלח צילום מסך של הודעת ספאם ואני אעזור לך להכין מכתב התראה.
```

```
/setabouttext
```
ואז:
```
🇮🇱 SpamClaim - נלחמים בספאם ביחד
```

---

## שלב 2: הגדרת Gemini API (10 דקות)

### 2.1 כנס ל-Google AI Studio

1. לך ל: https://aistudio.google.com/
2. התחבר עם חשבון Google
3. לחץ על "Get API Key" (בצד שמאל למעלה)

### 2.2 צור API Key

1. לחץ "Create API Key"
2. בחר "Create API key in new project" (או פרויקט קיים)
3. העתק את ה-Key

```
AIzaSy...xxxxxxxxxxxxxxxxxxxxxxxx
```

**שמור את ה-Key!** זה ה-`GEMINI_API_KEY` שלך.

### 2.3 בדוק שזה עובד

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Say hello in Hebrew"}]}]}'
```

אם קיבלת תשובה בעברית - מעולה!

---

## שלב 3: התקנת כלי פיתוח (5 דקות)

### 3.1 וודא ש-Node.js מותקן

```bash
node --version  # צריך להיות 18+
npm --version
```

אם לא מותקן: https://nodejs.org/ (LTS version)

### 3.2 התקן Claude Code (אם עוד לא)

```bash
npm install -g @anthropic-ai/claude-code
```

### 3.3 צור תיקיית פרויקט

```bash
mkdir spamclaim-bot
cd spamclaim-bot
```

---

## שלב 4: הגדרת משתני סביבה

### 4.1 צור קובץ .env

```bash
touch .env
```

### 4.2 הוסף את ה-credentials

```env
# Telegram
BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google AI (Gemini)
GEMINI_API_KEY=AIzaSy...xxxxxxxxxxxxxxxxxxxxxxxx

# Database
DATABASE_URL="file:./spamclaim.db"

# App Settings
DEFAULT_WARNING_AMOUNT=500
NODE_ENV=development
LOG_LEVEL=info
```

---

## שלב 5: הפעלת Claude Code

### 5.1 פתח Claude Code

```bash
cd spamclaim-bot
claude
```

### 5.2 תן לו את ההוראה הראשונה

ראה קובץ `CLAUDE_PROMPTS.md` להוראות המדויקות.

---

## 🔧 פתרון בעיות נפוצות

### Bot לא מגיב
- וודא שה-Token נכון
- וודא שהבוט רץ (`npm run dev`)
- נסה לשלוח `/start` מחדש

### Gemini לא עובד
- בדוק שה-API Key תקין
- וודא שלא עברת את המכסה היומית (1,500 requests)
- נסה ב-AI Studio ישירות

### TypeScript errors
- הרץ `npm install` מחדש
- וודא שיש `tsconfig.json`
- נסה `npx tsc --noEmit` לראות שגיאות

---

## 📁 מבנה תיקיות צפוי

אחרי שClaude Code יסיים:

```
spamclaim-bot/
├── src/
│   ├── index.ts
│   ├── bot/
│   │   ├── handlers/
│   │   └── keyboards/
│   ├── services/
│   │   ├── ocr.ts
│   │   ├── business.ts
│   │   └── pdf.ts
│   ├── templates/
│   └── utils/
├── prisma/
│   └── schema.prisma
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⏭️ הצעדים הבאים

1. ✅ יצירת Bot Token
2. ✅ יצירת Gemini API Key
3. ✅ התקנת כלים
4. ⬜ הפעלת Claude Code
5. ⬜ פיתוח MVP
6. ⬜ בדיקות
7. ⬜ Deploy ל-Railway

---

## 🔗 לינקים שימושיים

- [grammY Documentation](https://grammy.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Railway](https://railway.app/)
- [עמותת אל ספאם](https://alspam.org/) - חומרים משפטיים
