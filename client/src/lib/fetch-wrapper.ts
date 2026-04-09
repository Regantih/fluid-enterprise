/**
 * fetch-wrapper.ts — Transparent fetch interceptor for demo/static deployments.
 *
 * Strategy:
 *   1. For /api/* calls: try the real server with a 2-second timeout.
 *   2. If the network request fails or times out, fall back to demoFetch().
 *   3. Non-API calls (assets, fonts, etc.) pass through unchanged.
 *
 * Install by assigning window.fetch = wrappedFetch before React renders.
 */

import { demoFetch } from "./demo-data";

// Capture the real fetch before we replace it
const _realFetch: typeof fetch = window.fetch.bind(window);

function getUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url;
}

export async function wrappedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = getUrl(input);

  // Resolve against current origin to get a clean pathname
  let pathname: string;
  try {
    pathname = new URL(url, window.location.href).pathname;
  } catch {
    pathname = url;
  }

  // Only intercept /api/* — let everything else (assets, HMR) through
  if (!pathname.startsWith("/api/")) {
    return _realFetch(input, init);
  }

  const isStream =
    pathname.includes("/stream") || pathname.endsWith("/stream");

  if (isStream) {
    // SSE endpoints: pass user's abort signal through; fall back on immediate failure
    try {
      const res = await _realFetch(input, init);
      // If we got a real response body, use it
      if (res.body) return res;
      return demoFetch(url, init);
    } catch {
      return demoFetch(url, init);
    }
  }

  // Regular API request — apply a 2-second timeout
  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(), 2000);

  // If the caller already supplied an abort signal, honor it too
  const userSignal = init?.signal as AbortSignal | undefined | null;
  if (userSignal) {
    userSignal.addEventListener("abort", () => timeoutCtrl.abort(), {
      once: true,
    });
  }

  try {
    const res = await _realFetch(input, {
      ...init,
      signal: timeoutCtrl.signal,
    });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    // Network error or timeout → serve demo data
    return demoFetch(url, init);
  }
}
