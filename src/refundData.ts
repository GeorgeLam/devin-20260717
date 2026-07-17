import type { RefundRequest } from './refundTypes'

const now = Date.now()

function iso(msAgo: number): string {
  return new Date(now - msAgo).toISOString()
}

function money(value: number, currency: string) {
  return { value, currency }
}

function audit(refundId: string, action: RefundRequest['auditLog'][number]['action'], msAgo: number, extra: Partial<RefundRequest['auditLog'][number]> = {}) {
  return {
    id: `audit-${action}-${refundId}`,
    refundId,
    action,
    actor: 'web',
    timestamp: iso(msAgo),
    ...extra,
  }
}

function risk(value: number, _currency: string, flags: string[] = []): RefundRequest['risk'] {
  return {
    isDuplicateRefund: flags.includes('Duplicate refund request'),
    isHighValue: value >= 500,
    hasRecentChargeback: flags.includes('Recent chargeback on account'),
    accountAgeDays: 0,
    flags,
  }
}

export const initialRefunds: RefundRequest[] = [
  {
    id: 'REF-2026-001',
    customer: { id: 'cust-112', fullName: 'Emily Carter', email: 'emily.carter@example.com', accountAgeDays: 245 },
    transaction: { id: 'txn-5521', originalAmount: money(45.0, 'GBP'), paymentMethod: 'card', processedAt: iso(1000 * 60 * 60 * 24 * 2) },
    refundAmount: money(45.0, 'GBP'),
    reason: 'duplicate-charge',
    requestChannel: 'customer-portal',
    requestedAt: iso(1000 * 60 * 45),
    requestedBy: 'Emily Carter',
    status: 'pending-review',
    risk: risk(45, 'GBP'),
    notes: [],
    auditLog: [
      audit('REF-2026-001', 'refund_requested', 1000 * 60 * 45, { actor: 'Emily Carter' }),
    ],
    lastStatusAt: iso(1000 * 60 * 45),
    updatedAt: iso(1000 * 60 * 45),
  },
  {
    id: 'REF-2026-002',
    customer: { id: 'cust-889', fullName: 'Daniel Okonkwo', email: 'daniel.okonkwo@example.com', accountAgeDays: 92 },
    transaction: { id: 'txn-8834', originalAmount: money(1250.0, 'GBP'), paymentMethod: 'bank-transfer', processedAt: iso(1000 * 60 * 60 * 12) },
    refundAmount: money(1250.0, 'GBP'),
    reason: 'service-issue',
    requestChannel: 'support-agent',
    requestedAt: iso(1000 * 60 * 60 * 2),
    requestedBy: 'sarah.chen',
    status: 'pending-review',
    assignedTo: 'sarah.chen',
    assignedAt: iso(1000 * 60 * 60 * 1.5),
    risk: risk(1250, 'GBP', ['High value refund', 'Account under 180 days old']),
    notes: [],
    auditLog: [
      audit('REF-2026-002', 'refund_requested', 1000 * 60 * 60 * 2, { actor: 'sarah.chen' }),
      audit('REF-2026-002', 'assigned', 1000 * 60 * 60 * 1.5, { actor: 'sarah.chen', metadata: { assignedTo: 'sarah.chen' } }),
    ],
    lastStatusAt: iso(1000 * 60 * 60 * 1.5),
    updatedAt: iso(1000 * 60 * 60 * 1.5),
  },
  {
    id: 'REF-2026-003',
    customer: { id: 'cust-341', fullName: 'Priya Sharma', email: 'priya.sharma@example.com', accountAgeDays: 512 },
    transaction: { id: 'txn-1190', originalAmount: money(9.99, 'GBP'), paymentMethod: 'card', processedAt: iso(1000 * 60 * 60 * 48) },
    refundAmount: money(9.99, 'GBP'),
    reason: 'customer-request',
    requestChannel: 'customer-portal',
    requestedAt: iso(1000 * 60 * 60 * 4),
    requestedBy: 'Priya Sharma',
    status: 'processed',
    reviewedBy: 'demo-user',
    reviewedAt: iso(1000 * 60 * 60 * 3),
    risk: risk(9.99, 'GBP'),
    notes: [],
    auditLog: [
      audit('REF-2026-003', 'refund_requested', 1000 * 60 * 60 * 4, { actor: 'Priya Sharma' }),
      audit('REF-2026-003', 'assigned', 1000 * 60 * 60 * 3.5, { metadata: { assignedTo: 'demo-user' } }),
      audit('REF-2026-003', 'approved', 1000 * 60 * 60 * 3, {
        previousStatus: 'pending-review',
        newStatus: 'approved',
        refundAmount: money(9.99, 'GBP'),
      }),
      audit('REF-2026-003', 'processed', 1000 * 60 * 60 * 2.8, {
        previousStatus: 'approved',
        newStatus: 'processed',
        refundAmount: money(9.99, 'GBP'),
      }),
    ],
    lastStatusAt: iso(1000 * 60 * 60 * 2.8),
    updatedAt: iso(1000 * 60 * 60 * 2.8),
  },
  {
    id: 'REF-2026-004',
    customer: { id: 'cust-556', fullName: 'Tom Brennan', email: 'tom.brennan@example.com', accountAgeDays: 30 },
    transaction: { id: 'txn-6671', originalAmount: money(350.0, 'GBP'), paymentMethod: 'wallet', processedAt: iso(1000 * 60 * 60 * 24 * 5) },
    refundAmount: money(350.0, 'GBP'),
    reason: 'customer-request',
    requestChannel: 'support-agent',
    requestedAt: iso(1000 * 60 * 60 * 6),
    requestedBy: 'demo-user',
    status: 'rejected',
    reviewedBy: 'demo-user',
    reviewedAt: iso(1000 * 60 * 60 * 5),
    rejectionReason: 'Outside refund policy window',
    risk: risk(350, 'GBP', ['Account under 90 days old']),
    notes: [],
    auditLog: [
      audit('REF-2026-004', 'refund_requested', 1000 * 60 * 60 * 6, { actor: 'demo-user' }),
      audit('REF-2026-004', 'assigned', 1000 * 60 * 60 * 5.5, { metadata: { assignedTo: 'demo-user' } }),
      audit('REF-2026-004', 'rejected', 1000 * 60 * 60 * 5, {
        previousStatus: 'pending-review',
        newStatus: 'rejected',
        reason: 'Outside refund policy window',
      }),
    ],
    lastStatusAt: iso(1000 * 60 * 60 * 5),
    updatedAt: iso(1000 * 60 * 60 * 5),
  },
  {
    id: 'REF-2026-005',
    customer: { id: 'cust-778', fullName: 'Lin Wei', email: 'lin.wei@example.com', accountAgeDays: 18 },
    transaction: { id: 'txn-4402', originalAmount: money(2000.0, 'GBP'), paymentMethod: 'card', processedAt: iso(1000 * 60 * 60 * 8) },
    refundAmount: money(2000.0, 'GBP'),
    reason: 'unauthorised',
    requestChannel: 'chargeback',
    requestedAt: iso(1000 * 60 * 35),
    requestedBy: 'chargeback-team',
    status: 'approved',
    assignedTo: 'demo-user',
    assignedAt: iso(1000 * 60 * 30),
    reviewedBy: 'demo-user',
    reviewedAt: iso(1000 * 60 * 25),
    risk: risk(2000, 'GBP', ['High value refund', 'Account under 30 days old', 'Recent chargeback on account']),
    notes: [],
    auditLog: [
      audit('REF-2026-005', 'refund_requested', 1000 * 60 * 35, { actor: 'chargeback-team' }),
      audit('REF-2026-005', 'assigned', 1000 * 60 * 30, { actor: 'demo-user', metadata: { assignedTo: 'demo-user' } }),
      audit('REF-2026-005', 'approved', 1000 * 60 * 25, {
        previousStatus: 'pending-review',
        newStatus: 'approved',
        refundAmount: money(2000.0, 'GBP'),
      }),
    ],
    lastStatusAt: iso(1000 * 60 * 25),
    updatedAt: iso(1000 * 60 * 25),
  },
  {
    id: 'REF-2026-006',
    customer: { id: 'cust-223', fullName: 'Olivia Smith', email: 'olivia.smith@example.com', accountAgeDays: 128 },
    transaction: { id: 'txn-3092', originalAmount: money(75.0, 'GBP'), paymentMethod: 'bank-transfer', processedAt: iso(1000 * 60 * 60 * 24 * 3) },
    refundAmount: money(75.0, 'GBP'),
    reason: 'customer-request',
    requestChannel: 'customer-portal',
    requestedAt: iso(1000 * 60 * 60 * 10),
    requestedBy: 'Olivia Smith',
    status: 'failed',
    failureReason: 'Recipient bank account closed',
    risk: risk(75, 'GBP'),
    notes: [],
    auditLog: [
      audit('REF-2026-006', 'refund_requested', 1000 * 60 * 60 * 10, { actor: 'Olivia Smith' }),
      audit('REF-2026-006', 'assigned', 1000 * 60 * 60 * 9.5, { metadata: { assignedTo: 'demo-user' } }),
      audit('REF-2026-006', 'approved', 1000 * 60 * 60 * 9, {
        previousStatus: 'pending-review',
        newStatus: 'approved',
        refundAmount: money(75.0, 'GBP'),
      }),
      audit('REF-2026-006', 'failed', 1000 * 60 * 60 * 8.5, {
        previousStatus: 'approved',
        newStatus: 'failed',
        reason: 'Recipient bank account closed',
      }),
    ],
    lastStatusAt: iso(1000 * 60 * 60 * 8.5),
    updatedAt: iso(1000 * 60 * 60 * 8.5),
  },
  {
    id: 'REF-2026-007',
    customer: { id: 'cust-664', fullName: 'Michael Brown', email: 'michael.brown@example.com', accountAgeDays: 410 },
    transaction: { id: 'txn-7712', originalAmount: money(500.0, 'GBP'), paymentMethod: 'card', processedAt: iso(1000 * 60 * 60 * 36) },
    refundAmount: money(500.0, 'GBP'),
    reason: 'chargeback',
    requestChannel: 'chargeback',
    requestedAt: iso(1000 * 60 * 90),
    requestedBy: 'chargeback-team',
    status: 'pending-review',
    risk: risk(500, 'GBP', ['High value refund']),
    notes: [],
    auditLog: [
      audit('REF-2026-007', 'refund_requested', 1000 * 60 * 90, { actor: 'chargeback-team' }),
    ],
    lastStatusAt: iso(1000 * 60 * 90),
    updatedAt: iso(1000 * 60 * 90),
  },
  {
    id: 'REF-2026-008',
    customer: { id: 'cust-990', fullName: 'Sarah Johnson', email: 'sarah.johnson@example.com', accountAgeDays: 720 },
    transaction: { id: 'txn-2284', originalAmount: money(15.0, 'GBP'), paymentMethod: 'wallet', processedAt: iso(1000 * 60 * 60 * 72) },
    refundAmount: money(15.0, 'GBP'),
    reason: 'duplicate-charge',
    requestChannel: 'support-agent',
    requestedAt: iso(1000 * 60 * 60 * 12),
    requestedBy: 'demo-user',
    status: 'processed',
    reviewedBy: 'demo-user',
    reviewedAt: iso(1000 * 60 * 60 * 11.5),
    risk: risk(15, 'GBP'),
    notes: [],
    auditLog: [
      audit('REF-2026-008', 'refund_requested', 1000 * 60 * 60 * 12, { actor: 'demo-user' }),
      audit('REF-2026-008', 'assigned', 1000 * 60 * 60 * 11.8, { metadata: { assignedTo: 'demo-user' } }),
      audit('REF-2026-008', 'approved', 1000 * 60 * 60 * 11.5, {
        previousStatus: 'pending-review',
        newStatus: 'approved',
        refundAmount: money(15.0, 'GBP'),
      }),
      audit('REF-2026-008', 'processed', 1000 * 60 * 60 * 11.4, {
        previousStatus: 'approved',
        newStatus: 'processed',
        refundAmount: money(15.0, 'GBP'),
      }),
    ],
    lastStatusAt: iso(1000 * 60 * 60 * 11.4),
    updatedAt: iso(1000 * 60 * 60 * 11.4),
  },
]
