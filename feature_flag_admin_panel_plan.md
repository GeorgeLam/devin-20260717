# Feature Flag Admin Panel — Demo Prototype Plan

## 1. Context & Goal

Build a front-end prototype of an internal feature-flag admin panel for a Series C fintech. The tool is meant to replace a Retool-based panel used by product, engineering, ops, and security/compliance teams. This version is a single-page React application with a mocked backend — no auth, no API, no external persistence except local state and `localStorage`.

## 2. Scope Decisions

| Topic | Decision |
|---|---|
| Stack | React 18 + TypeScript + Vite 5.4.21 (`@vitejs/plugin-react@4`). Plain CSS, no Tailwind or component library. |
| Backend | None. All data is mocked in-memory inside the app and persisted to `localStorage`. |
| Auth | None for the demo. A hardcoded `currentUser = 'demo-user'` is used for audit/request attribution. |
| Flag types | Boolean and enum (string) values. |
| Environments | Two tabs: **Staging** and **Production**. |
| Staging changes | Anyone can toggle immediately; changes are reflected in real time and logged to the flag's audit trail. |
| Production changes | Any change creates an **approval request**. The live production value does not change until approved. |
| Sensitive flags | High-value/sensitive production flags are visually marked and require a mandatory reason on the request modal. |
| Approval ownership | Any user can approve or reject any pending request for the demo. |
| One pending request per flag | The store updates an existing pending request rather than creating duplicates. |

## 3. Functional Requirements

### 3.1 Navigation Shell
- Left sidebar with a brand mark and name (`NovaOps`).
- One active tools section: **Feature flags**.
- Under **Feature flags**, two sub-items:
  - **Flags** — the main flag table.
  - **Approval requests** — the approval queue. Shows a red count badge only when pending requests exist.
- Top bar with the current page title + subtitle and a user avatar.
- Content area uses a page header, card-based table, and modal overlays.

### 3.2 Flag List / Flags Page
- Table columns: **Flag** (name + key + badges), **Type**, **Environment value**, **Environment**, **Owner**, **Actions**.
- Search/filter by name or key.
- Environment badge (`staging` / `production`).
- Sensitive badge (`Sensitive`).
- Boolean flags use a custom toggle switch.
- Enum flags use a native `<select>` of allowed options.

### 3.3 Staging Tab
- Any toggle or enum change applies immediately to `flag.stagingValue`.
- An `update` audit event is recorded.

### 3.4 Production Tab
- Toggling or changing an enum value opens a confirmation modal.
- The modal displays:
  - Flag name.
  - Old value → requested new value.
  - A warning for sensitive flags.
  - A **mandatory reason textarea** (required only for sensitive flags; `Submit` is disabled until filled).
- Submitting creates or updates one pending request for that flag.
- The live production value remains unchanged.
- Pending state is surfaced under the value control as a small note:
  - If the current user requested it: *“You have a pending approval request. You tried to change this value to **On** at **Jul 17, 03:45 PM**.”*
  - If another user requested it: *“A pending approval request exists to change this value to **On** by **sarah.chen** at **Jul 17, 03:45 PM**.”*
- The switcher/select stays visually active (not greyed out) but does not apply the change until approval.

### 3.5 Approval Requests Page
- Lists every pending `ChangeRequest`.
- Each row shows:
  - Flag name.
  - `production` and `Sensitive` badges.
  - `Change **Off** → **On**`.
  - Requester and timestamp.
  - The change reason.
- Actions: **Approve** and **Reject**.
- On approval: set `flag.productionValue` to the requested value, record an `approve` audit event, and update the request status.
- On rejection: leave the live value unchanged, record a `reject` audit event, and update the request status.

### 3.6 History Modal
- Reachable via a clock icon in each row's **Actions** column.
- Modal shows flag name, key, description, owner, sensitivity, current staging/production values, and a full audit log.
- Audit log is a table with columns:
  - Action
  - Environment
  - Old value
  - New value
  - Actor
  - Timestamp (UTC)
- Timestamps are formatted in UTC with seconds: `2026-07-17 15:42:03 UTC`.

### 3.7 Example Fintech Flags (Seed Data)

