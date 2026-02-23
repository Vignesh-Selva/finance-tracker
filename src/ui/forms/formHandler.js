import Utilities from '../../utils/utils.js';

export class FormHandler {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.editingEntry = null;
        this.currentFormType = '';
        this.app = null;
        this.fundNameSuggestions = [];
    }

    async showAddForm(type) {
        this.currentFormType = type;
        this.editingEntry = null;

        if (type === 'mutualFunds') {
            const funds = await this.dbManager.getAll('mutualFunds');
            this.fundNameSuggestions = [...new Set(funds.map(f => f.fundName).filter(Boolean))];
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
        this.editingEntry = await this.dbManager.getOne(type, id);

        if (type === 'mutualFunds') {
            const funds = await this.dbManager.getAll('mutualFunds');
            this.fundNameSuggestions = [...new Set(funds.map(f => f.fundName).filter(Boolean))];
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
        let errorMessages = [];

        formConfig.fields.forEach(field => {
            const input = document.getElementById(`field-${field.name}`);
            if (input) {
                // Reset border
                input.style.border = '';

                // Required field validation
                if (field.required && !input.value) {
                    isValid = false;
                    input.style.border = '2px solid red';
                    errorMessages.push(`${field.label} is required`);
                    return;
                }

                // Type-specific validation
                if (input.value) {
                    if (field.type === 'number') {
                        const numValue = parseFloat(input.value);

                        // Check for valid number
                        if (isNaN(numValue)) {
                            isValid = false;
                            input.style.border = '2px solid red';
                            errorMessages.push(`${field.label} must be a valid number`);
                            return;
                        }

                        // Check minimum value
                        if (field.min !== undefined && numValue < field.min) {
                            isValid = false;
                            input.style.border = '2px solid red';
                            errorMessages.push(`${field.label} must be at least ${field.min}`);
                            return;
                        }

                        // Check for negative values where not allowed
                        if (numValue < 0 && !field.allowNegative) {
                            isValid = false;
                            input.style.border = '2px solid red';
                            errorMessages.push(`${field.label} cannot be negative`);
                            return;
                        }

                        data[field.name] = numValue;
                    } else if (field.type === 'date') {
                        const dateValue = new Date(input.value);

                        // Check for valid date
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

        // Additional cross-field validation
        if (isValid && this.currentFormType === 'fixedDeposits') {
            if (data.maturity && data.invested && parseFloat(data.maturity) < parseFloat(data.invested)) {
                isValid = false;
                errorMessages.push('Maturity amount should be greater than or equal to invested amount');
            }
        }

        if (isValid && (this.currentFormType === 'mutualFunds' || this.currentFormType === 'stocks' || this.currentFormType === 'crypto')) {
            if (data.invested && data.current) {
                // Just a warning, not blocking
                if (parseFloat(data.current) < parseFloat(data.invested) * 0.5) {
                    console.warn('Current value is less than 50% of invested - significant loss detected');
                }
            }
        }

        if (!this.editingEntry && this.currentFormType === 'mutualFunds') {
            const existingFunds = await this.dbManager.getAll('mutualFunds');
            const normalizedInput = (data.fundName || '').trim().toLowerCase();
            const match = existingFunds.find(f => (f.fundName || '').trim().toLowerCase() === normalizedInput);

            if (match) {
                data.id = match.id;
                data.invested = (match.invested || 0) + (data.invested || 0);
                data.current = (match.current || 0) + (data.current || 0);
                data.units = (match.units || 0) + (data.units || 0);
                data.type = data.type || match.type;
                data.schemeCode = data.schemeCode || match.schemeCode;
                if (data.sip === undefined && match.sip !== undefined) {
                    data.sip = match.sip;
                }
            }
        }

        if (!isValid) {
            const message = errorMessages.length > 0
                ? errorMessages[0]
                : 'Please fill all required fields correctly';
            Utilities.showNotification(message, 'error');
            return;
        }

        data.updated = new Date().toISOString();

        if (!data.createdAt) {
            data.createdAt = data.updated;
        }

        try {
            const id = await this.dbManager.save(this.currentFormType, data);
            if (!data.id) {
                data.id = id;
            }
            Utilities.showNotification(`${this.editingEntry ? 'Updated' : 'Added'} successfully`);
            this.closeModal();

            if (this.app) {
                await this.app.refreshCurrentTab();
            }
            return data;
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
                    { name: 'type', label: 'Type', type: 'select', options: ['Equity', 'Debt', 'Hybrid', 'Index'], required: true },
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