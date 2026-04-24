create table if not exists recurring_transactions (
  id           uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  name         text not null,
  amount       numeric(15,2) not null,
  type         text not null check (type in ('income','expense')),
  category     text,
  frequency    text not null check (frequency in ('daily','weekly','monthly','yearly')),
  day_of_month integer,
  next_date    date,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table recurring_transactions enable row level security;

create policy "Users can manage their own recurring transactions"
  on recurring_transactions for all
  using (portfolio_id in (select id from portfolios where user_id = auth.uid()));

create trigger set_recurring_transactions_updated_at
  before update on recurring_transactions
  for each row execute function update_updated_at_column();
