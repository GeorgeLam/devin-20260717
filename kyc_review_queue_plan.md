# KYC Review Queue — Demo Prototype Plan

## 1. Context & Goal

Add a **KYC (Know Your Customer) review queue** to the existing `NovaOps` internal admin dashboard. The queue is used by compliance operations staff at a Series C fintech regulated by the **FCA**. The primary goals are to let reviewers efficiently open, assess, approve, reject, and request follow-up information on customer identity cases, while maintaining an **immutable, fully traceable audit trail** for every action.

This is a front-end prototype only — no backend or auth. Data is mocked in-memory and persisted to `localStorage`.

## 2. Scope Decisions

| Topic | Decision |
|---|---|
| Parent app | Re-use the existing React + TypeScript + Vite `NovaOps` admin shell. Add a new **KYC Review** nav item in the sidebar. |
| Backend | None. Mock data in `localStorage`. |
| Auth | None. Use `currentUser = 'demo-user'` for audit attribution. |
| Case statuses | **In review**, **Approved**, **Rejected**, **Waiting for customer information** |
| Layout | Two-pane: left-side case list, right-side case detail. |
| Risk flags | Show automated risk/sanctions/PEP/liveness results for context. |
| Rejection | Dropdown of standard reasons + **Other** that reveals a mandatory free-text box. |
| Audit trail | Every action (open, status change, approve, reject, request info, note, assignment) is logged immutably with actor, timestamp, before/after state, reason, and document reference. |
| FCA requirement | Audit trail is non-optional, exportable/readable, and stored with every case. |

## 3. Functional Requirements

### 3.1 Navigation
- Add **KYC Review** as a new top-level item in the NovaOps sidebar.
- Selecting it switches the main content area to the KYC review queue.

### 3.2 Status Tabs
At the top of the page, four tabs filter the case list:

1. **In review**
2. **Approved**
3. **Rejected**
4. **Waiting for customer information**

- The active tab is highlighted.
- Each tab shows a count badge when cases exist in that status.
- The default tab is **In review**.

### 3.3 Left Pane — Case List
A scrollable list of cases matching the selected tab.

Each row/card shows:
- Case ID (e.g., `KYC-1024`)
- Applicant name
- Status badge
- Risk indicator (low / medium / high / sanctions / PEP)
- Submitted at (UTC)
- Age / SLA indicator (e.g., “2h 15m”) with warning colour if overdue
- Assigned reviewer (if any)

Clicking a row loads the case into the right pane.

### 3.4 Right Pane — Case Detail
A card showing all case data and actions.

**Applicant identity**
- Full name
- Date of birth
- Nationality
- Residential address
- Contact email / phone (partially masked for privacy)
- Applicant internal ID

**Submitted documents**
- Document type (passport, driving licence, national ID, proof of address)
- Document number
- Issuing country
- Expiry date
- Document image preview (front, back, and selfie where applicable)
- Document quality / tampering score
- Liveness check result

**Risk / screening results**
- Overall risk rating
- PEP match (yes/no with details)
- Sanctions / adverse media match (yes/no with details)
- ID verification provider score
- Any automated flags the reviewer must address

**Case metadata**
- Case ID
- Submission timestamp (UTC with seconds)
- Current status
- Last action by / at
- Assigned reviewer

### 3.5 Actions
The detail pane has context-aware action buttons.

**For `In review` cases**
- **Approve** — moves case to `approved`, logs approval.
- **Reject** — opens a rejection flow.
- **Request information** — moves case to `waiting for customer information` and records what was requested.
- **Assign to me** — locks the case to the current reviewer.
- **Add note** — records a reviewer note in the audit log.

**For `Waiting for customer information` cases**
- **Re-open for review** — moves back to `in review` when new documents are submitted.
- **Add note**.

**For `Approved` / `Rejected` cases**
- View-only except **Reopen** (if allowed). All actions are logged.

### 3.6 Rejection Flow
Clicking **Reject** shows a modal or inline form:

- Dropdown of standard reasons:
  - Document unclear / illegible
  - Expired document
  - Name or DOB mismatch
  - Address not verified
  - Incomplete application
  - Unresolvable PEP / sanctions match
  - Suspected fraud
  - Other
- If **Other** is selected, a free-text box appears and becomes mandatory.
- Submitting records:
  - Status change `in review` → `rejected`
  - Rejection reason (dropdown value or free text)
  - Actor and timestamp (UTC)
  - New audit event

