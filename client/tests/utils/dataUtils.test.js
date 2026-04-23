import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataUtils } from '../../src/utils/dataUtils.js';

const mockLink = { href: '', download: '', click: vi.fn() };
vi.stubGlobal('document', {
  createElement: vi.fn(() => mockLink),
});
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock'),
  revokeObjectURL: vi.fn(),
});
vi.stubGlobal('Blob', class MockBlob {
  constructor(parts) { this.content = parts.join(''); }
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DataUtils.sanitizeExportData', () => {
  it('shallow-copies array values', () => {
    const original = { items: [{ id: 1 }, { id: 2 }] };
    const result = DataUtils.sanitizeExportData(original);
    expect(result.items).toEqual(original.items);
    expect(result.items).not.toBe(original.items);
    expect(result.items[0]).not.toBe(original.items[0]);
  });

  it('passes through non-array values', () => {
    const original = { count: 5, label: 'test' };
    const result = DataUtils.sanitizeExportData(original);
    expect(result.count).toBe(5);
    expect(result.label).toBe('test');
  });

  it('handles empty object', () => {
    expect(DataUtils.sanitizeExportData({})).toEqual({});
  });
});

describe('DataUtils.exportData', () => {
  it('creates a download link and clicks it', () => {
    DataUtils.exportData({ items: [] }, 'test-backup.json');
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.download).toBe('test-backup.json');
    expect(mockLink.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});

describe('DataUtils.importData', () => {
  it('rejects when no file provided', async () => {
    await expect(DataUtils.importData(null)).rejects.toThrow('No file provided');
  });

  it('rejects non-JSON files', async () => {
    const file = { name: 'data.csv', size: 100 };
    await expect(DataUtils.importData(file)).rejects.toThrow('Invalid file type');
  });

  it('rejects files larger than 10MB', async () => {
    const file = { name: 'data.json', size: 11 * 1024 * 1024 };
    await expect(DataUtils.importData(file)).rejects.toThrow('File size too large');
  });

  it('parses valid JSON file', async () => {
    const mockData = { savings: [{ id: '1', balance: 5000 }] };
    const mockFile = {
      name: 'backup.json',
      size: 100,
    };

    vi.stubGlobal('FileReader', class {
      readAsText() {
        this.onload({ target: { result: JSON.stringify(mockData) } });
      }
    });

    const result = await DataUtils.importData(mockFile);
    expect(result).toEqual(mockData);
  });

  it('rejects on invalid JSON', async () => {
    const mockFile = { name: 'bad.json', size: 100 };
    vi.stubGlobal('FileReader', class {
      readAsText() {
        this.onload({ target: { result: 'not valid json{{{' } });
      }
    });

    await expect(DataUtils.importData(mockFile)).rejects.toThrow('Failed to parse JSON');
  });
});
