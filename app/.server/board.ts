import { PrismaClient, board } from '@prisma/client';

const prisma = new PrismaClient();

export const createBoard = async (name : string, color: string, createdById : string) => {
  return await prisma.board.create({
    data: {
      name,
      background_color: color,
      created_by: createdById,
    },
  });
};

export const getBoardById = async (boardId : string) => {
  try {
    return await prisma.board.findUnique({
      where: {
        id: boardId,
      },
    });
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const getBoardsByUserId = async (userId : string) => {
  return await prisma.board.findMany({
    where: {
      created_by: userId,
    },
  })
};

export const updateBoard = async (board : board) => {
  return await prisma.board.update({
    where: {
      id: board.id,
    },
    data: {
      background_color: board.background_color,
      name: board.name,
      updated_at: new Date().toISOString(),
    },
  });
};
