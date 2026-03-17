import Utilities from '../../utils/utils.js';
import api from '../../services/api.js';

/**
 * Maps frontend form types to API resource names and snake_case field names.
 */
const RESOURCE_MAP = {
    savings: { api: api.savings, fields: { bankName: 'bank_name', accountType: 'account_type' } },
    fixedDeposits: { api: api.fixedDeposits, fields: { bankName: 'bank_name', interestRate: 'interest_rate', startDate: 'start_date', maturityDate: 'maturity_date' } },
    mutualFunds: { api: api.mutualFunds, fields: { fundName: 'fund_name', schemeCode: 'scheme_code', fundType: 'fund_type' } },
    stocks: { api: api.stocks, fields: { stockName: 'stock_name' } },
    crypto: { api: api.crypto, fields: { coinName: 'coin_name' } },
    liabilities: { api: api.liabilities, fields: { loanAmount: 'loan_amount', interestRate: 'interest_rate' } },
    transactions: { api: api.transactions, fields: {} },
    budgets: { api: api.budgets, fields: { limit: 'monthly_limit' } },
};

export class FormHandler {
    constructor(portfolioId) {
        this.portfolioId = portfolioId;
        this.editingEntry = null;
        this.currentFormType = '';
        this.app = null;
        this.fundNameSuggestions = [];
    }

    setPortfolioId(id) {
        this.portfolioId = id;
    }

