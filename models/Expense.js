class Expense {
  constructor(data = {}) {
    this.id = data.id || null;
    this.description = data.description || '';
    this.amount = data.amount || 0;
    this.category = data.category || '';
    this.date = data.date || new Date().toISOString();
    this.paymentMethod = data.paymentMethod || 'cash'; // cash, credit, debit, transfer
    this.reference = data.reference || '';
    this.bankAccountId = data.bankAccountId || null;
    this.isRecurring = data.isRecurring || false;
    this.recurringPeriod = data.recurringPeriod || null; // monthly, weekly, yearly
    this.tags = data.tags || [];
    this.attachments = data.attachments || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (!this.description || this.description.trim().length === 0) {
      errors.push('La descripción del gasto es requerida');
    }

    if (this.description && this.description.length > 200) {
      errors.push('La descripción no puede exceder 200 caracteres');
    }

    if (this.amount <= 0) {
      errors.push('El monto debe ser mayor a cero');
    }

    if (!Number.isFinite(this.amount)) {
      errors.push('El monto debe ser un número válido');
    }

    if (this.category && this.category.length > 50) {
      errors.push('La categoría no puede exceder 50 caracteres');
    }

    if (!this.paymentMethod || !['cash', 'credit', 'debit', 'transfer'].includes(this.paymentMethod)) {
      errors.push('Método de pago inválido');
    }

    if (this.paymentMethod !== 'cash' && (!this.reference || this.reference.trim().length === 0)) {
      errors.push('La referencia es requerida para pagos no efectivo');
    }

    if (!this.date || isNaN(new Date(this.date).getTime())) {
      errors.push('Fecha inválida');
    }

    if (this.isRecurring && !this.recurringPeriod) {
      errors.push('El período de recurrencia es requerido para gastos recurrentes');
    }

    if (this.recurringPeriod && !['monthly', 'weekly', 'yearly'].includes(this.recurringPeriod)) {
      errors.push('Período de recurrencia inválido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getPaymentMethodDisplayName() {
    const methodNames = {
      cash: 'Efectivo',
      credit: 'Tarjeta de Crédito',
      debit: 'Tarjeta de Débito',
      transfer: 'Transferencia'
    };
    return methodNames[this.paymentMethod] || this.paymentMethod;
  }

  getFormattedAmount() {
    return `$ ${this.amount.toFixed(2)}`;
  }

  getFormattedDate() {
    return new Date(this.date).toLocaleDateString('es-AR');
  }

  addTag(tag) {
    if (tag && !this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date().toISOString();
    }
  }

  removeTag(tag) {
    const index = this.tags.indexOf(tag);
    if (index !== -1) {
      this.tags.splice(index, 1);
      this.updatedAt = new Date().toISOString();
    }
  }

  addAttachment(attachment) {
    if (attachment && attachment.name && attachment.path) {
      this.attachments.push({
        name: attachment.name,
        path: attachment.path,
        size: attachment.size || 0,
        type: attachment.type || '',
        uploadedAt: new Date().toISOString()
      });
      this.updatedAt = new Date().toISOString();
    }
  }

  removeAttachment(attachmentName) {
    const index = this.attachments.findIndex(att => att.name === attachmentName);
    if (index !== -1) {
      const removed = this.attachments.splice(index, 1)[0];
      this.updatedAt = new Date().toISOString();
      return removed;
    }
    return null;
  }

  isInDateRange(startDate, endDate) {
    const expenseDate = new Date(this.date);
    return expenseDate >= startDate && expenseDate <= endDate;
  }

  getRecurringDisplayName() {
    if (!this.isRecurring) return 'No recurrente';
    
    const periodNames = {
      weekly: 'Semanal',
      monthly: 'Mensual',
      yearly: 'Anual'
    };
    return periodNames[this.recurringPeriod] || this.recurringPeriod;
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      amount: this.amount,
      category: this.category,
      date: this.date,
      paymentMethod: this.paymentMethod,
      reference: this.reference,
      bankAccountId: this.bankAccountId,
      isRecurring: this.isRecurring,
      recurringPeriod: this.recurringPeriod,
      tags: this.tags,
      attachments: this.attachments,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data) {
    return new Expense(data);
  }

  static getDefaultCategories() {
    return [
      'Alquiler',
      'Servicios',
      'Sueldos',
      'Impuestos',
      'Materiales',
      'Marketing',
      'Transporte',
      'Mantenimiento',
      'Seguros',
      'Otros'
    ];
  }
}

module.exports = Expense;
