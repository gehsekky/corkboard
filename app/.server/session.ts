import { createCookieSessionStorage } from '@remix-run/node';

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
