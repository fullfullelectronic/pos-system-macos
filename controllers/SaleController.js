const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const DatabaseService = require('../services/DatabaseService');
const ProductController = require('./ProductController');
const BankController = require('./BankController');

class SaleController {
  static async getAllSales() {
    try {
      const salesData = DatabaseService.getAll('sales');
      return salesData.map(data => Sale.fromJSON(data));
    } catch (error) {
      console.error('Error getting all sales:', error);
      throw new Error('Error al obtener las ventas');
    }
  }

  static async getSaleById(id) {
    try {
      const saleData = DatabaseService.getById('sales', id);
      return saleData ? Sale.fromJSON(saleData) : null;
    } catch (error) {
      console.error('Error getting sale by ID:', error);
      throw new Error('Error al obtener la venta');
    }
  }

  static async createSale(saleData) {
    try {
      const config = DatabaseService.getConfig();
      const sale = new Sale(saleData);

      // Calculate totals with IVA if enabled
      sale.calculateTotals(config.ivaEnabled, config.ivaRate);

      // Validate sale
      const validation = sale.validate();
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check product availability and update stock
      for (const product of sale.products) {
        const productData = await ProductController.getProductById(product.productId);
        if (!productData) {
          throw new Error(`Producto ${product.name} no encontrado`);
        }

        if (productData.stock < product.quantity) {
          throw new Error(`Stock insuficiente para ${product.name}. Stock disponible: ${productData.stock}`);
        }

        // Reduce stock
        await ProductController.updateStock(product.productId, -product.quantity);
      }

      // Process payments and update bank accounts
      let totalPaidInARS = 0;
      for (const payment of sale.payments) {
        // Convert payment to ARS if needed
        if (payment.currency === 'USD') {
          payment.exchangeRate = config.exchangeRate;
          payment.calculateAmountInARS();
        } else {
          payment.amountInARS = payment.amount;
        }
        totalPaidInARS += payment.amountInARS;

        // Update bank account if specified
        if (payment.bankAccountId) {
          await BankController.updateBankAccountBalance(
            payment.bankAccountId, 
            payment.amountInARS,
            `Venta #${sale.id || 'Nueva'}`
          );
        }
      }

      // Verify payment total matches sale total
      if (Math.abs(totalPaidInARS - sale.totalAmount) > 0.01) {
        throw new Error('El total de pagos no coincide con el total de la venta');
      }

      // Save sale
      const savedSale = DatabaseService.insert('sales', sale.toJSON());
      
      // Create financial movement for default bank account if no specific account was used
      const defaultBankAccountId = config.defaultBankAccountId;
      if (defaultBankAccountId && !sale.payments.some(p => p.bankAccountId)) {
        await BankController.updateBankAccountBalance(
          defaultBankAccountId,
          sale.totalAmount,
          `Venta #${savedSale.id}`
        );
      }

      return Sale.fromJSON(savedSale);
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  }

  static async updateSale(id, updateData) {
    try {
      const existingSale = DatabaseService.getById('sales', id);
      if (!existingSale) {
        throw new Error('Venta no encontrada');
      }

      // Only allow updates to certain fields for completed sales
      const allowedUpdates = ['notes', 'status'];
      const filteredUpdateData = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdateData[key] = updateData[key];
        }
      });

      const updatedSaleData = { ...existingSale, ...filteredUpdateData, id };
      const sale = new Sale(updatedSaleData);
      sale.updatedAt = new Date().toISOString();

