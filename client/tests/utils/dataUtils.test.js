import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('xlsx', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, writeFile: vi.fn() };
});

import * as XLSX from 'xlsx';
import { DataUtils } from '../../src/utils/dataUtils.js';

function buildWorkbook(sheetDataMap) {
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(sheetDataMap)) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
    }
    return wb;
}

function workbookToArrayBuffer(wb) {
    const raw = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return raw.buffer ?? raw;
}

function makeFile(wb, name = 'backup.xlsx') {
    const buf = workbookToArrayBuffer(wb);
    return { name, size: buf.byteLength, _buf: buf };
}

function stubFileReader(buf) {
    vi.stubGlobal('FileReader', class {
        readAsArrayBuffer() {
            this.onload({ target: { result: buf } });
        }
    });
}

const EMPTY_SHEETS = {
    Cash: [],
    Investments: [],
    Orders: [],
    Liabilities: [],
    CreditCards: [],
    CashFlow: [],
    Settings: [],
};

const SAMPLE_DATA = {
    savings: [{ id: 'sv1', portfolio_id: 'p1', bank_name: 'HDFC', account_type: 'Salary', balance: '50000', interest_rate: '3.5', created_at: '2024-01-01', updated_at: '2024-01-01' }],
    fixedDeposits: [{ id: 'fd1', portfolio_id: 'p1', bank_name: 'SBI', invested: '100000', maturity: '115000', interest_rate: '7.5', maturity_date: '2025-12-31', created_at: '2024-01-01', updated_at: '2024-01-01' }],
    mutualFunds: [{ id: 'mf1', portfolio_id: 'p1', fund_name: 'Parag Parikh FCF', scheme_code: '122639', units: '100.5', invested: '10000', current: '12000', current_price: '119.4', fund_type: 'Equity', sip: '4000', created_at: '2024-01-01', updated_at: '2024-01-01' }],
    stocks: [{ id: 'st1', portfolio_id: 'p1', stock_name: 'Reliance', ticker: 'RELIANCE', quantity: '10', invested: '25000', current: '28000', current_price: '2800', sector: 'Energy', created_at: '2024-01-01', updated_at: '2024-01-01' }],
    crypto: [{ id: 'cr1', portfolio_id: 'p1', coin_name: 'BTC', quantity: '0.001', invested: '3000', current: '3500', current_price: '3500000', platform: 'Binance', created_at: '2024-01-01', updated_at: '2024-01-01' }],
    liabilities: [{ id: 'lb1', portfolio_id: 'p1', type: 'Car Loan', lender: 'SBI', loan_amount: '500000', outstanding: '300000', interest_rate: '8.5', emi: '12000', created_at: '2024-01-01', updated_at: '2024-01-01' }],
    creditCards: [{ id: 'cc1', portfolio_id: 'p1', card_name: 'HDFC Regalia', bank_name: 'HDFC', last4: '1234', credit_limit: '100000', current_balance: '5000', statement_balance: '4500', due_date: '2024-02-15', billing_date: '2024-02-05', created_at: '2024-01-01', updated_at: '2024-01-01' }],
    transactions: [{ id: 'tx1', portfolio_id: 'p1', date: '2024-01-15', type: 'income', category: 'Salary', amount: '80000', description: 'January salary', created_at: '2024-01-01', updated_at: '2024-01-01' }],
    budgets: [{ id: 'bg1', portfolio_id: 'p1', category: 'Food', monthly_limit: '10000', notes: '', created_at: '2024-01-01', updated_at: '2024-01-01' }],
    settings: [{ id: 'sg1', portfolio_id: 'p1', currency: 'INR', display_currency: 'INR', goal: '5000000', epf: '200000', ppf: '50000', created_at: '2024-01-01', updated_at: '2024-01-01' }],
    mfOrders: [{ id: 'mo1', portfolio_id: 'p1', mf_id: 'mf1', execution_date: '2024-01-10', order_type: 'Buy', units: '50', nav: '100', amount: '5000', charges: '0', platform: 'Zerodha', remarks: '', amount_overridden: false, created_at: '2024-01-01', updated_at: '2024-01-01' }],
    stockOrders: [{ id: 'so1', portfolio_id: 'p1', stock_id: 'st1', execution_date: '2024-01-12', order_type: 'Buy', quantity: '5', price: '2500', amount: '12500', charges: '25', platform: 'Zerodha', remarks: '', amount_overridden: false, created_at: '2024-01-01', updated_at: '2024-01-01' }],
    cryptoOrders: [{ id: 'co1', portfolio_id: 'p1', crypto_id: 'cr1', execution_date: '2024-01-08', order_type: 'Buy', quantity: '0.0005', price: '3000000', amount: '1500', charges: '10', platform: 'Binance', remarks: 'test', amount_overridden: true, created_at: '2024-01-01', updated_at: '2024-01-01' }],
};

