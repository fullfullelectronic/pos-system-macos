class FinancialMovement {
  constructor(data = {}) {
    this.id = data.id || null;
    this.type = data.type || 'income'; // income, expense, transfer
    this.amount = data.amount || 0;
    this.description = data.description || '';
    this.date = data.date || new Date().toISOString();
    this.relatedAccountId = data.relatedAccountId || null;
    this.relatedEntityType = data.relatedEntityType || null; // sale, expense, transfer
    this.relatedEntityId = data.relatedEntityId || null;
    this.category = data.category || '';
    this.reference = data.reference || '';
    this.balance = data.balance || 0; // Account balance after this movement
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (!this.type || !['income', 'expense', 'transfer'].includes(this.type)) {
      errors.push('Tipo de movimiento inválido');
    }

    if (this.amount <= 0) {
      errors.push('El monto debe ser mayor a cero');
    }

    if (!Number.isFinite(this.amount)) {
      errors.push('El monto debe ser un número válido');
    }

    if (!this.description || this.description.trim().length === 0) {
      errors.push('La descripción es requerida');
    }

    if (this.description && this.description.length > 200) {
      errors.push('La descripción no puede exceder 200 caracteres');
    }

    if (!this.date || isNaN(new Date(this.date).getTime())) {
      errors.push('Fecha inválida');
    }

    if (!this.relatedAccountId) {
      errors.push('La cuenta relacionada es requerida');
    }

    if (this.category && this.category.length > 50) {
      errors.push('La categoría no puede exceder 50 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getTypeDisplayName() {
    const typeNames = {
      income: 'Ingreso',
      expense: 'Egreso',
      transfer: 'Transferencia'
    };
    return typeNames[this.type] || this.type;
  }

  getFormattedAmount() {
    const sign = this.type === 'expense' ? '-' : '+';
    return `${sign} $ ${this.amount.toFixed(2)}`;
  }

  getFormattedDate() {
    return new Date(this.date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFormattedBalance() {
    return `$ ${this.balance.toFixed(2)}`;
  }

  isIncome() {
    return this.type === 'income';
  }

  isExpense() {
    return this.type === 'expense';
  }

  isTransfer() {
    return this.type === 'transfer';
  }

  isInDateRange(startDate, endDate) {
    const movementDate = new Date(this.date);
    return movementDate >= startDate && movementDate <= endDate;
  }

  getRelatedEntityDisplayName() {
    if (!this.relatedEntityType) return '';
    
    const entityNames = {
      sale: 'Venta',
      expense: 'Gasto',
      transfer: 'Transferencia'
    };
    
    const entityName = entityNames[this.relatedEntityType] || this.relatedEntityType;
    return this.relatedEntityId ? `${entityName} #${this.relatedEntityId}` : entityName;
  }

  getCategoryColor() {
    // Return color based on category for UI styling
    const categoryColors = {
      'Ventas': '#28a745',
      'Gastos': '#dc3545',
      'Transferencias': '#007bff',
      'Depósitos': '#17a2b8',
      'Retiros': '#fd7e14'
    };
    
    return categoryColors[this.category] || '#6c757d';
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      amount: this.amount,
      description: this.description,
      date: this.date,
      relatedAccountId: this.relatedAccountId,
      relatedEntityType: this.relatedEntityType,
      relatedEntityId: this.relatedEntityId,
      category: this.category,
      reference: this.reference,
      balance: this.balance,
      createdAt: this.createdAt
    };
  }

  static fromJSON(data) {
    return new FinancialMovement(data);
  }

  static getMovementTypes() {
    return [
      { value: 'income', label: 'Ingreso', color: '#28a745' },
      { value: 'expense', label: 'Egreso', color: '#dc3545' },
      { value: 'transfer', label: 'Transferencia', color: '#007bff' }
    ];
  }

  static getDefaultCategories() {
    return {
      income: [
        'Ventas',
        'Servicios',
        'Intereses',
        'Otros Ingresos'
      ],
      expense: [
        'Gastos Operativos',
        'Sueldos',
        'Impuestos',
        'Servicios',
        'Alquiler',
        'Otros Gastos'
      ],
      transfer: [
        'Transferencia Entre Cuentas',
        'Depósito',
        'Retiro'
      ]
    };
  }
}

module.exports = FinancialMovement;
