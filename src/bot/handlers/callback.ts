import { MESSAGES } from '../../templates/messages.js';
import { prisma } from '../../db/index.js';
import { caseActionsKeyboard, cancelKeyboard, claimNotAvailableKeyboard, useOrUpdateDetailsKeyboard } from '../keyboards/index.js';
import { triggerDocumentGeneration } from './collect-details.js';
import { caseViewHandler } from './status.js';
import { confirmSenderIdMapping } from '../../services/sender-identifier.js';
import type { MyContext } from '../index.js';

export async function callbackHandler(ctx: MyContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  // Always answer to remove the Telegram spinner
  await ctx.answerCallbackQuery();

  const parts = data.split(':');
  const namespace = parts[0];
  const action = parts[1];
  const id1 = parts[2]; // caseId in most cases
  const id2 = parts[3]; // bizId for business:confirm

  if (namespace === 'cancel') {
    ctx.session.step = 'idle';
    ctx.session.pendingCaseId = null;
    ctx.session.pendingAction = null;
    await ctx.reply(MESSAGES.ACTION_CANCELLED);
    return;
  }

  if (namespace === 'action' && action && id1) {
    await handleActionCallback(ctx, action, id1);
    return;
  }

  if (namespace === 'business' && action && id1) {
    await handleBusinessCallback(ctx, action, id1, id2);
    return;
  }

  if (namespace === 'reminder' && action && id1) {
    await handleReminderCallback(ctx, action, id1);
    return;
  }

  if (namespace === 'details' && action && id1) {
    await handleDetailsCallback(ctx, action, id1, id2);
    return;
  }

  if (namespace === 'case' && action === 'view' && id1) {
    await caseViewHandler(ctx, id1);
    return;
  }

  if (namespace === 'sender' && action && id1) {
    await handleSenderCallback(ctx, action, id1, id2);
    return;
  }
}

async function handleActionCallback(
  ctx: MyContext,
  action: string,
  caseId: string,
): Promise<void> {
  if (action === 'save') {
    try {
      await prisma.case.update({ where: { id: caseId }, data: { status: 'CLOSED' } });
      await ctx.reply(MESSAGES.SAVED_FOR_LATER);
    } catch (err) {
      console.error('[callback] Failed to save case:', err);
      await ctx.reply(MESSAGES.GENERIC_ERROR);
    }
    return;
  }

  if (action !== 'warning' && action !== 'claim') return;

  if (action === 'claim') {
    await ctx.reply(MESSAGES.CLAIM_NOT_AVAILABLE, {
      reply_markup: claimNotAvailableKeyboard(caseId),
      parse_mode: 'Markdown',
    });
    return;
  }

  try {
    // Refresh user from DB to get latest details
    const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
    if (!user) {
      await ctx.reply(MESSAGES.GENERIC_ERROR);
      return;
    }

    const hasDetails = user.firstName && user.lastName && user.phone && user.address;

    if (!hasDetails) {
      ctx.session.pendingCaseId = caseId;
      ctx.session.pendingAction = action as 'warning' | 'claim';
      // Resume from the first missing field — don't restart from the beginning
      if (!user.firstName || !user.lastName) {
        ctx.session.step = 'awaiting_name';
        await ctx.reply(MESSAGES.ASK_NAME, { reply_markup: cancelKeyboard() });
      } else if (!user.phone) {
        ctx.session.step = 'awaiting_phone';
        await ctx.reply(MESSAGES.ASK_PHONE, { reply_markup: cancelKeyboard() });
      } else {
        ctx.session.step = 'awaiting_address';
        await ctx.reply(MESSAGES.ASK_ADDRESS, { reply_markup: cancelKeyboard() });
      }
      return;
    }

    // User has saved details — show them and offer to use or update
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    await ctx.reply(
      MESSAGES.SAVED_DETAILS(name, user.phone!, user.address!),
      { reply_markup: useOrUpdateDetailsKeyboard(caseId, action) },
    );
  } catch (err) {
    console.error('[callback] handleActionCallback error:', err);
    await ctx.reply(MESSAGES.GENERIC_ERROR);
  }
}

