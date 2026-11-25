/**
 * products.js - Product Catalog & Menu Management
 * 
 * Handles:
 * - Rendering product cards in a responsive, clean grid.
 * - Adding new products with auto-generated unique ID.
 * - Editing product name, price, and image.
 * - Deleting products with confirmation prompt.
 * - Image compression and preview for custom uploads.
 * - Immediate reactivity for billing lookup.
 */

(function (window) {
  'use strict';

  const ProductManager = {
    products: [],
    listeners: [],
    editingProductId: null,
    pendingImageBase64: null,

    /**
     * Initialize product manager.
     */
    async init() {
      this.products = window.ShopStorage.getProducts();
      this.bindUIEvents();
      await this.renderMenu();
    },

    /**
     * Subscribe to product updates.
     * @param {Function} callback 
     */
    subscribe(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    },

    /**
     * Notify all subscribers when products change.
     */
    notify() {
      const all = window.ShopStorage.getProducts();
      this.products = all;
      this.listeners.forEach(cb => cb(all));
    },

    /**
     * Get all active products.
     */
    getAll() {
      return this.products;
    },

    /**
     * Render the product menu grid.
     */
    async renderMenu() {
      const container = document.getElementById('menu-grid');
      const countBadge = document.getElementById('menu-count-badge');
      if (!container) return;

      this.products = window.ShopStorage.getProducts();
      if (countBadge) {
        countBadge.textContent = `${this.products.length} Items`;
      }

      if (this.products.length === 0) {
        container.innerHTML = `
          <div class="empty-menu-state">
            <p>No products in the menu yet.</p>
            <button class="btn btn-primary" onclick="ProductManager.openAddModal()">
              + Add First Product
            </button>
          </div>
        `;
        return;
      }

      const settings = window.ShopStorage.getSettings();
      const currency = settings.currencySymbol || '₹';

      // Build cards with async image resolution
      const cardsHtml = await Promise.all(
        this.products.map(async (product) => {
          const imgSrc = await window.ShopStorage.resolveProductImage(product);
          return `
            <div class="product-card" data-id="${product.id}" tabindex="0" title="Click to add ${this.escapeHtml(product.name)} to bill">
              <div class="card-badge">#${product.id}</div>
              <div class="card-image-wrap">
                <img src="${imgSrc}" alt="${this.escapeHtml(product.name)}" loading="lazy" onerror="this.src='images/products/default.svg'">
              </div>
              <div class="card-body">
                <h3 class="product-title">${this.escapeHtml(product.name)}</h3>
                <div class="product-price-row">
                  <span class="product-price">${currency}${parseFloat(product.price).toFixed(2)}</span>
                  <span class="product-unit">/ unit</span>
                </div>
              </div>
              <div class="card-actions">
                <button type="button" class="btn-card-action btn-add-bill" title="Add to current bill" onclick="event.stopPropagation(); ProductManager.quickAddToBill(${product.id});">
                  <span class="icon">+</span> Add to Bill
                </button>
                <div class="btn-group-mini">
                  <button type="button" class="btn-mini edit" title="Edit this item" onclick="event.stopPropagation(); ProductManager.openEditModal(${product.id});">
                    ✎
                  </button>
                  <button type="button" class="btn-mini delete" title="Delete this item" onclick="event.stopPropagation(); ProductManager.confirmDelete(${product.id});">
                    🗑
                  </button>
                </div>
              </div>
            </div>
          `;
        })
      );

      container.innerHTML = cardsHtml.join('');

      // Allow clicking entire card to trigger bill addition
      container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = parseInt(card.dataset.id, 10);
          if (id) {
            ProductManager.quickAddToBill(id);
          }
        });
      });
    },

    /**
     * Quick action to add this product to the current billing session.
     */
    quickAddToBill(productId) {
      if (window.BillingManager) {
        window.BillingManager.selectProductById(productId);
      }
    },

    /**
     * Open modal to add a new product.
     */
    openAddModal() {
      this.editingProductId = null;
      this.pendingImageBase64 = null;

      const modal = document.getElementById('product-modal');
      const title = document.getElementById('product-modal-title');
      const form = document.getElementById('product-form');
      const preview = document.getElementById('modal-image-preview');
      const nextIdSpan = document.getElementById('next-id-hint');

      if (!modal || !form) return;

      form.reset();
      title.textContent = 'Add New Menu Item';
      preview.src = window.ShopStorage.DEFAULT_IMAGE;
      
      const peekId = window.ShopStorage.peekNextBillNumber ? 
        (parseInt(localStorage.getItem('shop_billing_next_product_id'), 10) || 106) : 106;
      if (nextIdSpan) {
        nextIdSpan.textContent = `Auto-assigned ID: #${peekId}`;
      }

      modal.classList.add('active');
      document.getElementById('prod-name').focus();
    },

    /**
     * Open modal to edit existing product.
     */
    async openEditModal(productId) {
      const product = window.ShopStorage.getProductById(productId);
      if (!product) {
        alert('Product not found.');
        return;
      }

      this.editingProductId = productId;
      this.pendingImageBase64 = null;

      const modal = document.getElementById('product-modal');
      const title = document.getElementById('product-modal-title');
      const nameInput = document.getElementById('prod-name');
      const priceInput = document.getElementById('prod-price');
      const preview = document.getElementById('modal-image-preview');
      const nextIdSpan = document.getElementById('next-id-hint');

      title.textContent = `Edit Product #${product.id}`;
      nameInput.value = product.name;
      priceInput.value = parseFloat(product.price).toFixed(2);
      if (nextIdSpan) {
        nextIdSpan.textContent = `Product ID: #${product.id} (Permanent)`;
      }

      const currentImg = await window.ShopStorage.resolveProductImage(product);
      preview.src = currentImg;

      modal.classList.add('active');
      nameInput.focus();
    },

    /**
     * Close modal.
     */
    closeModal() {
      const modal = document.getElementById('product-modal');
      if (modal) modal.classList.remove('active');
      this.editingProductId = null;
      this.pendingImageBase64 = null;
    },

    /**
     * Handle image file selection & optimize it via canvas.
     */
    handleImageUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please choose a valid image file (PNG, JPG, SVG, WebP).');
        return;
      }

      // Max file size 5MB before downscaling
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file is too large (max 5MB).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Scale image down to max 400x400 to keep it very fast and lightweight
          const maxDim = 400;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Use WebP/JPEG quality 0.85
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          this.pendingImageBase64 = compressedDataUrl;

          const preview = document.getElementById('modal-image-preview');
          if (preview) preview.src = compressedDataUrl;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    /**
     * Save product from form (New or Edit).
     */
    async saveProductForm(event) {
      event.preventDefault();

      const nameInput = document.getElementById('prod-name');
      const priceInput = document.getElementById('prod-price');

      const name = nameInput.value.trim();
      const price = parseFloat(priceInput.value);

      // Validation
      if (!name) {
        alert('Please enter a product name.');
        nameInput.focus();
        return;
      }

      if (isNaN(price) || price < 0) {
        alert('Please enter a valid price (zero or greater).');
        priceInput.focus();
        return;
      }

      const products = window.ShopStorage.getProducts();

      if (this.editingProductId) {
        // Edit existing product
        const index = products.findIndex(p => p.id === this.editingProductId);
        if (index === -1) {
          alert('Error: Product no longer exists.');
          return;
        }

        const product = products[index];
        product.name = name;
        product.price = price;

        if (this.pendingImageBase64) {
          const key = await window.ShopStorage.saveProductImage(product.id, this.pendingImageBase64);
          product.customImageKey = key;
        }

        products[index] = product;
        window.ShopStorage.saveProducts(products);
      } else {
        // Add new product
        const newId = window.ShopStorage.getNextProductId();
        const newProduct = {
          id: newId,
          name: name,
          price: price,
          image: window.ShopStorage.DEFAULT_IMAGE,
          customImageKey: null
        };

        if (this.pendingImageBase64) {
          const key = await window.ShopStorage.saveProductImage(newId, this.pendingImageBase64);
          newProduct.customImageKey = key;
        }

        products.push(newProduct);
        window.ShopStorage.saveProducts(products);
      }

      this.closeModal();
      await this.renderMenu();
      this.notify();
    },

    /**
     * Delete product with explicit confirmation.
     */
    async confirmDelete(productId) {
      const product = window.ShopStorage.getProductById(productId);
      if (!product) return;

      const confirmed = window.confirm(
        `Are you sure you want to delete Product #${product.id}: "${product.name}"?\n\nNote: Deleted product numbers are permanently retired and will never be reused.`
      );

      if (!confirmed) return;

      const products = window.ShopStorage.getProducts().filter(p => p.id !== productId);
      await window.ShopStorage.removeProductImage(product);
      window.ShopStorage.saveProducts(products);

      await this.renderMenu();
      this.notify();
    },

    /**
     * Bind form listeners and shortcut keys.
     */
    bindUIEvents() {
      const form = document.getElementById('product-form');
      if (form) {
        form.addEventListener('submit', (e) => this.saveProductForm(e));
      }

      const imageInput = document.getElementById('prod-image-file');
      if (imageInput) {
        imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
      }

      const cancelBtn = document.getElementById('modal-cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.closeModal());
      }

      // Close modal on escape key or backdrop click
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeModal();
      });

      const modal = document.getElementById('product-modal');
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal();
        });
      }
    },

    /**
     * Escape raw text for HTML injection safety.
     */
    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  window.ProductManager = ProductManager;

})(window);
