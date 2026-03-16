import config from '../config/index.js';
import logger from '../lib/logger.js';

const FETCH_TIMEOUT = 10000; // 10s

/**
 * Fetches JSON from a URL with timeout and error handling.
 */
async function fetchJSON(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch mutual fund NAV from mfapi.in
 * @param {string} schemeCode - AMFI scheme code (e.g., '119551')
 * @returns {{ price: number, name: string }} Latest NAV
 */
export async function fetchMutualFundPrice(schemeCode) {
  const url = `${config.apis.mfapi}/${schemeCode}`;
  logger.debug({ schemeCode, url }, 'Fetching MF NAV');

  const data = await fetchJSON(url);

  if (!data || !data.data || data.data.length === 0) {
    throw new Error(`No NAV data for scheme ${schemeCode}`);
  }

  const latest = data.data[0];
  return {
    price: parseFloat(latest.nav),
    name: data.meta?.fund_house ? `${data.meta.fund_house} - ${data.meta.scheme_name}` : schemeCode,
    date: latest.date,
  };
}

/**
 * Fetch stock price from Yahoo Finance v7 API.
 * @param {string} ticker - Stock ticker symbol (e.g., 'RELIANCE.NS' for NSE)
 * @returns {{ price: number, name: string, currency: string }}
 */
export async function fetchStockPrice(ticker) {
  const url = `${config.apis.yahoo}?symbols=${encodeURIComponent(ticker)}`;
  logger.debug({ ticker, url }, 'Fetching stock price');

  try {
    const data = await fetchJSON(url);
    const quote = data?.quoteResponse?.result?.[0];

    if (!quote) {
      throw new Error(`No quote data for ticker ${ticker}`);
    }

    return {
      price: quote.regularMarketPrice || 0,
      name: quote.shortName || quote.longName || ticker,
      currency: quote.currency || 'INR',
    };
  } catch (err) {
    // Yahoo Finance often blocks direct API access; fallback to a simpler approach
    logger.warn({ ticker, err: err.message }, 'Yahoo Finance fetch failed, trying fallback');

    // Fallback: try Yahoo Finance v8 chart API (more reliable for free access)
    const fallbackUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const data = await fetchJSON(fallbackUrl);
    const result = data?.chart?.result?.[0];

    if (!result) {
      throw new Error(`No chart data for ticker ${ticker}`);
    }

    const meta = result.meta;
    return {
      price: meta.regularMarketPrice || 0,
      name: meta.shortName || ticker,
      currency: meta.currency || 'INR',
    };
  }
}

/**
 * Fetch cryptocurrency price from CoinGecko.
 * @param {string} coinId - CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
 * @param {string} [currency='inr'] - Target currency
 * @returns {{ price: number, name: string }}
 */
export async function fetchCryptoPrice(coinId, currency = 'inr') {
  const url = `${config.apis.coingecko}/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=${currency}&include_24hr_change=true`;
  logger.debug({ coinId, url }, 'Fetching crypto price');

  const data = await fetchJSON(url);

  if (!data || !data[coinId]) {
    throw new Error(`No price data for coin ${coinId}`);
  }

  return {
    price: data[coinId][currency] || 0,
    change24h: data[coinId][`${currency}_24h_change`] || 0,
    name: coinId,
  };
}

/**
 * Batch fetch multiple crypto prices in one call.
 * @param {string[]} coinIds - Array of CoinGecko coin IDs
 * @param {string} [currency='inr']
 * @returns {Object<string, { price: number, change24h: number }>}
 */
export async function fetchCryptoPricesBatch(coinIds, currency = 'inr') {
  if (!coinIds.length) return {};

  const ids = coinIds.join(',');
  const url = `${config.apis.coingecko}/simple/price?ids=${ids}&vs_currencies=${currency}&include_24hr_change=true`;
  logger.debug({ coinIds, url }, 'Fetching crypto prices batch');

  const data = await fetchJSON(url);
  const results = {};

  for (const coinId of coinIds) {
    if (data[coinId]) {
      results[coinId] = {
        price: data[coinId][currency] || 0,
        change24h: data[coinId][`${currency}_24h_change`] || 0,
      };
    }
  }

  return results;
}

export default {
  fetchMutualFundPrice,
  fetchStockPrice,
  fetchCryptoPrice,
  fetchCryptoPricesBatch,
};
