import { describe, it, expect, vi } from 'vitest';
import {
  renderPortfolioSummary,
  renderMetricChip,
  renderChangeAlerts,
  renderEmpty,
  renderCardLoading,
  renderFundCard,
} from '../../../../src/ui/features/mf-tracker/components.js';

vi.stubGlobal('document', {
  createElement: () => {
    const el = { _text: '' };
    Object.defineProperty(el, 'textContent', {
      set(v) { el._text = String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); },
    });
    Object.defineProperty(el, 'innerHTML', { get() { return el._text; } });
    return el;
  },
});

describe('renderPortfolioSummary', () => {
  describe('Bug 3: null avgReturn1Y tone', () => {
    it('renders neutral tone when avgReturn1Y is null', () => {
      const summary = {
        fundCount: 3,
        totalExposure: 100000,
        totalGainLoss: 5000,
        avgExpenseRatio: 1.5,
        avgReturn1Y: null,
      };
      const html = renderPortfolioSummary(summary);
      expect(html).toContain('mft-chip-value neutral');
      expect(html).toContain('Avg 1Y Return');
      expect(html).toContain('—');
    });

    it('renders positive tone when avgReturn1Y is positive', () => {
      const summary = {
        fundCount: 3,
        avgReturn1Y: 12.5,
      };
      const html = renderPortfolioSummary(summary);
      expect(html).toContain('mft-chip-value positive');
      expect(html).toContain('+12.50%');
    });

    it('renders negative tone when avgReturn1Y is negative', () => {
      const summary = {
        fundCount: 3,
        avgReturn1Y: -5.3,
      };
      const html = renderPortfolioSummary(summary);
      expect(html).toContain('mft-chip-value negative');
      expect(html).toContain('-5.30%');
    });
  });

  it('renders summary with all fields', () => {
    const summary = {
      fundCount: 5,
      totalExposure: 500000,
      totalGainLoss: 25000,
      avgExpenseRatio: 1.25,
      avgReturn1Y: 15.5,
    };
    const html = renderPortfolioSummary(summary);
    expect(html).toContain('Funds Tracked');
    expect(html).toContain('5');
    expect(html).toContain('Total Exposure');
    expect(html).toContain('Wtd. Expense Ratio');
    expect(html).toContain('1.25%');
    expect(html).toContain('Avg 1Y Return');
    expect(html).toContain('+15.50%');
    expect(html).toContain('Total Gain/Loss');
  });

  it('renders summary with null/missing values', () => {
    const summary = {
      fundCount: 0,
      totalExposure: null,
      totalGainLoss: null,
      avgExpenseRatio: null,
      avgReturn1Y: null,
    };
    const html = renderPortfolioSummary(summary);
    expect(html).toContain('Funds Tracked');
    expect(html).toContain('0');
    expect(html).toContain('—');
  });

  it('renders terDelta with positive arrow when TER increased', () => {
    const html = renderPortfolioSummary({ avgExpenseRatio: 1.5, terDelta: 0.05 });
    expect(html).toContain('mft-ter-delta negative');
    expect(html).toContain('▲');
  });

  it('renders terDelta with negative arrow when TER decreased', () => {
    const html = renderPortfolioSummary({ avgExpenseRatio: 1.2, terDelta: -0.03 });
    expect(html).toContain('mft-ter-delta positive');
    expect(html).toContain('▼');
  });
});

describe('renderMetricChip', () => {
  it('renders label and value', () => {
    const html = renderMetricChip('NAV', '₹100.00', 'neutral');
    expect(html).toContain('mft-chip');
    expect(html).toContain('NAV');
    expect(html).toContain('₹100.00');
  });

  it('applies tone class to value span', () => {
    const html = renderMetricChip('Return', '+15%', 'positive');
    expect(html).toContain('mft-chip-value positive');
  });

  it('defaults to neutral tone', () => {
    const html = renderMetricChip('AUM', '1000 Cr');
    expect(html).toContain('mft-chip-value neutral');
  });
});

describe('renderChangeAlerts', () => {
  it('returns empty string when all alerts are dismissed', () => {
    const changes = { expenseRatio: { severity: 'red', label: 'ER up' } };
    const dismissed = new Set(['expenseRatio']);
    expect(renderChangeAlerts(changes, '119551', dismissed)).toBe('');
  });

  it('renders visible alerts', () => {
    const changes = {
      expenseRatio: { severity: 'red', label: 'ER increased by 0.20%' },
    };
    const html = renderChangeAlerts(changes, '119551', new Set());
    expect(html).toContain('ER increased by 0.20%');
    expect(html).toContain('119551');
  });

  it('returns empty string when changes object is empty', () => {
    expect(renderChangeAlerts({}, '119551', new Set())).toBe('');
  });
});

describe('renderEmpty', () => {
  it('renders empty state HTML', () => {
    const html = renderEmpty();
    expect(html).toContain('mft-empty');
    expect(html).toContain('No funds tracked yet');
  });
});

describe('renderCardLoading', () => {
  it('renders loading card with scheme code', () => {
    const html = renderCardLoading('119551');
    expect(html).toContain('data-scheme-code="119551"');
    expect(html).toContain('mft-card-loading');
  });
});

describe('renderFundCard', () => {
  it('renders fund name', () => {
    const fund = { schemeCode: '119551', name: 'Test Fund', return1Y: 12, expenseRatio: 1.5 };
    const html = renderFundCard(fund, { changes: {}, dismissed: new Set() });
    expect(html).toContain('Test Fund');
    expect(html).toContain('119551');
  });

  it('escapes HTML in fund name', () => {
    const fund = { schemeCode: '1', name: '<script>xss</script>', return1Y: null };
    const html = renderFundCard(fund, { changes: {}, dismissed: new Set() });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders error state when fund has error', () => {
    const fund = { schemeCode: '1', error: 'Not found' };
    const html = renderFundCard(fund, { changes: {}, dismissed: new Set() });
    expect(html).toContain('mft-card');
    expect(html).toContain('1');
  });
});
