import { prisma } from './db';

export const createBoard = async (name : string, color: string, createdById : string) => {
  return await prisma.$transaction(async (tx) => {
    const newBoard = await tx.board.create({
      data: {
        name,
        background_color: color,
        created_by: createdById,
      },
    });

    await tx.board_user.create({
      data: {
        board_id: newBoard.id,
        user_id: createdById,
      }
    });

    return newBoard;
  });
};

export const getBoardById = async (boardId : string) => {
  return await prisma.board.findUnique({
    where: { id: boardId },
  });
};

export const getBoardWithItemsAndUsers = async (boardId: string) => {
  return await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      board_item: { where: { is_deleted: false } },
      board_user: {
        where: { is_deleted: false },
        include: { user: true },
      },
    },
  });
};

export const getBoardsByUserId = async (userId : string) => {
  return await prisma.board_user.findMany({
    where: {
      user_id: userId,
    },
    include: {
      board: true,
    }
  })
};

export const updateBoard = async (id: string, data: { name: string; background_color: string }) => {
  return await prisma.board.update({
    where: { id },
    data: {
      background_color: data.background_color,
      name: data.name,
      updated_at: new Date(),
    },
  });
};
