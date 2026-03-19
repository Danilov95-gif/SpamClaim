import type { NextFunction } from 'grammy';
import { prisma } from '../../db/index.js';
import type { MyContext } from '../index.js';

export async function authMiddleware(ctx: MyContext, next: NextFunction): Promise<void> {
  const from = ctx.from;
  if (!from) {
    await next();
    return;
  }

  const telegramId = BigInt(from.id);

  let user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        firstName: from.first_name ?? null,
        lastName: from.last_name ?? null,
      },
    });
  } else {
    // Only sync the Telegram display name if the user has not yet provided their
    // real legal name through the detail-collection flow (indicated by no phone saved).
    // Once a user has submitted their own name, we must not overwrite it.
    const userHasVerifiedDetails = user.phone !== null;
    if (!userHasVerifiedDetails) {
      const needsUpdate =
        user.firstName !== (from.first_name ?? null) ||
        user.lastName !== (from.last_name ?? null);

      if (needsUpdate) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: from.first_name ?? null,
            lastName: from.last_name ?? null,
          },
        });
      }
    }
  }

  ctx.user = user;
  await next();
}
