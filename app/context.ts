import { BoardDTO } from '.server/board';
import { SessionData } from '@remix-run/node';
import React, { createContext } from 'react';

type BoardContextType = {
  board : BoardDTO | null,
  setBoard : Function,
};

export const BoardContext = createContext({
  board: null,
  setBoard: () => null,
} as BoardContextType);
export const SessionContext = createContext<SessionData | null>(null);
