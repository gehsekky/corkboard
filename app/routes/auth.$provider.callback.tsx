import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { handleCallback } from '.server/auth/oidc';
import { commitSession, getSession } from '.server/session';
import { upsertUserFromIdentity } from '.server/user';
import { limitByIp } from '.server/rate-limit';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  limitByIp(request, 'auth-callback', { limit: 20, windowSeconds: 60 });
  const providerId = params.provider;
  if (!providerId) {
    throw new Response(null, { status: 404 });
  }
  const { profile, returnTo, clearFlowCookieHeader } = await handleCallback(providerId, request);
  const user = await upsertUserFromIdentity(profile);

  const session = await getSession(request.headers.get('Cookie'));
  session.set('id', user.id);
  session.set('name', user.name);

  const headers = new Headers();
  headers.append('Set-Cookie', clearFlowCookieHeader);
  headers.append('Set-Cookie', await commitSession(session));

  return redirect(returnTo, { headers });
};
