# Refunds Dashboard — Demo Prototype Plan

## 1. Context & Goal

Add a **refunds dashboard** to the existing `NovaOps` internal admin dashboard. It will be used by customer operations, finance, and compliance teams at a Series C fintech regulated by the **FCA**. The dashboard lets internal users review, approve, reject, and track refund requests, while maintaining an **immutable audit trail** for every decision.

This is a front-end prototype only — no backend or auth. Data is mocked in-memory and persisted to `localStorage`.

## 2. Scope Decisions

| Topic | Decision |
|---|---|
| Parent app | Re-use the existing React + TypeScript + Vite `NovaOps` admin shell. Add a new **Refunds** nav item in the sidebar. |
| Backend | None. Mock data in `localStorage`. |
| Auth | None. Use `currentUser = 'demo-user'` for audit attribution. |
| Refund types | Full and partial refunds, issued back to the original payment method. |
| Statuses | **Pending review**, **Approved**, **Rejected**, **Processed**, **Failed**. |
| Layout | Queue/list on the left, refund detail and actions on the right; plus summary metric cards at the top. |
| Compliance | Every approval/rejection/status change is logged with actor, timestamp, reason, and before/after values. |

## 3. Functional Requirements

### 3.1 Navigation
- Add **Refunds** as a new top-level item in the NovaOps sidebar.
- Selecting it opens the refunds dashboard.

### 3.2 Summary Metrics
Top of the page shows a row of cards:
- Total refund requests today / this week / this month
- Total value of approved refunds
- Pending review count
- Average time to decision (or oldest pending age)
- Rejection rate

### 3.3 Status Tabs / Filters
Tabs filter the refund list:
1. **Pending review**
2. **Approved**
3. **Rejected**
4. **Processed**
5. **Failed**

- Each tab shows a count badge.
- Default tab is **Pending review**.
- Optional filter bar: amount range, currency, payment method, date range, requester, search by customer name/email/transaction ID.

### 3.4 Left Pane — Refund List
Each row/card shows:
- Refund request ID (e.g. `REF-2026-001234`)
- Customer name / email (masked)
- Transaction ID
- Refund amount and currency
- Original payment method (card, bank transfer, wallet, etc.)
- Requested date (UTC)
- Status badge
- Age / SLA indicator
- Assignee avatar (if assigned)
- Flag if high-value or disputed

Clicking a row loads the refund into the right pane.

### 3.5 Right Pane — Refund Detail
A card displaying the full refund request.

**Customer / transaction summary**
- Customer name, email (masked), internal customer ID
- Transaction ID
- Original payment amount and currency
- Refund amount (full or partial) and currency
- Payment method
- Requested via (customer portal, support agent, chargeback)
- Requested date (UTC with seconds)

**Refund context**
- Reason category (duplicate, fraud/unauthorised, service issue, customer request, etc.)
- Free-text notes from the requester
- Risk signals: duplicate refund, high value, recent chargeback on account, account age
- Supporting evidence / attachments (mock image/document previews if applicable)

**Case metadata**
- Refund request ID
- Current status
- Assigned reviewer
- SLA deadline / time in status

### 3.6 Actions
Context-aware buttons, similar to the KYC queue.

**For `pending-review` cases**
- **Approve refund** — moves to `approved`; for demo, immediately moves to `processed` or keep separate `approved` → `processed` step.
- **Reject** — requires a reason from a dropdown + optional `Other` text.
- **Assign to me** — locks the refund to the current reviewer.
- **Unassign** — if already assigned to the current user.
- **Add note** — append a reviewer note and audit event.
- **Request additional info** — optionally move to `waiting-for-info` (or keep in `pending-review` with a pending-info flag) and record what is needed.

**For `approved` cases**
- **Mark as processed** / **Mark as failed** — simulate the payment-provider step.
- **Reopen for review** — move back to `pending-review` (with reason).

**For `rejected` / `processed` / `failed` cases**
- View-only except **Reopen for review**.

### 3.7 Approval / Rejection Flow
Approve:
- Validate the refund amount does not exceed the original transaction amount.
- Log approval event with actor, timestamp, and final amount.
- If full amount, move to `approved`; if configured, then `processed`.

