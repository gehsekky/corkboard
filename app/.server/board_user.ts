import { Prisma } from '@prisma/client';
import { prisma } from './db';

export type BoardUserWithBoard = Prisma.board_userGetPayload<{ include: { board: true } }>;

export const getBoardUsersByBoardId = async (boardId : string) => {
  return await prisma.board_user.findMany({
    where: {
      board_id: boardId,
      is_deleted: false,
    },
    include: {
      user: true,
    },
  });
};