### 3.7 Requesting Additional Information
Clicking **Request information** shows a form:

- Multi-select / dropdown of common missing items:
  - Clearer ID photo
  - Proof of address
  - Better selfie
  - Source of funds documentation
  - Updated ID
  - Other
- If **Other**, a free-text box is required.
- Submitting moves the case to `waiting for customer information` and appends the request to the audit log.

### 3.8 Audit Trail (FCA-critical)
Every case has an `auditLog` array. Logged actions include:

- `case_created`
- `viewed`
- `assigned`
- `status_changed` (with old and new status)
- `approved`
- `rejected` (with reason)
- `info_requested` (with requested items and/or free text)
- ` reopened` (for re-submitted/reopened cases)
- `note_added`

Each event stores:

```ts
{
  id: string;
  caseId: string;
  action: string;
  actor: string;
  timestamp: string;        // ISO-8601 UTC
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  requestedItems?: string[];
  note?: string;
  documentVersion?: string;
}
```

The audit trail must be:
- Immutable — never edited, only appended.
- Timestamped in UTC with seconds.
- Attributed to a named actor.
- Clear about the reason for every decision.

### 3.9 Case Assignment / Locking
- A reviewer can click **Assign to me** to take ownership.
- The assigned reviewer is shown in the list and detail pane.
- If a case is assigned to someone else, it is still viewable but the approve/reject/request actions are hidden or disabled unless the current user is the assignee.
- For the demo, allow override/break-glass but log it.

### 3.10 Search & Filter
A search bar above the left pane:
- Search by case ID, applicant name, or email fragment.
- Optional filters: risk level, submission date range, assignee.

### 3.11 SLA / Aging
- Compute how long a case has been in its current status.
- Show a subtle warning / overdue indicator if a case exceeds a threshold (e.g., 4 hours for `in review`).

### 3.12 Seed Cases
Build 8–12 realistic KYC cases for a UK fintech. Examples:

| Case ID | Name | Status | Risk | Notes |
|---|---|---|---|---|
| KYC-1001 | Amelia Hartley | In review | low | UK passport + utility bill |
| KYC-1002 | Rajesh Patel | Waiting for customer information | medium | Unclear selfie requested |
| KYC-1003 | Chen Wei | Rejected | high | Name mismatch on document |
| KYC-1004 | Maria Gonzalez | Approved | low | Spanish ID, UK address |
| KYC-1005 | Lukas Schmidt | In review | high | PEP match, requires senior sign-off |
| KYC-1006 | Aisha Mensah | Waiting for customer information | medium | Missing proof of address |
| KYC-1007 | James O’Connor | In review | medium | Driving licence expired |
| KYC-1008 | Fatima Al-Rashid | Rejected | high | Sanctions adverse media hit |

## 4. Data Shapes

```ts
interface KYCCase {
  id: string;
  applicant: {
    id: string;
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    address: string;
    email: string;
    phone: string;
  };
  document: {
    type: 'passport' | 'driving-licence' | 'national-id' | 'proof-of-address';
    number: string;
    issuingCountry: string;
    expiryDate: string;
    frontImageUrl: string;
    backImageUrl?: string;
    selfieImageUrl?: string;
    tamperingScore: number;   // 0–100
  };
  risk: {
    overall: 'low' | 'medium' | 'high' | 'critical';
    pepMatch: boolean;
    sanctionsMatch: boolean;
    adverseMediaMatch: boolean;
    verificationScore: number; // 0–100
    flags: string[];          // human-readable warnings
  };
  submission: {
    submittedAt: string;
    channel: string;
    ipAddress: string;
  };
  status: 'in-review' | 'approved' | 'rejected' | 'waiting-for-info';
  assignedTo?: string;
  assignedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  requestedInfo?: string[];
  notes: ReviewerNote[];
  auditLog: KycAuditEvent[];
}

interface ReviewerNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

interface KycAuditEvent {
  id: string;
  caseId: string;
  action: 'case_created' | 'viewed' | 'assigned' | 'status_changed' | 'approved' | 'rejected' | 'info_requested' | 'reopened' | 'note_added';
  actor: string;
  timestamp: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  requestedItems?: string[];
  note?: string;
  metadata?: Record<string, unknown>;
}
```

## 5. UI/UX Notes

- Keep the same `NovaOps` admin shell (Inter font, sidebar, topbar, cards).
- Use the existing badge and button styles where possible.
- Status colours:
  - `in-review` — amber
  - `approved` — green
  - `rejected` — red
  - `waiting-for-info` — blue
