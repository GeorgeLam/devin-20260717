# NovaOps architecture overview

A one-page summary of how the NovaOps admin suite is structured and why.

## High-level structure

```
┌─────────────────────────────────────────────────────────────┐
│                     NovaOps React app                        │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────────┐     │
│  │ Feature  │   │   KYC    │   │       Refunds        │     │
│  │  flags   │   │  queue   │   │      dashboard       │     │
│  └────┬─────┘   └────┬─────┘   └──────────┬───────────┘     │
│       └───────────────┴────────────────────┘                 │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│   │  User    │   │  Theme   │   │  Toast   │                │
│   │ context  │   │ context  │   │ context  │                │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘                │
│        └───────────────┴──────────────┘                      │
│                         │                                    │
│              ┌──────────┴──────────┐                         │
│              │    Domain stores    │                         │
│              │  useFlagStore()     │                         │
│              │  useKycStore()      │                         │
│              │  useRefundStore()   │                         │
│              └──────────┬──────────┘                         │
│                         │                                    │
│              ┌──────────┴──────────┐                         │
│              │     localStorage    │                         │
│              └─────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Stack and conventions

- **Vite + React 19 + TypeScript** for fast dev builds, modern types, and ESM-first tooling.
- **Plain CSS** with CSS variables for theming. No Tailwind or component library in the app build step; this keeps the prototype lightweight and free of dependency churn.
- **Custom stores** (`useFlagStore`, `useKycStore`, `useRefundStore`) built with `useState`/`useEffect` and `localStorage`. Each store owns its domain actions (assignment, approval, rejection, audit logging) so business logic stays close to its data shape.
- **React Context** for cross-cutting concerns: current user (`user.tsx`), light/dark mode (`theme.tsx`), and toast notifications (`toast.tsx`).

## Key design decisions and trade-offs

### 1. Front-end only with `localStorage` persistence
- **Why:** Lets the entire suite be run and demoed without a server, database, or auth provider.
- **Trade-off:** There is no real concurrency control, server-side audit immutability, or user authentication. A production version would move stores to an API and use strict server-side audit writes.

### 2. Three independent domain stores
- **Why:** Each tool (feature flags, KYC, refunds) has distinct state, actions, and audit needs. Isolated stores make the code easier to reason about and test than a single global store.
- **Trade-off:** Some UI patterns (lists, sort, search, modals) are repeated across tools. A shared component library could reduce duplication later.

### 3. Assignment gating done in the UI
- **Why:** Simulates a regulated workflow where reviewers cannot act on cases they have not claimed. It is enforced by comparing `assignedTo` to `currentUser` at the button level.
- **Trade-off:** Without a backend, this is a client-side guard only. Real enforcement must happen on the server.

### 4. Immutable audit arrays inside each store
- **Why:** Every action (`approve`, `reject`, `request_info`, `assign`, `unassign`, `note_added`) appends an event with `actor`, `timestamp`, `reason`, and before/after state. This produces a tamper-evident log for that session and satisfies the FCA/AML review requirement in the prototype.
- **Trade-off:** Logs live in the same `localStorage` key as state, so they can be cleared by the browser. Production needs append-only server storage.

### 5. Pane-level scrolling and two-pane layouts
- **Why:** Keeps the page itself fixed and gives the admin tools an app-like feel, matching modern internal dashboards.
- **Trade-off:** CSS had to be careful with `overflow` on `.page` and `.kyc-layout` containers to avoid double scrollbars.

### 6. User and theme stored in `localStorage`
- **Why:** Selected actor and theme preference survive refresh, making the multi-user demo realistic.
- **Trade-off:** Again, this is client-side only. Real authentication and RBAC would replace the user switcher.

### 7. Vitest + React Testing Library with `happy-dom`
- **Why:** Tests run fast, use standard React Testing Library selectors, and can inspect DOM state and `localStorage`. `happy-dom` was chosen over `jsdom` because a transitive `ERR_REQUIRE_ESM` issue broke `jsdom` in this environment.
- **Trade-off:** `happy-dom` is a lighter DOM implementation; most tests target visible behavior rather than deep DOM edge cases, so it is sufficient.

### 8. Separate `tsconfig.test.json`
- **Why:** Keeps the production build (`tsc -b`) free of test types and globals, while tests get `vitest/globals` and `@testing-library/jest-dom` types.

## What this architecture does not cover

- Backend persistence, authentication, or authorization.
- Real-time collaboration or conflict resolution on the same case/refund.
- A standalone component library — shared UI is extracted piece by piece (`SearchInput`, providers, common CSS classes) as needed.
