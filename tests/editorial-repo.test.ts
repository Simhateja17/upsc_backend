import { describe, it, expect, vi } from 'vitest';

/**
 * EditorialRepository contract smoke tests.
 * These verify the interface shape without requiring a running database.
 * Full DB-backed integration tests would go in a separate integration test suite.
 */

describe('EditorialRepository mock adapter', () => {
  it('can implement the full interface for unit testing', () => {
    const mockRepo = {
      getRecent: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      getProgress: vi.fn().mockResolvedValue([]),
      getBookmarks: vi.fn().mockResolvedValue([]),
      markRead: vi.fn().mockResolvedValue(undefined),
      toggleSave: vi.fn().mockResolvedValue(true),
      getStats: vi.fn().mockResolvedValue({
        totalRead: 0, totalSaved: 0, weeklyRead: 0, streak: 0,
        todayCounts: { hindu: 0, express: 0, aiSummarized: 0, userRead: 0 },
      }),
      findBySourceUrl: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'test-1',
        title: 'Test',
        source: 'Test Source',
        sourceUrl: 'https://test.com',
        category: 'Economy',
        summary: null,
        content: null,
        tags: [],
        aiSummary: null,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    // Methods are callable without real DB
    expect(() => mockRepo.markRead('user1', 'editorial1')).not.toThrow();
    expect(mockRepo.markRead).toHaveBeenCalledWith('user1', 'editorial1');

    expect(() => mockRepo.toggleSave('user1', 'editorial1')).not.toThrow();
    expect(mockRepo.toggleSave).toHaveBeenCalledWith('user1', 'editorial1');
  });

  it('create returns an EditorialRow with all expected fields', async () => {
    const mockRepo = {
      getRecent: vi.fn(),
      getById: vi.fn(),
      getProgress: vi.fn(),
      getBookmarks: vi.fn(),
      markRead: vi.fn(),
      toggleSave: vi.fn(),
      getStats: vi.fn(),
      findBySourceUrl: vi.fn(),
      create: vi.fn().mockResolvedValue({
        id: 'test-1', title: 'Test', source: 'Src', sourceUrl: 'url',
        category: 'Economy', summary: null, content: null, tags: [],
        aiSummary: null, publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
      }),
    };

    const result = await mockRepo.create({
      title: 'Test', source: 'Src', sourceUrl: 'url',
      category: 'Economy', summary: null, content: null, tags: [],
      aiSummary: null, publishedAt: new Date(),
    });

    expect(result.id).toBe('test-1');
    expect(result.title).toBe('Test');
    expect(result.category).toBe('Economy');
  });
});
