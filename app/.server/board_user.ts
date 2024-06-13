import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

export const createBoardUser = async (boardId : string, email : string) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: {
        email,
      }
    });
    if (!user) {
      throw new Error(`could not find user with email: ${email}`)
    }
    const boardUser = await tx.board_user.create({
      data: {
        board_id: boardId,
        user_id: user.id,
      }
    });
    
    return boardUser;
  });
}