      const savedSale = DatabaseService.update('sales', id, sale.toJSON());
      return Sale.fromJSON(savedSale);
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  }

  static async cancelSale(id, reason = '') {
    try {
      const existingSale = DatabaseService.getById('sales', id);
      if (!existingSale) {
        throw new Error('Venta no encontrada');
      }

      if (existingSale.status === 'cancelled') {
        throw new Error('La venta ya está cancelada');
      }

      const sale = Sale.fromJSON(existingSale);

      // Restore product stock
      for (const product of sale.products) {
        await ProductController.updateStock(product.productId, product.quantity);
      }

      // Reverse bank account movements
      for (const payment of sale.payments) {
        if (payment.bankAccountId) {
          await BankController.updateBankAccountBalance(
            payment.bankAccountId,
            -payment.amountInARS,
            `Cancelación venta #${id}`
          );
        }
      }

      // Update sale status
      sale.status = 'cancelled';
      sale.notes = (sale.notes || '') + `\nCancelada: ${reason}`;
      sale.updatedAt = new Date().toISOString();

      const savedSale = DatabaseService.update('sales', id, sale.toJSON());
      return Sale.fromJSON(savedSale);
    } catch (error) {
      console.error('Error cancelling sale:', error);
      throw error;
    }
  }

  static async getSalesByDateRange(startDate, endDate) {
    try {
      const sales = DatabaseService.getAll('sales');
      const filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
      });

      return filteredSales.map(data => Sale.fromJSON(data));
    } catch (error) {
      console.error('Error getting sales by date range:', error);
      throw new Error('Error al obtener ventas por rango de fechas');
    }
  }

  static async getSalesByCustomer(customerId) {
    try {
      const sales = DatabaseService.getAll('sales');
      const customerSales = sales.filter(sale => sale.customerId === customerId);
      
      return customerSales.map(data => Sale.fromJSON(data));
    } catch (error) {
      console.error('Error getting sales by customer:', error);
      throw new Error('Error al obtener ventas del cliente');
    }
  }

  static async getDailySales(date = null) {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      return await this.getSalesByDateRange(startOfDay, endOfDay);
    } catch (error) {
      console.error('Error getting daily sales:', error);
      throw new Error('Error al obtener ventas del día');
    }
  }

  static async getMonthlySales(month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      return await this.getSalesByDateRange(startDate, endDate);
    } catch (error) {
      console.error('Error getting monthly sales:', error);
      throw new Error('Error al obtener ventas del mes');
    }
  }

  static async getSalesStats(startDate = null, endDate = null) {
    try {
      let sales;
      
      if (startDate && endDate) {
        sales = await this.getSalesByDateRange(new Date(startDate), new Date(endDate));
      } else {
        sales = await this.getAllSales();
      }

      const completedSales = sales.filter(sale => sale.status === 'completed');
      
      const totalSales = completedSales.length;
      const totalAmount = completedSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const averageAmount = totalSales > 0 ? totalAmount / totalSales : 0;
      
      const paymentMethods = {};
      completedSales.forEach(sale => {
        sale.payments.forEach(payment => {
          const method = payment.getTypeDisplayName();
          if (!paymentMethods[method]) {
            paymentMethods[method] = { count: 0, amount: 0 };
          }
          paymentMethods[method].count++;
          paymentMethods[method].amount += payment.amountInARS;
        });
      });

      const topProducts = this.getTopSellingProducts(completedSales);

      return {
        totalSales,
        totalAmount,
        averageAmount,
        paymentMethods,
        topProducts,
        period: {
          startDate: startDate || 'Inicio',
          endDate: endDate || 'Actual'
        }
      };
    } catch (error) {
      console.error('Error getting sales stats:', error);
      throw new Error('Error al obtener estadísticas de ventas');
    }
  }

  static getTopSellingProducts(sales, limit = 10) {
    const productStats = {};

    sales.forEach(sale => {
      sale.products.forEach(product => {
        if (!productStats[product.productId]) {
          productStats[product.productId] = {
            productId: product.productId,
            name: product.name,
            totalQuantity: 0,
            totalAmount: 0,
            salesCount: 0
          };
        }

        productStats[product.productId].totalQuantity += product.quantity;
        productStats[product.productId].totalAmount += product.subtotal;
        productStats[product.productId].salesCount++;
      });
    });

    return Object.values(productStats)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  }

  static async searchSales(query) {
    try {
      const sales = DatabaseService.search('sales', query);
      return sales.map(data => Sale.fromJSON(data));
    } catch (error) {
      console.error('Error searching sales:', error);
      throw new Error('Error al buscar ventas');
    }
  }
}

module.exports = SaleController;
