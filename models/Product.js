class Product {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.description = data.description || '';
    this.price = data.price || 0;
    this.stock = data.stock || 0;
    this.category = data.category || '';
    this.barcode = data.barcode || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('El nombre del producto es requerido');
    }

    if (this.name && this.name.length > 100) {
      errors.push('El nombre del producto no puede exceder 100 caracteres');
    }

    if (this.price < 0) {
      errors.push('El precio no puede ser negativo');
    }

    if (!Number.isFinite(this.price)) {
      errors.push('El precio debe ser un número válido');
    }

    if (this.stock < 0) {
      errors.push('El stock no puede ser negativo');
    }

    if (!Number.isInteger(this.stock)) {
      errors.push('El stock debe ser un número entero');
    }

    if (this.description && this.description.length > 500) {
      errors.push('La descripción no puede exceder 500 caracteres');
    }

    if (this.category && this.category.length > 50) {
      errors.push('La categoría no puede exceder 50 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  updateStock(quantity) {
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      throw new Error('La cantidad debe ser un número entero');
    }

    const newStock = this.stock + quantity;
    if (newStock < 0) {
      throw new Error('Stock insuficiente');
    }

    this.stock = newStock;
    this.updatedAt = new Date().toISOString();
    return this.stock;
  }

  reduceStock(quantity) {
    return this.updateStock(-Math.abs(quantity));
  }

  increaseStock(quantity) {
    return this.updateStock(Math.abs(quantity));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      stock: this.stock,
      category: this.category,
      barcode: this.barcode,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data) {
    return new Product(data);
  }
}

module.exports = Product;
