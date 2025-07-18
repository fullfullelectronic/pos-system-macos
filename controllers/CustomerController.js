const Customer = require('../models/Customer');
const DatabaseService = require('../services/DatabaseService');

class CustomerController {
  static async getAllCustomers() {
    try {
      const customersData = DatabaseService.getAll('customers');
      return customersData.map(data => Customer.fromJSON(data));
    } catch (error) {
      console.error('Error getting all customers:', error);
      throw new Error('Error al obtener los clientes');
    }
  }

  static async getCustomerById(id) {
    try {
      const customerData = DatabaseService.getById('customers', id);
      return customerData ? Customer.fromJSON(customerData) : null;
    } catch (error) {
      console.error('Error getting customer by ID:', error);
      throw new Error('Error al obtener el cliente');
    }
  }

  static async createCustomer(customerData) {
    try {
      const customer = new Customer(customerData);
      const validation = customer.validate();

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if customer with same email already exists
      if (customer.email) {
        const existingCustomers = DatabaseService.getAll('customers');
        const duplicateEmail = existingCustomers.find(c => 
          c.email.toLowerCase() === customer.email.toLowerCase()
        );

        if (duplicateEmail) {
          throw new Error('Ya existe un cliente con ese email');
        }
      }

      // Check if customer with same tax ID already exists
      if (customer.taxId) {
        const existingCustomers = DatabaseService.getAll('customers');
        const duplicateTaxId = existingCustomers.find(c => 
          c.taxId === customer.taxId
        );

        if (duplicateTaxId) {
          throw new Error('Ya existe un cliente con ese CUIT/CUIL');
        }
      }

      const savedCustomer = DatabaseService.insert('customers', customer.toJSON());
      return Customer.fromJSON(savedCustomer);
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  static async updateCustomer(id, updateData) {
    try {
      const existingCustomer = DatabaseService.getById('customers', id);
      if (!existingCustomer) {
        throw new Error('Cliente no encontrado');
      }

      // Create updated customer
      const updatedCustomerData = { ...existingCustomer, ...updateData, id };
      const customer = new Customer(updatedCustomerData);
      const validation = customer.validate();

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check for duplicate email (excluding current customer)
      if (updateData.email) {
        const existingCustomers = DatabaseService.getAll('customers');
        const duplicateEmail = existingCustomers.find(c => 
          c.id !== id && c.email.toLowerCase() === customer.email.toLowerCase()
        );

        if (duplicateEmail) {
          throw new Error('Ya existe un cliente con ese email');
        }
      }

      // Check for duplicate tax ID (excluding current customer)
      if (updateData.taxId) {
        const existingCustomers = DatabaseService.getAll('customers');
        const duplicateTaxId = existingCustomers.find(c => 
          c.id !== id && c.taxId === customer.taxId
        );

        if (duplicateTaxId) {
          throw new Error('Ya existe un cliente con ese CUIT/CUIL');
        }
      }

      customer.updatedAt = new Date().toISOString();
      const savedCustomer = DatabaseService.update('customers', id, customer.toJSON());
      return Customer.fromJSON(savedCustomer);
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  static async deleteCustomer(id) {
    try {
      const existingCustomer = DatabaseService.getById('customers', id);
      if (!existingCustomer) {
        throw new Error('Cliente no encontrado');
      }

      // Check if customer is used in any sales
      const sales = DatabaseService.getAll('sales');
      const customerInUse = sales.some(sale => sale.customerId === id);

      if (customerInUse) {
        throw new Error('No se puede eliminar el cliente porque tiene ventas asociadas');
      }

      const deletedCustomer = DatabaseService.delete('customers', id);
      return Customer.fromJSON(deletedCustomer);
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  static async searchCustomers(query) {
    try {
      const customers = DatabaseService.search('customers', query);
      return customers.map(data => Customer.fromJSON(data));
    } catch (error) {
      console.error('Error searching customers:', error);
      throw new Error('Error al buscar clientes');
    }
  }

  static async getCustomerSales(customerId) {
    try {
      const customer = DatabaseService.getById('customers', customerId);
      if (!customer) {
        throw new Error('Cliente no encontrado');
      }

      const sales = DatabaseService.getAll('sales');
      const customerSales = sales.filter(sale => sale.customerId === customerId);
      
      return customerSales;
    } catch (error) {
      console.error('Error getting customer sales:', error);
      throw new Error('Error al obtener las ventas del cliente');
    }
  }

  static async getCustomerStats(customerId) {
    try {
      const customer = DatabaseService.getById('customers', customerId);
      if (!customer) {
        throw new Error('Cliente no encontrado');
      }

      const sales = DatabaseService.getAll('sales');
      const customerSales = sales.filter(sale => sale.customerId === customerId);
      
      const totalSales = customerSales.length;
      const totalAmount = customerSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const averageAmount = totalSales > 0 ? totalAmount / totalSales : 0;
      
      const lastSale = customerSales.length > 0 
        ? customerSales.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
        : null;

      return {
        customer: Customer.fromJSON(customer),
        totalSales,
        totalAmount,
        averageAmount,
        lastSale: lastSale ? {
          date: lastSale.date,
          amount: lastSale.totalAmount
        } : null
      };
    } catch (error) {
      console.error('Error getting customer stats:', error);
      throw new Error('Error al obtener estadísticas del cliente');
    }
  }

  static async getTopCustomers(limit = 10) {
    try {
      const customers = DatabaseService.getAll('customers');
      const sales = DatabaseService.getAll('sales');
      
      const customerStats = customers.map(customer => {
        const customerSales = sales.filter(sale => sale.customerId === customer.id);
        const totalAmount = customerSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalSales = customerSales.length;
        
        return {
          ...customer,
          totalAmount,
          totalSales,
          averageAmount: totalSales > 0 ? totalAmount / totalSales : 0
        };
      });

      // Sort by total amount descending
      customerStats.sort((a, b) => b.totalAmount - a.totalAmount);
      
      return customerStats.slice(0, limit).map(data => ({
        customer: Customer.fromJSON(data),
        stats: {
          totalAmount: data.totalAmount,
          totalSales: data.totalSales,
          averageAmount: data.averageAmount
        }
      }));
    } catch (error) {
      console.error('Error getting top customers:', error);
      throw new Error('Error al obtener los mejores clientes');
    }
  }

  static async getCustomersWithoutSales() {
    try {
      const customers = DatabaseService.getAll('customers');
      const sales = DatabaseService.getAll('sales');
      
      const customersWithSales = new Set(sales.map(sale => sale.customerId));
      const customersWithoutSales = customers.filter(customer => 
        !customersWithSales.has(customer.id)
      );
      
      return customersWithoutSales.map(data => Customer.fromJSON(data));
    } catch (error) {
      console.error('Error getting customers without sales:', error);
      throw new Error('Error al obtener clientes sin ventas');
    }
  }
}

module.exports = CustomerController;
