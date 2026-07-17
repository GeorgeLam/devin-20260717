export type RefundStatus =
  | 'pending-review'
  | 'approved'
  | 'rejected'
  | 'processed'
  | 'failed'
  | 'waiting-for-info'

export type RefundReason =
  | 'duplicate-charge'
  | 'unauthorised'
  | 'fraud'
  | 'service-issue'
  | 'customer-request'
  | 'chargeback'
  | 'other'

export type PaymentMethod = 'card' | 'bank-transfer' | 'wallet' | 'crypto' | 'other'
export type RequestChannel = 'customer-portal' | 'support-agent' | 'chargeback' | 'compliance'

export interface Money {
  value: number
  currency: string
}

export interface RefundCustomer {
  id: string
  fullName: string
  email: string
  accountAgeDays: number
}

export interface RefundTransaction {
  id: string
  originalAmount: Money
  paymentMethod: PaymentMethod
  processedAt: string
}

export interface RefundRisk {
  isDuplicateRefund: boolean
  isHighValue: boolean
  hasRecentChargeback: boolean
  accountAgeDays: number
  flags: string[]
}

export interface RefundNote {
  id: string
  author: string
  text: string
  timestamp: string
}

export interface RefundAuditEvent {
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
  requestedItems?: string[]
  metadata?: Record<string, unknown>
}

export interface RefundRequest {
  id: string
  customer: RefundCustomer
  transaction: RefundTransaction
  refundAmount: Money
  reason: RefundReason
  reasonText?: string
  risk: RefundRisk
  requestChannel: RequestChannel
  requestedAt: string
  requestedBy?: string
  status: RefundStatus
  assignedTo?: string
  assignedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  requestedInfo?: string[]
  failureReason?: string
  notes: RefundNote[]
  auditLog: RefundAuditEvent[]
  lastStatusAt: string
  updatedAt: string
}
