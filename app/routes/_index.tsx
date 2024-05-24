import { LoaderFunctionArgs, json } from '@remix-run/node';
import { verifySession } from '.server/session';
import LandingPage from 'components/LandingPage';
import { getBoardsByUserId } from '.server/board';
import BoardList from 'components/BoardList';
import { useLoaderData } from '@remix-run/react';
import Header from 'components/Header';

export const loader = async ({ request } : LoaderFunctionArgs) => {
  const session = await verifySession(request);
  const boards = await getBoardsByUserId(session.get('id') || '');
  return json(boards);
};

export default function Index() {
  const loaderData : any = useLoaderData<typeof loader>();

  return (
    <>
      <Header />
      <LandingPage>
        <BoardList boards={loaderData} />
      </LandingPage>
    </>
  );
}
