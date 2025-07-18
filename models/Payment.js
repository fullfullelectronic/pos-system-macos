class Payment {
  constructor(data = {}) {
    this.id = data.id || null;
    this.type = data.type || 'cash'; // cash, credit, debit, transfer
    this.amount = data.amount || 0;
    this.currency = data.currency || 'ARS'; // ARS, USD
    this.exchangeRate = data.exchangeRate || 1;
    this.amountInARS = data.amountInARS || 0;
    this.reference = data.reference || ''; // For card payments, transfer reference, etc.
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (!this.type || !['cash', 'credit', 'debit', 'transfer'].includes(this.type)) {
      errors.push('Tipo de pago inválido');
    }

    if (this.amount <= 0) {
      errors.push('El monto debe ser mayor a cero');
    }

    if (!Number.isFinite(this.amount)) {
      errors.push('El monto debe ser un número válido');
    }

    if (!this.currency || !['ARS', 'USD'].includes(this.currency)) {
      errors.push('Moneda inválida');
    }

    if (this.exchangeRate <= 0) {
      errors.push('El tipo de cambio debe ser mayor a cero');
    }

    if (this.type !== 'cash' && (!this.reference || this.reference.trim().length === 0)) {
      errors.push('La referencia es requerida para pagos no efectivo');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  calculateAmountInARS() {
    if (this.currency === 'USD') {
      this.amountInARS = this.amount * this.exchangeRate;
    } else {
      this.amountInARS = this.amount;
    }
    return this.amountInARS;
  }

  getTypeDisplayName() {
    const typeNames = {
      cash: 'Efectivo',
      credit: 'Tarjeta de Crédito',
      debit: 'Tarjeta de Débito',
      transfer: 'Transferencia'
    };
    return typeNames[this.type] || this.type;
  }

  getFormattedAmount() {
    const symbol = this.currency === 'USD' ? '$' : '$';
    return `${symbol} ${this.amount.toFixed(2)} ${this.currency}`;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      amount: this.amount,
      currency: this.currency,
      exchangeRate: this.exchangeRate,
      amountInARS: this.amountInARS,
      reference: this.reference,
      createdAt: this.createdAt
    };
  }

  static fromJSON(data) {
    return new Payment(data);
  }
}

module.exports = Payment;
