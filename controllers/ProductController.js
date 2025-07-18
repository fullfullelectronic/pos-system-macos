const Product = require('../models/Product');
const DatabaseService = require('../services/DatabaseService');

class ProductController {
  static async getAllProducts() {
    try {
      const productsData = DatabaseService.getAll('products');
      return productsData.map(data => Product.fromJSON(data));
    } catch (error) {
      console.error('Error getting all products:', error);
      throw new Error('Error al obtener los productos');
    }
  }

  static async getProductById(id) {
    try {
      const productData = DatabaseService.getById('products', id);
      return productData ? Product.fromJSON(productData) : null;
    } catch (error) {
      console.error('Error getting product by ID:', error);
      throw new Error('Error al obtener el producto');
    }
  }

  static async createProduct(productData) {
    try {
      const product = new Product(productData);
      const validation = product.validate();

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if product with same name already exists
      const existingProducts = DatabaseService.getAll('products');
      const duplicateName = existingProducts.find(p => 
        p.name.toLowerCase() === product.name.toLowerCase()
      );

      if (duplicateName) {
        throw new Error('Ya existe un producto con ese nombre');
      }

      // Check if barcode already exists (if provided)
      if (product.barcode) {
        const duplicateBarcode = existingProducts.find(p => 
          p.barcode === product.barcode
        );

        if (duplicateBarcode) {
          throw new Error('Ya existe un producto con ese código de barras');
        }
      }

      const savedProduct = DatabaseService.insert('products', product.toJSON());
      return Product.fromJSON(savedProduct);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  static async updateProduct(id, updateData) {
    try {
      const existingProduct = DatabaseService.getById('products', id);
      if (!existingProduct) {
        throw new Error('Producto no encontrado');
      }

      // Create updated product
      const updatedProductData = { ...existingProduct, ...updateData, id };
      const product = new Product(updatedProductData);
      const validation = product.validate();

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check for duplicate name (excluding current product)
      if (updateData.name) {
        const existingProducts = DatabaseService.getAll('products');
        const duplicateName = existingProducts.find(p => 
          p.id !== id && p.name.toLowerCase() === product.name.toLowerCase()
        );

        if (duplicateName) {
          throw new Error('Ya existe un producto con ese nombre');
        }
      }

      // Check for duplicate barcode (excluding current product)
      if (updateData.barcode) {
        const existingProducts = DatabaseService.getAll('products');
        const duplicateBarcode = existingProducts.find(p => 
          p.id !== id && p.barcode === product.barcode
        );

        if (duplicateBarcode) {
          throw new Error('Ya existe un producto con ese código de barras');
        }
      }

      product.updatedAt = new Date().toISOString();
      const savedProduct = DatabaseService.update('products', id, product.toJSON());
      return Product.fromJSON(savedProduct);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  static async deleteProduct(id) {
    try {
      const existingProduct = DatabaseService.getById('products', id);
      if (!existingProduct) {
        throw new Error('Producto no encontrado');
      }

      // Check if product is used in any sales
      const sales = DatabaseService.getAll('sales');
      const productInUse = sales.some(sale => 
        sale.products.some(p => p.productId === id)
      );

      if (productInUse) {
        throw new Error('No se puede eliminar el producto porque está siendo usado en ventas');
      }

      const deletedProduct = DatabaseService.delete('products', id);
      return Product.fromJSON(deletedProduct);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  static async searchProducts(query) {
    try {
      const products = DatabaseService.search('products', query);
      return products.map(data => Product.fromJSON(data));
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Error al buscar productos');
    }
  }

  static async updateStock(id, quantity) {
    try {
      const productData = DatabaseService.getById('products', id);
      if (!productData) {
        throw new Error('Producto no encontrado');
      }

      const product = Product.fromJSON(productData);
      product.updateStock(quantity);

      const savedProduct = DatabaseService.update('products', id, product.toJSON());
      return Product.fromJSON(savedProduct);
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  static async getLowStockProducts(threshold = null) {
    try {
      const config = DatabaseService.getConfig();
      const stockThreshold = threshold || config.lowStockThreshold || 10;
      
      const products = DatabaseService.getAll('products');
      const lowStockProducts = products.filter(p => p.stock <= stockThreshold);
      
      return lowStockProducts.map(data => Product.fromJSON(data));
    } catch (error) {
      console.error('Error getting low stock products:', error);
      throw new Error('Error al obtener productos con stock bajo');
    }
  }

  static async getProductsByCategory(category) {
    try {
      const products = DatabaseService.getAll('products');
      const categoryProducts = products.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
      
      return categoryProducts.map(data => Product.fromJSON(data));
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw new Error('Error al obtener productos por categoría');
    }
  }

  static async getCategories() {
    try {
      const products = DatabaseService.getAll('products');
      const categories = [...new Set(products.map(p => p.category).filter(c => c))];
      return categories.sort();
    } catch (error) {
      console.error('Error getting categories:', error);
      throw new Error('Error al obtener categorías');
    }
  }
}

module.exports = ProductController;
