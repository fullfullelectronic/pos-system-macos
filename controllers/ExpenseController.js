const Expense = require('../models/Expense');
const DatabaseService = require('../services/DatabaseService');
const BankController = require('./BankController');

class ExpenseController {
  static async getAllExpenses() {
    try {
      const expensesData = DatabaseService.getAll('expenses');
      return expensesData.map(data => Expense.fromJSON(data));
    } catch (error) {
      console.error('Error getting all expenses:', error);
      throw new Error('Error al obtener los gastos');
    }
  }

  static async getExpenseById(id) {
    try {
      const expenseData = DatabaseService.getById('expenses', id);
      return expenseData ? Expense.fromJSON(expenseData) : null;
    } catch (error) {
      console.error('Error getting expense by ID:', error);
      throw new Error('Error al obtener el gasto');
    }
  }

  static async createExpense(expenseData) {
    try {
      const expense = new Expense(expenseData);
      const validation = expense.validate();

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Save expense
      const savedExpense = DatabaseService.insert('expenses', expense.toJSON());

      // Update bank account balance if specified
      if (expense.bankAccountId) {
        await BankController.updateBankAccountBalance(
          expense.bankAccountId,
          -expense.amount, // Negative because it's an expense
          `Gasto: ${expense.description}`
        );
      } else {
        // Use default bank account if available
        const config = DatabaseService.getConfig();
        if (config.defaultBankAccountId) {
          await BankController.updateBankAccountBalance(
            config.defaultBankAccountId,
            -expense.amount,
            `Gasto: ${expense.description}`
          );
        }
      }

      return Expense.fromJSON(savedExpense);
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  static async updateExpense(id, updateData) {
    try {
      const existingExpense = DatabaseService.getById('expenses', id);
      if (!existingExpense) {
        throw new Error('Gasto no encontrado');
      }

      // Create updated expense
      const updatedExpenseData = { ...existingExpense, ...updateData, id };
      const expense = new Expense(updatedExpenseData);
      const validation = expense.validate();

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // If amount changed, update bank account
      if (updateData.amount && updateData.amount !== existingExpense.amount) {
        const difference = updateData.amount - existingExpense.amount;
        const bankAccountId = expense.bankAccountId || DatabaseService.getConfig().defaultBankAccountId;
        
        if (bankAccountId) {
          await BankController.updateBankAccountBalance(
            bankAccountId,
            -difference, // Negative because it's an expense
            `Actualización gasto: ${expense.description}`
          );
        }
      }

      expense.updatedAt = new Date().toISOString();
      const savedExpense = DatabaseService.update('expenses', id, expense.toJSON());
      return Expense.fromJSON(savedExpense);
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  static async deleteExpense(id) {
    try {
      const existingExpense = DatabaseService.getById('expenses', id);
      if (!existingExpense) {
        throw new Error('Gasto no encontrado');
      }

      const expense = Expense.fromJSON(existingExpense);

      // Reverse bank account movement
      const bankAccountId = expense.bankAccountId || DatabaseService.getConfig().defaultBankAccountId;
      if (bankAccountId) {
        await BankController.updateBankAccountBalance(
          bankAccountId,
          expense.amount, // Positive to reverse the expense
          `Eliminación gasto: ${expense.description}`
        );
      }

      const deletedExpense = DatabaseService.delete('expenses', id);
      return Expense.fromJSON(deletedExpense);
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  static async searchExpenses(query) {
    try {
      const expenses = DatabaseService.search('expenses', query);
      return expenses.map(data => Expense.fromJSON(data));
    } catch (error) {
      console.error('Error searching expenses:', error);
      throw new Error('Error al buscar gastos');
    }
  }

  static async getExpensesByDateRange(startDate, endDate) {
    try {
      const expenses = DatabaseService.getAll('expenses');
      const filteredExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });

      return filteredExpenses.map(data => Expense.fromJSON(data));
    } catch (error) {
      console.error('Error getting expenses by date range:', error);
      throw new Error('Error al obtener gastos por rango de fechas');
    }
  }

  static async getExpensesByCategory(category) {
    try {
      const expenses = DatabaseService.getAll('expenses');
      const categoryExpenses = expenses.filter(expense => 
        expense.category.toLowerCase() === category.toLowerCase()
      );
      
      return categoryExpenses.map(data => Expense.fromJSON(data));
    } catch (error) {
      console.error('Error getting expenses by category:', error);
      throw new Error('Error al obtener gastos por categoría');
    }
  }

  static async getDailyExpenses(date = null) {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      return await this.getExpensesByDateRange(startOfDay, endOfDay);
    } catch (error) {
      console.error('Error getting daily expenses:', error);
      throw new Error('Error al obtener gastos del día');
    }
  }

  static async getMonthlyExpenses(month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      return await this.getExpensesByDateRange(startDate, endDate);
    } catch (error) {
      console.error('Error getting monthly expenses:', error);
      throw new Error('Error al obtener gastos del mes');
    }
  }

  static async getExpensesStats(startDate = null, endDate = null) {
    try {
      let expenses;
      
      if (startDate && endDate) {
        expenses = await this.getExpensesByDateRange(new Date(startDate), new Date(endDate));
      } else {
        expenses = await this.getAllExpenses();
      }

      const totalExpenses = expenses.length;
      const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const averageAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

      // Group by category
      const byCategory = {};
      expenses.forEach(expense => {
        const category = expense.category || 'Sin categoría';
        if (!byCategory[category]) {
          byCategory[category] = { count: 0, amount: 0 };
        }
        byCategory[category].count++;
        byCategory[category].amount += expense.amount;
      });

      // Group by payment method
      const byPaymentMethod = {};
      expenses.forEach(expense => {
        const method = expense.getPaymentMethodDisplayName();
        if (!byPaymentMethod[method]) {
          byPaymentMethod[method] = { count: 0, amount: 0 };
        }
        byPaymentMethod[method].count++;
        byPaymentMethod[method].amount += expense.amount;
      });

      // Get recurring expenses
      const recurringExpenses = expenses.filter(expense => expense.isRecurring);

      return {
        totalExpenses,
        totalAmount,
        averageAmount,
        byCategory,
        byPaymentMethod,
        recurringExpenses: recurringExpenses.length,
        period: {
          startDate: startDate || 'Inicio',
          endDate: endDate || 'Actual'
        }
      };
    } catch (error) {
      console.error('Error getting expenses stats:', error);
      throw new Error('Error al obtener estadísticas de gastos');
    }
  }

  static async getCategories() {
    try {
      const expenses = DatabaseService.getAll('expenses');
      const categories = [...new Set(expenses.map(e => e.category).filter(c => c))];
      const defaultCategories = Expense.getDefaultCategories();
      
      // Combine default categories with existing ones
      const allCategories = [...new Set([...defaultCategories, ...categories])];
      return allCategories.sort();
    } catch (error) {
      console.error('Error getting expense categories:', error);
      throw new Error('Error al obtener categorías de gastos');
    }
  }

  static async getRecurringExpenses() {
    try {
      const expenses = DatabaseService.getAll('expenses');
      const recurringExpenses = expenses.filter(expense => expense.isRecurring);
      
      return recurringExpenses.map(data => Expense.fromJSON(data));
    } catch (error) {
      console.error('Error getting recurring expenses:', error);
      throw new Error('Error al obtener gastos recurrentes');
    }
  }

  static async getExpensesByBankAccount(bankAccountId) {
    try {
      const expenses = DatabaseService.getAll('expenses');
      const accountExpenses = expenses.filter(expense => 
        expense.bankAccountId === bankAccountId
      );
      
      return accountExpenses.map(data => Expense.fromJSON(data));
    } catch (error) {
      console.error('Error getting expenses by bank account:', error);
      throw new Error('Error al obtener gastos por cuenta bancaria');
    }
  }

  static async getTopExpenseCategories(limit = 10, startDate = null, endDate = null) {
    try {
      let expenses;
      
      if (startDate && endDate) {
        expenses = await this.getExpensesByDateRange(new Date(startDate), new Date(endDate));
      } else {
        expenses = await this.getAllExpenses();
      }

      const categoryStats = {};
      expenses.forEach(expense => {
        const category = expense.category || 'Sin categoría';
        if (!categoryStats[category]) {
          categoryStats[category] = {
            category,
            count: 0,
            totalAmount: 0,
            averageAmount: 0
          };
        }
        categoryStats[category].count++;
        categoryStats[category].totalAmount += expense.amount;
      });

      // Calculate averages and sort
      Object.values(categoryStats).forEach(stat => {
        stat.averageAmount = stat.totalAmount / stat.count;
      });

      return Object.values(categoryStats)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top expense categories:', error);
      throw new Error('Error al obtener principales categorías de gastos');
    }
  }
}

module.exports = ExpenseController;