| Key | Name | Type | Sensitive | Owner |
|---|---|---|---|---|
| `new-onboarding-flow` | New onboarding flow | boolean | no | Product — Growth |
| `plaid-link-v2` | Plaid Link v2 integration | boolean | no | Engineering — Connections |
| `instant-withdrawal` | Instant withdrawal | boolean | yes | Product — Payments |
| `wire-fee-promo` | Wire fee promotional pricing | enum: `standard` / `discounted` / `waived` | yes | Revenue — Treasury |
| `high-value-auth-step-up` | Step-up auth for high-value transfers | boolean | yes | Security — Fraud |
| `kyc-document-ai` | AI-powered KYC document review | boolean | no | Compliance — KYC |
| `interest-rate-display` | Show live interest rate banner | enum: `hidden` / `banner` / `full` | no | Marketing — Engagement |
| `p2p-transfers` | Peer-to-peer transfers | boolean | yes | Product — Payments |
| `fraud-realtime-scoring` | Real-time fraud scoring | boolean | yes | Security — Fraud |
| `crypto-buy-flow` | Cryptocurrency purchase flow | boolean | yes | Product — Crypto |

Seed at least one pending request so the Approval requests tab is not empty on first load.

## 4. Project Structure

```
feature-flag-admin/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx            # Main application shell, routing by page, modals
    ├── types.ts           # Domain types
    ├── data.ts            # Seed flags + seed approval request
    ├── store.ts           # useFlagStore: in-memory state + localStorage
    └── index.css          # All styles (no Tailwind)
```

### Note on component organization
All UI is currently contained in `App.tsx` with small inline icon components. For a real codebase this should be split into `components/` later, but for the demo a single file is sufficient.

## 5. Data Shapes

```ts
type FlagType = 'boolean' | 'enum';

type FlagValue = boolean | string;

interface Flag {
  id: string;
  key: string;
  name: string;
  description: string;
  type: FlagType;
  options?: string[];
  stagingValue: FlagValue;
  productionValue: FlagValue;
  sensitive: boolean;
  owner: string;
  updatedAt: string;
  auditLog: AuditEvent[];
}

interface ChangeRequest {
  id: string;
  flagId: string;
  environment: 'production';
  requestedValue: FlagValue;
  previousValue: FlagValue;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  reviewedAt?: string;
  reviewedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface AuditEvent {
  id: string;
  flagId: string;
  environment: 'staging' | 'production';
  action: 'create' | 'update' | 'request' | 'approve' | 'reject';
  oldValue: FlagValue;
  newValue: FlagValue;
  actor: string;
  timestamp: string;
}

interface AppState {
  flags: Flag[];
  requests: ChangeRequest[];
}
```

## 6. Store Behavior (`src/store.ts`)

- Load from `localStorage` on mount; fall back to seed data.
- Persist to `localStorage` on every state change.
- Exposed actions:
  - `updateStaging(flagId, value)` — updates `stagingValue` and appends `update` audit event.
  - `requestProductionChange(flagId, value, reason)` — for production changes:
    - If an existing pending request for the same flag exists, update it (new value, new reason, new timestamp, new actor). Do **not** create a duplicate.
    - If no pending request exists, create one.
    - Append a `request` audit event to the flag.
  - `approveRequest(id)` / `rejectRequest(id)` — review the request and append `approve`/`reject` audit events.

## 7. UI/UX Details

### 7.1 Design Tokens (CSS variables)
Use a light, modern admin palette:

