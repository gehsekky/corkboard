import { createCookieSessionStorage, redirect } from '@remix-run/node';

type SessionData = {
  id : string;
  name : string;
};

type SessionFlashData = {
  error : string;
};

const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData, SessionFlashData>({
  cookie: {
    name: '__session',
    httpOnly: true,
    secure: true,
    path: '/',
    domain: 'localhost',
    expires: new Date(Date.now() + 60000000),
  }
});

export { getSession, commitSession, destroySession };

export const verifySession = async (request : Request) => {
  const session = await getSession(request.headers.get('Cookie'));
  if (!session.has('id')) {
    throw redirect('/login');
  }

  return session;
};
