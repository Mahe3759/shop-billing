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
      invoiceBadge: 'RETAIL CASH INVOICE',
      shopNameDefault: 'Shree Fashion & Tailors',
      taglineDefault: 'Custom Tailoring & Clothing Material',
      billNoLabel: 'Bill No:',
      dateLabel: 'Date:',
      timeLabel: 'Time:',
      counterLabel: 'Counter: Mobile POS',
      colProduct: 'Product / Item',
      colQty: 'Qty',
      colPrice: 'Price',
      colSubtotal: 'Amount',
      totalUnitsLabel: 'Total Items:',
      unitsSuffix: 'units',
      grandTotalLabel: 'GRAND TOTAL:',
      thankYou: 'THANK YOU FOR YOUR VISIT!',
      terms: 'Quality Tailoring & Perfect Fit Guaranteed • Visit Again!',
      computerGenerated: 'Computer Generated Receipt • Valid Without Signature',
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
      invoiceBadge: 'రిటైల్ క్యాష్ రసీదు',
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
      terms: 'సరైన కొలత & నాణ్యమైన కుట్టుపని మా ప్రత్యేకత • మళ్లీ రండి!',
      computerGenerated: 'కంప్యూటర్ రసీదు • సంతకం అవసరం లేదు',
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

      const whatsappBtn = document.getElementById('btn-receipt-whatsapp');
      if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => this.shareViaWhatsApp());
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
        const nameTe = product.nameTe || (window.toTelugu ? window.toTelugu(product.name) : product.name);
        this.items.push({
          id: product.id,
          name: product.name,
          nameTe: nameTe,
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
     * Sync with product catalog price/name/photo updates.
     */
    async handleProductCatalogChange() {
      const products = window.ShopStorage.getProducts();
      let changed = false;

      for (const item of this.items) {
        const prod = products.find(p => p.id === item.id);
        if (prod) {
          const newImg = await window.ShopStorage.resolveProductImage(prod);
          if (item.name !== prod.name || item.price !== prod.price || item.image !== newImg) {
            item.name = prod.name;
            item.nameTe = prod.nameTe || item.nameTe;
            item.price = parseFloat(prod.price);
            item.subtotal = item.quantity * item.price;
            item.image = newImg;
            changed = true;
          }
        }
      }

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
        // Auto-convert to Telugu if in Telugu mode
        const localizedName = this.currentLanguage === 'te'
          ? (item.nameTe || (window.toTelugu ? window.toTelugu(item.name) : item.name))
          : item.name;

        return `
          <tr class="receipt-row" data-id="${item.id}">
            <td class="r-item">
              <div class="r-item-wrap">
                <img src="${thumb}" class="receipt-thumb-img" data-id="${item.id}" alt="" loading="eager" onerror="this.src='images/products/default.svg'">
                <div class="r-item-text">
                  <span class="r-name">${this.escapeHtml(localizedName)}</span>
                  <span class="r-code">#${item.id}</span>
                </div>
              </div>
            </td>
            <td class="r-qty text-center">
              <span class="r-qty-pill">${item.quantity}</span>
            </td>
            <td class="r-price text-right">${currency}${item.price.toFixed(2)}</td>
            <td class="r-subtotal text-right">${currency}${item.subtotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      receiptEl.innerHTML = `
        <div class="receipt-card-top-bar"></div>
        <div class="receipt-badge-wrap">
          <span class="receipt-invoice-badge">✦ ${i18n.invoiceBadge} ✦</span>
        </div>
        <div class="receipt-header">
          <h2 class="receipt-shop-name" contenteditable="true" title="Click to edit shop name" onblur="BillingManager.saveInlineShopName(this.innerText)">${this.escapeHtml(shopDisplayName)}</h2>
          <p class="receipt-shop-sub">${this.escapeHtml(shopDisplayTag)}</p>
          <p class="receipt-shop-addr">📍 ${this.escapeHtml(settings.shopAddress)}</p>
          <p class="receipt-shop-phone">📞 Tel: ${this.escapeHtml(settings.shopPhone)}</p>
        </div>

        <div class="receipt-meta-box">
          <div class="receipt-meta-col">
            <span class="r-meta-label">${i18n.billNoLabel}</span>
            <strong class="r-meta-val bill-no">#${this.currentBillNumber}</strong>
          </div>
          <div class="receipt-meta-col text-center">
            <span class="r-meta-label">${i18n.dateLabel}</span>
            <strong class="r-meta-val">${formattedDate}</strong>
          </div>
          <div class="receipt-meta-col text-right">
            <span class="r-meta-label">${i18n.timeLabel}</span>
            <strong class="r-meta-val">${formattedTime}</strong>
          </div>
        </div>

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

        <div class="receipt-grand-card">
          <div class="r-grand-left">
            <span class="r-grand-sublabel">${i18n.totalUnitsLabel}</span>
            <strong class="r-grand-units">${totalQty} ${i18n.unitsSuffix} (${this.items.length} ${this.currentLanguage === 'te' ? 'రకాలు' : 'items'})</strong>
          </div>
          <div class="r-grand-right">
            <span class="r-grand-label">${i18n.grandTotalLabel}</span>
            <strong class="r-grand-val">${currency}${grandTotal.toFixed(2)}</strong>
          </div>
        </div>

        <div class="receipt-footer">
          <p class="thank-you">✦ ${i18n.thankYou} ✦</p>
          <p class="terms">${i18n.terms}</p>
          <div class="receipt-footer-line"></div>
          <p class="receipt-computer-tag">${i18n.computerGenerated}</p>
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
     * Builds and renders the high-resolution bill receipt onto a 2D Canvas.
     * Engineered for maximum mobile clarity, high-contrast typography,
     * crisp borders, and professional retail branding for WhatsApp photo sharing.
     * Executes synchronously in <3ms to maintain mobile WebShare gesture activation.
     * @returns {HTMLCanvasElement}
     */
    generateReceiptCanvas() {
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
      const dateStr = this.currentBillDate ? this.currentBillDate.toLocaleDateString(localeCode, { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString(localeCode);
      const timeStr = this.currentBillDate ? this.currentBillDate.toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString(localeCode);

      // High-res mobile layout (750px standard mobile retina width)
      const width = 750;
      const cardX = 20;
      const cardWidth = width - (cardX * 2); // 710px
      const innerX = cardX + 24; // 44px
      const innerWidth = cardWidth - 48; // 662px

      const rowHeight = 56;
      const headerBlockHeight = 285;
      const itemsBlockHeight = this.items.length * rowHeight;
      const summaryBlockHeight = 90;
      const footerBlockHeight = 135;
      const height = headerBlockHeight + itemsBlockHeight + summaryBlockHeight + footerBlockHeight;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Nirmala UI", "Gautami", "Noto Sans Telugu", sans-serif';

      // Helper function: Draw rounded rectangle
      function drawRoundRect(x, y, w, h, r, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
      }

      // 1. Canvas Background
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, width, height);

      // 2. Receipt Main Card with crisp border
      ctx.fillStyle = '#ffffff';
      drawRoundRect(cardX, cardX, cardWidth, height - (cardX * 2), 16, true, false);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      drawRoundRect(cardX, cardX, cardWidth, height - (cardX * 2), 16, false, true);

      // 3. Top Royal Blue Accent Bar
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cardX + 16, cardX);
      ctx.lineTo(cardX + cardWidth - 16, cardX);
      ctx.quadraticCurveTo(cardX + cardWidth, cardX, cardX + cardWidth, cardX + 16);
      ctx.lineTo(cardX + cardWidth, cardX + 10);
      ctx.lineTo(cardX, cardX + 10);
      ctx.lineTo(cardX, cardX + 16);
      ctx.quadraticCurveTo(cardX, cardX, cardX + 16, cardX);
      ctx.closePath();
      ctx.fillStyle = '#1e40af';
      ctx.fill();
      ctx.restore();

      // 4. Retail Invoice Badge Pill
      const badgeText = `✦ ${i18n.invoiceBadge} ✦`;
      ctx.font = `bold 12px ${fontStack}`;
      const badgeWidth = ctx.measureText(badgeText).width + 30;
      const badgeX = (width - badgeWidth) / 2;
      ctx.fillStyle = '#eff6ff';
      drawRoundRect(badgeX, 42, badgeWidth, 26, 13, true, false);
      ctx.strokeStyle = '#bfdbfe';
      ctx.lineWidth = 1;
      drawRoundRect(badgeX, 42, badgeWidth, 26, 13, false, true);
      ctx.fillStyle = '#1e40af';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, width / 2, 59);

      // 5. Shop Name & Details
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 26px ${fontStack}`;
      ctx.textAlign = 'center';
      ctx.fillText(shopDisplayName, width / 2, 98);

      ctx.fillStyle = '#475569';
      ctx.font = `14px ${fontStack}`;
      ctx.fillText(shopDisplayTag, width / 2, 122);

      ctx.fillStyle = '#64748b';
      ctx.font = `13.5px ${fontStack}`;
      ctx.fillText(`📍 ${settings.shopAddress}`, width / 2, 144);

      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 14px ${fontStack}`;
      ctx.fillText(`📞 Tel: ${settings.shopPhone}`, width / 2, 166);

      // 6. Metadata Box (Invoice #, Date, Time)
      const metaY = 186;
      const metaH = 54;
      ctx.fillStyle = '#f8fafc';
      drawRoundRect(innerX, metaY, innerWidth, metaH, 8, true, false);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      drawRoundRect(innerX, metaY, innerWidth, metaH, 8, false, true);

      // Col 1: Invoice #
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = `bold 11px ${fontStack}`;
      ctx.fillText(i18n.billNoLabel.toUpperCase(), innerX + 16, metaY + 20);
      ctx.fillStyle = '#1e40af';
      ctx.font = `bold 18px ${fontStack}`;
      ctx.fillText(`#${billNo}`, innerX + 16, metaY + 42);

      // Col 2: Date
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.font = `bold 11px ${fontStack}`;
      ctx.fillText(i18n.dateLabel.toUpperCase(), width / 2, metaY + 20);
      ctx.fillStyle = '#1e293b';
      ctx.font = `bold 14px ${fontStack}`;
      ctx.fillText(dateStr, width / 2, metaY + 41);

      // Col 3: Time
      ctx.textAlign = 'right';
      ctx.fillStyle = '#64748b';
      ctx.font = `bold 11px ${fontStack}`;
      ctx.fillText(i18n.timeLabel.toUpperCase(), innerX + innerWidth - 16, metaY + 20);
      ctx.fillStyle = '#1e293b';
      ctx.font = `bold 14px ${fontStack}`;
      ctx.fillText(timeStr, innerX + innerWidth - 16, metaY + 41);

      // 7. Table Header
      const tableHeadY = 252;
      const tableHeadH = 36;
      ctx.fillStyle = '#f1f5f9';
      drawRoundRect(innerX, tableHeadY, innerWidth, tableHeadH, 6, true, false);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      drawRoundRect(innerX, tableHeadY, innerWidth, tableHeadH, 6, false, true);

      ctx.fillStyle = '#334155';
      ctx.font = `bold 13px ${fontStack}`;

      ctx.textAlign = 'left';
      ctx.fillText(i18n.colProduct.toUpperCase(), innerX + 14, tableHeadY + 23);

      ctx.textAlign = 'center';
      ctx.fillText(i18n.colQty.toUpperCase(), innerX + 410, tableHeadY + 23);

      ctx.textAlign = 'right';
      ctx.fillText(i18n.colPrice.toUpperCase(), innerX + 530, tableHeadY + 23);
      ctx.fillText(i18n.colSubtotal.toUpperCase(), innerX + innerWidth - 14, tableHeadY + 23);

      // 8. Table Rows
      let currentY = tableHeadY + tableHeadH + 6;
      let grandTotal = 0;
      let totalQty = 0;

      // Map loaded images from DOM if available
      const receiptEl = document.getElementById('receipt-printable-area');
      const domImgMap = {};
      if (receiptEl) {
        receiptEl.querySelectorAll('img.receipt-thumb-img').forEach(img => {
          const id = img.getAttribute('data-id');
          if (id) domImgMap[id] = img;
        });
      }

      this.items.forEach((item, idx) => {
        grandTotal += item.subtotal;
        totalQty += item.quantity;

        // Alternating row background
        if (idx % 2 === 1) {
          ctx.fillStyle = '#fafbfd';
          drawRoundRect(innerX, currentY, innerWidth, rowHeight - 4, 4, true, false);
        }

        // Row bottom separator line
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(innerX, currentY + rowHeight - 4);
        ctx.lineTo(innerX + innerWidth, currentY + rowHeight - 4);
        ctx.stroke();

        // Thumbnail box
        const thumbX = innerX + 10;
        const thumbY = currentY + 6;
        const thumbSize = 38;
        const domImg = domImgMap[item.id];

        let imgDrawn = false;
        if (domImg && domImg.complete && domImg.naturalWidth > 0) {
          try {
            ctx.save();
            drawRoundRect(thumbX, thumbY, thumbSize, thumbSize, 6, false, false);
            ctx.clip();
            ctx.drawImage(domImg, thumbX, thumbY, thumbSize, thumbSize);
            ctx.restore();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            drawRoundRect(thumbX, thumbY, thumbSize, thumbSize, 6, false, true);
            imgDrawn = true;
          } catch (e) {
            imgDrawn = false;
          }
        }

        if (!imgDrawn) {
          // Clean fallback badge
          ctx.fillStyle = '#eff6ff';
          drawRoundRect(thumbX, thumbY, thumbSize, thumbSize, 6, true, false);
          ctx.strokeStyle = '#bfdbfe';
          ctx.lineWidth = 1;
          drawRoundRect(thumbX, thumbY, thumbSize, thumbSize, 6, false, true);
          ctx.fillStyle = '#1e40af';
          ctx.font = `bold 11px ${fontStack}`;
          ctx.textAlign = 'center';
          ctx.fillText(`#${item.id}`, thumbX + (thumbSize / 2), thumbY + 23);
        }

        // Product Name and Code
        const localizedName = this.currentLanguage === 'te'
          ? (item.nameTe || (window.toTelugu ? window.toTelugu(item.name) : item.name))
          : item.name;

        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 16px ${fontStack}`;

        // Truncate cleanly if too long
        let displayName = localizedName;
        if (ctx.measureText(displayName).width > 280) {
          while (displayName.length > 5 && ctx.measureText(displayName + '..').width > 280) {
            displayName = displayName.slice(0, -1);
          }
          displayName += '..';
        }
        ctx.fillText(displayName, innerX + 58, currentY + 24);

        ctx.fillStyle = '#64748b';
        ctx.font = `12px ${fontStack}`;
        ctx.fillText(`#${item.id}`, innerX + 58, currentY + 42);

        // Qty pill
        const qtyPillX = innerX + 410;
        ctx.fillStyle = '#f1f5f9';
        drawRoundRect(qtyPillX - 16, currentY + 12, 32, 26, 6, true, false);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        drawRoundRect(qtyPillX - 16, currentY + 12, 32, 26, 6, false, true);
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 14.5px ${fontStack}`;
        ctx.textAlign = 'center';
        ctx.fillText(String(item.quantity), qtyPillX, currentY + 30);

        // Unit Price
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = `14.5px ${fontStack}`;
        ctx.fillText(`${currency}${item.price.toFixed(2)}`, innerX + 530, currentY + 31);

        // Subtotal Amount
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 16px ${fontStack}`;
        ctx.fillText(`${currency}${item.subtotal.toFixed(2)}`, innerX + innerWidth - 14, currentY + 31);

        currentY += rowHeight;
      });

      // 9. Grand Total Card (Mint / Emerald Highlight)
      const grandY = currentY + 12;
      const grandH = 74;
      ctx.fillStyle = '#f0fdf4';
      drawRoundRect(innerX, grandY, innerWidth, grandH, 10, true, false);
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2;
      drawRoundRect(innerX, grandY, innerWidth, grandH, 10, false, true);

      // Left: Total Units
      ctx.textAlign = 'left';
      ctx.fillStyle = '#047857';
      ctx.font = `bold 12px ${fontStack}`;
      ctx.fillText(i18n.totalUnitsLabel.toUpperCase(), innerX + 18, grandY + 28);
      ctx.fillStyle = '#065f46';
      ctx.font = `bold 16px ${fontStack}`;
      ctx.fillText(`${totalQty} ${i18n.unitsSuffix} (${this.items.length} ${this.currentLanguage === 'te' ? 'రకాలు' : 'items'})`, innerX + 18, grandY + 53);

      // Right: Grand Total
      ctx.textAlign = 'right';
      ctx.fillStyle = '#047857';
      ctx.font = `bold 13px ${fontStack}`;
      ctx.fillText(i18n.grandTotalLabel.toUpperCase(), innerX + innerWidth - 18, grandY + 28);
      ctx.fillStyle = '#065f46';
      ctx.font = `bold 28px ${fontStack}`;
      ctx.fillText(`${currency}${grandTotal.toFixed(2)}`, innerX + innerWidth - 18, grandY + 56);

      // 10. Footer Section
      let footerY = grandY + grandH + 34;

      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 15.5px ${fontStack}`;
      ctx.fillText(`✦ ${i18n.thankYou} ✦`, width / 2, footerY);

      footerY += 24;
      ctx.fillStyle = '#475569';
      ctx.font = `13px ${fontStack}`;
      ctx.fillText(i18n.terms, width / 2, footerY);

      footerY += 20;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(width / 2 - 160, footerY);
      ctx.lineTo(width / 2 + 160, footerY);
      ctx.stroke();
      ctx.setLineDash([]);

      footerY += 18;
      ctx.fillStyle = '#94a3b8';
      ctx.font = `11.5px ${fontStack}`;
      ctx.fillText(i18n.computerGenerated, width / 2, footerY);

      return canvas;
    },

    /**
     * Native Canvas-based Receipt Screenshot Generator in Selected Language (Telugu / English).
     * Produces clean PNG image download without third-party libraries.
     */
    downloadReceiptScreenshot() {
      const canvas = this.generateReceiptCanvas();
      const billNo = this.currentBillNumber || '1001';
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
     * Generates a clean WhatsApp text summary of the bill in the active language.
     * @returns {string}
     */
    getBillSummaryText() {
      const settings = window.ShopStorage.getSettings();
      const i18n = I18N[this.currentLanguage] || I18N.en;
      const currency = settings.currencySymbol || '₹';
      const billNo = this.currentBillNumber || '1001';

      const isDefaultShop = !settings.shopName || settings.shopName === 'Shree Fashion & Tailors';
      const shopDisplayName = (this.currentLanguage === 'te' && isDefaultShop) 
        ? i18n.shopNameDefault 
        : (settings.shopName || i18n.shopNameDefault);

      const localeCode = this.currentLanguage === 'te' ? 'te-IN' : 'en-IN';
      const dateStr = this.currentBillDate ? this.currentBillDate.toLocaleDateString(localeCode) : new Date().toLocaleDateString(localeCode);

      let grandTotal = 0;
      const lines = this.items.map((item, i) => {
        grandTotal += item.subtotal;
        const name = this.currentLanguage === 'te' 
          ? (item.nameTe || (window.toTelugu ? window.toTelugu(item.name) : item.name))
          : item.name;
        return `${i + 1}. ${name} x ${item.quantity} = ${currency}${item.subtotal.toFixed(2)}`;
      });

      return `*${shopDisplayName}*
${i18n.billNoLabel} #${billNo}
${i18n.dateLabel} ${dateStr}

${lines.join('\n')}

*${i18n.grandTotalLabel} ${currency}${grandTotal.toFixed(2)}*
${i18n.thankYou}`;
    },

    /**
     * Converts a base64 dataURL to a File object synchronously,
     * maintaining transient user activation for navigator.share().
     */
    dataUrlToFile(dataUrl, filename) {
      const arr = dataUrl.split(',');
      const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    },

    /**
     * Shares the bill photo and details directly to WhatsApp.
     * Uses synchronous File creation to ensure mobile user gesture token remains valid.
     * Web Share API opens WhatsApp directly with the photo preview,
     * allowing the user to select the contact number and send.
     */
    async shareViaWhatsApp() {
      if (this.items.length === 0) {
        alert('Please add products to the bill first.');
        return;
      }

      const canvas = this.generateReceiptCanvas();
      const billNo = this.currentBillNumber || '1001';
      const langSlug = this.currentLanguage === 'te' ? 'Telugu' : 'English';
      const fileName = `Bill_${billNo}_${langSlug}_Receipt.png`;
      const summaryText = this.getBillSummaryText();

      // Synchronously convert to File to preserve browser User Activation
      const dataUrl = canvas.toDataURL('image/png');
      const file = this.dataUrlToFile(dataUrl, fileName);

      // 1. Mobile Web Share API: Opens WhatsApp with the photo file attached!
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: this.currentLanguage === 'te' ? 'బిల్లు రసీదు' : 'Bill Receipt',
            text: summaryText,
            files: [file]
          });
          this.showToast('Shared to WhatsApp successfully!');
          return;
        } catch (err) {
          if (err.name === 'AbortError') {
            // User canceled the share dialog
            return;
          }
          console.warn('WebShare file share failed, falling back:', err);
        }
      }

      // 2. Fallback: Save photo to gallery/downloads and open WhatsApp mobile app directly
      try {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {}

      const encodedText = encodeURIComponent(summaryText);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        // Deep-link directly into the mobile WhatsApp application
        window.location.href = `whatsapp://send?text=${encodedText}`;
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
      }

      this.showToast('Receipt photo saved! Opening WhatsApp...');
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