async function handleDetailsCallback(
  ctx: MyContext,
  action: string,
  caseId: string,
  docAction: string | undefined,
): Promise<void> {
  if (!docAction || (docAction !== 'warning' && docAction !== 'claim')) return;

  if (action === 'use_saved') {
    await triggerDocumentGeneration(ctx, caseId, docAction);
    return;
  }

  if (action === 'update') {
    ctx.session.pendingCaseId = caseId;
    ctx.session.pendingAction = docAction;
    ctx.session.step = 'awaiting_name';
    await ctx.reply(MESSAGES.ASK_NAME, { reply_markup: cancelKeyboard() });
    return;
  }
}

async function handleBusinessCallback(
  ctx: MyContext,
  action: string,
  id1: string,
  id2: string | undefined,
): Promise<void> {
  if (action === 'manual') {
    ctx.session.pendingCaseId = id1;
    ctx.session.step = 'awaiting_business_name';
    await ctx.reply(MESSAGES.BUSINESS_NOT_FOUND, { reply_markup: cancelKeyboard() });
    return;
  }

  if (action === 'confirm' && id2) {
    // id1 = bizId, id2 = caseId
    const bizId = id1;
    const caseId = id2;

    if (bizId === 'manual') {
      await ctx.reply('מה תרצה לעשות?', { reply_markup: caseActionsKeyboard(caseId) });
      return;
    }

    try {
      const business = await prisma.business.findUnique({ where: { id: bizId } });
      if (!business) {
        await ctx.reply(MESSAGES.GENERIC_ERROR);
        return;
      }

      await prisma.case.update({ where: { id: caseId }, data: { businessId: bizId } });
      await prisma.business.update({ where: { id: bizId }, data: { spamCount: { increment: 1 } } });

      await ctx.reply(MESSAGES.BUSINESS_CONFIRMED(business.name));
      await ctx.reply('מה תרצה לעשות?', { reply_markup: caseActionsKeyboard(caseId) });
    } catch (err) {
      console.error('[callback] Failed to confirm business:', err);
      await ctx.reply(MESSAGES.GENERIC_ERROR);
    }
    return;
  }
}

