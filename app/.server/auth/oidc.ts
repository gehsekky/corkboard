import { createCookie } from '@remix-run/node';
import { Client, Issuer, generators } from 'openid-client';
import { getProvider, getRedirectUri, isEmailDomainAllowed, OidcProviderConfig } from './providers';
import { NormalizedProfile } from '../user';

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const FLOW_COOKIE_MAX_AGE = 60 * 10;

export const flowCookie = createCookie('__oidc_flow', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: FLOW_COOKIE_MAX_AGE,
  secrets: [SESSION_SECRET],
});

type FlowState = {
  providerId: string;
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo?: string;
};

const clientCache = new Map<string, Promise<Client>>();

const getClient = async (provider: OidcProviderConfig): Promise<Client> => {
  const cached = clientCache.get(provider.id);
  if (cached) return cached;
  const promise = (async () => {
    const issuer = await Issuer.discover(provider.issuer);
    return new issuer.Client({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      redirect_uris: [getRedirectUri(provider.id)],
      response_types: ['code'],
    });
  })();
  clientCache.set(provider.id, promise);
  try {
    return await promise;
  } catch (err) {
    clientCache.delete(provider.id);
    throw err;
  }
};

export const buildAuthorizationRedirect = async (
  providerId: string,
  returnTo?: string,
): Promise<{ url: string; flowCookieHeader: string }> => {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Response('unknown provider', { status: 404 });
  }
  const client = await getClient(provider);
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();
  const nonce = generators.nonce();

  const url = client.authorizationUrl({
    scope: provider.scopes.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
    ...(provider.hostedDomain ? { hd: provider.hostedDomain } : {}),
  });

  const flow: FlowState = { providerId, state, nonce, codeVerifier, returnTo };
  const flowCookieHeader = await flowCookie.serialize(flow);

  return { url, flowCookieHeader };
};

export const handleCallback = async (
  providerId: string,
  request: Request,
): Promise<{ profile: NormalizedProfile; returnTo: string; clearFlowCookieHeader: string }> => {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Response('unknown provider', { status: 404 });
  }

  const flow: FlowState | null = await flowCookie.parse(request.headers.get('Cookie'));
  if (!flow || flow.providerId !== providerId) {
    throw new Response('invalid auth flow', { status: 400 });
  }

  const client = await getClient(provider);
  const params = client.callbackParams(request.url);

  const tokenSet = await client.callback(getRedirectUri(provider.id), params, {
    code_verifier: flow.codeVerifier,
    state: flow.state,
    nonce: flow.nonce,
  });

  const claims = tokenSet.claims();
  const email = typeof claims.email === 'string' ? claims.email : '';
  const emailVerified = claims.email_verified === true;
  const sub = claims.sub;
  const name = typeof claims.name === 'string' ? claims.name : email;

  if (!email || !sub) {
    throw new Response('provider returned incomplete profile', { status: 400 });
  }
  if (!emailVerified) {
    throw new Response('email not verified by provider', { status: 403 });
  }
  if (!isEmailDomainAllowed(email)) {
    throw new Response('email domain not allowed', { status: 403 });
  }
  if (provider.hostedDomain) {
    const hd = typeof claims.hd === 'string' ? claims.hd : null;
    if (hd !== provider.hostedDomain) {
      throw new Response('hosted domain mismatch', { status: 403 });
    }
  }

  const profile: NormalizedProfile = {
    provider: providerId,
    providerUserId: sub,
    email,
    emailVerified,
    name,
  };

  return {
    profile,
    returnTo: flow.returnTo || '/',
    clearFlowCookieHeader: await flowCookie.serialize('', { maxAge: 0 }),
  };
};
