import { board, board_item } from '@prisma/client';
import { SessionData } from '@remix-run/node';
import { createContext } from 'react';

type BoardContextType = {
  board : board | null,
  boardItems : board_item[],
  setBoard : Function,
  setBoardItems : Function,
};

export const BoardContext = createContext<BoardContextType>({
  board: null,
  boardItems: [],
  setBoard: () => null,
  setBoardItems: () => null,
} as BoardContextType);

export const SessionContext = createContext<SessionData | null>(null);
