/**
 * app.js - Main Application Orchestrator
 * 
 * Coordinates:
 * - Application lifecycle initialization.
 * - Settings modal & shop personalization.
 * - Backup export / import event bindings.
 * - Keyboard shortcuts for fast shopkeeper workflows.
 */

(function (window) {
  'use strict';

  const App = {
    async init() {
      // 1. Initialize persistent storage
      window.ShopStorage.init();

      // 2. Load shop settings in header
      this.applyShopSettings();

      // 3. Initialize Products Manager (Menu first)
      if (window.ProductManager) {
        await window.ProductManager.init();
      }

      // 4. Initialize Billing Manager
      if (window.BillingManager) {
        window.BillingManager.init();
      }

      // 5. Bind app-level UI and shortcuts
      this.bindAppEvents();

      console.log('Shop Billing System initialized successfully.');
    },

    /**
     * Updates header and branding with saved settings.
     */
    applyShopSettings() {
      const settings = window.ShopStorage.getSettings();
      const nameEl = document.getElementById('shop-brand-name');
      const tagEl = document.getElementById('shop-brand-tagline');

      if (nameEl) nameEl.textContent = settings.shopName;
      if (tagEl) tagEl.textContent = settings.shopTagline;
    },

    /**
     * Open settings modal.
     */
    openSettingsModal() {
      const modal = document.getElementById('settings-modal');
      const settings = window.ShopStorage.getSettings();

      document.getElementById('setting-shop-name').value = settings.shopName || '';
      document.getElementById('setting-shop-tagline').value = settings.shopTagline || '';
      document.getElementById('setting-shop-address').value = settings.shopAddress || '';
      document.getElementById('setting-shop-phone').value = settings.shopPhone || '';
      document.getElementById('setting-currency').value = settings.currencySymbol || '₹';

      if (modal) modal.classList.add('active');
    },

    /**
     * Close settings modal.
     */
    closeSettingsModal() {
      const modal = document.getElementById('settings-modal');
      if (modal) modal.classList.remove('active');
    },

    /**
     * Save settings form.
     */
    saveSettingsForm(e) {
      e.preventDefault();
      const updated = {
        shopName: document.getElementById('setting-shop-name').value.trim() || 'My Shop',
        shopTagline: document.getElementById('setting-shop-tagline').value.trim(),
        shopAddress: document.getElementById('setting-shop-address').value.trim(),
        shopPhone: document.getElementById('setting-shop-phone').value.trim(),
        currencySymbol: document.getElementById('setting-currency').value.trim() || '₹'
      };

      window.ShopStorage.saveSettings(updated);
      this.applyShopSettings();
      this.closeSettingsModal();

      // Re-render menu and bill to reflect changes
      if (window.ProductManager) window.ProductManager.renderMenu();
      if (window.BillingManager) {
        window.BillingManager.renderBillTable();
        window.BillingManager.updateCalculations();
        window.BillingManager.showToast('Shop settings updated!');
      }
    },

    /**
     * Bind listeners for buttons, backup/restore, file chooser.
     */
    bindAppEvents() {
      // Add New Menu button in menu section
      const addMenuBtn = document.getElementById('btn-add-new-menu');
      if (addMenuBtn) {
        addMenuBtn.addEventListener('click', () => {
          if (window.ProductManager) window.ProductManager.openAddModal();
        });
      }

      // Settings button
      const settingsBtn = document.getElementById('btn-open-settings');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => this.openSettingsModal());
      }

      const settingsForm = document.getElementById('settings-form');
      if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => this.saveSettingsForm(e));
      }

      const settingsCancel = document.getElementById('settings-cancel-btn');
      if (settingsCancel) {
        settingsCancel.addEventListener('click', () => this.closeSettingsModal());
      }

      // Backup Export button
      const exportBtn = document.getElementById('btn-export-backup');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          window.ShopStorage.exportBackup();
          if (window.BillingManager) window.BillingManager.showToast('Backup JSON exported successfully!');
        });
      }

      // Backup Import button
      const importBtn = document.getElementById('btn-import-backup');
      const importInput = document.getElementById('import-file-input');
      if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          const confirmed = window.confirm(
            'Restoring from backup will replace the current menu items with the backup file. Proceed?'
          );
          if (!confirmed) {
            importInput.value = '';
            return;
          }

          try {
            await window.ShopStorage.importBackup(file);
            this.applyShopSettings();
            if (window.ProductManager) await window.ProductManager.renderMenu();
            if (window.BillingManager) {
              window.BillingManager.resetBill(false);
              window.BillingManager.showToast('Backup restored successfully!');
            }
          } catch (err) {
            alert('Failed to restore backup: ' + err.message);
          } finally {
            importInput.value = '';
          }
        });
      }

      // Global keyboard shortcuts for fast checkout
      window.addEventListener('keydown', (e) => {
        // F2 -> Add New Product
        if (e.key === 'F2') {
          e.preventDefault();
          if (window.ProductManager) window.ProductManager.openAddModal();
        }
        // F4 -> Focus Product ID input in Billing
        if (e.key === 'F4') {
          e.preventDefault();
          const idInput = document.getElementById('bill-product-id');
          if (idInput) {
            idInput.focus();
            idInput.select();
          }
        }
      });
    }
  };

  window.App = App;

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

})(window);
