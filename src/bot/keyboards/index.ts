import { InlineKeyboard } from 'grammy';
import { MESSAGES } from '../../templates/messages.js';

export function caseActionsKeyboard(caseId: string, showManualBusiness = false): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text(MESSAGES.BUTTONS.WARNING_LETTER, `action:warning:${caseId}`)
    .text(MESSAGES.BUTTONS.FILE_CLAIM, `action:claim:${caseId}`)
    .row()
    .text(MESSAGES.BUTTONS.SAVE_FOR_LATER, `action:save:${caseId}`);
  if (showManualBusiness) {
    kb.row().text(MESSAGES.BUTTONS.ENTER_BUSINESS, `business:manual:${caseId}`);
  }
  return kb;
}

export function cancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text(MESSAGES.BUTTONS.CANCEL, 'cancel');
}

export function businessSelectionKeyboard(
  matches: Array<{ id: string; name: string; address: string | null }>,
  caseId: string,
): InlineKeyboard {
  const emojis = ['1️⃣', '2️⃣', '3️⃣'];
  const kb = new InlineKeyboard();
  matches.slice(0, 3).forEach((biz, i) => {
    const emoji = emojis[i] ?? String(i + 1);
    kb.text(emoji, `business:confirm:${biz.id}:${caseId}`).row();
  });
  kb.text(MESSAGES.BUTTONS.MANUAL_ENTRY, `business:manual:${caseId}`);
  return kb;
}

export function warningFollowupKeyboard(caseId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(MESSAGES.BUTTONS.YES_SENT, `reminder:sent:${caseId}`)
    .row()
    .text(MESSAGES.BUTTONS.RESEND_PDF, `reminder:resend:${caseId}`)
    .row()
    .text(MESSAGES.BUTTONS.SNOOZE, `reminder:snooze:${caseId}`);
}

export function useOrUpdateDetailsKeyboard(caseId: string, action: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(MESSAGES.BUTTONS.USE_SAVED_DETAILS, `details:use_saved:${caseId}:${action}`)
    .row()
    .text(MESSAGES.BUTTONS.UPDATE_DETAILS, `details:update:${caseId}:${action}`);
}

export function senderConfirmKeyboard(businessDbId: string, caseId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ כן, זה נכון', `sender:confirm:${caseId}:${businessDbId}`)
    .row()
    .text('❌ לא, זה לא', `sender:wrong:${caseId}`);
}

export function senderCandidatesKeyboard(
  candidates: Array<{ businessName: string; businessDbId: string }>,
  caseId: string,
): InlineKeyboard {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
  const kb = new InlineKeyboard();
  candidates.slice(0, 4).forEach((c, i) => {
    const emoji = emojis[i] ?? String(i + 1);
    kb.text(`${emoji} ${c.businessName}`, `sender:select:${caseId}:${c.businessDbId}`).row();
  });
  kb.text('❓ אף אחד מהם', `sender:manual:${caseId}`);
  return kb;
}

export function claimNotAvailableKeyboard(caseId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('📧 כן, צור מכתב התראה', `action:warning:${caseId}`)
    .row()
    .text('❌ ביטול', 'cancel');
}

export function responseCheckKeyboard(caseId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(MESSAGES.BUTTONS.YES_RESOLVED, `reminder:resolved:${caseId}`)
    .row()
    .text(MESSAGES.BUTTONS.NO_RESPONSE, `reminder:escalate:${caseId}`)
    .row()
    .text(MESSAGES.BUTTONS.NEGATIVE_RESPONSE, `reminder:escalate:${caseId}`);
}
