import { prisma } from './db';

export const assertBoardMember = async (userId: string, boardId: string): Promise<void> => {
  if (!userId || !boardId) {
    throw new Response(null, { status: 404 });
  }
  const membership = await prisma.board_user.findUnique({
    where: { user_id_board_id: { user_id: userId, board_id: boardId } },
  });
  if (!membership || membership.is_deleted) {
    throw new Response(null, { status: 404 });
  }
};

export const assertBoardItemAccess = async (userId: string, boardItemId: string): Promise<string> => {
  if (!userId || !boardItemId) {
    throw new Response(null, { status: 404 });
  }
  const item = await prisma.board_item.findUnique({
    where: { id: boardItemId },
    select: { board_id: true, is_deleted: true },
  });
  if (!item || item.is_deleted) {
    throw new Response(null, { status: 404 });
  }
  await assertBoardMember(userId, item.board_id);
  return item.board_id;
};
