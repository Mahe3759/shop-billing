/**
 * storage.js - Data Persistence Layer for Menu-Based Billing System
 * 
 * Handles:
 * - LocalStorage for metadata, products, settings, and sequence counters.
 * - IndexedDB for high-capacity product image storage (avoids localStorage 5MB limit).
 * - Guaranteed non-reusable product IDs via persistent counter.
 * - JSON Export & Import (Backup and Restore).
 * - Initial seeding for tailoring products.
 */

(function (window) {
  'use strict';

  const STORAGE_KEYS = {
    PRODUCTS: 'shop_billing_products_v1',
    SETTINGS: 'shop_billing_settings_v1',
    NEXT_PRODUCT_ID: 'shop_billing_next_product_id',
    NEXT_BILL_NUM: 'shop_billing_next_bill_number',
    LAST_BACKUP: 'shop_billing_last_backup_date'
  };

  const DEFAULT_SETTINGS = {
    shopName: 'Shree Fashion & Tailors',
    shopTagline: 'Custom Tailoring & Clothing Material',
    shopAddress: 'Main Market Road, Near Gandhi Circle',
    shopPhone: '+91 98765 43210',
    currencySymbol: '₹',
    taxRatePercent: 0 // Optional, default 0 for small local tailor shops
  };

  const INITIAL_PRODUCTS = [
    {
      id: 101,
      name: 'Lining Cloth',
      price: 40.00,
      image: 'images/products/lining-cloth.svg',
      customImageKey: null
    },
    {
      id: 102,
      name: 'Lining Jacket',
      price: 350.00,
      image: 'images/products/lining-jacket.svg',
      customImageKey: null
    },
    {
      id: 103,
      name: 'Saree False',
      price: 30.00,
      image: 'images/products/saree-false.svg',
      customImageKey: null
    },
    {
      id: 104,
      name: 'Dress',
      price: 450.00,
      image: 'images/products/dress.svg',
      customImageKey: null
    },
    {
      id: 105,
      name: 'Pencil Cut',
      price: 250.00,
      image: 'images/products/pencil-cut.svg',
      customImageKey: null
    }
  ];

  // ==========================================
  // IndexedDB Helper for uploaded images
  // ==========================================
  const DB_NAME = 'ShopBillingDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'product_images';

  let dbPromise = null;

  function getDB() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
          console.warn('IndexedDB not supported, falling back to in-memory/localStorage.');
          resolve(null);
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('IndexedDB open error:', request.error);
          resolve(null); // Fallback gracefully
        };
      });
    }
    return dbPromise;
  }

  async function saveImageToIndexedDB(key, dataUrl) {
    try {
      const db = await getDB();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ id: key, data: dataUrl });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('Error saving image to IndexedDB:', e);
      return false;
    }
  }

  async function getImageFromIndexedDB(key) {
    try {
      const db = await getDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.warn('Error fetching image from IndexedDB:', e);
      return null;
    }
  }

  async function deleteImageFromIndexedDB(key) {
    try {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    } catch (e) {
      console.warn('Error deleting image from IndexedDB:', e);
    }
  }

  // ==========================================
  // ShopStorage API
  // ==========================================
  const ShopStorage = {
    DEFAULT_IMAGE: 'images/products/default.svg',

    /**
     * Initializes storage with defaults if not present.
     */
    init() {
      // 1. Check products
      const existing = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!existing) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      }

      // 2. Check next product ID counter (guarantees deleted IDs are never reused)
      if (!localStorage.getItem(STORAGE_KEYS.NEXT_PRODUCT_ID)) {
        // Start counter above initial products
        localStorage.setItem(STORAGE_KEYS.NEXT_PRODUCT_ID, '106');
      }

      // 3. Check bill number counter
      if (!localStorage.getItem(STORAGE_KEYS.NEXT_BILL_NUM)) {
        localStorage.setItem(STORAGE_KEYS.NEXT_BILL_NUM, '1001');
      }

      // 4. Check shop settings
      if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      }
    },

    /**
     * Get list of all products.
     * @returns {Array} List of product objects
     */
    getProducts() {
      this.init();
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        return raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
      } catch (e) {
        console.error('Failed to parse products from localStorage:', e);
        return INITIAL_PRODUCTS;
      }
    },

    /**
     * Save full list of products.
     * @param {Array} products 
     */
    saveProducts(products) {
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        return true;
      } catch (e) {
        console.error('Failed to save products:', e);
        return false;
      }
    },

    /**
     * Find a product by numeric ID.
     * @param {number|string} id 
     * @returns {Object|null}
     */
    getProductById(id) {
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) return null;
      const products = this.getProducts();
      return products.find(p => p.id === numericId) || null;
    },

    /**
     * Allocates a guaranteed new unique Product ID that has never been used.
     * @returns {number}
     */
    getNextProductId() {
      this.init();
      let nextId = parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_PRODUCT_ID), 10);
      if (isNaN(nextId) || nextId < 101) {
        // compute max existing ID + 1
        const products = this.getProducts();
        const maxId = products.reduce((max, p) => Math.max(max, p.id || 0), 100);
        nextId = maxId + 1;
      }
      localStorage.setItem(STORAGE_KEYS.NEXT_PRODUCT_ID, String(nextId + 1));
      return nextId;
    },

    /**
     * Get next bill sequence number and advance it.
     * @returns {number}
     */
    getNextBillNumber() {
      this.init();
      let nextBill = parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_BILL_NUM), 10);
      if (isNaN(nextBill) || nextBill < 1) nextBill = 1001;
      localStorage.setItem(STORAGE_KEYS.NEXT_BILL_NUM, String(nextBill + 1));
      return nextBill;
    },

    /**
     * Peek current bill number without incrementing.
     * @returns {number}
     */
    peekNextBillNumber() {
      this.init();
      const val = parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_BILL_NUM), 10);
      return isNaN(val) ? 1001 : val;
    },

    /**
     * Saves custom image data.
     * Stores in IndexedDB if available; falls back to localStorage or DataURL.
     */
    async saveProductImage(productId, dataUrl) {
      const key = 'prod_img_' + productId;
      const savedInIdb = await saveImageToIndexedDB(key, dataUrl);
      if (!savedInIdb) {
        // Fallback: store small thumbnail/compressed directly in localStorage if quota allows
        try {
          localStorage.setItem('shop_img_' + productId, dataUrl);
        } catch (e) {
          console.warn('LocalStorage image quota exceeded:', e);
        }
      }
      return key;
    },

    /**
     * Resolves product image source (handles IndexedDB / local paths / dataUrls).
     */
    async resolveProductImage(product) {
      if (!product) return this.DEFAULT_IMAGE;
      if (product.customImageKey) {
        const idbData = await getImageFromIndexedDB(product.customImageKey);
        if (idbData) return idbData;
        const localFallback = localStorage.getItem('shop_img_' + product.id);
        if (localFallback) return localFallback;
      }
      return product.image || this.DEFAULT_IMAGE;
    },

    /**
     * Removes associated custom image from storage if deleted.
     */
    async removeProductImage(product) {
      if (!product) return;
      if (product.customImageKey) {
        await deleteImageFromIndexedDB(product.customImageKey);
        localStorage.removeItem('shop_img_' + product.id);
      }
    },

    /**
     * Retrieve shop settings.
     */
    getSettings() {
      this.init();
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return raw ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)) : DEFAULT_SETTINGS;
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    },

    /**
     * Update shop settings.
     */
    saveSettings(settings) {
      try {
        const current = this.getSettings();
        const updated = Object.assign({}, current, settings);
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
        return true;
      } catch (e) {
        console.error('Failed to save settings:', e);
        return false;
      }
    },

    /**
     * Export all data as a JSON file for backup.
     */
    async exportBackup() {
      const products = this.getProducts();
      // Include any stored custom images in the export
      const enrichedProducts = await Promise.all(
        products.map(async (p) => {
          const resolvedImg = await this.resolveProductImage(p);
          return {
            ...p,
            imageData: resolvedImg.startsWith('data:') ? resolvedImg : null
          };
        })
      );

      const backupData = {
        app: 'shop-billing-system',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        settings: this.getSettings(),
        nextProductId: parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_PRODUCT_ID), 10) || 106,
        nextBillNumber: parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_BILL_NUM), 10) || 1001,
        products: enrichedProducts
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `tailor_shop_billing_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
    },

    /**
     * Import and restore data from a JSON backup file.
     * @param {File} file 
     * @returns {Promise<boolean>}
     */
    async importBackup(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (!data.products || !Array.isArray(data.products)) {
              throw new Error('Invalid backup file: missing products array.');
            }

            // Restore settings
            if (data.settings && typeof data.settings === 'object') {
              this.saveSettings(data.settings);
            }

            // Restore counters
            if (data.nextProductId && !isNaN(data.nextProductId)) {
              localStorage.setItem(STORAGE_KEYS.NEXT_PRODUCT_ID, String(data.nextProductId));
            }
            if (data.nextBillNumber && !isNaN(data.nextBillNumber)) {
              localStorage.setItem(STORAGE_KEYS.NEXT_BILL_NUM, String(data.nextBillNumber));
            }

            // Restore products and images
            const sanitizedProducts = [];
            for (const item of data.products) {
              const prod = {
                id: parseInt(item.id, 10),
                name: String(item.name || 'Unnamed Item').trim(),
                price: parseFloat(item.price) || 0,
                image: item.image || this.DEFAULT_IMAGE,
                customImageKey: item.customImageKey || null
              };

              // If backup contains base64 image data, re-persist into IndexedDB
              if (item.imageData && item.imageData.startsWith('data:')) {
                const key = await this.saveProductImage(prod.id, item.imageData);
                prod.customImageKey = key;
              }

              sanitizedProducts.push(prod);
            }

            this.saveProducts(sanitizedProducts);
            resolve(true);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    },

    /**
     * Reset everything back to original factory initial state if requested.
     */
    factoryReset() {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.NEXT_PRODUCT_ID);
      localStorage.removeItem(STORAGE_KEYS.NEXT_BILL_NUM);
      this.init();
    }
  };

  // Expose globally
  window.ShopStorage = ShopStorage;
  ShopStorage.init();

})(window);
