const Payment = require('./Payment');

class Sale {
  constructor(data = {}) {
    this.id = data.id || null;
    this.customerId = data.customerId || null;
    this.customerName = data.customerName || '';
    this.products = data.products || []; // Array of {productId, name, quantity, price, subtotal}
    this.payments = data.payments ? data.payments.map(p => new Payment(p)) : [];
    this.subtotal = data.subtotal || 0;
    this.ivaAmount = data.ivaAmount || 0;
    this.totalAmount = data.totalAmount || 0;
    this.ivaApplied = data.ivaApplied || false;
    this.ivaRate = data.ivaRate || 21;
    this.date = data.date || new Date().toISOString();
    this.status = data.status || 'completed'; // completed, cancelled, pending
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (!this.products || this.products.length === 0) {
      errors.push('La venta debe tener al menos un producto');
    }

    if (this.products) {
      this.products.forEach((product, index) => {
        if (!product.productId) {
          errors.push(`Producto ${index + 1}: ID de producto requerido`);
        }
        if (!product.quantity || product.quantity <= 0) {
          errors.push(`Producto ${index + 1}: Cantidad debe ser mayor a cero`);
        }
        if (!product.price || product.price <= 0) {
          errors.push(`Producto ${index + 1}: Precio debe ser mayor a cero`);
        }
      });
    }

    if (!this.payments || this.payments.length === 0) {
      errors.push('La venta debe tener al menos un pago');
    }

    if (this.payments) {
      this.payments.forEach((payment, index) => {
        const paymentValidation = payment.validate();
        if (!paymentValidation.isValid) {
          paymentValidation.errors.forEach(error => {
            errors.push(`Pago ${index + 1}: ${error}`);
          });
        }
      });
    }

    // Validate payment total matches sale total
    const totalPaid = this.getTotalPaid();
    if (Math.abs(totalPaid - this.totalAmount) > 0.01) {
      errors.push('El total de pagos no coincide con el total de la venta');
    }

    if (this.totalAmount <= 0) {
      errors.push('El total de la venta debe ser mayor a cero');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  calculateTotals(ivaEnabled = false, ivaRate = 21) {
    // Calculate subtotal from products
    this.subtotal = this.products.reduce((total, product) => {
      product.subtotal = product.quantity * product.price;
      return total + product.subtotal;
    }, 0);

    // Calculate IVA
    if (ivaEnabled) {
      this.ivaApplied = true;
      this.ivaRate = ivaRate;
      this.ivaAmount = this.subtotal * (ivaRate / 100);
    } else {
      this.ivaApplied = false;
      this.ivaAmount = 0;
    }

    // Calculate total
    this.totalAmount = this.subtotal + this.ivaAmount;
    this.updatedAt = new Date().toISOString();

    return {
      subtotal: this.subtotal,
      ivaAmount: this.ivaAmount,
      totalAmount: this.totalAmount
    };
  }

  addProduct(productData) {
    const product = {
      productId: productData.productId,
      name: productData.name,
      quantity: productData.quantity,
      price: productData.price,
      subtotal: productData.quantity * productData.price
    };

    this.products.push(product);
    return product;
  }

  removeProduct(productId) {
    const index = this.products.findIndex(p => p.productId === productId);
    if (index !== -1) {
      return this.products.splice(index, 1)[0];
    }
    return null;
  }

  addPayment(paymentData) {
    const payment = new Payment(paymentData);
    const validation = payment.validate();
    
    if (!validation.isValid) {
      throw new Error(`Pago inválido: ${validation.errors.join(', ')}`);
    }

    payment.calculateAmountInARS();
    this.payments.push(payment);
    return payment;
  }

  removePayment(paymentId) {
    const index = this.payments.findIndex(p => p.id === paymentId);
    if (index !== -1) {
      return this.payments.splice(index, 1)[0];
    }
    return null;
  }

  getTotalPaid() {
    return this.payments.reduce((total, payment) => {
      return total + payment.amountInARS;
    }, 0);
  }

  getChange() {
    const totalPaid = this.getTotalPaid();
    return Math.max(0, totalPaid - this.totalAmount);
  }

  isFullyPaid() {
    const totalPaid = this.getTotalPaid();
    return totalPaid >= this.totalAmount;
  }

  getPaymentSummary() {
    const summary = {};
    this.payments.forEach(payment => {
      const type = payment.getTypeDisplayName();
      if (!summary[type]) {
        summary[type] = 0;
      }
      summary[type] += payment.amountInARS;
    });
    return summary;
  }

  toJSON() {
    return {
      id: this.id,
      customerId: this.customerId,
      customerName: this.customerName,
      products: this.products,
      payments: this.payments.map(p => p.toJSON()),
      subtotal: this.subtotal,
      ivaAmount: this.ivaAmount,
      totalAmount: this.totalAmount,
      ivaApplied: this.ivaApplied,
      ivaRate: this.ivaRate,
      date: this.date,
      status: this.status,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data) {
    return new Sale(data);
  }
}

module.exports = Sale;
