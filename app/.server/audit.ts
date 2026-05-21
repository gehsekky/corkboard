import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { log } from './log';

export type AuditAction =
  | 'board.created'
  | 'board.updated'
  | 'member.invited'
  | 'member.joined'
  | 'member.removed';

export const recordAudit = async (params: {
  boardId: string | null;
  actorUserId: string | null;
  action: AuditAction;
  details?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}): Promise<void> => {
  const client = params.tx ?? prisma;
  try {
    await client.board_audit.create({
      data: {
        board_id: params.boardId,
        actor_user_id: params.actorUserId,
        action: params.action,
        details: params.details ?? Prisma.JsonNull,
      },
    });
    log.info({ audit: true, action: params.action, boardId: params.boardId, actorUserId: params.actorUserId, details: params.details }, 'audit');
  } catch (err) {
    log.error({ err, action: params.action, boardId: params.boardId, actorUserId: params.actorUserId }, 'audit write failed');
  }
};
