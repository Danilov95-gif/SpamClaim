import { InlineKeyboard } from 'grammy';
import { MESSAGES, STATUS_LABELS } from '../../templates/messages.js';
import { prisma } from '../../db/index.js';
import { formatHebrewDate } from '../../utils/date.js';
import type { MyContext } from '../index.js';

const OPEN_STATUSES = new Set([
  'NEW',
  'PROCESSING',
  'AWAITING_BUSINESS_ID',
  'AWAITING_USER_DETAILS',
  'WARNING_GENERATED',
  'WARNING_SENT',
  'AWAITING_RESPONSE',
]);

const WAITING_STATUSES = new Set(['WARNING_SENT', 'AWAITING_RESPONSE']);

export async function statusHandler(ctx: MyContext): Promise<void> {
  try {
    const cases = await prisma.case.findMany({
      where: { userId: ctx.user.id },
      include: { business: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (cases.length === 0) {
      await ctx.reply(MESSAGES.STATUS_EMPTY);
      return;
    }

    const openCount = cases.filter(c => OPEN_STATUSES.has(c.status)).length;
    const resolvedCount = cases.filter(c => c.status === 'RESOLVED').length;
    const waitingCount = cases.filter(c => WAITING_STATUSES.has(c.status)).length;

    const recent = cases.slice(0, 5);

    let text = MESSAGES.STATUS_HEADER(openCount, resolvedCount, waitingCount) + '\n';
    for (const c of recent) {
      const bizName = c.business?.name ?? c.senderPhone ?? '?';
      const label = STATUS_LABELS[c.status] ?? c.status;
      const date = formatHebrewDate(c.createdAt);
      text += MESSAGES.STATUS_CASE(bizName, label, date) + '\n';
    }

    const kb = new InlineKeyboard();
    for (const c of recent) {
      const bizName = c.business?.name ?? c.senderPhone ?? 'תיק';
      kb.text(`📋 ${bizName}`, `case:view:${c.id}`).row();
    }

    await ctx.reply(text, { reply_markup: kb, parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[status] Failed to fetch cases:', err);
    await ctx.reply(MESSAGES.GENERIC_ERROR);
  }
}

export async function caseViewHandler(ctx: MyContext, caseId: string): Promise<void> {
  try {
    const c = await prisma.case.findUnique({
      where: { id: caseId },
      include: { business: true },
    });

    if (!c || c.userId !== ctx.user.id) {
      await ctx.reply(MESSAGES.GENERIC_ERROR);
      return;
    }

    const bizName = c.business?.name ?? 'לא זוהה';
    const label = STATUS_LABELS[c.status] ?? c.status;
    const created = formatHebrewDate(c.createdAt);
    const spamDate = c.spamReceivedAt ? formatHebrewDate(c.spamReceivedAt) : 'לא זוהה';

    let text = `📋 *פרטי תיק*\n\n`;
    text += `🏢 עסק: ${bizName}\n`;
    text += `📞 טלפון שולח: ${c.senderPhone ?? 'לא זוהה'}\n`;
    text += `📅 תאריך ספאם: ${spamDate}\n`;
    text += `📊 סטטוס: ${label}\n`;
    text += `🗓 נפתח: ${created}\n`;

    const kb = new InlineKeyboard();

    if (OPEN_STATUSES.has(c.status) && c.status !== 'RESOLVED' && c.status !== 'CLOSED') {
      kb.text('📧 מכתב התראה', `action:warning:${c.id}`)
        .text('⚖️ כתב תביעה', `action:claim:${c.id}`)
        .row();
    }
    if (c.status === 'NEW' || c.status === 'AWAITING_USER_DETAILS') {
      kb.text('📊 שמור למאגר', `action:save:${c.id}`).row();
    }

    await ctx.reply(text, { reply_markup: kb, parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[status] Failed to fetch case:', err);
    await ctx.reply(MESSAGES.GENERIC_ERROR);
  }
}