Reject:
- Dropdown of standard reasons:
  - Outside refund policy window
  - Already refunded
  - No evidence of issue
  - Suspected fraud / chargeback abuse
  - Dispute resolved in merchant favour
  - Other
- If **Other**, a free-text box becomes mandatory.
- Log `rejected` event with reason.

### 3.8 Audit Trail (FCA-critical)
Every refund has an `auditLog` array. Logged actions include:
- `refund_requested`
- `assigned`
- `unassigned`
- `approved`
- `rejected`
- `processed`
- `failed`
- `reopened`
- `note_added`

Each event stores:

```ts
{
  id: string;
  refundId: string;
  action: string;
  actor: string;
  timestamp: string;        // ISO-8601 UTC
  previousStatus?: RefundStatus;
  newStatus?: RefundStatus;
  reason?: string;
  amount?: { value: number; currency: string };
  note?: string;
  metadata?: Record<string, unknown>;
}
```

The audit trail must be:
- Immutable — only appended, never edited.
- Timestamped in UTC with seconds.
- Attributed to a named actor.
- Clear about reason and amount for every decision.

### 3.10 Assignment / Locking
- A reviewer can click **Assign to me** to take ownership.
- Approve / reject actions are disabled until the refund is assigned to the current user.
- Unassigning is allowed and logged.
- If assigned to someone else, show an alert and offer takeover.

### 3.11 Search & Filter
- Search by refund ID, transaction ID, customer name, or email fragment.
- Optional filters: status, amount range, currency, payment method, request channel, date range.

### 3.12 SLA / Aging
- Compute how long a refund has been in each status.
- Show a warning / overdue indicator if `pending-review` exceeds a threshold (e.g. 24 hours).

### 3.13 Seed Data
Build 8–12 realistic refund cases. Examples:

| Refund ID | Customer | Amount | Status | Reason | Notes |
|---|---|---|---|---|---|
| REF-2026-001 | Emily Carter | £45.00 | Pending review | Duplicate charge | Simple duplicate charge |
| REF-2026-002 | Daniel Okonkwo | £1,250.00 | Pending review | Service outage | High value, requires senior review |
| REF-2026-003 | Priya Sharma | £9.99 | Processed | Customer request | Quickly resolved |
| REF-2026-004 | Tom Brennan | £350.00 | Rejected | Outside policy window | Reason logged |
| REF-2026-005 | Lin Wei | £2,000.00 | Approved | Fraud / unauthorised | Awaiting processing |
| REF-2026-006 | Olivia Smith | £75.00 | Failed | Bank account closed | Needs re-issuance |
| REF-2026-007 | Michael Brown | £500.00 | Pending review | Chargeback request | Disputed |
| REF-2026-008 | Sarah Johnson | £15.00 | Processed | Duplicate charge | Fully refunded |

## 4. Data Shapes

```ts
type RefundStatus = 'pending-review' | 'approved' | 'rejected' | 'processed' | 'failed' | 'waiting-for-info'

type RefundReason =
  | 'duplicate-charge'
  | 'unauthorised'
  | 'fraud'
  | 'service-issue'
  | 'customer-request'
  | 'chargeback'
  | 'other'

type PaymentMethod = 'card' | 'bank-transfer' | 'wallet' | 'crypto' | 'other'

interface Money {
  value: number
  currency: string
}

interface RefundCustomer {
  id: string
  fullName: string
  email: string   // masked in UI
  accountAgeDays: number
}

interface RefundTransaction {
  id: string
  originalAmount: Money
  paymentMethod: PaymentMethod
  processedAt: string      // ISO-8601 UTC
}

interface RefundRisk {
  isDuplicateRefund: boolean
  isHighValue: boolean
  hasRecentChargeback: boolean
  accountAgeDays: number
  flags: string[]          // human-readable warnings
}

interface RefundRequest {
  id: string
  customer: RefundCustomer
  transaction: RefundTransaction
  refundAmount: Money
  reason: RefundReason
  reasonText?: string      // free-text detail
  requestChannel: 'customer-portal' | 'support-agent' | 'chargeback' | 'compliance'
  requestedAt: string
  requestedBy?: string
  status: RefundStatus
  assignedTo?: string
  assignedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  requestedInfo?: string[]
  notes: RefundNote[]
  auditLog: RefundAuditEvent[]
  lastStatusAt: string
  updatedAt: string
}

interface RefundNote {
  id: string
  author: string
  text: string
  timestamp: string
}

interface RefundAuditEvent {
  id: string
  refundId: string
  action:
    | 'refund_requested'
    | 'assigned'
    | 'unassigned'
    | 'approved'
    | 'rejected'
    | 'processed'
    | 'failed'
    | 'reopened'
    | 'note_added'
    | 'info_requested'
  actor: string
  timestamp: string
  previousStatus?: RefundStatus
  newStatus?: RefundStatus
  reason?: string
  refundAmount?: Money
  note?: string
  metadata?: Record<string, unknown>
}
```

