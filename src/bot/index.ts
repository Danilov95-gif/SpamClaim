import { Bot, Context, SessionFlavor, session } from 'grammy';
import type { User } from '@prisma/client';

export type ConversationStep =
  | 'idle'
  | 'awaiting_name'
  | 'awaiting_phone'
  | 'awaiting_address'
  | 'awaiting_business_name';

export interface SessionData {
  step: ConversationStep;
  pendingCaseId: string | null;
  pendingAction: 'warning' | 'claim' | null;
}

export interface UserFlavor {
  user: User;
}

export type MyContext = Context & SessionFlavor<SessionData> & UserFlavor;

const token = process.env['BOT_TOKEN'];
if (!token) throw new Error('BOT_TOKEN is required');

export const bot = new Bot<MyContext>(token);

bot.use(
  session({
    initial: (): SessionData => ({
      step: 'idle',
      pendingCaseId: null,
      pendingAction: null,
    }),
  }),
);