- Risk colours:
  - `low` — green/grey
  - `medium` — amber
  - `high` — red
  - `critical` — dark red / requires escalation banner
- Left pane: compact rows with status/risk badges and SLA timer.
- Right pane: clearly separated sections (identity, documents, risk, actions, audit log).
- Document previews can be small thumbnails that expand on click.
- Rejection modal: dropdown + conditional text box; submit disabled until reason is complete.
- Audit trail: collapsible section at the bottom of the case detail, newest entries first, UTC seconds timestamps.

## 6. Implementation Approach

### 6.1 Extend existing project
1. Add a `KYC Review` nav sub-item under the existing sidebar section (or as a new top-level item).
2. Reuse `types.ts`, `store.ts`, and `index.css` patterns from the feature-flag admin.
3. Add new files or inline in `App.tsx`:
   - `kycData.ts` — seed cases.
   - `kycTypes.ts` — KYC-specific types.
   - `KycQueue.tsx` / inline `KycQueue` view in `App.tsx`.

### 6.2 State management
- Add `kycCases` and `selectedCaseId` to the existing `useFlagStore` or create a separate `useKycStore`.
- `localStorage` key could be `kyc-review-queue`.
- Action methods:
  - `selectCase(caseId)`
  - `assignCase(caseId, reviewer)`
  - `approveCase(caseId, reviewer)`
  - `rejectCase(caseId, reason, reviewer)`
  - `requestInfo(caseId, items, note, reviewer)`
  - `reopenCase(caseId, reviewer)`
  - `addNote(caseId, text, reviewer)`
- Every action appends an audit event and a case note where appropriate.

### 6.3 Audit trail guarantee
- No function edits or removes existing audit events.
- All state updates are done through a single `addAuditEvent` helper that returns the updated case.
- Display the audit trail read-only.

## 7. FCA / Compliance Notes

- **Attribution**: every decision is tied to a named actor.
- **Reasoning**: every rejection, info request, and override requires a reason.
- **Timeliness**: SLA/aging indicators help demonstrate the firm is reviewing cases within acceptable timeframes.
- **Immutability**: logs are append-only.
- **PII handling**: for the demo, show realistic data but clearly mark it as mock; in production this data must be encrypted, access-controlled, and retained per FCA/ICO rules.

## 8. Success Criteria

- A reviewer can switch between the four status tabs and see relevant cases.
- Selecting a case shows full detail in the right pane.
- Rejecting a case requires a reason from a dropdown (and free text if **Other** is selected).
- Approving or requesting information updates the case status and appends to the audit log.
- Every action is visible in the immutable audit trail with UTC timestamps, actor, and reason.
- Cases can be assigned to the current reviewer to avoid duplicate decisions.
- The UI feels like a credible FCA-grade compliance queue inside the existing NovaOps admin shell.

## 9. Build Notes & Learnings from Implementation

### 9.1 Files added/changed

- `src/KycQueue.tsx` — the main queue page (tabs, search, sort, two-pane layout, modals, audit trail).
- `src/kycStore.ts` — `useKycStore` for KYC state + localStorage persistence + audit helpers.
- `src/kycTypes.ts` — shared KYC types; `KycAuditEvent.action` includes `unassigned`.
- `src/kycData.ts` — 8 seed cases.
- `src/App.tsx` — switched to a page-state router, added the **KYC Review** nav item.
- `src/index.css` — KYC-specific layout and component styles.

### 9.2 Store and state decisions

- Use a separate `useKycStore` (`localStorage` key `kyc-review-queue-state`) rather than mixing KYC data into the feature-flag store.
- `currentUser = 'demo-user'` is hard-coded for attribution.
- All case mutations go through `updateCase` and an `addAuditEvent` helper that appends a new event and returns the updated case.
- Actual audit actions used:
  - `case_created`
  - `assigned`
  - `unassigned`
  - `approved`
  - `rejected`
  - `info_requested`
  - `reopened`
  - `note_added`
- `lastStatusAt` is updated whenever the case status changes; `assignedAt`/`assignedTo` update on assignment/unassignment only.

### 9.3 List and filtering behaviour

- Tabs filter by status; counts update live and respect the current search term.
- Search filters by applicant name, email fragment, and case ID.
- Sort lives **at the top of the left-hand list panel** (not in the main toolbar) and has options for:
  - Time in status (newest/oldest)
  - Submission time (newest/oldest)
  - Applicant name (A-Z/Z-A)
  - Risk level (highest/lowest first)
