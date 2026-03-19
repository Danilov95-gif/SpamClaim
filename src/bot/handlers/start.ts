import { MESSAGES } from '../../templates/messages.js';
import type { MyContext } from '../index.js';

export async function startHandler(ctx: MyContext): Promise<void> {
  ctx.session.step = 'idle';
  ctx.session.pendingCaseId = null;
  ctx.session.pendingAction = null;

  await ctx.reply(MESSAGES.WELCOME);
}
