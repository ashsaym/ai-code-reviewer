/**
 * OutdatedCommentCleaner Tests
 */

import { OutdatedCommentCleaner } from '../../../src/analysis/OutdatedCommentCleaner';
import { StorageManager } from '../../../src/storage/StorageManager';

jest.mock('../../../src/storage/StorageManager');

describe('OutdatedCommentCleaner', () => {
  let cleaner: OutdatedCommentCleaner;
  let mockStorage: jest.Mocked<StorageManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = new StorageManager({} as any) as jest.Mocked<StorageManager>;
    cleaner = new OutdatedCommentCleaner(mockStorage, 123);
  });

  describe('checkAndMarkOutdated', () => {
    it('should mark outdated comments successfully', async () => {
      mockStorage.getPRComments = jest.fn().mockResolvedValue([
        { commentId: 1, line: 10 },
        { commentId: 2, line: 20 },
        { commentId: 3, line: 30 },
        { commentId: 4, line: 40 },
        { commentId: 5, line: 50 },
      ]);
      mockStorage.cleanOutdatedComments = jest.fn().mockResolvedValue(5);

      const result = await cleaner.checkAndMarkOutdated('new-sha');

      expect(result.markedOutdated).toBe(5);
      expect(result.errors).toHaveLength(0);
      expect(mockStorage.cleanOutdatedComments).toHaveBeenCalledWith(123, 'new-sha');
    });

    it('should handle errors during marking', async () => {
      mockStorage.getPRComments = jest.fn().mockResolvedValue([
        { commentId: 1, line: 10 },
        { commentId: 2, line: 20 },
      ]);
      mockStorage.cleanOutdatedComments = jest.fn().mockResolvedValue(2);

      const result = await cleaner.checkAndMarkOutdated('new-sha');

      expect(result.markedOutdated).toBe(2);
      expect(result.totalComments).toBe(2);
    });

    it('should handle storage exceptions', async () => {
      mockStorage.getPRComments = jest.fn().mockRejectedValue(new Error('Storage error'));

      const result = await cleaner.checkAndMarkOutdated('new-sha');

      expect(result.markedOutdated).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
