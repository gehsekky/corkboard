import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from '@remix-run/node';
import { createBoard } from '.server/board';
import { getSession } from '.server/session';
import CreateBoardPage from 'components/CreateBoardPage';
import Header from 'components/Header';

export const loader = async ({ request } : LoaderFunctionArgs) => {
  const session = await getSession(
    request.headers.get('Cookie')
  );
  if (!session.has('id')) {
    throw redirect('/login');
  }

  return null;
};

export async function action({ request } : ActionFunctionArgs) {
  const session = await getSession(request.headers.get('Cookie'));
  let userId = '';
  if (session.has('id')) {
    userId = session.get('id')?.toString() || '';
  }
  if (request.method.toLowerCase() === 'post') {
    const formData = await request.formData();
    if (!formData.has('name') || !formData.has('color')) {
      throw new Error('incomplete form detected. must provide name and color.');
    }

    const name = formData.get('name')?.toString() || '';
    const color = formData.get('color')?.toString() || '';

    const newBoard = await createBoard(name, color, userId);
    if (!newBoard) {
      throw new Error('could not create new board');
    }

    // redirect to newly created board
    throw redirect(`/board/${newBoard.id}`);
  }

  return null;
}

export default function Index() {
  return (
    <>
      <Header />
      <CreateBoardPage />
    </>
  );
}
