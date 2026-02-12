## Inventory Demo (React + Firebase)

An inventory and sales management demo built with React, Vite, Chakra UI, and Firebase. It supports user roles (admin/manager), product and inventory tracking, sales invoices, PDF reports, and low‑stock notifications.

You can visit [MiniPOSInventory](inventory-demo-da8e6.web.app to view the demo)

### Features
- **Authentication & Roles**: Email/password auth with `admin` and `manager` roles.
- **Products & Inventory**: Manage products, view live inventory, and enforce quantity checks during sales.
- **Sales & Invoicing**: Create invoices with auto‑generated invoice numbers, line items, totals, and a detailed invoice viewer.
- **Reports (PDF)**: Filter sales by date and customers; export to PDF using `jspdf` + `autotable`.
- **Notifications**: Persisted low‑stock alerts in Firestore; optional email notifications via EmailJS.
- **Responsive UI**: Chakra UI components with mobile‑friendly layouts.

### Tech Stack
- React 18, Vite 7
- Chakra UI
- Firebase (Auth, Firestore)
- jsPDF + jspdf-autotable
- EmailJS (optional)

### Quick Start
```bash
# 1) Install deps
npm install

# 2) Start dev server
npm run dev

# 3) Build for production
npm run build

# 4) Preview local production build
npm run preview
```

### Project Scripts
- `npm run dev`: Start Vite dev server
- `npm run build`: Production build to `dist/`
- `npm run preview`: Preview `dist/`
- `npm run lint`: Run ESLint

### Configuration

#### 1) Firebase
Update `src/firebase.js` with your Firebase project credentials.

```js
// src/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: 'KEY',           // <-- your API key
  authDomain: 'DOMAIN',    // <-- your auth domain
  projectId: 'ID',         // <-- your project ID
  storageBucket: 'BUCKET', // <-- your storage bucket
  messagingSenderId: 'ID', // <-- your sender id
  appId: 'ID',             // <-- your app id
  measurementId: 'ID',     // optional
}

// Initialize Firebase app and clients
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
```

Firestore Collections used:
- `users/{uid}`: `{ role: 'admin' | 'manager' }`
- `products/{productId}`: `{ name, sku, description, price, alert_limit?, productId? }`
- `inventory/{docId}`: `{ productId, productName, quantity }`
- `customers/{customerId}`: `{ name, company, ... }`
- `sales/{saleId}`: `{ invoiceNo, date, customerId, customerName, items[], total, createdAt }`
- `notifications/{id}`: `{ message, timestamp, admin_read, manager_read }`
- `settings/global`: `{ alert_email }` (used by EmailJS)

Basic Firestore security rules guidance (adjust to your needs):
```js
// Allow authenticated users; restrict writes by role (sketch)
// IMPORTANT: Add robust validation before production use.
```

#### 2) Roles & First Login
1. Create a user in Firebase Authentication (Email/Password).
2. In Firestore, create `users/{uid}` with:
```json
{
  "role": "admin" // or "manager"
}
```
3. Log in at the app’s `/login` route. Protected routes redirect unauthenticated users to login.

#### 3) Optional: EmailJS (Low‑Stock Emails)
If you want email notifications when inventory drops below the alert limit:
1. Set your EmailJS credentials in `src/utils/emailService.js`.
```js
// src/utils/emailService.js
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY' // <-- set me
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID' // <-- set me
// In emailjs.send(...) also set your TEMPLATE_ID
```
2. In Firestore, set `settings/global` → `alert_email: "admin@example.com"`.
3. Use the provided `testEmailJS()` helper if needed.

### Usage Notes
- **Invoice numbers**: Generated as `YYYYMMDD-XXX` based on the selected date and latest invoice.
- **Inventory checks**: Sales validate requested quantity <= available stock; inventory is decremented on successful sale.
- **Low‑stock alerts**: When inventory falls below a product’s `alert_limit` (default 5), a notification is added; optional email is sent if EmailJS is configured.
- **Reports**: Filter by date range and selected customers; toggle price visibility; export to PDF.
- **Price visibility**: In Sales and Reports, totals/prices can be toggled for quick privacy.

### App Structure (high‑level)
```
src/
  App.jsx                 # Router & protected routes
  firebase.js             # Firebase init (Auth, Firestore)
  contexts/AuthContext.jsx# Auth state, roles, helpers
  pages/
    DashboardPage.jsx     # Shell with panels & sidenav
    DashboardPanel.jsx    # Role summary & stats
    ProductsPanel.jsx     # Products CRUD
    InventoryPanel.jsx    # Inventory view & updates
    CustomersPanel.jsx    # Customers CRUD
    SalesPanel.jsx        # Create/list invoices, inventory deduction
    ReportsPanel.jsx      # Filters, PDF export
    SettingsPanel.jsx     # Settings (e.g., alert email)
  components/
    Pagination.jsx        # Reusable pagination
    Navbar.jsx            # Top navigation (if used)
  utils/
    emailService.js       # Optional EmailJS notifications
```

### Development Tips
- Use the built‑in role helpers from `useAuth()` such as `isAdmin` and `isManager` to conditionally render controls.
- Keep `products.alert_limit` set to receive timely low‑stock notifications.
- Seed minimal data: one admin user, a couple of products, inventory entries referencing product ids, and a customer.

### Deployment
Any static host that serves the `dist/` folder works (e.g., Netlify, Vercel, Firebase Hosting, GitHub Pages with SPA routing considerations).
