import { getClientIPAddress } from 'remix-utils/get-client-ip-address';

type Bucket = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitBuckets: Map<string, Bucket> | undefined;
  // eslint-disable-next-line no-var
  var __rateLimitCleanup: NodeJS.Timeout | undefined;
}

const buckets: Map<string, Bucket> = global.__rateLimitBuckets ?? new Map();
global.__rateLimitBuckets = buckets;

if (!global.__rateLimitCleanup) {
  global.__rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 60_000);
  global.__rateLimitCleanup.unref();
}

export type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
};

export const checkRateLimit = (key: string, options: RateLimitOptions): void => {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new Response('rate limit exceeded', {
      status: 429,
      headers: { 'Retry-After': retryAfter.toString() },
    });
  }
  bucket.count += 1;
};

export const limitByIp = (request: Request, bucketName: string, options: RateLimitOptions): void => {
  const ip = getClientIPAddress(request) ?? 'unknown';
  checkRateLimit(`${bucketName}:ip:${ip}`, options);
};

export const limitByUser = (userId: string, bucketName: string, options: RateLimitOptions): void => {
  checkRateLimit(`${bucketName}:user:${userId || 'anon'}`, options);
};
