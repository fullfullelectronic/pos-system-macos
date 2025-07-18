const DatabaseService = require('../services/DatabaseService');
const SaleController = require('./SaleController');
const ExpenseController = require('./ExpenseController');
const BankController = require('./BankController');

class ReportController {
  static async getMonthlyReport(month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // Get sales data
      const sales = await SaleController.getSalesByDateRange(startDate, endDate);
      const completedSales = sales.filter(sale => sale.status === 'completed');
      
      // Get expenses data
      const expenses = await ExpenseController.getExpensesByDateRange(startDate, endDate);
      
      // Calculate totals
      const totalSales = completedSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const netProfit = totalSales - totalExpenses;
      
      // Sales analysis
      const salesByDay = this.groupSalesByDay(completedSales, startDate, endDate);
      const topProducts = SaleController.getTopSellingProducts(completedSales, 10);
      const salesByPaymentMethod = this.getSalesByPaymentMethod(completedSales);
      
      // Expenses analysis
      const expensesByCategory = this.getExpensesByCategory(expenses);
      const expensesByDay = this.groupExpensesByDay(expenses, startDate, endDate);
      
      // Customer analysis
      const customerStats = await this.getCustomerStats(completedSales);
      
      // Financial movements
      const movements = await BankController.getFinancialMovementsByDateRange(startDate, endDate);
      const movementsSummary = this.getMovementsSummary(movements);

      return {
        period: {
          month,
          year,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          monthName: startDate.toLocaleDateString('es-AR', { month: 'long' })
        },
        summary: {
          totalSales,
          totalExpenses,
          netProfit,
          profitMargin: totalSales > 0 ? ((netProfit / totalSales) * 100) : 0,
          salesCount: completedSales.length,
          expensesCount: expenses.length,
          averageSale: completedSales.length > 0 ? totalSales / completedSales.length : 0,
          averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0
        },
        sales: {
          total: totalSales,
          count: completedSales.length,
          byDay: salesByDay,
          byPaymentMethod: salesByPaymentMethod,
          topProducts,
          averageTicket: completedSales.length > 0 ? totalSales / completedSales.length : 0
        },
        expenses: {
          total: totalExpenses,
          count: expenses.length,
          byCategory: expensesByCategory,
          byDay: expensesByDay,
          averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0
        },
        customers: customerStats,
        financialMovements: movementsSummary,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating monthly report:', error);
      throw new Error('Error al generar el reporte mensual');
    }
  }

