import { board_invite } from '@prisma/client';
import crypto from 'node:crypto';
import { prisma } from './db';
import { recordAudit } from './audit';

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const TOKEN_BYTES = 32;

export type InviteWithBoard = board_invite & { board: { id: string; name: string } };

export const createInvite = async (boardId: string, invitedById: string, email?: string): Promise<board_invite> => {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const invite = await prisma.board_invite.create({
    data: {
      board_id: boardId,
      invited_by: invitedById,
      email: email || null,
      token,
      expires_at: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  await recordAudit({
    boardId,
    actorUserId: invitedById,
    action: 'member.invited',
    details: { email: email || null, invite_id: invite.id },
  });
  return invite;
};

export const getInviteByToken = async (token: string): Promise<InviteWithBoard | null> => {
  const invite = await prisma.board_invite.findUnique({
    where: { token },
    include: { board: { select: { id: true, name: true } } },
  });
  return invite;
};

export const isInviteRedeemable = (invite: board_invite): boolean => {
  if (invite.accepted_at !== null) return false;
  if (invite.expires_at.getTime() < Date.now()) return false;
  return true;
};

export const acceptInvite = async (token: string, userId: string): Promise<{ boardId: string }> => {
  return await prisma.$transaction(async (tx) => {
    const invite = await tx.board_invite.findUnique({ where: { token } });
    if (!invite) {
      throw new Response('invite not found', { status: 404 });
    }
    if (invite.accepted_at !== null) {
      throw new Response('invite already used', { status: 410 });
    }
    if (invite.expires_at.getTime() < Date.now()) {
      throw new Response('invite expired', { status: 410 });
    }

    const existingMembership = await tx.board_user.findUnique({
      where: { user_id_board_id: { user_id: userId, board_id: invite.board_id } },
    });
    if (!existingMembership) {
      await tx.board_user.create({
        data: { board_id: invite.board_id, user_id: userId },
      });
    } else if (existingMembership.is_deleted) {
      await tx.board_user.update({
        where: { user_id_board_id: { user_id: userId, board_id: invite.board_id } },
        data: { is_deleted: false, updated_at: new Date() },
      });
    }

    await tx.board_invite.update({
      where: { id: invite.id },
      data: { accepted_at: new Date() },
    });

    await recordAudit({
      tx,
      boardId: invite.board_id,
      actorUserId: userId,
      action: 'member.joined',
      details: { invite_id: invite.id },
    });

    return { boardId: invite.board_id };
  });
};
