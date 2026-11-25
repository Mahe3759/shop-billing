# Simple Menu-Based Billing System

A lightweight, fast, and professional static billing application designed specifically for clothing and tailoring shops. Built with standard **HTML5, CSS3, and Vanilla JavaScript** — 100% serverless, zero external dependencies, no database server, no login, and completely free to host on **GitHub Pages**.

---

## 🌟 Key Highlights & Features

1. **Menu-First Layout:**
   - Products are the very first thing visible when opening the app.
   - Clean, high-contrast product cards with product number (`#101`, `#102`), product visual, product name, and price.
   - Immediate recognition for customers who identify items visually.
   - Initial 5 tailoring items built-in:
     - `#101` **Lining Cloth** (₹40.00)
     - `#102` **Lining Jacket** (₹350.00)
     - `#103` **Saree False** (₹30.00)
     - `#104` **Dress** (₹450.00)
     - `#105` **Pencil Cut** (₹250.00)

2. **Add New Menu in Future (No Code Editing Needed):**
   - Click the prominent **"+ Add New Menu"** button at the top of the menu.
   - Enter Product Name, Price, and an optional image upload (PNG, JPG, WebP, SVG).
   - Automatically assigns a unique, permanent product ID (e.g. `#106`, `#107`, ...).
   - **Non-reusable IDs:** Deleted product numbers are permanently retired and never reused.
   - Edit prices, names, or delete products anytime directly in the browser interface.

3. **Fast & Intuitive Billing Counter:**
   - Type a Product Number: immediately auto-identifies product name and price.
   - Or **click any product card** in the menu to add it straight to the bill!
   - Quantity adjustment directly inside the billing table (`+`, `-`, or typed number).
   - Real-time calculation:
     $$\text{Subtotal} = \text{Quantity} \times \text{Unit Price}$$
     $$\text{Grand Total} = \sum \text{Subtotals}$$

4. **Receipt Generation, Browser Printing & Screenshot:**
   - Generates a clean, professional paper receipt layout with Bill Number, Date, Time, Shop Name, Item Breakdown, and Grand Total.
   - **🖨 Print Bill:** Clean print stylesheet (`@media print`) hides web UI and formats directly for A4 or thermal receipt printers.
   - **📸 Save Screenshot (PNG):** Built-in native HTML5 Canvas renderer creates a downloadable receipt screenshot image (`Bill_1001_Receipt.png`) without any third-party libraries.
   - **↺ Reset to Zero:** Easily clear all items and reset all totals and inputs back to zero ready for the next customer.

5. **Local Data Persistence & Backup:**
   - Uses `localStorage` for product records, sequential bill numbers, and settings.
   - Uses `IndexedDB` for high-resolution custom product photo uploads to avoid storage limits.
   - **Survives page refresh and browser restarts.**
   - **JSON Export / Restore:** Download a single-file backup (`.json`) and restore it on any device.

---

## 📁 Project Structure

```
shop-billing/
├── index.html              # Main application markup & modal dialogs
├── css/
│   └── style.css           # Clean, responsive styles, card grid & print stylesheet
├── js/
│   ├── storage.js          # Persistence layer (localStorage, IndexedDB, JSON backup/restore)
│   ├── products.js         # Menu rendering, Add/Edit/Delete products, image optimizer
│   ├── billing.js          # Cart state, subtotal/grand total math, receipt & canvas screenshot
│   └── app.js              # Lifecycle orchestration, shortcuts (F2/F4) & shop settings
├── images/
│   └── products/           # Crisp vector SVG visuals for initial products
│       ├── lining-cloth.svg
│       ├── lining-jacket.svg
│       ├── saree-false.svg
│       ├── dress.svg
│       ├── pencil-cut.svg
│       └── default.svg
└── README.md               # Documentation and deployment manual
```

---

## 🔍 Detailed Source File Breakdown

| File | Role & Implementation Details |
| :--- | :--- |
| **`index.html`** | Structure of the app. Organizes the interface strictly with the **Available Menu** first, followed by the **Billing Counter**, footer persistence disclaimers, and accessible modal dialogs for Adding/Editing products, Shop Settings, and Receipt Generation. |
| **`css/style.css`** | Implements the minimal, high-contrast business aesthetic with a royal navy accent (`#1e3a8a`). Includes mobile-first responsive media queries and `@media print` rules for thermal/A4 printing. |
| **`js/storage.js`** | Manages local browser storage. Seeds the 5 default tailoring items on first load, handles non-reusable sequential product IDs, bill sequence numbers, and provides asynchronous IndexedDB image storage and JSON backup export/import. |
| **`js/products.js`** | Handles the Menu section. Renders product cards, binds card clicks to billing, handles image downscaling via an in-memory canvas (max 400x400), validates inputs, and triggers catalog updates. |
| **`js/billing.js`** | Handles the Billing section. Instant product lookup by ID, item quantity manipulation, subtotal/grand total calculations, print dialog, and a custom HTML5 Canvas receipt rendering engine for screenshot image downloads. |
| **`js/app.js`** | Orchestrator. Bootstraps modules on `DOMContentLoaded`, manages shop settings (shop name, address, phone), and binds keyboard shortcuts (`F2` to add product, `F4` to jump to billing). |