async function handleReminderCallback(
  ctx: MyContext,
  action: string,
  caseId: string,
): Promise<void> {
  if (action === 'sent') {
    try {
      await prisma.case.update({
        where: { id: caseId },
        data: { status: 'WARNING_SENT', warningLetterSentAt: new Date() },
      });
      await ctx.reply('✅ מעולה! סטטוס התיק עודכן. אחזור אליך בעוד 7 ימים לבדוק אם קיבלת תגובה.');
    } catch (err) {
      console.error('[callback] Failed to update reminder sent:', err);
      await ctx.reply(MESSAGES.GENERIC_ERROR);
    }
    return;
  }

  if (action === 'resolved') {
    try {
      await prisma.case.update({
        where: { id: caseId },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
      await ctx.reply(MESSAGES.CASE_RESOLVED);
    } catch (err) {
      console.error('[callback] Failed to resolve case:', err);
      await ctx.reply(MESSAGES.GENERIC_ERROR);
    }
    return;
  }

  if (action === 'escalate') {
    await ctx.reply(MESSAGES.CASE_ESCALATED);
    ctx.session.pendingCaseId = caseId;
    ctx.session.pendingAction = 'claim';

    try {
      const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
      if (!user) { await ctx.reply(MESSAGES.GENERIC_ERROR); return; }
      const hasDetails = user.firstName && user.lastName && user.phone && user.address;

      if (!hasDetails) {
        if (!user.firstName || !user.lastName) {
          ctx.session.step = 'awaiting_name';
          await ctx.reply(MESSAGES.ASK_NAME, { reply_markup: cancelKeyboard() });
        } else if (!user.phone) {
          ctx.session.step = 'awaiting_phone';
          await ctx.reply(MESSAGES.ASK_PHONE, { reply_markup: cancelKeyboard() });
        } else {
          ctx.session.step = 'awaiting_address';
          await ctx.reply(MESSAGES.ASK_ADDRESS, { reply_markup: cancelKeyboard() });
        }
      } else {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
        await ctx.reply(
          MESSAGES.SAVED_DETAILS(name, user.phone!, user.address!),
          { reply_markup: useOrUpdateDetailsKeyboard(caseId, 'claim') },
        );
      }
    } catch (err) {
      console.error('[callback] Failed to escalate case:', err);
      await ctx.reply(MESSAGES.GENERIC_ERROR);
    }
    return;
  }

  if (action === 'snooze') {
    await ctx.reply(MESSAGES.SNOOZE_CONFIRMED(3));
    return;
  }

  if (action === 'resend') {
    try {
      const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
      if (!user) { await ctx.reply(MESSAGES.GENERIC_ERROR); return; }
      const hasDetails = user.firstName && user.lastName && user.phone && user.address;

      if (!hasDetails) {
        ctx.session.pendingCaseId = caseId;
        ctx.session.pendingAction = 'warning';
        if (!user.firstName || !user.lastName) {
          ctx.session.step = 'awaiting_name';
          await ctx.reply(MESSAGES.ASK_NAME, { reply_markup: cancelKeyboard() });
        } else if (!user.phone) {
          ctx.session.step = 'awaiting_phone';
          await ctx.reply(MESSAGES.ASK_PHONE, { reply_markup: cancelKeyboard() });
        } else {
          ctx.session.step = 'awaiting_address';
          await ctx.reply(MESSAGES.ASK_ADDRESS, { reply_markup: cancelKeyboard() });
        }
      } else {
        await triggerDocumentGeneration(ctx, caseId, 'warning');
      }
    } catch (err) {
      console.error('[callback] Failed to resend warning:', err);
      await ctx.reply(MESSAGES.GENERIC_ERROR);
    }
    return;
  }
}

async function handleSenderCallback(
  ctx: MyContext,
  action: string,
  caseId: string,
  businessDbId: string | undefined,
): Promise<void> {
  // confirm or select: link the pre-saved business to the case
  if ((action === 'confirm' || action === 'select') && businessDbId) {
    try {
      const business = await prisma.business.findUnique({ where: { id: businessDbId } });
      if (!business) {
        await ctx.reply(MESSAGES.GENERIC_ERROR);
        return;
      }

      await prisma.case.update({
        where: { id: caseId },
        data: { businessId: businessDbId, status: 'AWAITING_USER_DETAILS' },
      });
      await prisma.business.update({
        where: { id: businessDbId },
        data: { spamCount: { increment: 1 } },
      });

      // Update the SenderIdMapping to raise confidence
      const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
      if (caseRecord?.senderIdRaw) {
        await confirmSenderIdMapping(
          caseRecord.senderIdRaw,
          business.name,
          business.companyNumber ?? null,
          'user_reported',
        );
      }

      await ctx.reply(MESSAGES.BUSINESS_CONFIRMED(business.name));
      await ctx.reply('מה תרצה לעשות?', { reply_markup: caseActionsKeyboard(caseId) });
    } catch (err) {
      console.error('[callback] Failed to confirm sender:', err);
      await ctx.reply(MESSAGES.GENERIC_ERROR);
    }
    return;
  }

  // wrong or manual: user rejected the suggestion — ask for manual input
  if (action === 'wrong' || action === 'manual') {
    ctx.session.pendingCaseId = caseId;
    ctx.session.step = 'awaiting_business_name';
    await ctx.reply(MESSAGES.BUSINESS_NOT_FOUND, { reply_markup: cancelKeyboard() });
    return;
  }
}
