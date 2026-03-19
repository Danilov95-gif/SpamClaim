import { InputFile } from 'grammy';
import { MESSAGES } from '../../templates/messages.js';
import { buildWarningLetterData } from '../../templates/warning-letter.js';
import { prisma } from '../../db/index.js';
import { generateWarningLetterDocx } from '../../services/document.js';
import { isIsraeliPhone, formatIsraeliPhone } from '../../utils/phone.js';
import { cancelKeyboard, caseActionsKeyboard } from '../keyboards/index.js';
import type { MyContext } from '../index.js';

// Exported so callback.ts can call it after confirming details exist
export async function triggerDocumentGeneration(
  ctx: MyContext,
  caseId: string,
  action: 'warning' | 'claim',
): Promise<void> {
  if (action === 'warning') {
    await generateWarningLetter(ctx, caseId);
  } else {
    // Claim generation - same flow as warning for MVP
    await ctx.reply(MESSAGES.CLAIM_GENERATING);
    await generateWarningLetter(ctx, caseId); // placeholder; full claim in Prompt 9
  }
}

async function generateWarningLetter(ctx: MyContext, caseId: string): Promise<void> {
  await ctx.reply(MESSAGES.WARNING_GENERATING);

  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { user: true, business: true },
  });

  if (!caseRecord) {
    await ctx.reply(MESSAGES.GENERIC_ERROR);
    return;
  }

  try {
    const data = buildWarningLetterData({
      user: caseRecord.user,
      business: caseRecord.business,
      spamCase: {
        senderPhone: caseRecord.senderPhone,
        senderIdRaw: caseRecord.senderIdRaw,
        spamReceivedAt: caseRecord.spamReceivedAt,
      },
    });

    const docBuffer = await generateWarningLetterDocx(data);

    await ctx.replyWithDocument(new InputFile(docBuffer, 'warning-letter.docx'), {
      caption: MESSAGES.WARNING_READY,
      parse_mode: 'Markdown',
    });

    await prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'WARNING_GENERATED',
        warningGeneratedAt: new Date(),
      },
    });

    // Schedule reminders (Day 7 and Day 14)
    const now = new Date();
    await prisma.reminder.createMany({
      data: [
        {
          caseId,
          type: 'WARNING_SEND_CHECK',
          scheduledFor: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          caseId,
          type: 'RESPONSE_CHECK',
          scheduledFor: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
      ],
    });
  } catch (err) {
    console.error('[collect-details] Document generation error:', err);
    await ctx.reply(MESSAGES.GENERIC_ERROR);
  }
}

export async function collectDetailsHandler(ctx: MyContext): Promise<void> {
  const text = ctx.message?.text;
  if (!text) return;

  const { step, pendingCaseId, pendingAction } = ctx.session;

  if (step === 'awaiting_name') {
    const nameParts = text.trim().split(/\s+/);
    if (nameParts.length < 2) {
      await ctx.reply('אנא הזן שם פרטי ושם משפחה (לפחות שתי מילים).', {
        reply_markup: cancelKeyboard(),
      });
      return;
    }

    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ');

    try {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { firstName, lastName },
      });
    } catch (err) {
      console.error('[collect-details] Failed to save name:', err);
      await ctx.reply(MESSAGES.GENERIC_ERROR);
      return;
    }

    ctx.session.step = 'awaiting_phone';
    await ctx.reply(MESSAGES.ASK_PHONE, { reply_markup: cancelKeyboard() });
    return;
  }

  if (step === 'awaiting_phone') {
    const phone = text.trim();
    if (!isIsraeliPhone(phone)) {
      await ctx.reply(MESSAGES.INVALID_PHONE, { reply_markup: cancelKeyboard() });
      return;
    }

    try {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { phone: formatIsraeliPhone(phone) },
      });
    } catch (err) {
      console.error('[collect-details] Failed to save phone:', err);
      await ctx.reply(MESSAGES.GENERIC_ERROR);
      return;
    }

    ctx.session.step = 'awaiting_address';
    await ctx.reply(MESSAGES.ASK_ADDRESS, { reply_markup: cancelKeyboard() });
    return;
  }

  if (step === 'awaiting_address') {
    try {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { address: text.trim() },
      });
    } catch (err) {
      console.error('[collect-details] Failed to save address:', err);
      await ctx.reply(MESSAGES.GENERIC_ERROR);
      return;
    }

    ctx.session.step = 'idle';
    await ctx.reply(MESSAGES.DETAILS_SAVED);

    // Continue with the pending action
    if (pendingCaseId && pendingAction) {
      await triggerDocumentGeneration(ctx, pendingCaseId, pendingAction);
    }

    ctx.session.pendingCaseId = null;
    ctx.session.pendingAction = null;
    return;
  }

  if (step === 'awaiting_business_name') {
    const businessName = text.trim();

    if (pendingCaseId) {
      try {
        // Create a new business entry with the manually typed name
        const business = await prisma.business.create({
          data: {
            name: businessName,
            phones: '[]',
          },
        });

        await prisma.case.update({
          where: { id: pendingCaseId },
          data: { businessId: business.id },
        });

        await ctx.reply(MESSAGES.BUSINESS_CONFIRMED(businessName));
      } catch (err) {
        console.error('[collect-details] Failed to save business:', err);
        await ctx.reply(MESSAGES.GENERIC_ERROR);
        ctx.session.step = 'idle';
        ctx.session.pendingCaseId = null;
        ctx.session.pendingAction = null;
        return;
      }
    }

    ctx.session.step = 'idle';

    if (pendingCaseId && pendingAction) {
      await triggerDocumentGeneration(ctx, pendingCaseId, pendingAction);
      ctx.session.pendingCaseId = null;
      ctx.session.pendingAction = null;
    } else if (pendingCaseId) {
      // Sender ID manual entry path: business linked, now let the user choose an action
      await ctx.reply('מה תרצה לעשות?', { reply_markup: caseActionsKeyboard(pendingCaseId) });
      ctx.session.pendingCaseId = null;
    }

    return;
  }
}
