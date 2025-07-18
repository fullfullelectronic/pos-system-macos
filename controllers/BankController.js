const BankAccount = require('../models/BankAccount');
const FinancialMovement = require('../models/FinancialMovement');
const DatabaseService = require('../services/DatabaseService');

class BankController {
  static async getAllBankAccounts() {
    try {
      const accountsData = DatabaseService.getAll('bankAccounts');
      return accountsData.map(data => BankAccount.fromJSON(data));
    } catch (error) {
      console.error('Error getting all bank accounts:', error);
      throw new Error('Error al obtener las cuentas bancarias');
    }
  }

  static async getBankAccountById(id) {
    try {
      const accountData = DatabaseService.getById('bankAccounts', id);
      return accountData ? BankAccount.fromJSON(accountData) : null;
    } catch (error) {
      console.error('Error getting bank account by ID:', error);
      throw new Error('Error al obtener la cuenta bancaria');
    }
  }

  static async createBankAccount(accountData) {
    try {
      const bankAccount = new BankAccount(accountData);
      const validation = bankAccount.validate();

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if account with same account number already exists
      const existingAccounts = DatabaseService.getAll('bankAccounts');
      const duplicateAccount = existingAccounts.find(acc => 
        acc.accountNumber === bankAccount.accountNumber && 
        acc.bankName.toLowerCase() === bankAccount.bankName.toLowerCase()
      );

      if (duplicateAccount) {
        throw new Error('Ya existe una cuenta con ese número en el mismo banco');
      }

      const savedAccount = DatabaseService.insert('bankAccounts', bankAccount.toJSON());

      // Create initial financial movement if balance is not zero
      if (bankAccount.balance !== 0) {
        const movement = new FinancialMovement({
          type: bankAccount.balance > 0 ? 'income' : 'expense',
          amount: Math.abs(bankAccount.balance),
          description: 'Saldo inicial de cuenta',
          relatedAccountId: savedAccount.id,
          category: 'Saldo Inicial',
          balance: bankAccount.balance
        });

        DatabaseService.insert('financialMovements', movement.toJSON());
      }

      return BankAccount.fromJSON(savedAccount);
    } catch (error) {
      console.error('Error creating bank account:', error);
      throw error;
    }
  }

  static async updateBankAccount(id, updateData) {
    try {
      const existingAccount = DatabaseService.getById('bankAccounts', id);
      if (!existingAccount) {
        throw new Error('Cuenta bancaria no encontrada');
      }

      // Don't allow direct balance updates through this method
      if (updateData.balance !== undefined) {
        delete updateData.balance;
      }

      // Create updated account
      const updatedAccountData = { ...existingAccount, ...updateData, id };
      const bankAccount = new BankAccount(updatedAccountData);
      const validation = bankAccount.validate();

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check for duplicate account number (excluding current account)
      if (updateData.accountNumber || updateData.bankName) {
        const existingAccounts = DatabaseService.getAll('bankAccounts');
        const duplicateAccount = existingAccounts.find(acc => 
          acc.id !== id &&
          acc.accountNumber === bankAccount.accountNumber && 
          acc.bankName.toLowerCase() === bankAccount.bankName.toLowerCase()
        );

        if (duplicateAccount) {
          throw new Error('Ya existe una cuenta con ese número en el mismo banco');
        }
      }

      bankAccount.updatedAt = new Date().toISOString();
      const savedAccount = DatabaseService.update('bankAccounts', id, bankAccount.toJSON());
      return BankAccount.fromJSON(savedAccount);
    } catch (error) {
      console.error('Error updating bank account:', error);
      throw error;
    }
  }

