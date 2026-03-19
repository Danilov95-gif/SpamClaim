import 'dotenv/config';
import { bot } from './bot/index.js';
import { authMiddleware } from './bot/middleware/auth.js';
import { startHandler } from './bot/handlers/start.js';
import { helpHandler } from './bot/handlers/help.js';
import { photoHandler } from './bot/handlers/photo.js';
import { callbackHandler } from './bot/handlers/callback.js';
import { collectDetailsHandler } from './bot/handlers/collect-details.js';
import { statusHandler } from './bot/handlers/status.js';

// Auth middleware runs on every update
bot.use(authMiddleware);

// Commands
bot.command('start', startHandler);
bot.command('help', helpHandler);
bot.command('status', statusHandler);
bot.command('cancel', async (ctx) => {
  ctx.session.step = 'idle';
  ctx.session.pendingCaseId = null;
  ctx.session.pendingAction = null;
  await ctx.reply('❌ הפעולה בוטלה.');
});

// Photo / screenshot handler
bot.on('message:photo', photoHandler);

// Text handler - routes to collect-details if in a flow, otherwise default hint
bot.on('message:text', async (ctx) => {
  if (ctx.session.step !== 'idle') {
    await collectDetailsHandler(ctx);
  } else {
    await ctx.reply('📱 שלח לי צילום מסך של הודעת ספאם כדי להתחיל.\n\n/help - עזרה');
  }
});

// Inline button callbacks
bot.on('callback_query:data', callbackHandler);

// Global error handler
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`[BOT ERROR] Update ${ctx.update.update_id}:`, err.error);
});

// Start the bot
bot.start({
  onStart: (info) => {
    console.log(`✅ Bot @${info.username} started (polling)`);
  },
});
