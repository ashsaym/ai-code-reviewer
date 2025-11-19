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
      mockStorage.markOutdatedComments = jest.fn().mockResolvedValue({
        markedCount: 5,
        errors: [],
      });

      const result = await cleaner.checkAndMarkOutdated('new-sha');

      expect(result.markedOutdated).toBe(5);
      expect(result.errors).toHaveLength(0);
      expect(mockStorage.markOutdatedComments).toHaveBeenCalledWith(123, 'new-sha');
    });

    it('should handle errors during marking', async () => {
      mockStorage.markOutdatedComments = jest.fn().mockResolvedValue({
        markedCount: 2,
        errors: ['Error 1', 'Error 2'],
      });

      const result = await cleaner.checkAndMarkOutdated('new-sha');

      expect(result.markedOutdated).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle storage exceptions', async () => {
      mockStorage.markOutdatedComments = jest.fn().mockRejectedValue(new Error('Storage error'));

      const result = await cleaner.checkAndMarkOutdated('new-sha');

      expect(result.markedOutdated).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
