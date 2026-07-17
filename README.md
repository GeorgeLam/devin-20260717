# NovaOps admin suite

A front-end-only React admin dashboard prototype for a fintech operations team. It is built with Vite, React 19, TypeScript, and plain CSS. All state is persisted to `localStorage` so the app can be run and tested without a backend.

Live repo: https://github.com/GeorgeLam/devin-20260717

## Tools

### Feature flags

- Separate **Staging** and **Production** environments.
- Toggle booleans and select enum values in staging instantly.
- Production changes create pending approval requests.
- Sensitive flags require a textual reason before the request can be submitted.
- Reviewers can approve or reject requests; sensitive flag requests cannot be approved by the same user who created them.
- Every change is recorded in an immutable audit log, shown in a history modal with a table and UTC-second timestamps.

### KYC review queue

- Four status tabs: **In review**, **Approved**, **Rejected**, and **Waiting for customer information**.
- Two-pane layout: filter/search/sort the case list on the left, view case details on the right.
- Case detail shows applicant identity, documents, risk screening results (PEP, sanctions, adverse media), and an FCA-grade audit trail.
- Reviewers must assign a case to themselves before approving, rejecting, or requesting information.
- Rejection uses a dropdown of reasons plus a conditional `Other` text box.
- Requesting information uses multi-select checkboxes plus a conditional `Other` text box.
- Cases can be unassigned and notes can be added; all actions are logged.

### Refunds dashboard

- Six status tabs: **Pending review**, **Approved**, **Rejected**, **Processed**, **Failed**, and **Waiting for info**.
- Summary metric cards for each status.
- Two-pane queue and detail view with sort and search controls.
- Assignment gating for approve, reject, process, fail, and request-info actions.
- Rejection reasons and information requests follow the same pattern as the KYC queue.
- Status-changing actions automatically switch to the destination tab to keep context.
- Notes and an immutable audit trail are attached to every refund.

### Shared UI

- Left sidebar navigation with expandable tool groups and a live user switcher.
- User avatars on list items showing assigned reviewer initials.
- Light/dark mode toggle in the top bar.
- Toast notifications for key actions.
- Pane-level scrolling so the overall page does not scroll.

## Getting started

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

### Other commands

```bash
npm run build     # Type-check and build for production
npm run preview   # Preview the production build locally
npm test          # Run the Vitest + React Testing Library test suite
npm run lint      # Run oxlint
```

## Running tests

Tests live alongside the source files:

- `src/featureFlags.test.tsx`
- `src/kyc.test.tsx`
- `src/refunds.test.tsx`

They use `happy-dom` and reset `localStorage` between tests. Run them with:

```bash
npm test
```

## Architecture

- **Vite + React 19 + TypeScript.**
- **State management** is done with custom hooks backed by `localStorage`:
  - `useFlagStore` for feature flags.
  - `useKycStore` for KYC cases.
  - `useRefundStore` for refund requests.
- **User context** (`user.tsx`) provides the current actor; switching users updates assignment gating and audit logs.
- **Theme context** (`theme.tsx`) persists light/dark preference.
- **Toast context** (`toast.tsx`) displays action confirmations.

## Resetting data

Because the app is localStorage-backed, clearing the following keys resets state:

- `ff-admin-demo-state`
- `kyc-review-queue-state`
- `refunds-dashboard-state`
- `novaops-current-user`
- `novaops-theme`

## Notes

- This prototype intentionally has no backend. Persistence, auth, multi-user concurrency, and audit immutability would need a server for a production deployment.
- The `oxlint` binary can be missing its optional Linux native binding in some environments; that does not affect the build or tests.
