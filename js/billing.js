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

  // Bilingual Dictionaries (English & Telugu)
  const I18N = {
    en: {
      langCode: 'en',
      langName: 'English',
      receiptTitle: 'Bill Receipt',
      shopNameDefault: 'Shree Fashion & Tailors',
      taglineDefault: 'Custom Tailoring & Clothing Material',
      billNoLabel: 'Bill No:',
      dateLabel: 'Date:',
      timeLabel: 'Time:',
      counterLabel: 'Counter: Mobile POS',
      colProduct: 'Product',
      colQty: 'Qty',
      colPrice: 'Price',
      colSubtotal: 'Subtotal',
      totalUnitsLabel: 'Total Units:',
      unitsSuffix: 'items',
      grandTotalLabel: 'GRAND TOTAL:',
      thankYou: 'THANK YOU FOR YOUR VISIT!',
      terms: 'Quality Tailoring & Perfect Fit Guaranteed. Visit Again!',
      productNames: {
        'Lining Cloth': 'Lining Cloth',
        'Lining Jacket': 'Lining Jacket',
        'Saree False': 'Saree False',
        'Dress': 'Dress',
        'Pencil Cut': 'Pencil Cut'
      }
    },
    te: {
      langCode: 'te',
      langName: 'తెలుగు (Telugu)',
      receiptTitle: 'బిల్లు రసీదు',
      shopNameDefault: 'శ్రీ ఫ్యాషన్ & టైలర్స్',
      taglineDefault: 'కస్టమ్ టైలరింగ్ & దుస్తుల మెటీరియల్స్',
      billNoLabel: 'బిల్లు నెం:',
      dateLabel: 'తేదీ:',
      timeLabel: 'సమయం:',
      counterLabel: 'కౌంటర్: మొబైల్ కౌంటర్',
      colProduct: 'వస్తువు / రకం',
      colQty: 'పరిమాణం',
      colPrice: 'ధర',
      colSubtotal: 'మొత్తం',
      totalUnitsLabel: 'మొత్తం వస్తువులు:',
      unitsSuffix: 'వస్తువులు',
      grandTotalLabel: 'మొత్తం బిల్లు:',
      thankYou: 'మా దుకాణాన్ని సందర్శించినందుకు ధన్యవాదాలు!',
      terms: 'సరైన కొలత & నాణ్యమైన కుట్టుపని మా ప్రత్యేకత. మళ్లీ రండి!',
      productNames: {
        'Lining Cloth': 'లైనింగ్ క్లాత్',
        'Lining Jacket': 'లైనింగ్ జాకెట్',
        'Saree False': 'శారీ ఫాల్స్',
        'Dress': 'డ్రెస్',
        'Pencil Cut': 'పెన్సిల్ కట్'
      }
    }
  };

  const BillingManager = {
    // Current bill items: Array of { id, name, price, quantity, subtotal, image }
    items: [],
    currentBillNumber: null,
    currentBillDate: null,
    currentLanguage: 'en', // 'en' or 'te'

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
        generateBtn.addEventListener('click', () => this.promptLanguageSelection());
      }
      if (stickyGenerateBtn) {
        stickyGenerateBtn.addEventListener('click', () => this.promptLanguageSelection());
      }

      // Language selection modal buttons
      const btnLangEn = document.getElementById('btn-choose-lang-en');
      if (btnLangEn) {
        btnLangEn.addEventListener('click', () => this.generateBillInLanguage('en'));
      }
      const btnLangTe = document.getElementById('btn-choose-lang-te');
      if (btnLangTe) {
        btnLangTe.addEventListener('click', () => this.generateBillInLanguage('te'));
      }
      const closeLangModalBtn = document.getElementById('btn-close-lang-modal');
      if (closeLangModalBtn) {
        closeLangModalBtn.addEventListener('click', () => this.closeLanguageModal());
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
    async addOne(productId) {
      const product = window.ShopStorage.getProductById(productId);
      if (!product) return;

      const existing = this.items.find(i => i.id === product.id);

      if (existing) {
        existing.quantity += 1;
        existing.subtotal = existing.quantity * existing.price;
      } else {
        const imgSrc = await window.ShopStorage.resolveProductImage(product);
        this.items.push({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          subtotal: parseFloat(product.price),
          image: imgSrc || window.ShopStorage.DEFAULT_IMAGE
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
     * Displays: Small product image, Product #, Name, Quantity stepper, Unit Price, and Sub-amount.
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

      listContainer.innerHTML = this.items.map(item => {
        const imgSrc = item.image || window.ShopStorage.DEFAULT_IMAGE;
        return `
        <div class="bill-item-row" data-id="${item.id}">
          <!-- 1. Small Product Image Thumbnail Profile -->
          <div class="bill-item-thumb">
            <img src="${imgSrc}" alt="${this.escapeHtml(item.name)}" loading="lazy" onerror="this.src='images/products/default.svg'">
          </div>

          <!-- 2. Product #, Name & Unit Price -->
          <div class="bill-item-main">
            <div class="bill-item-name-wrap">
              <span class="bill-item-tag">#${item.id}</span>
              <strong class="bill-item-title">${this.escapeHtml(item.name)}</strong>
            </div>
            <div class="bill-item-rate">
              ${currency}${item.price.toFixed(2)} / unit
            </div>
          </div>

          <!-- 3. Quantity Stepper (- Qty +) -->
          <div class="bill-stepper-wrap">
            <button type="button" class="btn-stepper btn-stepper-minus" onclick="BillingManager.decreaseOne(${item.id})" aria-label="Decrease quantity">
              −
            </button>
            <span class="stepper-val" title="Quantity">${item.quantity}</span>
            <button type="button" class="btn-stepper btn-stepper-plus" onclick="BillingManager.increaseOne(${item.id})" aria-label="Increase quantity">
              +
            </button>
          </div>

          <!-- 4. Sub-amount (Subtotal) & Delete -->
          <div class="bill-item-subtotal-wrap">
            <div class="subtotal-label-box">
              <span class="subtotal-caption">Subtotal</span>
              <span class="bill-item-subtotal">${currency}${item.subtotal.toFixed(2)}</span>
            </div>
            <button type="button" class="btn-remove-item" onclick="BillingManager.removeItem(${item.id})" title="Remove item" aria-label="Remove ${this.escapeHtml(item.name)}">
              🗑
            </button>
          </div>
        </div>
      `;
      }).join('');
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
     * Shows modal to choose language (English or Telugu) before generating bill.
     */
    promptLanguageSelection() {
      if (this.items.length === 0) {
        alert('Please tap at least one product to generate a bill.');
        return;
      }
      const langModal = document.getElementById('language-select-modal');
      if (langModal) {
        langModal.classList.add('active');
      } else {
        // Fallback: direct English
        this.openReceiptModal('en');
      }
    },

    /**
     * Close language choice modal.
     */
    closeLanguageModal() {
      const langModal = document.getElementById('language-select-modal');
      if (langModal) langModal.classList.remove('active');
    },

    /**
     * Generate bill in selected language.
     * @param {'en'|'te'} lang 
     */
    generateBillInLanguage(lang) {
      this.closeLanguageModal();
      this.openReceiptModal(lang);
    },

    /**
     * Switch language on the fly inside the active receipt modal.
     * @param {'en'|'te'} lang 
     */
    switchReceiptLanguage(lang) {
      if (!I18N[lang]) return;
      this.currentLanguage = lang;
      this.updateReceiptLanguageTabs();
      this.renderReceiptContent(window.ShopStorage.getSettings());
      this.showToast(`Bill language: ${I18N[lang].langName}`);
    },

    /**
     * Update active CSS class on receipt modal language toggle tabs.
     */
    updateReceiptLanguageTabs() {
      const tabs = document.querySelectorAll('.receipt-lang-tab');
      tabs.forEach(tab => {
        if (tab.dataset.lang === this.currentLanguage) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
    },

    /**
     * Open bill receipt modal with generated Bill Number and current date/time.
     */
    openReceiptModal(lang = 'en') {
      if (this.items.length === 0) {
        alert('Please tap at least one product to generate a bill.');
        return;
      }

      this.currentLanguage = lang || this.currentLanguage || 'en';

      const modal = document.getElementById('receipt-modal');
      if (!modal) return;

      const settings = window.ShopStorage.getSettings();
      this.currentBillNumber = window.ShopStorage.getNextBillNumber();
      this.currentBillDate = new Date();

      this.updateReceiptLanguageTabs();
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
     * Formats receipt DOM content according to selected language (English or Telugu).
     */
    renderReceiptContent(settings) {
      const receiptEl = document.getElementById('receipt-printable-area');
      if (!receiptEl) return;

      const i18n = I18N[this.currentLanguage] || I18N.en;
      const currency = settings.currencySymbol || '₹';

      // Localized shop info
      const isDefaultShop = !settings.shopName || settings.shopName === 'Shree Fashion & Tailors';
      const shopDisplayName = (this.currentLanguage === 'te' && isDefaultShop) 
        ? i18n.shopNameDefault 
        : (settings.shopName || i18n.shopNameDefault);

      const isDefaultTag = !settings.shopTagline || settings.shopTagline === 'Custom Tailoring & Clothing Material';
      const shopDisplayTag = (this.currentLanguage === 'te' && isDefaultTag) 
        ? i18n.taglineDefault 
        : (settings.shopTagline || i18n.taglineDefault);

      const localeCode = this.currentLanguage === 'te' ? 'te-IN' : 'en-IN';
      const formattedDate = this.currentBillDate.toLocaleDateString(localeCode, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const formattedTime = this.currentBillDate.toLocaleTimeString(localeCode, {
        hour: '2-digit',
        minute: '2-digit'
      });

      let grandTotal = 0;
      let totalQty = 0;

      const rows = this.items.map(item => {
        grandTotal += item.subtotal;
        totalQty += item.quantity;
        const thumb = item.image || window.ShopStorage.DEFAULT_IMAGE;
        // Translate standard tailoring product names to Telugu if in Telugu mode
        const localizedName = (i18n.productNames && i18n.productNames[item.name]) ? i18n.productNames[item.name] : item.name;

        return `
          <tr>
            <td class="r-item">
              <div style="display: flex; align-items: center; gap: 6px;">
                <img src="${thumb}" alt="" style="width: 24px; height: 24px; object-fit: contain; border-radius: 4px; border: 1px solid #cbd5e1; flex-shrink: 0;">
                <div>
                  <span class="r-name">${this.escapeHtml(localizedName)}</span>
                  <span class="r-code">#${item.id}</span>
                </div>
              </div>
            </td>
            <td class="r-qty text-center">${item.quantity}</td>
            <td class="r-price text-right">${currency}${item.price.toFixed(2)}</td>
            <td class="r-subtotal text-right">${currency}${item.subtotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      receiptEl.innerHTML = `
        <div class="receipt-header">
          <h2 class="receipt-shop-name" contenteditable="true" title="Click to edit shop name" onblur="BillingManager.saveInlineShopName(this.innerText)">${this.escapeHtml(shopDisplayName)}</h2>
          <p class="receipt-shop-sub">${this.escapeHtml(shopDisplayTag)}</p>
          <p class="receipt-shop-addr">${this.escapeHtml(settings.shopAddress)}</p>
          <p class="receipt-shop-phone">Tel: ${this.escapeHtml(settings.shopPhone)}</p>
        </div>

        <div class="receipt-divider"></div>

        <div class="receipt-meta">
          <div class="receipt-meta-row">
            <span><strong>${i18n.billNoLabel}</strong> #${this.currentBillNumber}</span>
            <span><strong>${i18n.dateLabel}</strong> ${formattedDate}</span>
          </div>
          <div class="receipt-meta-row">
            <span><strong>${i18n.counterLabel}</strong></span>
            <span><strong>${i18n.timeLabel}</strong> ${formattedTime}</span>
          </div>
        </div>

        <div class="receipt-divider"></div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th class="text-left">${i18n.colProduct}</th>
              <th class="text-center">${i18n.colQty}</th>
              <th class="text-right">${i18n.colPrice}</th>
              <th class="text-right">${i18n.colSubtotal}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="receipt-divider"></div>

        <div class="receipt-totals">
          <div class="receipt-total-row">
            <span>${i18n.totalUnitsLabel}</span>
            <span>${totalQty} ${i18n.unitsSuffix}</span>
          </div>
          <div class="receipt-total-row grand">
            <span>${i18n.grandTotalLabel}</span>
            <span>${currency}${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="receipt-divider"></div>

        <div class="receipt-footer">
          <p class="thank-you">${i18n.thankYou}</p>
          <p class="terms">${i18n.terms}</p>
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
     * Native Canvas-based Receipt Screenshot Generator in Selected Language (Telugu / English).
     * Produces clean PNG image download without third-party libraries.
     */
    downloadReceiptScreenshot() {
      const settings = window.ShopStorage.getSettings();
      const i18n = I18N[this.currentLanguage] || I18N.en;
      const currency = settings.currencySymbol || '₹';
      const billNo = this.currentBillNumber || '1001';

      const isDefaultShop = !settings.shopName || settings.shopName === 'Shree Fashion & Tailors';
      const shopDisplayName = (this.currentLanguage === 'te' && isDefaultShop) 
        ? i18n.shopNameDefault 
        : (settings.shopName || i18n.shopNameDefault);

      const isDefaultTag = !settings.shopTagline || settings.shopTagline === 'Custom Tailoring & Clothing Material';
      const shopDisplayTag = (this.currentLanguage === 'te' && isDefaultTag) 
        ? i18n.taglineDefault 
        : (settings.shopTagline || i18n.taglineDefault);

      const localeCode = this.currentLanguage === 'te' ? 'te-IN' : 'en-IN';
      const dateStr = this.currentBillDate ? this.currentBillDate.toLocaleDateString(localeCode) : new Date().toLocaleDateString(localeCode);
      const timeStr = this.currentBillDate ? this.currentBillDate.toLocaleTimeString(localeCode) : new Date().toLocaleTimeString(localeCode);

      const canvas = document.createElement('canvas');
      const width = 640;
      const baseHeight = 440;
      const rowHeight = 38;
      const height = baseHeight + (this.items.length * rowHeight);

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const fontTelugu = 'system-ui, -apple-system, "Nirmala UI", "Gautami", "Segoe UI", sans-serif';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, width - 16, height - 16);

      // Top bar
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(10, 10, width - 20, 8);

      // Shop Name & Tagline
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 22px ${fontTelugu}`;
      ctx.textAlign = 'center';
      ctx.fillText(shopDisplayName, width / 2, 50);

      ctx.fillStyle = '#64748b';
      ctx.font = `13px ${fontTelugu}`;
      ctx.fillText(shopDisplayTag, width / 2, 72);
      ctx.fillText(settings.shopAddress + ' | Tel: ' + settings.shopPhone, width / 2, 92);

      // Divider
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(30, 110);
      ctx.lineTo(width - 30, 110);
      ctx.stroke();
      ctx.setLineDash([]);

      // Meta
      ctx.fillStyle = '#334155';
      ctx.font = `13px ${fontTelugu}`;
      ctx.textAlign = 'left';
      ctx.fillText(`${i18n.billNoLabel} #${billNo}`, 35, 132);
      ctx.textAlign = 'right';
      ctx.fillText(`${i18n.dateLabel} ${dateStr} ${timeStr}`, width - 35, 132);

      // Table Header Box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(30, 150, width - 60, 32);
      ctx.fillStyle = '#475569';
      ctx.font = `bold 13px ${fontTelugu}`;
      ctx.textAlign = 'left';
      ctx.fillText(i18n.colProduct, 40, 171);
      ctx.textAlign = 'center';
      ctx.fillText(i18n.colQty, 330, 171);
      ctx.textAlign = 'right';
      ctx.fillText(i18n.colPrice, 440, 171);
      ctx.fillText(i18n.colSubtotal, width - 40, 171);

      let currentY = 212;
      let grandTotal = 0;
      let totalQty = 0;

      ctx.font = `14px ${fontTelugu}`;
      this.items.forEach((item, idx) => {
        grandTotal += item.subtotal;
        totalQty += item.quantity;

        if (idx % 2 === 1) {
          ctx.fillStyle = '#fbfcfe';
          ctx.fillRect(30, currentY - 20, width - 60, rowHeight);
        }

        const localizedName = (i18n.productNames && i18n.productNames[item.name]) ? i18n.productNames[item.name] : item.name;

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'left';
        const nameText = `${localizedName} (#${item.id})`;
        ctx.fillText(nameText.length > 28 ? nameText.slice(0, 26) + '..' : nameText, 40, currentY);

        ctx.textAlign = 'center';
        ctx.fillText(String(item.quantity), 330, currentY);

        ctx.textAlign = 'right';
        ctx.fillText(`${currency}${item.price.toFixed(2)}`, 440, currentY);
        ctx.font = `bold 14px ${fontTelugu}`;
        ctx.fillText(`${currency}${item.subtotal.toFixed(2)}`, width - 40, currentY);
        ctx.font = `14px ${fontTelugu}`;

        currentY += rowHeight;
      });

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
      ctx.font = `bold 14px ${fontTelugu}`;
      ctx.textAlign = 'left';
      ctx.fillText(`${i18n.totalUnitsLabel} ${totalQty} ${i18n.unitsSuffix}`, 45, currentY + 4);

      ctx.font = `bold 17px ${fontTelugu}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${i18n.grandTotalLabel} ${currency}${grandTotal.toFixed(2)}`, width - 45, currentY + 4);

      currentY += 50;
      ctx.fillStyle = '#64748b';
      ctx.font = `bold 13px ${fontTelugu}`;
      ctx.textAlign = 'center';
      ctx.fillText(i18n.thankYou, width / 2, currentY);
      currentY += 18;
      ctx.font = `11px ${fontTelugu}`;
      ctx.fillText(i18n.terms, width / 2, currentY);

      const langSlug = this.currentLanguage === 'te' ? 'Telugu' : 'English';
      try {
        const link = document.createElement('a');
        link.download = `Bill_${billNo}_${langSlug}_Receipt.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast(`Saved ${langSlug} receipt screenshot: Bill_${billNo}_${langSlug}_Receipt.png`);
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