    /**
     * Converts camelCase form data to snake_case API data.
     */
    toApiFormat(type, data) {
        const mapping = RESOURCE_MAP[type]?.fields || {};
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            const apiKey = mapping[key] || key;
            result[apiKey] = value;
        }
        if (!result.portfolio_id) {
            result.portfolio_id = this.portfolioId;
        }
        return result;
    }

    /**
     * Converts snake_case API data to camelCase form data.
     */
    fromApiFormat(type, data) {
        const mapping = RESOURCE_MAP[type]?.fields || {};
        const reverse = {};
        for (const [camel, snake] of Object.entries(mapping)) {
            reverse[snake] = camel;
        }
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            const formKey = reverse[key] || key;
            result[formKey] = value;
        }
        return result;
    }

    async showAddForm(type) {
        this.currentFormType = type;
        this.editingEntry = null;

        if (type === 'mutualFunds') {
            try {
                const resp = await api.mutualFunds.list(this.portfolioId);
                const funds = resp?.data || [];
                this.fundNameSuggestions = [...new Set(funds.map(f => f.fund_name).filter(Boolean))];
            } catch {
                this.fundNameSuggestions = [];
            }
        } else {
            this.fundNameSuggestions = [];
        }

        const formConfig = this.getFormConfig(type);
        if (!formConfig) {
            Utilities.showNotification('Form not available for this type', 'error');
            return;
        }

        this.showModal(formConfig.title, formConfig.fields);
    }

    async showEditForm(type, id) {
        this.currentFormType = type;

        try {
            const resource = RESOURCE_MAP[type]?.api;
            if (!resource) throw new Error('Unknown type');
            const resp = await resource.get(id);
            this.editingEntry = this.fromApiFormat(type, resp.data);
            this.editingEntry.id = id;
        } catch (err) {
            console.error('Failed to load entry for editing:', err);
            Utilities.showNotification('Failed to load entry', 'error');
            return;
        }

        if (type === 'mutualFunds') {
            try {
                const resp = await api.mutualFunds.list(this.portfolioId);
                const funds = resp?.data || [];
                this.fundNameSuggestions = [...new Set(funds.map(f => f.fund_name).filter(Boolean))];
            } catch {
                this.fundNameSuggestions = [];
            }
        } else {
            this.fundNameSuggestions = [];
        }

        const formConfig = this.getFormConfig(type);
        if (!formConfig) {
            Utilities.showNotification('Form not available for this type', 'error');
            return;
        }

        this.showModal(`Edit ${formConfig.singularTitle || formConfig.title.replace('Add ', '')}`, formConfig.fields, this.editingEntry);
    }

    showModal(title, fields, data = {}) {
        const modal = document.getElementById('dataModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = title;

        let html = '<form id="dataForm">';

        fields.forEach(field => {
            html += '<div class="form-group">';
            html += `<label>${field.label}:</label>`;

            if (field.type === 'select') {
                html += `<select id="field-${field.name}" class="form-input" ${field.required ? 'required' : ''}>`;
                field.options.forEach(opt => {
                    const selected = data[field.name] === opt ? 'selected' : '';
                    html += `<option value="${opt}" ${selected}>${opt}</option>`;
                });
                html += '</select>';
            } else if (field.type === 'textarea') {
                html += `<textarea id="field-${field.name}" class="form-input" ${field.required ? 'required' : ''}>${data[field.name] || ''}</textarea>`;
            } else {
                const value = data[field.name] || '';
                const listAttr = field.suggestions && field.suggestions.length > 0 ? `list="list-${field.name}"` : '';
                html += `<input type="${field.type}" id="field-${field.name}" value="${value}" class="form-input" ${field.required ? 'required' : ''} ${field.step ? 'step="' + field.step + '"' : ''} ${field.min !== undefined ? 'min="' + field.min + '"' : ''} ${listAttr} />`;
                if (field.suggestions && field.suggestions.length > 0) {
                    html += `<datalist id="list-${field.name}">`;
                    field.suggestions.forEach(opt => {
                        html += `<option value="${opt}"></option>`;
                    });
                    html += '</datalist>';
                }
            }

            html += '</div>';
        });

        html += '</form>';

        modalBody.innerHTML = html;
        modal.style.display = 'block';
    }

    async saveCurrentForm() {
        return this.saveForm();
    }

    async saveForm() {
        const formConfig = this.getFormConfig(this.currentFormType);
        if (!formConfig) return;

        const data = this.editingEntry ? { ...this.editingEntry } : {};

        let isValid = true;
        const errorMessages = [];

        formConfig.fields.forEach(field => {
            const input = document.getElementById(`field-${field.name}`);
            if (input) {
                input.style.border = '';

                if (field.required && !input.value) {
                    isValid = false;
                    input.style.border = '2px solid red';
                    errorMessages.push(`${field.label} is required`);
                    return;
                }

                if (input.value) {
                    if (field.type === 'number') {
                        const numValue = parseFloat(input.value);

                        if (isNaN(numValue)) {
                            isValid = false;
                            input.style.border = '2px solid red';
                            errorMessages.push(`${field.label} must be a valid number`);
                            return;
                        }

                        if (field.min !== undefined && numValue < field.min) {
                            isValid = false;
                            input.style.border = '2px solid red';
                            errorMessages.push(`${field.label} must be at least ${field.min}`);
                            return;
                        }

                        if (numValue < 0 && !field.allowNegative) {
                            isValid = false;
                            input.style.border = '2px solid red';
                            errorMessages.push(`${field.label} cannot be negative`);
                            return;
                        }

                        data[field.name] = numValue;
                    } else if (field.type === 'date') {
                        const dateValue = new Date(input.value);

                        if (isNaN(dateValue.getTime())) {
                            isValid = false;
                            input.style.border = '2px solid red';
                            errorMessages.push(`${field.label} must be a valid date`);
                            return;
                        }

                        data[field.name] = input.value;
                    } else {
                        data[field.name] = input.value.trim();
                    }
                }
            }
        });

        // Cross-field validation
        if (isValid && this.currentFormType === 'fixedDeposits') {
            if (data.maturity && data.invested && parseFloat(data.maturity) < parseFloat(data.invested)) {
                isValid = false;
                errorMessages.push('Maturity amount should be greater than or equal to invested amount');
            }
        }

        if (!isValid) {
            const message = errorMessages.length > 0
                ? errorMessages[0]
                : 'Please fill all required fields correctly';
            Utilities.showNotification(message, 'error');
            return;
        }

        try {
            const resource = RESOURCE_MAP[this.currentFormType]?.api;
            if (!resource) throw new Error('Unknown resource type');

            const apiData = this.toApiFormat(this.currentFormType, data);
            let result;

            if (this.editingEntry?.id) {
                const { portfolio_id: _pid, id: _id, created_at: _ca, updated_at: _ua, ...updateData } = apiData;
                const resp = await resource.update(this.editingEntry.id, updateData);
                result = resp?.data;
            } else {
                const resp = await resource.create(apiData);
                result = resp?.data;
            }

            Utilities.showNotification(`${this.editingEntry ? 'Updated' : 'Added'} successfully`);
            this.closeModal();

            if (this.app) {
                await this.app.refreshCurrentTab();
            }
            return result;
        } catch (error) {
            console.error('Save error:', error);
            Utilities.showNotification('Failed to save data: ' + error.message, 'error');
        }
    }

    closeModal() {
        const modal = document.getElementById('dataModal');
        modal.style.display = 'none';
        this.editingEntry = null;
        this.currentFormType = '';
    }

    getFormConfig(type) {
        const configs = {
            savings: {
                title: 'Add Savings Account',
                singularTitle: 'Savings Account',
                fields: [
                    { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
                    { name: 'accountType', label: 'Account Type', type: 'select', options: ['Savings', 'Current'], required: true },
                    { name: 'balance', label: 'Balance', type: 'number', step: '0.01', min: 0, required: true },
                ]
            },
            fixedDeposits: {
                title: 'Add Fixed Deposit',
                singularTitle: 'Fixed Deposit',
                fields: [
                    { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
                    { name: 'invested', label: 'Invested Amount', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'maturity', label: 'Maturity Amount', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'interestRate', label: 'Interest Rate (%)', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'startDate', label: 'Start Date', type: 'date', required: true },
                    { name: 'maturityDate', label: 'Maturity Date', type: 'date', required: true }
                ]
            },
            mutualFunds: {
                title: 'Add Mutual Fund',
                singularTitle: 'Mutual Fund',
                fields: [
                    { name: 'fundName', label: 'Fund Name', type: 'text', required: true, suggestions: this.fundNameSuggestions },
                    { name: 'schemeCode', label: 'Scheme Code', type: 'text', required: true },
                    { name: 'units', label: 'Units', type: 'number', step: '0.0001', min: 0, required: true },
                    { name: 'invested', label: 'Invested Amount', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'current', label: 'Current Value', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'fundType', label: 'Type', type: 'select', options: ['Equity', 'Debt', 'Hybrid', 'Index'], required: true },
                    { name: 'sip', label: 'SIP Amount', type: 'number', step: '0.01', min: 0, required: false }
                ]
            },
            stocks: {
                title: 'Add Stock',
                singularTitle: 'Stock',
                fields: [
                    { name: 'stockName', label: 'Stock Name', type: 'text', required: true },
                    { name: 'ticker', label: 'Ticker', type: 'text', required: true },
                    { name: 'quantity', label: 'Quantity', type: 'number', min: 0, required: true },
                    { name: 'invested', label: 'Invested Amount', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'current', label: 'Current Value', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'sector', label: 'Sector', type: 'text', required: false }
                ]
            },
            crypto: {
                title: 'Add Crypto',
                singularTitle: 'Crypto',
                fields: [
                    { name: 'coinName', label: 'Coin Name', type: 'text', required: true },
                    { name: 'platform', label: 'Platform', type: 'text', required: true },
                    { name: 'quantity', label: 'Quantity', type: 'number', step: '0.00000001', min: 0, required: true },
                    { name: 'invested', label: 'Invested Amount', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'current', label: 'Current Value', type: 'number', step: '0.01', min: 0, required: true }
                ]
            },
            liabilities: {
                title: 'Add Liability',
                singularTitle: 'Liability',
                fields: [
                    { name: 'type', label: 'Type', type: 'select', options: ['Home Loan', 'Car Loan', 'Personal Loan', 'Credit Card', 'Other'], required: true },
                    { name: 'lender', label: 'Lender', type: 'text', required: true },
                    { name: 'loanAmount', label: 'Original Loan Amount', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'outstanding', label: 'Outstanding Amount', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'interestRate', label: 'Interest Rate (%)', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'emi', label: 'EMI Amount', type: 'number', step: '0.01', min: 0, required: false }
                ]
            },
            transactions: {
                title: 'Add Transaction',
                singularTitle: 'Transaction',
                fields: [
                    { name: 'date', label: 'Date', type: 'date', required: true },
                    { name: 'type', label: 'Type', type: 'select', options: ['income', 'expense'], required: true },
                    { name: 'category', label: 'Category', type: 'select', options: ['Salary', 'Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Investment', 'Other'], required: true },
                    { name: 'amount', label: 'Amount', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'units', label: 'Units', type: 'number', step: '0.0001', min: 0, required: false },
                    { name: 'description', label: 'Description', type: 'text', required: false }
                ]
            },
            budgets: {
                title: 'Add Budget',
                singularTitle: 'Budget',
                fields: [
                    { name: 'category', label: 'Category', type: 'select', options: ['Salary', 'Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Investment', 'Other'], required: true },
                    { name: 'limit', label: 'Monthly Limit', type: 'number', step: '0.01', min: 0, required: true },
                    { name: 'notes', label: 'Notes', type: 'text', required: false }
                ]
            }
        };

        return configs[type];
    }
}
