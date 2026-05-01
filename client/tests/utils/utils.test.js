import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Utilities from '../../src/utils/utils.js';

describe('Utilities', () => {
  it('should be defined', () => {
    expect(Utilities).toBeDefined();
  });

  it('should include DataUtils methods', () => {
    expect(Utilities.exportToExcel).toBeDefined();
    expect(Utilities.importFromExcel).toBeDefined();
  });

  describe('showConfirm', () => {
    beforeEach(() => {
      global.confirm = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should call window.confirm with message', async () => {
      vi.mocked(global.confirm).mockReturnValue(true);
      const result = await Utilities.showConfirm('Are you sure?');
      expect(global.confirm).toHaveBeenCalledWith('Are you sure?');
      expect(result).toBe(true);
    });

    it('should return true when confirmed', async () => {
      vi.mocked(global.confirm).mockReturnValue(true);
      const result = await Utilities.showConfirm('Test');
      expect(result).toBe(true);
    });

    it('should return false when not confirmed', async () => {
      vi.mocked(global.confirm).mockReturnValue(false);
      const result = await Utilities.showConfirm('Test');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      vi.mocked(global.confirm).mockImplementation(() => {
        throw new Error('Test error');
      });
      const result = await Utilities.showConfirm('Test');
      expect(result).toBe(false);
    });
  });
});
