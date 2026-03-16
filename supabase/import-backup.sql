-- ============================================================
-- Import finance-backup.json data into Supabase
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Get the default portfolio ID
DO $$
DECLARE
  pid UUID;
BEGIN
  SELECT id INTO pid FROM portfolios WHERE name = 'Default Portfolio' LIMIT 1;

  IF pid IS NULL THEN
    RAISE EXCEPTION 'Default Portfolio not found. Run schema.sql first.';
  END IF;

  -- ─── SAVINGS ────────────────────────────────────────────
  INSERT INTO savings (portfolio_id, bank_name, account_type, balance) VALUES
    (pid, 'HDFC', 'Salary', 50050),
    (pid, 'Axis', 'Spending', 13000),
    (pid, 'SBI', 'Savings/Loan', 19537),
    (pid, 'SBI', 'Dad Savings Account', 900000),
    (pid, 'SBI', 'Dad Savings Account / Extra Cash', 10001);

  -- ─── FIXED DEPOSITS ─────────────────────────────────────
  INSERT INTO fixed_deposits (portfolio_id, bank_name, invested, maturity, interest_rate, maturity_date) VALUES
    (pid, 'State Bank of India', 700000, 766692, 7.55, '2026-07-10');

  -- ─── MUTUAL FUNDS ───────────────────────────────────────
  INSERT INTO mutual_funds (portfolio_id, fund_name, scheme_code, units, invested, current, fund_type, sip) VALUES
    (pid, 'Parag Parikh Flexi Cap Fund', '122639', 407.976, 36998.143, 37741.53, 'Equity', 4000),
    (pid, 'Motilal Oswal Midcap Fund', '127042', 265.95, 30498.493, 28526.44, 'Equity', 4000),
    (pid, 'UTI Nifty 50 Index Fund', '120716', 161.048, 27998.542, 4110.86, 'Equity', 3000),
    (pid, 'Axis Small Cap Fund', '125354', 170.733, 20999.145, 20388.93, 'Equity', 3000);

  -- ─── STOCKS ─────────────────────────────────────────────
  INSERT INTO stocks (portfolio_id, stock_name, ticker, quantity, invested, current, sector) VALUES
    (pid, 'Nippon India ETF Gold BeES', 'GOLDBEES', 76, 7082.66, 9468.08, 'Commodity');

  -- ─── CRYPTO ─────────────────────────────────────────────
  INSERT INTO crypto (portfolio_id, coin_name, platform, quantity, invested, current) VALUES
    (pid, 'BTC', 'Binance', 0.00013413, 1000, 824.84),
    (pid, 'BTC', 'Trust Wallet', 0.00127723, 12192, 7841.08),
    (pid, 'BTC', 'CoinDCX', 0.00102741, 9619.1, 6609.3),
    (pid, 'XRP', 'CoinDCX', 1, 186.01, 137.91),
    (pid, 'ETH', 'CoinDCX', 0.001, 159.59, 186.41),
    (pid, 'SOL', 'CoinDCX', 0.015, 159.43, 120.92);

  -- ─── LIABILITIES ────────────────────────────────────────
  INSERT INTO liabilities (portfolio_id, type, lender, loan_amount, outstanding, interest_rate, emi) VALUES
    (pid, 'Car Loan', 'State Bank of India', 485000, 0, 8.75, 15400),
    (pid, 'Health Insurance', 'HDFC Bank', 56442, 0, 16.01, 18814);

  -- ─── TRANSACTIONS ───────────────────────────────────────
  INSERT INTO transactions (portfolio_id, date, type, category, amount, description) VALUES
    (pid, '2026-01-01', 'income', 'Salary', 88260, ''),
    (pid, '2026-01-01', 'expense', 'Others', 20000, 'home expenses');

  -- ─── BUDGETS ────────────────────────────────────────────
  INSERT INTO budgets (portfolio_id, category, monthly_limit, notes) VALUES
    (pid, 'Food', 10000, ''),
    (pid, 'Transport', 5000, ''),
    (pid, 'Entertainment', 3000, ''),
    (pid, 'Shopping', 8000, ''),
    (pid, 'Bills', 5000, ''),
    (pid, 'Others', 5000, '');

  -- ─── SETTINGS (update existing) ─────────────────────────
  UPDATE settings SET
    currency = 'INR',
    goal = 15000000,
    epf = 823496,
    ppf = 13000,
    theme = 'light'
  WHERE portfolio_id = pid;

  RAISE NOTICE 'Import complete for portfolio %', pid;
END $$;