  static async deleteBankAccount(id) {
    try {
      const existingAccount = DatabaseService.getById('bankAccounts', id);
      if (!existingAccount) {
        throw new Error('Cuenta bancaria no encontrada');
      }

      // Check if account has movements
      const movements = DatabaseService.getAll('financialMovements');
      const accountMovements = movements.filter(movement => 
        movement.relatedAccountId === id
      );

      if (accountMovements.length > 0) {
        throw new Error('No se puede eliminar la cuenta porque tiene movimientos asociados');
      }

      // Check if it's the default account
      const config = DatabaseService.getConfig();
      if (config.defaultBankAccountId === id) {
        throw new Error('No se puede eliminar la cuenta por defecto. Cambie la cuenta por defecto primero.');
      }

      const deletedAccount = DatabaseService.delete('bankAccounts', id);
      return BankAccount.fromJSON(deletedAccount);
    } catch (error) {
      console.error('Error deleting bank account:', error);
      throw error;
    }
  }

  static async updateBankAccountBalance(accountId, amount, description = '') {
    try {
      const accountData = DatabaseService.getById('bankAccounts', accountId);
      if (!accountData) {
        throw new Error('Cuenta bancaria no encontrada');
      }

      const bankAccount = BankAccount.fromJSON(accountData);
      const previousBalance = bankAccount.balance;
      
      // Update balance
      bankAccount.updateBalance(amount, description);
      
      // Save updated account
      const savedAccount = DatabaseService.update('bankAccounts', accountId, bankAccount.toJSON());

      // Create financial movement
      const movement = new FinancialMovement({
        type: amount > 0 ? 'income' : 'expense',
        amount: Math.abs(amount),
        description: description || (amount > 0 ? 'Ingreso' : 'Egreso'),
        relatedAccountId: accountId,
        category: amount > 0 ? 'Ingresos' : 'Egresos',
        balance: bankAccount.balance
      });

      DatabaseService.insert('financialMovements', movement.toJSON());

      return {
        account: BankAccount.fromJSON(savedAccount),
        movement: FinancialMovement.fromJSON(movement.toJSON()),
        previousBalance,
        newBalance: bankAccount.balance
      };
    } catch (error) {
      console.error('Error updating bank account balance:', error);
      throw error;
    }
  }

  static async transferBetweenAccounts(fromAccountId, toAccountId, amount, description = '') {
    try {
      if (fromAccountId === toAccountId) {
        throw new Error('No se puede transferir a la misma cuenta');
      }

      if (amount <= 0) {
        throw new Error('El monto de transferencia debe ser mayor a cero');
      }

      const fromAccount = await this.getBankAccountById(fromAccountId);
      const toAccount = await this.getBankAccountById(toAccountId);

      if (!fromAccount) {
        throw new Error('Cuenta de origen no encontrada');
      }

      if (!toAccount) {
        throw new Error('Cuenta de destino no encontrada');
      }

      // Check if source account has sufficient funds (unless it's a credit account)
      if (!fromAccount.canWithdraw(amount)) {
        throw new Error('Fondos insuficientes en la cuenta de origen');
      }

      // Perform transfer
      const withdrawResult = await this.updateBankAccountBalance(
        fromAccountId, 
        -amount, 
        `Transferencia a ${toAccount.getDisplayName()}: ${description}`
      );

      const depositResult = await this.updateBankAccountBalance(
        toAccountId, 
        amount, 
        `Transferencia desde ${fromAccount.getDisplayName()}: ${description}`
      );

      return {
        fromAccount: withdrawResult.account,
        toAccount: depositResult.account,
        amount,
        description,
        withdrawMovement: withdrawResult.movement,
        depositMovement: depositResult.movement
      };
    } catch (error) {
      console.error('Error transferring between accounts:', error);
      throw error;
    }
  }

  static async getAllFinancialMovements() {
    try {
      const movementsData = DatabaseService.getAll('financialMovements');
      return movementsData.map(data => FinancialMovement.fromJSON(data));
    } catch (error) {
      console.error('Error getting all financial movements:', error);
      throw new Error('Error al obtener los movimientos financieros');
    }
  }