## 5. UI/UX Notes

- Reuse the `NovaOps` admin shell (Inter font, sidebar, topbar, cards, badges).
- Status colours:
  - `pending-review` — amber
  - `approved` — blue
  - `rejected` — red
  - `processed` — green
  - `failed` — dark red
  - `waiting-for-info` — purple/blue
- Risk/high-value flags get a warning banner in the detail pane.
- Summary metric cards at the top, then tabs/filters, then two-pane queue and detail.
- Left pane: compact refund rows with amount, status badge, payment method, age, and assignee.
- Right pane: clearly separated sections (transaction, customer, reason, risk, actions, notes, audit log).
- Rejection modal: dropdown + conditional `Other` text box; submit disabled until valid.
- Audit trail: read-only table, newest first, UTC seconds timestamps.

## 6. Implementation Approach

1. Add a `Refunds` nav item to the NovaOps sidebar and a `page === 'refunds'` branch in `App.tsx`.
2. Create `refundData.ts` with seed cases and `refundTypes.ts` for types.
3. Create `refundStore.ts` modelled on `kycStore.ts`:
   - `loadState` from `localStorage`.
   - `addAuditEvent` helper.
   - `updateRefund` core mutation.
   - Actions: `assign`, `unassign`, `approve`, `reject`, `process`, `fail`, `reopen`, `addNote`, `requestInfo`.
4. Create `RefundsDashboard.tsx` with summary cards, tabs, search/filter, two-pane list/detail, modals for reject and request-info.
5. Add styles in `index.css` consistent with the KYC queue (light left pane, white right pane, flush layout if reused).
6. Use reusable components/functions where possible (time formatting, badge helpers, currency formatting).
7. Verify with `npm run build`.

## 7. FCA / Compliance Notes

- **Attribution**: every decision tied to a named actor.
- **Reasoning**: every rejection, manual approval of high-value refund, and reopen requires a reason.
- **Immutability**: audit log is append-only.
- **Timeliness**: SLA/aging indicators demonstrate prompt handling.
- **PII**: mask customer email / phone in the UI; clearly mark all data as mock.
- **Segregation of duties**: high-value refunds should require a second approver in a real system; for the demo we can flag high-value but allow single approval, noting the gap.

## 8. Success Criteria

- A reviewer can see summary metrics and switch between status tabs.
- Selecting a refund shows full detail in the right pane.
- Approve/reject actions are disabled until assigned to the current user.
- Rejecting requires a reason from a dropdown (and free text if **Other** is selected).
- Every action is visible in the immutable audit trail with UTC timestamps, actor, reason, and amount.
- Search/filter narrows the refund list correctly.
- High-value and disputed refunds are visually distinguishable.
- The dashboard feels like a credible internal operations tool inside the NovaOps shell.

## 9. Clarifying Questions

To narrow the scope before building, the most useful answers are:

1. **Processed state** — When a refund is approved, should it immediately become `processed`, or do we want a separate `approved` → `processed` step to mimic the payment-provider action?
2. **Initiation channel** — Are refunds in this dashboard assumed to be support-initiated, or should we also model customer-portal / chargeback-initiated requests?
3. **Bulk actions** — Do we need bulk approve/reject, or is one-by-one fine for the prototype?
4. **Charts** — Beyond summary metric cards, do we want any simple charts (e.g. bar chart of refunds by status or by day)?
5. **Currency support** — A single currency (e.g. GBP) or multiple currencies with formatting?
