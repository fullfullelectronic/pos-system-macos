class Customer {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.address = data.address || '';
    this.phone = data.phone || '';
    this.email = data.email || '';
    this.taxId = data.taxId || ''; // CUIT/CUIL
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('El nombre del cliente es requerido');
    }

    if (this.name && this.name.length > 100) {
      errors.push('El nombre no puede exceder 100 caracteres');
    }

    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('El email no tiene un formato válido');
    }

    if (this.phone && !this.isValidPhone(this.phone)) {
      errors.push('El teléfono no tiene un formato válido');
    }

    if (this.address && this.address.length > 200) {
      errors.push('La dirección no puede exceder 200 caracteres');
    }

    if (this.taxId && !this.isValidTaxId(this.taxId)) {
      errors.push('El CUIT/CUIL no tiene un formato válido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    // Accept various phone formats
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,20}$/;
    return phoneRegex.test(phone);
  }

  isValidTaxId(taxId) {
    // Basic CUIT/CUIL validation (11 digits)
    const taxIdRegex = /^\d{2}-?\d{8}-?\d{1}$/;
    return taxIdRegex.test(taxId);
  }

  getDisplayName() {
    return this.name || 'Cliente sin nombre';
  }

  getContactInfo() {
    const contact = [];
    if (this.phone) contact.push(`Tel: ${this.phone}`);
    if (this.email) contact.push(`Email: ${this.email}`);
    return contact.join(' | ');
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      address: this.address,
      phone: this.phone,
      email: this.email,
      taxId: this.taxId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data) {
    return new Customer(data);
  }
}

module.exports = Customer;
