import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { getSession, verifySession } from '.server/session';
import { acceptInvite, getInviteByToken, isInviteRedeemable } from '.server/invite';
import Header from 'components/Header';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const token = params.token;
  if (!token) {
    throw new Response(null, { status: 404 });
  }

  const existingSession = await getSession(request.headers.get('Cookie'));
  if (!existingSession.has('id')) {
    const returnTo = `/invite/${encodeURIComponent(token)}`;
    throw redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const { headers } = await verifySession(request);

  const invite = await getInviteByToken(token);
  if (!invite) {
    throw new Response('invite not found', { status: 404 });
  }
  if (!isInviteRedeemable(invite)) {
    throw new Response('invite expired or already used', { status: 410 });
  }

  return json({ boardName: invite.board.name }, { headers });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, headers } = await verifySession(request);
  const userId = session.get('id') || '';
  const token = params.token;
  if (!token) {
    throw new Response(null, { status: 404 });
  }
  const { boardId } = await acceptInvite(token, userId);
  throw redirect(`/board/${boardId}`, { headers });
};

export default function InvitePage() {
  const { boardName } = useLoaderData<typeof loader>();
  return (
    <>
      <Header />
      <div className="h-[calc(100vh-3rem)] w-full flex items-center justify-center">
        <div className="max-w-sm w-80 mx-auto text-center">
          <h1 className="text-xl mb-5">join &ldquo;{boardName}&rdquo;?</h1>
          <Form method="post">
            <button
              type="submit"
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              accept invite
            </button>
          </Form>
        </div>
      </div>
    </>
  );
}
