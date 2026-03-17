import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing api
function buildChain(finalData = { data: [], error: null }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalData),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
  };
  // Terminal methods that resolve
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.upsert.mockReturnValue(chain);

  // Make chain itself thenable to resolve queries without .single()
  chain.then = (resolve) => resolve(finalData);

  return chain;
}

vi.mock('../../src/services/supabaseClient.js', () => {
  const defaultChain = buildChain({ data: [], error: null });
  return {
    supabase: {
      from: vi.fn(() => defaultChain),
    },
  };
});

// Import after mocking
const { default: api, ApiError } = await import('../../src/services/api.js');
const { supabase } = await import('../../src/services/supabaseClient.js');

describe('ApiError', () => {
  it('creates error with message, status, and details', () => {
    const err = new ApiError('Not found', 404, 'detail');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.details).toBe('detail');
  });
});

describe('createResourceApi (via api.savings)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list returns data array', async () => {
    const mockData = [{ id: '1', bank_name: 'HDFC', balance: 50000 }];
    supabase.from.mockReturnValue(buildChain({ data: mockData, error: null }));

    const result = await api.savings.list('portfolio-id');
    expect(result.data).toEqual(mockData);
    expect(result.count).toBe(1);
    expect(supabase.from).toHaveBeenCalledWith('savings');
  });

  it('list throws ApiError on supabase error', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: null, error: { message: 'DB error', code: 500 } })
    );

    await expect(api.savings.list('pid')).rejects.toThrow('DB error');
  });

  it('get returns single item', async () => {
    const item = { id: '1', bank_name: 'SBI', balance: 19537 };
    const chain = buildChain({ data: item, error: null });
    chain.single.mockResolvedValue({ data: item, error: null });
    supabase.from.mockReturnValue(chain);

    const result = await api.savings.get('1');
    expect(result.data).toEqual(item);
  });
});

describe('dashboard.get', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes net worth from all asset types', async () => {
    // Mock supabase.from to return different data per table
    const tableData = {
      savings: [{ balance: 50000 }, { balance: 10000 }],
      fixed_deposits: [{ invested: 100000 }],
      mutual_funds: [{ current: 30000, invested: 25000, units: 100, scheme_code: '123' }],
      stocks: [{ current: 10000, invested: 8000, quantity: 10, ticker: 'TCS' }],
      crypto: [{ current: 5000, invested: 7000, quantity: 0.01, coin_name: 'BTC' }],
      liabilities: [{ outstanding: 0 }],
      transactions: [],
      budgets: [],
      settings: [{ currency: 'INR', goal: 15000000, epf: 800000, ppf: 10000, theme: 'dark' }],
    };

    supabase.from.mockImplementation((table) => {
      return buildChain({ data: tableData[table] || [], error: null });
    });

    const result = await api.dashboard.get('portfolio-id');
    const nw = result.data.netWorth;

    expect(nw.savings).toBe(60000);
    expect(nw.fixed_deposits).toBe(100000);
    expect(nw.mutual_funds).toBe(30000);
    expect(nw.stocks).toBe(10000);
    expect(nw.crypto).toBe(5000);
    expect(nw.epf).toBe(800000);
    expect(nw.ppf).toBe(10000);
  });

  it('computes allocation with percentages and colors', async () => {
    const tableData = {
      savings: [{ balance: 50000 }],
      fixed_deposits: [],
      mutual_funds: [{ current: 50000, invested: 40000 }],
      stocks: [],
      crypto: [],
      liabilities: [],
      transactions: [],
      budgets: [],
      settings: [{ currency: 'INR', goal: 15000000, epf: 0, ppf: 0 }],
    };

    supabase.from.mockImplementation((table) => {
      return buildChain({ data: tableData[table] || [], error: null });
    });

    const result = await api.dashboard.get('pid');
    const alloc = result.data.allocation;

    expect(alloc.length).toBe(2); // Savings + MF
    expect(alloc[0].name).toBe('Savings');
    expect(alloc[0].percentage).toBe(50);
    expect(alloc[0].color).toBeTruthy();
    expect(alloc[1].name).toBe('Mutual Funds');
    expect(alloc[1].percentage).toBe(50);
  });

  it('computes P&L with rounded percentages', async () => {
    const tableData = {
      savings: [],
      fixed_deposits: [],
      mutual_funds: [{ current: 12000, invested: 10000 }],
      stocks: [{ current: 9000, invested: 10000 }],
      crypto: [{ current: 3000, invested: 2000 }],
      liabilities: [],
      transactions: [],
      budgets: [],
      settings: [{ currency: 'INR', goal: 15000000, epf: 0, ppf: 0 }],
    };

    supabase.from.mockImplementation((table) => {
      return buildChain({ data: tableData[table] || [], error: null });
    });

    const result = await api.dashboard.get('pid');
    const pl = result.data.investmentPL;

    expect(pl.mutualFunds.pl).toBe(2000);
    expect(pl.mutualFunds.plPercent).toBe(20);
    expect(pl.stocks.pl).toBe(-1000);
    expect(pl.stocks.plPercent).toBe(-10);
    expect(pl.crypto.pl).toBe(1000);
    expect(pl.crypto.plPercent).toBe(50);
    // Total: 24000 current - 22000 invested = 2000, 9.09%
    expect(pl.total.pl).toBe(2000);
    expect(pl.total.plPercent).toBeCloseTo(9.09, 1);
  });

  it('computes goal progress as percentage', async () => {
    const tableData = {
      savings: [{ balance: 1000000 }],
      fixed_deposits: [],
      mutual_funds: [],
      stocks: [],
      crypto: [],
      liabilities: [],
      transactions: [],
      budgets: [],
      settings: [{ currency: 'INR', goal: 10000000, epf: 0, ppf: 0 }],
    };

    supabase.from.mockImplementation((table) => {
      return buildChain({ data: tableData[table] || [], error: null });
    });

    const result = await api.dashboard.get('pid');
    expect(result.data.goal.target).toBe(10000000);
    expect(result.data.goal.progress).toBe(10); // 10 lakh / 1 crore = 10%
  });
});
