const DB_NAME = 'PersonalFinanceDB';
const DB_VERSION = 1;

class DatabaseManager {
    constructor() {
        this.db = null;
        this.stores = [
            'savings', 'fixedDeposits', 'mutualFunds', 'stocks',
            'crypto', 'liabilities', 'transactions', 'budgets', 'settings'
        ];
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                this.stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, {
                            keyPath: 'id',
                            autoIncrement: true
                        });

                        if (storeName === 'transactions') {
                            store.createIndex('date', 'date', { unique: false });
                            store.createIndex('category', 'category', { unique: false });
                        } else if (storeName !== 'settings' && storeName !== 'budgets') {
                            store.createIndex('updated', 'updated', { unique: false });
                        }
                    }
                });
            };
        });
    }

    async save(storeName, data) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(data);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => {
                    console.error('Save error:', request.error);
                    reject(request.error);
                };
            } catch (error) {
                console.error('Transaction error:', error);
                reject(error);
            }
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => {
                    console.error('GetAll error:', request.error);
                    reject(request.error);
                };
            } catch (error) {
                console.error('Transaction error:', error);
                reject(error);
            }
        });
    }

    async getOne(storeName, id) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => {
                    console.error('GetOne error:', request.error);
                    reject(request.error);
                };
            } catch (error) {
                console.error('Transaction error:', error);
                reject(error);
            }
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.db) {
                    reject(new Error('Database not initialized'));
                    return;
                }

                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => {
                    console.error('Delete error:', request.error);
                    reject(request.error);
                };
            } catch (error) {
                console.error('Transaction error:', error);
                reject(error);
            }
        });
    }
}