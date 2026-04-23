/**
 * Client-side price fetching service.
 * Fetches live prices from public APIs and updates Supabase.
 *
 * APIs used:
 *  - Mutual Funds: mfapi.in (CORS-friendly)
 *  - Crypto: CoinGecko (CORS-friendly)
 *  - Stocks: Google Finance via allorigins proxy (Yahoo blocks CORS)
 */

import { supabase } from './supabaseClient.js';

// ─── Mutual Funds (mfapi.in) ─────────────────────────────

export async function fetchMutualFundNAV(schemeCode) {
  const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`);
  if (!res.ok) throw new Error(`mfapi error: ${res.status}`);
  const json = await res.json();

  if (!json.data || json.data.length === 0) {
    throw new Error(`No NAV data for scheme ${schemeCode}`);
  }

  const latest = json.data[0];
  return {
    nav: parseFloat(latest.nav),
    date: latest.date,
    schemeName: json.meta?.scheme_name || '',
  };
}

// ─── Crypto (CoinGecko) ──────────────────────────────────

const COINGECKO_IDS = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'XRP': 'ripple',
  'SOL': 'solana',
  'DOGE': 'dogecoin',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'BNB': 'binancecoin',
  'SHIB': 'shiba-inu',
};

function toCoinGeckoId(coinName) {
  const upper = coinName.toUpperCase().trim();
  if (COINGECKO_IDS[upper]) return COINGECKO_IDS[upper];
  // Fallback: lowercase hyphenated
  return coinName.toLowerCase().replace(/\s+/g, '-');
}

export async function fetchCryptoPrices(coinNames) {
  const ids = [...new Set(coinNames.map(toCoinGeckoId))];
  if (ids.length === 0) return {};

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=inr`
  );
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const json = await res.json();

  const result = {};
  for (const coinName of coinNames) {
    const id = toCoinGeckoId(coinName);
    if (json[id]?.inr) {
      result[coinName] = json[id].inr;
    }
  }
  return result;
}

// ─── Stocks (Yahoo Finance via allorigins CORS proxy) ─────

async function fetchViaProxy(yahooUrl) {
  // allorigins /get endpoint wraps response in JSON with CORS headers
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  const wrapper = await res.json();

  if (!wrapper.contents) throw new Error('Empty proxy response');
  const json = JSON.parse(wrapper.contents);

  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error('No price in response');

  return {
    price: meta.regularMarketPrice,
    currency: meta.currency || 'INR',
    symbol: meta.symbol,
  };
}

