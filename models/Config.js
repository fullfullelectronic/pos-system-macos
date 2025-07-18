class Config {
  constructor(data = {}) {
    this.ivaEnabled = data.ivaEnabled !== undefined ? data.ivaEnabled : true;
    this.ivaRate = data.ivaRate || 21;
    this.exchangeRate = data.exchangeRate || 350;
    this.companyName = data.companyName || 'Mi Empresa';
    this.companyAddress = data.companyAddress || '';
    this.companyPhone = data.companyPhone || '';
    this.companyEmail = data.companyEmail || '';
    this.companyCuit = data.companyCuit || '';
    this.defaultBankAccountId = data.defaultBankAccountId || null;
    this.autoSaveEnabled = data.autoSaveEnabled !== undefined ? data.autoSaveEnabled : true;
    this.autoSaveInterval = data.autoSaveInterval || 3600000; // 1 hour in milliseconds
    this.currency = data.currency || 'ARS';
    this.dateFormat = data.dateFormat || 'DD/MM/YYYY';
    this.timeFormat = data.timeFormat || '24h';
    this.theme = data.theme || 'light';
    this.language = data.language || 'es';
    this.receiptTemplate = data.receiptTemplate || 'default';
    this.lowStockThreshold = data.lowStockThreshold || 10;
    this.enableNotifications = data.enableNotifications !== undefined ? data.enableNotifications : true;
    this.backupEnabled = data.backupEnabled !== undefined ? data.backupEnabled : true;
    this.backupInterval = data.backupInterval || 86400000; // 24 hours in milliseconds
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (this.ivaRate < 0 || this.ivaRate > 100) {
      errors.push('La tasa de IVA debe estar entre 0 y 100');
    }

    if (this.exchangeRate <= 0) {
      errors.push('El tipo de cambio debe ser mayor a cero');
    }

    if (!this.companyName || this.companyName.trim().length === 0) {
      errors.push('El nombre de la empresa es requerido');
    }

    if (this.companyName && this.companyName.length > 100) {
      errors.push('El nombre de la empresa no puede exceder 100 caracteres');
    }

    if (this.companyEmail && !this.isValidEmail(this.companyEmail)) {
      errors.push('El email de la empresa no tiene un formato válido');
    }

    if (this.companyPhone && !this.isValidPhone(this.companyPhone)) {
      errors.push('El teléfono de la empresa no tiene un formato válido');
    }

    if (this.companyCuit && !this.isValidCuit(this.companyCuit)) {
      errors.push('El CUIT de la empresa no tiene un formato válido');
    }

    if (!['ARS', 'USD'].includes(this.currency)) {
      errors.push('Moneda inválida');
    }

    if (!['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(this.dateFormat)) {
      errors.push('Formato de fecha inválido');
    }

    if (!['12h', '24h'].includes(this.timeFormat)) {
      errors.push('Formato de hora inválido');
    }

    if (!['light', 'dark'].includes(this.theme)) {
      errors.push('Tema inválido');
    }

    if (!['es', 'en'].includes(this.language)) {
      errors.push('Idioma inválido');
    }

    if (this.lowStockThreshold < 0) {
      errors.push('El umbral de stock bajo no puede ser negativo');
    }

    if (this.autoSaveInterval < 60000) { // Minimum 1 minute
      errors.push('El intervalo de guardado automático debe ser al menos 1 minuto');
    }

    if (this.backupInterval < 3600000) { // Minimum 1 hour
      errors.push('El intervalo de respaldo debe ser al menos 1 hora');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toggleIVA() {
    this.ivaEnabled = !this.ivaEnabled;
    this.updatedAt = new Date().toISOString();
    return this.ivaEnabled;
  }

  setExchangeRate(newRate) {
    if (newRate <= 0) {
      throw new Error('El tipo de cambio debe ser mayor a cero');
    }
    this.exchangeRate = newRate;
    this.updatedAt = new Date().toISOString();
    return this.exchangeRate;
  }

  setIVARate(newRate) {
    if (newRate < 0 || newRate > 100) {
      throw new Error('La tasa de IVA debe estar entre 0 y 100');
    }
    this.ivaRate = newRate;
    this.updatedAt = new Date().toISOString();
    return this.ivaRate;
  }

  updateCompanyInfo(info) {
    const allowedFields = [
      'companyName', 'companyAddress', 'companyPhone', 
      'companyEmail', 'companyCuit'
    ];
    
    allowedFields.forEach(field => {
      if (info[field] !== undefined) {
        this[field] = info[field];
      }
    });
    
    this.updatedAt = new Date().toISOString();
    return this.getCompanyInfo();
  }

  getCompanyInfo() {
    return {
      name: this.companyName,
      address: this.companyAddress,
      phone: this.companyPhone,
      email: this.companyEmail,
      cuit: this.companyCuit
    };
  }

  convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    if (fromCurrency === 'USD' && toCurrency === 'ARS') {
      return amount * this.exchangeRate;
    }

    if (fromCurrency === 'ARS' && toCurrency === 'USD') {
      return amount / this.exchangeRate;
    }

    throw new Error('Conversión de moneda no soportada');
  }

  formatCurrency(amount, currency = null) {
    const curr = currency || this.currency;
    const symbol = curr === 'USD' ? 'US$' : '$';
    return `${symbol} ${amount.toFixed(2)}`;
  }

  formatDate(date) {
    const d = new Date(date);
    
    switch (this.dateFormat) {
      case 'DD/MM/YYYY':
        return d.toLocaleDateString('es-AR');
      case 'MM/DD/YYYY':
        return d.toLocaleDateString('en-US');
      case 'YYYY-MM-DD':
        return d.toISOString().split('T')[0];
      default:
        return d.toLocaleDateString();
    }
  }

  formatTime(date) {
    const d = new Date(date);
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: this.timeFormat === '12h'
    };
    return d.toLocaleTimeString('es-AR', options);
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,20}$/;
    return phoneRegex.test(phone);
  }

  isValidCuit(cuit) {
    const cuitRegex = /^\d{2}-?\d{8}-?\d{1}$/;
    return cuitRegex.test(cuit);
  }

  toJSON() {
    return {
      ivaEnabled: this.ivaEnabled,
      ivaRate: this.ivaRate,
      exchangeRate: this.exchangeRate,
      companyName: this.companyName,
      companyAddress: this.companyAddress,
      companyPhone: this.companyPhone,
      companyEmail: this.companyEmail,
      companyCuit: this.companyCuit,
      defaultBankAccountId: this.defaultBankAccountId,
      autoSaveEnabled: this.autoSaveEnabled,
      autoSaveInterval: this.autoSaveInterval,
      currency: this.currency,
      dateFormat: this.dateFormat,
      timeFormat: this.timeFormat,
      theme: this.theme,
      language: this.language,
      receiptTemplate: this.receiptTemplate,
      lowStockThreshold: this.lowStockThreshold,
      enableNotifications: this.enableNotifications,
      backupEnabled: this.backupEnabled,
      backupInterval: this.backupInterval,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data) {
    return new Config(data);
  }

  static getDefaultConfig() {
    return new Config();
  }
}

module.exports = Config;
