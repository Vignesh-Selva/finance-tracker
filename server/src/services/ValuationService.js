import {
  mutualFundRepo,
  stockRepo,
  cryptoRepo,
  priceCacheRepo,
} from '../repositories/index.js';
import {
  fetchMutualFundPrice,
  fetchStockPrice,
  fetchCryptoPrice,
  fetchCryptoPricesBatch,
} from './PriceFetcher.js';
import logger from '../lib/logger.js';

const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export class ValuationService {
  /**
   * Refresh all prices for a portfolio's holdings.
   * Fetches live prices and updates cache + holding records.
   * @param {string} portfolioId
   * @returns {{ mutualFunds: object[], stocks: object[], crypto: object[], errors: string[] }}
   */
  static async refreshPrices(portfolioId) {
    const errors = [];
    const results = { mutualFunds: [], stocks: [], crypto: [] };

    const [mfHoldings, stockHoldings, cryptoHoldings] = await Promise.all([
      Promise.resolve(mutualFundRepo.findAll(portfolioId)),
      Promise.resolve(stockRepo.findAll(portfolioId)),
      Promise.resolve(cryptoRepo.findAll(portfolioId)),
    ]);

    // --- Mutual Funds ---
    for (const mf of mfHoldings) {
      if (!mf.scheme_code) continue;
      try {
        if (!priceCacheRepo.isStale('mutual_fund', mf.scheme_code, CACHE_MAX_AGE_MS)) {
          const cached = priceCacheRepo.findPrice('mutual_fund', mf.scheme_code);
          results.mutualFunds.push({ id: mf.id, fund_name: mf.fund_name, nav: cached.price, cached: true });
          continue;
        }

        const { price } = await fetchMutualFundPrice(mf.scheme_code);
        priceCacheRepo.upsert('mutual_fund', mf.scheme_code, price);

        // Update current value in holdings: current = units * nav
        const currentValue = (parseFloat(mf.units) || 0) * price;
        mutualFundRepo.update(mf.id, { current: currentValue });

        results.mutualFunds.push({ id: mf.id, fund_name: mf.fund_name, nav: price, current: currentValue });
        logger.info({ schemeCode: mf.scheme_code, nav: price }, 'MF NAV updated');
      } catch (err) {
        errors.push(`MF ${mf.fund_name} (${mf.scheme_code}): ${err.message}`);
        logger.warn({ err: err.message, schemeCode: mf.scheme_code }, 'MF price fetch failed');
      }
    }

    // --- Stocks ---
    for (const stock of stockHoldings) {
      if (!stock.ticker) continue;
      try {
        if (!priceCacheRepo.isStale('stock', stock.ticker, CACHE_MAX_AGE_MS)) {
          const cached = priceCacheRepo.findPrice('stock', stock.ticker);
          results.stocks.push({ id: stock.id, stock_name: stock.stock_name, price: cached.price, cached: true });
          continue;
        }

        const { price } = await fetchStockPrice(stock.ticker);
        priceCacheRepo.upsert('stock', stock.ticker, price);

        // Update current value: current = quantity * price
        const currentValue = (parseFloat(stock.quantity) || 0) * price;
        stockRepo.update(stock.id, { current: currentValue });

        results.stocks.push({ id: stock.id, stock_name: stock.stock_name, price, current: currentValue });
        logger.info({ ticker: stock.ticker, price }, 'Stock price updated');
      } catch (err) {
        errors.push(`Stock ${stock.stock_name} (${stock.ticker}): ${err.message}`);
        logger.warn({ err: err.message, ticker: stock.ticker }, 'Stock price fetch failed');
      }
    }

    // --- Crypto (batch where possible) ---
    const cryptoWithPlatform = cryptoHoldings.filter((c) => c.coin_name);
    if (cryptoWithPlatform.length > 0) {
      // Normalize coin names to CoinGecko IDs (lowercase, hyphenated)
      const coinIds = [...new Set(cryptoWithPlatform.map((c) => c.coin_name.toLowerCase().replace(/\s+/g, '-')))];

      try {
        // Check which are stale
        const staleCoinIds = coinIds.filter((id) => priceCacheRepo.isStale('crypto', id, CACHE_MAX_AGE_MS));

        let freshPrices = {};
        if (staleCoinIds.length > 0) {
          freshPrices = await fetchCryptoPricesBatch(staleCoinIds);
          // Cache the fresh prices
          for (const [coinId, data] of Object.entries(freshPrices)) {
            priceCacheRepo.upsert('crypto', coinId, data.price);
          }
        }

        // Update each holding
        for (const crypto of cryptoWithPlatform) {
          const coinId = crypto.coin_name.toLowerCase().replace(/\s+/g, '-');
          try {
            let price;
            const cached = priceCacheRepo.findPrice('crypto', coinId);
            if (cached) {
              price = cached.price;
            } else if (freshPrices[coinId]) {
              price = freshPrices[coinId].price;
            } else {
              // Individual fetch as fallback
              const result = await fetchCryptoPrice(coinId);
              price = result.price;
              priceCacheRepo.upsert('crypto', coinId, price);
            }

            const currentValue = (parseFloat(crypto.quantity) || 0) * price;
            cryptoRepo.update(crypto.id, { current: currentValue });

            results.crypto.push({ id: crypto.id, coin_name: crypto.coin_name, price, current: currentValue });
            logger.info({ coinId, price }, 'Crypto price updated');
          } catch (err) {
            errors.push(`Crypto ${crypto.coin_name}: ${err.message}`);
            logger.warn({ err: err.message, coinName: crypto.coin_name }, 'Crypto price fetch failed');
          }
        }
      } catch (err) {
        errors.push(`Crypto batch fetch: ${err.message}`);
        logger.warn({ err: err.message }, 'Crypto batch price fetch failed');
      }
    }

    return { ...results, errors };
  }

  /**
   * Get cached prices for a portfolio (no external API calls).
   */
  static getCachedPrices(portfolioId) {
    const mfHoldings = mutualFundRepo.findAll(portfolioId);
    const stockHoldings = stockRepo.findAll(portfolioId);
    const cryptoHoldings = cryptoRepo.findAll(portfolioId);

    const prices = { mutualFunds: {}, stocks: {}, crypto: {} };

    for (const mf of mfHoldings) {
      if (!mf.scheme_code) continue;
      const cached = priceCacheRepo.findPrice('mutual_fund', mf.scheme_code);
      if (cached) prices.mutualFunds[mf.scheme_code] = { price: cached.price, fetchedAt: cached.fetched_at };
    }

    for (const stock of stockHoldings) {
      if (!stock.ticker) continue;
      const cached = priceCacheRepo.findPrice('stock', stock.ticker);
      if (cached) prices.stocks[stock.ticker] = { price: cached.price, fetchedAt: cached.fetched_at };
    }

    for (const crypto of cryptoHoldings) {
      if (!crypto.coin_name) continue;
      const coinId = crypto.coin_name.toLowerCase().replace(/\s+/g, '-');
      const cached = priceCacheRepo.findPrice('crypto', coinId);
      if (cached) prices.crypto[coinId] = { price: cached.price, fetchedAt: cached.fetched_at };
    }

    return prices;
  }

  /**
   * Get the overall portfolio valuation with live-adjusted values.
   */
  static getValuation(portfolioId) {
    const mfHoldings = mutualFundRepo.findAll(portfolioId);
    const stockHoldings = stockRepo.findAll(portfolioId);
    const cryptoHoldings = cryptoRepo.findAll(portfolioId);

    const mfValuation = mfHoldings.map((mf) => {
      const cached = mf.scheme_code ? priceCacheRepo.findPrice('mutual_fund', mf.scheme_code) : null;
      const nav = cached?.price || 0;
      const units = parseFloat(mf.units) || 0;
      const invested = parseFloat(mf.invested) || 0;
      const current = nav > 0 ? units * nav : parseFloat(mf.current) || 0;
      return { ...mf, nav, current, pl: current - invested, plPercent: invested > 0 ? ((current - invested) / invested) * 100 : 0 };
    });

    const stockValuation = stockHoldings.map((stock) => {
      const cached = stock.ticker ? priceCacheRepo.findPrice('stock', stock.ticker) : null;
      const price = cached?.price || 0;
      const quantity = parseFloat(stock.quantity) || 0;
      const invested = parseFloat(stock.invested) || 0;
      const current = price > 0 ? quantity * price : parseFloat(stock.current) || 0;
      return { ...stock, price, current, pl: current - invested, plPercent: invested > 0 ? ((current - invested) / invested) * 100 : 0 };
    });

    const cryptoValuation = cryptoHoldings.map((crypto) => {
      const coinId = crypto.coin_name?.toLowerCase().replace(/\s+/g, '-') || '';
      const cached = coinId ? priceCacheRepo.findPrice('crypto', coinId) : null;
      const price = cached?.price || 0;
      const quantity = parseFloat(crypto.quantity) || 0;
      const invested = parseFloat(crypto.invested) || 0;
      const current = price > 0 ? quantity * price : parseFloat(crypto.current) || 0;
      return { ...crypto, price, current, pl: current - invested, plPercent: invested > 0 ? ((current - invested) / invested) * 100 : 0 };
    });

    const totalMfInvested = mfValuation.reduce((s, m) => s + (parseFloat(m.invested) || 0), 0);
    const totalMfCurrent = mfValuation.reduce((s, m) => s + m.current, 0);
    const totalStockInvested = stockValuation.reduce((s, s2) => s + (parseFloat(s2.invested) || 0), 0);
    const totalStockCurrent = stockValuation.reduce((s, s2) => s + s2.current, 0);
    const totalCryptoInvested = cryptoValuation.reduce((s, c) => s + (parseFloat(c.invested) || 0), 0);
    const totalCryptoCurrent = cryptoValuation.reduce((s, c) => s + c.current, 0);

    const totalInvested = totalMfInvested + totalStockInvested + totalCryptoInvested;
    const totalCurrent = totalMfCurrent + totalStockCurrent + totalCryptoCurrent;

    return {
      mutualFunds: { holdings: mfValuation, invested: totalMfInvested, current: totalMfCurrent, pl: totalMfCurrent - totalMfInvested },
      stocks: { holdings: stockValuation, invested: totalStockInvested, current: totalStockCurrent, pl: totalStockCurrent - totalStockInvested },
      crypto: { holdings: cryptoValuation, invested: totalCryptoInvested, current: totalCryptoCurrent, pl: totalCryptoCurrent - totalCryptoInvested },
      totals: { invested: totalInvested, current: totalCurrent, pl: totalCurrent - totalInvested, plPercent: totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0 },
    };
  }
}

export default ValuationService;
