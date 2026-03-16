/**
 * Initial database schema — models all asset types, portfolios,
 * transaction history, net worth snapshots, and settings.
 */
export async function up(knex) {
  // Portfolios — support multiple portfolios per user
  await knex.schema.createTable('portfolios', (t) => {
    t.text('id').primary();
    t.text('name').notNullable();
    t.text('description');
    t.text('currency').defaultTo('INR');
    t.text('created_at').defaultTo(knex.fn.now());
    t.text('updated_at').defaultTo(knex.fn.now());
  });

  // Savings accounts
  await knex.schema.createTable('savings', (t) => {
    t.text('id').primary();
    t.text('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    t.text('bank_name').notNullable();
    t.text('account_type').defaultTo('Savings');
    t.real('balance').defaultTo(0);
    t.text('created_at').defaultTo(knex.fn.now());
    t.text('updated_at').defaultTo(knex.fn.now());
  });

  // Fixed deposits
  await knex.schema.createTable('fixed_deposits', (t) => {
    t.text('id').primary();
    t.text('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    t.text('bank_name').notNullable();
    t.real('invested').defaultTo(0);
    t.real('maturity').defaultTo(0);
    t.real('interest_rate').defaultTo(0);
    t.text('start_date');
    t.text('maturity_date');
    t.text('created_at').defaultTo(knex.fn.now());
    t.text('updated_at').defaultTo(knex.fn.now());
  });

  // Mutual funds
  await knex.schema.createTable('mutual_funds', (t) => {
    t.text('id').primary();
    t.text('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    t.text('fund_name').notNullable();
    t.text('scheme_code');
    t.real('units').defaultTo(0);
    t.real('invested').defaultTo(0);
    t.real('current').defaultTo(0);
    t.text('fund_type').defaultTo('Equity');
    t.real('sip').defaultTo(0);
    t.text('created_at').defaultTo(knex.fn.now());
    t.text('updated_at').defaultTo(knex.fn.now());
  });

  // Stocks
  await knex.schema.createTable('stocks', (t) => {
    t.text('id').primary();
    t.text('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    t.text('stock_name').notNullable();
    t.text('ticker');
    t.real('quantity').defaultTo(0);
    t.real('invested').defaultTo(0);
    t.real('current').defaultTo(0);
    t.text('sector');
    t.text('created_at').defaultTo(knex.fn.now());
    t.text('updated_at').defaultTo(knex.fn.now());
  });

  // Crypto
  await knex.schema.createTable('crypto', (t) => {
    t.text('id').primary();
    t.text('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    t.text('coin_name').notNullable();
    t.text('platform');
    t.real('quantity').defaultTo(0);
    t.real('invested').defaultTo(0);
    t.real('current').defaultTo(0);
    t.text('created_at').defaultTo(knex.fn.now());
    t.text('updated_at').defaultTo(knex.fn.now());
  });

  // Liabilities
  await knex.schema.createTable('liabilities', (t) => {
    t.text('id').primary();
    t.text('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    t.text('type').notNullable();
    t.text('lender');
    t.real('loan_amount').defaultTo(0);
    t.real('outstanding').defaultTo(0);
    t.real('interest_rate').defaultTo(0);
    t.real('emi').defaultTo(0);
    t.text('created_at').defaultTo(knex.fn.now());
    t.text('updated_at').defaultTo(knex.fn.now());
  });

  // Transactions (income/expense tracking)
  await knex.schema.createTable('transactions', (t) => {
    t.text('id').primary();
    t.text('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    t.text('date').notNullable();
    t.text('type').notNullable(); // 'income' | 'expense'
    t.text('category');
    t.real('amount').defaultTo(0);
    t.real('units');
    t.text('description');
    t.text('created_at').defaultTo(knex.fn.now());
    t.text('updated_at').defaultTo(knex.fn.now());
  });

  // Budgets
  await knex.schema.createTable('budgets', (t) => {
    t.text('id').primary();
    t.text('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    t.text('category').notNullable();
    t.real('monthly_limit').defaultTo(0);
    t.text('notes');
    t.text('created_at').defaultTo(knex.fn.now());
    t.text('updated_at').defaultTo(knex.fn.now());
  });

  // Settings (per portfolio)
  await knex.schema.createTable('settings', (t) => {
    t.text('id').primary();
    t.text('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    t.text('currency').defaultTo('INR');
    t.real('goal').defaultTo(15000000);
    t.real('epf').defaultTo(0);
    t.real('ppf').defaultTo(0);
    t.text('theme').defaultTo('light');
    t.text('last_sync');
    t.text('created_at').defaultTo(knex.fn.now());
    t.text('updated_at').defaultTo(knex.fn.now());
  });

  // Net worth snapshots — historical tracking
  await knex.schema.createTable('net_worth_snapshots', (t) => {
    t.text('id').primary();
    t.text('portfolio_id').notNullable().references('id').inTable('portfolios').onDelete('CASCADE');
    t.text('snapshot_date').notNullable();
    t.real('savings').defaultTo(0);
    t.real('fixed_deposits').defaultTo(0);
    t.real('mutual_funds').defaultTo(0);
    t.real('stocks').defaultTo(0);
    t.real('crypto').defaultTo(0);
    t.real('epf').defaultTo(0);
    t.real('ppf').defaultTo(0);
    t.real('liabilities').defaultTo(0);
    t.real('total').defaultTo(0);
    t.text('created_at').defaultTo(knex.fn.now());

    t.unique(['portfolio_id', 'snapshot_date']);
  });

  // Market price cache
  await knex.schema.createTable('price_cache', (t) => {
    t.text('id').primary();
    t.text('asset_type').notNullable(); // 'crypto' | 'stock' | 'mutual_fund'
    t.text('identifier').notNullable(); // coin id, ticker, scheme code
    t.real('price').notNullable();
    t.text('currency').defaultTo('INR');
    t.text('fetched_at').defaultTo(knex.fn.now());

    t.unique(['asset_type', 'identifier', 'currency']);
  });
}

export async function down(knex) {
  const tables = [
    'price_cache',
    'net_worth_snapshots',
    'settings',
    'budgets',
    'transactions',
    'liabilities',
    'crypto',
    'stocks',
    'mutual_funds',
    'fixed_deposits',
    'savings',
    'portfolios',
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
