/**
 * JobRunner — reliable cron job execution with retry and structured logging.
 *
 * Every cron job wraps its logic in `runWithRetry()` instead of raw try/catch.
 * The runner handles: retry with exponential backoff, structured error logging,
 * and execution-timing reports.
 */

export interface JobResult {
  name: string;
  success: boolean;
  attempts: number;
  durationMs: number;
  error?: string;
}

export interface JobOptions {
  name: string;
  maxRetries?: number;
  /** Base delay between retries in ms (doubles each attempt) */
  retryDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 30_000; // 30s

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a job function with automatic retry on failure.
 *
 * Retry strategy: exponential backoff starting at `retryDelayMs`,
 * doubling each attempt, up to `maxRetries`.
 *
 * Logs structured JSON so external monitoring can parse execution history.
 */
export async function runWithRetry<T>(
  fn: () => Promise<T>,
  options: JobOptions
): Promise<JobResult> {
  const { name, maxRetries = DEFAULT_MAX_RETRIES, retryDelayMs = DEFAULT_RETRY_DELAY_MS } = options;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      const durationMs = Date.now() - startTime;

      console.log(
        JSON.stringify({
          type: "job.complete",
          name,
          attempt,
          durationMs,
          timestamp: new Date().toISOString(),
        })
      );

      return { name, success: true, attempts: attempt, durationMs };
    } catch (error: any) {
      const msg = error?.message || String(error);

      if (attempt <= maxRetries) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          JSON.stringify({
            type: "job.retry",
            name,
            attempt,
            maxRetries: maxRetries + 1,
            delayMs: delay,
            error: msg,
            timestamp: new Date().toISOString(),
          })
        );
        await sleep(delay);
      } else {
        const durationMs = Date.now() - startTime;
        console.error(
          JSON.stringify({
            type: "job.failed",
            name,
            attempts: attempt,
            durationMs,
            error: msg,
            timestamp: new Date().toISOString(),
          })
        );
        return { name, success: false, attempts: attempt, durationMs, error: msg };
      }
    }
  }

  // Unreachable, but satisfies TypeScript
  const durationMs = Date.now() - startTime;
  return { name, success: false, attempts: maxRetries + 1, durationMs, error: "Unknown failure" };
}

/**
 * Convenience: fire-and-forget a job (does not await the result).
 * Still logs completion/failure via the runner's structured logger.
 */
export function fireAndForget(
  fn: () => Promise<any>,
  options: JobOptions
): void {
  runWithRetry(fn, options).then((result) => {
    if (!result.success) {
      console.error(
        `[JobRunner] ${result.name} permanently failed after ${result.attempts} attempts: ${result.error}`
      );
    }
  });
}
