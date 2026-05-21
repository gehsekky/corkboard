import { prisma } from './db';

export const getBoardItemsByBoardId = async (boardId : string) => {
  return await prisma.board_item.findMany({
    where: {
      board_id: boardId,
      is_deleted: false,
    },
  })
};

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

export const updateBoardItem = async (
  boardItemId: string,
  content: string | null,
  x: number | null,
  y: number | null,
  color: string | null,
) => {
  const data: {
    content?: string;
    x?: number;
    y?: number;
    background_color?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (content !== null) data.content = content;
  if (x !== null) data.x = x;
  if (y !== null) data.y = y;
  if (color !== null) data.background_color = color;
  return await prisma.board_item.update({
    where: { id: boardItemId },
    data,
  });
};
