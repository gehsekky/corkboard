import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type BoardDTO = Prisma.boardGetPayload<{ include: { board_item: true }}>;

export const createBoard = async (name : string, color: string, createdById : string) => {
  return await prisma.board.create({
    data: {
      name,
      background_color: color,
      created_by: createdById,
    }
  });
};

export const getBoardById = async (boardId : string) => {
  return await prisma.board.findUnique({
    where: {
      id: boardId,
    },
    include: {
      board_item: {
        where: {
          is_deleted: false,
        }
      },
    }
  });
};

export const getBoardsByUserId = async (userId : string) => {
  return await prisma.board.findMany({
    where: {
      created_by: userId,
    }
  })
};

export const updateBoard = async (boardDTO : BoardDTO) => {
  return await prisma.board.update({
    where: {
      id: boardDTO.id,
    },
    data: {
      background_color: boardDTO.background_color,
      name: boardDTO.name,
      updated_at: new Date().toISOString(),
    }
  });
};