export async function fetchStockPrice(ticker) {
  // Try NSE ticker format first for Indian stocks
  const nseSymbol = ticker.includes('.') ? ticker : `${ticker}.NS`;

  try {
    return await fetchViaProxy(
      `https://query1.finance.yahoo.com/v8/finance/chart/${nseSymbol}?interval=1d&range=1d`
    );
  } catch (err) {
    // Fallback: try without .NS suffix
    if (!ticker.includes('.')) {
      try {
        return await fetchViaProxy(
          `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
        );
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

// ─── Refresh Mutual Fund Prices Only ──────────────────────

export async function refreshMutualFundPrices(portfolioId) {
  const errors = [];
  const results = [];

  const { data: mfHoldings } = await supabase
    .from('mutual_funds').select('*').eq('portfolio_id', portfolioId);

  for (const mf of (mfHoldings || [])) {
    if (!mf.scheme_code) continue;
    try {
      const { nav } = await fetchMutualFundNAV(mf.scheme_code);
      const units = parseFloat(mf.units) || 0;
      const current = parseFloat((units * nav).toFixed(2));
      await supabase.from('mutual_funds').update({ current }).eq('id', mf.id);
      await supabase.from('price_cache').upsert({
        asset_type: 'mutual_fund', identifier: mf.scheme_code,
        price: nav, currency: 'INR', fetched_at: new Date().toISOString(),
      }, { onConflict: 'asset_type,identifier,currency' });
      results.push({ id: mf.id, fund_name: mf.fund_name, nav, current });
    } catch (err) {
      errors.push(`MF ${mf.fund_name}: ${err.message}`);
    }
  }
  await updateLastSync(portfolioId);
  return { results, errors, refreshedAt: new Date().toISOString() };
}

// ─── Refresh Stock Prices Only ────────────────────────────

export async function refreshStockPricesOnly(portfolioId) {
  const errors = [];
  const results = [];

  const { data: stockHoldings } = await supabase
    .from('stocks').select('*').eq('portfolio_id', portfolioId);

  for (const stock of (stockHoldings || [])) {
    if (!stock.ticker) continue;
    try {
      const { price } = await fetchStockPrice(stock.ticker);
      const quantity = parseFloat(stock.quantity) || 0;
      const current = parseFloat((quantity * price).toFixed(2));
      await supabase.from('stocks').update({ current }).eq('id', stock.id);
      await supabase.from('price_cache').upsert({
        asset_type: 'stock', identifier: stock.ticker,
        price, currency: 'INR', fetched_at: new Date().toISOString(),
      }, { onConflict: 'asset_type,identifier,currency' });
      results.push({ id: stock.id, stock_name: stock.stock_name, price, current });
    } catch (err) {
      errors.push(`Stock ${stock.stock_name} (${stock.ticker}): ${err.message}`);
    }
  }
  await updateLastSync(portfolioId);
  return { results, errors, refreshedAt: new Date().toISOString() };
}

// ─── Refresh Crypto Prices Only ───────────────────────────

export async function refreshCryptoPricesOnly(portfolioId) {
  const errors = [];
  const results = [];

  const { data: cryptoHoldings } = await supabase
    .from('crypto').select('*').eq('portfolio_id', portfolioId);

  const coinNames = [...new Set((cryptoHoldings || []).map(c => c.coin_name).filter(Boolean))];
  if (coinNames.length > 0) {
    try {
      const prices = await fetchCryptoPrices(coinNames);
      for (const crypto of (cryptoHoldings || [])) {
        if (!crypto.coin_name || !prices[crypto.coin_name]) continue;
        try {
          const price = prices[crypto.coin_name];
          const quantity = parseFloat(crypto.quantity) || 0;
          const current = parseFloat((quantity * price).toFixed(2));
          await supabase.from('crypto').update({ current }).eq('id', crypto.id);
          await supabase.from('price_cache').upsert({
            asset_type: 'crypto', identifier: crypto.coin_name,
            price, currency: 'INR', fetched_at: new Date().toISOString(),
          }, { onConflict: 'asset_type,identifier,currency' });
          results.push({ id: crypto.id, coin_name: crypto.coin_name, price, current });
        } catch (err) {
          errors.push(`Crypto ${crypto.coin_name}: ${err.message}`);
        }
      }
    } catch (err) {
      errors.push(`Crypto batch: ${err.message}`);
    }
  }
  await updateLastSync(portfolioId);
  return { results, errors, refreshedAt: new Date().toISOString() };
}

// ─── Update last_sync in settings ─────────────────────────

async function updateLastSync(portfolioId) {
  const { data: settingsData } = await supabase
    .from('settings').select('id').eq('portfolio_id', portfolioId).limit(1).single();
  if (settingsData?.id) {
    await supabase.from('settings').update({
      last_sync: new Date().toISOString(),
    }).eq('id', settingsData.id);
  }
}

// ─── Refresh All Prices for a Portfolio ───────────────────

export async function refreshAllPrices(portfolioId) {
  const errors = [];
  const results = { mutualFunds: [], stocks: [], crypto: [] };

  // Fetch all holdings in parallel
  const [mfRes, stockRes, cryptoRes] = await Promise.all([
    supabase.from('mutual_funds').select('*').eq('portfolio_id', portfolioId),
    supabase.from('stocks').select('*').eq('portfolio_id', portfolioId),
    supabase.from('crypto').select('*').eq('portfolio_id', portfolioId),
  ]);

  const mfHoldings = mfRes.data || [];
  const stockHoldings = stockRes.data || [];
  const cryptoHoldings = cryptoRes.data || [];

  // ── Mutual Funds ──
  for (const mf of mfHoldings) {
    if (!mf.scheme_code) continue;
    try {
      const { nav } = await fetchMutualFundNAV(mf.scheme_code);
      const units = parseFloat(mf.units) || 0;
      const current = parseFloat((units * nav).toFixed(2));

      await supabase.from('mutual_funds').update({ current }).eq('id', mf.id);

      // Cache the price
      await supabase.from('price_cache').upsert({
        asset_type: 'mutual_fund',
        identifier: mf.scheme_code,
        price: nav,
        currency: 'INR',
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'asset_type,identifier,currency' });

      results.mutualFunds.push({ id: mf.id, fund_name: mf.fund_name, nav, current });
    } catch (err) {
      errors.push(`MF ${mf.fund_name}: ${err.message}`);
    }
  }

  // ── Stocks ──
  for (const stock of stockHoldings) {
    if (!stock.ticker) continue;
    try {
      const { price } = await fetchStockPrice(stock.ticker);
      const quantity = parseFloat(stock.quantity) || 0;
      const current = parseFloat((quantity * price).toFixed(2));

      await supabase.from('stocks').update({ current }).eq('id', stock.id);

      await supabase.from('price_cache').upsert({
        asset_type: 'stock',
        identifier: stock.ticker,
        price,
        currency: 'INR',
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'asset_type,identifier,currency' });

      results.stocks.push({ id: stock.id, stock_name: stock.stock_name, price, current });
    } catch (err) {
      errors.push(`Stock ${stock.stock_name} (${stock.ticker}): ${err.message}`);
    }
  }

  // ── Crypto (batch) ──
  const coinNames = [...new Set(cryptoHoldings.map(c => c.coin_name).filter(Boolean))];
  if (coinNames.length > 0) {
    try {
      const prices = await fetchCryptoPrices(coinNames);

      for (const crypto of cryptoHoldings) {
        if (!crypto.coin_name || !prices[crypto.coin_name]) continue;
        try {
          const price = prices[crypto.coin_name];
          const quantity = parseFloat(crypto.quantity) || 0;
          const current = parseFloat((quantity * price).toFixed(2));

          await supabase.from('crypto').update({ current }).eq('id', crypto.id);

          await supabase.from('price_cache').upsert({
            asset_type: 'crypto',
            identifier: crypto.coin_name,
            price,
            currency: 'INR',
            fetched_at: new Date().toISOString(),
          }, { onConflict: 'asset_type,identifier,currency' });

          results.crypto.push({ id: crypto.id, coin_name: crypto.coin_name, price, current });
        } catch (err) {
          errors.push(`Crypto ${crypto.coin_name}: ${err.message}`);
        }
      }
    } catch (err) {
      errors.push(`Crypto batch: ${err.message}`);
    }
  }

  await updateLastSync(portfolioId);

  return { results, errors, refreshedAt: new Date().toISOString() };
}
