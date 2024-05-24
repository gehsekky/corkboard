import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient()

export const createBoardItem = async (boardId : string, createdById : string, x : number, y : number, backgroundColor : string) => {
  return await prisma.board_item.create({
    data: {
      board_id: boardId,
      created_by: createdById,
      content: '',
      x,
      y,
      background_color: backgroundColor,
    }
  });
};

export const deleteBoardItem = async (boardItemId : string) => {
  return await prisma.board_item.update({
    where: {
      id: boardItemId,
    },
    data: {
      is_deleted: true,
      updated_at: new Date().toISOString(),
    }
  });
};

export const updateBoardItem = async (boardItemId : string, content : string, x : number, y : number, color : string) => {
  const data : any = {
    content,
    x,
    y,
    background_color: color,
    updated_at: new Date().toISOString(),
  };
  if (content === null) {
    delete data.content;
  }
  if (x === null) {
    delete data.x;
  }
  if (y === null) {
    delete data.y;
  }
  if (color === null) {
    delete data.background_color;
  }
  return await prisma.board_item.update({
    where: {
      id: boardItemId,
    },
    data,
  });
};
