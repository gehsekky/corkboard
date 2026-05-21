export type OidcProviderConfig = {
  id: string;
  label: string;
  issuer: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  hostedDomain?: string;
};

const callbackBaseUrl = process.env.AUTH_CALLBACK_BASE_URL;
if (!callbackBaseUrl) {
  throw new Error('AUTH_CALLBACK_BASE_URL environment variable is required');
}

export const getRedirectUri = (providerId: string): string => {
  return `${callbackBaseUrl.replace(/\/$/, '')}/auth/${providerId}/callback`;
};

const registered: Record<string, OidcProviderConfig> = {};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  registered.google = {
    id: 'google',
    label: 'Google',
    issuer: 'https://accounts.google.com',
    scopes: ['openid', 'email', 'profile'],
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    hostedDomain: process.env.GOOGLE_HOSTED_DOMAIN,
  };
}

export const providers = registered;

export const getProvider = (id: string): OidcProviderConfig | null => {
  return providers[id] ?? null;
};

export const listProviders = (): OidcProviderConfig[] => {
  return Object.values(providers);
};

const allowedEmailDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const isEmailDomainAllowed = (email: string): boolean => {
  if (allowedEmailDomains.length === 0) {
    return true;
  }
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? allowedEmailDomains.includes(domain) : false;
};