  static async getYearlyReport(year) {
    try {
      const reports = [];
      
      for (let month = 1; month <= 12; month++) {
        const monthlyReport = await this.getMonthlyReport(month, year);
        reports.push({
          month,
          monthName: new Date(year, month - 1).toLocaleDateString('es-AR', { month: 'long' }),
          ...monthlyReport.summary
        });
      }

      const yearTotals = reports.reduce((totals, month) => ({
        totalSales: totals.totalSales + month.totalSales,
        totalExpenses: totals.totalExpenses + month.totalExpenses,
        salesCount: totals.salesCount + month.salesCount,
        expensesCount: totals.expensesCount + month.expensesCount
      }), { totalSales: 0, totalExpenses: 0, salesCount: 0, expensesCount: 0 });

      const yearNetProfit = yearTotals.totalSales - yearTotals.totalExpenses;

      return {
        year,
        summary: {
          ...yearTotals,
          netProfit: yearNetProfit,
          profitMargin: yearTotals.totalSales > 0 ? ((yearNetProfit / yearTotals.totalSales) * 100) : 0,
          averageSale: yearTotals.salesCount > 0 ? yearTotals.totalSales / yearTotals.salesCount : 0,
          averageExpense: yearTotals.expensesCount > 0 ? yearTotals.totalExpenses / yearTotals.expensesCount : 0
        },
        monthlyData: reports,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating yearly report:', error);
      throw new Error('Error al generar el reporte anual');
    }
  }

  static async getDashboardStats() {
    try {
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      // Today's stats
      const todaySales = await SaleController.getSalesByDateRange(startOfToday, today);
      const todayExpenses = await ExpenseController.getExpensesByDateRange(startOfToday, today);
      
      // Month's stats
      const monthSales = await SaleController.getSalesByDateRange(startOfMonth, today);
      const monthExpenses = await ExpenseController.getExpensesByDateRange(startOfMonth, today);
      
      // Year's stats
      const yearSales = await SaleController.getSalesByDateRange(startOfYear, today);
      const yearExpenses = await ExpenseController.getExpensesByDateRange(startOfYear, today);

      // Bank accounts overview
      const accountsOverview = await BankController.getAccountsOverview();

      // Low stock products
      const lowStockProducts = await DatabaseService.getAll('products')
        .then(products => {
          const config = DatabaseService.getConfig();
          return products.filter(p => p.stock <= (config.lowStockThreshold || 10));
        });

      // Recent sales
      const recentSales = await SaleController.getAllSales()
        .then(sales => sales
          .filter(sale => sale.status === 'completed')
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5)
        );

      return {
        today: {
          sales: {
            count: todaySales.filter(s => s.status === 'completed').length,
            total: todaySales.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.totalAmount, 0)
          },
          expenses: {
            count: todayExpenses.length,
            total: todayExpenses.reduce((sum, e) => sum + e.amount, 0)
          }
        },
        month: {
          sales: {
            count: monthSales.filter(s => s.status === 'completed').length,
            total: monthSales.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.totalAmount, 0)
          },
          expenses: {
            count: monthExpenses.length,
            total: monthExpenses.reduce((sum, e) => sum + e.amount, 0)
          }
        },
        year: {
          sales: {
            count: yearSales.filter(s => s.status === 'completed').length,
            total: yearSales.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.totalAmount, 0)
          },
          expenses: {
            count: yearExpenses.length,
            total: yearExpenses.reduce((sum, e) => sum + e.amount, 0)
          }
        },
        accounts: accountsOverview,
        alerts: {
          lowStockProducts: lowStockProducts.length,
          overdrawnAccounts: accountsOverview.overdrawnAccounts
        },
        recentSales,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating dashboard stats:', error);
      throw new Error('Error al generar estadísticas del dashboard');
    }
  }

  static groupSalesByDay(sales, startDate, endDate) {
    const dayStats = {};
    const currentDate = new Date(startDate);
    
    // Initialize all days in the range
    while (currentDate <= endDate) {
      const dayKey = currentDate.toISOString().split('T')[0];
      dayStats[dayKey] = { date: dayKey, count: 0, total: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Fill with actual data
    sales.forEach(sale => {
      const dayKey = sale.date.split('T')[0];
      if (dayStats[dayKey]) {
        dayStats[dayKey].count++;
        dayStats[dayKey].total += sale.totalAmount;
      }
    });
    
    return Object.values(dayStats);
  }

  static groupExpensesByDay(expenses, startDate, endDate) {
    const dayStats = {};
    const currentDate = new Date(startDate);
    
    // Initialize all days in the range
    while (currentDate <= endDate) {
      const dayKey = currentDate.toISOString().split('T')[0];
      dayStats[dayKey] = { date: dayKey, count: 0, total: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Fill with actual data
    expenses.forEach(expense => {
      const dayKey = expense.date.split('T')[0];
      if (dayStats[dayKey]) {
        dayStats[dayKey].count++;
        dayStats[dayKey].total += expense.amount;
      }
    });
    
    return Object.values(dayStats);
  }

  static getSalesByPaymentMethod(sales) {
    const paymentMethods = {};
    
    sales.forEach(sale => {
      sale.payments.forEach(payment => {
        const method = payment.getTypeDisplayName();
        if (!paymentMethods[method]) {
          paymentMethods[method] = { count: 0, total: 0 };
        }
        paymentMethods[method].count++;
        paymentMethods[method].total += payment.amountInARS;
      });
    });
    
    return paymentMethods;
  }

  static getExpensesByCategory(expenses) {
    const categories = {};
    
    expenses.forEach(expense => {
      const category = expense.category || 'Sin categoría';
      if (!categories[category]) {
        categories[category] = { count: 0, total: 0 };
      }
      categories[category].count++;
      categories[category].total += expense.amount;
    });
    
    return categories;
  }

  static async getCustomerStats(sales) {
    try {
      const customerData = {};
      
      sales.forEach(sale => {
        if (sale.customerId) {
          if (!customerData[sale.customerId]) {
            customerData[sale.customerId] = {
              customerId: sale.customerId,
              customerName: sale.customerName,
              salesCount: 0,
              totalAmount: 0
            };
          }
          customerData[sale.customerId].salesCount++;
          customerData[sale.customerId].totalAmount += sale.totalAmount;
        }
      });

      const customers = Object.values(customerData);
      customers.forEach(customer => {
        customer.averageAmount = customer.totalAmount / customer.salesCount;
      });

      // Sort by total amount
      customers.sort((a, b) => b.totalAmount - a.totalAmount);

      return {
        totalCustomers: customers.length,
        topCustomers: customers.slice(0, 10),
        newCustomers: 0, // This would require tracking customer creation dates
        returningCustomers: customers.filter(c => c.salesCount > 1).length
      };
    } catch (error) {
      console.error('Error getting customer stats:', error);
      return { totalCustomers: 0, topCustomers: [], newCustomers: 0, returningCustomers: 0 };
    }
  }

  static getMovementsSummary(movements) {
    const summary = {
      totalMovements: movements.length,
      totalIncome: 0,
      totalExpenses: 0,
      netFlow: 0,
      byType: {},
      byCategory: {}
    };

    movements.forEach(movement => {
      if (movement.type === 'income') {
        summary.totalIncome += movement.amount;
      } else if (movement.type === 'expense') {
        summary.totalExpenses += movement.amount;
      }

      // By type
      if (!summary.byType[movement.type]) {
        summary.byType[movement.type] = { count: 0, total: 0 };
      }
      summary.byType[movement.type].count++;
      summary.byType[movement.type].total += movement.amount;

      // By category
      const category = movement.category || 'Sin categoría';
      if (!summary.byCategory[category]) {
        summary.byCategory[category] = { count: 0, total: 0 };
      }
      summary.byCategory[category].count++;
      summary.byCategory[category].total += movement.amount;
    });

    summary.netFlow = summary.totalIncome - summary.totalExpenses;

    return summary;
  }

  static async exportReport(reportType, params) {
    try {
      let reportData;

      switch (reportType) {
        case 'monthly':
          reportData = await this.getMonthlyReport(params.month, params.year);
          break;
        case 'yearly':
          reportData = await this.getYearlyReport(params.year);
          break;
        case 'dashboard':
          reportData = await this.getDashboardStats();
          break;
        default:
          throw new Error('Tipo de reporte no válido');
      }

      // Convert to CSV format for export
      return this.convertToCSV(reportData, reportType);
    } catch (error) {
      console.error('Error exporting report:', error);
      throw new Error('Error al exportar el reporte');
    }
  }

  static convertToCSV(data, reportType) {
    // This is a simplified CSV conversion
    // In a real application, you might want to use a proper CSV library
    const lines = [];
    
    switch (reportType) {
      case 'monthly':
        lines.push('Reporte Mensual');
        lines.push(`Período,${data.period.monthName} ${data.period.year}`);
        lines.push('');
        lines.push('Resumen');
        lines.push(`Total Ventas,${data.summary.totalSales}`);
        lines.push(`Total Gastos,${data.summary.totalExpenses}`);
        lines.push(`Ganancia Neta,${data.summary.netProfit}`);
        lines.push(`Margen de Ganancia,${data.summary.profitMargin.toFixed(2)}%`);
        break;
      
      case 'yearly':
        lines.push('Reporte Anual');
        lines.push(`Año,${data.year}`);
        lines.push('');
        lines.push('Resumen Anual');
        lines.push(`Total Ventas,${data.summary.totalSales}`);
        lines.push(`Total Gastos,${data.summary.totalExpenses}`);
        lines.push(`Ganancia Neta,${data.summary.netProfit}`);
        break;
    }

    return lines.join('\n');
  }
}

module.exports = ReportController;
