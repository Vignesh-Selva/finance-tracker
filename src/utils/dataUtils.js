import { INITIAL_DATA } from './initialData.js';

export const DataUtils = {
    async getSettings(dbManager) {
        try {
            const settings = await dbManager.getAll('settings');
            return settings[0] || INITIAL_DATA.settings;
        } catch (error) {
            console.error('Get settings error:', error);
            return INITIAL_DATA.settings;
        }
    },

    exportData(data, filename = 'finance-backup.json') {
        try {
            const sanitizedData = this.sanitizeExportData(data);
            const dataStr = JSON.stringify(sanitizedData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export data error:', error);
            throw new Error('Failed to export data');
        }
    },

    sanitizeExportData(data) {
        try {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                if (Array.isArray(value)) {
                    sanitized[key] = value.map(item => ({ ...item }));
                } else {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        } catch (error) {
            console.error('Data sanitization error:', error);
            return data;
        }
    },

    async importData(file, _dbManager) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }
            if (!file.name.endsWith('.json')) {
                reject(new Error('Invalid file type. Please select a JSON file.'));
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error('File size too large. Maximum size is 10MB.'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data || typeof data !== 'object') {
                        reject(new Error('Invalid data format'));
                        return;
                    }
                    resolve(data);
                } catch (error) {
                    console.error('Import parse error:', error);
                    reject(new Error('Failed to parse JSON file: ' + error.message));
                }
            };

            reader.onerror = () => {
                console.error('File read error:', reader.error);
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }
};

export default DataUtils;
