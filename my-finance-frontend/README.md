# My Finance — Frontend

React 18 · Vite 5 · Tailwind CSS 3 · React Router 6 · Axios · Recharts · Lucide React

## Run

```bash
npm install
npm run dev       # dev server → http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the production build
```

Node 18+ required (tested on Node 22).

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `VITE_USE_MOCK_API` | `true` | `true` = in-browser mock API (Phases 1–2). `false` = real Spring Boot backend. |
| `VITE_API_BASE_URL` | `/api` | Backend base URL. In dev, `/api` is proxied to `http://localhost:8080` (see `vite.config.js`). |

## How the mock API works (Phases 1–2)

Components never contain category data. They call the service layer (`src/services/*`), which uses Axios with
the **exact REST contract** planned for Spring Boot (`/api/categories`, `/api/categories/{id}/subcategories`,
`/api/subcategories/{id}/items`, `/api/transactions`, `/api/dashboard/*`, `/api/reports/*`, …).

While `VITE_USE_MOCK_API=true`, a custom Axios **adapter** (`src/services/mock/mockServer.js`) answers those requests
from a localStorage "database" (`src/services/mock/mockDb.js`) that mirrors the MySQL tables. The default category
hierarchy in `src/services/mock/seed.js` plays the role of the future Flyway seed migration.

Phase 5 switches to the backend by setting `VITE_USE_MOCK_API=false`. No component changes are needed, and the mock
code is lazy-loaded so it never ships when disabled.

To reset data: **Settings → Restore demo data / Start fresh**.

## Structure

```
src/
├── components/
│   ├── ui/              SmartSelect (dropdown + “Add New”), Modal, form fields, icons, MonthPicker
│   ├── categories/      CategoryCascade (3 dependent dropdowns), CategoryFormModal, CategoryTree
│   ├── transactions/    TransactionRow, RecentTransactions, UpiAppModal
│   └── charts/          CategoryDrilldown (Main Type → Subtype → Item → transactions), chart parts
├── context/             CategoryContext (hierarchy cache + invalidation), ToastContext
├── hooks/               useAsync, useDebounce, useMediaQuery, useFinanceLookups
├── layouts/             AppLayout (desktop sidebar, mobile top bar + bottom nav)
├── pages/               Dashboard, AddTransaction, Transactions, Reports, Accounts, Investments,
│                        BorrowGive, Categories, Settings
├── services/            apiClient (Axios), categoryService, financeService, mock/
└── utils/               format (INR, dates), constants (enums), icons registry, export (CSV/print)
```

## Dynamic category rules (Phase 2)

* Subtype is locked until a Main Type is chosen. Item is locked until a Subtype is chosen.
* Changing the Main Type clears Subtype and Item. Changing the Subtype clears Item.
* Every dropdown ends with **+ Add New …**, which opens a small modal. The new node is saved through the API
  under the selected parent, the list is re-fetched, and the new node is auto-selected without a page reload.
* Duplicate names are rejected within the same parent (case- and whitespace-insensitive), on the client
  for instant feedback and again on the server.
* Deactivate hides a node from forms only. Historical transactions keep their category, and reports still
  include it. Nodes can be reactivated.
* Dashboard, drill-down charts and reports aggregate by category id on the server, so new categories appear
  automatically once they have transactions.
