class BankAccount {
  constructor(data = {}) {
    this.id = data.id || null;
    this.bankName = data.bankName || '';
    this.accountNumber = data.accountNumber || '';
    this.accountType = data.accountType || 'checking'; // checking, savings, credit
    this.balance = data.balance || 0;
    this.currency = data.currency || 'ARS';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.description = data.description || '';
    this.contactInfo = data.contactInfo || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (!this.bankName || this.bankName.trim().length === 0) {
      errors.push('El nombre del banco es requerido');
    }

    if (this.bankName && this.bankName.length > 100) {
      errors.push('El nombre del banco no puede exceder 100 caracteres');
    }

    if (!this.accountNumber || this.accountNumber.trim().length === 0) {
      errors.push('El número de cuenta es requerido');
    }

    if (this.accountNumber && this.accountNumber.length > 50) {
      errors.push('El número de cuenta no puede exceder 50 caracteres');
    }

    if (!this.accountType || !['checking', 'savings', 'credit'].includes(this.accountType)) {
      errors.push('Tipo de cuenta inválido');
    }

    if (!Number.isFinite(this.balance)) {
      errors.push('El saldo debe ser un número válido');
    }

    if (!this.currency || !['ARS', 'USD'].includes(this.currency)) {
      errors.push('Moneda inválida');
    }

    if (this.description && this.description.length > 200) {
      errors.push('La descripción no puede exceder 200 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  updateBalance(amount, description = '') {
    if (!Number.isFinite(amount)) {
      throw new Error('El monto debe ser un número válido');
    }

    const previousBalance = this.balance;
    this.balance += amount;
    this.updatedAt = new Date().toISOString();

    return {
      previousBalance,
      newBalance: this.balance,
      change: amount,
      description
    };
  }

  deposit(amount, description = 'Depósito') {
    if (amount <= 0) {
      throw new Error('El monto del depósito debe ser mayor a cero');
    }
    return this.updateBalance(amount, description);
  }

  withdraw(amount, description = 'Retiro') {
    if (amount <= 0) {
      throw new Error('El monto del retiro debe ser mayor a cero');
    }
    
    if (this.accountType !== 'credit' && this.balance < amount) {
      throw new Error('Saldo insuficiente');
    }

    return this.updateBalance(-amount, description);
  }

  getAccountTypeDisplayName() {
    const typeNames = {
      checking: 'Cuenta Corriente',
      savings: 'Caja de Ahorro',
      credit: 'Tarjeta de Crédito'
    };
    return typeNames[this.accountType] || this.accountType;
  }

  getFormattedBalance() {
    const symbol = this.currency === 'USD' ? 'US$' : '$';
    const balanceColor = this.balance >= 0 ? 'positive' : 'negative';
    return {
      formatted: `${symbol} ${Math.abs(this.balance).toFixed(2)}`,
      symbol,
      amount: this.balance,
      color: balanceColor,
      currency: this.currency
    };
  }

  getMaskedAccountNumber() {
    if (this.accountNumber.length <= 4) {
      return this.accountNumber;
    }
    const lastFour = this.accountNumber.slice(-4);
    const masked = '*'.repeat(this.accountNumber.length - 4);
    return masked + lastFour;
  }

  getDisplayName() {
    return `${this.bankName} - ${this.getMaskedAccountNumber()}`;
  }

  isOverdrawn() {
    return this.balance < 0 && this.accountType !== 'credit';
  }

  getCreditAvailable() {
    if (this.accountType === 'credit') {
      // For credit accounts, negative balance means available credit
      return Math.abs(this.balance);
    }
    return 0;
  }

  canWithdraw(amount) {
    if (this.accountType === 'credit') {
      return true; // Credit accounts can go negative
    }
    return this.balance >= amount;
  }

  toJSON() {
    return {
      id: this.id,
      bankName: this.bankName,
      accountNumber: this.accountNumber,
      accountType: this.accountType,
      balance: this.balance,
      currency: this.currency,
      isActive: this.isActive,
      description: this.description,
      contactInfo: this.contactInfo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data) {
    return new BankAccount(data);
  }

  static getAccountTypes() {
    return [
      { value: 'checking', label: 'Cuenta Corriente' },
      { value: 'savings', label: 'Caja de Ahorro' },
      { value: 'credit', label: 'Tarjeta de Crédito' }
    ];
  }
}

module.exports = BankAccount;
