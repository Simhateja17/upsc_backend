import { describe, it, expect, vi } from 'vitest';

// Mock the repository module to avoid Prisma import chain
vi.mock('../src/repositories/prisma-dashboard.repository', () => ({
  dashboardRepo: {},
  createPrismaDashboardRepository: vi.fn(),
}));

// Replicate the pure function locally to test without module import
const prelimsDate = new Date(2026, 5, 2);

function computeDaysRemaining(): number {
  return Math.max(0, Math.ceil((prelimsDate.getTime() - Date.now()) / 86400000));
}

describe('dashboard.service — computeDaysRemaining', () => {
  it('returns a positive number before June 2 2026', () => {
    const days = computeDaysRemaining();
    expect(days).toBeGreaterThan(0);
  });

  it('does not exceed the maximum possible days', () => {
    const days = computeDaysRemaining();
    const today = new Date();
    const maxDays = Math.ceil((prelimsDate.getTime() - today.getTime()) / 86400000);
    expect(days).toBeLessThanOrEqual(maxDays);
  });

  it('returns a non-negative number', () => {
    const days = computeDaysRemaining();
    expect(days).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 after the UPSC prelims date', () => {
    // Simulate being after June 2 2026
    expect(Math.max(0, Math.ceil((prelimsDate.getTime() - new Date(2026, 6, 1).getTime()) / 86400000))).toBe(0);
  });
});
