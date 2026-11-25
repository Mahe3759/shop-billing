/**
 * billing.js - Billing System, Calculations, Receipt Generator & Screenshot Export
 * 
 * Handles:
 * - Product number lookup with auto identification of name & price.
 * - Adding items to bill table with validation.
 * - Subtotal (Qty x Price) and Grand Total calculations.
 * - Quantity modification and item removal.
 * - Bill generation with auto-incremented receipt numbers.
 * - Browser printing with specialized print styles.
 * - Native HTML5 Canvas "Screenshot / Save as Image" receipt export (no external library).
 * - "Reset to Zero" / New customer action.
 */

(function (window) {
  'use strict';

  const BillingManager = {
    // Current bill items: Array of { id, name, price, quantity, subtotal }
    items: [],
    currentBillNumber: null,
    currentBillDate: null,

    /**
     * Initialize billing module.
     */
    init() {
      this.bindEvents();
      this.renderBillTable();
      this.updateCalculations();

      // Listen to product catalog updates
      if (window.ProductManager) {
        window.ProductManager.subscribe(() => {
          this.handleProductCatalogChange();
        });
      }
    },

    /**
     * Binds input listeners, autocomplete, and button clicks.
     */
    bindEvents() {
      const idInput = document.getElementById('bill-product-id');
      const qtyInput = document.getElementById('bill-product-qty');
      const addBtn = document.getElementById('btn-add-to-bill');
      const resetBtn = document.getElementById('btn-reset-bill');
      const generateBtn = document.getElementById('btn-generate-bill');

      // Product number input lookup
      if (idInput) {
        idInput.addEventListener('input', () => this.lookupProduct());
        idInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (qtyInput) qtyInput.focus();
          }
        });
      }

      // Quantity input Enter key submits
      if (qtyInput) {
        qtyInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.addItemFromInputs();
          }
        });
      }

      // Add to bill button
      if (addBtn) {
        addBtn.addEventListener('click', () => this.addItemFromInputs());
      }

      // Reset bill button
      if (resetBtn) {
        resetBtn.addEventListener('click', () => this.confirmResetBill());
      }

      // Generate Bill button
      if (generateBtn) {
        generateBtn.addEventListener('click', () => this.openReceiptModal());
      }

      // Receipt modal actions
      const printBtn = document.getElementById('btn-receipt-print');
      if (printBtn) {
        printBtn.addEventListener('click', () => this.printReceipt());
      }

      const screenshotBtn = document.getElementById('btn-receipt-screenshot');
      if (screenshotBtn) {
        screenshotBtn.addEventListener('click', () => this.downloadReceiptScreenshot());
      }

      const newBillBtn = document.getElementById('btn-receipt-new');
      if (newBillBtn) {
        newBillBtn.addEventListener('click', () => {
          this.closeReceiptModal();
          this.resetBill(true);
        });
      }

      const closeReceiptBtn = document.getElementById('btn-receipt-close');
      if (closeReceiptBtn) {
        closeReceiptBtn.addEventListener('click', () => this.closeReceiptModal());
      }
    },

    /**
     * When user enters a product ID in the input box,
     * immediately lookup and show product name and price.
     */
    lookupProduct() {
      const idInput = document.getElementById('bill-product-id');
      const hint = document.getElementById('product-lookup-hint');
      const addBtn = document.getElementById('btn-add-to-bill');

      if (!idInput || !hint) return null;

      const rawVal = idInput.value.trim();
      if (!rawVal) {
        hint.innerHTML = `<span class="hint-muted">Type Product # (or click from Menu)</span>`;
        if (addBtn) addBtn.disabled = false;
        return null;
      }

      const product = window.ShopStorage.getProductById(rawVal);
      const settings = window.ShopStorage.getSettings();
      const currency = settings.currencySymbol || '₹';

      if (product) {
        hint.innerHTML = `
          <span class="hint-success">
            <strong>${this.escapeHtml(product.name)}</strong> — ${currency}${parseFloat(product.price).toFixed(2)}
          </span>
        `;
        if (addBtn) addBtn.disabled = false;
        return product;
      } else {
        hint.innerHTML = `<span class="hint-error">Product #${this.escapeHtml(rawVal)} not found</span>`;
        return null;
      }
    },

    /**
     * Selects product directly when user clicks card in the Menu grid.
     */
    selectProductById(productId) {
      const idInput = document.getElementById('bill-product-id');
      const qtyInput = document.getElementById('bill-product-qty');

      if (idInput) {
        idInput.value = productId;
        const prod = this.lookupProduct();
        if (prod && qtyInput) {
          qtyInput.focus();
          qtyInput.select();
        }
      }

      // Scroll smoothly down to the billing section if needed
      const billingSection = document.getElementById('billing-section');
      if (billingSection) {
        billingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },

    /**
     * Reads input fields, validates, and adds or updates item in the bill.
     */
    addItemFromInputs() {
      const idInput = document.getElementById('bill-product-id');
      const qtyInput = document.getElementById('bill-product-qty');

      if (!idInput || !qtyInput) return;

      const rawId = idInput.value.trim();
      if (!rawId) {
        alert('Please enter a product number.');
        idInput.focus();
        return;
      }

      const product = window.ShopStorage.getProductById(rawId);
      if (!product) {
        alert(`Product #${rawId} does not exist in the menu. Check the menu above.`);
        idInput.focus();
        return;
      }

      const qty = parseInt(qtyInput.value, 10);
      if (isNaN(qty) || qty <= 0) {
        alert('Please enter a valid quantity greater than zero.');
        qtyInput.focus();
        qtyInput.select();
        return;
      }

      this.addProductToBill(product, qty);

      // Reset input fields ready for next entry
      idInput.value = '';
      qtyInput.value = '1';
      this.lookupProduct();
      idInput.focus();
    },

    /**
     * Add product or increment existing product quantity.
     */
    addProductToBill(product, quantity) {
      const existing = this.items.find(i => i.id === product.id);

      if (existing) {
        // If already in bill, increase quantity
        existing.quantity += quantity;
        existing.subtotal = existing.quantity * existing.price;
      } else {
        this.items.push({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: quantity,
          subtotal: quantity * parseFloat(product.price)
        });
      }

      this.renderBillTable();
      this.updateCalculations();
    },

    /**
     * Updates an item's quantity directly in the table.
     */
    updateQuantity(productId, newQty) {
      const qty = parseInt(newQty, 10);
      const item = this.items.find(i => i.id === productId);
      if (!item) return;

      if (isNaN(qty) || qty <= 0) {
        this.removeItem(productId);
        return;
      }

      item.quantity = qty;
      item.subtotal = item.quantity * item.price;
      this.renderBillTable();
      this.updateCalculations();
    },

    /**
     * Remove item from bill.
     */
    removeItem(productId) {
      this.items = this.items.filter(i => i.id !== productId);
      this.renderBillTable();
      this.updateCalculations();
    },

    /**
     * Recalculate Subtotals and Grand Total.
     */
    updateCalculations() {
      const settings = window.ShopStorage.getSettings();
      const currency = settings.currencySymbol || '₹';

      let totalItemsCount = 0;
      let grandTotal = 0;

      this.items.forEach(item => {
        item.subtotal = item.quantity * item.price;
        totalItemsCount += item.quantity;
        grandTotal += item.subtotal;
      });

      const grandTotalDisplay = document.getElementById('bill-grand-total');
      const itemsCountDisplay = document.getElementById('bill-items-count');
      const generateBtn = document.getElementById('btn-generate-bill');

      if (grandTotalDisplay) {
        grandTotalDisplay.textContent = `${currency}${grandTotal.toFixed(2)}`;
      }

      if (itemsCountDisplay) {
        itemsCountDisplay.textContent = `${this.items.length} item types (${totalItemsCount} units)`;
      }

      if (generateBtn) {
        generateBtn.disabled = this.items.length === 0;
      }
    },

    /**
     * Render the table of selected products.
     */
    renderBillTable() {
      const tbody = document.getElementById('bill-table-body');
      const emptyState = document.getElementById('bill-empty-state');
      const tableWrapper = document.getElementById('bill-table-wrapper');
      if (!tbody) return;

      const settings = window.ShopStorage.getSettings();
      const currency = settings.currencySymbol || '₹';

      if (this.items.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (tableWrapper) tableWrapper.style.display = 'none';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';
      if (tableWrapper) tableWrapper.style.display = 'block';

      tbody.innerHTML = this.items.map(item => `
        <tr data-id="${item.id}">
          <td class="col-product">
            <span class="product-id-tag">#${item.id}</span>
            <span class="product-item-name">${this.escapeHtml(item.name)}</span>
          </td>
          <td class="col-qty">
            <div class="qty-control">
              <button type="button" class="btn-qty" onclick="BillingManager.updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
              <input type="number" class="qty-input" min="1" max="999" value="${item.quantity}" onchange="BillingManager.updateQuantity(${item.id}, this.value)">
              <button type="button" class="btn-qty" onclick="BillingManager.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
            </div>
          </td>
          <td class="col-price">${currency}${item.price.toFixed(2)}</td>
          <td class="col-subtotal font-bold">${currency}${item.subtotal.toFixed(2)}</td>
          <td class="col-action">
            <button type="button" class="btn-remove-row" title="Remove item" onclick="BillingManager.removeItem(${item.id})">
              ✕
            </button>
          </td>
        </tr>
      `).join('');
    },

    /**
     * Ask confirmation and reset bill back to zero.
     */
    confirmResetBill() {
      if (this.items.length === 0) {
        this.resetBill(false);
        return;
      }

      const confirmed = window.confirm(
        'Are you sure you want to clear this bill? All quantities and totals will reset to zero.'
      );
      if (confirmed) {
        this.resetBill(true);
      }
    },

    /**
     * Reset bill to zero state.
     */
    resetBill(showNotification = false) {
      this.items = [];
      const idInput = document.getElementById('bill-product-id');
      const qtyInput = document.getElementById('bill-product-qty');
      if (idInput) idInput.value = '';
      if (qtyInput) qtyInput.value = '1';
      this.lookupProduct();
      this.renderBillTable();
      this.updateCalculations();

      if (showNotification) {
        this.showToast('Bill reset to zero. Ready for next order!');
      }
    },

    /**
     * If product catalog changes, sync item prices and names.
     */
    handleProductCatalogChange() {
      const products = window.ShopStorage.getProducts();
      let changed = false;

      this.items.forEach(item => {
        const prod = products.find(p => p.id === item.id);
        if (prod) {
          if (item.name !== prod.name || item.price !== prod.price) {
            item.name = prod.name;
            item.price = parseFloat(prod.price);
            item.subtotal = item.quantity * item.price;
            changed = true;
          }
        }
      });

      if (changed) {
        this.renderBillTable();
        this.updateCalculations();
      }
    },

    /**
     * Open bill receipt modal with generated Bill Number and current date/time.
     */
    openReceiptModal() {
      if (this.items.length === 0) {
        alert('Please add at least one product to generate a bill.');
        return;
      }

      const modal = document.getElementById('receipt-modal');
      if (!modal) return;

      const settings = window.ShopStorage.getSettings();
      this.currentBillNumber = window.ShopStorage.getNextBillNumber();
      this.currentBillDate = new Date();

      // Render Receipt Content
      this.renderReceiptContent(settings);

      modal.classList.add('active');
    },

    /**
     * Close receipt modal.
     */
    closeReceiptModal() {
      const modal = document.getElementById('receipt-modal');
      if (modal) modal.classList.remove('active');
    },

    /**
     * Formats receipt DOM content.
     */
    renderReceiptContent(settings) {
      const receiptEl = document.getElementById('receipt-printable-area');
      if (!receiptEl) return;

      const currency = settings.currencySymbol || '₹';
      const formattedDate = this.currentBillDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const formattedTime = this.currentBillDate.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });

      let grandTotal = 0;
      let totalQty = 0;

      const rows = this.items.map(item => {
        grandTotal += item.subtotal;
        totalQty += item.quantity;
        return `
          <tr>
            <td class="r-item">
              <span class="r-name">${this.escapeHtml(item.name)}</span>
              <span class="r-code">#${item.id}</span>
            </td>
            <td class="r-qty text-center">${item.quantity}</td>
            <td class="r-price text-right">${currency}${item.price.toFixed(2)}</td>
            <td class="r-subtotal text-right">${currency}${item.subtotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      receiptEl.innerHTML = `
        <div class="receipt-header">
          <h2 class="receipt-shop-name" contenteditable="true" title="Click to edit shop name" onblur="BillingManager.saveInlineShopName(this.innerText)">${this.escapeHtml(settings.shopName)}</h2>
          <p class="receipt-shop-sub">${this.escapeHtml(settings.shopTagline)}</p>
          <p class="receipt-shop-addr">${this.escapeHtml(settings.shopAddress)}</p>
          <p class="receipt-shop-phone">Tel: ${this.escapeHtml(settings.shopPhone)}</p>
        </div>

        <div class="receipt-divider"></div>

        <div class="receipt-meta">
          <div class="receipt-meta-row">
            <span><strong>Bill No:</strong> #${this.currentBillNumber}</span>
            <span><strong>Date:</strong> ${formattedDate}</span>
          </div>
          <div class="receipt-meta-row">
            <span><strong>Cashier:</strong> Counter 1</span>
            <span><strong>Time:</strong> ${formattedTime}</span>
          </div>
        </div>

        <div class="receipt-divider"></div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th class="text-left">Product</th>
              <th class="text-center">Qty</th>
              <th class="text-right">Price</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="receipt-divider"></div>

        <div class="receipt-totals">
          <div class="receipt-total-row">
            <span>Total Items:</span>
            <span>${totalQty} units</span>
          </div>
          <div class="receipt-total-row grand">
            <span>GRAND TOTAL:</span>
            <span>${currency}${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="receipt-divider"></div>

        <div class="receipt-footer">
          <p class="thank-you">THANK YOU FOR YOUR VISIT!</p>
          <p class="terms">Tailoring items once delivered cannot be exchanged without receipt.</p>
        </div>
      `;
    },

    /**
     * Saves inline edited shop name directly into persistent settings.
     */
    saveInlineShopName(newName) {
      if (!newName || !newName.trim()) return;
      window.ShopStorage.saveSettings({ shopName: newName.trim() });
      const shopTitleHeader = document.getElementById('shop-brand-name');
      if (shopTitleHeader) {
        shopTitleHeader.textContent = newName.trim();
      }
    },

    /**
     * Triggers browser print dialog.
     */
    printReceipt() {
      window.print();
    },

    /**
     * Native Canvas-based Receipt Screenshot Generator.
     * Draws receipt details cleanly onto high-resolution Canvas and triggers automatic PNG download.
     * Requires ZERO external libraries!
     */
    downloadReceiptScreenshot() {
      const settings = window.ShopStorage.getSettings();
      const currency = settings.currencySymbol || '₹';
      const billNo = this.currentBillNumber || '1001';
      const dateStr = this.currentBillDate ? this.currentBillDate.toLocaleDateString() : new Date().toLocaleDateString();
      const timeStr = this.currentBillDate ? this.currentBillDate.toLocaleTimeString() : new Date().toLocaleTimeString();

      // High-DPI canvas setup
      const canvas = document.createElement('canvas');
      const width = 640;
      // Calculate dynamic height based on number of items
      const baseHeight = 440;
      const rowHeight = 36;
      const height = baseHeight + (this.items.length * rowHeight);

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Crisp background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Border outline
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, width - 16, height - 16);

      // Header top bar
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(10, 10, width - 20, 8);

      // Header Text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(settings.shopName.toUpperCase(), width / 2, 50);

      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(settings.shopTagline, width / 2, 72);
      ctx.fillText(settings.shopAddress + ' | Tel: ' + settings.shopPhone, width / 2, 92);

      // Divider line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(30, 110);
      ctx.lineTo(width - 30, 110);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Bill metadata row
      ctx.fillStyle = '#334155';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BILL NO: #${billNo}`, 35, 132);
      ctx.textAlign = 'right';
      ctx.fillText(`DATE: ${dateStr} ${timeStr}`, width - 35, 132);

      // Table Header Box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(30, 150, width - 60, 30);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('PRODUCT', 40, 170);
      ctx.textAlign = 'center';
      ctx.fillText('QTY', 330, 170);
      ctx.textAlign = 'right';
      ctx.fillText('PRICE', 440, 170);
      ctx.fillText('SUBTOTAL', width - 40, 170);

      let currentY = 210;
      let grandTotal = 0;
      let totalQty = 0;

      // Table rows
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      this.items.forEach((item, idx) => {
        grandTotal += item.subtotal;
        totalQty += item.quantity;

        // Alternate light row tint
        if (idx % 2 === 1) {
          ctx.fillStyle = '#fbfcfe';
          ctx.fillRect(30, currentY - 20, width - 60, rowHeight);
        }

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'left';
        // Product name with ID
        const nameText = `${item.name} (#${item.id})`;
        ctx.fillText(nameText.length > 28 ? nameText.slice(0, 26) + '..' : nameText, 40, currentY);

        ctx.textAlign = 'center';
        ctx.fillText(String(item.quantity), 330, currentY);

        ctx.textAlign = 'right';
        ctx.fillText(`${currency}${item.price.toFixed(2)}`, 440, currentY);
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${currency}${item.subtotal.toFixed(2)}`, width - 40, currentY);
        ctx.font = '14px system-ui, -apple-system, sans-serif';

        currentY += rowHeight;
      });

      // Divider line
      currentY += 10;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(30, currentY);
      ctx.lineTo(width - 30, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Grand Total Box
      currentY += 35;
      ctx.fillStyle = '#eff6ff';
      ctx.fillRect(30, currentY - 24, width - 60, 44);
      ctx.strokeStyle = '#bfdbfe';
      ctx.strokeRect(30, currentY - 24, width - 60, 44);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`TOTAL ITEMS: ${totalQty} units`, 45, currentY + 4);

      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`GRAND TOTAL: ${currency}${grandTotal.toFixed(2)}`, width - 45, currentY + 4);

      // Thank you message footer
      currentY += 50;
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THANK YOU FOR YOUR VISIT!', width / 2, currentY);
      currentY += 18;
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('Quality Tailoring & Perfect Fit Guaranteed', width / 2, currentY);

      // Download file
      try {
        const link = document.createElement('a');
        link.download = `Bill_${billNo}_Receipt.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast(`Screenshot saved as Bill_${billNo}_Receipt.png!`);
      } catch (err) {
        console.error('Screenshot download error:', err);
        alert('Could not download screenshot: ' + err.message);
      }
    },

    /**
     * Small non-intrusive toast notification.
     */
    showToast(message) {
      let toast = document.getElementById('shop-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'shop-toast';
        toast.className = 'shop-toast';
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add('visible');
      setTimeout(() => {
        toast.classList.remove('visible');
      }, 3500);
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

  window.BillingManager = BillingManager;

})(window);