```css
:root {
  --bg-body: #f3f4f6;
  --bg-card: #ffffff;
  --bg-subtle: #f9fafb;
  --text-primary: #111827;
  --text-secondary: #374151;
  --text-muted: #6b7280;
  --border: #e5e7eb;
  --accent: #2563eb;
  --accent-light: #eff6ff;
  --success: #16a34a;
  --success-light: #dcfce7;
  --danger: #dc2626;
  --danger-light: #fee2e2;
  --warning: #d97706;
  --warning-light: #fef3c7;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### 7.2 Layout
- Sidebar width ~240px, fixed left.
- Top bar height 64px, fixed top.
- Content scrolls with `padding: 32px`.
- Cards use `border: 1px solid var(--border)`, `border-radius: 12px`, subtle shadow.

### 7.3 Badges
- `staging` → muted blue/grey.
- `production` → red/danger.
- `Sensitive` → amber warning.
- Pending approval should **not** be a separate badge under the flag name for the production table; instead use the sub-line under the value control.

### 7.4 Pending Count Badge
- Only the **Approval requests** sidebar sub-item showing a red badge with the pending count.
- Do **not** put a pending badge on the Staging/Production tabs.

### 7.5 Request Modal
- For sensitive flags, the modal contains an alert banner and a mandatory `Reason for change` textarea.
- `Submit request` is disabled until the reason has non-whitespace content.
- The modal body shows: *“You are requesting to change **Flag Name** in production from **Off** to **On**.”*

## 8. Implementation Steps

1. **Scaffold**:
   - `npm create vite@5.4.21 feature-flag-admin -- --template react-ts`
   - Or manually fix `vite` to `5.4.21` and `@vitejs/plugin-react` to `^4.0.0` (newer Vite/oxlint may fail to find optional native Linux bindings in this sandbox).
2. **Write domain types** in `src/types.ts`.
3. **Seed data** in `src/data.ts`:
   - `initialFlags` with 10 fintech flags.
   - `initialRequests` with at least one pending sensitive request that includes a `reason`.
4. **Implement `src/store.ts`**:
   - `useFlagStore` with `useState` + `useEffect` for `localStorage` persistence.
   - Actions: `updateStaging`, `requestProductionChange`, `approveRequest`, `rejectRequest`.
   - Enforce single pending request per flag in `requestProductionChange`.
5. **Implement `src/App.tsx`**:
   - Inline icon components: `FlagIcon`, `SearchIcon`, `AlertIcon`, `HistoryIcon`, `FileTextIcon`.
   - `Page` state: `'flags'` | `'approvals'`.
   - `Environment` state: `'staging'` | `'production'`.
   - Render sidebar, topbar, flags table, approval queue.
   - Render history modal and production-change confirmation modal.
6. **Write `src/index.css`**:
   - CSS variables, Inter font import.
   - Sidebar, topbar, content, tables, toggles, selects, buttons, badges, modals, audit table, pending note, reason textarea.
7. **Build & verify**:
   - `npm run build` (runs `tsc -b && vite build`).
   - If `npm run lint` fails due to missing `oxlint` native binding, skip lint and rely on `tsc` + `vite build`.
   - `npx vite preview --port 4173 --host 0.0.0.0`.
8. **End-to-end verification**:
   - Toggle staging flags immediately.
   - Toggle production flags → confirm modal appears → submit creates request.
   - Sensitive flag requires reason.
   - Approval requests page shows the reason and allows approve/reject.
   - Production value updates only after approval.
   - History icon opens a modal with a UTC-second audit table.

## 9. Known Issues / Notes for the Next Agent

- `npm run lint` (oxlint) fails in this environment because an optional `@oxlint/binding-linux-x64-gnu` package is missing. Use `npx tsc -b` and `npm run build` for validation.
- Vite 8.x also pulled an optional `@rolldown/binding-linux-x64-gnu` that was missing, so the working setup is pinned to Vite 5.4.21 and `@vitejs/plugin-react@4`.
- The app is intentionally a single-file UI for speed; refactor into components if the demo grows.
- `localStorage` stores the entire state. Use `localStorage.clear()` or incognito to reset to seed data.
- The current user is hardcoded as `demo-user`; the reason field is mandatory only for flags marked `sensitive: true`.
- Only one pending request is kept per production flag. If a second user edits the same flag, the first pending request is overwritten with the new value/actor/reason/timestamp.

## 10. Success Criteria

- Staging toggles apply immediately.
- Production changes create a pending request and do not change the live value.
- Sensitive production changes require a non-empty reason before submitting.
- The reason is visible to reviewers on the Approval requests page.
- Pending requests can be approved/rejected, and the production value + audit log update correctly.
- The history modal renders the audit log as a UTC-second table.
- The UI feels like a modern internal admin dashboard with a sidebar, topbar, and clean table-based layout.