  static async getFinancialMovementsByAccount(accountId) {
    try {
      const movements = DatabaseService.getAll('financialMovements');
      const accountMovements = movements.filter(movement => 
        movement.relatedAccountId === accountId
      );
      
      // Sort by date descending
      accountMovements.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return accountMovements.map(data => FinancialMovement.fromJSON(data));
    } catch (error) {
      console.error('Error getting financial movements by account:', error);
      throw new Error('Error al obtener movimientos de la cuenta');
    }
  }

  static async getFinancialMovementsByDateRange(startDate, endDate, accountId = null) {
    try {
      let movements = DatabaseService.getAll('financialMovements');
      
      // Filter by account if specified
      if (accountId) {
        movements = movements.filter(movement => movement.relatedAccountId === accountId);
      }

      // Filter by date range
      const filteredMovements = movements.filter(movement => {
        const movementDate = new Date(movement.date);
        return movementDate >= startDate && movementDate <= endDate;
      });

      // Sort by date descending
      filteredMovements.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return filteredMovements.map(data => FinancialMovement.fromJSON(data));
    } catch (error) {
      console.error('Error getting financial movements by date range:', error);
      throw new Error('Error al obtener movimientos por rango de fechas');
    }
  }

  static async getBankAccountSummary(accountId) {
    try {
      const account = await this.getBankAccountById(accountId);
      if (!account) {
        throw new Error('Cuenta bancaria no encontrada');
      }

      const movements = await this.getFinancialMovementsByAccount(accountId);
      
      const totalIncome = movements
        .filter(m => m.type === 'income')
        .reduce((sum, m) => sum + m.amount, 0);
      
      const totalExpenses = movements
        .filter(m => m.type === 'expense')
        .reduce((sum, m) => sum + m.amount, 0);

      const lastMovement = movements.length > 0 ? movements[0] : null;

      return {
        account,
        currentBalance: account.balance,
        totalMovements: movements.length,
        totalIncome,
        totalExpenses,
        netFlow: totalIncome - totalExpenses,
        lastMovement,
        recentMovements: movements.slice(0, 10) // Last 10 movements
      };
    } catch (error) {
      console.error('Error getting bank account summary:', error);
      throw new Error('Error al obtener resumen de cuenta bancaria');
    }
  }

  static async getAccountsOverview() {
    try {
      const accounts = await this.getAllBankAccounts();
      const activeAccounts = accounts.filter(acc => acc.isActive);
      
      const totalBalance = activeAccounts.reduce((sum, acc) => {
        // Convert to ARS if needed
        if (acc.currency === 'USD') {
          const config = DatabaseService.getConfig();
          return sum + (acc.balance * config.exchangeRate);
        }
        return sum + acc.balance;
      }, 0);

      const accountsByType = {};
      activeAccounts.forEach(acc => {
        const type = acc.getAccountTypeDisplayName();
        if (!accountsByType[type]) {
          accountsByType[type] = { count: 0, totalBalance: 0 };
        }
        accountsByType[type].count++;
        accountsByType[type].totalBalance += acc.currency === 'USD' 
          ? acc.balance * DatabaseService.getConfig().exchangeRate 
          : acc.balance;
      });

      const overdrawnAccounts = activeAccounts.filter(acc => acc.isOverdrawn());

      return {
        totalAccounts: activeAccounts.length,
        totalBalance,
        accountsByType,
        overdrawnAccounts: overdrawnAccounts.length,
        accounts: activeAccounts
      };
    } catch (error) {
      console.error('Error getting accounts overview:', error);
      throw new Error('Error al obtener resumen de cuentas');
    }
  }

  static async searchFinancialMovements(query) {
    try {
      const movements = DatabaseService.search('financialMovements', query);
      return movements.map(data => FinancialMovement.fromJSON(data));
    } catch (error) {
      console.error('Error searching financial movements:', error);
      throw new Error('Error al buscar movimientos financieros');
    }
  }
}

module.exports = BankController;
