# 🇮🇱 SpamClaim Bot

> בוט טלגרם לסיוע בהגשת תביעות ספאם בישראל

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=flat&logo=telegram&logoColor=white)](https://telegram.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 מה זה?

SpamClaim הוא בוט טלגרם שעוזר לאזרחים ישראלים להילחם בספאם. שלח צילום מסך של הודעת ספאם, והבוט יכין עבורך:
- **מכתב התראה** - 70-80% מהמקרים נפתרים כך!
- **כתב תביעה** - לבית משפט לתביעות קטנות

## ⚡ Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/spamclaim-bot.git
cd spamclaim-bot

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your BOT_TOKEN and GEMINI_API_KEY

# Setup database
npx prisma generate
npx prisma db push

# Run in development
npm run dev
```

## 🔧 Configuration

Create a `.env` file with:

```env
BOT_TOKEN=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL="file:./spamclaim.db"
DEFAULT_WARNING_AMOUNT=500
```

### Getting Credentials

1. **Telegram Bot Token**: Message [@BotFather](https://t.me/BotFather) and create a new bot
2. **Gemini API Key**: Go to [AI Studio](https://aistudio.google.com/) and create an API key

## 📱 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | התחלת שיחה עם הבוט |
| `/help` | הסבר על השימוש |
| `/status` | צפייה בתיקים שלי |
| `/settings` | עריכת פרטים אישיים |
| `/cancel` | ביטול פעולה נוכחית |

## 🏗️ Project Structure

```
spamclaim-bot/
├── src/
│   ├── index.ts           # Entry point
│   ├── bot/
│   │   ├── handlers/      # Command & message handlers
│   │   ├── keyboards/     # Inline keyboards
│   │   └── middleware/    # Bot middleware
│   ├── services/
│   │   ├── ocr.ts         # Gemini OCR integration
│   │   ├── business.ts    # Business lookup
│   │   ├── pdf.ts         # PDF generation
│   │   └── scheduler.ts   # Reminder system
│   ├── templates/         # Document templates
│   └── utils/             # Utilities
├── prisma/
│   └── schema.prisma      # Database schema
└── ...
```

## 🚀 Deployment

### Railway (Recommended)

1. Push to GitHub
2. Connect Railway to your repo
3. Add environment variables
4. Deploy!

### Docker

```bash
docker build -t spamclaim-bot .
docker run -d \
  -e BOT_TOKEN=xxx \
  -e GEMINI_API_KEY=xxx \
  -v spamclaim-data:/app/data \
  spamclaim-bot
```

## ⚖️ Legal Basis

This bot helps Israeli citizens exercise their rights under **Section 30a of the Communications Law** (תיקון 40, 2008), which:
- Prohibits sending advertising messages without prior consent
- Allows compensation of up to ₪1,000 per message without proving damages

## ⚠️ Disclaimer

This tool is for informational purposes only and does not constitute legal advice. Users are responsible for their own legal actions. Consult a lawyer for specific legal questions.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

---

Made with ❤️ for Israeli spam fighters
