/**
 * products.js - Mobile-First Product Catalog & Menu Management
 * 
 * Features:
 * - Direct Tap-to-Add: Tapping any card/image instantly adds it to the bill counter.
 * - Active Bill Badge: Cards display live count of units currently in the bill.
 * - Simplified Edit Modal: Allows quickly editing the price or deleting the product without touching the name.
 * - Add New Menu: Clean modal to add new items with auto-assigned non-reusable IDs.
 */

(function (window) {
  'use strict';

  const ProductManager = {
    products: [],
    listeners: [],
    editingProductId: null,
    pendingImageBase64: null,
    pendingEditImageBase64: null,

    /**
     * Initialize product manager.
     */
    async init() {
      this.products = window.ShopStorage.getProducts();
      this.bindUIEvents();
      await this.renderMenu();
    },

    /**
     * Subscribe to product catalog changes.
     */
    subscribe(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    },

    /**
     * Notify subscribers.
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
     * Render the product menu grid with mobile-friendly cards.
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

      // Get current quantities from billing manager to display active badges
      const billItems = (window.BillingManager && window.BillingManager.items) || [];
      const billQtyMap = {};
      billItems.forEach(i => { billQtyMap[i.id] = i.quantity; });

      // Build cards with async image resolution
      const cardsHtml = await Promise.all(
        this.products.map(async (product) => {
          const imgSrc = await window.ShopStorage.resolveProductImage(product);
          const inBillQty = billQtyMap[product.id] || 0;
          const isSelected = inBillQty > 0;

          return `
            <div class="product-card ${isSelected ? 'in-bill' : ''}" data-id="${product.id}" tabindex="0" role="button" aria-label="Add ${this.escapeHtml(product.name)} to bill">
              
              <!-- Top bar: Product ID & in-bill count badge -->
              <div class="card-top-row">
                <span class="card-id-tag">#${product.id}</span>
                <span class="card-cart-badge ${inBillQty > 0 ? 'visible' : ''}" id="badge-prod-${product.id}">
                  ✓ ${inBillQty}
                </span>
                <button type="button" class="btn-card-edit" title="Edit price or delete" onclick="event.stopPropagation(); ProductManager.openPriceEditModal(${product.id});" aria-label="Edit price for ${this.escapeHtml(product.name)}">
                  ✎
                </button>
              </div>

              <!-- Product Image (Tapping adds to bill) -->
              <div class="card-image-wrap">
                <img src="${imgSrc}" alt="${this.escapeHtml(product.name)}" loading="lazy" onerror="this.src='images/products/default.svg'">
              </div>

              <!-- Product Details -->
              <div class="card-body">
                <h3 class="product-title">${this.escapeHtml(product.name)}</h3>
                <div class="product-price-row">
                  <span class="product-price">${currency}${parseFloat(product.price).toFixed(2)}</span>
                </div>
              </div>

              <!-- Touch-friendly Add / Increment indicator -->
              <div class="card-tap-cue">
                <span class="tap-icon">+</span> Tap to Add
              </div>
            </div>
          `;
        })
      );

      container.innerHTML = cardsHtml.join('');

      // Add direct tap handler to cards
      container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = parseInt(card.dataset.id, 10);
          if (id) {
            ProductManager.handleCardTap(card, id);
          }
        });
      });
    },

    /**
     * Handles tapping a card: visual tactile feedback & instant bill increment.
     */
    handleCardTap(cardEl, productId) {
      // Tactile animation
      cardEl.classList.remove('tap-pulse');
      void cardEl.offsetWidth; // Trigger reflow
      cardEl.classList.add('tap-pulse');

      // Gentle haptic feedback on supported mobile devices
      if (typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(25); } catch (e) {}
      }

      // Add directly to bill counter
      if (window.BillingManager) {
        window.BillingManager.addOne(productId);
      }
    },

    /**
     * Update active badges on menu cards without re-rendering whole grid.
     */
    syncBillBadges(billItems) {
      const billQtyMap = {};
      billItems.forEach(i => { billQtyMap[i.id] = i.quantity; });

      this.products.forEach(p => {
        const badge = document.getElementById(`badge-prod-${p.id}`);
        const card = document.querySelector(`.product-card[data-id="${p.id}"]`);
        const qty = billQtyMap[p.id] || 0;

        if (badge) {
          if (qty > 0) {
            badge.textContent = `✓ ${qty}`;
            badge.classList.add('visible');
          } else {
            badge.classList.remove('visible');
          }
        }

        if (card) {
          if (qty > 0) {
            card.classList.add('in-bill');
          } else {
            card.classList.remove('in-bill');
          }
        }
      });
    },

    /**
     * SIMPLIFIED EDIT MODAL:
     * Product name is fixed. Allows editing the PRICE, changing/replacing the PHOTO, or DELETING.
     */
    async openPriceEditModal(productId) {
      const product = window.ShopStorage.getProductById(productId);
      if (!product) return;

      this.editingProductId = productId;
      this.pendingEditImageBase64 = null;

      const modal = document.getElementById('price-edit-modal');
      const nameDisplay = document.getElementById('price-edit-prod-name');
      const idDisplay = document.getElementById('price-edit-prod-id');
      const priceInput = document.getElementById('price-edit-input');
      const imgPreview = document.getElementById('price-edit-img-preview');
      const imgInput = document.getElementById('price-edit-img-file');

      if (!modal) return;

      if (nameDisplay) nameDisplay.textContent = product.name;
      if (idDisplay) idDisplay.textContent = `#${product.id}`;
      if (priceInput) {
        priceInput.value = parseFloat(product.price).toFixed(2);
      }
      if (imgInput) {
        imgInput.value = '';
      }
      if (imgPreview) {
        const resolvedSrc = await window.ShopStorage.resolveProductImage(product);
        imgPreview.src = resolvedSrc || window.ShopStorage.DEFAULT_IMAGE;
      }

      modal.classList.add('active');
      if (priceInput) {
        priceInput.focus();
        priceInput.select();
      }
    },

    /**
     * Close the simplified price & photo edit modal.
     */
    closePriceEditModal() {
      const modal = document.getElementById('price-edit-modal');
      if (modal) modal.classList.remove('active');
      this.editingProductId = null;
      this.pendingEditImageBase64 = null;
      const imgInput = document.getElementById('price-edit-img-file');
      if (imgInput) imgInput.value = '';
    },

    /**
     * Handle custom photo replacement upload in edit modal.
     */
    handleEditImageUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please choose a valid image (PNG, JPG, SVG, WebP).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Scale to max 350x350 for fast mobile memory
          const maxDim = 350;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          this.pendingEditImageBase64 = compressed;

          const preview = document.getElementById('price-edit-img-preview');
          if (preview) preview.src = compressed;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    /**
     * Save updated price & photo from edit modal (name remains strictly fixed).
     */
    async savePriceEdit(event) {
      if (event) event.preventDefault();
      if (!this.editingProductId) return;

      const priceInput = document.getElementById('price-edit-input');
      const newPrice = parseFloat(priceInput.value);

      if (isNaN(newPrice) || newPrice < 0) {
        alert('Please enter a valid price (₹ 0 or greater).');
        if (priceInput) priceInput.focus();
        return;
      }

      const products = window.ShopStorage.getProducts();
      const product = products.find(p => p.id === this.editingProductId);
      if (!product) return;

      product.price = newPrice;

      if (this.pendingEditImageBase64) {
        const key = await window.ShopStorage.saveProductImage(product.id, this.pendingEditImageBase64);
        product.customImageKey = key;
      }

      window.ShopStorage.saveProducts(products);

      this.closePriceEditModal();
      await this.renderMenu();
      this.notify();

      if (window.BillingManager) {
        window.BillingManager.showToast('Product updated successfully!');
      }
    },

    /**
     * Delete product from simplified edit modal.
     */
    async deleteFromEditModal() {
      if (!this.editingProductId) return;
      const id = this.editingProductId;
      this.closePriceEditModal();
      await this.confirmDelete(id);
    },

    /**
     * Open modal to add a brand new product to the menu.
     */
    openAddModal() {
      this.pendingImageBase64 = null;

      const modal = document.getElementById('product-modal');
      const form = document.getElementById('product-form');
      const preview = document.getElementById('modal-image-preview');
      const nextIdSpan = document.getElementById('next-id-hint');

      if (!modal || !form) return;

      form.reset();
      preview.src = window.ShopStorage.DEFAULT_IMAGE;

      const nameTeInput = document.getElementById('prod-name-te');
      if (nameTeInput) {
        nameTeInput.value = '';
        nameTeInput._manuallyEdited = false;
      }

      const nextId = window.ShopStorage.peekNextBillNumber ? 
        (parseInt(localStorage.getItem('shop_billing_next_product_id'), 10) || 106) : 106;
      if (nextIdSpan) {
        nextIdSpan.textContent = `Auto-assigned ID: #${nextId}`;
      }

      modal.classList.add('active');
      const nameInput = document.getElementById('prod-name');
      if (nameInput) nameInput.focus();
    },

    /**
     * Close the Add Product modal.
     */
    closeModal() {
      const modal = document.getElementById('product-modal');
      if (modal) modal.classList.remove('active');
      this.pendingImageBase64 = null;
    },

    /**
     * Handle custom image file upload.
     */
    handleImageUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please choose a valid image (PNG, JPG, SVG, WebP).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Scale to max 350x350 for fast mobile memory
          const maxDim = 350;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          this.pendingImageBase64 = compressed;

          const preview = document.getElementById('modal-image-preview');
          if (preview) preview.src = compressed;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    /**
     * Save new product form.
     */
    async saveProductForm(event) {
      event.preventDefault();

      const nameInput = document.getElementById('prod-name');
      const nameTeInput = document.getElementById('prod-name-te');
      const priceInput = document.getElementById('prod-price');

      const name = nameInput.value.trim();
      const nameTe = (nameTeInput && nameTeInput.value.trim()) || (window.toTelugu ? window.toTelugu(name) : name);
      const price = parseFloat(priceInput.value);

      if (!name) {
        alert('Please enter a product name.');
        nameInput.focus();
        return;
      }

      if (isNaN(price) || price < 0) {
        alert('Please enter a valid price.');
        priceInput.focus();
        return;
      }

      const products = window.ShopStorage.getProducts();
      const newId = window.ShopStorage.getNextProductId();

      const newProduct = {
        id: newId,
        name: name,
        nameTe: nameTe,
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

      this.closeModal();
      await this.renderMenu();
      this.notify();

      if (window.BillingManager) {
        window.BillingManager.showToast(`Product #${newId} "${name}" added to menu!`);
      }
    },

    /**
     * Delete product with confirmation.
     */
    async confirmDelete(productId) {
      const product = window.ShopStorage.getProductById(productId);
      if (!product) return;

      const confirmed = window.confirm(
        `Delete Product #${product.id} ("${product.name}")?\n\nThis product ID will be permanently retired and never reused.`
      );

      if (!confirmed) return;

      const products = window.ShopStorage.getProducts().filter(p => p.id !== productId);
      await window.ShopStorage.removeProductImage(product);
      window.ShopStorage.saveProducts(products);

      // Also remove from current bill if present
      if (window.BillingManager) {
        window.BillingManager.removeItem(productId);
      }

      await this.renderMenu();
      this.notify();

      if (window.BillingManager) {
        window.BillingManager.showToast(`Product #${product.id} deleted.`);
      }
    },

    /**
     * Bind form listeners and shortcut keys.
     */
    bindUIEvents() {
      // Add product form
      const form = document.getElementById('product-form');
      if (form) {
        form.addEventListener('submit', (e) => this.saveProductForm(e));
      }

      // Live Telugu auto-conversion when typing English name
      const nameInput = document.getElementById('prod-name');
      const nameTeInput = document.getElementById('prod-name-te');
      if (nameInput && nameTeInput) {
        nameInput.addEventListener('input', () => {
          if (window.toTelugu && !nameTeInput._manuallyEdited) {
            nameTeInput.value = window.toTelugu(nameInput.value);
          }
        });
        nameTeInput.addEventListener('input', () => {
          nameTeInput._manuallyEdited = true;
        });
      }

      // Simplified price edit form
      const priceForm = document.getElementById('price-edit-form');
      if (priceForm) {
        priceForm.addEventListener('submit', (e) => this.savePriceEdit(e));
      }

      const priceCancelBtn = document.getElementById('price-edit-cancel-btn');
      if (priceCancelBtn) {
        priceCancelBtn.addEventListener('click', () => this.closePriceEditModal());
      }

      const priceDeleteBtn = document.getElementById('price-edit-delete-btn');
      if (priceDeleteBtn) {
        priceDeleteBtn.addEventListener('click', () => this.deleteFromEditModal());
      }

      // Change photo in edit modal
      const priceEditImgFile = document.getElementById('price-edit-img-file');
      if (priceEditImgFile) {
        priceEditImgFile.addEventListener('change', (e) => this.handleEditImageUpload(e));
      }

      // File upload
      const imageInput = document.getElementById('prod-image-file');
      if (imageInput) {
        imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
      }

      // Close modal on escape
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeModal();
          this.closePriceEditModal();
        }
      });
    },

    /**
     * Escape raw text.
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
