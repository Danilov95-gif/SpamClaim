import { MESSAGES } from '../../templates/messages.js';
import type { MyContext } from '../index.js';

export async function helpHandler(ctx: MyContext): Promise<void> {
  await ctx.reply(MESSAGES.HELP, { parse_mode: 'Markdown' });
}
