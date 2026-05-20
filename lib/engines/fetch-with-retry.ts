// Single 1-retry on transient sidecar errors (502/503/504 — cold start, deploy, blip).
// Does NOT retry 4xx (client errors) or TimeoutError (already exceeded budget).
// A fresh AbortSignal is created for each attempt so the timer resets on retry.
export async function fetchWithRetry(
  url: string,
  init: Omit<RequestInit, "signal">,
  timeoutMs = 20_000,
): Promise<Response> {
  const attempt = () => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

  const res = await attempt();
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    await new Promise<void>((r) => setTimeout(r, 500));
    return attempt();
  }
  return res;
}
