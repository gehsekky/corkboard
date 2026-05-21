const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const assertSameOrigin = (request: Request): void => {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return;
  }

  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite !== null) {
    if (fetchSite === 'same-origin' || fetchSite === 'none') {
      return;
    }
    throw new Response('cross-site request rejected', { status: 403 });
  }

  const origin = request.headers.get('Origin');
  if (!origin) {
    throw new Response('missing origin', { status: 403 });
  }
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    if (originUrl.host !== requestUrl.host) {
      throw new Response('origin mismatch', { status: 403 });
    }
  } catch {
    throw new Response('invalid origin', { status: 403 });
  }
};