describe('DataUtils.exportToExcel', () => {
    beforeEach(() => {
        XLSX.writeFile.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('creates a workbook with all required sheets', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'test.xlsx');
        const names = XLSX.writeFile.mock.calls[0][0].SheetNames;
        expect(names).toContain('Instructions');
        expect(names).toContain('Cash');
        expect(names).toContain('Investments');
        expect(names).toContain('Orders');
        expect(names).toContain('Liabilities');
        expect(names).toContain('CreditCards');
        expect(names).toContain('CashFlow');
        expect(names).toContain('Settings');
    });

    it('Instructions sheet is first', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        expect(XLSX.writeFile.mock.calls[0][0].SheetNames[0]).toBe('Instructions');
    });

    it('exports with empty data without throwing', () => {
        expect(() => DataUtils.exportToExcel({}, 'empty.xlsx')).not.toThrow();
    });

    it('converts numeric strings to numbers in Cash sheet', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Cash']);
        const savingsRow = rows.find(r => r.table_type === 'Savings');
        expect(typeof savingsRow.balance).toBe('number');
        expect(savingsRow.balance).toBe(50000);
        const fdRow = rows.find(r => r.table_type === 'FixedDeposit');
        expect(typeof fdRow.invested).toBe('number');
        expect(fdRow.invested).toBe(100000);
    });

    it('assigns correct table_type in Cash sheet', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Cash']);
        expect(rows.some(r => r.table_type === 'Savings')).toBe(true);
        expect(rows.some(r => r.table_type === 'FixedDeposit')).toBe(true);
    });

    it('assigns correct asset_type in Investments sheet', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Investments']);
        expect(rows.some(r => r.asset_type === 'MutualFund')).toBe(true);
        expect(rows.some(r => r.asset_type === 'Stock')).toBe(true);
        expect(rows.some(r => r.asset_type === 'Crypto')).toBe(true);
    });

    it('maps MF fields correctly in Investments sheet', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Investments']);
        const mfRow = rows.find(r => r.asset_type === 'MutualFund');
        expect(mfRow.name).toBe('Parag Parikh FCF');
        expect(mfRow.symbol).toBe('122639');
        expect(mfRow.quantity).toBe(100.5);
        expect(mfRow.category).toBe('Equity');
        expect(mfRow.sip).toBe(4000);
        expect(mfRow.id).toBe('mf1');
    });

    it('maps stock fields correctly in Investments sheet', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Investments']);
        const stRow = rows.find(r => r.asset_type === 'Stock');
        expect(stRow.name).toBe('Reliance');
        expect(stRow.symbol).toBe('RELIANCE');
        expect(stRow.quantity).toBe(10);
        expect(stRow.category).toBe('Energy');
    });

    it('maps MF order fields (units→quantity, nav→price) in Orders sheet', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Orders']);
        const mfOrd = rows.find(r => r.asset_type === 'MutualFund');
        expect(mfOrd.quantity).toBe(50);
        expect(mfOrd.price).toBe(100);
        expect(mfOrd.holding_id).toBe('mf1');
        expect(mfOrd.amount_overridden).toBe('FALSE');
    });

    it('exports amount_overridden=true as TRUE string', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Orders']);
        const cryptoOrd = rows.find(r => r.asset_type === 'Crypto');
        expect(cryptoOrd.amount_overridden).toBe('TRUE');
    });

    it('strips id/portfolio_id/created_at/updated_at from non-investment rows', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Cash']);
        expect(rows[0]).not.toHaveProperty('id');
        expect(rows[0]).not.toHaveProperty('portfolio_id');
        expect(rows[0]).not.toHaveProperty('created_at');
    });

    it('keeps id in Investments sheet for order remapping', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Investments']);
        expect(rows[0]).toHaveProperty('id');
    });

    it('assigns correct table_type in CashFlow sheet', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['CashFlow']);
        expect(rows.some(r => r.table_type === 'Transaction')).toBe(true);
        expect(rows.some(r => r.table_type === 'Budget')).toBe(true);
    });

    it('exports Settings row with numeric conversion', () => {
        DataUtils.exportToExcel(SAMPLE_DATA, 'test.xlsx');
        const wb = XLSX.writeFile.mock.calls[0][0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Settings']);
        expect(rows[0].goal).toBe(5000000);
        expect(rows[0].epf).toBe(200000);
        expect(rows[0].currency).toBe('INR');
    });

    it('uses default filename when not specified', () => {
        DataUtils.exportToExcel(SAMPLE_DATA);
        expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'finance-backup.xlsx');
    });
});

