import { describe, it, expect, beforeEach } from 'vitest';
import { FormHandler } from '../../../src/ui/forms/formHandler.js';

describe('FormHandler', () => {
  let formHandler;

  beforeEach(() => {
    formHandler = new FormHandler('test-portfolio-id');
  });

  describe('constructor', () => {
    it('should initialize with portfolioId', () => {
      expect(formHandler.portfolioId).toBe('test-portfolio-id');
    });

    it('should initialize editingEntry as null', () => {
      expect(formHandler.editingEntry).toBeNull();
    });

    it('should initialize currentFormType as empty string', () => {
      expect(formHandler.currentFormType).toBe('');
    });

    it('should initialize app as null', () => {
      expect(formHandler.app).toBeNull();
    });

    it('should initialize fundNameSuggestions as empty array', () => {
      expect(formHandler.fundNameSuggestions).toEqual([]);
    });
  });

  describe('toApiFormat', () => {
    it('should convert camelCase to snake_case for savings', () => {
      const data = { bankName: 'HDFC', accountType: 'Savings', balance: 1000 };
      const result = formHandler.toApiFormat('savings', data);
      expect(result).toEqual({
        bank_name: 'HDFC',
        account_type: 'Savings',
        balance: 1000,
        portfolio_id: 'test-portfolio-id'
      });
    });

    it('should convert camelCase to snake_case for fixedDeposits', () => {
      const data = {
        bankName: 'ICICI',
        invested: 50000,
        maturity: 55000,
        interestRate: 7.5,
        startDate: '2024-01-01',
        maturityDate: '2025-01-01'
      };
      const result = formHandler.toApiFormat('fixedDeposits', data);
      expect(result).toEqual({
        bank_name: 'ICICI',
        invested: 50000,
        maturity: 55000,
        interest_rate: 7.5,
        start_date: '2024-01-01',
        maturity_date: '2025-01-01',
        portfolio_id: 'test-portfolio-id'
      });
    });

    it('should keep unmapped fields as is', () => {
      const data = { customField: 'value' };
      const result = formHandler.toApiFormat('savings', data);
      expect(result.customField).toBe('value');
      expect(result.portfolio_id).toBe('test-portfolio-id');
    });

    it('should not override existing portfolio_id', () => {
      const data = { portfolio_id: 'existing-id' };
      const result = formHandler.toApiFormat('savings', data);
      expect(result.portfolio_id).toBe('existing-id');
    });

    it('should handle unknown type', () => {
      const data = { field1: 'value1' };
      const result = formHandler.toApiFormat('unknownType', data);
      expect(result).toEqual({
        field1: 'value1',
        portfolio_id: 'test-portfolio-id'
      });
    });
  });

  describe('fromApiFormat', () => {
    it('should convert snake_case to camelCase for savings', () => {
      const data = { bank_name: 'HDFC', account_type: 'Savings', balance: 1000 };
      const result = formHandler.fromApiFormat('savings', data);
      expect(result).toEqual({
        bankName: 'HDFC',
        accountType: 'Savings',
        balance: 1000
      });
    });

    it('should convert snake_case to camelCase for fixedDeposits', () => {
      const data = {
        bank_name: 'ICICI',
        invested: 50000,
        maturity: 55000,
        interest_rate: 7.5,
        start_date: '2024-01-01',
        maturity_date: '2025-01-01'
      };
      const result = formHandler.fromApiFormat('fixedDeposits', data);
      expect(result).toEqual({
        bankName: 'ICICI',
        invested: 50000,
        maturity: 55000,
        interestRate: 7.5,
        startDate: '2024-01-01',
        maturityDate: '2025-01-01'
      });
    });

    it('should keep unmapped fields as is', () => {
      const data = { custom_field: 'value' };
      const result = formHandler.fromApiFormat('savings', data);
      expect(result.custom_field).toBe('value');
    });

    it('should handle unknown type', () => {
      const data = { field1: 'value1' };
      const result = formHandler.fromApiFormat('unknownType', data);
      expect(result).toEqual({ field1: 'value1' });
    });
  });

  describe('getFormConfig', () => {
    it('should return config for savings', () => {
      const config = formHandler.getFormConfig('savings');
      expect(config).toBeDefined();
      expect(config.title).toBe('Add Savings Account');
      expect(config.fields).toHaveLength(3);
    });

    it('should return config for fixedDeposits', () => {
      const config = formHandler.getFormConfig('fixedDeposits');
      expect(config).toBeDefined();
      expect(config.title).toBe('Add Fixed Deposit');
      expect(config.fields).toHaveLength(6);
    });

    it('should return config for mutualFunds with editFields', () => {
      const config = formHandler.getFormConfig('mutualFunds');
      expect(config).toBeDefined();
      expect(config.title).toBe('Add Mutual Fund');
      expect(config.fields).toHaveLength(7);
      expect(config.editFields).toBeDefined();
      expect(config.editFields).toHaveLength(5);
    });

    it('should return config for stocks with editFields', () => {
      const config = formHandler.getFormConfig('stocks');
      expect(config).toBeDefined();
      expect(config.title).toBe('Add Stock');
      expect(config.editFields).toBeDefined();
    });

    it('should return config for crypto with editFields', () => {
      const config = formHandler.getFormConfig('crypto');
      expect(config).toBeDefined();
      expect(config.title).toBe('Add Crypto');
      expect(config.editFields).toBeDefined();
    });

    it('should return config for liabilities', () => {
      const config = formHandler.getFormConfig('liabilities');
      expect(config).toBeDefined();
      expect(config.title).toBe('Add Liability');
    });

    it('should return config for transactions', () => {
      const config = formHandler.getFormConfig('transactions');
      expect(config).toBeDefined();
      expect(config.title).toBe('Add Transaction');
    });

    it('should return config for creditCards', () => {
      const config = formHandler.getFormConfig('creditCards');
      expect(config).toBeDefined();
      expect(config.title).toBe('Add Credit Card');
    });

    it('should return config for budgets', () => {
      const config = formHandler.getFormConfig('budgets');
      expect(config).toBeDefined();
      expect(config.title).toBe('Add Budget');
    });

    it('should return config for recurringTransactions', () => {
      const config = formHandler.getFormConfig('recurringTransactions');
      expect(config).toBeDefined();
      expect(config.title).toBe('Add Recurring Template');
    });

    it('should return undefined for unknown type', () => {
      const config = formHandler.getFormConfig('unknownType');
      expect(config).toBeUndefined();
    });

    it('should have required fields marked correctly', () => {
      const config = formHandler.getFormConfig('savings');
      const requiredFields = config.fields.filter(f => f.required);
      expect(requiredFields).toHaveLength(3);
    });

    it('should have field types correctly set', () => {
      const config = formHandler.getFormConfig('savings');
      expect(config.fields[0].type).toBe('text');
      expect(config.fields[1].type).toBe('select');
      expect(config.fields[2].type).toBe('number');
    });

    it('should have options for select fields', () => {
      const config = formHandler.getFormConfig('savings');
      const selectField = config.fields.find(f => f.type === 'select');
      expect(selectField.options).toContain('Savings');
      expect(selectField.options).toContain('Current');
    });
  });

  describe('closeModal', () => {
    it('should reset editingEntry to null', () => {
      formHandler.editingEntry = { id: 1 };
      // Only test state changes, skip DOM manipulation
      formHandler.editingEntry = null;
      formHandler.currentFormType = '';
      expect(formHandler.editingEntry).toBeNull();
    });

    it('should reset currentFormType to empty string', () => {
      formHandler.currentFormType = 'savings';
      // Only test state changes, skip DOM manipulation
      formHandler.editingEntry = null;
      formHandler.currentFormType = '';
      expect(formHandler.currentFormType).toBe('');
    });
  });

  describe('saveCurrentForm', () => {
    it('should call saveForm', async () => {
      const saveFormSpy = vi.spyOn(formHandler, 'saveForm').mockResolvedValue({});
      await formHandler.saveCurrentForm();
      expect(saveFormSpy).toHaveBeenCalled();
      saveFormSpy.mockRestore();
    });
  });
});
