import { ActionFunctionArgs, redirect } from '@remix-run/node';
import { assertSameOrigin } from '.server/csrf';
import { buildAuthorizationRedirect } from '.server/auth/oidc';
import { authInitiateSchema, parseFormData } from '.server/validate';

export const action = async ({ request, params }: ActionFunctionArgs) => {
  assertSameOrigin(request);
  const providerId = params.provider;
  if (!providerId) {
    throw new Response(null, { status: 404 });
  }
  const { returnTo } = await parseFormData(request, authInitiateSchema);
  const safeReturnTo = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : undefined;
  const { url, flowCookieHeader } = await buildAuthorizationRedirect(providerId, safeReturnTo);
  return redirect(url, { headers: { 'Set-Cookie': flowCookieHeader } });
};

export const loader = () => {
  throw new Response(null, { status: 405 });
};