- Risk values are weighted (`low=1`, `medium=2`, `high=3`, `critical=4`) for sorting.

### 9.4 Two-pane layout styling

- Left list panel is a light grey (`--bg-subtle`) rounded container; case rows are white cards.
- Right detail panel has a white card background (`--bg-card`).
- The two panes sit flush against each other: `gap: 0`, `align-items: stretch`, and the shared edges have no border and squared corners (`border-radius: 12px 0 0 12px` on the left, `0 12px 12px 0` on the right).
- On narrow viewports the layout stacks vertically and reverts to full rounded corners.

### 9.5 Assignment and action gating

- `Assign to me` appears when the case is unassigned or assigned to someone else.
- `Unassign` appears when the case is assigned to the current user.
- Approve / Reject / Request information / Re-open are **disabled** (and an explanatory alert is shown) until the current user is the assignee.
- Assignment is logged in the audit trail; unassignment is a separate `unassigned` event.

### 9.6 List item metadata

- Each case row shows case ID, status badge, risk badge, assignee avatar on the right, applicant name, document type, time in status, and an "Assigned to you" indicator.
- Unassigned cases show a grey placeholder avatar.

### 9.7 Rejection and request-information flows

- Both are inline in `KycQueue.tsx` using local modal state (not separate routes).
- Rejection: dropdown reasons with `Other` requiring free text.
- Request information: multi-select checkboxes with `Other` requiring free text.
- The selected items and `Other` text are recorded as a single array in the audit event and on the case.

### 9.8 Audit trail presentation

- Displayed in a read-only table inside the detail panel, newest first.
- Columns: Action, Actor, Status change, Reason / Note, Timestamp (UTC with seconds).
- `metadata` is used for detail that does not fit dedicated fields (e.g. `previouslyAssignedTo`).

### 9.9 Note on `viewed` / `status_changed`

- `viewed` is not logged in the demo (would require explicit view tracking).
- `status_changed` is not used; instead state-change actions such as `approved`, `rejected`, `info_requested`, and `reopened` combine the status change and decision reason in a single audit event.

### 9.10 Data shape differences from the draft

The final type adds/renames a few fields compared with the initial sketch:

```ts
type KycDocType = 'passport' | 'driving-licence' | 'national-id' | 'proof-of-address'

interface KycDocument {
  type: KycDocType
  number: string
  issuingCountry: string
  expiryDate: string
  frontImageUrl: string
  backImageUrl?: string
  selfieImageUrl?: string
  tamperingScore: number   // 0–100
  livenessScore?: number   // 0–100
}

interface KycCase {
  id: string
  applicant: KycApplicant
  document: KycDocument
  risk: KycRisk
  submission: KycSubmission
  status: 'in-review' | 'approved' | 'rejected' | 'waiting-for-info'
  assignedTo?: string
  assignedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  requestedInfo?: string[]
  notes: KycNote[]
  auditLog: KycAuditEvent[]
  lastStatusAt: string
  updatedAt: string
}

interface KycAuditEvent {
  id: string
  caseId: string
  action:
    | 'case_created'
    | 'assigned'
    | 'unassigned'
    | 'approved'
    | 'rejected'
    | 'info_requested'
    | 'reopened'
    | 'note_added'
  actor: string
  timestamp: string
  previousStatus?: KycStatus
  newStatus?: KycStatus
  reason?: string
  requestedItems?: string[]
  note?: string
  metadata?: Record<string, unknown>
}
```

### 9.11 Rebuilding from scratch

1. Ensure the parent NovaOps shell exists (sidebar, topbar, `Inter` font, CSS variables).
2. Add `KycQueue.tsx` as the page component and register a `page === 'kyc'` branch in `App.tsx`.
3. Create `kycData.ts` with at least 6–8 cases for realistic tab counts.
4. Create `kycStore.ts` using the `loadState`/`addAuditEvent`/`updateCase` pattern.
5. Wire the assignment/unassignment logic before enabling approve/reject/request buttons.
6. Add the sort dropdown inside `.kyc-list`, not the main toolbar.
7. Use the flush two-pane CSS (`gap: 0` + touching rounded corners) for the integrated look.
8. Run `npm run build` (which runs `tsc -b && vite build`) to verify types and bundle before pushing.