describe('DataUtils.importFromExcel', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rejects when no file provided', async () => {
        await expect(DataUtils.importFromExcel(null)).rejects.toThrow('No file provided');
    });

    it('rejects non-xlsx files', async () => {
        await expect(DataUtils.importFromExcel({ name: 'data.csv', size: 100 })).rejects.toThrow('Invalid file type');
    });

    it('rejects files larger than 10MB', async () => {
        await expect(DataUtils.importFromExcel({ name: 'data.xlsx', size: 11 * 1024 * 1024 })).rejects.toThrow('File size too large');
    });

    it('rejects when a required sheet is missing', async () => {
        const wb = buildWorkbook({ Cash: [], Investments: [], Orders: [] });
        const file = makeFile(wb);
        stubFileReader(file._buf);
        await expect(DataUtils.importFromExcel(file)).rejects.toThrow('Missing required sheet');
    });

    it('parses a valid workbook with empty sheets without throwing', async () => {
        const wb = buildWorkbook(EMPTY_SHEETS);
        const file = makeFile(wb);
        stubFileReader(file._buf);
        const result = await DataUtils.importFromExcel(file);
        expect(result.savings).toEqual([]);
        expect(result.mutualFunds).toEqual([]);
        expect(result.mfOrders).toEqual([]);
    });

    it('parses Cash sheet and splits into savings and fixedDeposits', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, Cash: [
            { table_type: 'Savings', bank_name: 'HDFC', account_type: 'Salary', balance: 50000, interest_rate: 3.5 },
            { table_type: 'FixedDeposit', bank_name: 'SBI', invested: 100000, maturity: 115000, interest_rate: 7.5, maturity_date: '2025-12-31' },
        ]});
        const file = makeFile(wb);
        stubFileReader(file._buf);
        const result = await DataUtils.importFromExcel(file);
        expect(result.savings).toHaveLength(1);
        expect(result.savings[0].bank_name).toBe('HDFC');
        expect(result.savings[0].balance).toBe(50000);
        expect(result.fixedDeposits).toHaveLength(1);
        expect(result.fixedDeposits[0].bank_name).toBe('SBI');
        expect(result.fixedDeposits[0].invested).toBe(100000);
    });

    it('parses Investments sheet and splits by asset_type', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, Investments: [
            { asset_type: 'MutualFund', id: 'mf1', name: 'Parag Parikh FCF', symbol: '122639', quantity: 100.5, invested: 10000, current: 12000, current_price: 119.4, category: 'Equity', sip: 4000 },
            { asset_type: 'Stock', id: 'st1', name: 'Reliance', symbol: 'RELIANCE', quantity: 10, invested: 25000, current: 28000, current_price: 2800, category: 'Energy', sip: '' },
            { asset_type: 'Crypto', id: 'cr1', name: 'BTC', symbol: '', quantity: 0.001, invested: 3000, current: 3500, current_price: 3500000, category: 'Binance', sip: '' },
        ]});
        const file = makeFile(wb);
        stubFileReader(file._buf);
        const result = await DataUtils.importFromExcel(file);
        expect(result.mutualFunds).toHaveLength(1);
        expect(result.mutualFunds[0].fund_name).toBe('Parag Parikh FCF');
        expect(result.mutualFunds[0].scheme_code).toBe('122639');
        expect(result.mutualFunds[0].units).toBe(100.5);
        expect(result.mutualFunds[0].id).toBe('mf1');
        expect(result.stocks).toHaveLength(1);
        expect(result.stocks[0].stock_name).toBe('Reliance');
        expect(result.stocks[0].ticker).toBe('RELIANCE');
        expect(result.crypto).toHaveLength(1);
        expect(result.crypto[0].coin_name).toBe('BTC');
        expect(result.crypto[0].platform).toBe('Binance');
    });

    it('parses Orders sheet and maps fields back to API format', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, Orders: [
            { asset_type: 'MutualFund', holding_id: 'mf1', execution_date: '2024-01-10', order_type: 'Buy', quantity: 50, price: 100, amount: 5000, charges: 0, platform: 'Zerodha', remarks: '', amount_overridden: 'FALSE' },
            { asset_type: 'Stock', holding_id: 'st1', execution_date: '2024-01-12', order_type: 'Buy', quantity: 5, price: 2500, amount: 12500, charges: 25, platform: 'Zerodha', remarks: '', amount_overridden: 'FALSE' },
            { asset_type: 'Crypto', holding_id: 'cr1', execution_date: '2024-01-08', order_type: 'Buy', quantity: 0.0005, price: 3000000, amount: 1500, charges: 10, platform: 'Binance', remarks: '', amount_overridden: 'TRUE' },
        ]});
        const file = makeFile(wb);
        stubFileReader(file._buf);
        const result = await DataUtils.importFromExcel(file);
        expect(result.mfOrders).toHaveLength(1);
        expect(result.mfOrders[0].mf_id).toBe('mf1');
        expect(result.mfOrders[0].units).toBe(50);
        expect(result.mfOrders[0].nav).toBe(100);
        expect(result.stockOrders).toHaveLength(1);
        expect(result.stockOrders[0].stock_id).toBe('st1');
        expect(result.stockOrders[0].quantity).toBe(5);
        expect(result.cryptoOrders).toHaveLength(1);
        expect(result.cryptoOrders[0].crypto_id).toBe('cr1');
        expect(result.cryptoOrders[0].amount_overridden).toBe(true);
    });

    it('converts amount_overridden TRUE/FALSE string to boolean', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, Orders: [
            { asset_type: 'MutualFund', holding_id: 'mf1', execution_date: '2024-01-01', order_type: 'Buy', quantity: 10, price: 100, amount: 1000, charges: 0, platform: '', remarks: '', amount_overridden: 'TRUE' },
        ]});
        const file = makeFile(wb);
        stubFileReader(file._buf);
        const result = await DataUtils.importFromExcel(file);
        expect(result.mfOrders[0].amount_overridden).toBe(true);
    });

    it('parses CashFlow sheet into transactions and budgets', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, CashFlow: [
            { table_type: 'Transaction', date: '2024-01-15', type: 'income', category: 'Salary', amount: 80000, description: 'January salary', monthly_limit: '', notes: '' },
            { table_type: 'Budget', date: '', type: '', category: 'Food', amount: '', description: '', monthly_limit: 10000, notes: '' },
        ]});
        const file = makeFile(wb);
        stubFileReader(file._buf);
        const result = await DataUtils.importFromExcel(file);
        expect(result.transactions).toHaveLength(1);
        expect(result.transactions[0].type).toBe('income');
        expect(result.transactions[0].amount).toBe(80000);
        expect(result.budgets).toHaveLength(1);
        expect(result.budgets[0].category).toBe('Food');
        expect(result.budgets[0].monthly_limit).toBe(10000);
    });

    it('parses Settings sheet with numeric conversion', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, Settings: [
            { currency: 'INR', display_currency: 'USD', goal: 5000000, epf: 200000, ppf: 50000 },
        ]});
        const file = makeFile(wb);
        stubFileReader(file._buf);
        const result = await DataUtils.importFromExcel(file);
        expect(result.settings).toHaveLength(1);
        expect(result.settings[0].currency).toBe('INR');
        expect(result.settings[0].display_currency).toBe('USD');
        expect(result.settings[0].goal).toBe(5000000);
    });

    it('throws on unknown table_type in Cash sheet', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, Cash: [{ table_type: 'Gold', bank_name: 'X' }] });
        const file = makeFile(wb);
        stubFileReader(file._buf);
        await expect(DataUtils.importFromExcel(file)).rejects.toThrow('Cash sheet: unknown table_type');
    });

    it('throws on unknown asset_type in Investments sheet', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, Investments: [{ asset_type: 'Bond', name: 'X' }] });
        const file = makeFile(wb);
        stubFileReader(file._buf);
        await expect(DataUtils.importFromExcel(file)).rejects.toThrow('Investments sheet: unknown asset_type');
    });

    it('throws on unknown asset_type in Orders sheet', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, Orders: [{ asset_type: 'ETF', holding_id: 'x' }] });
        const file = makeFile(wb);
        stubFileReader(file._buf);
        await expect(DataUtils.importFromExcel(file)).rejects.toThrow('Orders sheet: unknown asset_type');
    });

    it('throws on unknown table_type in CashFlow sheet', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, CashFlow: [{ table_type: 'Goal', category: 'Savings' }] });
        const file = makeFile(wb);
        stubFileReader(file._buf);
        await expect(DataUtils.importFromExcel(file)).rejects.toThrow('CashFlow sheet: unknown table_type');
    });

    it('handles null/empty numeric fields gracefully', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, Cash: [
            { table_type: 'Savings', bank_name: 'HDFC', account_type: 'Salary', balance: '', interest_rate: '' },
        ]});
        const file = makeFile(wb);
        stubFileReader(file._buf);
        const result = await DataUtils.importFromExcel(file);
        expect(result.savings[0].balance).toBeNull();
        expect(result.savings[0].interest_rate).toBeNull();
    });

    it('handles file reader error', async () => {
        vi.stubGlobal('FileReader', class {
            readAsArrayBuffer() { this.onerror(); }
        });
        await expect(DataUtils.importFromExcel({ name: 'x.xlsx', size: 100 })).rejects.toThrow('Failed to read file');
    });

    it('skips Liabilities rows with empty type', async () => {
        const wb = buildWorkbook({ ...EMPTY_SHEETS, Liabilities: [
            { type: '', lender: '', loan_amount: '', outstanding: '', interest_rate: '', emi: '' },
            { type: 'Car Loan', lender: 'SBI', loan_amount: 500000, outstanding: 300000, interest_rate: 8.5, emi: 12000 },
        ]});
        const file = makeFile(wb);
        stubFileReader(file._buf);
        const result = await DataUtils.importFromExcel(file);
        expect(result.liabilities).toHaveLength(1);
        expect(result.liabilities[0].type).toBe('Car Loan');
    });

    it('round-trips data: export then import produces equivalent records', async () => {
        XLSX.writeFile.mockClear();
        DataUtils.exportToExcel(SAMPLE_DATA, 'rt.xlsx');
        const exportedWb = XLSX.writeFile.mock.calls[0][0];
        const buf = workbookToArrayBuffer(exportedWb);
        const file = { name: 'rt.xlsx', size: buf.byteLength, _buf: buf };
        stubFileReader(buf);

        const result = await DataUtils.importFromExcel(file);

        expect(result.savings[0].bank_name).toBe('HDFC');
        expect(result.savings[0].balance).toBe(50000);
        expect(result.fixedDeposits[0].invested).toBe(100000);
        expect(result.mutualFunds[0].fund_name).toBe('Parag Parikh FCF');
        expect(result.mutualFunds[0].units).toBe(100.5);
        expect(result.mutualFunds[0].id).toBe('mf1');
        expect(result.stocks[0].stock_name).toBe('Reliance');
        expect(result.crypto[0].coin_name).toBe('BTC');
        expect(result.liabilities[0].type).toBe('Car Loan');
        expect(result.creditCards[0].card_name).toBe('HDFC Regalia');
        expect(result.transactions[0].type).toBe('income');
        expect(result.budgets[0].monthly_limit).toBe(10000);
        expect(result.settings[0].goal).toBe(5000000);
        expect(result.mfOrders[0].mf_id).toBe('mf1');
        expect(result.mfOrders[0].units).toBe(50);
        expect(result.stockOrders[0].stock_id).toBe('st1');
        expect(result.cryptoOrders[0].amount_overridden).toBe(true);
    });
});
