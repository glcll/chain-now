const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour
const ANON_RATE_LIMIT = 5;
const AUTH_RATE_LIMIT = 60;

const rateLimitStore = new Map();

function getRateLimitKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

function checkRateLimit(key, limit) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { windowStart: now, count: 1 });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

export default function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (
    path.startsWith("/api/v1/chains") ||
    path === "/api/v1/webhook"
  ) {
    return;
  }

  if (path.startsWith("/api/v1/")) {
    const authHeader = request.headers.get("authorization") || "";
    const isAuthenticated = authHeader.startsWith("Bearer ") && authHeader.length > 10;

    const ip = getRateLimitKey(request);
    const limitKey = isAuthenticated ? `auth:${authHeader.slice(7)}` : `anon:${ip}`;
    const limit = isAuthenticated ? AUTH_RATE_LIMIT : ANON_RATE_LIMIT;
    const { allowed, remaining, retryAfter } = checkRateLimit(limitKey, limit);

    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded.",
          retryAfterSeconds: retryAfter,
          hint: isAuthenticated
            ? "You have exceeded the authenticated rate limit."
            : "Anonymous requests are limited. Use an API key for higher limits.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Remaining": String(remaining),
          },
        }
      );
    }

    const response = new Response(null);
    const headers = new Headers();
    headers.set("X-RateLimit-Remaining", String(remaining));
    headers.set("X-RateLimit-Limit", String(limit));

    return;
  }

  if (path === "/" || path === "/index.html") {
    return;
  }

  if (path.startsWith("/assets/")) {
    return;
  }
}

export const config = {
  matcher: ["/((?!_next|favicon\\.ico).*)"],
};
