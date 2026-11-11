# Artha — My Finance

**Artha** (Sanskrit: *wealth, prosperity*) is the project behind **My Finance**, a personal finance management web app
built around a fully dynamic **Main Type → Subtype → Item** category hierarchy.

```
artha-my-finance/
├── my-finance-frontend/   React 18 + Vite + Tailwind + Recharts   (Phases 1–2: done)
└── my-finance-backend/    Spring Boot 3 + Java 21 + MySQL 8        (Phase 3+)
```

## Phase status

| Phase | Scope | Status |
|------:|-------|--------|
| 1 | Responsive React UI with realistic mock data | ✅ |
| 2 | Dynamic category management, 3-level dependent dropdowns, inline "Add New" | ✅ |
| 3 | MySQL schema, entities, Flyway migrations | next |
| 4 | Spring Boot REST APIs | |
| 5 | React ↔ Spring Boot integration (`VITE_USE_MOCK_API=false`) | |
| 6 | Double-entry ledger & financial calculations | |
| 7 | Dashboard / reports on real data, server PDF & XLSX export | |
| 8 | JWT auth, security, tests | |
| 9 | Deployment | |

## Quick start

```bash
cd my-finance-frontend
npm install
npm run dev        # http://localhost:5173
```

See [my-finance-frontend/README.md](my-finance-frontend/README.md) for details.
