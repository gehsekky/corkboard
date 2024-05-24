import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getSession } from '.server/session';
import BoardLandingPage from 'components/BoardLandingPage';
import { BoardDTO, getBoardById, updateBoard } from '.server/board';
import Header from 'components/Header';
import { BoardContext } from 'context';
import { useState } from 'react';

export const loader = async ({ request, params } : LoaderFunctionArgs) => {
  const session = await getSession(
    request.headers.get('Cookie')
  );
  if (!session.has('id')) {
    throw redirect('/login');
  }

  const boardDTO = await getBoardById(params.boardId || '');
  if (!boardDTO) {
    throw new Error('could not get board');
  }
  return json({ boardDTO });
};

export const action = async ({ request, params } : ActionFunctionArgs) => {
  switch (request.method.toLowerCase()) {
    case 'put':
      const board = await request.json();
      const updatedBoard = await updateBoard(board);
      if (!updatedBoard) {
        throw new Error('could not update board');
      }
    case 'get':
      return null;
    default:
      throw new Error('unsupported http method');
  }
};

export default function BoardIndex() {
  const loaderData = useLoaderData<typeof loader>();
  if (!loaderData) {
    throw new Error('could not get loader data');
  }
  const boardDTO = loaderData.boardDTO as unknown as BoardDTO;
  const [board, setBoard] = useState(boardDTO);

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
