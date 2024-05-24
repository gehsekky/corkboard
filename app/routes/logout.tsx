import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { destroySession, getSession } from '.server/session';

export const loader = async ({ request } : LoaderFunctionArgs) => {
  const session = await getSession(request.headers.get('Cookie'));
  if (session.has('id')) {
    throw redirect('/login', {
      headers: {
        'Set-Cookie': await destroySession(session),
      }
    });
  }

  throw redirect('/login');
};
