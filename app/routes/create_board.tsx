import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { createBoard } from '.server/board';
import { verifySession } from '.server/session';
import { createBoardSchema, parseFormData } from '.server/validate';
import CreateBoardPage from 'components/CreateBoardPage';
import Header from 'components/Header';

export const loader = async ({ request } : LoaderFunctionArgs) => {
  const { headers } = await verifySession(request);
  return json(null, { headers });
};

export async function action({ request } : ActionFunctionArgs) {
  const { session, headers } = await verifySession(request);
  const userId = session.get('id') || '';
  if (request.method.toLowerCase() !== 'post') {
    return json(null, { headers });
  }
  const { name, color } = await parseFormData(request, createBoardSchema);
  const newBoard = await createBoard(name, color, userId);
  if (!newBoard) {
    throw new Error('could not create new board');
  }
  throw redirect(`/board/${newBoard.id}`, { headers });
}

export default function Index() {
  return (
    <>
      <Header />
      <CreateBoardPage />
    </>
  );
}
