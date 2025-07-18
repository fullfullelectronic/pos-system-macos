const fs = require('fs');
const path = require('path');

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'db.json');
    this.data = {
      products: [],
      customers: [],
      sales: [],
      expenses: [],
      bankAccounts: [],
      financialMovements: [],
      config: {
        ivaEnabled: true,
        ivaRate: 21, // 21% IVA
        exchangeRate: 350, // ARS per USD
        companyName: 'Mi Empresa',
        companyAddress: '',
        companyPhone: '',
        companyEmail: ''
      }
    };
  }

  initializeDatabase() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(fileContent);
        console.log('Database loaded successfully');
      } else {
        this.saveDatabase();
        console.log('New database created');
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      // Create backup and reset
      if (fs.existsSync(this.dbPath)) {
        const backupPath = this.dbPath + '.backup.' + Date.now();
        fs.copyFileSync(this.dbPath, backupPath);
        console.log(`Corrupted database backed up to: ${backupPath}`);
      }
      this.saveDatabase();
    }
  }

  saveDatabase() {
    try {
      const jsonData = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(this.dbPath, jsonData, 'utf8');
      console.log('Database saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving database:', error);
      return false;
    }
  }

  // Generic CRUD operations
  getAll(collection) {
    return this.data[collection] || [];
  }

  getById(collection, id) {
    const items = this.data[collection] || [];
    return items.find(item => item.id === id);
  }

  insert(collection, item) {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    
    // Generate ID if not provided
    if (!item.id) {
      item.id = this.generateId();
    }
    
    this.data[collection].push(item);
    return item;
  }

  update(collection, id, updatedItem) {
    const items = this.data[collection] || [];
    const index = items.findIndex(item => item.id === id);
    
    if (index !== -1) {
      items[index] = { ...items[index], ...updatedItem, id };
      return items[index];
    }
    
    return null;
  }

  delete(collection, id) {
    const items = this.data[collection] || [];
    const index = items.findIndex(item => item.id === id);
    
    if (index !== -1) {
      const deletedItem = items.splice(index, 1)[0];
      return deletedItem;
    }
    
    return null;
  }

  // Configuration methods
  getConfig() {
    return this.data.config;
  }

  updateConfig(newConfig) {
    this.data.config = { ...this.data.config, ...newConfig };
    this.saveDatabase();
    return this.data.config;
  }

  // Utility methods
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Search methods
  search(collection, query) {
    const items = this.data[collection] || [];
    const searchTerm = query.toLowerCase();
    
    return items.filter(item => {
      return Object.values(item).some(value => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm);
        }
        return false;
      });
    });
  }

  // Statistics methods
  getTotalSales(startDate, endDate) {
    const sales = this.data.sales || [];
    return sales
      .filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
      })
      .reduce((total, sale) => total + sale.totalAmount, 0);
  }

  getTotalExpenses(startDate, endDate) {
    const expenses = this.data.expenses || [];
    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  }

  // Bank account methods
  updateBankAccountBalance(accountId, amount) {
    const account = this.getById('bankAccounts', accountId);
    if (account) {
      account.balance += amount;
      this.update('bankAccounts', accountId, account);
      
      // Create financial movement
      const movement = {
        id: this.generateId(),
        type: amount > 0 ? 'income' : 'expense',
        amount: Math.abs(amount),
        date: new Date().toISOString(),
        relatedAccountId: accountId,
        description: amount > 0 ? 'Venta' : 'Gasto'
      };
      
      this.insert('financialMovements', movement);
      return account;
    }
    return null;
  }
}

module.exports = new DatabaseService();
