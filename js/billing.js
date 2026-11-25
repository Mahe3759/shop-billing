/**
 * billing.js - Mobile-First Billing Counter, Calculations, Receipt & Screenshot
 * 
 * Features:
 * - Direct Tap-to-Add: Tapping cards increments count without needing any form typing.
 * - Large finger-friendly '+' and '−' touch steppers.
 * - Responsive touch-first item list (no horizontal scrolling or cramped tables).
 * - Instant Subtotal (Qty x Price) and Grand Total calculations.
 * - Mobile Sticky Bottom Summary Bar.
 * - High-Resolution HTML5 Canvas Receipt Screenshot (PNG) & Print.
 * - One-tap 'Reset to Zero' button.
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
      this.renderBillList();
      this.updateCalculations();

      // Sync with catalog updates
      if (window.ProductManager) {
        window.ProductManager.subscribe(() => {
          this.handleProductCatalogChange();
        });
      }
    },

    /**
     * Bind UI event listeners.
     */
    bindEvents() {
      const resetBtn = document.getElementById('btn-reset-bill');
      const generateBtn = document.getElementById('btn-generate-bill');
      const stickyGenerateBtn = document.getElementById('btn-sticky-generate');
      const stickyViewBillBtn = document.getElementById('btn-sticky-view');

      // Reset bill button
      if (resetBtn) {
        resetBtn.addEventListener('click', () => this.confirmResetBill());
      }

      // Generate Bill buttons (main and sticky)
      if (generateBtn) {
        generateBtn.addEventListener('click', () => this.openReceiptModal());
      }
      if (stickyGenerateBtn) {
        stickyGenerateBtn.addEventListener('click', () => this.openReceiptModal());
      }

      // Sticky "View Bill" button (smooth scroll down to bill counter)
      if (stickyViewBillBtn) {
        stickyViewBillBtn.addEventListener('click', () => {
          const billSection = document.getElementById('billing-section');
          if (billSection) {
            billSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }

      // Optional manual search / number entry
      const idInput = document.getElementById('bill-product-id');
      const quickAddBtn = document.getElementById('btn-quick-add-num');
      if (idInput && quickAddBtn) {
        quickAddBtn.addEventListener('click', () => {
          const val = idInput.value.trim();
          if (val) {
            this.addOne(parseInt(val, 10));
            idInput.value = '';
          }
        });
        idInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const val = idInput.value.trim();
            if (val) {
              this.addOne(parseInt(val, 10));
              idInput.value = '';
            }
          }
        });
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
     * Direct Tap-to-Add: Adds 1 unit of product to the bill.
     * If already in bill, increments quantity by 1.
     * @param {number} productId 
     */
    addOne(productId) {
      const product = window.ShopStorage.getProductById(productId);
      if (!product) return;

      const existing = this.items.find(i => i.id === product.id);

      if (existing) {
        existing.quantity += 1;
        existing.subtotal = existing.quantity * existing.price;
      } else {
        this.items.push({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          subtotal: parseFloat(product.price)
        });
      }

      this.renderBillList();
      this.updateCalculations();
      this.syncProductBadges();
      this.showToast(`+1 ${product.name}`);
    },

    /**
     * Increase quantity by 1 using '+' stepper.
     */
    increaseOne(productId) {
      const item = this.items.find(i => i.id === productId);
      if (!item) return;

      item.quantity += 1;
      item.subtotal = item.quantity * item.price;

      this.renderBillList();
      this.updateCalculations();
      this.syncProductBadges();
    },

    /**
     * Decrease quantity by 1 using '−' stepper.
     * If quantity reaches 0, removes the item from the bill.
     */
    decreaseOne(productId) {
      const item = this.items.find(i => i.id === productId);
      if (!item) return;

      if (item.quantity > 1) {
        item.quantity -= 1;
        item.subtotal = item.quantity * item.price;
      } else {
        // Reduced to zero -> remove
        this.items = this.items.filter(i => i.id !== productId);
      }

      this.renderBillList();
      this.updateCalculations();
      this.syncProductBadges();
    },

    /**
     * Remove item entirely from bill.
     */
    removeItem(productId) {
      this.items = this.items.filter(i => i.id !== productId);
      this.renderBillList();
      this.updateCalculations();
      this.syncProductBadges();
    },

    /**
     * Sync badge numbers on the product cards above.
     */
    syncProductBadges() {
      if (window.ProductManager && typeof window.ProductManager.syncBillBadges === 'function') {
        window.ProductManager.syncBillBadges(this.items);
      }
    },

    /**
     * Render alias for backward compatibility.
     */
    renderBillTable() {
      return this.renderBillList();
    },

    /**
     * Render the touch-friendly, mobile-first bill item cards.
     */
    renderBillList() {
      const listContainer = document.getElementById('bill-items-list');
      const emptyState = document.getElementById('bill-empty-state');
      if (!listContainer) return;

      const settings = window.ShopStorage.getSettings();
      const currency = settings.currencySymbol || '₹';

      if (this.items.length === 0) {
        listContainer.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      listContainer.innerHTML = this.items.map(item => `
        <div class="bill-item-row" data-id="${item.id}">
          <div class="bill-item-main">
            <div class="bill-item-name-wrap">
              <span class="bill-item-tag">#${item.id}</span>
              <strong class="bill-item-title">${this.escapeHtml(item.name)}</strong>
            </div>
            <div class="bill-item-rate">
              ${currency}${item.price.toFixed(2)} each
            </div>
          </div>

          <!-- Big touch steppers (+ / -) -->
          <div class="bill-stepper-wrap">
            <button type="button" class="btn-stepper btn-stepper-minus" onclick="BillingManager.decreaseOne(${item.id})" aria-label="Decrease quantity">
              −
            </button>
            <span class="stepper-val">${item.quantity}</span>
            <button type="button" class="btn-stepper btn-stepper-plus" onclick="BillingManager.increaseOne(${item.id})" aria-label="Increase quantity">
              +
            </button>
          </div>

          <!-- Line Subtotal & Delete -->
          <div class="bill-item-subtotal-wrap">
            <span class="bill-item-subtotal">${currency}${item.subtotal.toFixed(2)}</span>
            <button type="button" class="btn-remove-item" onclick="BillingManager.removeItem(${item.id})" title="Remove item" aria-label="Remove ${this.escapeHtml(item.name)}">
              🗑
            </button>
          </div>
        </div>
      `).join('');
    },

    /**
     * Recalculate Subtotals and Grand Total, update UI elements.
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

      // Mobile sticky bar elements
      const stickyTotal = document.getElementById('sticky-grand-total');
      const stickyCount = document.getElementById('sticky-items-count');
      const stickyBar = document.getElementById('mobile-sticky-bar');
      const stickyGenerateBtn = document.getElementById('btn-sticky-generate');

      if (grandTotalDisplay) {
        grandTotalDisplay.textContent = `${currency}${grandTotal.toFixed(2)}`;
      }

      if (itemsCountDisplay) {
        itemsCountDisplay.textContent = `${this.items.length} types (${totalItemsCount} units)`;
      }

      if (generateBtn) {
        generateBtn.disabled = this.items.length === 0;
      }

      // Update sticky bottom bar
      if (stickyTotal) {
        stickyTotal.textContent = `${currency}${grandTotal.toFixed(2)}`;
      }
      if (stickyCount) {
        stickyCount.textContent = `${totalItemsCount} item${totalItemsCount === 1 ? '' : 's'}`;
      }
      if (stickyGenerateBtn) {
        stickyGenerateBtn.disabled = this.items.length === 0;
      }
      if (stickyBar) {
        if (totalItemsCount > 0) {
          stickyBar.classList.add('visible');
        } else {
          stickyBar.classList.remove('visible');
        }
      }
    },

    /**
     * Reset bill confirmation.
     */
    confirmResetBill() {
      if (this.items.length === 0) {
        this.resetBill(false);
        return;
      }

      const confirmed = window.confirm(
        'Clear all items and reset bill to zero?'
      );
      if (confirmed) {
        this.resetBill(true);
      }
    },

    /**
     * Reset bill back to 0.
     */
    resetBill(showNotification = false) {
      this.items = [];
      const idInput = document.getElementById('bill-product-id');
      if (idInput) idInput.value = '';

      this.renderBillList();
      this.updateCalculations();
      this.syncProductBadges();

      if (showNotification) {
        this.showToast('Bill reset to zero. Ready for next order!');
      }
    },

    /**
     * Sync with product catalog price/name updates.
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
        this.renderBillList();
        this.updateCalculations();
      }
    },

    /**
     * Open bill receipt modal with generated Bill Number and current date/time.
     */
    openReceiptModal() {
      if (this.items.length === 0) {
        alert('Please tap at least one product to generate a bill.');
        return;
      }

      const modal = document.getElementById('receipt-modal');
      if (!modal) return;

      const settings = window.ShopStorage.getSettings();
      this.currentBillNumber = window.ShopStorage.getNextBillNumber();
      this.currentBillDate = new Date();

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
            <span><strong>Counter:</strong> Mobile POS</span>
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
            <span>Total Units:</span>
            <span>${totalQty} items</span>
          </div>
          <div class="receipt-total-row grand">
            <span>GRAND TOTAL:</span>
            <span>${currency}${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="receipt-divider"></div>

        <div class="receipt-footer">
          <p class="thank-you">THANK YOU FOR YOUR VISIT!</p>
          <p class="terms">Tailoring & Clothing Material. Visit Again!</p>
        </div>
      `;
    },

    /**
     * Save inline edited shop name.
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
     * Produces clean PNG image download without third-party libraries.
     */
    downloadReceiptScreenshot() {
      const settings = window.ShopStorage.getSettings();
      const currency = settings.currencySymbol || '₹';
      const billNo = this.currentBillNumber || '1001';
      const dateStr = this.currentBillDate ? this.currentBillDate.toLocaleDateString() : new Date().toLocaleDateString();
      const timeStr = this.currentBillDate ? this.currentBillDate.toLocaleTimeString() : new Date().toLocaleTimeString();

      const canvas = document.createElement('canvas');
      const width = 640;
      const baseHeight = 440;
      const rowHeight = 36;
      const height = baseHeight + (this.items.length * rowHeight);

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, width - 16, height - 16);

      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(10, 10, width - 20, 8);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(settings.shopName.toUpperCase(), width / 2, 50);

      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(settings.shopTagline, width / 2, 72);
      ctx.fillText(settings.shopAddress + ' | Tel: ' + settings.shopPhone, width / 2, 92);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(30, 110);
      ctx.lineTo(width - 30, 110);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#334155';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BILL NO: #${billNo}`, 35, 132);
      ctx.textAlign = 'right';
      ctx.fillText(`DATE: ${dateStr} ${timeStr}`, width - 35, 132);

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

      ctx.font = '14px system-ui, -apple-system, sans-serif';
      this.items.forEach((item, idx) => {
        grandTotal += item.subtotal;
        totalQty += item.quantity;

        if (idx % 2 === 1) {
          ctx.fillStyle = '#fbfcfe';
          ctx.fillRect(30, currentY - 20, width - 60, rowHeight);
        }

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'left';
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

      currentY += 10;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(30, currentY);
      ctx.lineTo(width - 30, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      currentY += 35;
      ctx.fillStyle = '#eff6ff';
      ctx.fillRect(30, currentY - 24, width - 60, 44);
      ctx.strokeStyle = '#bfdbfe';
      ctx.strokeRect(30, currentY - 24, width - 60, 44);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`TOTAL UNITS: ${totalQty}`, 45, currentY + 4);

      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`GRAND TOTAL: ${currency}${grandTotal.toFixed(2)}`, width - 45, currentY + 4);

      currentY += 50;
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THANK YOU FOR YOUR VISIT!', width / 2, currentY);
      currentY += 18;
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('Quality Tailoring & Perfect Fit Guaranteed', width / 2, currentY);

      try {
        const link = document.createElement('a');
        link.download = `Bill_${billNo}_Receipt.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast(`Receipt screenshot saved: Bill_${billNo}_Receipt.png`);
      } catch (err) {
        console.error('Screenshot download error:', err);
        alert('Could not download screenshot: ' + err.message);
      }
    },

    /**
     * Non-intrusive toast alert.
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
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        toast.classList.remove('visible');
      }, 2000);
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
