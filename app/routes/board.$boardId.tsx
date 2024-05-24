import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { verifySession } from '.server/session';
import BoardLandingPage from 'components/BoardLandingPage';
import { BoardDTO, getBoardById, updateBoard } from '.server/board';
import Header from 'components/Header';
import { BoardContext } from 'context';
import { useState } from 'react';

export const loader = async ({ request, params } : LoaderFunctionArgs) => {
  await verifySession(request);

  const boardDTO = await getBoardById(params.boardId || '');
  if (!boardDTO) {
    throw new Error('could not get board');
  }
  return json({ boardDTO });
};

export const action = async ({ request } : ActionFunctionArgs) => {
  await verifySession(request);

  switch (request.method.toLowerCase()) {
    case 'put':
      const board = await request.json();
      const updatedBoard = await updateBoard(board);
      if (!updatedBoard) {
        throw new Error('could not update board');
      }
      return null;
    default:
      throw new Error('unsupported http method');
  }
};

export default function BoardIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const [board, setBoard] = useState(loaderData.boardDTO as unknown as BoardDTO);

  return (
    <>
      <BoardContext.Provider value={{
        board,
        setBoard,
      }}>
        <Header />
        <BoardLandingPage />
      </BoardContext.Provider>
    </>
  );
}
