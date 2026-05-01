import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runWithRetry, fireAndForget } from '../src/jobs/jobRunner';

describe('jobRunner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('runWithRetry', () => {
    it('returns success on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('done');
      const result = await runWithRetry(fn, { name: 'test-job' });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('temporary error'))
        .mockResolvedValueOnce('recovered');

      const promise = runWithRetry(fn, {
        name: 'flaky-job',
        maxRetries: 2,
        retryDelayMs: 100,
      });

      // Advance past the retry delay
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('fails after all retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('permanent error'));

      const promise = runWithRetry(fn, {
        name: 'failing-job',
        maxRetries: 2,
        retryDelayMs: 100,
      });

      // Advance past retry delays
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.error).toBe('permanent error');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('uses default retry values when not specified', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const promise = runWithRetry(fn, { name: 'default-job' });
      await vi.advanceTimersByTimeAsync(30000);
      await vi.advanceTimersByTimeAsync(60000);
      await vi.advanceTimersByTimeAsync(120000);

      const result = await promise;
      expect(result.attempts).toBe(4); // default maxRetries=3 → 4 attempts
    });

    it('includes durationMs in result', async () => {
      const fn = vi.fn().mockResolvedValue('fast');
      const result = await runWithRetry(fn, { name: 'timed-job' });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('exponential backoff doubles delay each attempt', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValueOnce('ok');

      const promise = runWithRetry(fn, {
        name: 'backoff-job',
        maxRetries: 3,
        retryDelayMs: 5000,
      });

      // 1st retry: skip 5000ms
      await vi.advanceTimersByTimeAsync(5000);
      expect(fn).toHaveBeenCalledTimes(2);

      // 2nd retry: skip 10000ms
      await vi.advanceTimersByTimeAsync(10000);
      expect(fn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result.success).toBe(true);
    });
  });

  describe('fireAndForget', () => {
    it('does not throw even if the job fails', () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      // fireAndForget should not throw synchronously
      expect(() => fireAndForget(fn, { name: 'fire-job' })).not.toThrow();
    });

    it('calls the function', () => {
      const fn = vi.fn().mockResolvedValue('ok');
      fireAndForget(fn, { name: 'fire-job' });
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
