const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const DatabaseService = require('./services/DatabaseService');

// Controllers
const ProductController = require('./controllers/ProductController');
const CustomerController = require('./controllers/CustomerController');
const SaleController = require('./controllers/SaleController');
const ExpenseController = require('./controllers/ExpenseController');
const BankController = require('./controllers/BankController');
const ReportController = require('./controllers/ReportController');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'hiddenInset',
    frame: true,
    show: false,
    backgroundColor: '#f5f5f7'
  });

  mainWindow.loadFile('views/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Auto-save on window close
  mainWindow.on('close', () => {
    DatabaseService.saveDatabase();
  });
}

app.whenReady().then(() => {
  // Initialize database
  DatabaseService.initializeDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  DatabaseService.saveDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  DatabaseService.saveDatabase();
});

// IPC Handlers for Products
ipcMain.handle('products:getAll', async () => {
  try {
    return await ProductController.getAllProducts();
  } catch (error) {
    console.error('Error getting products:', error);
    return { error: error.message };
  }
});

ipcMain.handle('products:create', async (event, data) => {
  try {
    return await ProductController.createProduct(data);
  } catch (error) {
    console.error('Error creating product:', error);
    return { error: error.message };
  }
});

ipcMain.handle('products:update', async (event, id, data) => {
  try {
    return await ProductController.updateProduct(id, data);
  } catch (error) {
    console.error('Error updating product:', error);
    return { error: error.message };
  }
});

ipcMain.handle('products:delete', async (event, id) => {
  try {
    return await ProductController.deleteProduct(id);
  } catch (error) {
    console.error('Error deleting product:', error);
    return { error: error.message };
  }
});

// IPC Handlers for Customers
ipcMain.handle('customers:getAll', async () => {
  try {
    return await CustomerController.getAllCustomers();
  } catch (error) {
    console.error('Error getting customers:', error);
    return { error: error.message };
  }
});

ipcMain.handle('customers:create', async (event, data) => {
  try {
    return await CustomerController.createCustomer(data);
  } catch (error) {
    console.error('Error creating customer:', error);
    return { error: error.message };
  }
});

ipcMain.handle('customers:update', async (event, id, data) => {
  try {
    return await CustomerController.updateCustomer(id, data);
  } catch (error) {
    console.error('Error updating customer:', error);
    return { error: error.message };
  }
});

ipcMain.handle('customers:delete', async (event, id) => {
  try {
    return await CustomerController.deleteCustomer(id);
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { error: error.message };
  }
});

// IPC Handlers for Sales
ipcMain.handle('sales:getAll', async () => {
  try {
    return await SaleController.getAllSales();
  } catch (error) {
    console.error('Error getting sales:', error);
    return { error: error.message };
  }
});

ipcMain.handle('sales:create', async (event, data) => {
  try {
    return await SaleController.createSale(data);
  } catch (error) {
    console.error('Error creating sale:', error);
    return { error: error.message };
  }
});

// IPC Handlers for Expenses
ipcMain.handle('expenses:getAll', async () => {
  try {
    return await ExpenseController.getAllExpenses();
  } catch (error) {
    console.error('Error getting expenses:', error);
    return { error: error.message };
  }
});

ipcMain.handle('expenses:create', async (event, data) => {
  try {
    return await ExpenseController.createExpense(data);
  } catch (error) {
    console.error('Error creating expense:', error);
    return { error: error.message };
  }
});

ipcMain.handle('expenses:update', async (event, id, data) => {
  try {
    return await ExpenseController.updateExpense(id, data);
  } catch (error) {
    console.error('Error updating expense:', error);
    return { error: error.message };
  }
});

ipcMain.handle('expenses:delete', async (event, id) => {
  try {
    return await ExpenseController.deleteExpense(id);
  } catch (error) {
    console.error('Error deleting expense:', error);
    return { error: error.message };
  }
});

// IPC Handlers for Bank Accounts
ipcMain.handle('bank:getAll', async () => {
  try {
    return await BankController.getAllBankAccounts();
  } catch (error) {
    console.error('Error getting bank accounts:', error);
    return { error: error.message };
  }
});

ipcMain.handle('bank:create', async (event, data) => {
  try {
    return await BankController.createBankAccount(data);
  } catch (error) {
    console.error('Error creating bank account:', error);
    return { error: error.message };
  }
});

ipcMain.handle('bank:update', async (event, id, data) => {
  try {
    return await BankController.updateBankAccount(id, data);
  } catch (error) {
    console.error('Error updating bank account:', error);
    return { error: error.message };
  }
});

ipcMain.handle('bank:delete', async (event, id) => {
  try {
    return await BankController.deleteBankAccount(id);
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return { error: error.message };
  }
});

ipcMain.handle('bank:getMovements', async () => {
  try {
    return await BankController.getAllFinancialMovements();
  } catch (error) {
    console.error('Error getting financial movements:', error);
    return { error: error.message };
  }
});

// IPC Handlers for Reports
ipcMain.handle('reports:getMonthly', async (event, month, year) => {
  try {
    return await ReportController.getMonthlyReport(month, year);
  } catch (error) {
    console.error('Error getting monthly report:', error);
    return { error: error.message };
  }
});

// IPC Handlers for Configuration
ipcMain.handle('config:get', async () => {
  try {
    return DatabaseService.getConfig();
  } catch (error) {
    console.error('Error getting config:', error);
    return { error: error.message };
  }
});

ipcMain.handle('config:update', async (event, data) => {
  try {
    return DatabaseService.updateConfig(data);
  } catch (error) {
    console.error('Error updating config:', error);
    return { error: error.message };
  }
});

// Auto-save every hour
setInterval(() => {
  DatabaseService.saveDatabase();
}, 3600000); // 1 hour
