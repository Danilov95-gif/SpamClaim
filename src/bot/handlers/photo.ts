import { MESSAGES } from '../../templates/messages.js';
import { checkPhotoRateLimit } from '../../utils/rate-limit.js';
import { prisma } from '../../db/index.js';
import { performOcr } from '../../services/ocr.js';
import {
  lookupBusinessByPhone,
  lookupBusinessByName,
  saveBusinessFromRegistry,
} from '../../services/business.js';
import {
  identifySender,
  upsertBusinessFromSenderId,
} from '../../services/sender-identifier.js';
import { formatHebrewDate } from '../../utils/date.js';
import {
  caseActionsKeyboard,
  businessSelectionKeyboard,
  senderConfirmKeyboard,
  senderCandidatesKeyboard,
  cancelKeyboard,
} from '../keyboards/index.js';
import type { MyContext } from '../index.js';

export async function photoHandler(ctx: MyContext): Promise<void> {
  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) return;

  if (!checkPhotoRateLimit(ctx.user.id)) {
    await ctx.reply(MESSAGES.PHOTO_RATE_LIMITED);
    return;
  }

  // Get highest resolution photo (last in array)
  const highResPhoto = photos[photos.length - 1];
  if (!highResPhoto) return;

  const fileId = highResPhoto.file_id;

  await ctx.reply(MESSAGES.PROCESSING);

  try {
    // Download the file from Telegram
    const file = await ctx.api.getFile(fileId);
    if (!file.file_path) {
      await ctx.reply(MESSAGES.PROCESSING_ERROR);
      return;
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env['BOT_TOKEN']}/${file.file_path}`;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      await ctx.reply(MESSAGES.PROCESSING_ERROR);
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Run OCR
    const ocrResult = await performOcr(buffer);

    // ── Path A: numeric phone found ───────────────────────────────────────────
    if (ocrResult.phoneNumbers.length > 0) {
      const senderPhone = ocrResult.phoneNumbers[0] ?? '';

      const newCase = await prisma.case.create({
        data: {
          userId: ctx.user.id,
          screenshotFileId: fileId,
          ocrText: ocrResult.text,
          senderPhone,
          spamReceivedAt: ocrResult.detectedDate ?? null,
          status: 'NEW',
        },
      });

      const dateStr = ocrResult.detectedDate ? formatHebrewDate(ocrResult.detectedDate) : null;

      // 1. Lookup by phone in internal DB (fastest, most confident)
      const phoneMatch = await lookupBusinessByPhone(senderPhone);
      if (phoneMatch) {
        await prisma.case.update({
          where: { id: newCase.id },
          data: { businessId: phoneMatch.id, status: 'AWAITING_USER_DETAILS' },
        });
        await ctx.reply(
          MESSAGES.OCR_SUCCESS(senderPhone, phoneMatch.name, dateStr),
          { reply_markup: caseActionsKeyboard(newCase.id) },
        );
        return;
      }

      // 2. Lookup by OCR-detected business name (Sender ID header, then advertiser from body)
      const businessNameCandidates = [
        ocrResult.possibleBusinessName,
        ocrResult.advertiserName,
      ].filter((n): n is string => Boolean(n));

      for (const candidate of businessNameCandidates) {
        const nameMatches = await lookupBusinessByName(candidate);

        if (nameMatches.length > 0) {
          for (const match of nameMatches) {
            if (match.source === 'registry') {
              const dbId = await saveBusinessFromRegistry(match, senderPhone);
              match.id = dbId;
            }
          }
          await ctx.reply(
            MESSAGES.BUSINESS_MATCHES(nameMatches.map(m => ({ name: m.name, address: m.address ?? undefined }))),
            { reply_markup: businessSelectionKeyboard(nameMatches, newCase.id) },
          );
          return;
        }
      }

      // 3. No business found — show OCR-detected name if any, and allow manual entry
      const detectedName = ocrResult.possibleBusinessName ?? ocrResult.advertiserName ?? null;
      await ctx.reply(
        MESSAGES.OCR_SUCCESS(senderPhone, detectedName, dateStr),
        { reply_markup: caseActionsKeyboard(newCase.id, true) },
      );
      return;
    }

    // ── Path B: alphanumeric Sender ID (no phone number) ─────────────────────
    if (ocrResult.possibleBusinessName) {
      const senderName = ocrResult.possibleBusinessName;

      const newCase = await prisma.case.create({
        data: {
          userId: ctx.user.id,
          screenshotFileId: fileId,
          ocrText: ocrResult.text,
          senderIdRaw: senderName,
          spamReceivedAt: ocrResult.detectedDate ?? null,
          status: 'NEW',
        },
      });

      // If Gemini identified the actual advertiser from the message body, use that for lookup too
      const identification = await identifySender(ocrResult.advertiserName ?? senderName);

      if (!identification.requiresManualReview && identification.best) {
        // High-confidence single match — ask for confirmation
        const businessDbId = await upsertBusinessFromSenderId(identification.best);
        identification.best.businessDbId = businessDbId;

        const info = [
          `🏢 ${identification.best.businessName}`,
          identification.best.companyNumber ? `ח.פ: ${identification.best.companyNumber}` : null,
          identification.best.address ? `📍 ${identification.best.address}` : null,
        ].filter(Boolean).join('\n');

        await ctx.reply(
          `🔍 זיהיתי את השולח "${senderName}":\n\n${info}\n\nהאם זה נכון?`,
          { reply_markup: senderConfirmKeyboard(businessDbId, newCase.id) },
        );
        return;
      }

      if (identification.allCandidates.length > 0) {
        // Multiple candidates — let user choose
        const candidatesWithIds: Array<{ businessName: string; businessDbId: string }> = [];
        for (const c of identification.allCandidates) {
          const dbId = await upsertBusinessFromSenderId(c);
          candidatesWithIds.push({ businessName: c.businessName, businessDbId: dbId });
        }

        await ctx.reply(
          `🔍 מצאתי כמה אפשרויות לשולח "${senderName}":\nבחר את העסק הנכון:`,
          { reply_markup: senderCandidatesKeyboard(candidatesWithIds, newCase.id) },
        );
        return;
      }

      // No match at all — ask user to type the business name manually
      // Prefer advertiser name from body if available (more useful than raw sender ID)
      const displayHint = ocrResult.advertiserName ?? senderName;
      ctx.session.pendingCaseId = newCase.id;
      ctx.session.step = 'awaiting_business_name';
      await ctx.reply(
        `❓ לא הצלחתי לזהות את השולח "${displayHint}".\n\nהזן את שם העסק ואנסה לחפש ברשם החברות:`,
        { reply_markup: cancelKeyboard() },
      );
      return;
    }

    // ── Path C: no phone and no sender name ───────────────────────────────────
    await ctx.reply(MESSAGES.NO_PHONE_FOUND);
  } catch (err) {
    console.error('[photo] OCR error:', err);
    await ctx.reply(MESSAGES.PROCESSING_ERROR);
  }
}