---

## 🚀 How to Run Locally

Because this project is built entirely with standard web technologies, you can run it immediately on any computer:

### Option A: Open directly in any Web Browser
1. Navigate to the `shop-billing` folder.
2. Double-click `index.html` or right-click $\rightarrow$ **Open with** $\rightarrow$ **Google Chrome / Microsoft Edge / Firefox / Safari**.

### Option B: Run via a lightweight local development server
If you prefer running through `localhost`:

- **Using Python 3:**
  ```bash
  cd shop-billing
  python -m http.server 8000
  ```
  Open `http://localhost:8000` in your browser.

- **Using Node.js (npx serve):**
  ```bash
  cd shop-billing
  npx serve .
  ```

- **Using VS Code:**
  Install the **Live Server** extension, right-click `index.html`, and select **Open with Live Server**.

---

## 🌐 Deploying to GitHub Pages (Free Static Hosting)

You can publish this static billing system on GitHub Pages for free in less than 2 minutes.

### Step 1: Create a GitHub Repository
1. Log in to your [GitHub](https://github.com/) account.
2. Click the **+** (plus icon) at the top right and select **New repository**.
3. Name your repository (e.g., `tailor-billing-system`).
4. Set visibility to **Public**.
5. Do not check "Add a README file" (we already have one).
6. Click **Create repository**.

### Step 2: Push the Files to GitHub
Open your terminal / command prompt in the `shop-billing` directory:

```bash
cd path/to/shop-billing

# Initialize git repository
git init

# Add all project files
git add .

# Create initial commit
git commit -m "Initial release of simple tailor shop billing system"

# Set default branch to main
git branch -M main

# Link to your remote GitHub repository (replace with your repository URL)
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git

# Push to GitHub
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub.
2. Click **Settings** (tab at the top right).
3. In the left navigation menu under "Code and automation", click **Pages**.
4. Under **Build and deployment**:
   - **Source:** Select `Deploy from a branch`.
   - **Branch:** Select `main` and folder `/ (root)`.
   - Click **Save**.
5. Wait 30 to 60 seconds. Refresh the page until you see:
   > *"Your site is live at `https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/`"*

### Important Note on GitHub Pages:
> [!NOTE]
> GitHub Pages is a high-speed, secure **static website host**. It does not run a server or database. All products, prices, and bills are saved client-side in the browser's `localStorage` and `IndexedDB`. Data belongs to the device/browser being used. Use the **Export Backup (JSON)** button in the footer to back up or move data between computers or phones!

---

## 🧪 Testing and Verification Checklist

After opening or deploying the application, perform these quick verification tests:

- [x] **Menu Display:** Verify the 5 initial products appear with images, numbers (`#101` to `#105`), names, and prices.
- [x] **Add New Menu:** Click **"+ Add New Menu"**, create a product (e.g., `"Cotton Kurta"`, Price: `500`), and confirm it gets auto-assigned `#106` and appears immediately in the grid.
- [x] **Page Refresh Check:** Refresh the browser; confirm the newly added product remains present.
- [x] **Product Lookup:** In the billing box, type `101`; verify it automatically shows `Lining Cloth — ₹40.00`.
- [x] **Menu Click-to-Bill:** Click any product card directly in the menu; verify it automatically enters into the billing inputs.
- [x] **Add to Bill:** Enter quantity `3`, click **"Add to Bill"**; verify subtotal calculates as $3 \times 40 = 120.00$ and Grand Total updates.
- [x] **Quantity Adjustment:** Click `+` and `-` in the bill table; observe instant subtotal and grand total recalculations.
- [x] **Receipt Generation:** Click **"Generate Bill & Print"**; verify shop name, bill number, date, time, and totals match.
- [x] **Screenshot Export:** Click **"Save Screenshot (PNG)"**; verify a crisp `.png` image of the receipt downloads to your device.
- [x] **Reset to Zero:** Click **"Reset Bill to Zero"**; confirm table empties and Grand Total resets to `₹0.00`.
- [x] **JSON Backup & Restore:** Click **"Export Backup (JSON)"** to download the file, delete a test product, then click **"Restore Backup (JSON)"** to confirm data restores seamlessly.
