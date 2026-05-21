import { createCookieSessionStorage, redirect, Session } from '@remix-run/node';
import { assertSameOrigin } from './csrf';

type SessionData = {
  id: string;
  name: string;
};

type SessionFlashData = {
  error: string;
};

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 2;

const { getSession, commitSession, destroySession } = createCookieSessionStorage<SessionData, SessionFlashData>({
  cookie: {
    name: '__session',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secrets: [SESSION_SECRET],
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  },
});

export { getSession, commitSession, destroySession };

export type AppSession = Session<SessionData, SessionFlashData>;

export const verifySession = async (request: Request): Promise<{ session: AppSession; headers: HeadersInit }> => {
  assertSameOrigin(request);
  const session = await getSession(request.headers.get('Cookie'));
  if (!session.has('id')) {
    throw redirect('/login');
  }
  return {
    session,
    headers: { 'Set-Cookie': await commitSession(session) },
  };
};
