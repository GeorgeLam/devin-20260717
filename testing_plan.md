# NovaOps testing plan

## Approach

Use **Vitest + jsdom + React Testing Library** for integration-level tests. The stores hold all business logic and the audit trail, so the tests exercise:

1. Custom store hooks in `store.ts`, `kycStore.ts`, and `refundStore.ts`.
2. Key component flows in `App.tsx`, `KycQueue.tsx`, and `RefundsDashboard.tsx` (tab navigation, action gating, modals, self-approval).

This avoids a full end-to-end test runner while still covering the user-visible behavior of all three tools.

## Tool coverage

### Feature flags

- Staging boolean/enum changes update the flag and append an audit event.
- Production changes create a pending request (not a live change).
- Sensitive production changes require a reason before the request is submitted.
- Pending requests are deduplicated per flag.
- Reviewer can approve/reject pending requests.
- Audit log records the new value, old value, actor, environment, and timestamp.
- A user cannot approve their own sensitive production requests from the approval queue.

### KYC review queue

- Cases are seeded and grouped by status tabs.
- Search filters the case list and updates tab counts.
- A reviewer must assign a case to themselves before approve/reject/request-info actions are enabled.
- Rejecting a case requires choosing a reason; selecting `Other` reveals a mandatory text box.
- Requesting information moves the case to `waiting-for-info` and records the requested items and note.
- Reopening a case moves it back to `in-review`.
- Notes are added to the case and logged in the audit trail.
- Every action creates an immutable audit event with previous/new status, actor, and timestamp.

### Refunds dashboard

- Refunds are seeded and grouped by status tabs.
- Summary metrics reflect the queue counts (pending value, overdue, high-value).
- A reviewer must assign a refund to themselves before approve/reject/process/fail/request-info actions are enabled.
- Rejecting requires a reason; `Other` reveals a text box.
- Approving/Processing/Failing/Rejecting updates status and switches the active tab to the new status.
- Reopening moves the refund back to `pending-review`.
- Requesting information moves the refund to `waiting-for-info`.
- Notes and actions are recorded in the refund audit log.

## Setup decisions

- `vitest.config.ts` uses `@vitejs/plugin-react`, `jsdom`, and a single `src/test/setup.ts` file.
- `tsconfig.app.json` excludes test files so `npm run build` (which runs `tsc -b`) is not polluted by test-only imports.
- `tsconfig.test.json` extends the app config with `vitest/globals` and `@testing-library/jest-dom` types.
- Each test resets `localStorage` keys (`ff-admin-demo-state`, `kyc-review-queue-state`, `refunds-dashboard-state`, `novaops-current-user`, `novaops-theme`) before running and wraps renders in `ThemeProvider`, `UserProvider`, and `ToastProvider`.

## Test files

| File | Scope |
|------|-------|
| `src/test/setup.ts` | Global setup, `jest-dom` matchers, `localStorage` reset. |
| `src/test/wrapper.tsx` | Shared provider wrapper for renders. |
| `src/featureFlags.test.tsx` | Feature flag store + `App` approval queue flow. |
| `src/kyc.test.tsx` | `KycQueue` component flow (assign, reject, request info, reopen). |
| `src/refunds.test.tsx` | `RefundsDashboard` component flow (assign, approve, reject, process, reopen). |

