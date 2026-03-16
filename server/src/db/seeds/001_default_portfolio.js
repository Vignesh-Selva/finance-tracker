import { v4 as uuidv4 } from 'uuid';

export async function seed(knex) {
  const portfolioId = uuidv4();

  // Only seed if no portfolios exist
  const existing = await knex('portfolios').first();
  if (existing) return;

  await knex('portfolios').insert({
    id: portfolioId,
    name: 'Default Portfolio',
    description: 'Primary investment portfolio',
    currency: 'INR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await knex('settings').insert({
    id: uuidv4(),
    portfolio_id: portfolioId,
    currency: 'INR',
    goal: 15000000,
    epf: 0,
    ppf: 0,
    theme: 'light',
    last_sync: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
